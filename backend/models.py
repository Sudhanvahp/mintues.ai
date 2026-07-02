from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean
from sqlalchemy.sql import func
import json
from database import Base


class Recording(Base):
    __tablename__ = "recordings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, default="Untitled Recording")
    audio_path = Column(String, nullable=False)
    duration_sec = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    icon = Column(String, default="🌐")
    _tags = Column("tags", Text, default="[]")
    share_token = Column(String, nullable=True, unique=True)
    share_enabled = Column(Boolean, default=False)
    status = Column(String, default="uploading")  # uploading|processing|done|error
    error_message = Column(Text, nullable=True)
    processing_step = Column(String, nullable=True)
    processing_pct = Column(Integer, default=0)
    notes_markdown = Column(Text, nullable=True)
    _transcript_json = Column("transcript_json", Text, default="[]")
    rating = Column(Integer, default=0)  # 1=thumbs up, -1=thumbs down

    @property
    def tags(self):
        try:
            return json.loads(self._tags or "[]")
        except Exception:
            return []

    @tags.setter
    def tags(self, value):
        self._tags = json.dumps(value or [])

    @property
    def transcript_json(self):
        try:
            return json.loads(self._transcript_json or "[]")
        except Exception:
            return []

    @transcript_json.setter
    def transcript_json(self, value):
        self._transcript_json = json.dumps(value or [])
