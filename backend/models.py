from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from database import Base

class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(Integer, primary_key=True)
    meeting_id = Column(String(20), unique=True, nullable=False, index=True)
    title = Column(String(160), nullable=False)
    description = Column(Text, default="")
    host_name = Column(String(100), nullable=False, default="user")
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=30)
    status = Column(String(20), nullable=False, default="scheduled", index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    participants = relationship("Participant", back_populates="meeting", cascade="all, delete-orphan")

class Participant(Base):
    __tablename__ = "participants"
    id = Column(Integer, primary_key=True)
    meeting_id_fk = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    is_host = Column(Boolean, nullable=False, default=False)
    is_muted = Column(Boolean, nullable=False, default=False)
    joined_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)
    meeting = relationship("Meeting", back_populates="participants")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class Recording(Base):
    __tablename__ = "recordings"
    id = Column(Integer, primary_key=True)
    meeting_id_fk = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    duration_seconds = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
