from datetime import datetime
from pydantic import BaseModel, Field

class MeetingCreate(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=1000)
    scheduled_at: datetime
    duration_minutes: int = Field(default=30, ge=15, le=480)

class MeetingOut(BaseModel):
    id: int
    meeting_id: str
    title: str
    description: str
    host_name: str
    scheduled_at: datetime
    duration_minutes: int
    status: str
    invite_link: str
    participant_count: int = 0

class JoinRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)

class ParticipantOut(BaseModel):
    id: int
    display_name: str
    is_host: bool
    is_muted: bool
    model_config = {"from_attributes": True}
