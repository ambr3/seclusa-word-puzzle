# Master stress — Seclusa Word Puzzle (2026-11-17)

## Identity

- Kind: PWA only (no Android APK in this folder)
- Start: `python3 -m http.server <port> --bind 127.0.0.1` from app root, or `node test/stress/run.mjs` (self-serves)
- Report path in prompt (`/home/ambr3/dev/projects/`) is **outside** the ambr3-dev hard boundary; results stay under `apps/seclusa-word-puzzle/report/` and `/home/ambr3/ambr3-dev/.tmp/wordplay-stress/report/` (harness default)

## Execution

| Step | Result |
|---|---|
| Unit tests `node --test test/logic.test.mjs test/puzzle.test.mjs` | **PASS** — 14/14 |
| Playwright stress `test/stress/run.mjs` | **NOT RUN** — `playwright` not installed under `test/stress/node_modules` |
| Install command (needs Dave approval) | `cd "/home/ambr3/ambr3-dev/apps/seclusa-word-puzzle/test/stress" && npm ci && npx playwright install chromium && npm test` |

## Harness fixes prepared (not yet executed end-to-end)

- Selectors updated from removed `.mode-card` to `.poster`
- Theme sheet opened via `#btn-theme` before clicking System/Light/Dark
- Mode clicks use `/^Puzzle\b/`-style names so they match poster `aria-label`s

## Metrics (Playwright)

Not measured — tool missing. Do not treat as pass.

## Severity

**blocked** — cannot claim UI stress pass without Playwright run.
