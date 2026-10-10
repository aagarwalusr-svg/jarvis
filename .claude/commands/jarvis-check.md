---
description: Validate JARVIS and report real results
---
Read CLAUDE.md. Run the backend tests and Ruff checks, then frontend build, TypeScript,
formatting, and audit commands documented there. Stop and restart only processes
you started if rebuilding requires it. Run browser tests with matching running
services, respecting their missing-key prerequisite without changing user secrets.
Inspect failures and fix regressions within the user's task scope. Report exactly
what ran and passed; distinguish mock provider/audio tests from live integration.
Do not print credentials or delete persistent data.
