# usage-tracker

Tracks Claude Code / Codex usage across a team sharing one account.

- `usage-tracker-worker/` — Cloudflare Worker backend (receives + stores usage events)
- `collector/` — local script triggered by a Claude Code `SessionEnd` hook
- `docs/` — public dashboard, served via GitHub Pages

## Setup for teammates
1. `npm install` inside `collector/`
2. Add a `SessionEnd` hook in `~/.claude/settings.json` pointing to `collector/trigger.js`
3. Check the dashboard: https://omer-aj.github.io/usage-tracker/

[Cloudlfare worker URL](https://usage-tracker-worker.omer-aj.workers.dev)