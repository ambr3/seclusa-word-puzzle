/* Tests for Seclusa Word Puzzle pure logic.
   Run: node --test test/ */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const jsDir = join(here, "..", "static", "js");

function load(file, extra = {}) {
  const source = readFileSync(join(jsDir, file), "utf8");
  const win = { ...extra };
  new Function("window", source)(win);
  return win;
}

const { Theme } = load("theme.js", {
  Store: { getTheme: () => "system", setTheme: () => {} },
  matchMedia: () => ({ matches: true, addEventListener() {} }),
  document: {
    documentElement: { getAttribute: () => null, setAttribute() {}, removeAttribute() {} },
    querySelectorAll: () => [],
    getElementById: () => null,
    adoptedStyleSheets: [],
  },
});

test("an explicit mode resolves to itself", () => {
  assert.equal(Theme.resolve("light"), "light");
  assert.equal(Theme.resolve("dark"), "dark");
});

test("system mode follows the operating system", () => {
  assert.equal(Theme.resolve("system"), "dark");
});

test("the store reads back what it wrote", () => {
  const { Store } = load("store.js", { localStorage: null });
  Store.setData({ hello: "world" });
  assert.deepEqual(Store.getData(), { hello: "world" });
});

test("corrupt data is dropped rather than thrown", () => {
  const storage = {
    _v: {},
    getItem(k) { return k in this._v ? this._v[k] : null; },
    setItem(k, v) { this._v[k] = String(v); },
    removeItem(k) { delete this._v[k]; },
  };
  const { Store } = load("store.js", { localStorage: storage });
  storage.setItem("wordplay.data", "{not json");
  assert.deepEqual(Store.getData(), {});
});

test("clearing removes the app's own keys and nothing else", () => {
  const storage = {
    _v: {
      "wordplay.data": "{}",
      "wordplay.settings": '{"theme":"dark"}',
      "ssc.pref_key_night_mode": "dark",
      "somebody.elses.key": "keep me"
    },
    getItem(k) { return k in this._v ? this._v[k] : null; },
    setItem(k, v) { this._v[k] = String(v); },
    removeItem(k) { delete this._v[k]; },
  };
  const { Store } = load("store.js", { localStorage: storage });
  Store.clearAll();
  assert.equal(storage.getItem("wordplay.data"), null);
  assert.equal(storage.getItem("wordplay.settings"), null);
  assert.equal(storage.getItem("ssc.pref_key_night_mode"), "dark");
  assert.equal(storage.getItem("somebody.elses.key"), "keep me");
});

test("dictionary loads and builds puzzles", () => {
  const wordsWin = load("words.js");
  const win = load("dict.js", wordsWin);
  const Dict = win.Dict;
  assert.ok(Dict.sizes.common > 1000);
  assert.ok(Dict.sizes.all > Dict.sizes.common);
  assert.equal(Dict.isWord("about"), true);
  assert.ok(Dict.makeBlanks(Dict.rng(9), { difficulty: "easy" }));
  for (let seed = 1; seed <= 40; seed++) {
    const hard = Dict.makeBlanks(Dict.rng(seed), { difficulty: "hard" });
    assert.ok(hard, "hard blanks seed " + seed);
    assert.ok(hard.word.length >= 7);
    assert.equal(hard.maxMisses, 4);
  }
  const sb = Dict.makeScrabble(Dict.rng(13), { difficulty: "medium" });
  assert.ok(sb);
  assert.equal(sb.rack.length, 7);
  assert.equal(sb.target, 55);
  assert.equal(Dict.tileValue("q"), 10);
  assert.equal(Dict.tileValue("a"), 1);
});
