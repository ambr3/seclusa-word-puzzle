/*
 * Word Puzzle pure logic — shared with Seclusa Word Puzzle's Puzzle mode.
 * No DOM. Safe to load under node --test.
 */

(function (global) {
  "use strict";

  var LETTER_SCORES = {
    a: 1, b: 4, c: 4, d: 2, e: 1, f: 4, g: 3, h: 4, i: 1, j: 10, k: 5,
    l: 1, m: 3, n: 1, o: 1, p: 4, q: 10, r: 1, s: 1, t: 1, u: 2, v: 4, w: 4,
    x: 8, y: 4, z: 10
  };

  var POOL_EASY = "EEEEEEEEEAAAAAAAIIIIIIOOOOOOUUUNNNNNNRRRRRRTTTTTLLLLSSSSDDDDGGGBBCCMMPPFFHHVVWWYY";
  var POOL_MIXED = "EEEEEEEEEAAAAAAAIIIIIIIOOOOOOUUUNNNNNRRRRRTTTTTLLLLSSSSDDDGGGBBCCMMPPFFHHVVWWYYKJX";
  var POOL_HARD = "EEEEEEEEAAAAAAAIIIIIIOOOOUUUUNNNNRRRRTTTLLLLSSSSDDDGGGBBCCMMPPFFHHVVWWYYKJQXZ";
  var VOWELS = "aeiou";

  var SUBMODES = {
    classic: { name: "Classic", time: 120, xpMult: 1, blurb: "2 min sprint" },
    rush: { name: "Rush", time: 60, xpMult: 1.2, blurb: "Words add time" },
    zen: { name: "Zen", time: 0, xpMult: 0.8, blurb: "No timer" },
    challenge: { name: "Challenge", time: 0, xpMult: 1.5, blurb: "15 words to clear" }
  };

  var CHALLENGE_MAX_WORDS = 15;
  var RUSH_TIME_BONUS = 8;
  var RUSH_TIME_CAP = 150;

  function xpNeededFor(level) {
    return 50 + (level - 1) * 25;
  }

  function levelConfig(level) {
    var n = Math.min(100, Math.max(1, Math.round(level) || 1));
    var size = 4;
    var pool = POOL_EASY;
    if (n >= 11) size = 5;
    if (n >= 21) size = 6;
    if (n >= 6) pool = POOL_MIXED;
    if (n >= 16) pool = POOL_HARD;
    var diff = n >= 16 ? "Hard" : n >= 6 ? "Medium" : "Easy";
    return { level: n, size: size, pool: pool, diff: diff };
  }

  function shuffleInPlace(arr, random) {
    var rand = typeof random === "function" ? random : Math.random;
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function pickLetters(pool, n, random) {
    var rand = typeof random === "function" ? random : Math.random;
    var vPool = [];
    var cPool = [];
    for (var i = 0; i < pool.length; i++) {
      var ch = pool[i].toLowerCase();
      if (VOWELS.indexOf(ch) !== -1) vPool.push(ch);
      else cPool.push(ch);
    }
    var minV = Math.max(1, Math.round(n * 0.3));
    var maxV = Math.max(minV, Math.round(n * 0.4));
    var targetV = minV + Math.floor(rand() * (maxV - minV + 1));
    var letters = [];
    for (var v = 0; v < targetV; v++) {
      letters.push(vPool[Math.floor(rand() * vPool.length)]);
    }
    while (letters.length < n) {
      letters.push(cPool[Math.floor(rand() * cPool.length)]);
    }
    return shuffleInPlace(letters, rand);
  }

  function bonusPlan(level, gridSize) {
    var cfg = { dl: 2, tl: 2, dw: 0, tw: 0 };
    if (level >= 6) cfg.dw = 1;
    if (level >= 11) cfg.tw = 1;
    if (gridSize >= 5) { cfg.dl += 1; cfg.tl += 1; }
    if (gridSize >= 6) { cfg.dw += 1; cfg.tl += 1; }
    return cfg;
  }

  function placeBonuses(gridSize, level, random) {
    var rand = typeof random === "function" ? random : Math.random;
    var plan = bonusPlan(level, gridSize);
    var cells = [];
    for (var r = 0; r < gridSize; r++) {
      for (var c = 0; c < gridSize; c++) cells.push([r, c]);
    }
    shuffleInPlace(cells, rand);
    var types = [];
    var k;
    for (k = 0; k < plan.dl; k++) types.push("dl");
    for (k = 0; k < plan.tl; k++) types.push("tl");
    for (k = 0; k < plan.dw; k++) types.push("dw");
    for (k = 0; k < plan.tw; k++) types.push("tw");
    var grid = [];
    for (r = 0; r < gridSize; r++) {
      grid[r] = [];
      for (c = 0; c < gridSize; c++) grid[r][c] = null;
    }
    for (k = 0; k < types.length && k < cells.length; k++) {
      grid[cells[k][0]][cells[k][1]] = types[k];
    }
    return grid;
  }

  function buildGrid(level, random) {
    var cfg = levelConfig(level);
    var flat = pickLetters(cfg.pool, cfg.size * cfg.size, random);
    var letters = [];
    var i = 0;
    for (var r = 0; r < cfg.size; r++) {
      letters[r] = [];
      for (var c = 0; c < cfg.size; c++) letters[r][c] = flat[i++];
    }
    return {
      size: cfg.size,
      letters: letters,
      bonuses: placeBonuses(cfg.size, cfg.level, random),
      config: cfg
    };
  }

  function scorePath(path, letters, bonuses) {
    var letterTotal = 0;
    var wordMult = 1;
    for (var i = 0; i < path.length; i++) {
      var pos = path[i];
      var letter = letters[pos.row][pos.col];
      var bonus = (bonuses[pos.row] || [])[pos.col] || null;
      var lm = 1;
      if (bonus === "dl") lm = 2;
      else if (bonus === "tl") lm = 3;
      else if (bonus === "dw") wordMult *= 2;
      else if (bonus === "tw") wordMult *= 3;
      letterTotal += (LETTER_SCORES[letter] || 1) * lm;
    }
    var lenPts = path.length <= 4 ? 0 : (path.length - 4) * 5;
    return letterTotal * wordMult + lenPts;
  }

  function streakBonus(streak) {
    if (streak < 3) return 0;
    return Math.min(25, (streak - 2) * 3);
  }

  function neighbors(row, col, size) {
    var out = [];
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var nr = row + dr;
        var nc = col + dc;
        if (nr >= 0 && nc >= 0 && nr < size && nc < size) out.push({ row: nr, col: nc });
      }
    }
    return out;
  }

  function adjacent(a, b, size) {
    return neighbors(a.row, a.col, size).some(function (n) {
      return n.row === b.row && n.col === b.col;
    });
  }

  function pathWord(path, letters) {
    return path.map(function (p) { return letters[p.row][p.col]; }).join("");
  }

  function addXp(progress, amount) {
    var p = {
      level: Math.max(1, Math.min(9999, Math.floor(Number(progress.level)) || 1)),
      xp: Math.max(0, Math.min(1e9, Math.floor(Number(progress.xp)) || 0))
    };
    var add = Math.max(0, Math.min(1e9, Math.floor(Number(amount)) || 0));
    var leveledUp = 0;
    p.xp = Math.min(1e9, p.xp + add);
    var guard = 0;
    while (p.xp >= xpNeededFor(p.level) && p.level < 9999 && guard < 10000) {
      p.xp -= xpNeededFor(p.level);
      p.level++;
      leveledUp++;
      guard++;
    }
    if (p.level >= 9999) p.xp = 0;
    return { progress: p, leveledUp: leveledUp };
  }

  global.PuzzleLogic = {
    LETTER_SCORES: LETTER_SCORES,
    SUBMODES: SUBMODES,
    CHALLENGE_MAX_WORDS: CHALLENGE_MAX_WORDS,
    RUSH_TIME_BONUS: RUSH_TIME_BONUS,
    RUSH_TIME_CAP: RUSH_TIME_CAP,
    xpNeededFor: xpNeededFor,
    levelConfig: levelConfig,
    pickLetters: pickLetters,
    buildGrid: buildGrid,
    scorePath: scorePath,
    streakBonus: streakBonus,
    neighbors: neighbors,
    adjacent: adjacent,
    pathWord: pathWord,
    addXp: addXp,
    bonusPlan: bonusPlan
  };
})(typeof window !== "undefined" ? window : globalThis);
