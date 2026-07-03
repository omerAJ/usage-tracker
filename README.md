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
Run:
```sh
npx github:omerAJ/usage-tracker
```

This installs the collector and wires up Claude Code / Codex hooks automatically.
If you use Codex, open it once afterward and run `/hooks` to trust the new hook.

Dashboard: https://omerAJ.github.io/usage-tracker/

[Cloudlfare worker URL](https://usage-tracker-worker.omer-aj.workers.dev)
