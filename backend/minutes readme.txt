┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (User)                               │
│                                                                     │
│   🎙 Record Audio                                                   │
│   ScriptProcessorNode → PCM chunks → encodeWAV() → WAV Blob        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ POST /recordings/upload (WAV file)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND  FastAPI + uvicorn                       │
│                                                                     │
│   /recordings/upload  ──── saves WAV ──────► uploads/ folder       │
│         │                                         │                │
│         │ background task                         │                │
│         ▼                                         │                │
│   ┌─────────────────────────────────────┐         │                │
│   │     PROCESSING PIPELINE             │         │                │
│   │                                     │         │                │
│   │  1. get_audio_duration()            │         │                │
│   │         ·                           │         │                │
│   │         ·                           │         │                │
│   │  2. transcribe()  ◄─────────────── WAV        │                │
│   │     faster-whisper (local)          │         │                │
│   │     → segments [{text, start, end}] │         │                │
│   │         ·                           │         │                │
│   │         ·                           │         │                │
│   │  3. diarize()  ◄────────────────── WAV        │                │
│   │     pyannote-audio (local)          │         │                │
│   │     HuggingFace model token         │         │                │
│   │     → [{speaker, start, end}]       │         │                │
│   │         ·                           │         │                │
│   │         ·                           │         │                │
│   │  4. merge_transcript_with_speakers()│         │                │
│   │     → [{speaker, text, start_ms}]   │         │                │
│   │         ·                           │         │                │
│   │         ·                           │         │                │
│   │  5. generate_notes()  ──────────────┼─────► GROQ API          │
│   │     generate_title()  ──────────────┼─────► llama-3.3-70b     │
│   │     ← notes_markdown, title         │         │                │
│   │                                     │         │                │
│   └──────────────┬──────────────────────┘         │                │
│                  │ save all results                │                │
│                  ▼                                 │                │
│         SQLite DB (recordings.db)                  │                │
│         SQLAlchemy ORM                             │                │
│         status: processing → done                  │                │
│                                                     │               │
│   /recordings/{id}/status  (polled every 2s)       │               │
│   /recordings/{id}         (fetch full data)        │               │
│   /recordings/{id}/audio   (stream WAV) ◄──────────┘               │
│   /recordings/{id}/chat    ────────────────────► GROQ API          │
│                                                   llama-3.3-70b     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ JSON responses
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   FRONTEND  Next.js 14                              │
│                                                                     │
│   /record          → recording screen + WAV capture                │
│   /processing/[id] → polls /status every 2s → progress bar        │
│   /notes/[id]      → Minutes tab (notes_markdown)                  │
│                    → Transcript tab (speaker groups)               │
│                    → Chat tab (chat messages ↔ Groq)               │
│   /shared/[token]  → public share link                             │
└─────────────────────────────────────────────────────────────────────┘


EXTERNAL SERVICES
─────────────────
  GROQ API  (gsk_...)    ← transcription (Whisper large-v3)
                         ← notes + title (llama-3.3-70b)
                         ← chat replies  (llama-3.3-70b)

  HuggingFace  (hf_...)  ← pyannote speaker diarization model weights
                            (downloaded once, runs locally after)


LOCAL FILES
───────────
  backend/uploads/       ← WAV audio files
  backend/recordings.db  ← SQLite database
c:\Users\DELL\Desktop\APMS.ai\TECHNICAL\MINUTES.AI\backend\database.py
it has all the information that need ?
Read c:\Users\DELL\Desktop\APMS.ai\TECHNICAL\MINUTES.AI\backend\database.py
Yes, it has everything. One small correction — the DB file is minutes_ai.db, not recordings.db as I wrote.

Otherwise the flowchart is complete:

All 3 Groq uses (Whisper transcription, Llama notes/title, Llama chat)
pyannote + HuggingFace token
Full processing pipeline order
All frontend routes
File storage paths
How frontend polls for status
also need information on what api is used technuical things in pointwise completely
Minutes AI — Complete Technical Reference
1. GROQ API
Key format: gsk_... (standard API key)
Base URL: https://api.groq.com/openai/v1 (OpenAI-compatible)
Python SDK: groq (pip install groq)
Used for 3 things:
Use	Model	Max Tokens	Temp
Audio transcription	whisper-large-v3	—	—
Notes + title generation	llama-3.3-70b-versatile	2048	0.3
Chat with recording	llama-3.3-70b-versatile	2048	0.3
Transcription call:

