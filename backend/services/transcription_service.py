import os
import subprocess
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

_client = None


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
    return _client


def get_audio_duration(audio_path: str) -> float:
    """Return duration in seconds using ffprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                audio_path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        return float(result.stdout.strip())
    except Exception:
        return 0.0


def transcribe(audio_path: str, language: str = None) -> list[dict]:
    """
    Transcribe audio using Groq Whisper large-v3.
    Sends file directly — no ffmpeg conversion needed.
    Groq supports webm, mp4, wav, mp3, ogg natively.
    """
    file_size = os.path.getsize(audio_path)
    print(f"[transcription] audio file size: {file_size} bytes ({audio_path})")
    if file_size < 500:
        raise RuntimeError(f"Audio file is too small ({file_size} bytes) — microphone may not be capturing audio. Check Windows microphone privacy settings and browser permissions.")

    ext = os.path.splitext(audio_path)[1].lower()
    mime_map = {
        ".webm": "audio/webm",
        ".mp4": "audio/mp4",
        ".m4a": "audio/mp4",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
    }
    mime_type = mime_map.get(ext, "audio/webm")
    filename = os.path.basename(audio_path)

    client = get_client()

    kwargs = {
        "model": "whisper-large-v3",
        "response_format": "verbose_json",
        "timestamp_granularities": ["segment"],
    }
    if language and language != "auto":
        kwargs["language"] = language

    try:
        with open(audio_path, "rb") as f:
            transcription = client.audio.transcriptions.create(
                file=(filename, f, mime_type),
                **kwargs,
            )

        result = []
        for seg in (transcription.segments or []):
            if isinstance(seg, dict):
                text = seg.get("text", "").strip()
                start_ms = int(seg.get("start", 0) * 1000)
                end_ms = int(seg.get("end", 0) * 1000)
            else:
                text = (seg.text or "").strip()
                start_ms = int(seg.start * 1000)
                end_ms = int(seg.end * 1000)
            if text:
                result.append({
                    "text": text,
                    "start_ms": start_ms,
                    "end_ms": end_ms,
                    "speaker": "Speaker 1",
                })

        return result

    except Exception as e:
        print(f"[transcription] Groq error: {e}")
        raise
