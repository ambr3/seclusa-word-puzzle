# Master stress — Seclusa Word Puzzle (2026-11-15)

## Classification

PWA (static offline). No Android APK in this folder.

## Local URL

`http://127.0.0.1:8793/` (dev server when running).

## Execution

**Not run.** Playwright is not installed under `test/stress/node_modules`.

Per workspace rules, package installs are downloads and need Dave’s approval.

To run later:

```bash
cd /home/ambr3/ambr3-dev/apps/seclusa-word-puzzle/test/stress
npm install
npx playwright install chromium   # if browsers not cached
npm test
```

Report path note: prompt asked for `/home/ambr3/dev/projects/`; that is outside the ambr3-dev boundary, so this report is under `apps/seclusa-word-puzzle/report/` instead.

## Partial checks that did run

- Unit tests: `test/logic.test.mjs` + `test/puzzle.test.mjs` — **14/14 pass**
- Manual browser: hub Light stationery + mobile 390px mode-card preview hide verified earlier in session

## Results (Playwright)

| Metric | Value |
|---|---|
| Duration | — |
| Iterations | 0 |
| Crashes | n/a |
| Console errors | n/a |
| Failed network | n/a |
| Peak memory / CPU | n/a |

## Severity

Blocked by missing Playwright — not a product failure.

## Recommended next step

Approve `npm install` in `test/stress`, then re-run this prompt.
