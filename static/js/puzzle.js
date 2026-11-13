/*
 * Seclusa Word Puzzle — Puzzle mode (Classic / Rush / Zen / Challenge).
 * Classic / Rush / Zen / Challenge, difficulty 1–100, DL/TL/DW/TW scoring.
 */

(function () {
  "use strict";

  var PL = window.PuzzleLogic;
  var DRAG_THRESHOLD = 8;
  var MAX_FOUND_MISSES = 40;

  function loadPuzzleData() {
    var data = window.Store.getData() || {};
    if (!data.puzzle || typeof data.puzzle !== "object") {
      data.puzzle = {
        progress: { level: 1, xp: 0 },
        difficulty: 1,
        scores: { classic: [], rush: [], zen: [], challenge: [] },
        bestWord: "",
        bestWordPts: 0
      };
    }
    var p = data.puzzle;
    if (!p.progress) p.progress = { level: 1, xp: 0 };
    if (!p.scores) p.scores = { classic: [], rush: [], zen: [], challenge: [] };
    p.difficulty = Math.min(100, Math.max(1, Math.floor(Number(p.difficulty)) || 1));
    return data;
  }

  function savePuzzleData(data) {
    window.Store.setData(data);
  }

  /**
   * @param {object} opts
   * @param {HTMLElement} opts.root
   * @param {function(string): void} opts.toast
   * @param {function(string=, string=): void} opts.setStatus
   * @param {function(): void} [opts.onPlayed]
   * @param {function({won:boolean,reason:string,words:number,score:number}): void} [opts.onRoundEnd]
   */
  function mount(opts) {
    var root = opts.root;
    var toast = opts.toast || function () {};
    var setStatus = opts.setStatus || function () {};
    var onPlayed = opts.onPlayed || function () {};
    var onRoundEnd = opts.onRoundEnd || function () {};

    var data = loadPuzzleData();
    var submode = "classic";
    var difficulty = data.puzzle.difficulty;
    var playing = false;
    var grid = null;
    var selected = [];
    var selectedSet = Object.create(null);
    var foundWords = Object.create(null);
    var foundMisses = [];
    var score = 0;
    var streak = 0;
    var challengeWords = 0;
    var bestWord = "";
    var bestWordPts = 0;
    var timeLeft = 0;
    var timerInterval = null;
    var isDragging = false;
    var pendingStart = null;
    var dragStartPoint = { x: 0, y: 0 };
    var gridEl = null;
    var svgEl = null;
    var phase = "menu"; // menu | play | result
    var lastEndReason = "timeout";

    function cleanup() {
      stopTimer();
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("keydown", onKey);
      playing = false;
      root.innerHTML = "";
    }

    function stopTimer() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }

    function armTimer() {
      if (submode === "zen" || submode === "challenge") return;
      stopTimer();
      timerInterval = setInterval(function () {
        timeLeft--;
        paintHud();
        if (timeLeft <= 0) {
          stopTimer();
          endRound("timeout");
        }
      }, 1000);
    }

    function onVisibility() {
      if (!playing) return;
      if (document.hidden) stopTimer();
      else armTimer();
    }

    function onKey(e) {
      if (playing && e.key === "Escape") clearSelection();
    }

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKey);

    function render() {
      if (phase === "menu") renderMenu();
      else if (phase === "play") renderPlay();
      else renderResult();
    }

    function safeWordLabel(word) {
      return typeof word === "string" && /^[a-z]+$/i.test(word) ? word.toLowerCase() : "";
    }

    function renderMenu() {
      var cfg = PL.levelConfig(difficulty);
      var prog = data.puzzle.progress;
      var needed = PL.xpNeededFor(prog.level);
      root.innerHTML =
        '<div class="pz-menu mode-page">' +
          '<section class="mode-hero" aria-label="Puzzle">' +
            '<div class="mode-card-top">' +
              '<span class="mode-mark" aria-hidden="true">P</span>' +
              '<span class="mode-tag">Signature</span>' +
            '</div>' +
            '<div class="mode-card-body">' +
              '<div class="mode-card-copy">' +
                '<h2 class="mode-name">Puzzle</h2>' +
                '<p class="mode-blurb">Drag letters on a grid. Classic, Rush, Zen, or Challenge.</p>' +
              '</div>' +
              '<span class="mode-preview mode-preview-puzzle" aria-hidden="true" id="pz-hero-preview"></span>' +
            '</div>' +
          '</section>' +
          '<div class="panel mode-start"><div class="section how-play">' +
            '<h2>How to play</h2>' +
            '<ol class="how-steps">' +
              '<li>You get a board full of letters.</li>' +
              '<li>Drag your finger or mouse from letter to letter to spell a word. You can go sideways, up, down, or diagonal.</li>' +
              '<li>You may use each letter only once in the same word.</li>' +
              '<li>A word needs at least 2 letters.</li>' +
              '<li>Some squares give bonus points: DL and TL make one letter worth more. DW and TW make the whole word worth more.</li>' +
              '<li>Longer words and finding words in a row give extra points.</li>' +
              '<li>Pick a mode below: Classic has a timer. Rush gives you more time when you find a word. Zen has no timer. Challenge stops after 15 words.</li>' +
              '<li>Move the difficulty slider. Higher numbers mean a bigger, harder board.</li>' +
            '</ol>' +
          '</div></div>' +
          '<div class="statstrip mt12">' +
            '<div class="statcell"><span class="statkey">Difficulty</span><span class="statvalue" id="pz-diff"></span><span class="statsub" id="pz-diff-sub"></span></div>' +
            '<div class="statcell"><span class="statkey">Profile</span><span class="statvalue" id="pz-lv"></span><span class="statsub" id="pz-xp"></span></div>' +
            '<div class="statcell"><span class="statkey">Best word</span><span class="statvalue stat-word" id="pz-best"></span><span class="statsub" id="pz-best-pts"></span></div>' +
          '</div>' +
          '<div class="panel mt12 mode-start"><div class="section">' +
            '<h2>Mode</h2>' +
            '<div class="pz-modes" id="pz-modes"></div>' +
          '</div><div class="section settings-block">' +
            '<h2>Difficulty</h2>' +
            '<div class="pz-diff-row">' +
              '<button type="button" class="btn" id="pz-diff-minus" aria-label="Lower difficulty">−</button>' +
              '<input type="range" id="pz-diff-slider" min="1" max="100" value="' + difficulty + '" aria-label="Difficulty">' +
              '<button type="button" class="btn" id="pz-diff-plus" aria-label="Raise difficulty">+</button>' +
            '</div>' +
            '<p class="meta-line mt10">1–5 easy 4×4 · 6–10 mixed · 11–15 5×5 · 16–20 hard · 21–100 6×6</p>' +
          '</div><div class="section">' +
            '<button type="button" class="btn primary wide mode-play-btn" id="pz-play">Play</button>' +
          '</div></div>' +
          '<div class="panel mt12 mode-start"><div class="section">' +
            '<h2>High scores</h2>' +
            '<div class="pz-hs-tabs" id="pz-hs-tabs"></div>' +
            '<ul class="pz-hs-list" id="pz-hs-list"></ul>' +
          '</div></div>' +
        '</div>';

      var previewHost = root.querySelector("#pz-hero-preview");
      if (previewHost) {
        var cells = "W O R D P L A Y G A M E S U N T".split(" ");
        var path = { 0: 1, 1: 1, 2: 1, 3: 1 };
        cells.forEach(function (ch, i) {
          var cell = document.createElement("span");
          cell.className = "mp-cell" + (path[i] ? " on" : "");
          cell.textContent = ch;
          previewHost.appendChild(cell);
        });
      }

      root.querySelector("#pz-diff").textContent = String(difficulty);
      root.querySelector("#pz-diff-sub").textContent = cfg.diff + " · " + cfg.size + "×" + cfg.size;
      root.querySelector("#pz-lv").textContent = "Lv " + prog.level;
      root.querySelector("#pz-xp").textContent = prog.xp + " / " + needed + " XP";
      var bestSafe = safeWordLabel(data.puzzle.bestWord);
      root.querySelector("#pz-best").textContent = bestSafe || "—";
      root.querySelector("#pz-best-pts").textContent =
        bestSafe && data.puzzle.bestWordPts ? ("+" + data.puzzle.bestWordPts) : "No words yet";

      var modesEl = root.querySelector("#pz-modes");
      Object.keys(PL.SUBMODES).forEach(function (id) {
        var m = PL.SUBMODES[id];
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pz-mode-btn" + (id === submode ? " active" : "");
        btn.dataset.mode = id;
        btn.innerHTML = '<span class="mode-name"></span><span class="mode-blurb"></span>';
        btn.querySelector(".mode-name").textContent = m.name;
        btn.querySelector(".mode-blurb").textContent = m.blurb;
        btn.addEventListener("click", function () {
          submode = id;
          renderMenu();
        });
        modesEl.appendChild(btn);
      });

      function setDiff(n) {
        difficulty = Math.min(100, Math.max(1, Math.round(n) || 1));
        data.puzzle.difficulty = difficulty;
        savePuzzleData(data);
        renderMenu();
      }
      root.querySelector("#pz-diff-minus").addEventListener("click", function () { setDiff(difficulty - 1); });
      root.querySelector("#pz-diff-plus").addEventListener("click", function () { setDiff(difficulty + 1); });
      root.querySelector("#pz-diff-slider").addEventListener("input", function (e) {
        setDiff(parseInt(e.target.value, 10));
      });
      root.querySelector("#pz-play").addEventListener("click", startRound);

      var hsMode = submode;
      var tabs = root.querySelector("#pz-hs-tabs");
      Object.keys(PL.SUBMODES).forEach(function (id) {
        var t = document.createElement("button");
        t.type = "button";
        t.className = "theme-chip" + (id === hsMode ? " active" : "");
        t.textContent = PL.SUBMODES[id].name;
        t.addEventListener("click", function () {
          paintScores(id);
          tabs.querySelectorAll("button").forEach(function (b) {
            b.classList.toggle("active", b === t);
          });
        });
        if (id === hsMode) t.setAttribute("aria-checked", "true");
        tabs.appendChild(t);
      });
      paintScores(hsMode);
    }

    function paintScores(modeId) {
      var list = root.querySelector("#pz-hs-list");
      if (!list) return;
      var scores = (data.puzzle.scores[modeId] || []).slice(0, 10);
      list.innerHTML = "";
      if (!scores.length) {
        var empty = document.createElement("li");
        empty.className = "muted";
        empty.textContent = "No scores yet.";
        list.appendChild(empty);
        return;
      }
      scores.forEach(function (s, i) {
        var li = document.createElement("li");
        li.textContent = "#" + (i + 1) + " — " + s.score + " pts (" + s.words + " words) — " + s.date;
        list.appendChild(li);
      });
    }

    function startRound() {
      score = 0;
      streak = 0;
      challengeWords = 0;
      bestWord = "";
      bestWordPts = 0;
      foundWords = Object.create(null);
      foundMisses = [];
      selected = [];
      selectedSet = Object.create(null);
      grid = PL.buildGrid(difficulty, Math.random);
      timeLeft = PL.SUBMODES[submode].time;
      playing = true;
      phase = "play";
      lastEndReason = "timeout";
      setStatus("");
      onPlayed();
      renderPlay();
      armTimer();
    }

    function renderPlay() {
      var sm = PL.SUBMODES[submode];
      root.innerHTML =
        '<div class="pz-play">' +
          '<div class="pz-hud">' +
            '<div><span class="statkey">Score</span><span class="statvalue" id="pz-score">0</span></div>' +
            '<div><span class="statkey" id="pz-timer-label">Time</span><span class="statvalue" id="pz-timer">0:00</span></div>' +
            '<div><span class="statkey">Mode</span><span class="statvalue" id="pz-mode-name"></span></div>' +
          '</div>' +
          '<div class="pz-challenge hidden" id="pz-challenge"></div>' +
          '<div class="pz-rush hidden" id="pz-rush"><div class="pz-rush-fill" id="pz-rush-fill"></div><span id="pz-rush-text"></span></div>' +
          '<p class="pz-current" id="pz-current">&nbsp;</p>' +
          '<div class="buttonrow center hidden" id="pz-word-actions">' +
            '<button type="button" class="btn primary" id="pz-submit">Submit</button>' +
            '<button type="button" class="btn" id="pz-clear">Clear</button>' +
          '</div>' +
          '<div class="pz-board">' +
            '<svg class="pz-path" id="pz-path" aria-hidden="true"></svg>' +
            '<div class="pz-grid" id="pz-grid"></div>' +
          '</div>' +
          '<div class="buttonrow mt12">' +
            '<button type="button" class="btn hidden" id="pz-zen-end">End round</button>' +
            '<button type="button" class="btn danger" id="pz-quit">Quit</button>' +
          '</div>' +
          '<div class="pz-found">' +
            '<p class="meta-line">Found <span id="pz-found-count">0</span></p>' +
            '<ul class="pz-found-list" id="pz-found-list"></ul>' +
          '</div>' +
        '</div>';

      gridEl = root.querySelector("#pz-grid");
      svgEl = root.querySelector("#pz-path");
      var modeNameEl = root.querySelector("#pz-mode-name");
      if (modeNameEl) modeNameEl.textContent = sm.name;
      paintGrid();
      paintHud();

      root.querySelector("#pz-submit").addEventListener("click", function () {
        if (!playing) return;
        submitWord();
        clearSelection();
      });
      root.querySelector("#pz-clear").addEventListener("click", function () {
        if (!playing) return;
        clearSelection();
      });
      root.querySelector("#pz-quit").addEventListener("click", function () {
        if (playing) endRound("quit");
      });
      var zenEnd = root.querySelector("#pz-zen-end");
      if (submode === "zen") {
        zenEnd.classList.remove("hidden");
        zenEnd.addEventListener("click", function () { if (playing) endRound("zen"); });
      }

      gridEl.addEventListener("pointerdown", startDrag);
      gridEl.addEventListener("pointermove", moveDrag);
      gridEl.addEventListener("pointerup", endDrag);
      gridEl.addEventListener("pointercancel", cancelDrag);
      gridEl.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    }

    function paintGrid() {
      gridEl.className = "pz-grid size-" + grid.size;
      gridEl.innerHTML = "";
      var labels = { dl: "DL", tl: "TL", dw: "DW", tw: "TW" };
      for (var r = 0; r < grid.size; r++) {
        for (var c = 0; c < grid.size; c++) {
          var cell = document.createElement("div");
          var bonus = grid.bonuses[r][c];
          cell.className = "pz-cell" + (bonus ? " bonus-" + bonus : "");
          cell.dataset.row = String(r);
          cell.dataset.col = String(c);
          if (bonus) {
            var lab = document.createElement("span");
            lab.className = "pz-bonus";
            lab.textContent = labels[bonus];
            cell.appendChild(lab);
          }
          var letter = document.createElement("span");
          letter.className = "pz-letter";
          letter.textContent = grid.letters[r][c];
          cell.appendChild(letter);
          gridEl.appendChild(cell);
        }
      }
    }

    function paintHud() {
      var scoreEl = root.querySelector("#pz-score");
      var timerEl = root.querySelector("#pz-timer");
      var labelEl = root.querySelector("#pz-timer-label");
      if (scoreEl) scoreEl.textContent = String(score);
      if (!timerEl) return;
      if (submode === "zen") {
        timerEl.textContent = "∞";
        if (labelEl) labelEl.textContent = "Relax";
        timerEl.classList.remove("warn");
      } else if (submode === "challenge") {
        timerEl.textContent = "--";
        if (labelEl) labelEl.textContent = "Words";
        var ch = root.querySelector("#pz-challenge");
        if (ch) {
          ch.classList.remove("hidden");
          ch.textContent = "Words: " + challengeWords + " / " + PL.CHALLENGE_MAX_WORDS;
        }
      } else {
        var m = Math.floor(timeLeft / 60);
        var s = timeLeft % 60;
        timerEl.textContent = m + ":" + String(s).padStart(2, "0");
        timerEl.classList.toggle("warn", timeLeft <= 15);
        if (labelEl) labelEl.textContent = "Time";
        if (submode === "rush") {
          var rush = root.querySelector("#pz-rush");
          var fill = root.querySelector("#pz-rush-fill");
          var text = root.querySelector("#pz-rush-text");
          if (rush) rush.classList.remove("hidden");
          if (fill) fill.style.width = Math.min(100, (timeLeft / PL.RUSH_TIME_CAP) * 100) + "%";
          if (text) text.textContent = "+" + PL.RUSH_TIME_BONUS + "s per word";
        }
      }
      var count = root.querySelector("#pz-found-count");
      if (count) count.textContent = String(Object.keys(foundWords).length);
    }

    function cellFromEvent(e) {
      if (e.target && e.target.closest) {
        var cell = e.target.closest(".pz-cell");
        if (cell && gridEl.contains(cell)) {
          return {
            row: parseInt(cell.dataset.row, 10),
            col: parseInt(cell.dataset.col, 10),
            el: cell
          };
        }
      }
      if (e.clientX != null) {
        var el = document.elementFromPoint(e.clientX, e.clientY);
        var c2 = el && el.closest ? el.closest(".pz-cell") : null;
        if (c2 && gridEl.contains(c2)) {
          return {
            row: parseInt(c2.dataset.row, 10),
            col: parseInt(c2.dataset.col, 10),
            el: c2
          };
        }
      }
      return null;
    }

    function startDrag(e) {
      if (!playing) return;
      e.preventDefault();
      isDragging = false;
      pendingStart = cellFromEvent(e);
      dragStartPoint = { x: e.clientX, y: e.clientY };
      try { gridEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }

    function moveDrag(e) {
      if (!playing) return;
      if (!isDragging) {
        if (!(e.buttons & 1)) {
          dragStartPoint = { x: e.clientX, y: e.clientY };
          return;
        }
        var dx = (e.clientX || 0) - dragStartPoint.x;
        var dy = (e.clientY || 0) - dragStartPoint.y;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        isDragging = true;
        clearSelection();
        if (pendingStart) addCell(pendingStart);
      }
      e.preventDefault();
      var cell = cellFromEvent(e);
      if (!cell) return;
      var key = cell.row + "," + cell.col;
      if (selectedSet[key]) {
        backtrackTo(cell);
        return;
      }
      if (selected.length) {
        var last = selected[selected.length - 1];
        if (!PL.adjacent(last, cell, grid.size)) return;
      }
      addCell(cell);
    }

    function endDrag(e) {
      if (!playing) return;
      if (e.preventDefault) e.preventDefault();
      if (isDragging) {
        isDragging = false;
        submitWord();
        clearSelection();
      } else {
        clickSelect(cellFromEvent(e) || pendingStart);
      }
      try {
        if (gridEl.hasPointerCapture && gridEl.hasPointerCapture(e.pointerId)) {
          gridEl.releasePointerCapture(e.pointerId);
        }
      } catch (err) { /* ignore */ }
    }

    function cancelDrag(e) {
      isDragging = false;
      clearSelection();
      try {
        if (e && gridEl.hasPointerCapture && gridEl.hasPointerCapture(e.pointerId)) {
          gridEl.releasePointerCapture(e.pointerId);
        }
      } catch (err) { /* ignore */ }
    }

    function clickSelect(cell) {
      if (!playing || !cell) return;
      if (!selected.length) {
        clearSelection();
        addCell(cell);
        return;
      }
      var key = cell.row + "," + cell.col;
      var last = selected[selected.length - 1];
      if (selectedSet[key]) {
        if (last.row === cell.row && last.col === cell.col) {
          selected.pop();
          delete selectedSet[key];
          gridEl.children[last.row * grid.size + last.col].classList.remove("selected");
          drawPath();
          updateCurrentWord();
        } else {
          backtrackTo(cell);
        }
        return;
      }
      if (!PL.adjacent(last, cell, grid.size)) return;
      addCell(cell);
    }

    function addCell(cell) {
      var key = cell.row + "," + cell.col;
      if (selectedSet[key]) return;
      selected.push({ row: cell.row, col: cell.col });
      selectedSet[key] = 1;
      gridEl.children[cell.row * grid.size + cell.col].classList.add("selected");
      updateCurrentWord();
      drawPath();
    }

    function backtrackTo(cell) {
      while (selected.length > 1) {
        var last = selected[selected.length - 1];
        if (last.row === cell.row && last.col === cell.col) break;
        selected.pop();
        delete selectedSet[last.row + "," + last.col];
        gridEl.children[last.row * grid.size + last.col].classList.remove("selected");
      }
      updateCurrentWord();
      drawPath();
    }

    function clearSelection() {
      if (!gridEl) return;
      for (var i = 0; i < gridEl.children.length; i++) {
        gridEl.children[i].classList.remove("selected");
      }
      selected = [];
      selectedSet = Object.create(null);
      drawPath();
      updateCurrentWord();
    }

    function updateCurrentWord() {
      var word = PL.pathWord(selected, grid.letters);
      var cur = root.querySelector("#pz-current");
      if (cur) cur.textContent = word || "\u00A0";
      var actions = root.querySelector("#pz-word-actions");
      if (actions) actions.classList.toggle("hidden", !(playing && !isDragging && selected.length >= 2));
    }

    function getCellCenter(r, c) {
      var rect = gridEl.getBoundingClientRect();
      var cellRect = gridEl.children[r * grid.size + c].getBoundingClientRect();
      return {
        x: cellRect.left - rect.left + cellRect.width / 2,
        y: cellRect.top - rect.top + cellRect.height / 2
      };
    }

    function drawPath() {
      if (!svgEl) return;
      svgEl.innerHTML = "";
      var board = root.querySelector(".pz-board");
      if (board) {
        svgEl.setAttribute("width", String(board.clientWidth));
        svgEl.setAttribute("height", String(board.clientHeight));
      }
      for (var i = 0; i < selected.length - 1; i++) {
        var a = getCellCenter(selected[i].row, selected[i].col);
        var b = getCellCenter(selected[i + 1].row, selected[i + 1].col);
        var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", a.x);
        line.setAttribute("y1", a.y);
        line.setAttribute("x2", b.x);
        line.setAttribute("y2", b.y);
        svgEl.appendChild(line);
      }
    }

    function submitWord() {
      if (!playing) return;
      var path = selected.slice();
      var word = PL.pathWord(path, grid.letters);
      if (word.length < 2) return;
      if (foundWords[word]) {
        toast("Already found");
        streak = 0;
        return;
      }
      if (!window.Dict.isWord(word)) {
        toast("Not a word");
        streak = 0;
        addFound(word, 0, true);
        return;
      }
      foundWords[word] = 1;
      var pts = PL.scorePath(path, grid.letters, grid.bonuses);
      streak++;
      var bonus = PL.streakBonus(streak);
      var total = pts + bonus;
      score += total;
      addFound(word, total, false);
      if (total > bestWordPts) {
        bestWordPts = total;
        bestWord = word;
      }
      toast("+" + total + (bonus ? " · streak +" + bonus : ""));
      if (submode === "rush") {
        timeLeft = Math.min(PL.RUSH_TIME_CAP, timeLeft + PL.RUSH_TIME_BONUS);
      }
      if (submode === "challenge") {
        challengeWords++;
        if (challengeWords >= PL.CHALLENGE_MAX_WORDS) {
          paintHud();
          endRound("goal");
          return;
        }
      }
      paintHud();
    }

    function addFound(word, pts, invalid) {
      var list = root.querySelector("#pz-found-list");
      if (!list) return;
      var li = document.createElement("li");
      li.textContent = word + (invalid ? "" : " +" + pts);
      if (invalid) {
        li.classList.add("invalid");
        foundMisses.push(li);
        if (foundMisses.length > MAX_FOUND_MISSES) {
          var drop = foundMisses.shift();
          if (drop && drop.parentNode) drop.parentNode.removeChild(drop);
        }
      }
      list.insertBefore(li, list.firstChild);
      paintHud();
    }

    function endRound(reason) {
      if (!playing) return;
      playing = false;
      stopTimer();
      lastEndReason = reason || "timeout";
      var wordCount = Object.keys(foundWords).length;
      var won = false;
      if (submode === "challenge") won = lastEndReason === "goal";
      else if (submode === "zen") won = lastEndReason === "zen" && wordCount > 0;
      else won = lastEndReason === "timeout" && wordCount > 0;

      var xpGain = Math.round(score * PL.SUBMODES[submode].xpMult);
      var xpResult = PL.addXp(data.puzzle.progress, xpGain);
      data.puzzle.progress = xpResult.progress;
      var bestSafe = safeWordLabel(bestWord);
      if (bestSafe && bestWordPts > (data.puzzle.bestWordPts || 0)) {
        data.puzzle.bestWord = bestSafe;
        data.puzzle.bestWordPts = bestWordPts;
      }
      if (score > 0) {
        var scores = data.puzzle.scores[submode] || [];
        scores.push({
          score: score,
          words: wordCount,
          date: new Date().toLocaleDateString()
        });
        scores.sort(function (a, b) { return b.score - a.score; });
        if (scores.length > 10) scores.length = 10;
        data.puzzle.scores[submode] = scores;
      }
      savePuzzleData(data);
      onRoundEnd({ won: won, reason: lastEndReason, words: wordCount, score: score });
      phase = "result";
      renderResult(xpGain, xpResult);
    }

    function renderResult(xpGain, xpResult) {
      var words = Object.keys(foundWords);
      var longest = words.reduce(function (a, b) {
        return b.length > a.length ? b : a;
      }, "");
      var title = "Round ended";
      if (xpResult && xpResult.leveledUp) title = "Level up!";
      else if (lastEndReason === "quit") title = "Round ended";
      else if (lastEndReason === "goal") title = "Challenge complete";
      else if (lastEndReason === "zen") title = "Round complete";
      else if (lastEndReason === "timeout") title = "Time’s up";

      var prog = data.puzzle.progress;
      var needed = PL.xpNeededFor(prog.level);
      root.innerHTML =
        '<div class="pz-result panel">' +
          '<div class="section">' +
            '<h2 id="pz-result-title"></h2>' +
            '<p class="pz-final-score" id="pz-result-score"></p>' +
            '<p class="meta-line" id="pz-result-meta"></p>' +
            '<p class="meta-line mt10" id="pz-result-xp"></p>' +
            '<div class="buttonrow mt14">' +
              '<button type="button" class="btn primary" id="pz-again">Play again</button>' +
              '<button type="button" class="btn" id="pz-to-menu">Modes</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      root.querySelector("#pz-result-title").textContent = title;
      root.querySelector("#pz-result-score").textContent = score + " pts";
      var meta = words.length + " words · longest " + (safeWordLabel(longest) || "—");
      var bestSafe = safeWordLabel(bestWord);
      if (bestSafe) meta += " · best " + bestSafe + " (+" + bestWordPts + ")";
      root.querySelector("#pz-result-meta").textContent = meta;
      root.querySelector("#pz-result-xp").textContent =
        "+" + (xpGain || 0) + " XP · Lv " + prog.level + " (" + prog.xp + " / " + needed + ")";
      root.querySelector("#pz-again").addEventListener("click", startRound);
      root.querySelector("#pz-to-menu").addEventListener("click", function () {
        phase = "menu";
        renderMenu();
      });
    }

    /** @returns {boolean} true if still inside Puzzle (menu); false → leave to hub */
    function back() {
      if (phase === "play") {
        playing = false;
        stopTimer();
        phase = "menu";
        setStatus("");
        renderMenu();
        return true;
      }
      if (phase === "result") {
        phase = "menu";
        renderMenu();
        return true;
      }
      return false;
    }

    render();
    return { cleanup: cleanup, back: back, getPhase: function () { return phase; } };
  }

  window.WordPuzzleMode = { mount: mount };
})();
