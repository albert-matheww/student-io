# Student.io

**Learn Smarter. Remember Forever.**

**Live:** https://student-io-kohl.vercel.app (frontend, Vercel) · API on Railway at
`api-production-dc0b.up.railway.app`. See [Deployment](#deployment) for how it's wired
and known follow-ups.

An AI-powered learning companion that turns a semester of course material — syllabi,
slides, notes, recordings — into a personalized, AI-guided course: structured notes,
diagrams, flashcards, quizzes, spaced-repetition revision, an AI tutor, and a
day-by-day exam plan.

Everything below is wired end-to-end against a real Postgres-backed API — no mocked
frontend data. What's genuinely stubbed (and clearly labeled where it shows up in the
UI) is limited to the parts that require external accounts: live AI generation, real
auth, and cloud file storage — each has a working local-dev fallback, described below.

## What's built

- **Onboarding** — profile, AI syllabus/course generation, drag-and-drop resource upload
- **AI processing pipeline** — real OCR (PDF/DOCX/PPTX text extraction, image OCR via
  vision model), speech-to-text (Whisper) for audio/video, chunking, and embeddings
  into pgvector — runs as a background task right after upload
- **Course dashboard** — completion, streak, quiz accuracy, exam readiness, weak topics
- **Lesson pages** — structured AI notes, flashcards, quizzes, an AI tutor chat, and
  **prerequisite gating** (a lightweight knowledge graph: each lesson knows what comes
  before it, and nudges you to learn that first — with a "skip anyway" escape hatch)
- **Spaced repetition** — a real 1/3/7/14/30-day revision ladder, SM-2 flashcard
  scheduling, and an AI Confidence Score blending quiz/flashcard/revision signals
- **Exam Planner** — set an exam date and daily study budget, get a generated
  day-by-day schedule that prioritizes weak topics and reserves buffer/mock-test days
- **Gamification** — XP, levels, and achievements that unlock from real study actions
- **Global search** (⌘K) — across lessons, flashcards, quiz questions, and resources
- **Library, Flashcards, Quizzes, Revision, Analytics** — full browsable pages, not
  just dashboard widgets
- **Settings** — edit profile/preferences against the same API the onboarding flow uses

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React, TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion, TanStack Query, Zustand |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL + pgvector (semantic search / embeddings) |
| Cache/Queue | Redis |
| Auth | Clerk (Google / Apple / Microsoft OAuth) |
| AI | OpenAI (course/lesson generation, OCR, Whisper transcription, embeddings, tutor chat) |
| Storage | Supabase Storage (falls back to local disk in dev) |

## Getting started

### 1. Infra (Postgres + Redis)

```bash
docker compose up -d
```

Postgres runs on `5442` (not the default `5432`, to avoid clashing with any local
Postgres install) and Redis on `6379`.

### 2. Backend API

```bash
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in real keys — see below
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd apps/web
npm install
cp .env.example .env.local   # fill in real keys — see below
npm run dev
```

Open http://localhost:3000.

## Credentials

**Nothing above requires real credentials to run.** Every external integration has a
local-dev fallback so the full flow — onboarding → AI course generation → dashboard →
lesson notes/flashcards/quiz/tutor → revision → exam plan — works out of the box with
placeholder content and an `X-Dev-User-Id` header standing in for auth.

To make it real, add these to `apps/api/.env` / `apps/web/.env.local`:

| Variable | Where to get it | Unlocks |
|---|---|---|
| `OPENAI_API_KEY` | platform.openai.com/api-keys | Real syllabus parsing, lesson notes, flashcards, quizzes, AI tutor answers, OCR, Whisper transcription, embeddings |
| `CLERK_ISSUER` / `CLERK_SECRET_KEY` (api)<br>`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (web) | dashboard.clerk.com | Real Google/Apple/Microsoft sign-in, session-protected routes |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | app.supabase.com | Uploaded files go to cloud storage instead of `apps/api/uploads/` |
| `YOUTUBE_API_KEY` | console.cloud.google.com | Video recommendations on lesson pages |

**Pushing them to the deployed API (Railway):** fill `apps/api/.env`, then run
`./scripts/push-api-keys.sh` from the repo root. It upserts every non-empty key above
onto the Railway `api` service (values go through stdin, so they never hit shell
history). Non-secret model/bucket settings are pushed too. The web-side Clerk key goes
to Vercel's env vars for `student-io`, not Railway.

## Project structure

```
apps/
  web/                  Next.js app
    src/app/            routes: /, /onboarding/*, /dashboard/[courseId]/*, /settings
    src/components/      design system, onboarding, dashboard, lesson UI
    src/stores/          Zustand stores (onboarding flow, command palette)
    src/lib/api.ts       typed API client
  api/                  FastAPI app
    app/models.py        SQLAlchemy models
    app/routers/         onboarding, courses, lessons, revision, flashcards, search, gamification
    app/services/        syllabus/lesson generation, AI pipeline, confidence scoring,
                          spaced repetition, exam planning, gamification (OpenAI-backed)
docker-compose.yml       Postgres (pgvector) + Redis
```

## Deployment

- **Frontend** — Vercel project `student-io`, deployed from `apps/web`. Live at
  https://student-io-kohl.vercel.app. `NEXT_PUBLIC_API_URL` points at the Railway API.
- **Backend** — Railway project `student-io`, service `api`, built from
  `apps/api/Dockerfile`. Live at `https://api-production-dc0b.up.railway.app`.
- **Database** — Railway service `postgres`, image `pgvector/pgvector:pg16`, reached by
  the API over Railway's private network (`postgres.railway.internal`) — never exposed
  publicly.
  - **Volume** — `postgres-volume` is attached at `/var/lib/postgresql/data` (created
    via the Railway GraphQL API — the CLI's `volume add` bug was bypassed entirely).
  - **PGDATA** — must stay `/var/lib/postgresql/data/pgdata` (set as a service
    variable): the official Postgres image refuses to `initdb` directly into a mount
    point (the volume's `lost+found` makes it "not empty"). Do not remove this.
  - **Schema** — was recreated after the volume attach (a fresh volume starts empty).
    `CREATE EXTENSION IF NOT EXISTS vector` was run manually, then
    `Base.metadata.create_all()` was executed by temporarily flipping the api's
    `ENVIRONMENT` to `development` (which enables the dev-only auto-create in
    `app/main.py`) and flipping it back. See the migration note below — this stays a
    manual step until Alembic is wired.

Known follow-ups from this deploy:
- **No migration tool wired to production** — schema changes need the same manual
  `create_all` (or `CREATE EXTENSION`) dance as above, or real Alembic migrations,
  until that's set up.
- **Repo isn't connected to Railway** — the `api` service was uploaded from the local
  `apps/api` dir (no GitHub repo, no git history in this folder yet). Put this under
  git and link it (or use `railway up`) to unlock push-to-deploy and a declarative
  `railway.toml`.
- **No real API keys configured on Railway** — `OPENAI_API_KEY`, `CLERK_*`,
  `SUPABASE_*`, `YOUTUBE_API_KEY` are all unset on the deployed API, same as local dev.
  The live link works fully but shows the same honest placeholders described above.
  Add them as Railway variables on the `api` service to light up the real integrations.

## Not yet built

A richer multi-node knowledge graph (today it's prerequisite chain + same-module
"related concepts," not a full DAG with confused-concept clustering), a real job queue
for the AI pipeline (currently a FastAPI background task, fine for demo load), and
Alembic-managed migrations are the natural next steps beyond this.
