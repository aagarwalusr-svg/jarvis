# Basketball AI Film Studio — Windows / Claude Code kit

This folder gives Claude Code an installer, local ComfyUI controller, production brief, and explicit approval workflow. It is a setup-and-production starting point, not a preinstalled AI model or finished one-click video generator. Large models and a compatible real workflow must be selected on your PC using current official documentation.

## Start

1. Extract the ZIP to a writable folder, such as Documents\BasketballStudio.
2. Install Claude Code from https://code.claude.com/docs/en/setup if you don't already have it. A Claude website conversation cannot execute these local files; use Claude Code locally. Its own account/usage charges are separate from local generation.
3. Open a terminal in the extracted folder and run `claude`, or open the folder in the Claude Code VS Code extension.
4. Paste START-IN-CLAUDE.txt into Claude Code. Review its concrete plan and approve the installs you want. Claude reads CLAUDE.md and runs the setup locally.

Keep your laptop plugged in. Model downloads can be large; the operator must report actual sizes before downloading. Your GPU has 16 GB VRAM, not 31.6 GB dedicated memory. Local generation avoids per-clip credits but consumes time, electricity and storage. Model licenses vary.

## Included

- setup.ps1: read-only prerequisite checks by default; opt-in ComfyUI clone, isolated Python environment, CUDA PyTorch, GPU computation smoke test.
- Start-Studio.cmd: starts the local server, no internet exposure.
- studio.py: hardware/server diagnostics, installed node/model preflight, prompt binding, explicit opt-in generation, polling and output downloads.
- story.json: three shots and fictional dialogue for the first 10–20 second scene.
- CLAUDE.md and /studio-start: detailed operator workflow, voice/assembly stages and readiness checks.
- tests: mock-server integration verification of controller behavior. No live GPU generation was tested when packaging this kit.

## Manual commands after installation

Run Start-Studio.cmd and leave its window open. From another terminal:

```
python studio.py doctor
python studio.py render --workflow workflows/video-api.json --bindings workflows/bindings.json --shot 1
python studio.py render --workflow workflows/video-api.json --bindings workflows/bindings.json --shot 1 --approve
```

Workflow files are created by Claude from a real supported workflow; example bindings are schema examples, not runnable model configurations. Generation defaults to seed 20261011. Downloaded output is under renders/. Review each shot before generating more. Timeout leaves the existing job alone; it does not cancel or submit duplicates.

The setup does not automatically install voices, video models, driver updates, or paid APIs. Claude completes the approved selections and tests. Prefer local voice-over initially; reliable lip sync on basketball heads is an additional task.
