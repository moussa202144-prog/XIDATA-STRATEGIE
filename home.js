// XIDATA STRATÉGIE - Accueil et navigation entre les écrans
// Trois écrans : "home" (accueil), "online" (jeu en ligne), "game" (plateau).
// Le script pilote les commandes déjà existantes (mode, ordinateur, recommencer).
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const MODE_NAMES = { classic: "Mode 1 · Classique", custom: "Mode 2 · Personnalisé" };

  let mode = "classic";

  function waitFor(condition, timeoutMs) {
    return new Promise(resolve => {
      const t0 = Date.now();
      (function check() {
        if (condition()) return resolve(true);
        if (Date.now() - t0 > timeoutMs) return resolve(false);
        setTimeout(check, 100);
      })();
    });
  }

  // ---------- Écrans ----------
  function setView(view) {
    document.body.dataset.view = view;
    window.scrollTo(0, 0);
    syncBanner();
    refreshSoundIcon();
  }

  // ---------- Mode de jeu ----------
  function setMode(next) {
    mode = next === "custom" ? "custom" : "classic";

    $$("[data-mode]").forEach(btn => {
      const on = btn.dataset.mode === mode;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
    });

    const select = $("#gameMode");
    if (select.value !== mode) {
      select.value = mode;
      select.dispatchEvent(new Event("change")); // charge le bon mode (game.js ou mode2.js)
    }

    const title = $("#gameTitle");
    if (title) title.textContent = MODE_NAMES[mode];
  }

  // Attend que le code du mode choisi soit chargé
  function prepareMode() {
    setMode(mode);
    return waitFor(
      () => (mode === "custom" ? !!window.__mode2 : typeof window.newGame === "function"),
      6000
    );
  }

  // ---------- Adversaire (ordinateur ou deuxième joueur) ----------
  function applyOpponent(ai, level) {
    if (mode === "classic") {
      const toggle = $("#aiMode");
      const difficulty = $("#classicDifficulty");

      if (ai && level && difficulty.value !== level) {
        difficulty.value = level;
        difficulty.dispatchEvent(new Event("change"));
      }
      if (toggle.checked !== ai) {
        toggle.checked = ai;
        toggle.dispatchEvent(new Event("change")); // lance une nouvelle partie
      } else {
        $("#restartBtn").click(); // même réglage : on repart d'un plateau neuf
      }
    } else {
      const opponent = $("#customOpponent");
      const difficulty = $("#customDifficulty");

      if (ai && level) difficulty.value = level;
      opponent.value = ai ? "ai" : "human";
      opponent.dispatchEvent(new Event("change")); // réinitialise la partie
    }
  }

  async function startGame(ai, level) {
    setView("game");
    const ready = await prepareMode();
    if (!ready) return;
    applyOpponent(ai, level);
  }

  // ---------- Bandeau "à qui le tour" pendant une partie en ligne ----------
  function syncBanner() {
    const banner = $("#gameBanner");
    const status = $("#onlineStatus");
    if (!banner || !status) return;
    const online = !!window.onlineGameStarted;
    banner.hidden = !online;
    if (online) banner.textContent = status.textContent;
  }

  // ---------- Retours ----------
  async function leaveOnlineScreen() {
    // Recherche automatique en cours : on l'annule proprement
    if (typeof searching !== "undefined" && searching) {
      await cancelSearch();
      setView("home");
      return;
    }
    // Salon créé avec un code et en attente : on repart de zéro
    if (window.currentRoomCode && !window.onlineGameStarted) {
      location.href = location.pathname;
      return;
    }
    setView("home");
  }

  function goBackFromGame() {
    if (window.onlineGameStarted) {
      leaveOnlineGame(); // demande confirmation, prévient l'adversaire et recharge
      return;
    }
    setView("home");
  }

  // ---------- Son et invitation ----------
  function soundButton() { return $(".sound-toggle"); }
  function refreshSoundIcon() {
    const icon = $("#homeSoundIcon");
    const btn = soundButton();
    if (icon && btn && btn.textContent.trim()) icon.textContent = btn.textContent.trim();
  }

  async function shareGame() {
    const url = location.origin + location.pathname;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "XIDATA XOORE",
          text: "Viens jouer à XIDATA XOORE !",
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Lien copié !");
      }
    } catch (error) {
      // partage annulé : rien à faire
    }
  }

  // ---------- Branchements ----------
  $$("[data-mode]").forEach(btn => btn.addEventListener("click", () => setMode(btn.dataset.mode)));

  $("#homeOnlineBtn").addEventListener("click", () => { setMode(mode); setView("online"); });
  $("#homeLocalBtn").addEventListener("click", () => startGame(false));
  $("#homeAiBtn").addEventListener("click", () => { $("#aiSheet").hidden = false; });

  $$("[data-level]").forEach(btn =>
    btn.addEventListener("click", () => {
      $("#aiSheet").hidden = true;
      startGame(true, btn.dataset.level);
    })
  );
  $("#aiSheetCancel").addEventListener("click", () => { $("#aiSheet").hidden = true; });

  $("#onlineBackBtn").addEventListener("click", leaveOnlineScreen);
  $("#gameBackBtn").addEventListener("click", goBackFromGame);

  $("#homeSoundBtn").addEventListener("click", () => {
    const btn = soundButton();
    if (btn) btn.click();
    refreshSoundIcon();
  });
  $("#homeShareBtn").addEventListener("click", shareGame);

  // Un adversaire est trouvé : on passe directement au plateau
  window.addEventListener("xidata-online-started", () => {
    setMode(window.currentRoomMode || mode);
    setView("game");
  });

  // Le bandeau recopie les messages du jeu en ligne ("À toi de jouer !", etc.)
  const status = $("#onlineStatus");
  if (status && typeof MutationObserver === "function") {
    new MutationObserver(syncBanner).observe(status, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }
  setInterval(syncBanner, 700);

  // ---------- Démarrage ----------
  setMode("classic");
  // Lien d'invitation (?room=CODE) : on ouvre directement l'écran "Jeu en ligne"
  if (new URLSearchParams(location.search).get("room")) setView("online");
  else setView("home");
})();
