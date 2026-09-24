# Noteefy Feature Lab

Local environment for Noteefy (golf tee time booking): React frontend, Python/FastAPI backend, MongoDB.

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker Desktop (or Docker Engine + Compose)

## Quick start

### 1. Start MongoDB

```bash
docker compose up -d
```

- MongoDB: `mongodb://localhost:27017/noteefy`
- mongo-express UI: [http://localhost:8081](http://localhost:8081)

### 2. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # first time only
uvicorn app.main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)  
Health: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

## Project layout

```
frontend/   Vite + React + TypeScript
backend/    FastAPI + Motor (async MongoDB)
docker-compose.yml
```

## Stack check

With all three running, open the frontend — it should show API/Mongo health, seeded courses, tee times, and a booking form.

## Domain skeleton

Mongo collections and APIs (seeded on first API start if empty):

| Resource | Endpoints |
|---|---|
| Courses | `GET/POST /api/courses`, `GET /api/courses/{id}` |
| Tee times | `GET/POST /api/tee-times`, `GET /api/tee-times/{id}` (`?course_id=`) |
| Bookings | `GET/POST /api/bookings` |

Interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs)
