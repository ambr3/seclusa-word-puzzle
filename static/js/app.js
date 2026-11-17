/*
 * Seclusa Word Puzzle — offline word games, one dictionary, no network.
 *
 * Hub = game list. Theme sheet in the topbar.
 * Each mode has a short start menu (Play first; How collapsed).
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
      id: "scrabble",
      name: "Scrabble",
      mark: "S",
      tag: "Tiles",
      blurb: "Play high-scoring words from a seven-tile rack."
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
    scrabble: [
      "You get 7 letter tiles. The small number on each tile is how many points that letter is worth.",
      "Tap tiles (or type those letters) to build a word in the space above the rack.",
      "Press Play word. If it is a real word, you score the points on those tiles.",
      "If you use all 7 tiles in one word, you get 50 extra bonus points.",
      "Used tiles leave. New tiles come from the bag until the bag is empty.",
      "Keep making words until your score reaches the target. Then you win!",
      "Clear removes the word you are building. Shuffle mixes your rack (only when no word is started)."
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
    scrabble: {
      easy: "Target 30 pts · 7-tile rack",
      medium: "Target 55 pts · 7-tile rack",
      hard: "Target 85 pts · 7-tile rack"
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

  /* ---------------------------------------------------------------- theme sheet */

  var sheetOpen = false;

  function paintThemeChrome() {
    if (window.Theme && window.Theme.paintModeChrome) window.Theme.paintModeChrome();
  }

  function showThemeSheet() {
    var sheet = $("sheet-theme");
    var scrim = $("scrim");
    if (!sheet) return;
    paintThemeChrome();
    sheet.inert = false;
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    sheet.setAttribute("aria-modal", "true");
    if (scrim) {
      scrim.hidden = false;
      scrim.classList.add("open");
    }
    sheetOpen = true;
    var focus = sheet.querySelector("[data-theme-opt]");
    if (focus) focus.focus();
  }

  function hideThemeSheet() {
    var sheet = $("sheet-theme");
    var scrim = $("scrim");
    if (!sheet) return;
    sheet.classList.remove("open");
    sheet.inert = true;
    sheet.setAttribute("aria-hidden", "true");
    sheet.setAttribute("aria-modal", "false");
    if (scrim) {
      scrim.classList.remove("open");
      scrim.hidden = true;
    }
    sheetOpen = false;
    var btn = $("btn-theme");
    if (btn) btn.focus();
  }

  function wireTheme() {
    if (window.Theme) {
      window.Theme.apply(window.Theme.current());
      if (window.Theme.paintBackground) window.Theme.paintBackground();
    }
    paintThemeChrome();
    var themeBtn = $("btn-theme");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        if (sheetOpen) hideThemeSheet();
        else showThemeSheet();
      });
    }
    var scrim = $("scrim");
    if (scrim) scrim.addEventListener("click", hideThemeSheet);
    document.querySelectorAll("#sheet-theme [data-theme-opt]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var opt = btn.getAttribute("data-theme-opt");
        if (window.Theme) window.Theme.set(opt);
        paintThemeChrome();
        toast("Theme: " + opt);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sheetOpen) {
        e.preventDefault();
        hideThemeSheet();
      }
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

  function setPlayRootPhase(phase) {
    var root = $("play-root");
    if (!root) return;
    var cls = "mode-play-root";
    if (phase === "play") cls += " is-playing";
    else if (phase === "result") cls += " is-result";
    else cls += " is-menu";
    root.className = cls;
  }

  function showHub() {
    cleanupSession();
    state.mode = null;
    state.phase = "hub";
    state.howOpen = false;
    if (sheetOpen) hideThemeSheet();
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
    if (sheetOpen) hideThemeSheet();
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
        setPlayRootPhase("menu");
        return;
      }
      showHub();
      return;
    }
    if (state.phase === "play" || state.phase === "result") {
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
    var toolbar = document.querySelector("#play-screen .play-toolbar");
    if (toolbar) {
      toolbar.hidden = state.phase === "menu";
    }
    if (state.phase === "menu") {
      // How lives collapsed on the start page
    } else if ((state.phase === "play" || state.phase === "result") && state.mode.id !== "puzzle") {
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
    setPlayRootPhase(state.phase === "play" || state.phase === "result" ? state.phase : "menu");
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
        setPlayRootPhase("play");
        var toolbar = document.querySelector("#play-screen .play-toolbar");
        if (toolbar) toolbar.hidden = false;
      },
      onRoundEnd: function (info) {
        state.phase = "result";
        setPlayRootPhase("result");
        var toolbar = document.querySelector("#play-screen .play-toolbar");
        if (toolbar) toolbar.hidden = false;
        if (info && info.won) markWon();
      }
    });
    state.session = {
      won: false,
      _cleanup: handle.cleanup,
      puzzleBack: function () {
        var stayed = handle.back();
        if (stayed) {
          state.phase = "menu";
          setPlayRootPhase("menu");
          var toolbar = document.querySelector("#play-screen .play-toolbar");
          if (toolbar) toolbar.hidden = true;
        }
        return stayed;
      }
    };
    state.phase = "menu";
    setPlayRootPhase("menu");
  }

  /* ---------------------------------------------------------------- hub */

  function posterArt(modeId) {
    var art = document.createElement("span");
    art.className = "poster-art poster-art-" + modeId;
    art.setAttribute("aria-hidden", "true");
    if (modeId === "puzzle") {
      "WORD PLAY GAME HUNT".split(" ").forEach(function (word, wi) {
        var row = document.createElement("span");
        row.className = "poster-art-row" + (wi === 0 ? " on" : "");
        word.split("").forEach(function (ch) {
          var cell = document.createElement("span");
          cell.className = "poster-cell";
          cell.textContent = ch;
          row.appendChild(cell);
        });
        art.appendChild(row);
      });
      return art;
    }
    if (modeId === "scrabble") {
      [["Q", 10], ["U", 1], ["I", 1], ["Z", 10], ["E", 1], ["A", 1], ["R", 1]].forEach(function (pair) {
        var tile = document.createElement("span");
        tile.className = "poster-tile";
        var letter = document.createElement("span");
        letter.className = "poster-tile-l";
        letter.textContent = pair[0];
        var val = document.createElement("span");
        val.className = "poster-tile-v";
        val.textContent = String(pair[1]);
        tile.appendChild(letter);
        tile.appendChild(val);
        art.appendChild(tile);
      });
      return art;
    }
    "W_R_D".split("").forEach(function (ch) {
      var slot = document.createElement("span");
      slot.className = "poster-blank" + (ch === "_" ? " empty" : "");
      slot.textContent = ch === "_" ? "" : ch;
      art.appendChild(slot);
    });
    return art;
  }

  function renderHub() {
    var grid = $("mode-grid");
    grid.innerHTML = "";
    var data = loadData();
    MODES.forEach(function (mode) {
      var stats = data.stats[mode.id] || {};
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "poster mode-" + mode.id + (mode.id === "puzzle" ? " poster-lead" : "");
      btn.setAttribute("aria-label", mode.name + ". " + mode.blurb);

      var mark = document.createElement("span");
      mark.className = "poster-watermark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = mode.mark || mode.name.charAt(0);

      var copy = document.createElement("span");
      copy.className = "poster-copy";
      var name = document.createElement("span");
      name.className = "poster-name";
      name.textContent = mode.name;
      var blurb = document.createElement("span");
      blurb.className = "poster-blurb";
      blurb.textContent = mode.blurb;
      var go = document.createElement("span");
      go.className = "poster-go";
      var played = stats.played || 0;
      go.textContent = played ? ("Play · " + played) : "Play";
      copy.appendChild(name);
      copy.appendChild(blurb);
      copy.appendChild(go);

      btn.appendChild(mark);
      btn.appendChild(copy);
      btn.appendChild(posterArt(mode.id));
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
        sizes.common.toLocaleString() + " common · " +
        sizes.all.toLocaleString() + " accepted · on this device.";
    }

    setStatus(
      "hub-status",
      window.Store.isPersistent()
        ? ""
        : "Storage is blocked — this session will not be remembered.",
      window.Store.isPersistent() ? null : "warn"
    );
  }

  /* ---------------------------------------------------------------- start menu */

  function renderStartMenu(root) {
    var mode = state.mode;
    var hints = DIFF_HINT[mode.id] || {};

    var page = document.createElement("div");
    page.className = "start-page";

    var side = document.createElement("div");
    side.className = "start-side";
    var main = document.createElement("div");
    main.className = "start-main";
    page.appendChild(side);
    page.appendChild(main);

    var title = document.createElement("h2");
    title.className = "start-title";
    title.textContent = mode.name;
    side.appendChild(title);

    var blurb = document.createElement("p");
    blurb.className = "start-blurb muted";
    blurb.textContent = mode.blurb;
    side.appendChild(blurb);

    var diffLabel = document.createElement("p");
    diffLabel.className = "start-section-label";
    diffLabel.textContent = "Difficulty";
    main.appendChild(diffLabel);

    var row = document.createElement("div");
    row.className = "diff-row";
    row.id = "diff-row";
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "Difficulty");
    main.appendChild(row);

    var detail = document.createElement("p");
    detail.className = "meta-line mt10";
    detail.id = "diff-detail";
    main.appendChild(detail);

    var play = document.createElement("button");
    play.type = "button";
    play.className = "btn primary wide mode-play-btn mt14";
    play.id = "btn-mode-play";
    play.textContent = "Play";
    main.appendChild(play);

    var howToggle = document.createElement("button");
    howToggle.type = "button";
    howToggle.className = "fold-toggle mt14";
    howToggle.setAttribute("aria-expanded", "false");
    howToggle.innerHTML = '<span>How to play</span><span class="fold-chev" aria-hidden="true">›</span>';
    page.appendChild(howToggle);

    var howBox = document.createElement("div");
    howBox.className = "fold-panel";
    howBox.hidden = true;
    var ol = document.createElement("ol");
    ol.className = "how-steps";
    (HOW[mode.id] || [mode.blurb]).forEach(function (line) {
      var li = document.createElement("li");
      li.textContent = line;
      ol.appendChild(li);
    });
    howBox.appendChild(ol);
    page.appendChild(howBox);

    root.appendChild(page);

    function paintDiffLabels() {
      var p = modePrefs(mode.id);
      detail.textContent = hints[p.difficulty] || "";
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

    play.addEventListener("click", function () {
      state.phase = "play";
      renderModeShell();
    });

    howToggle.addEventListener("click", function () {
      var open = howBox.hidden;
      howBox.hidden = !open;
      howToggle.setAttribute("aria-expanded", open ? "true" : "false");
      howToggle.classList.toggle("open", open);
    });
  }

  /* ---------------------------------------------------------------- play rounds */

  function startRound() {
    setStatus("play-status", "");
    var diff = modePrefs(state.mode.id).difficulty;
    var random = randomFor(state.mode.id);
    var opts = { difficulty: diff };
    var puzzle = null;
    if (state.mode.id === "scrabble") puzzle = window.Dict.makeScrabble(random, opts);
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
    if (id === "scrabble") renderScrabble(root);
    else if (id === "blanks") renderBlanks(root);
  }

  function markWon() {
    if (!state.session || state.session.won) return;
    state.session.won = true;
    bumpStat(state.mode.id, "won");
  }


  function showRoundEnd(root, opts) {
    var card = document.createElement("div");
    card.className = "play-block round-end" + (opts.won ? "" : " lost");
    card.setAttribute("role", "status");
    var h = document.createElement("h2");
    h.textContent = opts.title;
    var score = document.createElement("p");
    score.className = "round-end-score";
    score.textContent = opts.scoreText;
    var meta = document.createElement("p");
    meta.className = "round-end-meta";
    meta.textContent = opts.meta || "";
    var actions = document.createElement("div");
    actions.className = "buttonrow center";
    var again = document.createElement("button");
    again.type = "button";
    again.className = "btn primary";
    again.textContent = "Play again";
    again.addEventListener("click", function () {
      state.phase = "play";
      renderModeShell();
    });
    var menu = document.createElement("button");
    menu.type = "button";
    menu.className = "btn";
    menu.textContent = "Menu";
    menu.addEventListener("click", function () {
      cleanupSession();
      state.phase = "menu";
      setStatus("play-status", "");
      renderModeShell();
    });
    actions.appendChild(again);
    actions.appendChild(menu);
    card.appendChild(h);
    card.appendChild(score);
    if (opts.meta) card.appendChild(meta);
    card.appendChild(actions);
    root.appendChild(card);
  }

  /* ---------------------------------------------------------------- mode UIs */

  function renderScrabble(root) {
    var p = state.session.puzzle;
    var bag = p.bag.slice();
    var rack = p.rack.slice();
    var picked = []; // indices into rack
    var score = 0;
    var done = false;
    var played = [];

    var stage = document.createElement("div");
    stage.className = "play-stage";
    root.appendChild(stage);

    var scoreCard = document.createElement("div");
    scoreCard.className = "play-block";
    scoreCard.innerHTML =
      '<p class="play-block-label">Score</p>' +
      '<div class="play-score-row">' +
        '<span class="play-score" id="sb-score">0</span>' +
        '<span class="play-score-meta" id="sb-meta"></span>' +
      '</div>';
    stage.appendChild(scoreCard);

    var wordCard = document.createElement("div");
    wordCard.className = "play-block";
    wordCard.innerHTML = '<p class="play-block-label">Your word</p>';
    var wordRow = document.createElement("div");
    wordRow.className = "letter-row scrabble-word";
    wordCard.appendChild(wordRow);
    stage.appendChild(wordCard);

    var rackCard = document.createElement("div");
    rackCard.className = "play-block";
    rackCard.innerHTML = '<p class="play-block-label">Rack</p>';
    var rackRow = document.createElement("div");
    rackRow.className = "letter-row scrabble-rack";
    rackCard.appendChild(rackRow);
    stage.appendChild(rackCard);

    var actions = document.createElement("div");
    actions.className = "buttonrow center";
    actions.innerHTML =
      '<button type="button" class="btn primary" id="sb-play">Play word</button>' +
      '<button type="button" class="btn" id="sb-clear">Clear</button>' +
      '<button type="button" class="btn" id="sb-shuffle">Shuffle</button>';
    stage.appendChild(actions);

    var hint = document.createElement("p");
    hint.className = "meta-line";
    hint.textContent = wantsOnScreenKeyboard()
      ? "Tap tiles to build a word, then Play."
      : "Type letters from your rack, Enter to play, Backspace to clear.";
    stage.appendChild(hint);

    var foundCard = document.createElement("div");
    foundCard.className = "play-block";
    foundCard.innerHTML = '<p class="play-block-label">Played</p>';
    var list = document.createElement("div");
    list.className = "found-list";
    foundCard.appendChild(list);
    stage.appendChild(foundCard);

    var endHost = document.createElement("div");
    endHost.id = "sb-end-host";
    stage.appendChild(endHost);

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

    function finishRound(won, statusMsg, statusKind) {
      done = true;
      if (won) markWon();
      setStatus("play-status", statusMsg, statusKind || null);
      if (won) toast("Target reached");
      setPlayRootPhase("result");
      state.phase = "result";
      actions.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
      endHost.innerHTML = "";
      showRoundEnd(endHost, {
        won: won,
        title: won ? "Target reached" : "Tiles gone",
        scoreText: score + " pts",
        meta: "Target " + p.target + " · " + played.length + " word" + (played.length === 1 ? "" : "s")
      });
      paint();
    }

    function paint() {
      scoreCard.querySelector("#sb-score").textContent = String(score);
      scoreCard.querySelector("#sb-meta").textContent = "/ " + p.target + " · bag " + bag.length;
      wordRow.innerHTML = "";
      if (!picked.length) {
        var empty = document.createElement("span");
        empty.className = "meta-line";
        empty.textContent = "Tap tiles below";
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
      if (!played.length) {
        var none = document.createElement("span");
        none.className = "meta-line";
        none.textContent = "No words yet";
        list.appendChild(none);
      } else {
        played.forEach(function (item) {
          var chip = document.createElement("span");
          chip.className = "found-chip";
          chip.textContent = item.word + " +" + item.pts;
          list.appendChild(chip);
        });
      }
    }

    function clearWord() {
      if (done) return;
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
        finishRound(true, "Target reached — " + score + " pts.", null);
        return;
      }
      if (!rack.length && !bag.length) {
        finishRound(false, "Tiles gone — scored " + score + " / " + p.target + ".", "warn");
        return;
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
      if (state.mode.id !== "scrabble" || (state.phase !== "play" && state.phase !== "result")) return;
      if (done) return;
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

  function renderBlanks(root) {
    var p = state.session.puzzle;
    var revealed = Object.create(null);
    var misses = 0;
    var done = false;
    var showOsk = wantsOnScreenKeyboard();

    var stage = document.createElement("div");
    stage.className = "play-stage";
    root.appendChild(stage);

    var metaCard = document.createElement("div");
    metaCard.className = "play-block";
    metaCard.innerHTML =
      '<p class="play-block-label">Misses</p>' +
      '<div class="play-score-row">' +
        '<span class="play-score" id="bl-misses">0</span>' +
        '<span class="play-score-meta" id="bl-miss-meta"></span>' +
      '</div>';
    stage.appendChild(metaCard);

    if (!showOsk) {
      var desk = document.createElement("p");
      desk.className = "meta-line";
      desk.textContent = "Type letters on your keyboard";
      stage.appendChild(desk);
    }

    var wordCard = document.createElement("div");
    wordCard.className = "play-block";
    wordCard.innerHTML = '<p class="play-block-label">Word</p>';
    var wordEl = document.createElement("div");
    wordEl.className = "blanks-word";
    wordCard.appendChild(wordEl);
    stage.appendChild(wordCard);

    var kbCard = document.createElement("div");
    kbCard.className = "play-block";
    kbCard.innerHTML = '<p class="play-block-label">Keyboard</p>';
    var kb = document.createElement("div");
    kb.className = "kb";
    if (!showOsk) kbCard.hidden = true;
    kbCard.appendChild(kb);
    stage.appendChild(kbCard);

    var endHost = document.createElement("div");
    endHost.id = "bl-end-host";
    stage.appendChild(endHost);

    function paintWord(revealAll) {
      metaCard.querySelector("#bl-misses").textContent = String(misses);
      metaCard.querySelector("#bl-miss-meta").textContent = "/ " + p.maxMisses;
      wordEl.innerHTML = "";
      var complete = true;
      for (var i = 0; i < p.word.length; i++) {
        var slot = document.createElement("span");
        slot.className = "blank-slot";
        if (revealed[p.word[i]]) {
          slot.textContent = p.word[i];
          slot.classList.add("hit");
        } else {
          complete = false;
          if (revealAll) {
            slot.textContent = p.word[i];
            slot.classList.add("reveal");
          } else {
            slot.textContent = "";
          }
        }
        wordEl.appendChild(slot);
      }
      return complete;
    }

    function finishRound(won) {
      if (done) return;
      done = true;
      if (won) {
        markWon();
        setStatus("play-status", "Word revealed — " + p.word.toUpperCase() + ".", null);
        toast("Word revealed");
      } else {
        setStatus("play-status", "It was " + p.word.toUpperCase() + ".", "warn");
      }
      setPlayRootPhase("result");
      state.phase = "result";
      paintWord(!won);
      paintKb();
      endHost.innerHTML = "";
      showRoundEnd(endHost, {
        won: won,
        title: won ? "Word revealed" : "Out of misses",
        scoreText: p.word.toUpperCase(),
        meta: "Misses " + misses + " / " + p.maxMisses
      });
    }

    function refresh() {
      var complete = paintWord(false);
      if (!done && complete) finishRound(true);
      else if (!done && misses >= p.maxMisses) finishRound(false);
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
          if (done) key.disabled = true;
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
    wireTheme();

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
        button.textContent = "Erase data";
        paintThemeChrome();
        renderHub();
        toast("Saved data erased.");
        return;
      }
      button.setAttribute("data-armed", "yes");
      button.textContent = "Tap again to erase";
      window.setTimeout(function () {
        button.removeAttribute("data-armed");
        button.textContent = "Erase data";
      }, 4000);
    });

    function closeFolds(except) {
      ["hub-instructions", "hub-dict"].forEach(function (id) {
        if (id === except) return;
        var el = $(id);
        if (el) el.hidden = true;
      });
      var instr = $("btn-instructions");
      var dict = $("btn-dict-toggle");
      if (instr && except !== "hub-instructions") instr.setAttribute("aria-expanded", "false");
      if (dict && except !== "hub-dict") dict.setAttribute("aria-expanded", "false");
    }

    var instrBtn = $("btn-instructions");
    var instrBox = $("hub-instructions");
    if (instrBtn && instrBox) {
      instrBtn.addEventListener("click", function () {
        if (!instrBox.hidden) {
          instrBox.hidden = true;
          instrBtn.setAttribute("aria-expanded", "false");
          return;
        }
        closeFolds("hub-instructions");
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
        instrBox.hidden = false;
        instrBtn.setAttribute("aria-expanded", "true");
      });
    }

    var dictBtn = $("btn-dict-toggle");
    var dictBox = $("hub-dict");
    if (dictBtn && dictBox) {
      dictBtn.addEventListener("click", function () {
        if (!dictBox.hidden) {
          dictBox.hidden = true;
          dictBtn.setAttribute("aria-expanded", "false");
          return;
        }
        closeFolds("hub-dict");
        dictBox.hidden = false;
        dictBtn.setAttribute("aria-expanded", "true");
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
