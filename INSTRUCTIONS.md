# Seclusa Word Puzzle — full instructions

Privacy-first offline word games. Everything runs in your browser. After the first load, no network is required. There are no accounts, ads, analytics, or clue APIs.

Storage keys: `wordplay.data` and `wordplay.settings` (this app only), plus the shared Seclusa theme key `ssc.pref_key_night_mode`. **Erase saved data** clears this app’s progress and settings, then resets Theme to System (and the page background to the default lines). It does not wipe other apps’ data on the origin.

---

## Main menu

The hub lists every game. Tap a game to open **its own start menu** (difficulty, rules, stats, Play).

**Settings** (bottom of the main menu) apply to every game:

| Setting | What it does |
|---|---|
| Theme | System / Light / Dark |
| Dictionary | Shows how many words are stored on this device |
| Help | Summaries of every mode (see also this file) |
| Erase saved data | Clears progress, scores, and prefs; resets theme to System |

There is no Theme control in the top bar — use Settings.

**Back** on a start menu returns to the main menu. **Back** or **Menu** during a round returns to that game’s start menu (including Puzzle: mid-round Back leaves the board and restores Puzzle’s mode picker; Back again returns to the hub).

---

## Run locally

```bash
cd "apps/seclusa-word-puzzle"
# or: cd "project ideas/wordplay"
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`.

---

## Modes

Each game’s start menu shows a full **How to play** list in simple English. The same steps are below.

### Puzzle

1. You get a board full of letters.
2. Drag your finger or mouse from letter to letter to spell a word. You can go sideways, up, down, or diagonal.
3. You may use each letter only once in the same word.
4. A word needs at least 2 letters.
5. Some squares give bonus points: DL and TL make one letter worth more. DW and TW make the whole word worth more.
6. Longer words and finding words in a row give extra points.
7. Modes: Classic has a timer. Rush gives more time when you find a word. Zen has no timer. Challenge stops after 15 words.
8. Higher difficulty means a bigger, harder board (1–100).

### Scrabble

1. You get 7 letter tiles. The small number is that letter’s points.
2. Tap or type letters from your rack to build a word.
3. Press Play word. Real words score the tile points.
4. Using all 7 tiles in one word gives 50 bonus points.
5. Used tiles leave; new ones come from the bag.
6. Reach the target score to win (Easy 30 / Medium 55 / Hard 85).

### Blanks

1. The secret word is shown as empty spaces.
2. Guess one letter at a time.
3. Right letters appear in every place they belong.
4. Wrong letters cost a miss.
5. Reveal the word before you run out of misses.
6. Phone: on-screen keys. Computer: your keyboard.

---

## Dictionary

| List | Role |
|---|---|
| Common (ENABLE1 lengths 4–7) | Puzzle targets / seeds |
| All (~152k, length 2–12) | Accept list |

Stored in `static/js/words.js` — not fetched at runtime.

### Source and content disclaimer

Every word comes from **[ENABLE1](https://en.wikipedia.org/wiki/ENABLE_(word_list))** (Enhanced North American Benchmark Lexicon), released into the **public domain**. That is not an “open source” software licence — it is public domain: free to use and redistribute. The Wikipedia page is the credit link.

Copied offline, limited to lengths 2–12. Targets are the same list filtered to lengths 4–7. Offensive terms have been removed as far as practicable. Please report any that remain.

---

## Testing

```bash
./tools/test.sh
# or
npm test
cd test/stress && npm test   # Playwright UI stress
```

See [README.md](README.md#testing).

## License

GPL-3.0 — see [LICENSE](LICENSE).

Made with ❤️ 🇬🇧 · v0.2.0
