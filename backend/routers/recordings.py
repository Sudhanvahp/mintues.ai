import os
import uuid
import secrets
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Recording
from schemas import (
    RecordingResponse, RecordingListItem, RecordingUpdate,
    StatusResponse, ShareRequest, ShareResponse, ChatRequest, ChatResponse
)
from services import transcription_service, diarization_service, notes_service

router = APIRouter(prefix="/recordings", tags=["recordings"])
executor = ThreadPoolExecutor(max_workers=2)

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


# ─── Upload & Process ────────────────────────────────────────────────────────

@router.post("/upload", response_model=RecordingResponse)
async def upload_recording(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    context: Optional[str] = Form(None),
    keywords: Optional[str] = Form(None),
    language: Optional[str] = Form("auto"),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
    filename = f"{uuid.uuid4()}{ext}"
    audio_path = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(audio_path, "wb") as f:
        f.write(content)

    recording = Recording(
        title="Processing...",
        audio_path=audio_path,
        status="processing",
        processing_step="Processing Audio",
        processing_pct=5,
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)

    background_tasks.add_task(
        process_recording,
        recording.id,
        audio_path,
        context or "",
        keywords or "",
        language or "auto",
    )

    return RecordingResponse.from_orm(recording)


def process_recording(
    recording_id: int,
    audio_path: str,
    context: str,
    keywords: str,
    language: str,
):
    """Background task: transcribe → diarize → notes → done."""
    from database import SessionLocal
    db = SessionLocal()

    def update(step: str, pct: int):
        rec = db.query(Recording).filter(Recording.id == recording_id).first()
        if rec:
            rec.processing_step = step
            rec.processing_pct = pct
            db.commit()

    try:
        # Step 1: Processing Audio (0–15%)
        update("Processing Audio", 5)
        duration = transcription_service.get_audio_duration(audio_path)
        update("Processing Audio", 15)

        # Step 2: Transcribing (15–50%)
        update("Transcribing", 20)
        lang = None if language == "auto" else language
        segments = transcription_service.transcribe(audio_path, language=lang)
        update("Transcribing", 50)

        # Step 3: Identifying Speakers (50–75%)
        update("Identifying Speakers", 55)
        diarization = diarization_service.diarize(audio_path)
        merged = diarization_service.merge_transcript_with_speakers(segments, diarization)
        update("Identifying Speakers", 75)

        # Step 4: Taking Notes (75–90%)
        update("Taking Notes", 78)
        notes = notes_service.generate_notes(merged)
        title = notes_service.generate_title(merged)
        update("Taking Notes", 90)

        # Step 5: Finishing Touches (90–100%)
        update("Finishing Touches", 95)
        rec = db.query(Recording).filter(Recording.id == recording_id).first()
        if rec:
            rec.title = title
            rec.duration_sec = duration
            rec.notes_markdown = notes
            rec.transcript_json = merged
            rec.status = "done"
            rec.processing_step = "Finishing Touches"
            rec.processing_pct = 100
            db.commit()

    except Exception as e:
        print(f"[process] Error for recording {recording_id}: {e}")
        rec = db.query(Recording).filter(Recording.id == recording_id).first()
        if rec:
            rec.status = "error"
            rec.error_message = str(e)
            db.commit()
    finally:
        db.close()


# ─── List & Get ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[RecordingListItem])
def list_recordings(
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Recording).order_by(Recording.created_at.desc())
    recordings = query.all()

    if q:
        q_lower = q.lower()
        recordings = [
            r for r in recordings
            if q_lower in r.title.lower()
            or q_lower in (r.notes_markdown or "").lower()
            or any(q_lower in seg.get("text", "").lower() for seg in r.transcript_json)
        ]

    return [RecordingListItem.from_orm(r) for r in recordings]


@router.get("/{recording_id}", response_model=RecordingResponse)
def get_recording(recording_id: int, db: Session = Depends(get_db)):
    rec = db.query(Recording).filter(Recording.id == recording_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    return RecordingResponse.from_orm(rec)


@router.get("/{recording_id}/status", response_model=StatusResponse)
def get_status(recording_id: int, db: Session = Depends(get_db)):
    rec = db.query(Recording).filter(Recording.id == recording_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    return StatusResponse(
        status=rec.status,
        step=rec.processing_step,
        percent=rec.processing_pct or 0,
        error_message=rec.error_message,
    )


# ─── Audio Stream ─────────────────────────────────────────────────────────────

@router.get("/{recording_id}/audio")
def stream_audio(recording_id: int, db: Session = Depends(get_db)):
    rec = db.query(Recording).filter(Recording.id == recording_id).first()
    if not rec or not os.path.exists(rec.audio_path):
        raise HTTPException(status_code=404, detail="Audio not found")

    def iterfile():
        with open(rec.audio_path, "rb") as f:
            while chunk := f.read(65536):
                yield chunk

    ext = os.path.splitext(rec.audio_path)[1].lower()
    content_type = {
        ".mp4": "audio/mp4",
        ".m4a": "audio/mp4",
        ".webm": "audio/webm",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
    }.get(ext, "audio/mpeg")

    return StreamingResponse(iterfile(), media_type=content_type)


# ─── Update & Delete ──────────────────────────────────────────────────────────

@router.patch("/{recording_id}", response_model=RecordingResponse)
def update_recording(
    recording_id: int,
    update: RecordingUpdate,
    db: Session = Depends(get_db),
):
    rec = db.query(Recording).filter(Recording.id == recording_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")

    if update.title is not None:
        rec.title = update.title
    if update.icon is not None:
        rec.icon = update.icon
    if update.tags is not None:
        rec.tags = update.tags
    if update.rating is not None:
        rec.rating = update.rating

    db.commit()
    db.refresh(rec)
    return RecordingResponse.from_orm(rec)


@router.delete("/{recording_id}")
def delete_recording(recording_id: int, db: Session = Depends(get_db)):
    rec = db.query(Recording).filter(Recording.id == recording_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")

    try:
        if os.path.exists(rec.audio_path):
            os.remove(rec.audio_path)
    except Exception:
        pass

    db.delete(rec)
    db.commit()
    return {"ok": True}


# ─── Share ────────────────────────────────────────────────────────────────────

@router.post("/{recording_id}/share", response_model=ShareResponse)
def toggle_share(
    recording_id: int,
    req: ShareRequest,
    db: Session = Depends(get_db),
):
    rec = db.query(Recording).filter(Recording.id == recording_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")

    rec.share_enabled = req.enabled
    if req.enabled and not rec.share_token:
        rec.share_token = secrets.token_urlsafe(16)

    db.commit()
    db.refresh(rec)

    share_url = None
    if rec.share_enabled and rec.share_token:
        share_url = f"{FRONTEND_URL}/shared/{rec.share_token}"

    return ShareResponse(share_enabled=rec.share_enabled, share_url=share_url)


# ─── Chat ─────────────────────────────────────────────────────────────────────

@router.post("/{recording_id}/chat", response_model=ChatResponse)
def chat_recording(
    recording_id: int,
    req: ChatRequest,
    db: Session = Depends(get_db),
):
    rec = db.query(Recording).filter(Recording.id == recording_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        reply = notes_service.chat_with_recording(req.message, rec.transcript_json, rec.notes_markdown or "")
    except Exception as e:
        print(f"[chat] error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    return ChatResponse(reply=reply)


# ─── Export ───────────────────────────────────────────────────────────────────

@router.get("/{recording_id}/export")
def export_recording(
    recording_id: int,
    format: str = Query("text_notes"),
    db: Session = Depends(get_db),
):
    rec = db.query(Recording).filter(Recording.id == recording_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")

    if format == "text_notes":
        content = rec.notes_markdown or "No notes available."
        return StreamingResponse(
            iter([content.encode()]),
            media_type="text/plain",
            headers={"Content-Disposition": f'attachment; filename="{rec.title}_notes.txt"'},
        )

    elif format == "text_transcript":
        lines = []
        for seg in rec.transcript_json:
            lines.append(f"[{seg.get('speaker', 'Speaker')}]: {seg.get('text', '')}")
        content = "\n".join(lines) or "No transcript available."
        return StreamingResponse(
            iter([content.encode()]),
            media_type="text/plain",
            headers={"Content-Disposition": f'attachment; filename="{rec.title}_transcript.txt"'},
        )

    elif format == "audio":
        if not os.path.exists(rec.audio_path):
            raise HTTPException(status_code=404, detail="Audio not found")
        return FileResponse(
            rec.audio_path,
            media_type="audio/mpeg",
            filename=f"{rec.title}.audio",
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unknown format: {format}")
