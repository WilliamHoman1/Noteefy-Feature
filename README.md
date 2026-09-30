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

With all three running, open the frontend — it should show the Noteefy Links West course card,
six tee times for today, and a working sign-up and booking flow.

## Everything on screen comes from Mongo

The frontend formats API responses; it does not hold any domain data of its own.

| On screen | Source |
|---|---|
| Course name, address, phone | `courses` document |
| Course preview photo | Image bytes in GridFS, streamed by `GET /api/courses/{id}/image` |
| Tee time, price range, player count | `tee_times` document |
| "9 or 18 Holes" | Derived from `holes_options` |
| "Cart Optional" | Derived from `cart_policy` |
| Sidebar filter options and counts | Aggregated by `GET /api/courses/{id}/filters` |

Tee times are stored as UTC instants and rendered in the course's own `timezone`, so the
grid shows the club's local wall clock regardless of where the browser is.

To see this for yourself, edit a tee time in
[mongo-express](http://localhost:8081) — set `cart_policy` to `walking_only` or
`holes_options` to `[9]` — and reload the app. The card text, the filter list, and the
booking modal's options all change with no code edit.

## API

Seeded on API start (idempotent):

| Resource | Endpoints |
|---|---|
| Users | `POST /api/users/signup`, `POST /api/users/login`, `GET /api/users/{id}`, `GET /api/users/{id}/bookings` |
| Courses | `GET/POST /api/courses`, `GET /api/courses/{id}`, `GET /api/courses/{id}/image`, `GET /api/courses/{id}/filters` |
| Tee times | `GET/POST /api/tee-times`, `GET /api/tee-times/{id}` — search with `?course_id=&date=YYYY-MM-DD&players=&holes=&cart_policy=&tee_time_window=` |
| Bookings | `GET/POST /api/bookings`, `DELETE /api/bookings/{id}` (cancel; restores slots) |

Passwords are hashed with bcrypt and never returned. Each booking is its own document
carrying the golfer's `user_id` and the options they picked (`holes`, `cart`, `players`);
the booking's `_id` is the ID surfaced in the UI. The tee time document decides which
options are legal, so a request for 12 holes or a cart on a walking-only time is rejected.

Interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs)
