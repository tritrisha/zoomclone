from datetime import datetime, timedelta
import secrets
from pathlib import Path
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from database import Base, SessionLocal, engine, get_db
from models import Meeting, Participant, Recording, User
from schemas import JoinRequest, MeetingCreate, MeetingOut, ParticipantOut
import os

FRONTEND_URL = os.getenv("FRONTEND_URL","http://localhost:3002",).rstrip("/")


app = FastAPI(title="Zooma API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://localhost:3002", FRONTEND_URL], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
RECORDINGS_DIR = Path(__file__).parent / "recordings"
RECORDINGS_DIR.mkdir(exist_ok=True)

class MeetingHub:
    def __init__(self): self.rooms: dict[str, dict[str, WebSocket]] = {}
    async def connect(self, room: str, peer: str, ws: WebSocket):
        await ws.accept(); existing=list(self.rooms.get(room,{})); self.rooms.setdefault(room,{})[peer]=ws
        await ws.send_json({"type":"peers","peers":existing})
        await self.broadcast(room,{"type":"peer-joined","peer":peer},exclude=peer)
    async def broadcast(self, room: str, message: dict, exclude: str|None=None):
        for peer,ws in list(self.rooms.get(room,{}).items()):
            if peer!=exclude:
                try: await ws.send_json(message)
                except Exception: pass
    async def relay(self, room: str, target: str, message: dict):
        ws=self.rooms.get(room,{}).get(target)
        if ws: await ws.send_json(message)
    async def disconnect(self, room: str, peer: str):
        self.rooms.get(room,{}).pop(peer,None)
        await self.broadcast(room,{"type":"peer-left","peer":peer})
        if not self.rooms.get(room): self.rooms.pop(room,None)
hub=MeetingHub()

