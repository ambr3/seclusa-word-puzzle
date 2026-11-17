# Master audit — Seclusa Word Puzzle (2026-11-17)

Stack: static offline PWA (HTML/CSS/JS + service worker). Version on disk **0.4.0** + uncommitted UI fill / three-mode hub work.

## Verdicts (by section)

| § | Topic | Verdict |
|---|---|---|
| 1 | Inventory | GOOD — `index.html`, `offline.html`, `sw.js`, `manifest.json`, `static/js/*`, `static/css/*`, `_headers`, `.htaccess` |
| 2 | Security | GOOD — no attacker-controlled script sinks |
| 3 | XSS | GOOD — dynamic labels use `textContent`; `safeWordLabel` for stored words; static `innerHTML` shells only |
| 4 | Untrusted input | GOOD — difficulty clamped; storage JSON guarded |
| 5 | Storage | GOOD — try/catch store helpers; corrupt JSON dropped |
| 6 | Async/races | GOOD — no remote fetch races; SW GET-only |
| 7 | Timezone | GOOD — N/A beyond local date strings for scores |
| 8 | Falsy bugs | GOOD — score `> 0` gate for high scores |
| 9 | Logic | FIXED — hard Blanks length-8 no longer returns null when common pool is 4–7 only |
| 10 | Errors | GOOD — dictionary load status; storage blocked warning |
| 11 | Dead code | INFO — Ladder/Guess removed from runtime; CHANGELOG still historical |
| 12 | Performance | INFO — `words.js` large; acceptable for offline dict |
| 13 | Docs | INFO — erase label “Erase data” vs older “Erase all data” changelog wording |
| 14 | Tests | GOOD — unit tests pass (14); hard Blanks seeds added; Playwright not installed |
| 15 | Network URLs | GOOD — runtime `connect-src 'none'`; footer/disclaimer links only |
| 16 | Data at rest | GOOD — `wordplay.*` keys + shared theme; erase affordance |
| 17 | Permissions | GOOD — Permissions-Policy denies camera/mic/geo/etc. |
| 18 | Referrer/tabnabbing | GOOD — `no-referrer`; `noopener noreferrer` on blanks |
| 19 | Import/export | GOOD — N/A |
| 20 | CSP/headers | GOOD — tight meta CSP; sample `_headers`/`.htaccess` (Pages ignores them) |
| 21 | Service worker | GOOD — scoped cache prefix, GET-only, offline fallback |
| 22 | Clickjacking | INFO — `frame-ancestors 'self'` intentional for Games launcher; Pages won’t send headers |
| 23 | Manifest | GOOD |
| 24 | Cookies/fingerprint | GOOD |
| 25 | URL sinks | GOOD |
| 26 | Secrets | GOOD |
| 27 | Mixed content | GOOD |
| 28 | Cache poisoning | GOOD |
| 29 | Trusted Types | INFO — static `innerHTML` shells would need migration |
| 30 | Supply chain | GOOD — app runtime deps: none; stress harness has playwright (dev, not installed) |
| 31 | Android | N/A |
| 32 | Resume | GOOD — local-only restore; timed Puzzle pauses while tab hidden (open question) |
| 33 | README | GOOD — three games; privacy claims match `connect-src 'none'` |

## Changes made

- `static/js/app.js` — Blanks hub poster art `C_A_T` → `W_R_D`
- `static/js/dict.js:148-156` — hard Blanks falls back to `allOfLength(8)` / common length 7 so rounds always build
- `test/logic.test.mjs` — 40 hard-Blanks seeds
- `test/stress/run.mjs` — `.mode-card` → `.poster`; open Theme sheet before mode chips

## Declined / out of repo

- Playwright install (`cd test/stress && npm ci`) — downloads blocked without Dave’s say-so
- GitHub Pages does not apply `_headers` / `.htaccess`
- Timed Puzzle tab-hide pause left as intentional UX unless Dave wants wall-clock timers

## Privacy posture

**PASS.** No accounts, ads, analytics, or runtime network. CSP `connect-src 'none'`. Data stays in localStorage under app keys. External links (GitHub, ENABLE1 wiki) are user-initiated only, with `noopener noreferrer` and `no-referrer`.

## Open questions

1. Should Classic/Rush countdown keep running (wall-clock) while the tab is hidden?
2. Install Playwright and run `node test/stress/run.mjs`?
3. Version bump past 0.4.0 for this UI pass?
