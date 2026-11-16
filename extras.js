// XIDATA STRATÉGIE - Réglages, jetons, indice, annuler, minuteur de tour, couleurs
// Ce fichier s'appuie sur game.js (Mode 1) et mode2.js (Mode 2) sans les remplacer.
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const WHITE = "white";
  const BLACK = "black";

  /* =====================================================
     Stockage local
     ===================================================== */
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* ignoré */ }
  }

  /* =====================================================
     Réglages
     ===================================================== */
  const stored = load("xidata-settings", {}) || {};
  const settings = {
    pawns: stored.pawns || "ebony",
    board: stored.board || "earth",
    timers: { ai: 0, local: 0, online: 0, ...(stored.timers || {}) }
  };
  const saveSettings = () => save("xidata-settings", settings);

  const TIMER_OPTIONS = [
    [0, "Désactivé"],
    [60, "1 minute"],
    [90, "1 min 30"],
    [120, "2 minutes"],
    [150, "2 min 30"]
  ];

  // Couleurs des pions : b = pions noirs, w = pions blancs (3 teintes : clair, moyen, foncé)
  const PAWNS = {
    ebony:  { name: "Ébène & Ivoire", b: ["#7a5238", "#2a170b", "#0b0603"], w: ["#fffaf0", "#eadbb6", "#b99d68"], ringB: "#e0a030", ringW: "#c4532a", edgeB: "#0b0603", edgeW: "#8f7440" },
    redgold:{ name: "Rouge & Or",     b: ["#e0675a", "#a3261b", "#4d0f0a"], w: ["#fff1b0", "#f2c14e", "#b8860b"], ringB: "#f6d37a", ringW: "#8a2b12", edgeB: "#3a0b07", edgeW: "#7a5a0a" },
    blue:   { name: "Bleu & Ivoire",  b: ["#6c8fd6", "#1f3a78", "#0a1630"], w: ["#fffaf0", "#eadbb6", "#b99d68"], ringB: "#e8d9a6", ringW: "#1f3a78", edgeB: "#07101f", edgeW: "#8f7440" },
    green:  { name: "Vert & Jaune",   b: ["#7fd08a", "#1f7a3a", "#0b3a1a"], w: ["#fff7b0", "#f4d03f", "#b8941f"], ringB: "#f2e08a", ringW: "#1f7a3a", edgeB: "#072412", edgeW: "#7a6210" },
    silver: { name: "Noir & Argent",  b: ["#5a5a5a", "#1d1d1d", "#050505"], w: ["#ffffff", "#e0e6ea", "#9aa6ad"], ringB: "#cfd8dc", ringW: "#455a64", edgeB: "#000000", edgeW: "#6b7780" }
  };

  // Couleurs du plateau
  const BOARDS = {
    earth:   { name: "Terre",       base: "#8c5832", hi: "rgba(190,120,70,.55)",  lo: "rgba(90,50,25,.5)",   border: "#5a3519", hole1: "#3d2312", hole2: "#24130a", rim: "rgba(222,165,110,.35)" },
    savanna: { name: "Savane",      base: "#c9a15a", hi: "rgba(240,210,140,.6)",  lo: "rgba(150,110,50,.5)", border: "#8a6a2e", hole1: "#6b4a1c", hole2: "#3f2a0e", rim: "rgba(255,235,180,.4)" },
    clay:    { name: "Argile",      base: "#a8442a", hi: "rgba(220,120,80,.55)",  lo: "rgba(90,30,15,.5)",   border: "#5e1f10", hole1: "#4a1a0c", hole2: "#2a0e06", rim: "rgba(240,160,130,.35)" },
    forest:  { name: "Forêt",       base: "#3f6b3a", hi: "rgba(110,160,90,.5)",  lo: "rgba(20,45,20,.55)",  border: "#1f3d1c", hole1: "#1c3319", hole2: "#0d1c0c", rim: "rgba(170,220,140,.3)" },
    night:   { name: "Nuit",        base: "#26303f", hi: "rgba(80,100,130,.5)",  lo: "rgba(10,14,22,.6)",   border: "#0f141c", hole1: "#0e1218", hole2: "#06080c", rim: "rgba(150,180,220,.25)" }
  };

  function applyTheme() {
    const p = PAWNS[settings.pawns] || PAWNS.ebony;
    const b = BOARDS[settings.board] || BOARDS.earth;
    const s = document.body.style;
    s.setProperty("--pb1", p.b[0]); s.setProperty("--pb2", p.b[1]); s.setProperty("--pb3", p.b[2]);
    s.setProperty("--pw1", p.w[0]); s.setProperty("--pw2", p.w[1]); s.setProperty("--pw3", p.w[2]);
    s.setProperty("--ringb", p.ringB); s.setProperty("--ringw", p.ringW);
    s.setProperty("--edgeb", p.edgeB); s.setProperty("--edgew", p.edgeW);
    s.setProperty("--bd1", b.base); s.setProperty("--bd2", b.hi); s.setProperty("--bd3", b.lo);
    s.setProperty("--bdborder", b.border);
    s.setProperty("--hole1", b.hole1); s.setProperty("--hole2", b.hole2); s.setProperty("--holerim", b.rim);
  }

  /* =====================================================
     Jetons (pièces)
     ===================================================== */
  const COST = { hint: 10, undo: 40 };
  const REWARD = { easy: 10, medium: 25, hard: 50 };
  const DAILY_BONUS = 30;

  let coins = Number(load("xidata-coins", 100));
  if (!Number.isFinite(coins) || coins < 0) coins = 100;

  function setCoins(value) {
    coins = Math.max(0, Math.round(value));
    save("xidata-coins", coins);
    refreshCoins();
  }
  const addCoins = amount => setCoins(coins + amount);
  function refreshCoins() {
    $$(".coin-value").forEach(el => { el.textContent = String(coins); });
  }

  /* =====================================================
     Message temporaire
     ===================================================== */
  let toastTimer = null;
  function toast(text) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  /* =====================================================
     Adaptateurs : un par mode de jeu
     ===================================================== */

  // ----- Mode 1 : Classique (variables et fonctions de game.js) -----
  const classic = {
    mode: "classic",
    ready: () =>
      typeof commitMove === "function" &&
      typeof legalMovesForPlayer === "function" &&
      typeof minimaxAi === "function" &&
      typeof board !== "undefined" && Array.isArray(board) && board.length === 25,
    boardEl: () => $("#board"),
    isAi: () => !!aiMode,
    isOver: () => !!gameOver,
    busy: () => !!aiThinking,
    paused: () => false,
    stable: () => true,
    actor: () => (gameOver ? null : currentPlayer),
    turnKey: () =>
      currentPlayer + "|" + board.map(p => (p ? p[0] : ".")).join("") + "|" +
      [...kings].join(",") + "|" + (pendingSanction ? "s" : ""),
    fresh: () =>
      lastMove === null && captures.black === 0 && captures.white === 0 &&
      kings.size === 0 && board.filter(Boolean).length === 24,
    winner: () => (gameOver ? currentPlayer : null),
    level: () => aiDifficulty,
    snapshot: () => ({
      board: board.slice(),
      kings: [...kings],
      currentPlayer,
      captures: { black: captures.black, white: captures.white },
      lastMove
    }),
    restore: snap => {
      board = snap.board.slice();
      kings = new Set(snap.kings);
      currentPlayer = snap.currentPlayer;
      captures = { black: snap.captures.black, white: snap.captures.white };
      lastMove = snap.lastMove;
      gameOver = false;
      selected = null;
      pendingSanction = null;
      chainPiece = null;
      chainPlayer = null;
      aiThinking = false;
      endModal.classList.add("hidden");
      render();
      setStatus("Coup annulé : à vous de rejouer.");
    },
    // Meilleur coup pour "color" : renvoie {from, to} (ou {to} pour une sanction)
    suggest: color => {
      if (pendingSanction) {
        const list = pendingSanction.candidates;
        return { to: list[Math.floor(Math.random() * list.length)] };
      }
      let moves = legalMovesForPlayer(color);
      if (!moves.length) return null;
      const captureMoves = moves.filter(m => m.capture !== null);
      if (captureMoves.length) moves = captureMoves; // la capture est obligatoire

      let best = null;
      let bestScore = color === BLACK ? -Infinity : Infinity;
      for (const move of moves) {
        const sim = simulateAiMove(board, kings, move, color);
        const score =
          minimaxAi(sim.board, sim.kings, 2, opponent(color), -Infinity, Infinity) +
          Math.random() * 0.01;
        if (color === BLACK ? score > bestScore : score < bestScore) {
          bestScore = score;
          best = move;
        }
      }
      return best ? { from: best.from, to: best.to } : null;
    }
  };

  // ----- Mode 2 : Personnalisé (accès fourni par le bloc de mode2.js) -----
  const custom = {
    mode: "custom",
    api: () => window.__mode2,
    ready() {
      const a = this.api();
      return !!(a && a.suggest && a.isAi && a.isBusy);
    },
    boardEl: () => $("#customBoard"),
    isAi() { return this.api().isAi(); },
    isOver() { return !!this.api().get().gameOver; },
    busy() { return this.api().isBusy(); },
    paused() { return this.api().get().bonusPending > 0; }, // le retrait bonus a son propre minuteur
    stable() { const s = this.api().get(); return s.chain === null && s.bonusPending === 0; },
    actor() {
      const s = this.api().get();
      if (s.gameOver) return null;
      if (s.bonusPending > 0) return s.bonusPlayer;
      return s.phase === "placement" ? s.placing : s.turn;
    },
    turnKey() {
      const s = this.api().get();
      return JSON.stringify([s.phase, s.placing, s.turn, s.board, s.chain, s.bonusPending, s.openingMovePending]);
    },
    fresh() {
      const s = this.api().get();
      return s.phase === "placement" && s.board.every(x => x === null);
    },
    winner() { const s = this.api().get(); return s.gameOver ? s.turn : null; },
    level: () => $("#customDifficulty").value,
    snapshot() {
      const s = this.api().get();
      return { ...s, board: s.board.slice(), captures: { black: s.captures.black, white: s.captures.white } };
    },
    restore(snap) {
      const copy = { ...snap, board: snap.board.slice(), captures: { ...snap.captures } };
      this.api().set(copy);
      this.api().render();
      const status = $("#customStatus");
      if (status) status.textContent = "Coup annulé : à vous de rejouer.";
    },
    suggest(color) { return this.api().suggest(color); }
  };

  const currentAdapter = () => ($("#gameMode").value === "custom" ? custom : classic);

  /* =====================================================
     Contexte de la partie
     ===================================================== */
  function contextOf(A) {
    if (window.onlineGameStarted) return "online";
    return A.isAi() ? "ai" : "local";
  }
  const myOnlineColor = () => (window.currentRoomRole === "host" ? WHITE : BLACK);

  function limitFor(ctx) {
    if (ctx === "online" && window.currentRoomTurnLimit !== undefined && window.currentRoomTurnLimit !== null) {
      return Number(window.currentRoomTurnLimit) || 0; // en ligne : le réglage de l'hôte s'applique aux deux
    }
    return Number(settings.timers[ctx]) || 0;
  }

  // Est-ce à CET appareil de jouer maintenant ?
  function humanActs(ctx, actor) {
    if (ctx === "local") return true;
    if (ctx === "ai") return actor === WHITE;
    return actor === myOnlineColor();
  }

  /* =====================================================
     Jouer un coup en simulant les touchers sur le plateau
     ===================================================== */
  function playSuggestion(A, sug) {
    const cellAt = i => A.boardEl().children[i];
    if (sug.from !== undefined && sug.from !== null && cellAt(sug.from)) cellAt(sug.from).click();
    if (cellAt(sug.to)) cellAt(sug.to).click();
  }

  /* =====================================================
     Annuler : points de retour mémorisés avant chaque action du joueur
     ===================================================== */
  const stacks = { classic: [], custom: [] };

  function recordUndoPoint(A) {
    if (!A.ready() || window.onlineGameStarted) return;
    if (!A.isAi() || A.isOver() || A.busy() || !A.stable() || A.actor() !== WHITE) return;
    const snap = A.snapshot();
    const json = JSON.stringify(snap);
    const stack = stacks[A.mode];
    const top = stack[stack.length - 1];
    if (!top || top.json !== json) stack.push({ json, snap });
  }

  // Dernier point de retour différent de la position actuelle (-1 si aucun)
  function undoTarget(A) {
    const stack = stacks[A.mode];
    const current = JSON.stringify(A.snapshot());
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].json !== current) return i;
    }
    return -1;
  }

  /* =====================================================
     Indice
     ===================================================== */
  let hint = null; // { key, from, to }

  function applyHint(A) {
    const el = A.boardEl();
    if (!el) return;
    Array.from(el.children).forEach((cell, i) => {
      cell.classList.toggle("hint-from", !!hint && hint.from === i);
      cell.classList.toggle("hint-to", !!hint && hint.to === i);
    });
  }

  function canAct(A) {
    return contextOf(A) === "ai" && !A.isOver() && !A.busy() && A.actor() === WHITE;
  }

  /* =====================================================
     Surveillance du plateau
     ===================================================== */
  function installCapture(A) {
    const el = A.boardEl();
    if (!el || el.__xidataExtras) return;
    el.__xidataExtras = true;
    // Avant chaque toucher du joueur : on mémorise la position (pour "Annuler")
    el.addEventListener("click", () => recordUndoPoint(A), true);
    // Le plateau est redessiné à chaque coup : on remet l'indice en surbrillance
    new MutationObserver(() => applyHint(A)).observe(el, { childList: true });
  }

  /* =====================================================
     Interface : barre de minuteur et boutons sous le plateau
     ===================================================== */
  function placeWidgets(A) {
    const panel = $(A.mode === "custom" ? "#customGame .board-panel" : "#classicGame .board-panel");
    const bar = $("#turnBar");
    const actions = $("#aiActions");
    const boardEl = A.boardEl();
    if (!panel || !boardEl) return;
    if (bar && bar.parentElement !== panel) panel.insertBefore(bar, boardEl);
    if (actions && actions.parentElement !== panel) panel.appendChild(actions);
  }

  function hideWidgets() {
    const bar = $("#turnBar");
    const actions = $("#aiActions");
    const chip = $("#gameCoins");
    if (bar) bar.hidden = true;
    if (actions) actions.hidden = true;
    if (chip) chip.hidden = true;
  }

  function updateActions(A, ctx) {
    const actions = $("#aiActions");
    const chip = $("#gameCoins");
    const show = ctx === "ai";
    if (actions) actions.hidden = !show;
    if (chip) chip.hidden = !show;
    if (!show) return;

    const mine = canAct(A);
    const hintBtn = $("#hintBtn");
    const undoBtn = $("#undoBtn");
    hintBtn.disabled = !mine;
    undoBtn.disabled = !mine || !A.stable() || undoTarget(A) < 0;
    hintBtn.classList.toggle("poor", coins < COST.hint);
    undoBtn.classList.toggle("poor", coins < COST.undo);
  }

  /* =====================================================
     Minuteur de tour
     ===================================================== */
  let timerKey = "";
  let deadline = 0;

  const fmt = seconds => Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");

  function whoText(ctx, actor) {
    if (ctx === "ai") return actor === WHITE ? "Votre tour" : "Tour de l'ordinateur";
    if (ctx === "online") return actor === myOnlineColor() ? "Votre tour" : "Tour de l'adversaire";
    return actor === WHITE ? "Tour des Blancs" : "Tour des Noirs";
  }

  function runTimer(A, ctx) {
    const bar = $("#turnBar");
    if (!bar) return;
    const limit = limitFor(ctx);
    const actor = A.actor();

    if (!limit || !actor || A.isOver() || A.paused()) {
      bar.hidden = true;
      timerKey = "";
      return;
    }

    const key = ctx + "|" + limit + "|" + A.turnKey();
    if (key !== timerKey) {
      timerKey = key;
      deadline = Date.now() + limit * 1000;
    }

    const aiTurn = ctx === "ai" && actor === BLACK;
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

    bar.hidden = false;
    $("#turnClock").textContent = aiTurn ? "🤖" : "⏳ " + fmt(remaining);
    $("#turnWho").textContent = whoText(ctx, actor);
    bar.classList.toggle("low", !aiTurn && remaining <= 10);

    // Temps écoulé : un coup est joué automatiquement (seulement par l'appareil du joueur concerné)
    if (!aiTurn && remaining === 0 && humanActs(ctx, actor) && !A.busy()) {
      deadline = Date.now() + 3000; // évite de rejouer en boucle si le coup échoue
      const sug = A.suggest(actor);
      if (sug) {
        toast("⏰ Temps écoulé : coup automatique");
        playSuggestion(A, sug);
      }
    }
  }

  /* =====================================================
     Récompenses de fin de partie
     ===================================================== */
  const wasOver = { classic: false, custom: false };

  function checkGameOver(A, ctx) {
    const over = A.isOver();
    if (over && !wasOver[A.mode] && ctx === "ai" && A.winner() === WHITE) {
      const amount = REWARD[A.level()] || REWARD.medium;
      addCoins(amount);
      toast("🎉 Victoire ! +" + amount + " 🪙");
    }
    wasOver[A.mode] = over;
  }

  /* =====================================================
     Boucle principale
     ===================================================== */
  function tick() {
    refreshCoins();
    const A = currentAdapter();
    if (document.body.dataset.view !== "game" || !A.ready()) {
      hideWidgets();
      return;
    }
    [classic, custom].forEach(adapter => { if (adapter.ready()) installCapture(adapter); });
    placeWidgets(A);

    const ctx = contextOf(A);
    if (A.fresh()) stacks[A.mode].length = 0; // nouvelle partie : plus rien à annuler
    if (hint && hint.key !== A.turnKey()) hint = null;
    applyHint(A);
    checkGameOver(A, ctx);
    updateActions(A, ctx);
    runTimer(A, ctx);
  }

  /* =====================================================
     Boutons Indice et Annuler
     ===================================================== */
  function onHint() {
    const A = currentAdapter();
    if (!A.ready() || !canAct(A)) return;
    if (coins < COST.hint) { toast("Pas assez de jetons 🪙"); return; }
    const sug = A.suggest(WHITE);
    if (!sug) { toast("Aucun indice disponible."); return; }
    setCoins(coins - COST.hint);
    hint = { key: A.turnKey(), from: sug.from, to: sug.to };
    applyHint(A);
    toast("💡 Regarde les cases entourées en bleu");
  }

  function onUndo() {
    const A = currentAdapter();
    if (!A.ready() || !canAct(A) || !A.stable()) return;
    const index = undoTarget(A);
    if (index < 0) { toast("Rien à annuler."); return; }
    if (coins < COST.undo) { toast("Pas assez de jetons 🪙"); return; }
    const snap = stacks[A.mode][index].snap;
    setCoins(coins - COST.undo);
    stacks[A.mode].length = index;
    hint = null;
    A.restore(snap);
    toast("↩ Coup annulé");
  }

  /* =====================================================
     Fenêtre Réglages
     ===================================================== */
  const radial = c => "radial-gradient(circle at 35% 30%," + c[0] + "," + c[1] + " 55%," + c[2] + ")";

  function buildChoices() {
    const pawnBox = $("#pawnChoices");
    const boardBox = $("#boardChoices");
    if (!pawnBox || !boardBox) return;
    pawnBox.innerHTML = "";
    boardBox.innerHTML = "";

    Object.keys(PAWNS).forEach(id => {
      const p = PAWNS[id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice" + (settings.pawns === id ? " active" : "");
      btn.innerHTML =
        '<span class="swatch-pawns"><i style="background:' + radial(p.b) + '"></i>' +
        '<i style="background:' + radial(p.w) + '"></i></span><span class="choice-name"></span>';
      btn.querySelector(".choice-name").textContent = p.name;
      btn.addEventListener("click", () => {
        settings.pawns = id;
        saveSettings();
        applyTheme();
        buildChoices();
      });
      pawnBox.appendChild(btn);
    });

    Object.keys(BOARDS).forEach(id => {
      const b = BOARDS[id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice" + (settings.board === id ? " active" : "");
      btn.innerHTML =
        '<span class="swatch-board" style="border-color:' + b.border + ';background:' +
        "radial-gradient(circle at 28% 50%," + b.hole1 + " 0 5px,transparent 6px)," +
        "radial-gradient(circle at 72% 50%," + b.hole1 + " 0 5px,transparent 6px)," + b.base +
        '"></span><span class="choice-name"></span>';
      btn.querySelector(".choice-name").textContent = b.name;
      btn.addEventListener("click", () => {
        settings.board = id;
        saveSettings();
        applyTheme();
        buildChoices();
      });
      boardBox.appendChild(btn);
    });
  }

  function fillTimerSelects() {
    [["#timerAi", "ai"], ["#timerLocal", "local"], ["#timerOnline", "online"]].forEach(([selector, ctx]) => {
      const select = $(selector);
      if (!select) return;
      select.innerHTML = "";
      TIMER_OPTIONS.forEach(([seconds, label]) => {
        const option = document.createElement("option");
        option.value = String(seconds);
        option.textContent = label;
        select.appendChild(option);
      });
      select.value = String(settings.timers[ctx] || 0);
      select.addEventListener("change", () => {
        settings.timers[ctx] = Number(select.value) || 0;
        saveSettings();
      });
    });
  }

  function bindSheet() {
    const sheet = $("#settingsSheet");
    if (!sheet) return;
    $$("[data-open-settings]").forEach(btn => btn.addEventListener("click", () => { sheet.hidden = false; }));
    $("#settingsClose").addEventListener("click", () => { sheet.hidden = true; });
    sheet.addEventListener("click", event => { if (event.target === sheet) sheet.hidden = true; });
  }

  /* =====================================================
     Bonus quotidien
     ===================================================== */
  function dailyBonus() {
    const today = new Date().toISOString().slice(0, 10);
    if (load("xidata-daily", "") === today) return;
    save("xidata-daily", today);
    addCoins(DAILY_BONUS);
    toast("🎁 Bonus du jour : +" + DAILY_BONUS + " 🪙");
  }

  /* =====================================================
     Démarrage
     ===================================================== */
  applyTheme();
  buildChoices();
  fillTimerSelects();
  bindSheet();
  refreshCoins();

  const hintBtn = $("#hintBtn");
  const undoBtn = $("#undoBtn");
  if (hintBtn) hintBtn.addEventListener("click", onHint);
  if (undoBtn) undoBtn.addEventListener("click", onUndo);

  dailyBonus();
  setInterval(tick, 250);

  // Utilisé par online.js (temps de réflexion de la salle) et pour les tests
  window.xidataSettings = {
    getTurnLimit: ctx => Number(settings.timers[ctx]) || 0
  };
  window.xidataExtras = { tick, coins: () => coins, setCoins, settings, stacks, adapters: { classic, custom } };
})();