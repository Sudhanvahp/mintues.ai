import os
from dotenv import load_dotenv

load_dotenv()

PYANNOTE_TOKEN = os.getenv("PYANNOTE_TOKEN", "")

_pipeline = None


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        from pyannote.audio import Pipeline
        _pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=PYANNOTE_TOKEN,
        )
    return _pipeline


def diarize(audio_path: str) -> list[dict]:
    """
    Run speaker diarization.
    Returns list of {speaker, start_ms, end_ms}.
    """
    try:
        print(f"[diarization] loading pipeline...")
        pipeline = get_pipeline()
        print(f"[diarization] running on {audio_path}")
        diarization = pipeline(audio_path)
        result = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            result.append(
                {
                    "speaker": speaker,
                    "start_ms": int(turn.start * 1000),
                    "end_ms": int(turn.end * 1000),
                }
            )
        print(f"[diarization] found {len(set(r['speaker'] for r in result))} speaker(s), {len(result)} segments")
        return result
    except Exception as e:
        print(f"[diarization] ERROR: {e} — falling back to single speaker")
        import traceback
        traceback.print_exc()
        return []


def merge_transcript_with_speakers(
    segments: list[dict], diarization: list[dict]
) -> list[dict]:
    """
    Assign a speaker label to each transcript segment by maximum overlap.
    Falls back to 'Speaker 1' if no diarization data.
    """
    if not diarization:
        return [
            {
                "speaker": "Speaker 1",
                "text": s["text"],
                "start_ms": s["start_ms"],
                "end_ms": s["end_ms"],
            }
            for s in segments
        ]

    result = []
    for seg in segments:
        best_speaker = "Speaker 1"
        best_overlap = 0

        for d in diarization:
            overlap = min(seg["end_ms"], d["end_ms"]) - max(seg["start_ms"], d["start_ms"])
            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = _format_speaker(d["speaker"])

        result.append(
            {
                "speaker": best_speaker,
                "text": seg["text"],
                "start_ms": seg["start_ms"],
                "end_ms": seg["end_ms"],
            }
        )

    return result


def _format_speaker(raw: str) -> str:
    """Convert 'SPEAKER_00' → 'Speaker 1'."""
    try:
        num = int(raw.split("_")[-1]) + 1
        return f"Speaker {num}"
    except Exception:
        return raw
