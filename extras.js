// XIDATA STRATÉGIE - Réglages par type de partie, cauris, boutique, indice, annuler,
// minuteur de tour, match nul et annonces stylées sur le plateau.
// Ce fichier s'appuie sur game.js (Mode 1) et mode2.js (Mode 2) sans les remplacer.
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const WHITE = "white";
  const BLACK = "black";
  const CONTEXTS = ["ai", "local", "online"];

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
     Réglages : un profil par type de partie
     (contre l'ordinateur, deux joueurs sur le même appareil, en ligne)
     ===================================================== */
  const stored = load("xidata-settings", {}) || {};
  const profiles = {};
  CONTEXTS.forEach(ctx => {
    const p = (stored.profiles && stored.profiles[ctx]) || {};
    const oldTimers = stored.timers || {}; // anciens réglages (une seule couleur pour tout)
    profiles[ctx] = {
      pawns: p.pawns || stored.pawns || "ebony",
      board: p.board || stored.board || "earth",
      timer: Number(p.timer !== undefined ? p.timer : oldTimers[ctx]) || 0,
      rules: { noBack: (p.rules && p.rules.noBack) || "off" }
    };
  });
  const settings = { profiles, tab: "ai" };
  const saveSettings = () => save("xidata-settings", { profiles: settings.profiles });

  const TIMER_OPTIONS = [
    [0, "Désactivé"],
    [60, "1 minute"],
    [90, "1 min 30"],
    [120, "2 minutes"],
    [150, "2 min 30"]
  ];

  // Règles optionnelles : "pas de retour arrière" pour les pions (les rois restent libres au Mode 1)
  const RULE_OPTIONS = [
    ["off", "Désactivée (les pions peuvent reculer)"],
    ["moves", "Pas de retour arrière (déplacements)"],
    ["all", "Pas de retour arrière (déplacements et captures)"]
  ];

  // Couleurs des pions : b = pions noirs, w = pions blancs (3 teintes : clair, moyen, foncé)
  const PAWNS = {
    ebony:   { name: "Ébène & Ivoire", b: ["#7a5238", "#2a170b", "#0b0603"], w: ["#fffaf0", "#eadbb6", "#b99d68"], ringB: "#e0a030", ringW: "#c4532a", edgeB: "#0b0603", edgeW: "#8f7440" },
    redgold: { name: "Rouge & Or",     b: ["#e0675a", "#a3261b", "#4d0f0a"], w: ["#fff1b0", "#f2c14e", "#b8860b"], ringB: "#f6d37a", ringW: "#8a2b12", edgeB: "#3a0b07", edgeW: "#7a5a0a" },
    blue:    { name: "Bleu & Ivoire",  b: ["#6c8fd6", "#1f3a78", "#0a1630"], w: ["#fffaf0", "#eadbb6", "#b99d68"], ringB: "#e8d9a6", ringW: "#1f3a78", edgeB: "#07101f", edgeW: "#8f7440" },
    green:   { name: "Vert & Jaune",   b: ["#7fd08a", "#1f7a3a", "#0b3a1a"], w: ["#fff7b0", "#f4d03f", "#b8941f"], ringB: "#f2e08a", ringW: "#1f7a3a", edgeB: "#072412", edgeW: "#7a6210" },
    silver:  { name: "Noir & Argent",  b: ["#5a5a5a", "#1d1d1d", "#050505"], w: ["#ffffff", "#e0e6ea", "#9aa6ad"], ringB: "#cfd8dc", ringW: "#455a64", edgeB: "#000000", edgeW: "#6b7780" }
  };

  // Couleurs du plateau
  const BOARDS = {
    earth:   { name: "Terre",   base: "#8c5832", hi: "rgba(190,120,70,.55)", lo: "rgba(90,50,25,.5)",  border: "#5a3519", hole1: "#3d2312", hole2: "#24130a", rim: "rgba(222,165,110,.35)" },
    savanna: { name: "Savane",  base: "#c9a15a", hi: "rgba(240,210,140,.6)", lo: "rgba(150,110,50,.5)", border: "#8a6a2e", hole1: "#6b4a1c", hole2: "#3f2a0e", rim: "rgba(255,235,180,.4)" },
    clay:    { name: "Argile",  base: "#a8442a", hi: "rgba(220,120,80,.55)", lo: "rgba(90,30,15,.5)",  border: "#5e1f10", hole1: "#4a1a0c", hole2: "#2a0e06", rim: "rgba(240,160,130,.35)" },
    forest:  { name: "Forêt",   base: "#3f6b3a", hi: "rgba(110,160,90,.5)",  lo: "rgba(20,45,20,.55)", border: "#1f3d1c", hole1: "#1c3319", hole2: "#0d1c0c", rim: "rgba(170,220,140,.3)" },
    night:   { name: "Nuit",    base: "#26303f", hi: "rgba(80,100,130,.5)",  lo: "rgba(10,14,22,.6)",  border: "#0f141c", hole1: "#0e1218", hole2: "#06080c", rim: "rgba(150,180,220,.25)" }
  };

  let themedCtx = null;
  function applyTheme(ctx) {
    const profile = profiles[ctx] || profiles.ai;
    const p = PAWNS[profile.pawns] || PAWNS.ebony;
    const b = BOARDS[profile.board] || BOARDS.earth;
    const s = document.body.style;
    s.setProperty("--pb1", p.b[0]); s.setProperty("--pb2", p.b[1]); s.setProperty("--pb3", p.b[2]);
    s.setProperty("--pw1", p.w[0]); s.setProperty("--pw2", p.w[1]); s.setProperty("--pw3", p.w[2]);
    s.setProperty("--ringb", p.ringB); s.setProperty("--ringw", p.ringW);
    s.setProperty("--edgeb", p.edgeB); s.setProperty("--edgew", p.edgeW);
    s.setProperty("--bd1", b.base); s.setProperty("--bd2", b.hi); s.setProperty("--bd3", b.lo);
    s.setProperty("--bdborder", b.border);
    s.setProperty("--hole1", b.hole1); s.setProperty("--hole2", b.hole2); s.setProperty("--holerim", b.rim);
    themedCtx = ctx;
  }

  /* =====================================================
     Cauris (monnaie du jeu)
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
  // Cauris achetés : gardés par le serveur (voir wallet.js)
  const walletPurchased = () => (window.xidataWallet ? Number(window.xidataWallet.purchased()) || 0 : 0);
  const totalCoins = () => coins + walletPurchased();
  function refreshCoins() {
    $$(".coin-value").forEach(el => { el.textContent = String(totalCoins()); });
    const bought = $("#shopPurchased");
    if (bought) {
      const n = walletPurchased();
      bought.hidden = n <= 0;
      bought.textContent = "dont " + n + " cauris achetés";
    }
  }

  // Paie avec les cauris gagnés d'abord (immédiat), sinon avec les cauris achetés (via le serveur)
  function charge(cost, onPaid) {
    if (coins >= cost) {
      setCoins(coins - cost);
      onPaid();
      return;
    }
    const wallet = window.xidataWallet;
    if (wallet && wallet.purchased() >= cost) {
      wallet.spend(cost)
        .then(ok => { if (ok) onPaid(); else toast("Paiement refusé : réessaie."); })
        .catch(() => toast("Connexion impossible : réessaie."));
      return;
    }
    toast("Pas assez de cauris {c}");
  }

  /* =====================================================
     Message temporaire ("{c}" est remplacé par un cauri dessiné)
     ===================================================== */
  let toastTimer = null;
  function makeCowrie() {
    const shell = document.createElement("span");
    shell.className = "cowrie";
    shell.setAttribute("aria-hidden", "true");
    return shell;
  }
  function toast(text) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = "";
    const parts = text.split("{c}");
    parts.forEach((part, i) => {
      if (part) el.appendChild(document.createTextNode(part));
      if (i < parts.length - 1) el.appendChild(makeCowrie());
    });
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  /* =====================================================
     Boutique de cauris
     ===================================================== */
  // Les achats en argent réel passent par le serveur (functions/) : voir wallet.js
  const PACKS = [
    { id: "small",  name: "Poignée de cauris", amount: 100,  price: "0,99 €", shells: 1 },
    { id: "medium", name: "Sac de cauris",     amount: 550,  price: "3,99 €", shells: 2, tag: "Populaire" },
    { id: "large",  name: "Coffre de cauris",  amount: 1400, price: "8,99 €", shells: 3, tag: "Meilleure offre" }
  ];
  function buyPack(pack) {
    const wallet = window.xidataWallet;
    if (wallet && wallet.isNative()) {
      // Dans l'application Android, Google impose son propre système d'achat (Google Play)
      toast("🛒 Les achats dans l'application Android arrivent bientôt (Google Play).");
      return false;
    }
    if (!wallet || !wallet.enabled) {
      toast("🛒 Les achats ne sont pas encore ouverts. Reviens bientôt !");
      return false;
    }
    toast("Ouverture du paiement…");
    wallet.buy(pack.id).catch(error => {
      if (error && error.code === "needs-login") toast("Connecte-toi avec Google pour acheter (bouton plus bas).");
      else toast("Paiement impossible pour le moment : réessaie.");
    });
    return true;
  }

  function renderShop() {
    const box = $("#shopPacks");
    if (!box) return;
    box.innerHTML = "";
    PACKS.forEach(pack => {
      const row = document.createElement("div");
      row.className = "shop-pack";

      const icons = document.createElement("span");
      icons.className = "pack-icons";
      for (let i = 0; i < pack.shells; i++) icons.appendChild(makeCowrie());

      const info = document.createElement("span");
      const name = document.createElement("span");
      name.className = "pack-name";
      name.textContent = pack.name;
      if (pack.tag) {
        const tag = document.createElement("span");
        tag.className = "pack-tag";
        tag.textContent = pack.tag;
        name.appendChild(tag);
      }
      const amount = document.createElement("span");
      amount.className = "pack-amount";
      amount.textContent = pack.amount + " cauris";
      info.appendChild(name);
      info.appendChild(amount);

      const buy = document.createElement("button");
      buy.type = "button";
      buy.className = "buy";
      buy.textContent = "Acheter · " + pack.price;
      buy.addEventListener("click", () => buyPack(pack));

      row.appendChild(icons);
      row.appendChild(info);
      row.appendChild(buy);
      box.appendChild(row);
    });
  }

  function bindShop() {
    const sheet = $("#shopSheet");
    if (!sheet) return;
    $$("[data-open-shop]").forEach(btn =>
      btn.addEventListener("click", () => { renderShop(); refreshCoins(); sheet.hidden = false; })
    );
    $("#shopClose").addEventListener("click", () => { sheet.hidden = true; });
    sheet.addEventListener("click", event => { if (event.target === sheet) sheet.hidden = true; });
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
      typeof showEnd === "function" &&
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
    counts: () => ({
      black: board.filter(p => p === BLACK).length,
      white: board.filter(p => p === WHITE).length
    }),
    canDraw: () => !gameOver && !pendingSanction,
    declareDraw: () => {
      gameOver = true;
      selected = null;
      setStatus("Match nul : il reste un pion de chaque côté.");
      render();
      if (typeof saveOnlineState === "function") saveOnlineState();
      showEnd("Match nul", "Il reste un pion contre un pion : la partie est déclarée nulle.");
    },
    // Identifiant du refus de capture en cours ("" s'il n'y en a pas)
    sanctionSig: () => {
      if (pendingSanction) return "p:" + pendingSanction.offender + ":" + pendingSanction.candidates.join(",");
      const text = statusText.textContent || "";
      return /^Capture refusée/.test(text) ? "s:" + text : "";
    },
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
      return !!(a && a.suggest && a.isAi && a.isBusy && a.declareDraw);
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
    counts() {
      const s = this.api().get();
      return {
        black: s.board.filter(x => x === BLACK).length,
        white: s.board.filter(x => x === WHITE).length
      };
    },
    canDraw() {
      const s = this.api().get();
      return !s.gameOver && s.phase === "play" && s.chain === null && s.bonusPending === 0;
    },
    declareDraw() { this.api().declareDraw(); },
    sanctionSig: () => "",
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
    return Number(profiles[ctx].timer) || 0;
  }

  // Est-ce à CET appareil de jouer maintenant ?
  function humanActs(ctx, actor) {
    if (ctx === "local") return true;
    if (ctx === "ai") return actor === WHITE;
    return actor === myOnlineColor();
  }

  const isDrawEnd = A => {
    if (!A.isOver()) return false;
    const c = A.counts();
    return c.black === 1 && c.white === 1;
  };

  /* =====================================================
     Règles optionnelles (⚙️ Réglages) : pas de retour arrière
     La règle est fixée au début de chaque partie.
     En ligne, c'est la règle de celui qui crée la partie.
     ===================================================== */
  window.xidataRules = { noBack: "off" };

  function ruleFor(ctx) {
    if (ctx === "online" && window.currentRoomRules) return window.currentRoomRules.noBack || "off";
    return (profiles[ctx] && profiles[ctx].rules.noBack) || "off";
  }

  // Mode 1 : on enveloppe les fonctions qui produisent les coups dans game.js
  let classicRulesInstalled = false;
  function installClassicRules() {
    if (classicRulesInstalled) return;
    if (typeof getMoves !== "function" || typeof captureMovesOnBoard !== "function" ||
        typeof getAiMovesOnBoard !== "function") return;
    classicRulesInstalled = true;

    const rule = () => window.xidataRules.noBack || "off";
    // Les Blancs avancent vers le haut du plateau, les Noirs vers le bas
    const backward = (player, from, to) => {
      const dr = rowOf(to) - rowOf(from);
      return player === WHITE ? dr > 0 : dr < 0;
    };

    const originalGetMoves = window.getMoves;
    window.getMoves = function (index) {
      const moves = originalGetMoves(index);
      const mode = rule();
      if (mode === "off" || kings.has(index)) return moves;
      const player = board[index];
      return moves.filter(m => !((m.capture === null || mode === "all") && backward(player, m.from, m.to)));
    };

    const originalCapture = window.captureMovesOnBoard;
    window.captureMovesOnBoard = function (state, kingSet, index, player) {
      const moves = originalCapture(state, kingSet, index, player);
      if (rule() !== "all" || kingSet.has(index)) return moves;
      return moves.filter(m => !backward(player, m.from, m.to));
    };

    // Coups utilisés par l'ordinateur pour réfléchir (même logique, avec la règle)
    window.getAiMovesOnBoard = function (state, kingSet, player) {
      const mode = rule();
      const moves = [];
      state.forEach((piece, index) => {
        if (piece !== player) return;
        const king = kingSet.has(index);
        for (const [dr, dc] of directions(index)) {
          let r = rowOf(index) + dr;
          let c = colOf(index) + dc;
          while (inside(r, c) && state[r * SIZE + c] === EMPTY) {
            const to = r * SIZE + c;
            if (!(mode !== "off" && !king && backward(player, index, to))) {
              moves.push({ from: index, to, capture: null, captures: [] });
            }
            if (!king) break;
            r += dr;
            c += dc;
          }
        }
        for (const m of window.captureMovesOnBoard(state, kingSet, index, player)) {
          moves.push({ from: index, to: m.to, capture: m.capture, captures: [m.capture] });
        }
      });
      const capturesOnly = moves.filter(m => m.capture !== null);
      return capturesOnly.length ? capturesOnly : moves;
    };
  }

  let appliedRuleKey = "";
  let ruleToastShown = false;
  function applyRules(A, ctx) {
    if (A.mode === "classic") installClassicRules();
    if (!A.fresh()) { ruleToastShown = false; return; } // on ne change pas les règles en cours de partie
    const mode = ruleFor(ctx);
    const key = A.mode + "|" + ctx + "|" + mode;
    if (key !== appliedRuleKey) {
      appliedRuleKey = key;
      window.xidataRules = { noBack: mode };
      if (A.mode === "custom") A.api().setRules({ noBack: mode });
    }
    if (mode !== "off" && !ruleToastShown) {
      ruleToastShown = true;
      toast("📏 Règle : les pions ne peuvent pas reculer");
    }
  }

  /* =====================================================
     Annonces stylées sur le plateau
     ===================================================== */
  let announceTimer = null;
  let announceOutTimer = null;

  function announce(info, duration) {
    let box = $("#boardAnnounce");
    if (!box) {
      box = document.createElement("div");
      box.id = "boardAnnounce";
      box.setAttribute("aria-live", "assertive");
      box.innerHTML =
        '<div class="ann-card"><span class="ann-sticker" aria-hidden="true"></span>' +
        '<span class="ann-text"></span><span class="ann-sub"></span></div>';
      document.body.appendChild(box);
    }
    const card = box.querySelector(".ann-card");
    box.querySelector(".ann-sticker").textContent = info.sticker || "";
    box.querySelector(".ann-text").textContent = info.text;
    box.querySelector(".ann-sub").textContent = info.sub || "";
    box.className = "tone-" + (info.tone || "win");

    // Placé au centre du plateau visible
    const A = currentAdapter();
    const el = A.ready() ? A.boardEl() : null;
    if (el && typeof el.getBoundingClientRect === "function") {
      const r = el.getBoundingClientRect();
      if (r.width > 0) {
        box.style.left = r.left + r.width / 2 + "px";
        box.style.top = r.top + r.height / 2 + "px";
        box.style.width = r.width + "px";
      }
    }

    box.hidden = false;
    card.classList.remove("out");
    card.classList.remove("pop");
    if (typeof card.offsetWidth !== "undefined") void card.offsetWidth; // relance l'animation
    card.classList.add("pop");

    clearTimeout(announceTimer);
    clearTimeout(announceOutTimer);
    announceTimer = setTimeout(() => {
      card.classList.remove("pop");
      card.classList.add("out");
      announceOutTimer = setTimeout(() => { box.hidden = true; }, 420);
    }, duration || 2600);
  }

  function announceEnd(A, ctx) {
    if (isDrawEnd(A)) {
      announce({ text: "MATCH NUL", sub: "Un pion contre un pion", sticker: "🤝", tone: "draw" }, 3400);
      return;
    }
    const winner = A.winner();
    const mine = ctx === "ai" ? WHITE : (ctx === "online" ? myOnlineColor() : null);
    if (mine === null) {
      announce({ text: "VICTOIRE !", sub: (winner === WHITE ? "Les Blancs" : "Les Noirs") + " gagnent", sticker: "🏆", tone: "win" }, 3400);
    } else if (winner === mine) {
      announce({ text: "VICTOIRE !", sub: "Bravo, tu as gagné", sticker: "🏆", tone: "win" }, 3400);
    } else {
      announce({ text: "DÉFAITE", sub: "À toi la revanche !", sticker: "😔", tone: "lose" }, 3400);
    }
  }

  // Refus de capture : "Soufflé !"
  let lastSanctionSig = "";
  let lastSanctionAt = 0;
  function checkSanction(A) {
    const sig = A.sanctionSig();
    if (sig && sig !== lastSanctionSig && Date.now() - lastSanctionAt > 1500) {
      lastSanctionAt = Date.now();
      announce({ text: "SOUFFLÉ !", sub: "Capture refusée : un pion est retiré", sticker: "💨", tone: "souffle" }, 2600);
    }
    lastSanctionSig = sig;
  }

  /* =====================================================
     Match nul : un pion contre un pion
     ===================================================== */
  function checkDraw(A, ctx) {
    if (A.isOver() || !A.canDraw()) return;
    const c = A.counts();
    if (c.black !== 1 || c.white !== 1) return;
    if (ctx === "online" && window.currentRoomRole !== "host") return; // l'hôte déclare, l'invité reçoit
    A.declareDraw();
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
    hintBtn.classList.toggle("poor", totalCoins() < COST.hint);
    undoBtn.classList.toggle("poor", totalCoins() < COST.undo);
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
     Fin de partie : annonce et récompense
     ===================================================== */
  const wasOver = { classic: false, custom: false };

  function checkGameOver(A, ctx) {
    const over = A.isOver();
    if (over && !wasOver[A.mode]) {
      announceEnd(A, ctx);
      if (ctx === "ai" && !isDrawEnd(A) && A.winner() === WHITE) {
        const amount = REWARD[A.level()] || REWARD.medium;
        addCoins(amount);
        toast("🎉 Victoire ! +" + amount + " {c}");
      }
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
    if (ctx !== themedCtx) applyTheme(ctx); // chaque type de partie a ses couleurs
    applyRules(A, ctx); // règles optionnelles du type de partie
    if (A.fresh()) stacks[A.mode].length = 0; // nouvelle partie : plus rien à annuler

    checkDraw(A, ctx);
    if (hint && hint.key !== A.turnKey()) hint = null;
    applyHint(A);
    checkSanction(A);
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
    const sug = A.suggest(WHITE);
    if (!sug) { toast("Aucun indice disponible."); return; }
    const key = A.turnKey();
    charge(COST.hint, () => {
      hint = { key, from: sug.from, to: sug.to };
      applyHint(A);
      toast("💡 Regarde les cases entourées en bleu");
    });
  }

  function onUndo() {
    const A = currentAdapter();
    if (!A.ready() || !canAct(A) || !A.stable()) return;
    const index = undoTarget(A);
    if (index < 0) { toast("Rien à annuler."); return; }
    const snap = stacks[A.mode][index].snap;
    charge(COST.undo, () => {
      stacks[A.mode].length = index;
      hint = null;
      A.restore(snap);
      toast("↩ Coup annulé");
    });
  }

  /* =====================================================
     Fenêtre Réglages : un onglet par type de partie
     ===================================================== */
  const radial = c => "radial-gradient(circle at 35% 30%," + c[0] + "," + c[1] + " 55%," + c[2] + ")";

  function buildChoices() {
    const pawnBox = $("#pawnChoices");
    const boardBox = $("#boardChoices");
    if (!pawnBox || !boardBox) return;
    const tab = settings.tab;
    const profile = profiles[tab];
    pawnBox.innerHTML = "";
    boardBox.innerHTML = "";

    Object.keys(PAWNS).forEach(id => {
      const p = PAWNS[id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice" + (profile.pawns === id ? " active" : "");
      btn.innerHTML =
        '<span class="swatch-pawns"><i style="background:' + radial(p.b) + '"></i>' +
        '<i style="background:' + radial(p.w) + '"></i></span><span class="choice-name"></span>';
      btn.querySelector(".choice-name").textContent = p.name;
      btn.addEventListener("click", () => {
        profile.pawns = id;
        saveSettings();
        if (themedCtx === tab) applyTheme(tab);
        buildChoices();
      });
      pawnBox.appendChild(btn);
    });

    Object.keys(BOARDS).forEach(id => {
      const b = BOARDS[id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice" + (profile.board === id ? " active" : "");
      btn.innerHTML =
        '<span class="swatch-board" style="border-color:' + b.border + ';background:' +
        "radial-gradient(circle at 28% 50%," + b.hole1 + " 0 5px,transparent 6px)," +
        "radial-gradient(circle at 72% 50%," + b.hole1 + " 0 5px,transparent 6px)," + b.base +
        '"></span><span class="choice-name"></span>';
      btn.querySelector(".choice-name").textContent = b.name;
      btn.addEventListener("click", () => {
        profile.board = id;
        saveSettings();
        if (themedCtx === tab) applyTheme(tab);
        buildChoices();
      });
      boardBox.appendChild(btn);
    });
  }

  function renderSettings() {
    $$("#settingsTabs [data-tab]").forEach(btn => {
      const on = btn.dataset.tab === settings.tab;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    buildChoices();
    const select = $("#timerSelect");
    if (select) select.value = String(profiles[settings.tab].timer || 0);
    const ruleSelect = $("#ruleSelect");
    if (ruleSelect) ruleSelect.value = profiles[settings.tab].rules.noBack || "off";
    const note = $("#settingsNote");
    if (note) note.hidden = settings.tab !== "online";
  }

  function bindSheet() {
    const sheet = $("#settingsSheet");
    if (!sheet) return;

    const select = $("#timerSelect");
    if (select) {
      select.innerHTML = "";
      TIMER_OPTIONS.forEach(([seconds, label]) => {
        const option = document.createElement("option");
        option.value = String(seconds);
        option.textContent = label;
        select.appendChild(option);
      });
      select.addEventListener("change", () => {
        profiles[settings.tab].timer = Number(select.value) || 0;
        saveSettings();
      });
    }

    const ruleSelect = $("#ruleSelect");
    if (ruleSelect) {
      ruleSelect.innerHTML = "";
      RULE_OPTIONS.forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        ruleSelect.appendChild(option);
      });
      ruleSelect.addEventListener("change", () => {
        profiles[settings.tab].rules.noBack = ruleSelect.value;
        saveSettings();
      });
    }

    $$("#settingsTabs [data-tab]").forEach(btn =>
      btn.addEventListener("click", () => { settings.tab = btn.dataset.tab; renderSettings(); })
    );

    $$("[data-open-settings]").forEach(btn =>
      btn.addEventListener("click", () => {
        // En cours de partie, on ouvre l'onglet du type de partie en cours
        const A = currentAdapter();
        if (document.body.dataset.view === "game" && A.ready()) settings.tab = contextOf(A);
        renderSettings();
        sheet.hidden = false;
      })
    );
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
    toast("🎁 Bonus du jour : +" + DAILY_BONUS + " {c}");
  }

  /* =====================================================
     Démarrage
     ===================================================== */
  applyTheme("ai");
  bindSheet();
  bindShop();
  renderSettings();
  refreshCoins();

  const hintBtn = $("#hintBtn");
  const undoBtn = $("#undoBtn");
  if (hintBtn) hintBtn.addEventListener("click", onHint);
  if (undoBtn) undoBtn.addEventListener("click", onUndo);

  dailyBonus();
  if (window.xidataPurchaseReturn === "ok") toast("✅ Paiement reçu ! Tes cauris arrivent dans quelques secondes {c}");
  else if (window.xidataPurchaseReturn === "annule") toast("Achat annulé : rien n'a été débité.");
  setInterval(tick, 250);

  // Utilisé par online.js (temps de réflexion de la salle) et pour les tests
  window.xidataSettings = {
    getTurnLimit: ctx => Number(profiles[ctx] && profiles[ctx].timer) || 0,
    getRules: ctx => ({ noBack: (profiles[ctx] && profiles[ctx].rules.noBack) || "off" })
  };
  window.xidataExtras = {
    tick, coins: () => coins, total: totalCoins, setCoins, settings, profiles, stacks, announce, buyPack, toast,
    adapters: { classic, custom }
  };
})();
