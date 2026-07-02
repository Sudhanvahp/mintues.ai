from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class TranscriptSegment(BaseModel):
    speaker: str
    text: str
    start_ms: int
    end_ms: int


class RecordingUpdate(BaseModel):
    title: Optional[str] = None
    icon: Optional[str] = None
    tags: Optional[List[str]] = None
    rating: Optional[int] = None


class RecordingResponse(BaseModel):
    id: int
    title: str
    icon: str
    tags: List[str]
    duration_sec: float
    created_at: datetime
    status: str
    processing_step: Optional[str]
    processing_pct: int
    notes_markdown: Optional[str]
    transcript_json: List[Any]
    rating: int
    share_enabled: bool
    share_token: Optional[str]

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            title=obj.title,
            icon=obj.icon,
            tags=obj.tags,
            duration_sec=obj.duration_sec or 0.0,
            created_at=obj.created_at,
            status=obj.status,
            processing_step=obj.processing_step,
            processing_pct=obj.processing_pct or 0,
            notes_markdown=obj.notes_markdown,
            transcript_json=obj.transcript_json,
            rating=obj.rating or 0,
            share_enabled=obj.share_enabled or False,
            share_token=obj.share_token,
        )


class RecordingListItem(BaseModel):
    id: int
    title: str
    icon: str
    tags: List[str]
    duration_sec: float
    created_at: datetime
    status: str

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            title=obj.title,
            icon=obj.icon,
            tags=obj.tags,
            duration_sec=obj.duration_sec or 0.0,
            created_at=obj.created_at,
            status=obj.status,
        )


class StatusResponse(BaseModel):
    status: str
    step: Optional[str]
    percent: int
    error_message: Optional[str] = None


class ShareRequest(BaseModel):
    enabled: bool


class ShareResponse(BaseModel):
    share_enabled: bool
    share_url: Optional[str]


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
