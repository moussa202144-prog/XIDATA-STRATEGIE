// XIDATA STRATÉGIE - Mode 2 en ligne (synchronisation Firebase)
// Chargé automatiquement par mode2.js (voir le bloc de mode2-hook.js).
(() => {
  const B = "black";
  const W = "white";
  const api = () => window.__mode2;
  const $ = s => document.querySelector(s);
  const nameOf = p => (p === B ? "Noirs" : "Blancs");

  let ref = null;
  let applying = false;
  let synced = false; // l'invité n'écrit qu'après avoir reçu le plateau de l'hôte
  let lastJson = "";

  // Hôte = Blancs, invité = Noirs (comme au Mode 1)
  const myColor = () => (window.currentRoomRole === "host" ? W : B);

  // Représentation unique de l'état (même ordre, mêmes valeurs par défaut)
  function pack(s) {
    return {
      board: Array.from({ length: 25 }, (_, i) => s.board?.[i] ?? null),
      phase: s.phase ?? "placement",
      placing: s.placing ?? null,
      turn: s.turn ?? null,
      chain: s.chain ?? null,
      gameOver: !!s.gameOver,
      captures: {
        black: s.captures?.black ?? 0,
        white: s.captures?.white ?? 0
      },
      lastMove: s.lastMove ?? null,
      openingMovePending: !!s.openingMovePending,
      chainCaptureCount: s.chainCaptureCount ?? 0,
      bonusPending: s.bonusPending ?? 0,
      bonusPlayer: s.bonusPlayer ?? null,
      bonusOpponent: s.bonusOpponent ?? null,
      previousWinner: s.previousWinner ?? null,
      bonusTimerDuration: s.bonusTimerDuration ?? 0
    };
  }

  // Joueur qui doit agir maintenant
  function actorOf(s) {
    if (s.bonusPending > 0) return s.bonusPlayer;
    return s.phase === "placement" ? s.placing : s.turn;
  }

  function setOnlineStatus(text) {
    const el = $("#onlineStatus");
    if (el) el.textContent = text;
  }

  function bannerText(s) {
    const me = myColor();
    const color = nameOf(me).toLowerCase();
    if (s.gameOver) return "Partie terminée.";
    if (actorOf(s) !== me) return `Au tour de l'adversaire… (tu joues les ${color})`;
    if (s.bonusPending > 0) return `Retire un pion adverse bonus ! (tu joues les ${color})`;
    if (s.phase === "placement") return `À toi de placer un pion ! (tu joues les ${color})`;
    return `À toi de jouer ! (tu joues les ${color})`;
  }

  // Envoie l'état local à Firebase (seulement s'il a changé)
  function save() {
    if (!ref || applying || !api()) return;
    if (window.currentRoomRole !== "host" && !synced) return;

    const cur = pack(api().get());
    const json = JSON.stringify(cur);
    if (json === lastJson) return;
    lastJson = json;

    ref.set(cur).catch(error => {
      console.error("Synchronisation impossible :", error);
      setOnlineStatus("Erreur de synchronisation : " + error.message);
    });
  }

  // Met à jour l'écran après un coup de l'adversaire
  function afterApply(s) {
    const me = myColor();

    const bonusPanel = $("#bonusPanel");
    if (bonusPanel) {
      const mineToRemove = s.bonusPending > 0 && s.bonusPlayer === me && !s.gameOver;
      bonusPanel.classList.toggle("hidden", !mineToRemove);
    }

    const text = bannerText(s);
    setOnlineStatus(text);
    const status = $("#customStatus");
    if (status) status.textContent = text;

    const modal = $("#customEndModal");
    if (modal) {
      if (s.gameOver) {
        if (modal.classList.contains("hidden")) {
          $("#customEndTitle").textContent = `${nameOf(s.turn)} gagnent !`;
          $("#customEndMessage").textContent = "Partie terminée.";
          modal.classList.remove("hidden");
        }
      } else {
        modal.classList.add("hidden");
      }
    }
  }

  // Empêche de jouer quand ce n'est pas son tour
  function installGuard() {
    const boardEl = $("#customBoard");
    if (!boardEl || boardEl.__xidataGuard) return;
    boardEl.__xidataGuard = true;

    boardEl.addEventListener(
      "click",
      event => {
        if (!ref) return;
        const s = api().get();
        const ready = synced || window.currentRoomRole === "host";
        if (!ready || s.gameOver || actorOf(s) !== myColor()) {
          event.stopPropagation();
          event.preventDefault();
        }
      },
      true
    );
  }

  // Chaque affichage du plateau peut annoncer un nouvel état à envoyer
  function installObserver() {
    const boardEl = $("#customBoard");
    if (!boardEl || boardEl.__xidataObserver) return;
    boardEl.__xidataObserver = true;
    new MutationObserver(() => save()).observe(boardEl, { childList: true });
  }

  window.startOnlineGameCustom = function () {
    if (!window.currentRoomCode || !api()) return;

    api().stopAI(); // pas d'ordinateur en ligne
    installGuard();
    installObserver();

    if (ref) ref.off("value");
    synced = false;
    lastJson = "";
    let initialized = false;

    ref = window.firebaseDb.ref("rooms/" + window.currentRoomCode + "/gameState");

    ref.on("value", snapshot => {
      const raw = snapshot.val();

      // Pas encore de plateau dans Firebase
      if (!raw) {
        if (window.currentRoomRole === "host") {
          if (!initialized) {
            initialized = true;
            api().reset(); // plateau neuf : il est envoyé à l'invité
          }
        } else {
          setOnlineStatus("Connecté. En attente du plateau de l'hôte…");
        }
        return;
      }

      synced = true;
      const remote = pack(raw);
      const remoteJson = JSON.stringify(remote);
      const localJson = JSON.stringify(pack(api().get()));

      // Notre propre écriture qui revient : rien à changer
      if (remoteJson === localJson) {
        lastJson = remoteJson;
        setOnlineStatus(bannerText(remote));
        return;
      }

      applying = true;
      try {
        api().set(remote);
        lastJson = remoteJson;
        api().render();
      } finally {
        applying = false;
      }
      afterApply(remote);
    });
  };
})();
