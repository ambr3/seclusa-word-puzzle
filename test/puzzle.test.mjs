/* PuzzleLogic unit tests — Word Puzzle scoring / grids / XP. */
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

const { PuzzleLogic: PL } = load("puzzle-logic.js");

test("levelConfig grows grid and hardens pool", () => {
  assert.equal(PL.levelConfig(1).size, 4);
  assert.equal(PL.levelConfig(1).diff, "Easy");
  assert.equal(PL.levelConfig(10).diff, "Medium");
  assert.equal(PL.levelConfig(15).size, 5);
  assert.equal(PL.levelConfig(25).size, 6);
  assert.equal(PL.levelConfig(25).diff, "Hard");
});

test("pickLetters returns requested count with vowels", () => {
  const letters = PL.pickLetters(PL.levelConfig(1).pool, 16, () => 0.5);
  assert.equal(letters.length, 16);
  assert.ok(letters.some((ch) => "aeiou".includes(ch)));
});

test("scorePath applies DL and length bonus", () => {
  const letters = [
    ["c", "a", "t", "s"],
    ["x", "x", "x", "x"],
    ["x", "x", "x", "x"],
    ["x", "x", "x", "x"],
  ];
  const bonuses = [
    ["dl", null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ];
  const path = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 0, col: 3 },
  ];
  // c=4*2, a=1, t=1, s=1 → 11; len<=4 → no length bonus
  assert.equal(PL.scorePath(path, letters, bonuses), 11);

  const longPath = path.concat([{ row: 1, col: 3 }]);
  letters[1][3] = "y";
  // previous 11 + y=4 + length bonus 5 = 20
  assert.equal(PL.scorePath(longPath, letters, bonuses), 20);
});

test("scorePath applies TW word multiplier", () => {
  const letters = [["a", "t"]];
  const bonuses = [["tw", null]];
  const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
  // (1+1)*3 = 6
  assert.equal(PL.scorePath(path, letters, bonuses), 6);
});

test("xpNeededFor and addXp level up", () => {
  assert.equal(PL.xpNeededFor(1), 50);
  const r = PL.addXp({ level: 1, xp: 40 }, 20);
  assert.equal(r.leveledUp, 1);
  assert.equal(r.progress.level, 2);
  assert.equal(r.progress.xp, 10);
});

test("adjacent and pathWord", () => {
  assert.equal(PL.adjacent({ row: 0, col: 0 }, { row: 1, col: 1 }, 4), true);
  assert.equal(PL.adjacent({ row: 0, col: 0 }, { row: 2, col: 0 }, 4), false);
  const letters = [["h", "i"], ["x", "y"]];
  assert.equal(
    PL.pathWord([{ row: 0, col: 0 }, { row: 0, col: 1 }], letters),
    "hi"
  );
});

test("buildGrid is sized for difficulty", () => {
  const g4 = PL.buildGrid(1, () => 0.3);
  assert.equal(g4.size, 4);
  assert.equal(g4.letters.length, 4);
  assert.equal(g4.letters[0].length, 4);
  const g6 = PL.buildGrid(30, () => 0.3);
  assert.equal(g6.size, 6);
});

test("streakBonus thresholds", () => {
  assert.equal(PL.streakBonus(1), 0);
  assert.equal(PL.streakBonus(3), 3);
  assert.equal(PL.streakBonus(20), 25);
});
