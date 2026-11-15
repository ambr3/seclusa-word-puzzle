# Master audit — Seclusa Word Puzzle (2026-11-15)

Stack: static offline PWA (HTML/CSS/JS + service worker). Version on disk **0.3.9** + uncommitted stationery UI work.

## Verdicts (by section)

| § | Topic | Verdict |
|---|---|---|
| 1 | Inventory | GOOD — entry `index.html`, `offline.html`, `sw.js`, `manifest.json`, `static/js/*`, `static/css/*`, `_headers`, `.htaccess` |
| 2 | Security | GOOD — no injection of attacker-controlled data into script sinks |
| 3 | XSS | GOOD — dynamic labels use `textContent`; `safeWordLabel` for stored words; static `innerHTML` shells only |
| 4 | Untrusted input | GOOD — difficulty clamped; storage JSON guarded |
| 5 | Storage | GOOD — try/catch store helpers; corrupt JSON dropped |
| 6 | Async/races | GOOD — no remote fetch races; SW GET-only |
| 7 | Timezone | GOOD — N/A beyond local date strings for scores |
| 8 | Falsy bugs | GOOD — score `> 0` gate for high scores |
| 9 | Logic | FIXED — Classic/Rush timeout no longer counts as hub “cleared” |
| 10 | Errors | GOOD — dictionary load status; storage blocked warning |
| 11 | Dead code | INFO — large CSS overhaul layers (arcade + stationery); park/cleanup later if desired |
| 12 | Performance | INFO — `words.js` ~large; acceptable for offline dict |
| 13 | Docs | GOOD — ENABLE1 disclaimer present |
| 14 | Tests | GOOD — unit tests pass (14); Playwright stress deps not installed |
| 15 | Network URLs | GOOD — runtime `connect-src 'none'`; footer/disclaimer links only |
| 16 | Data at rest | GOOD — `wordplay.*` keys + shared theme; erase affordance |
| 17 | Permissions | GOOD — empty Permissions-Policy |
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
| 30 | Supply chain | GOOD — app runtime deps: none; stress harness has playwright (dev) |
| 31 | Android | N/A |
| 32 | Resume | GOOD — local-only restore |
| 33 | README | GOOD — claims match offline/privacy posture |

## Changes made (this audit pass)

- `static/js/app.js` — Help toggle no longer replaces button markup with `textContent`; updates `.settings-help-sub` + `aria-expanded`. Erase labels use “Erase all data”. Erase theme reset no longer strips `data-theme` after `Theme.set("system")`.
- `static/js/puzzle.js` — Classic/Rush timeout no longer sets `won` / hub cleared.
- `static/css/app.css` — Container query preview hide scoped to `:not(.mode-featured)`; mode cards use `var(--surface)` in dark instead of forced cream.
- `index.html` — Help button `aria-expanded` / `aria-controls`.

## Declined / out of repo

- GitHub Pages does not apply `_headers` / `.htaccess` (sample files already present).
- Playwright install for stress was **not** run (needs Dave’s download approval).

## Privacy posture

**PASS.** No accounts, ads, analytics, or runtime network from app logic (`connect-src 'none'`). Dictionary and progress stay on device. Optional user-initiated navigations: GitHub licence link, ENABLE1 Wikipedia credit.

## Open questions

- Version bump / commit / push for stationery UI + audit fixes?
- Install Playwright under `test/stress` to run `master-stress` fully?
