/*
 * Seclusa Word Puzzle dictionary helpers — offline only, no network.
 *
 * Expects window.WORDPLAY_ALL from words.js (ENABLE1, public domain).
 * Puzzle targets ("common") are ENABLE1 words of length 4–7 — not a
 * separate curated list.
 */

(function () {
  "use strict";

  var ALL = Array.isArray(window.WORDPLAY_ALL) ? window.WORDPLAY_ALL.slice() : [];
  var COMMON = [];
  var commonSet = Object.create(null);
  var allSet = Object.create(null);
  var byLenCommon = Object.create(null);
  var byLenAll = Object.create(null);

  function index(list, set, byLen) {
    for (var i = 0; i < list.length; i++) {
      var w = list[i];
      if (typeof w !== "string" || !/^[a-z]+$/.test(w)) continue;
      set[w] = 1;
      var n = w.length;
      if (!byLen[n]) byLen[n] = [];
      byLen[n].push(w);
    }
  }

  index(ALL, allSet, byLenAll);
  for (var len = 4; len <= 7; len++) {
    var bucket = byLenAll[len] || [];
    for (var i = 0; i < bucket.length; i++) {
      var w = bucket[i];
      COMMON.push(w);
      commonSet[w] = 1;
      if (!byLenCommon[len]) byLenCommon[len] = [];
      byLenCommon[len].push(w);
    }
  }

  function isCommon(word) {
    return !!(word && commonSet[String(word).toLowerCase()]);
  }

  function isWord(word) {
    return !!(word && allSet[String(word).toLowerCase()]);
  }

  function commonOfLength(n) {
    return (byLenCommon[n] || []).slice();
  }

  function allOfLength(n) {
    return (byLenAll[n] || []).slice();
  }

  function anagramKey(word) {
    return String(word || "").toLowerCase().split("").sort().join("");
  }

  /** Mulberry32 — deterministic enough for daily puzzles. */
  function rng(seed) {
    var t = (seed >>> 0) || 1;
    return function () {
      t += 0x6d2b79f5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function daySeed(extra) {
    var d = new Date();
    var base = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return (base * 1009 + (extra || 0)) >>> 0;
  }

  function pick(list, random) {
    if (!list || !list.length) return null;
    return list[Math.floor(random() * list.length)];
  }

  function shuffle(arr, random) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function letterCounts(word) {
    var c = Object.create(null);
    for (var i = 0; i < word.length; i++) {
      var ch = word[i];
      c[ch] = (c[ch] || 0) + 1;
    }
    return c;
  }

  /** Normalize easy | medium | hard. */
  function difficultyOf(opts) {
    var d = opts && opts.difficulty;
    if (d === "easy" || d === "hard") return d;
    return "medium";
  }

  /** Classic English Scrabble letter values. */
  var TILE_VALUE = {
    a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3,
    n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10
  };

  /** English Scrabble tile counts (no blanks). */
  var TILE_BAG = {
    a: 9, b: 2, c: 2, d: 4, e: 12, f: 2, g: 3, h: 2, i: 9, j: 1, k: 1, l: 4, m: 2,
    n: 6, o: 8, p: 2, q: 1, r: 6, s: 4, t: 6, u: 4, v: 2, w: 2, x: 1, y: 2, z: 1
  };

  function tileValue(ch) {
    return TILE_VALUE[String(ch || "").toLowerCase()] || 0;
  }

  function freshBag() {
    var bag = [];
    Object.keys(TILE_BAG).forEach(function (ch) {
      for (var i = 0; i < TILE_BAG[ch]; i++) bag.push(ch);
    });
    return bag;
  }

  function makeScrabble(random, opts) {
    var diff = difficultyOf(opts);
    var target = diff === "easy" ? 30 : diff === "medium" ? 55 : 85;
    var bag = shuffle(freshBag(), random);
    var rack = [];
    for (var i = 0; i < 7 && bag.length; i++) rack.push(bag.pop());
    return { bag: bag, rack: rack, target: target, difficulty: diff };
  }

  function lensesPick(lens, random) {
    return lens[Math.floor(random() * lens.length)];
  }

  function makeBlanks(random, opts) {
    var diff = difficultyOf(opts);
    var lens = diff === "easy" ? [4, 5] : diff === "medium" ? [5, 6] : [7, 8];
    var misses = diff === "easy" ? 8 : diff === "medium" ? 6 : 4;
    var len = lensesPick(lens, random);
    // Common pool is lengths 4–7 only; hard may ask for 8 from the full list.
    var word = pick(commonOfLength(len), random) || pick(allOfLength(len), random);
    if (!word && diff === "hard") word = pick(commonOfLength(7), random);
    return word ? { word: word, maxMisses: misses, difficulty: diff } : null;
  }

  window.Dict = {
    isCommon: isCommon,
    isWord: isWord,
    commonOfLength: commonOfLength,
    allOfLength: allOfLength,
    anagramKey: anagramKey,
    rng: rng,
    daySeed: daySeed,
    pick: pick,
    shuffle: shuffle,
    makeScrabble: makeScrabble,
    makeBlanks: makeBlanks,
    tileValue: tileValue,
    sizes: {
      common: COMMON.length,
      all: ALL.length
    }
  };
})();