def current_user(db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter_by(email="userdummy01@gmail.com").first()
    if not user:
        user = User(name="user", email="userdummy01@gmail.com", password_hash="demo-auth-no-password")
        db.add(user); db.commit(); db.refresh(user)
    return user

@app.get("/api/auth/me")
def me(user: User = Depends(current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "demo": True}

def public_meeting(m: Meeting) -> dict:
    active = [p for p in m.participants if p.left_at is None]
    return {"id": m.id, "meeting_id": m.meeting_id, "title": m.title, "description": m.description or "", "host_name": m.host_name, "scheduled_at": m.scheduled_at, "duration_minutes": m.duration_minutes, "status": m.status, "invite_link": f"{FRONTEND_URL}/meeting/{m.meeting_id}", "participant_count": len(active)}

def generate_id(db: Session) -> str:
    while True:
        raw = "".join(str(secrets.randbelow(10)) for _ in range(10))
        value = f"{raw[:3]}-{raw[3:7]}-{raw[7:]}"
        if not db.query(Meeting).filter_by(meeting_id=value).first():
            return value

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        old_user = db.query(User).filter_by(email="alex@example.com").first()
        target_user = db.query(User).filter_by(email="userdummy07@gmail.com").first()
        if old_user and not target_user:
            old_user.name = "alex"
            old_user.email = "userdummy01@gmail.com"
        db.query(Meeting).filter(Meeting.host_name == "Alex Morgan").update({"host_name": "user"})
        db.query(Meeting).filter(Meeting.title == "Alex's Meeting").update({"title": "User's Meeting"})
        db.query(Participant).filter(Participant.display_name == "Alex Morgan").update({"display_name": "user"})
        db.commit()
        if db.query(Meeting).count() == 0:
            now = datetime.now()
            samples = [("Product Design Weekly", "Review latest prototypes", now + timedelta(hours=2), 45, "scheduled"), ("Engineering Standup", "Daily team sync", now + timedelta(days=1, hours=1), 30, "scheduled"), ("Client Discovery Call", "Project requirements", now + timedelta(days=2), 60, "scheduled"), ("Q2 Planning Session", "Quarterly goals", now - timedelta(days=2), 60, "ended"), ("Marketing Sync", "Campaign review", now - timedelta(days=4), 30, "ended")]
            for title, desc, when, duration, status in samples:
                m = Meeting(meeting_id=generate_id(db), title=title, description=desc, scheduled_at=when, duration_minutes=duration, status=status)
                db.add(m); db.flush()
                db.add(Participant(meeting_id_fk=m.id, display_name="user", is_host=True, left_at=when + timedelta(minutes=duration) if status == "ended" else None))
            db.commit()
    finally:
        db.close()

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/meetings")
def list_meetings(db: Session = Depends(get_db), user: User = Depends(current_user)):
    now = datetime.now()
    upcoming = db.query(Meeting).filter(
        Meeting.host_name == user.name,
        or_(Meeting.status == "active", and_(Meeting.status == "scheduled", Meeting.scheduled_at >= now))
    ).order_by(Meeting.scheduled_at).all()
    recent = db.query(Meeting).filter(Meeting.host_name == user.name, Meeting.status == "ended").order_by(Meeting.scheduled_at.desc()).limit(6).all()
    return {"upcoming": [public_meeting(m) for m in upcoming], "recent": [public_meeting(m) for m in recent]}

@app.post("/api/meetings/instant", response_model=MeetingOut)
def instant_meeting(db: Session = Depends(get_db), user: User = Depends(current_user)):
    m = Meeting(meeting_id=generate_id(db), title=f"{user.name}'s Meeting", description="Instant meeting", host_name=user.name, scheduled_at=datetime.now(), duration_minutes=60, status="active")
    db.add(m); db.flush(); db.add(Participant(meeting_id_fk=m.id, display_name=user.name, is_host=True)); db.commit(); db.refresh(m)
    return public_meeting(m)

@app.post("/api/meetings", response_model=MeetingOut, status_code=201)
def schedule_meeting(payload: MeetingCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if payload.scheduled_at < datetime.now() - timedelta(minutes=1):
        raise HTTPException(400, "Meeting time must be in the future")
    m = Meeting(meeting_id=generate_id(db), title=payload.title, description=payload.description, host_name=user.name, scheduled_at=payload.scheduled_at, duration_minutes=payload.duration_minutes, status="scheduled")
    db.add(m); db.flush(); db.add(Participant(meeting_id_fk=m.id, display_name=user.name, is_host=True)); db.commit(); db.refresh(m)
    return public_meeting(m)

@app.get("/api/meetings/{meeting_id}", response_model=MeetingOut)
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    m = db.query(Meeting).filter_by(meeting_id=meeting_id).first()
    if not m:
        raise HTTPException(404, "Meeting not found. Check the ID and try again")
    return public_meeting(m)

@app.post("/api/meetings/{meeting_id}/join")
def join_meeting(meeting_id: str, payload: JoinRequest, db: Session = Depends(get_db)):
    m = db.query(Meeting).filter_by(meeting_id=meeting_id).first()
    if not m or m.status == "ended":
        raise HTTPException(404, "This meeting does not exist or has ended")
    existing = db.query(Participant).filter_by(meeting_id_fk=m.id, display_name=payload.display_name, left_at=None).first()
    if not existing:
        existing = Participant(meeting_id_fk=m.id, display_name=payload.display_name, is_host=False)
        db.add(existing)
    if m.status == "scheduled":
        m.status = "active"
    db.commit(); db.refresh(existing); db.refresh(m)
    return {"meeting": public_meeting(m), "participant_id": existing.id}

@app.get("/api/meetings/{meeting_id}/participants", response_model=list[ParticipantOut])
def participants(meeting_id: str, db: Session = Depends(get_db)):
    m = db.query(Meeting).filter_by(meeting_id=meeting_id).first()
    if not m:
        raise HTTPException(404, "Meeting not found")
    return db.query(Participant).filter_by(meeting_id_fk=m.id, left_at=None).order_by(Participant.is_host.desc()).all()

@app.post("/api/meetings/{meeting_id}/mute-all")
def mute_all(meeting_id: str, db: Session = Depends(get_db)):
    m = db.query(Meeting).filter_by(meeting_id=meeting_id).first()
    if not m:
        raise HTTPException(404, "Meeting not found")
    db.query(Participant).filter(Participant.meeting_id_fk == m.id, Participant.is_host == False, Participant.left_at == None).update({"is_muted": True})
    db.commit()
    return {"success": True}

@app.delete("/api/meetings/{meeting_id}/participants/{participant_id}")
def remove_participant(meeting_id: str, participant_id: int, db: Session = Depends(get_db)):
    m = db.query(Meeting).filter_by(meeting_id=meeting_id).first()
    p = db.query(Participant).filter_by(id=participant_id).first()
    if not m or not p or p.meeting_id_fk != m.id:
        raise HTTPException(404, "Participant not found")
    if p.is_host:
        raise HTTPException(400, "The host cannot be removed")
    p.left_at = datetime.now(); db.commit()
    return {"success": True}

@app.post("/api/meetings/{meeting_id}/end")
def end_meeting(meeting_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    m = db.query(Meeting).filter_by(meeting_id=meeting_id).first()
    if not m:
        raise HTTPException(404, "Meeting not found")
    if m.host_name != user.name:
        raise HTTPException(403, "Only the host can end this meeting")
    m.status = "ended"
    now = datetime.now()
    db.query(Participant).filter(Participant.meeting_id_fk == m.id, Participant.left_at == None).update({"left_at": now})
    db.commit()
    return {"success": True}

@app.post("/api/meetings/{meeting_id}/leave")
def leave_meeting(meeting_id: str, participant_id: int, db: Session = Depends(get_db)):
    m = db.query(Meeting).filter_by(meeting_id=meeting_id).first()
    p = db.query(Participant).filter_by(id=participant_id).first()
    if m and p and p.meeting_id_fk == m.id:
        p.left_at = datetime.now(); db.commit()
    return {"success": True}

@app.post("/api/meetings/{meeting_id}/recordings")
async def upload_recording(meeting_id: str, file: UploadFile = File(...), duration_seconds: int = Form(0), db: Session = Depends(get_db), user: User = Depends(current_user)):
    m = db.query(Meeting).filter_by(meeting_id=meeting_id).first()
    if not m:
        raise HTTPException(404, "Meeting not found")
    content = await file.read()
    if len(content) > 250 * 1024 * 1024:
        raise HTTPException(413, "Recording exceeds the 250 MB limit")
    filename = f"{meeting_id}-{secrets.token_hex(6)}.webm"
    (RECORDINGS_DIR / filename).write_bytes(content)
    rec = Recording(meeting_id_fk=m.id, owner_id=user.id, filename=filename, size_bytes=len(content), duration_seconds=duration_seconds)
    db.add(rec); db.commit(); db.refresh(rec)
    return {"id":rec.id,"meeting_id":meeting_id,"title":m.title,"filename":filename,"size_bytes":rec.size_bytes,"duration_seconds":rec.duration_seconds,"created_at":rec.created_at}

@app.get("/api/recordings")
def list_recordings(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.query(Recording, Meeting).join(Meeting, Recording.meeting_id_fk == Meeting.id).filter(Recording.owner_id == user.id).order_by(Recording.created_at.desc()).all()
    return [{"id":r.id,"meeting_id":m.meeting_id,"title":m.title,"filename":r.filename,"size_bytes":r.size_bytes,"duration_seconds":r.duration_seconds,"created_at":r.created_at} for r,m in rows]

@app.get("/api/recordings/{recording_id}/download")
def download_recording(recording_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    rec=db.query(Recording).filter_by(id=recording_id,owner_id=user.id).first()
    if not rec: raise HTTPException(404,"Recording not found")
    return FileResponse(RECORDINGS_DIR / rec.filename,media_type="video/webm",filename=rec.filename)

@app.websocket("/ws/meetings/{meeting_id}/{peer_id}")
async def meeting_socket(ws: WebSocket, meeting_id: str, peer_id: str):
    db=SessionLocal(); meeting=db.query(Meeting).filter_by(meeting_id=meeting_id).first(); db.close()
    if not meeting or meeting.status=="ended":
        await ws.close(code=4404); return
    await hub.connect(meeting_id,peer_id,ws)
    try:
        while True:
            data=await ws.receive_json(); kind=data.get("type")
            if kind in {"offer","answer","ice"} and data.get("target"):
                await hub.relay(meeting_id,data["target"],{**data,"from":peer_id})
            elif kind in {"chat","media-state","meeting-ended"}:
                await hub.broadcast(meeting_id,{**data,"from":peer_id})
    except WebSocketDisconnect:
        await hub.disconnect(meeting_id,peer_id)
