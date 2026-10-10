#!/usr/bin/env python3
"""Create local development configuration without overwriting existing settings."""

import secrets
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / ".env"
if path.exists():
    print("Existing .env retained.")
elif (root / ".local/postgres/PG_VERSION").exists():
    raise SystemExit(
        "PostgreSQL data already exists. Restore its matching .env; do not reset its password blindly."
    )
else:
    password = secrets.token_urlsafe(32)
    content = (
        (root / ".env.example")
        .read_text()
        .replace("change-this-local-password", password)
    )
    # Exclusive creation protects configuration if another process creates it concurrently.
    with path.open("x") as file:
        file.write(content)
    path.chmod(0o600)
    print(
        "Created .env with a generated local database password. Add an AI key securely."
    )
