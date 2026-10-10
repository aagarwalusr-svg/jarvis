# JARVIS: Claude Code project instructions

This repository is a real local application, not a Claude Artifact. Run Claude Code
from the repository root. Use this checkout; do not create a Git worktree unless the
user requests one. Read README.md before changing architecture.

## First run

1. Run `bash scripts/setup.sh --check` to check Node.js 22+, Python 3.12+, uv, Docker,
   Compose, and Docker daemon access. If a prerequisite is absent, explain the exact
   installation needed; never claim the app started.
2. Run `bash scripts/setup.sh`. This installs frozen dependencies and safely creates
   `.env` once. Existing settings are retained.
3. Run `bash scripts/dev.sh` in a persistent terminal. It starts PostgreSQL, FastAPI
   on port 8000, and Next.js on port 3000. Reuse matching healthy services rather than
   starting duplicates. Docker is required for the default PostgreSQL workflow.
4. Check `http://127.0.0.1:8000/health` and the frontend response. On the user's own
   computer, open `http://localhost:3000`. Remote Claude Code environments require
   their supported port-forwarding or preview facility; localhost on the user's
   phone does not address a remote machine. Do not invent a public URL.

Use `/jarvis-start` for this workflow and `/jarvis-check` for validation.

## Secrets and providers

Keys are backend-only. Never read, echo, commit, or include `.env` values in tool
output, prompts, logs, or generated archives. Ask users to enter keys in their local
editor or their environment's secure settings, not in chat. Never copy previously
posted credentials into project files. Never disable TLS verification.

- Default provider: Groq, using `GROQ_API_KEY`.
- For Claude as JARVIS's chat model: configure `ANTHROPIC_API_KEY`, restart FastAPI,
  then select Anthropic Claude in dashboard Settings. Claude Code subscription/login
  is separate from Anthropic API access; do not assume it supplies an API key.
- Other adapters: `OPENAI_API_KEY`, `GEMINI_API_KEY`.
- Fish speech: `FISH_API_KEY`, `FISH_VOICE_ID`, optional `FISH_MODEL`.
- Optional backend access protection: `JARVIS_ACCESS_TOKEN`.

Tasks, memory, history, and the dashboard work without provider keys. Chat must show
an actionable missing-key error until a selected provider is configured. The Web
Speech API provides browser dictation; Fish or browser speech reads responses.
Microphone input is reviewed before sending. API calls may incur provider charges.

## Architecture and boundaries

- `frontend/src/components/Dashboard.tsx`: dashboard, chat, settings, collections.
- `frontend/src/components/Core.tsx`: Three.js core and resource cleanup.
- `frontend/src/hooks/useSpeechOutput.ts`: cancellable Fish/browser playback.
- `backend/app/main.py`: REST, optional auth, WebSocket message lifecycle.
- `backend/app/db.py`: async SQLAlchemy/PostgreSQL persistence.
- `backend/app/providers.py`: fixed HTTPS provider destinations; no browser keys.
- `backend/app/speech.py`: authenticated backend Fish Audio adapter.
- `backend/app/automation.py`: future tool protocol, no enabled computer actions.

Agents, email, calendar, and computer control are future modules, clearly labeled.
Do not present placeholder functionality as connected. Add future side-effecting
tools with explicit approval, scoped permissions, and an audit trail. Never grant
unrestricted shell access to an AI provider. Preserve existing user changes and
PostgreSQL data; never reset the database to fix a password mismatch.

When changing frontend code, read `frontend/AGENTS.md` and the relevant installed
Next.js guide under `frontend/node_modules/next/dist/docs/`; this project uses Next
16.4. Keep production and development behavior working. Use locked installations,
commit intentional dependency/lock changes together, and keep generated files out
of commits. This release creates initial tables; schema migrations are needed
before evolving an existing database schema.

## Validation

From the root:

```bash
uv run --project backend pytest backend/tests -q
uv run --project backend ruff check backend/app backend/tests scripts/init-local-env.py
```

From `frontend`:

```bash
npm run build
npm run typecheck
npm run format:check
npm audit --audit-level=high
```

Browser checks require the running backend/database/frontend. Install Playwright's
Chromium with `npx playwright install chromium`, or use the existing system browser
via `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`. The missing-key browser test
requires empty provider keys; do not erase user keys to make it pass. If keys are
configured, report this test as not applicable and run other appropriate checks.
Backend tests use isolated SQLite. Successful provider and voice response tests
use mocks; never claim these establish live paid-provider access. Report tests
that passed, failed, or were not run precisely.
