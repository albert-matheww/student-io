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
| AI | Gemini (course/lesson generation, OCR, transcription, embeddings, tutor chat) |
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
alembic upgrade head    # create/update the schema (Alembic owns it — no create_all)
uvicorn app.main:app --reload --port 8000
```

Resource processing (OCR/transcription/embeddings) runs on a separate RQ worker, not
in the API process — run it alongside the server:

```bash
python worker.py
```

**Not yet deployed to Railway** — locally this is two processes; in production it
needs a second Railway service running `python worker.py` against the same Redis, so
uploads don't block/contend with the API's request handling. Wiring that up costs
nothing extra in software (RQ is free, reuses the existing Redis) but is a new
always-on process, worth doing deliberately rather than as a side effect of a deploy.

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
| `GEMINI_API_KEY` | aistudio.google.com/apikey | Real syllabus parsing, lesson notes, flashcards, quizzes, AI tutor answers, OCR, transcription, embeddings (free tier; recommended) |
| `GROQ_API_KEY` | console.groq.com/keys | Free fallback for chat + transcription when `GEMINI_API_KEY` is unset or its quota is exhausted (no embeddings/vision — Groq doesn't serve those) |
| `OPENAI_API_KEY` | platform.openai.com/api-keys | Same features as Gemini, paid, last-resort fallback when neither of the above is set |
| `CLERK_ISSUER` / `CLERK_SECRET_KEY` (api)<br>`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (web) | dashboard.clerk.com | Real Google/Apple/Microsoft sign-in, session-protected routes |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | app.supabase.com | Uploaded files go to cloud storage instead of `apps/api/uploads/` |
| `YOUTUBE_API_KEY` | console.cloud.google.com | Video recommendations on lesson pages |
| `SENTRY_DSN` (api) / `NEXT_PUBLIC_SENTRY_DSN` (web) | sentry.io (free tier) | Error monitoring — both apps run fine without it, just unmonitored |

Course generation, resource uploads, lesson-content generation, and the AI tutor are
all rate-limited per user (`slowapi`, backed by the same Redis as the job queue) so one
user can't exhaust the shared free-tier AI quota for everyone else.

**Pushing them to the deployed API (Railway):** fill `apps/api/.env`, then run
`./scripts/push-api-keys.sh` from the repo root. It upserts every non-empty key above
onto the Railway `api` service (values go through stdin, so they never hit shell
history). Non-secret model/bucket settings are pushed too. The web-side Clerk key goes
to Vercel's env vars for `student-io`, not Railway.

## Testing

```bash
cd apps/api && source .venv/bin/activate && python3 -m pytest tests/ -v
```

Covers the auth dependency's contract (a request without a valid session token must be
rejected once Clerk is configured — the exact gap that broke production), per-user data
isolation, the AI provider fallback priority, and the rate-limiter's key function. Each
test runs inside a SAVEPOINT against the real dev Postgres and rolls back on exit, so
nothing persists.

```bash
cd apps/web && npx playwright install chromium   # once
npm run test:e2e
```

One real end-to-end test: sign up through Clerk (using its `+clerk_test@` fixed-OTP
convention, no real email needed) → save the onboarding profile → confirm no error and
the flow advances. This is a genuine regression test for the auth-token bug — it failed
against the code as it stood before that fix. It also caught a second, unrelated bug
while being written: `/sign-up` and `/sign-in` weren't catch-all routes, so Clerk's
email-verification step silently failed for a browser with no prior Clerk session (i.e.
every real new visitor) — fixed by setting `routing="hash"` on both components. Needs
`CLERK_SECRET_KEY` in `apps/web/.env.local` (already required for sign-in itself) — the
suite uses Clerk's official `@clerk/testing` SDK to request a sanctioned testing token
via the Backend API, which tells Clerk's Frontend API to skip the Cloudflare Turnstile
bot-protection challenge for that test session. It does not defeat Turnstile itself —
without a testing token, headless Playwright gets a real challenge, same as any other
bot would, since that protection is working as intended. Each run deletes the Clerk
test user it created in `afterEach`; the corresponding Postgres row is not cleaned up
(a fresh/CI database wouldn't accumulate it anyway).

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
                          spaced repetition, exam planning, gamification (AI-backed)
    alembic/             migrations (initial schema) — run via `alembic upgrade head`
docker-compose.yml       Postgres (pgvector) + Redis
```

## Deployment

- **Frontend** — Vercel project `student-io`, deployed from `apps/web`. Live at
  https://student-io-kohl.vercel.app. `NEXT_PUBLIC_API_URL` points at the Railway API.
- **Backend** — Railway project `student-io`, service `api`, built from the GitHub repo
  `albert-matheww/student-io` (root `apps/api`, Dockerfile build). Push-to-deploy is
  enabled on branch `main` — every push rebuilds and redeploys. Live at
  `https://api-production-dc0b.up.railway.app`.
- **Database** — Railway service `postgres`, image `pgvector/pgvector:pg16`, reached by
  the API over Railway's private network (`postgres.railway.internal`) — never exposed
  publicly.
  - **Volume** — `postgres-volume` is attached at `/var/lib/postgresql/data` (created
    via the Railway GraphQL API — the CLI's `volume add` bug was bypassed entirely).
  - **PGDATA** — must stay `/var/lib/postgresql/data/pgdata` (set as a service
    variable): the official Postgres image refuses to `initdb` directly into a mount
    point (the volume's `lost+found` makes it "not empty"). Do not remove this.
  - **Schema** — owned by Alembic migrations (`apps/api/alembic/`). On Railway the api
    service runs `alembic upgrade head` before uvicorn on every deploy, so schema
    changes ship automatically; locally run it once after `docker compose up -d`. The
    existing production DB was stamped at the initial migration revision.

Known follow-ups from this deploy:
- **All API keys are deployed** — `CLERK_*`, `SUPABASE_*`, `YOUTUBE_API_KEY`, and
  `GEMINI_*` live on Railway (via `scripts/push-api-keys.sh`). `OPENAI_API_KEY` has
  been removed from both Railway and `apps/api/.env` since Gemini always takes
  precedence when its key is present, making the OpenAI code paths unreachable dead
  weight; re-add it if Gemini is ever intentionally disabled.
- **The web API client now sends real Clerk session tokens.** Once Clerk was wired up
  end-to-end, `apps/web/src/lib/api.ts` was still only sending the local-dev
  `X-Dev-User-Id` fallback header, so every authenticated request 401'd in production
  while the UI showed a stale "check localhost:8000" toast. Fixed by attaching
  `window.Clerk.session.getToken()` as a Bearer token when Clerk is loaded.
- **Clerk is still a Development instance** (`pk_test_`/`sk_test_` keys, visible via the
  "Development mode" badge and generic "My Application" branding on the auth pages).
  Clerk's free plan covers Production instances too (up to 50,000 monthly users, no
  cost) — switching just needs a Production instance created in the Clerk dashboard, a
  domain verified there, and the `pk_live_`/`sk_live_` keys swapped into Vercel/Railway.
  Not done yet since it's a dashboard + DNS change to live auth.
- **The RQ worker isn't deployed.** `python worker.py` needs to run as a second, always-on
  Railway service against the same Redis — see Getting Started above. Not done yet since
  it's a new billable-usage process on Railway, worth a deliberate decision.

## Not yet built

A richer multi-node knowledge graph (today it's prerequisite chain + same-module
"related concepts," not a full DAG with confused-concept clustering) is the natural
next step beyond this. The job queue exists (RQ, see Deployment) but its worker isn't
deployed to Railway yet.
