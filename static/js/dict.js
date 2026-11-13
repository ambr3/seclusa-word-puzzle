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

  function neighbors(word, poolSet) {
    var out = [];
    var letters = "abcdefghijklmnopqrstuvwxyz";
    for (var i = 0; i < word.length; i++) {
      for (var L = 0; L < 26; L++) {
        var ch = letters[L];
        if (ch === word[i]) continue;
        var next = word.slice(0, i) + ch + word.slice(i + 1);
        if (poolSet[next]) out.push(next);
      }
    }
    return out;
  }

  function ladderPath(start, end, maxDepth) {
    if (start === end) return [start];
    var limit = maxDepth || 8;
    var pool = Object.create(null);
    var list = byLenCommon[start.length] || [];
    for (var i = 0; i < list.length; i++) pool[list[i]] = 1;
    if (!pool[start] || !pool[end]) return null;

    var queue = [start];
    var prev = Object.create(null);
    prev[start] = null;
    var depth = Object.create(null);
    depth[start] = 0;

    while (queue.length) {
      var cur = queue.shift();
      if (depth[cur] >= limit) continue;
      var ns = neighbors(cur, pool);
      for (var j = 0; j < ns.length; j++) {
        var n = ns[j];
        if (n in prev) continue;
        prev[n] = cur;
        depth[n] = depth[cur] + 1;
        if (n === end) {
          var path = [end];
          var p = end;
          while (prev[p] != null) {
            p = prev[p];
            path.push(p);
          }
          path.reverse();
          return path;
        }
        queue.push(n);
      }
    }
    return null;
  }

  /** Normalize easy | medium | hard. */
  function difficultyOf(opts) {
    var d = opts && opts.difficulty;
    if (d === "easy" || d === "hard") return d;
    return "medium";
  }

  function makeLadder(random, opts) {
    var diff = difficultyOf(opts);
    var len = diff === "hard" ? 5 : 4;
    var minSteps = diff === "easy" ? 2 : 3;
    var maxSteps = diff === "easy" ? 3 : diff === "medium" ? 5 : 6;
    var pool = commonOfLength(len);
    for (var attempt = 0; attempt < 100; attempt++) {
      var start = pick(pool, random);
      var end = pick(pool, random);
      if (!start || !end || start === end) continue;
      var path = ladderPath(start, end, maxSteps + 1);
      if (path && path.length - 1 >= minSteps && path.length - 1 <= maxSteps) {
        return {
          start: start,
          end: end,
          path: path,
          steps: path.length - 1,
          wordLen: len,
          difficulty: diff
        };
      }
    }
    return null;
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

  function makeGuess(random, opts) {
    var diff = difficultyOf(opts);
    var len = diff === "easy" ? 4 : diff === "medium" ? 5 : 6;
    var tries = diff === "easy" ? 7 : diff === "medium" ? 6 : 5;
    var pool = commonOfLength(len);
    var word = pick(pool, random);
    return word ? { word: word, wordLen: len, maxTries: tries, difficulty: diff } : null;
  }

  function makeBlanks(random, opts) {
    var diff = difficultyOf(opts);
    var lens = diff === "easy" ? [4, 5] : diff === "medium" ? [5, 6] : [7, 8];
    var misses = diff === "easy" ? 8 : diff === "medium" ? 6 : 4;
    var len = lensesPick(lens, random);
    var word = pick(commonOfLength(len), random);
    return word ? { word: word, maxMisses: misses, difficulty: diff } : null;
  }

  function scoreGuess(guess, target) {
    guess = String(guess).toLowerCase();
    target = String(target).toLowerCase();
    var result = [];
    var remain = letterCounts(target);
    for (var i = 0; i < guess.length; i++) {
      if (guess[i] === target[i]) {
        result[i] = "hit";
        remain[guess[i]]--;
      } else {
        result[i] = "miss";
      }
    }
    for (var j = 0; j < guess.length; j++) {
      if (result[j] === "hit") continue;
      if (remain[guess[j]] > 0) {
        result[j] = "near";
        remain[guess[j]]--;
      }
    }
    return result;
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
    neighbors: neighbors,
    ladderPath: ladderPath,
    makeLadder: makeLadder,
    makeScrabble: makeScrabble,
    makeGuess: makeGuess,
    makeBlanks: makeBlanks,
    scoreGuess: scoreGuess,
    tileValue: tileValue,
    sizes: {
      common: COMMON.length,
      all: ALL.length
    }
  };
})();
