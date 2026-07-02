# Minutes AI — Setup Guide

## One-Time Setup

### 1. Get API Keys (both free)

**Gemini API Key:**
1. Go to https://aistudio.google.com
2. Click "Get API Key" → "Create API key"
3. Copy the key

**HuggingFace Token (for speaker diarization):**
1. Sign up at https://huggingface.co
2. Go to Settings → Access Tokens → New token
3. Accept the pyannote model license at: https://huggingface.co/pyannote/speaker-diarization-3.1
4. Copy your token

### 2. Install System Dependencies

**ffmpeg** (required for audio processing):
```
winget install ffmpeg
```
Or download from https://ffmpeg.org and add to PATH.

**Node.js 18+**: https://nodejs.org

**Python 3.10+**: https://python.org

### 3. Configure Backend

Edit `backend/.env`:
```
GEMINI_API_KEY=your_actual_gemini_key
PYANNOTE_TOKEN=your_actual_huggingface_token
FRONTEND_URL=http://localhost:3000
```

### 4. Install Dependencies

**Backend:**
```
cd backend
pip install -r requirements.txt
```
First run downloads ~1GB Whisper model and pyannote weights.

**Frontend:**
```
cd frontend
npm install
```

---

## Running the App

Open **two terminals**:

**Terminal 1 — Backend:**
```
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Or double-click `start-backend.bat`

**Terminal 2 — Frontend:**
```
cd frontend
npm run dev
```
Or double-click `start-frontend.bat`

Open http://localhost:3000

---

## Share with your team

On the same WiFi network:
1. Find your IP: run `ipconfig` in CMD → look for "IPv4 Address"
2. Share `http://YOUR_IP:3000` with teammates
3. They open it in their browser — no installation needed!

For remote access, deploy to any VPS and update `.env.local`:
```
NEXT_PUBLIC_API_URL=http://YOUR_VPS_IP:8000
```

---

## Processing Time Estimates

| Recording Length | Approximate Time |
|---|---|
| 5 minutes | 3–5 minutes |
| 15 minutes | 8–12 minutes |
| 30 minutes | 15–25 minutes |

Most time is spent in speaker diarization (pyannote). CPU-only, no GPU needed.

---

## Tech Stack (100% Free)

| Component | Technology |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Python FastAPI |
| Transcription | faster-whisper (local) |
| Speaker ID | pyannote-audio 3.3.2 (local) |
| AI Notes | Google Gemini 1.5 Flash (free tier, 1500 req/day) |
| Database | SQLite |
