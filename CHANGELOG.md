# Changelog

All notable changes to **Seclusa Word Puzzle**.

## 0.3.5 — 2026-11-13

### Changed
- Dictionary is ENABLE1 only (public domain). Removed the separate curated Word Puzzle common list; targets are ENABLE1 lengths 4–7.
- Disclaimer wording: public domain (not “open source”); summary says offensive terms only.

## 0.3.4 — 2026-11-13

### Changed
- Dictionary disclaimer now names the original sources: curated Seclusa Word Puzzle common list, and ENABLE1 (public domain) for the accept list.

## 0.3.3 — 2026-11-13

### Fixed
- Erase saved data resets theme/background in the UI (not only storage).
- Puzzle high scores no longer store 0-point rounds.
- Sample headers allow same-origin framing again for the Seclusa Games launcher.
- Theme boot also reads `wordplay.settings.theme` when the shared night-mode key is missing.
- Puzzle play HUD sets the mode label with `textContent`.

### Changed
- Filtered offensive and racist terms from the offline word list (41 removed from the accept list).
- Added dictionary source disclaimer in the hub, README, and INSTRUCTIONS.
- Erase clears only this app’s data keys; theme reset is explicit via Theme.set("system").

## 0.3.2 — 2026-11-13

### Changed
- Per-game start menus and play chrome use the same coloured hero theme as the hub cards.

## 0.3.1 — 2026-11-13

### Changed
- Hub polish: distinct coloured game cards with mini previews, hero panel, and roomier Settings layout.

## 0.3.0 — 2026-11-13

### Changed
- Rebuilt as a multi-mode offline PWA: **Puzzle** (Classic / Rush / Zen / Challenge), Ladder, Scrabble, Guess, and Blanks.
- Same GitHub Pages repo and icons as the previous Word Puzzle app.
- Child-friendly How to play lists on every game start menu.
- Guess uses clear Wordle colours; Guess/Blanks use on-screen keys on touch and the physical keyboard on desktop.
- Bee and Grid modes removed (overlap with Puzzle / Scrabble).
- GPL-3.0 footer with Made with ❤️ 🇬🇧.

## 0.1.1 — 2026-11-06

### Fixed
- A word submitted while `words.js` is still loading is scored only on the round that submitted it.
- Quitting Classic, Rush, or Challenge says "Round ended". A score of 0 is not stored. Zen still says "Round Complete".
- Settings hides Sounds, because this game has none, and lists the accent palettes the theme already applies.
- The service worker is registered once. `LICENSE` is precached, so the footer link works offline.
- `_headers` and `.htaccess` are present again. They match the document CSP, with `frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN`. GitHub Pages does not send them.

### Changed
- **One version for the whole app.** There is no `?v=` cache-buster. The version lives in `index.html` (`meta name="version"`) and `manifest.json`. The service worker names its cache from the manifest, and About shows that version.
- The footer source link points at the GitHub repository. The offline page links to the author's page.
- The high-score button says "Clear scores and progress", which is what it clears.

### Fixed
- **The service worker no longer deletes other caches on the origin.** Its activate sweep filtered on `k !== CACHE_NAME`, which matched *every* cache that wasn't its own — measurably, opening this game emptied the Seclusa Games launcher's offline cache from 24 entries to 0. It is now scoped to the `word-puzzle-` prefix.
- `words.js` is now requested with a plain URL and the service worker precaches it with a plain URL. The request used to be `?v=0.1.5` while the worker precached `?v=0.1.6`, so the precached dictionary never matched a single real request.
- Offline navigation now falls back to the cache when an intermediary (proxy, captive portal, CDN) returns an HTTP error page instead of failing at the network level. Previously the error page was served to the page as though it were the game.
- Cache lookups are scoped to this worker's own cache rather than searching every cache on the origin.
- `X-Frame-Options: SAMEORIGIN` instead of `DENY` (in both `_headers` and `.htaccess`). `DENY` made the game impossible to frame by the Seclusa Games launcher in production while looking fine under a plain file server.
- `connect-src` in `.htaccess` was `'self'` while `_headers` said `'none'`; the two host paths enforced different policies. Both are now `'none'`.
- `frame-src 'none'` and `frame-ancestors 'self'` in the header CSP. A same-origin page can frame the game. The game cannot frame anything else.
- Hub ← Games pill styled correctly (CSP blocked inline bridge CSS)

## 0.1.5 — 2026-09-29

### Changed
- App icon: single glowing **W** tile (aurora theme) replacing the old WORDS! grid.

## 0.1.4 — 2026-09-29

### Added
- Install App button (Chrome/Edge `beforeinstallprompt`).
- iOS / mobile-web-app meta tags for Add to Home Screen.

### Fixed
- Manifest installability: PNG 192/512 with separate `any` + `maskable` purposes, stable `id`, `start_url`/`scope` `./`.
- Service worker offline navigate falls back to cached `index.html` first.

## 0.1.3 — 2026-09-29

### Changed
- Menu fits one viewport: How to Play collapsed, denser chrome, Play + High Scores side-by-side.
- In-game site header hidden on all devices; HUD stays visible; grid sized to leftover height.

### Fixed
- Gameplay HUD / header no longer clipped off the top of the screen.

## 0.1.2 — 2026-09-28

### Added
- Vowel-clamped letter deal (≈30–40% vowels) with retuned Easy / Mixed / Hard pools.
- Streak bonus that actually adds points (from ×3).
- Aurora UI theme: glass cards, gradient brand, glowing Play CTA, motion with reduced-motion respect.
- README with features, privacy table, local play, and deploy notes.
- Footer version line (`v0.1.2`).

### Fixed
- `endGame` double-fire could award XP / scores twice (Zen End Round).
- Challenge result title said “Time’s Up!” with no timer.
- Timer warning style leaked into Zen / Challenge.
- MIXED double-J and HARD thin D / Q–U balance.

### Changed
- Clear All Data wipes scores, progress, and saved difficulty.
- Privacy copy: no third-party requests (same-origin assets only).

## 0.1.1 — 2026-09-28

### Added
- Initial privacy-first word puzzle PWA: Classic / Rush / Zen / Challenge, difficulty 1–100, Ruzzle-style bonuses, offline service worker, local high scores.
- Master-audit hardening: GET + same-origin SW, offline fallback, storage validation, CSP / header samples, Clear data affordance.
