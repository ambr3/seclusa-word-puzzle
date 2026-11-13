# Seclusa Word Puzzle

Offline Seclusa word games in one PWA. **Puzzle** (Classic / Rush / Zen / Challenge) plus Ladder, Scrabble, Guess, and Blanks.

No clues, no accounts, no network after load (`connect-src 'none'`).

**Version:** 0.3.0  
**Repo:** [ambr3/seclusa-word-puzzle](https://github.com/ambr3/seclusa-word-puzzle)

## Documentation

**[INSTRUCTIONS.md](INSTRUCTIONS.md)** — how to play every mode, dictionary notes, privacy, run steps.

## Run

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory .
```

Open `http://127.0.0.1:8765/`.

## Testing

```bash
./tools/test.sh
# or
npm test
```

UI stress (Playwright):

```bash
cd test/stress && npm test
```

## License

GPL-3.0. See [LICENSE](LICENSE).

Made with ❤️ 🇬🇧
