# JARVIS · Personal AI Command Center

A working first stage for a personal assistant: a dark-blue neon dashboard, animated Three.js holographic core, FastAPI API, PostgreSQL persistence, and real-time WebSocket chat. No AI credentials are included.

## Use with Claude Code

Open this repository in Claude Code and run `/jarvis-start`. Root `CLAUDE.md` supplies architecture, startup, secret-handling, and validation instructions. See [the Claude Code handoff](docs/CLAUDE_HANDOFF.md) for the exact clone command and prompt. Run `/jarvis-check` for validation. Claude Code runs the app on its host; the regular Claude chat window cannot host the Python/PostgreSQL application.

## What works

- Chat using Groq (default), OpenAI, Anthropic Claude, or Gemini; select provider/model in Settings.
- Conversation history persisted in PostgreSQL, with reopen and deletion controls.
- Persistent tasks and memory notes. The latest 20 notes accompany future provider requests; the latest 40 messages provide chat context.
- Browser microphone dictation, reviewed before sending; optional Fish Audio or browser speech synthesis for replies.
- Responsive dashboard, connection checks, provider key status, and explicit error reporting.
- Server-side API keys, optional backend bearer-token protection, and WebSocket origin checks.

Agents, calendar, email, and computer control are clearly marked as future modules. There is no desktop access, background listening, autonomous action execution, calendar connection, or email connection in this release. `backend/app/automation.py` defines an extension boundary for future approved tools.

## Run locally

Prerequisites: **Node.js 22+** (tested with 24), **Python 3.12+**, **uv**, and **Docker with Compose v2**. Install uv using [the official instructions](https://docs.astral.sh/uv/getting-started/installation/) if necessary.

From the repository root:

```bash
# Creates .env once, with a random local PostgreSQL password; retains existing files.
python3 scripts/init-local-env.py
```

Edit `.env` in your local editor and set `GROQ_API_KEY` to your key. Leave other provider keys empty unless you want to use them. The server reads this file; it is ignored by Git. You can also copy `.env.example` to `.env` manually and replace both database password placeholders with the same chosen local password. No external AI account is needed to run the dashboard, tasks, memory, and history. Chat returns an actionable error until the selected provider has a usable key.

Install locked dependencies:

```bash
cd backend
uv sync --frozen
cd ../frontend
npm ci
cd ..
```

Start everything:

```bash
bash scripts/dev.sh
```

Open **http://localhost:3000** locally. FastAPI documentation is at **http://localhost:8000/docs**. Stop frontend/backend with Ctrl+C; PostgreSQL remains running. To stop it:

```bash
docker compose stop db
```

Alternatively, start each service in its own terminal:

```bash
# Terminal 1, repository root
python3 scripts/init-local-env.py
docker compose up -d --wait db

# Terminal 2, repository root
cd backend
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --ws-max-size 65536

# Terminal 3, repository root
cd frontend
npm run dev
```

The `--wait` flag waits for the database health check. The backend creates the initial tables on startup. PostgreSQL data is retained under the ignored `.local/postgres/` directory. Keep the matching `.env` file; changing its password does not change an existing database user's password. Schema migrations are a future step before altering these initial tables.

To build and run the production frontend locally:

```bash
cd frontend
npm run build
npm start
```

Keep the backend and database running as above. The frontend defaults to `http://localhost:8000` and `ws://localhost:8000`. For different endpoints, create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

These are public addresses, never credentials. Restart the development server or rebuild after changing them. For remote deployment, use HTTPS/WSS, set `CORS_ORIGINS` to the exact frontend origins, and provide your browser-reachable backend address. Frontend Docker/service hostnames are not browser addresses.

## Provider configuration

| Provider | Backend environment variable | Default model | HTTPS destination |
| --- | --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | `gpt-4.1-mini` | `api.openai.com` |
| Claude | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` | `api.anthropic.com` |
| Gemini | `GEMINI_API_KEY` | `gemini-2.5-flash` | `generativelanguage.googleapis.com` |
| Groq | `GROQ_API_KEY` | `llama-3.3-70b-versatile` | `api.groq.com` |

Model availability depends on your provider account; Settings accepts another model ID. Restart FastAPI after setting keys. Keys are never accepted by the frontend, returned from status endpoints, or stored in provider preferences. The browser stores only selected provider/model and voice-output preference. An optional `JARVIS_ACCESS_TOKEN` is entered in Settings and held in page memory; refresh requires entering it again. WebSocket authentication is carried in its first frame, not in its URL.

For Fish Audio output, set `FISH_API_KEY` and `FISH_VOICE_ID` in the backend environment and restart FastAPI. Set `FISH_MODEL` if your account uses a different model (default: `s2.1-pro`). The supplied voice ID is stored as a non-secret environment setting; API keys must be supplied securely. The adapter follows the [official Fish Audio SDK](https://github.com/fishaudio/fish-audio-python) MessagePack request contract and returns MP3 audio through an authenticated backend endpoint. If Fish is not configured, speech output uses the browser. A Fish request failure is displayed and does not silently switch services.

Voice input uses the browser Web Speech API and requires microphone permission on localhost or HTTPS. Chrome/Edge support varies by platform; browsers may send speech to their vendor's service. Text chat remains usable without speech support. Voice input fills the composer rather than automatically executing a command. Enable speech output with the speaker button. Disable it or start dictation to stop speech. Fish Audio receives the assistant text for synthesis when configured; browser fallback uses installed browser voices.

This is a **single-user local development application**, not a public multi-user service. The backend binds to loopback by default. Set `JARVIS_ACCESS_TOKEN` before exposing it beyond your computer. Production needs TLS, per-user identity/data isolation, rate limiting, database migrations, and backups. Chat text and saved notes go to the selected AI provider. Provider calls return a complete response; WebSocket events deliver readiness, saved messages, thinking, completion, and errors. Token streaming is not yet implemented.

## Validation

```bash
# Repository root
uv run --project backend pytest backend/tests -q
uv run --project backend ruff check backend/app backend/tests

cd frontend
npm run build
npm run typecheck
npm audit --audit-level=high
```

Browser tests require the backend, PostgreSQL, and frontend running, and empty provider keys for the missing-key test:

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
# In the prepared cloud machine, use the already installed browser:
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Backend tests use an isolated in-memory SQLite database; browser tests exercise the running PostgreSQL services for task, memory, and history persistence. Provider contract tests mock upstream HTTP responses; the successful browser reply test mocks its WebSocket transport. Voice tests simulate browser dictation and playback APIs; Fish Audio tests mock its upstream audio response. A live paid-provider call requires a real API key and is not claimed by these tests. CI runs backend tests/lint and the frontend production build/type check.

## Structure

```text
frontend/src/app/              Next.js pages, layout, Tailwind/CSS theme
frontend/src/components/      Dashboard and Three.js holographic core
frontend/tests/               Browser functional checks
backend/app/main.py           REST API, auth, WebSocket chat lifecycle
backend/app/db.py             Async SQLAlchemy models and sessions
backend/app/providers.py      Server-side provider adapters
backend/app/automation.py     Future approved automation protocol
backend/app/speech.py         Server-side Fish Audio speech adapter
frontend/src/hooks/           Cancellable Fish/browser speech playback
backend/tests/                Persistence, security, provider-contract tests
scripts/                      Safe local initialization and development startup
compose.yaml                  PostgreSQL development service
```

Next stages: incremental schema migrations, streamed tokens, scoped agent tools with approval and audit records, desktop shell integration, then separately authorized calendar/email integrations. Never give the model unrestricted shell access.