client.audio.transcriptions.create(
    model="whisper-large-v3",
    file=audio_file,
    response_format="verbose_json",  # returns segments with timestamps
    timestamp_granularities=["segment"]
)
LLM call:

client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": prompt}]
)
Rate limit (free tier): 14,400 req/day, 6,000 tokens/min
Env var: GROQ_API_KEY
2. HuggingFace — pyannote Speaker Diarization
Token format: hf_...
Model: pyannote/speaker-diarization-3.1
Token required to: download gated model weights (one-time)
Runs: fully local after download — no API calls at runtime
Input requirement: WAV file (16kHz mono PCM)
Returns: timeline of {speaker: "SPEAKER_00", start, end} segments
Library: pyannote.audio==3.3.2
Deps: torch, torchaudio
Env var: PYANNOTE_TOKEN
3. Browser Audio APIs (Frontend)
AudioContext({ sampleRate: 16000 }) — creates audio processing graph
getUserMedia({ audio: true }) — requests mic permission
createMediaStreamSource(stream) — feeds mic into audio graph
createScriptProcessor(4096, 1, 1) — captures raw PCM Float32 chunks
onaudioprocess — fires every 4096 samples, collects Float32Array
Custom encodeWAV() — builds RIFF WAV header + 16-bit PCM from chunks
Output: Blob of type audio/wav — universally readable by pyannote/ffmpeg
4. FastAPI Backend
Framework: FastAPI + uvicorn
Run command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
CORS: allows http://localhost:3000 (configurable via FRONTEND_URL)
Background tasks: BackgroundTasks (built-in FastAPI) — processing runs after response returns
Thread pool: ThreadPoolExecutor(max_workers=2) for blocking AI calls
File upload: python-multipart for multipart/form-data
All endpoints:
Method	Path	Purpose
POST	/recordings/upload	upload WAV, start processing
GET	/recordings	list all, supports ?q= search
GET	/recordings/{id}	full recording data
GET	/recordings/{id}/status	{status, step, percent}
GET	/recordings/{id}/audio	stream audio file
PATCH	/recordings/{id}	update title/icon/tags/rating
DELETE	/recordings/{id}	delete recording + file
POST	/recordings/{id}/share	toggle public link
POST	/recordings/{id}/chat	ask question → Groq reply
GET	/recordings/{id}/export	download notes/transcript/audio
5. Database
Engine: SQLite (minutes_ai.db in backend root)
ORM: SQLAlchemy (declarative_base)
Session: SessionLocal — per-request via get_db() dependency injection
Schema key fields: id, title, audio_path, status, processing_step, processing_pct, transcript_json (JSON), notes_markdown, duration_sec, rating, icon, tags, share_token, share_enabled, error_message, created_at
transcript_json stored as JSON array: [{speaker, text, start_ms, end_ms}]
6. Frontend — Next.js 14
Router: App Router (app/ directory)
Styling: Tailwind CSS v3
Key libraries:
react-markdown — renders notes_markdown
lucide-react — icons
Polling: custom usePolling hook — GET /status every 2 seconds until status === "done"
API base URL: http://localhost:3000/api proxied to http://localhost:8000 via next.config
Mobile-first: max-w-[480px] mx-auto on all pages
Design tokens: primary #2B7FFF, bg white, Inter font
7. Processing Pipeline — Step by Step

WAV uploaded
    ↓
get_audio_duration()        ffmpeg-python reads duration
    ↓
transcribe()                Groq Whisper large-v3
                            → segments [{text, start, end}]
    ↓
diarize()                   pyannote-audio local
                            → [{speaker, start, end}]
    ↓
merge_transcript_with_speakers()
                            match each segment to speaker by timestamp overlap
                            → [{speaker, text, start_ms, end_ms}]
    ↓
generate_notes()            Groq llama-3.3-70b → markdown notes
generate_title()            Groq llama-3.3-70b → 2-5 word title
    ↓
saved to SQLite, status = "done"
8. Environment Variables (.env)
Variable	Value format	Used by
GROQ_API_KEY	gsk_...	transcription + notes + chat
PYANNOTE_TOKEN	hf_...	pyannote model download (one-time)
FRONTEND_URL	http://localhost:3000	CORS + share link generation
