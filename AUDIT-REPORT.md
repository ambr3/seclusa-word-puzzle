# Seclusa Word Puzzle MASTER-AUDIT report

**Target:** `project ideas/wordplay`  
**Date:** 2026-11-13  
**Stack:** Static Seclusa PWA (HTML/CSS/JS + service worker). No runtime npm deps. Dev-only `package.json` test scripts.

## 1. Inventory — GOOD

Entry: `index.html`. Scripts: `theme-boot.js`, `words.js`, `dict.js`, `puzzle-logic.js`, `puzzle.js`, `store.js`, `theme.js`, `app.js`. SW: `sw.js` (`seclusa-wordplay-` v0.2.0). Offline: `offline.html`. Tests: `test/*.test.mjs`, `tools/test.sh`. License: GPL-3.0.

## 2–4. Security / XSS / injection — GOOD (after fixes)

CSP: `connect-src 'none'`, no `unsafe-inline`/`unsafe-eval`. No eval, no third-party scripts, no secrets.  
**Fixed:** `puzzle.js` best-word / result strings via `textContent` + `[a-z]` allowlist (was `innerHTML` concat). Remaining `innerHTML` clears/static shells only.

## 5. Storage — GOOD

`wordplay.data` / `wordplay.settings` / `ssc.pref_key_night_mode`. Try/catch + memory fallback. Corrupt JSON dropped. Clear-data control on hub.

## 6. Async / races — GOOD

No network in app JS. SW fetch network-first with catch. Guess keydown cleaned via `_cleanup`.

## 7. Timezone — GOOD (N/A)

Only `toLocaleDateString` for local high-score dates.

## 8. Falsy — GOOD

Difficulty / XP / scores use explicit numeric checks.

## 9. Logic — FIXED then GOOD

Review fixes: Puzzle Back → in-mode menu; wins only on real clears; Puzzle “played” on Play; RNG salt every round; “played” after successful build; end titles by reason. Grid mode removed (overlap with Puzzle).

## 10. Errors — GOOD

Failed generators show “Try another difficulty”. Storage failures silent-fallback.

## 11. Hygiene — GOOD

No TODOs/FIXME in app JS. Template remnants removed from hub Theme dropdown.

## 12. Performance — INFO

`words.js` ~1.8MB. Bee/Grid removed; Scramble reworked as Scrabble. Logic stress historically clean.

## 13. Docs — GOOD

`INSTRUCTIONS.md` / `README.md` match hub Settings + per-mode menus.

## 14. Tests — GOOD / INFO

14 unit tests pass. Suggest later: Puzzle `back()` / win criteria integration tests.

## 15–19. Privacy — PASS

No outbound URLs from app logic. No cookies, analytics, geolocation. Referrer `no-referrer`. No import/export surface yet.

## 20–22. Headers / SW / clickjacking — FIXED (samples)

**Added:** `_headers`, `.htaccess` with `frame-ancestors 'none'`, `X-Frame-Options`, nosniff, COOP/CORP, Permissions-Policy, CSP parity. GitHub Pages ignores these — host must send headers on publish. Meta Permissions-Policy remains documentary only (GOOD / INFO).

SW: GET-only, same-origin, scoped prefix, required precache check — GOOD.

## 23. Manifest — GOOD

`id`/`scope`/`start_url` `./`, icons present, no GCM.

## 24–28. Cookies / messaging / secrets / HTTPS / cache — GOOD

No cookies, postMessage, secrets. `upgrade-insecure-requests`. SW cacheable queries bounded.

## 29. Trusted Types — INFO

Not enabled: many static `innerHTML` shells. Feasible later after migrating to DOM APIs.

## 30. Supply chain — GOOD

Zero runtime deps. Dev: Node built-in test runner only.

## 31. Android — N/A

## 32. Resume — GOOD

Cold start from SW shell; theme from localStorage; progress local-only.

## 33. README — GOOD

Claims match (offline, no accounts, dictionary on device). Version **0.2.0**.

## Changes made

| File | Change |
|------|--------|
| `static/js/app.js` | Back/Puzzle wiring, stats, RNG, played-after-build |
| `static/js/puzzle.js` | `back()`, `onPlayed`/`onRoundEnd`, win rules, titles, XSS-safe labels |
| `static/js/dict.js` | Grid builder removed with mode |
| `_headers`, `.htaccess` | Hardening header samples |
| `AUDIT-REPORT.md` | This report |

## Declined / out-of-repo

- Host must serve `_headers` / `.htaccess` (GitHub Pages does not).
- Version bump not applied (needs your OK).
- Trusted Types not turned on (would break current `innerHTML` shells).

## Privacy posture — **PASS**

Nothing is sent anywhere. After first load the app needs no network. Data stays in namespaced localStorage. Dictionary is shipped in-repo.

## Open questions

None outstanding (0.2.0 bump, git init, Playwright, GPL footer — done on request).
