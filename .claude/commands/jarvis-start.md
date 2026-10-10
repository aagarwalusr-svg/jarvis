---
description: Set up and start the local JARVIS command center
---
Read CLAUDE.md and README.md. Check prerequisites with `bash scripts/setup.sh --check`.
Run `bash scripts/setup.sh` if needed, then `bash scripts/dev.sh` in a persistent
terminal. First check existing services and reuse matching healthy ones. Verify
backend health and that the frontend responds. Report the address appropriate to
the actual host; only use localhost for a user on that same computer. Never print
secrets. If Claude API chat is requested, explain that ANTHROPIC_API_KEY is configured
on the backend and Anthropic Claude is selected in dashboard Settings. Do not
invent or copy a credential. Keep optional integrations clearly labeled.
