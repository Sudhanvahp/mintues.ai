import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

_client = None

MODEL = "llama-3.3-70b-versatile"


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
    return _client


def _chat(prompt: str) -> str:
    response = get_client().chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2048,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()


def generate_notes(transcript: list[dict]) -> str:
    if not transcript:
        return "No transcript available."

    transcript_text = "\n".join(f"{s['speaker']}: {s['text']}" for s in transcript)

    prompt = f"""You are a professional meeting minutes assistant.
Given the transcript below (with speaker labels), generate structured meeting notes in Markdown:
- Use **bold headers** for each main topic discussed
- Use bullet points for key information under each header
- Use nested sub-bullets for details
- Add an "Action Items" section at the end if any tasks were assigned to people
- Be concise — do not copy the transcript verbatim

Transcript:
{transcript_text}

Return ONLY the markdown. No preamble."""

    try:
        return _chat(prompt)
    except Exception as e:
        print(f"[notes] error: {e}")
        return _fallback_notes(transcript)


def generate_title(transcript: list[dict]) -> str:
    if not transcript:
        return "Untitled Recording"

    excerpt = " ".join(s["text"] for s in transcript[:10])[:500]

    prompt = f"""Given this meeting transcript excerpt, generate a short 2-5 word title that captures the main topic.
Return ONLY the title, nothing else. No quotes, no punctuation at the end.

Transcript excerpt:
{excerpt}"""

    try:
        return _chat(prompt).strip('"').strip("'")
    except Exception as e:
        print(f"[notes] title error: {e}")
        return "Meeting Recording"


def chat_with_recording(message: str, transcript: list[dict], notes: str) -> str:
    transcript_text = "\n".join(
        f"{s['speaker']}: {s['text']}" for s in transcript
    ) if transcript else "No transcript available."

    prompt = f"""You are a helpful assistant answering questions about a meeting recording.

Meeting Notes:
{notes or 'Not available.'}

Meeting Transcript:
{transcript_text}

Answer the user's question based only on the meeting content above. Be concise and helpful.

User question: {message}"""

    return _chat(prompt)


def _fallback_notes(transcript: list[dict]) -> str:
    lines = ["## Meeting Transcript Summary\n"]
    for seg in transcript:
        lines.append(f"- **{seg['speaker']}**: {seg['text']}")
    return "\n".join(lines)
