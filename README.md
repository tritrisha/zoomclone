# Zooma — Video Conferencing Platform

A full-stack Zoom-inspired meeting platform for the SDE assignment. It includes a polished responsive dashboard, instant and scheduled meetings, join validation, browser camera/microphone controls, participant and chat panels, shareable invites, and host controls.

## Stack

- Next.js 14, React, TypeScript, Lucide icons, responsive CSS
- Python, FastAPI, SQLAlchemy, Pydantic
- SQLite
- Browser WebRTC APIs for multi-party peer-to-peer audio/video and screen sharing
- FastAPI WebSockets for signaling, live participant presence, and chat
- MediaRecorder with authenticated WebM upload, playback, and download
- Dummy authentication with a fixed default user, as requested by the assignment

## Run locally

```bash
# Terminal 1 — API
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8010

# Terminal 2 — frontend
npm install
npm run dev -- --port 3002
```

Open `http://localhost:3002`; API docs are at `http://localhost:8010/docs`. The database and sample meetings are created on first API startup.

No login is required. The application automatically uses the seeded demo identity `user / userdummy07@gmail.com` so the evaluation can focus on meeting workflows.

## Real-time architecture

Each meeting uses a FastAPI WebSocket room for peer discovery and relaying WebRTC offers, answers, and ICE candidates. Media travels directly between participants rather than through the API server. Chat, participant joins/leaves, host mute-all, and meeting-end events use the same live channel. Screen sharing replaces the outgoing WebRTC video track for every connected peer. Recordings are created as WebM files in the browser, uploaded to `backend/recordings`, and indexed in SQLite for the demo user.

The included public Google STUN servers support common networks. A production deployment should configure a TURN server for restrictive corporate networks and use HTTPS/WSS, which browsers require for camera and screen access outside localhost.

## Assumptions

- A default user is signed in as requested.
- Camera/microphone access needs localhost or HTTPS and browser permission.
- The product workflow and local media preview are complete. Production multi-party media transport would additionally use WebRTC signaling and an SFU such as LiveKit or mediasoup, which is outside the assignment's specified stack.
- Set `NEXT_PUBLIC_API_URL` for deployment. Update FastAPI CORS and the invite host for the production domains.

## Deploy

Deploy the Next.js root to Vercel. Deploy `backend` to Render/Railway with `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`.
