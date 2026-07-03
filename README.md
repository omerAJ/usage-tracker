# usage-tracker

Tracks Claude Code / Codex usage across a team sharing one account.

- `usage-tracker-worker/` — Cloudflare Worker backend (receives + stores usage events)
- `collector/` — local script triggered by a Claude Code `SessionEnd` hook
- `docs/` — public dashboard, served via GitHub Pages. Per shared 5-hour session it
  shows each user's **share** of what the account actually burned — measured in cost,
  not raw tokens, so Opus vs Sonnet usage compares fairly (who to blame when you're
  both waiting on a reset) — and how full the session got vs your priciest session on
  record. Claude's real 5-hour limit isn't a published number, so that priciest
  session is the auto ceiling — pin `SESSION_COST_LIMIT_USD` in `docs/index.html`
  only if you know your plan's actual budget.

## Setup for teammates
1. `npm install` inside `collector/`
2. Add a `SessionEnd` hook in `~/.claude/settings.json` pointing to `collector/trigger.js`
3. Check the dashboard: https://omer-aj.github.io/usage-tracker/

[Cloudlfare worker URL](https://usage-tracker-worker.omer-aj.workers.dev)