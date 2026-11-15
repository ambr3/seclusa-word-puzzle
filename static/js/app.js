/*
 * Seclusa Word Puzzle — offline word games, one dictionary, no network.
 *
 * Hub = mode picker + universal Settings (theme, help, erase).
 * Each mode has its own start menu (difficulty, how, play).
 */

(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  var MODES = [
    {
      id: "puzzle",
      name: "Puzzle",
      mark: "P",
      tag: "Signature",
      blurb: "Drag letters on a grid. Classic, Rush, Zen, or Challenge."
    },
    {
      id: "ladder",
      name: "Ladder",
      mark: "L",
      tag: "Path",
      blurb: "Change one letter at a time to climb to the end word."
    },
    {
      id: "scrabble",
      name: "Scrabble",
      mark: "S",
      tag: "Tiles",
      blurb: "Play high-scoring words from a seven-tile rack."
    },
    {
      id: "guess",
      name: "Guess",
      mark: "G",
      tag: "Colours",
      blurb: "Green, amber, grey — crack the secret word."
    },
    {
      id: "blanks",
      name: "Blanks",
      mark: "B",
      tag: "Letters",
      blurb: "Fill the blanks before you run out of misses."
    }
  ];

  /** Full how-to steps for each start menu — simple English. */
  var HOW = {
    ladder: [
      "You will see a starting word at the top and a finishing word at the bottom.",
      "Fill in the empty rows in the middle with real words.",
      "Each new word must change only ONE letter from the word above it. All other letters stay the same.",
      "When every row is filled and the last word matches the finish, press Check ladder.",
      "Easy uses short words and fewer steps. Hard uses longer words and more steps."
    ],
    scrabble: [
      "You get 7 letter tiles. The small number on each tile is how many points that letter is worth.",
      "Tap tiles (or type those letters) to build a word in the space above the rack.",
      "Press Play word. If it is a real word, you score the points on those tiles.",
      "If you use all 7 tiles in one word, you get 50 extra bonus points.",
      "Used tiles leave. New tiles come from the bag until the bag is empty.",
      "Keep making words until your score reaches the target. Then you win!",
      "Clear removes the word you are building. Shuffle mixes your rack (only when no word is started)."
    ],
    guess: [
      "There is a secret word. You cannot see it yet.",
      "Type a guess that has the same number of letters, then press Enter.",
      "Green means that letter is in the secret word AND in the right place.",
      "Amber (yellow) means that letter is in the secret word, but in a different place.",
      "Grey means that letter is not in the secret word at all.",
      "Use the colours as clues. Find the secret word before you run out of tries.",
      "On a phone or tablet, tap the on-screen keys. On a computer, type on your keyboard."
    ],
    blanks: [
      "There is a secret word shown as empty spaces — one space for each letter.",
      "Guess one letter at a time.",
      "If that letter is in the word, it appears in every place it belongs.",
      "If that letter is wrong, you get one miss.",
      "Reveal the whole word before you use up all your misses.",
      "Easy gives you more misses. Hard gives you a longer word and fewer misses.",
      "On a phone or tablet, tap the on-screen keys. On a computer, type on your keyboard."
    ]
  };

  var DIFF_HINT = {
    ladder: {
      easy: "4-letter words · short path",
      medium: "4-letter words · longer path",
      hard: "5-letter words · longer path"
    },
    scrabble: {
      easy: "Target 30 pts · 7-tile rack",
      medium: "Target 55 pts · 7-tile rack",
      hard: "Target 85 pts · 7-tile rack"
    },
    guess: {
      easy: "4 letters · 7 tries",
      medium: "5 letters · 6 tries",
      hard: "6 letters · 5 tries"
    },
    blanks: {
      easy: "Shorter words · 8 misses",
      medium: "Medium words · 6 misses",
      hard: "Longer words · 4 misses"
    }
  };

  /** On-screen A–Z only when the primary pointer is coarse (phones/tablets). */
  function wantsOnScreenKeyboard() {
    try {
      if (window.matchMedia("(pointer: coarse)").matches) return true;
      if (window.matchMedia("(hover: none)").matches && (navigator.maxTouchPoints || 0) > 0) return true;
    } catch (err) { /* ignore */ }
    return false;
  }

  var DIFFS = ["easy", "medium", "hard"];

  var state = {
    mode: null,
    phase: "hub", // hub | menu | play
    session: null,
    howOpen: false,
    seedSalt: 0
  };

  function toast(message) {
    var node = $("toast");
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(function () { node.hidden = true; }, 2400);
  }

  function setStatus(id, message, kind) {
    var el = $(id);
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("warn", "bad");
    if (kind) el.classList.add(kind);
  }

  function loadData() {
    var data = window.Store.getData();
    if (!data || typeof data !== "object") data = {};
    if (!data.stats || typeof data.stats !== "object") data.stats = {};
    if (!data.modes || typeof data.modes !== "object") data.modes = {};
    return data;
  }

  function saveData(data) {
    window.Store.setData(data);
  }

  function modePrefs(modeId) {
    var data = loadData();
    if (!data.modes[modeId] || typeof data.modes[modeId] !== "object") {
      data.modes[modeId] = { difficulty: "medium" };
      saveData(data);
    }
    var pref = data.modes[modeId];
    if (DIFFS.indexOf(pref.difficulty) === -1) pref.difficulty = "medium";
    return pref;
  }

  function setModeDifficulty(modeId, difficulty) {
    var data = loadData();
    if (!data.modes[modeId]) data.modes[modeId] = {};
    data.modes[modeId].difficulty = DIFFS.indexOf(difficulty) === -1 ? "medium" : difficulty;
    saveData(data);
  }

  function bumpStat(modeId, field) {
    var data = loadData();
    if (!data.stats[modeId]) data.stats[modeId] = { played: 0, won: 0 };
    data.stats[modeId][field] = (data.stats[modeId][field] || 0) + 1;
    saveData(data);
  }

  function randomFor(modeId) {
    state.seedSalt = (state.seedSalt + 1) | 0;
    return window.Dict.rng(window.Dict.daySeed(modeId.charCodeAt(0) * 97 + state.seedSalt));
  }

  /* ---------------------------------------------------------------- theme (hub Settings only) */

  function paintThemeChrome() {
    if (window.Theme && window.Theme.paintModeChrome) window.Theme.paintModeChrome();
  }

  function wireHubTheme() {
    if (window.Theme) {
      window.Theme.apply(window.Theme.current());
      if (window.Theme.paintBackground) window.Theme.paintBackground();
    }
    paintThemeChrome();
    document.querySelectorAll("#hub-theme-row [data-theme-opt]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (window.Theme) window.Theme.set(btn.getAttribute("data-theme-opt"));
        paintThemeChrome();
        toast("Theme: " + btn.getAttribute("data-theme-opt"));
      });
    });
  }

  /* ---------------------------------------------------------------- navigation */

  function cleanupSession() {
    if (state.session && state.session._cleanup) {
      try { state.session._cleanup(); } catch (err) { /* ignore */ }
    }
    state.session = null;
  }

  function clearModeTheme() {
    var play = $("play-screen");
    if (!play) return;
    play.classList.remove("mode-theme");
    MODES.forEach(function (m) { play.classList.remove("mode-" + m.id); });
  }

  function applyModeTheme(modeId) {
    var play = $("play-screen");
    if (!play) return;
    clearModeTheme();
    play.classList.add("mode-theme", "mode-" + modeId);
  }

  function showHub() {
    cleanupSession();
    state.mode = null;
    state.phase = "hub";
    state.howOpen = false;
    clearModeTheme();
    $("hub-screen").classList.remove("hidden");
    $("play-screen").classList.add("hidden");
    $("btn-back").classList.add("hidden");
    $("brand").textContent = "Seclusa Word Puzzle";
    $("play-actions").innerHTML = "";
    paintThemeChrome();
    renderHub();
  }

  function openMode(modeId) {
    var mode = MODES.filter(function (m) { return m.id === modeId; })[0];
    if (!mode) return;
    cleanupSession();
    state.mode = mode;
    state.phase = "menu";
    state.howOpen = false;
    $("hub-screen").classList.add("hidden");
    $("play-screen").classList.remove("hidden");
    $("btn-back").classList.remove("hidden");
    $("brand").textContent = mode.name;
    $("play-title").textContent = mode.name;
    applyModeTheme(mode.id);
    setStatus("play-status", "");
    renderModeShell();
  }

  function goBack() {
    if (state.mode && state.mode.id === "puzzle" && state.session && state.session.puzzleBack) {
      if (state.session.puzzleBack()) {
        state.phase = "menu";
        return;
      }
      showHub();
      return;
    }
    if (state.phase === "play") {
      cleanupSession();
      state.phase = "menu";
      setStatus("play-status", "");
      renderModeShell();
      return;
    }
    showHub();
  }

  function renderModeShell() {
    var actions = $("play-actions");
    actions.innerHTML = "";
    if (state.phase === "menu") {
      // How lives on the start menu panel
    } else if (state.phase === "play" && state.mode.id !== "puzzle") {
      var toMenu = document.createElement("button");
      toMenu.type = "button";
      toMenu.className = "btn";
      toMenu.textContent = "Menu";
      toMenu.addEventListener("click", function () {
        cleanupSession();
        state.phase = "menu";
        setStatus("play-status", "");
        renderModeShell();
      });
      actions.appendChild(toMenu);
    }

    var root = $("play-root");
    root.className = "mode-play-root" + (state.phase === "play" ? " is-playing" : " is-menu");
    root.innerHTML = "";

    if (state.mode.id === "puzzle") {
      mountPuzzle(root);
      return;
    }

    if (state.phase === "menu") {
      renderStartMenu(root);
      return;
    }

    startRound();
  }

  function mountPuzzle(root) {
    if (!window.WordPuzzleMode) {
      setStatus("play-status", "Puzzle mode failed to load.", "bad");
      return;
    }
    var mountPoint = document.createElement("div");
    mountPoint.id = "puzzle-mount";
    root.appendChild(mountPoint);
    var handle = window.WordPuzzleMode.mount({
      root: mountPoint,
      toast: toast,
      setStatus: function (msg, kind) { setStatus("play-status", msg, kind); },
      onPlayed: function () {
        bumpStat("puzzle", "played");
        state.phase = "play";
      },
      onRoundEnd: function (info) {
        state.phase = "result";
        if (info && info.won) markWon();
      }
    });
    state.session = {
      won: false,
      _cleanup: handle.cleanup,
      puzzleBack: function () {
        return handle.back();
      }
    };
    state.phase = "menu";
  }

  /* ---------------------------------------------------------------- hub */

  function buildModePreview(modeId) {
    var wrap = document.createElement("span");
    wrap.className = "mode-preview mode-preview-" + modeId;
    wrap.setAttribute("aria-hidden", "true");

    if (modeId === "puzzle") {
      var cells = "W O R D P L A Y G A M E S U N T".split(" ");
      var path = { 0: 1, 1: 1, 2: 1, 3: 1 };
      cells.forEach(function (ch, i) {
        var cell = document.createElement("span");
        cell.className = "mp-cell" + (path[i] ? " on" : "");
        cell.textContent = ch;
        wrap.appendChild(cell);
      });
      return wrap;
    }

    if (modeId === "ladder") {
      ["CAT", "COT", "DOT"].forEach(function (word, row) {
        var line = document.createElement("span");
        line.className = "mp-ladder-row" + (row === 1 ? " mid" : "");
        word.split("").forEach(function (ch) {
          var cell = document.createElement("span");
          cell.className = "mp-cell";
          cell.textContent = ch;
          line.appendChild(cell);
        });
        wrap.appendChild(line);
      });
      return wrap;
    }

    if (modeId === "scrabble") {
      [
        { ch: "Q", v: "10" },
        { ch: "U", v: "1" },
        { ch: "I", v: "1" },
        { ch: "Z", v: "10" }
      ].forEach(function (tile) {
        var t = document.createElement("span");
        t.className = "mp-tile";
        t.innerHTML = '<span class="mp-tile-l"></span><span class="mp-tile-v"></span>';
        t.querySelector(".mp-tile-l").textContent = tile.ch;
        t.querySelector(".mp-tile-v").textContent = tile.v;
        wrap.appendChild(t);
      });
      return wrap;
    }

    if (modeId === "guess") {
      [
        ["hit", "near", "miss", "hit", "miss"],
        ["typed", "typed", "cursor", "", ""]
      ].forEach(function (row) {
        var line = document.createElement("span");
        line.className = "mp-guess-row";
        row.forEach(function (kind) {
          var cell = document.createElement("span");
          cell.className = "mp-gcell" + (kind ? " " + kind : "");
          if (kind === "hit") cell.textContent = "A";
          else if (kind === "near") cell.textContent = "R";
          else if (kind === "miss") cell.textContent = "O";
          else if (kind === "typed") cell.textContent = "S";
          else if (kind === "cursor") cell.textContent = "";
          line.appendChild(cell);
        });
        wrap.appendChild(line);
      });
      return wrap;
    }

    // blanks
    "C_A_".split("").forEach(function (ch) {
      var slot = document.createElement("span");
      slot.className = "mp-blank" + (ch === "_" ? " empty" : " filled");
      slot.textContent = ch === "_" ? "" : ch;
      wrap.appendChild(slot);
    });
    return wrap;
  }

  function renderHub() {
    var grid = $("mode-grid");
    grid.innerHTML = "";
    var data = loadData();
    MODES.forEach(function (mode, index) {
      var stats = data.stats[mode.id] || {};
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mode-card mode-" + mode.id + (mode.id === "puzzle" ? " mode-featured" : "");
      btn.style.setProperty("--stagger", String(index));
      btn.setAttribute("aria-label", mode.name + ". " + mode.blurb);

      var top = document.createElement("span");
      top.className = "mode-card-top";

      var mark = document.createElement("span");
      mark.className = "mode-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = mode.mark || mode.name.charAt(0);

      var tag = document.createElement("span");
      tag.className = "mode-tag";
      tag.textContent = mode.tag || "Play";

      top.appendChild(mark);
      top.appendChild(tag);

      var body = document.createElement("span");
      body.className = "mode-card-body";

      var copy = document.createElement("span");
      copy.className = "mode-card-copy";

      var name = document.createElement("span");
      name.className = "mode-name";
      name.textContent = mode.name;

      var blurb = document.createElement("span");
      blurb.className = "mode-blurb";
      blurb.textContent = mode.blurb;

      copy.appendChild(name);
      copy.appendChild(blurb);

      var preview = buildModePreview(mode.id);

      body.appendChild(copy);
      body.appendChild(preview);

      var foot = document.createElement("span");
      foot.className = "mode-card-foot";

      var meta = document.createElement("span");
      meta.className = "mode-meta";
      var played = stats.played || 0;
      var won = stats.won || 0;
      meta.textContent = played ? (won + " cleared · " + played + " played") : "Tap to play";

      var go = document.createElement("span");
      go.className = "mode-go";
      go.setAttribute("aria-hidden", "true");
      go.textContent = "Play";

      foot.appendChild(meta);
      foot.appendChild(go);

      btn.appendChild(top);
      btn.appendChild(body);
      btn.appendChild(foot);
      btn.addEventListener("click", function () { openMode(mode.id); });
      grid.appendChild(btn);
    });

    var sizes = window.Dict && window.Dict.sizes ? window.Dict.sizes : { common: 0, all: 0 };
    var commonEl = $("dict-common");
    var allEl = $("dict-all");
    if (commonEl) commonEl.textContent = sizes.common.toLocaleString();
    if (allEl) allEl.textContent = sizes.all.toLocaleString();
    var dictStats = $("dict-stats");
    if (dictStats) {
      dictStats.textContent =
        sizes.common.toLocaleString() + " common words · " +
        sizes.all.toLocaleString() + " accepted · stored on this device.";
    }

    setStatus(
      "hub-status",
      window.Store.isPersistent()
        ? "Progress stays on this device."
        : "Storage is blocked — this session will not be remembered.",
      window.Store.isPersistent() ? null : "warn"
    );
  }

  /* ---------------------------------------------------------------- start menu */

  function renderStartMenu(root) {
    var mode = state.mode;
    var data = loadData();
    var stats = data.stats[mode.id] || {};
    var hints = DIFF_HINT[mode.id] || {};

    var page = document.createElement("div");
    page.className = "mode-page";

    var hero = document.createElement("section");
    hero.className = "mode-hero mode-hero-enter";
    hero.setAttribute("aria-label", mode.name);

    var accent = document.createElement("div");
    accent.className = "mode-hero-accent";
    accent.setAttribute("aria-hidden", "true");

    var top = document.createElement("div");
    top.className = "mode-card-top";
    var mark = document.createElement("span");
    mark.className = "mode-mark mode-mark-lg";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = mode.mark || mode.name.charAt(0);
    var tag = document.createElement("span");
    tag.className = "mode-tag";
    tag.textContent = mode.tag || "Play";
    top.appendChild(mark);
    top.appendChild(tag);

    var body = document.createElement("div");
    body.className = "mode-card-body";
    var copy = document.createElement("div");
    copy.className = "mode-card-copy";
    var title = document.createElement("h2");
    title.className = "mode-name";
    title.textContent = mode.name;
    var blurb = document.createElement("p");
    blurb.className = "mode-blurb";
    blurb.textContent = mode.blurb;
    copy.appendChild(title);
    copy.appendChild(blurb);
    body.appendChild(copy);
    body.appendChild(buildModePreview(mode.id));

    hero.appendChild(accent);
    hero.appendChild(top);
    hero.appendChild(body);
    page.appendChild(hero);

    var panel = document.createElement("div");
    panel.className = "panel mode-start";
    panel.innerHTML =
      '<div class="section how-play">' +
        '<h2>How to play</h2>' +
        '<ol class="how-steps" id="mode-how-steps"></ol>' +
      '</div>' +
      '<div class="section">' +
        '<div class="statstrip">' +
          '<div class="statcell"><span class="statkey">Cleared</span><span class="statvalue" id="ms-won">0</span><span class="statsub">rounds</span></div>' +
          '<div class="statcell"><span class="statkey">Played</span><span class="statvalue" id="ms-played">0</span><span class="statsub">rounds</span></div>' +
          '<div class="statcell"><span class="statkey">Difficulty</span><span class="statvalue" id="ms-diff-label">Medium</span><span class="statsub" id="ms-diff-hint"></span></div>' +
        '</div>' +
      '</div>' +
      '<div class="section settings-block">' +
        '<h2>Difficulty</h2>' +
        '<div class="diff-row" id="diff-row" role="group" aria-label="Difficulty"></div>' +
        '<p class="meta-line mt10" id="diff-detail"></p>' +
      '</div>' +
      '<div class="section">' +
        '<button type="button" class="btn primary wide mode-play-btn" id="btn-mode-play">Play</button>' +
      '</div>';

    page.appendChild(panel);
    root.appendChild(page);

    var stepsEl = panel.querySelector("#mode-how-steps");
    var steps = HOW[mode.id] || [mode.blurb];
    steps.forEach(function (line) {
      var li = document.createElement("li");
      li.textContent = line;
      stepsEl.appendChild(li);
    });
    panel.querySelector("#ms-won").textContent = String(stats.won || 0);
    panel.querySelector("#ms-played").textContent = String(stats.played || 0);

    var row = panel.querySelector("#diff-row");

    function paintDiffLabels() {
      var p = modePrefs(mode.id);
      var label = p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1);
      panel.querySelector("#ms-diff-label").textContent = label;
      panel.querySelector("#ms-diff-hint").textContent = hints[p.difficulty] || "";
      panel.querySelector("#diff-detail").textContent = hints[p.difficulty] || "";
      row.querySelectorAll("button").forEach(function (btn, i) {
        var d = DIFFS[i];
        var on = p.difficulty === d;
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-checked", on ? "true" : "false");
      });
    }

    DIFFS.forEach(function (d) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme-chip";
      btn.textContent = d.charAt(0).toUpperCase() + d.slice(1);
      btn.addEventListener("click", function () {
        setModeDifficulty(mode.id, d);
        paintDiffLabels();
      });
      row.appendChild(btn);
    });
    paintDiffLabels();

    panel.querySelector("#btn-mode-play").addEventListener("click", function () {
      state.phase = "play";
      renderModeShell();
    });
  }

  /* ---------------------------------------------------------------- play rounds */

  function startRound() {
    setStatus("play-status", "");
    var diff = modePrefs(state.mode.id).difficulty;
    var random = randomFor(state.mode.id);
    var opts = { difficulty: diff };
    var puzzle = null;
    if (state.mode.id === "ladder") puzzle = window.Dict.makeLadder(random, opts);
    else if (state.mode.id === "scrabble") puzzle = window.Dict.makeScrabble(random, opts);
    else if (state.mode.id === "guess") puzzle = window.Dict.makeGuess(random, opts);
    else if (state.mode.id === "blanks") puzzle = window.Dict.makeBlanks(random, opts);

    var root = $("play-root");
    root.innerHTML = "";

    if (!puzzle) {
      setStatus("play-status", "Could not build a round. Try another difficulty.", "bad");
      var back = document.createElement("button");
      back.type = "button";
      back.className = "btn mt12";
      back.textContent = "Back to menu";
      back.addEventListener("click", function () {
        state.phase = "menu";
        renderModeShell();
      });
      root.appendChild(back);
      return;
    }

    bumpStat(state.mode.id, "played");
    state.session = { puzzle: puzzle, won: false };
    var id = state.mode.id;
    if (id === "ladder") renderLadder(root);
    else if (id === "scrabble") renderScrabble(root);
    else if (id === "guess") renderGuess(root);
    else if (id === "blanks") renderBlanks(root);
  }

  function markWon() {
    if (!state.session || state.session.won) return;
    state.session.won = true;
    bumpStat(state.mode.id, "won");
  }

  /* ---------------------------------------------------------------- mode UIs */

  function renderLadder(root) {
    var p = state.session.puzzle;
    var wordLen = p.wordLen || 4;
    var steps = p.steps;

    var meta = document.createElement("p");
    meta.className = "meta-line";
    meta.textContent = wordLen + "-letter words · " + steps + " steps";
    root.appendChild(meta);

    var wrap = document.createElement("div");
    wrap.className = "ladder-steps";
    root.appendChild(wrap);

    var rows = [];
    for (var i = 0; i <= steps; i++) {
      var row = document.createElement("div");
      row.className = "ladder-step";
      var locked = i === 0 || i === steps;
      var word = i === 0 ? p.start : (i === steps ? p.end : "");
      for (var c = 0; c < wordLen; c++) {
        var input = document.createElement("input");
        input.maxLength = 1;
        input.setAttribute("aria-label", "Step " + (i + 1) + " letter " + (c + 1));
        if (locked) {
          input.value = word[c];
          input.readOnly = true;
          input.classList.add("locked");
        }
        row.appendChild(input);
      }
      wrap.appendChild(row);
      rows.push(row);
    }

    var checkBtn = document.createElement("button");
    checkBtn.type = "button";
    checkBtn.className = "btn primary wide mt12";
    checkBtn.textContent = "Check ladder";
    root.appendChild(checkBtn);

    function rowWord(row) {
      var letters = [];
      row.querySelectorAll("input").forEach(function (inp) {
        letters.push((inp.value || "").toLowerCase());
      });
      return letters.join("");
    }

    function differsByOne(a, b) {
      if (a.length !== b.length) return false;
      var diff = 0;
      for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
      return diff === 1;
    }

    var lenRe = new RegExp("^[a-z]{" + wordLen + "}$");

    checkBtn.addEventListener("click", function () {
      var words = rows.map(rowWord);
      for (var i = 0; i < words.length; i++) {
        if (!lenRe.test(words[i])) {
          setStatus("play-status", "Fill every step with a " + wordLen + "-letter word.", "warn");
          return;
        }
        if (!window.Dict.isWord(words[i])) {
          setStatus("play-status", words[i].toUpperCase() + " is not in the list.", "warn");
          return;
        }
        if (i > 0 && !differsByOne(words[i - 1], words[i])) {
          setStatus("play-status", "Each step must change exactly one letter.", "warn");
          return;
        }
      }
      if (words[0] !== p.start || words[words.length - 1] !== p.end) {
        setStatus("play-status", "Start and end must stay fixed.", "bad");
        return;
      }
      markWon();
      setStatus("play-status", "Ladder complete.", null);
      toast("Ladder complete");
    });
  }

  function renderScrabble(root) {
    var p = state.session.puzzle;
    var bag = p.bag.slice();
    var rack = p.rack.slice();
    var picked = []; // indices into rack
    var score = 0;
    var done = false;
    var played = [];

    var meta = document.createElement("p");
    meta.className = "meta-line";
    root.appendChild(meta);

    var wordRow = document.createElement("div");
    wordRow.className = "letter-row scrabble-word";
    root.appendChild(wordRow);

    var rackRow = document.createElement("div");
    rackRow.className = "letter-row scrabble-rack";
    root.appendChild(rackRow);

    var actions = document.createElement("div");
    actions.className = "buttonrow center mt12";
    actions.innerHTML =
      '<button type="button" class="btn primary" id="sb-play">Play word</button>' +
      '<button type="button" class="btn" id="sb-clear">Clear</button>' +
      '<button type="button" class="btn" id="sb-shuffle">Shuffle</button>';
    root.appendChild(actions);

    var hint = document.createElement("p");
    hint.className = "meta-line";
    hint.textContent = wantsOnScreenKeyboard()
      ? "Tap tiles to build a word, then Play."
      : "Type letters from your rack, Enter to play, Backspace to clear.";
    root.appendChild(hint);

    var list = document.createElement("div");
    list.className = "found-list";
    root.appendChild(list);

    function tileValue(ch) {
      return window.Dict.tileValue(ch);
    }

    function makeTile(ch, opts) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "letter-tile scrabble-tile" + (opts && opts.used ? " used" : "") + (opts && opts.on ? " selected" : "");
      btn.innerHTML = '<span class="sb-letter"></span><span class="sb-val"></span>';
      btn.querySelector(".sb-letter").textContent = ch;
      btn.querySelector(".sb-val").textContent = String(tileValue(ch));
      return btn;
    }

    function currentWord() {
      return picked.map(function (i) { return rack[i]; }).join("");
    }

    function paint() {
      meta.textContent = "Score " + score + " / " + p.target + " · bag " + bag.length;
      wordRow.innerHTML = "";
      if (!picked.length) {
        var empty = document.createElement("span");
        empty.className = "meta-line";
        empty.textContent = "Your word";
        wordRow.appendChild(empty);
      } else {
        picked.forEach(function (idx) {
          wordRow.appendChild(makeTile(rack[idx], { on: true }));
        });
      }
      rackRow.innerHTML = "";
      rack.forEach(function (ch, i) {
        var used = picked.indexOf(i) !== -1;
        var tile = makeTile(ch, { used: used });
        tile.disabled = used || done;
        tile.addEventListener("click", function () {
          if (done || used) return;
          picked.push(i);
          paint();
        });
        rackRow.appendChild(tile);
      });
      list.innerHTML = "";
      played.forEach(function (item) {
        var chip = document.createElement("span");
        chip.className = "found-chip";
        chip.textContent = item.word + " +" + item.pts;
        list.appendChild(chip);
      });
    }

    function clearWord() {
      picked = [];
      paint();
    }

    function shuffleRack() {
      if (done) return;
      if (picked.length) { toast("Clear the word first"); return; }
      rack = window.Dict.shuffle(rack, Math.random);
      paint();
    }

    function refill() {
      while (rack.length < 7 && bag.length) rack.push(bag.pop());
    }

    function playWord() {
      if (done) return;
      var word = currentWord();
      if (word.length < 2) { toast("Need 2+ letters"); return; }
      if (!window.Dict.isWord(word)) { toast("Not in word list"); return; }
      var pts = 0;
      for (var i = 0; i < word.length; i++) pts += tileValue(word[i]);
      if (word.length === 7) pts += 50;
      score += pts;
      played.push({ word: word, pts: pts });
      var keep = [];
      for (var r = 0; r < rack.length; r++) {
        if (picked.indexOf(r) === -1) keep.push(rack[r]);
      }
      rack = keep;
      picked = [];
      refill();
      setStatus("play-status", word.toUpperCase() + " +" + pts, null);
      if (score >= p.target) {
        done = true;
        markWon();
        setStatus("play-status", "Target reached — " + score + " pts.", null);
        toast("Target reached");
      } else if (!rack.length && !bag.length) {
        done = true;
        setStatus("play-status", "Tiles gone — scored " + score + " / " + p.target + ".", "warn");
      }
      paint();
    }

    function typeLetter(ch) {
      if (done) return;
      for (var i = 0; i < rack.length; i++) {
        if (rack[i] === ch && picked.indexOf(i) === -1) {
          picked.push(i);
          paint();
          return;
        }
      }
    }

    function backspace() {
      if (done || !picked.length) return;
      picked.pop();
      paint();
    }

    $("sb-play").addEventListener("click", playWord);
    $("sb-clear").addEventListener("click", clearWord);
    $("sb-shuffle").addEventListener("click", shuffleRack);

    function onKey(e) {
      if (state.mode.id !== "scrabble" || state.phase !== "play") return;
      if (e.key === "Enter") { e.preventDefault(); playWord(); }
      else if (e.key === "Backspace") { e.preventDefault(); backspace(); }
      else if (e.key === "Escape") { e.preventDefault(); clearWord(); }
      else if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); typeLetter(e.key.toLowerCase()); }
    }
    document.addEventListener("keydown", onKey);
    state.session._cleanup = function () {
      document.removeEventListener("keydown", onKey);
    };

    paint();
  }

  function renderGuess(root) {
    var p = state.session.puzzle;
    var wordLen = p.wordLen || p.word.length;
    var maxTries = p.maxTries || 6;
    var guesses = [];
    var current = "";
    var done = false;
    var keyState = Object.create(null);
    var showOsk = wantsOnScreenKeyboard();

    var meta = document.createElement("p");
    meta.className = "meta-line";
    meta.textContent = wordLen + " letters · " + maxTries + " tries · green = right spot · amber = wrong spot · grey = absent";
    root.appendChild(meta);

    if (!showOsk) {
      var desk = document.createElement("p");
      desk.className = "meta-line";
      desk.textContent = "Type on your keyboard · Enter to submit · Backspace to delete";
      root.appendChild(desk);
    }

    var board = document.createElement("div");
    board.className = "guess-board";
    board.style.setProperty("--guess-cols", String(wordLen));
    root.appendChild(board);

    var kb = document.createElement("div");
    kb.className = "kb";
    if (!showOsk) kb.hidden = true;
    root.appendChild(kb);

    var rowsLayout = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

    function paintBoard() {
      board.innerHTML = "";
      for (var r = 0; r < maxTries; r++) {
        var row = document.createElement("div");
        row.className = "guess-row" + (r === guesses.length && !done ? " active" : "");
        row.style.gridTemplateColumns = "repeat(" + wordLen + ", 1fr)";
        var word = guesses[r] || (r === guesses.length ? current : "");
        var scored = guesses[r] ? window.Dict.scoreGuess(guesses[r], p.word) : null;
        for (var c = 0; c < wordLen; c++) {
          var cell = document.createElement("div");
          cell.className = "guess-cell";
          var ch = word[c] || "";
          cell.textContent = ch;
          if (scored) cell.classList.add(scored[c]);
          else if (ch) cell.classList.add("typed");
          else if (r === guesses.length && c === current.length && !done) cell.classList.add("cursor");
          row.appendChild(cell);
        }
        board.appendChild(row);
      }
    }

    function paintKb() {
      if (!showOsk) return;
      kb.innerHTML = "";
      rowsLayout.forEach(function (letters, ri) {
        var row = document.createElement("div");
        row.className = "kb-row";
        if (ri === 2) {
          var enter = document.createElement("button");
          enter.type = "button";
          enter.className = "kb-key wide";
          enter.textContent = "Enter";
          enter.addEventListener("click", submit);
          row.appendChild(enter);
        }
        for (var i = 0; i < letters.length; i++) {
          var ch = letters[i];
          var key = document.createElement("button");
          key.type = "button";
          key.className = "kb-key" + (keyState[ch] ? " " + keyState[ch] : "");
          key.textContent = ch;
          key.addEventListener("click", function (letter) {
            return function () { typeLetter(letter); };
          }(ch));
          row.appendChild(key);
        }
        if (ri === 2) {
          var del = document.createElement("button");
          del.type = "button";
          del.className = "kb-key wide";
          del.textContent = "Del";
          del.addEventListener("click", backspace);
          row.appendChild(del);
        }
        kb.appendChild(row);
      });
    }

    function rank(a, b) {
      var order = { hit: 3, near: 2, miss: 1 };
      return (order[a] || 0) >= (order[b] || 0) ? a : b;
    }

    function typeLetter(ch) {
      if (done || current.length >= wordLen) return;
      current += ch;
      paintBoard();
    }
    function backspace() {
      if (done || !current.length) return;
      current = current.slice(0, -1);
      paintBoard();
    }
    function submit() {
      if (done) return;
      if (current.length !== wordLen) { toast("Need " + wordLen + " letters"); return; }
      if (!window.Dict.isWord(current)) { toast("Not in word list"); return; }
      var scored = window.Dict.scoreGuess(current, p.word);
      for (var i = 0; i < wordLen; i++) {
        keyState[current[i]] = rank(scored[i], keyState[current[i]]);
      }
      guesses.push(current);
      current = "";
      paintBoard();
      paintKb();
      if (guesses[guesses.length - 1] === p.word) {
        done = true;
        markWon();
        setStatus("play-status", "Got it — " + p.word.toUpperCase() + ".", null);
        toast("Got it");
        paintBoard();
      } else if (guesses.length >= maxTries) {
        done = true;
        setStatus("play-status", "It was " + p.word.toUpperCase() + ".", "warn");
        paintBoard();
      }
    }

    function guessKey(e) {
      if (state.mode.id !== "guess" || state.phase !== "play") return;
      if (e.key === "Enter") { e.preventDefault(); submit(); }
      else if (e.key === "Backspace") { e.preventDefault(); backspace(); }
      else if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); typeLetter(e.key.toLowerCase()); }
    }
    document.addEventListener("keydown", guessKey);
    state.session._cleanup = function () {
      document.removeEventListener("keydown", guessKey);
    };

    paintBoard();
    paintKb();
  }

  function renderBlanks(root) {
    var p = state.session.puzzle;
    var revealed = Object.create(null);
    var misses = 0;
    var done = false;
    var showOsk = wantsOnScreenKeyboard();

    var meta = document.createElement("p");
    meta.className = "meta-line";
    root.appendChild(meta);

    if (!showOsk) {
      var desk = document.createElement("p");
      desk.className = "meta-line";
      desk.textContent = "Type letters on your keyboard";
      root.appendChild(desk);
    }

    var wordEl = document.createElement("div");
    wordEl.className = "blanks-word";
    root.appendChild(wordEl);

    var kb = document.createElement("div");
    kb.className = "kb";
    if (!showOsk) kb.hidden = true;
    root.appendChild(kb);

    function refresh() {
      meta.textContent = "Misses " + misses + " / " + p.maxMisses;
      wordEl.innerHTML = "";
      var complete = true;
      for (var i = 0; i < p.word.length; i++) {
        var slot = document.createElement("span");
        slot.className = "blank-slot";
        if (revealed[p.word[i]]) {
          slot.textContent = p.word[i];
          slot.classList.add("hit");
        } else {
          slot.textContent = "";
          complete = false;
        }
        wordEl.appendChild(slot);
      }
      if (complete) {
        done = true;
        markWon();
        setStatus("play-status", "Word revealed — " + p.word.toUpperCase() + ".", null);
        toast("Word revealed");
      } else if (misses >= p.maxMisses) {
        done = true;
        setStatus("play-status", "It was " + p.word.toUpperCase() + ".", "warn");
        for (var j = 0; j < p.word.length; j++) {
          if (!revealed[p.word[j]]) {
            var missSlot = wordEl.children[j];
            if (missSlot) {
              missSlot.textContent = p.word[j];
              missSlot.classList.add("reveal");
            }
          }
        }
      }
    }

    function guess(ch) {
      if (done || revealed[ch] || revealed["_" + ch]) return;
      if (p.word.indexOf(ch) !== -1) revealed[ch] = 1;
      else {
        revealed["_" + ch] = 1;
        misses++;
      }
      paintKb();
      refresh();
    }

    function paintKb() {
      if (!showOsk) return;
      kb.innerHTML = "";
      ["qwertyuiop", "asdfghjkl", "zxcvbnm"].forEach(function (letters) {
        var row = document.createElement("div");
        row.className = "kb-row";
        for (var i = 0; i < letters.length; i++) {
          var ch = letters[i];
          var key = document.createElement("button");
          key.type = "button";
          key.className = "kb-key";
          key.textContent = ch;
          if (revealed[ch]) {
            key.classList.add("hit");
            key.disabled = true;
          }
          if (revealed["_" + ch]) {
            key.classList.add("miss");
            key.disabled = true;
          }
          key.addEventListener("click", function (letter) {
            return function () { guess(letter); };
          }(ch));
          row.appendChild(key);
        }
        kb.appendChild(row);
      });
    }

    function blanksKey(e) {
      if (state.mode.id !== "blanks" || state.phase !== "play") return;
      if (!/^[a-zA-Z]$/.test(e.key)) return;
      e.preventDefault();
      guess(e.key.toLowerCase());
    }
    document.addEventListener("keydown", blanksKey);
    state.session._cleanup = function () {
      document.removeEventListener("keydown", blanksKey);
    };

    paintKb();
    refresh();
  }

  /* ---------------------------------------------------------------- boot */

  function boot() {
    wireHubTheme();

    if (!window.Dict || !window.Dict.sizes.all) {
      setStatus("hub-status", "Dictionary failed to load.", "bad");
    }

    $("btn-back").addEventListener("click", goBack);

    $("btn-clear").addEventListener("click", function () {
      var button = $("btn-clear");
      if (button.getAttribute("data-armed") === "yes") {
        window.Store.clearAll();
        if (window.Theme) {
          window.Theme.set("system");
          if (window.Theme.setBackground) window.Theme.setBackground("grid");
          else if (window.Theme.paintBackground) window.Theme.paintBackground();
        } else if (document.documentElement) {
          document.documentElement.removeAttribute("data-theme");
          document.documentElement.setAttribute("data-bg", "grid");
        }
        button.removeAttribute("data-armed");
        button.textContent = "Erase all data";
        paintThemeChrome();
        renderHub();
        toast("Saved data erased.");
        return;
      }
      button.setAttribute("data-armed", "yes");
      button.textContent = "Tap again to erase";
      window.setTimeout(function () {
        button.removeAttribute("data-armed");
        button.textContent = "Erase all data";
      }, 4000);
    });

    var instrBtn = $("btn-instructions");
    var instrBox = $("hub-instructions");
    if (instrBtn && instrBox) {
      instrBtn.addEventListener("click", function () {
        var helpSub = instrBtn.querySelector(".settings-help-sub");
        if (!instrBox.hidden && instrBox.dataset.filled === "1") {
          instrBox.hidden = true;
          instrBtn.setAttribute("aria-expanded", "false");
          if (helpSub) helpSub.textContent = "How to play every game";
          return;
        }
        instrBox.innerHTML = "";
        MODES.forEach(function (mode) {
          var block = document.createElement("div");
          block.className = "mt12 how-play";
          var h = document.createElement("p");
          h.className = "nomargin";
          var strong = document.createElement("strong");
          strong.textContent = mode.name;
          h.appendChild(strong);
          block.appendChild(h);
          var ol = document.createElement("ol");
          ol.className = "how-steps";
          (HOW[mode.id] || [mode.blurb]).forEach(function (line) {
            var li = document.createElement("li");
            li.textContent = line;
            ol.appendChild(li);
          });
          block.appendChild(ol);
          instrBox.appendChild(block);
        });
        instrBox.dataset.filled = "1";
        instrBox.hidden = false;
        instrBtn.setAttribute("aria-expanded", "true");
        if (helpSub) helpSub.textContent = "Hide how to play";
      });
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(function () {});
    }

    showHub();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
