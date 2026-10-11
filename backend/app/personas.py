"""Canonical fictional character profiles shared with the visual studio."""

import json
from pathlib import Path

CAST = json.loads((Path(__file__).resolve().parents[2] / "shared/personas.json").read_text())
PERSONAS = {character["id"]: character for character in CAST["characters"]}
