# Open JARVIS in Claude Code

Claude Code can edit and run this repository on your computer. The ordinary Claude
chat window and Claude Artifacts do not run its Python backend or PostgreSQL service.

1. Install [Claude Code](https://code.claude.com/docs/en/overview) and the prerequisites
   in README.md (Node.js 22+, Python 3.12+, uv, Docker/Compose).
2. Get the project:

   ```bash
   git clone --branch feat/jarvis-command-center https://github.com/aagarwalusr-svg/jarvis.git
   cd jarvis
   claude
   ```

   Alternatively extract `jarvis-claude-code.zip`, open a terminal in the extracted
   project folder, and run `claude`. The archive contains source and lockfiles only;
   dependencies, keys, databases, and conversations are excluded.
3. Send this to Claude Code:

   > Read CLAUDE.md. Set up and run JARVIS using /jarvis-start. Verify backend health
   > and the dashboard, then tell me how to open it on this computer. Preserve my
   > files and database. Do not print secrets. Help me configure Anthropic Claude as
   > the chat provider through backend environment settings if I choose it.

4. Open `http://localhost:3000` on the same computer after startup. Claude Code does
   not embed the full application in its chat window. A remote Claude Code session
   needs the host's supported port forwarding; no public deployment is bundled.

For Claude-powered JARVIS chat, place your **Anthropic API key** in `ANTHROPIC_API_KEY`
using your local editor, restart FastAPI, and select **Anthropic Claude** in the
JARVIS Settings page. Your Claude subscription or Claude Code login does not
necessarily provide Anthropic API credits. Groq remains the default and works with
`GROQ_API_KEY` instead. See README.md for Fish Audio and other providers.

Use `/jarvis-check` to run project checks. No Claude session or live Anthropic call
has been tested by merely preparing these files.
