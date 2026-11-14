// ===================================================================
// SYNCHRONISATION EN LIGNE - à coller dans game.js
//
// Dans game.js :
//   1. Supprime la fonction  function saveOnlineState() { ... }
//   2. Supprime la fonction  function startOnlineGame() { ... }
//   3. Supprime la ligne      window.startOnlineGame = startOnlineGame;
//   4. Colle TOUT ce fichier à la place (au même endroit, avant function render()).
// ===================================================================

let onlineStateRef = null;

function setOnlineStatus(text) {
  const el = document.querySelector("#onlineStatus");
  if (el) el.textContent = text;
}

// Affiche à qui c'est le tour, sous "Jouer en ligne"
function updateOnlineBanner() {
  if (!window.currentRoomCode) return;
  const mine = window.currentRoomRole === "host" ? WHITE : BLACK;
  const color = playerName(mine).toLowerCase();

  if (gameOver) {
    setOnlineStatus("Partie terminée.");
  } else if (pendingSanction && currentPlayer === mine) {
    setOnlineStatus("Sanction : touche un pion encadré en jaune pour le retirer.");
  } else if (currentPlayer === mine) {
    setOnlineStatus(`À toi de jouer ! (tu joues les ${color})`);
  } else {
    setOnlineStatus(`Au tour de l'adversaire… (tu joues les ${color})`);
  }
}

function saveOnlineState() {
  if (!window.currentRoomCode || applyingOnlineState) return;

  const state = {
    board: board,
    kings: Array.from(kings),
    currentPlayer: currentPlayer,
    captures: captures,
    gameOver: gameOver,
    lastMove: lastMove,
    pendingSanction: pendingSanction,
    chainPiece: chainPiece,
    chainPlayer: chainPlayer
  };

  try {
    // Firebase refuse les valeurs "undefined" : on les supprime avant l'envoi
    const clean = JSON.parse(JSON.stringify(state));

    window.firebaseDb
      .ref("rooms/" + window.currentRoomCode + "/gameState")
      .set(clean)
      .catch(error => {
        console.error("Synchronisation impossible :", error);
        setOnlineStatus("Erreur de synchronisation : " + error.message);
      });
  } catch (error) {
    console.error("Synchronisation impossible :", error);
    setOnlineStatus("Erreur de synchronisation : " + error.message);
  }
window.saveOnlineState = saveOnlineState;
}

function startOnlineGame() {
  if (!window.currentRoomCode) return;

  // En ligne, pas d'IA
  if (aiMode) {
    aiMode = false;
    aiThinking = false;
    if (aiModeToggle) aiModeToggle.checked = false;
    document.querySelector("#classicDifficultyWrap")?.classList.add("hidden");
  }

  // Évite les écouteurs en double
  if (onlineStateRef) onlineStateRef.off("value");

  onlineStateRef = window.firebaseDb
    .ref("rooms/" + window.currentRoomCode + "/gameState");

  onlineStateRef.on("value", snapshot => {
    const state = snapshot.val();

    // Pas encore de plateau dans Firebase
    if (!state) {
      if (window.currentRoomRole === "host") {
        newGame(); // repart d'un plateau neuf et l'envoie à l'invité
      } else {
        setOnlineStatus("Connecté. En attente du plateau de l'hôte…");
      }
      return;
    }

    applyingOnlineState = true;
    try {
      board = Array.from({ length: 25 }, (_, i) => state.board?.[i] ?? EMPTY);
      kings = new Set(state.kings || []);
      currentPlayer = state.currentPlayer;
      captures = {
        black: state.captures?.black ?? 0,
        white: state.captures?.white ?? 0
      };
      gameOver = !!state.gameOver;
      lastMove = state.lastMove ?? null;
      pendingSanction = state.pendingSanction ?? null;
      chainPiece = state.chainPiece ?? null;
      chainPlayer = state.chainPlayer ?? null;
      selected = null;

      render();
    } finally {
      applyingOnlineState = false;
    }

    if (gameOver) {
      if (endModal.classList.contains("hidden")) {
        showEnd(`${playerName(currentPlayer)} gagnent !`, "Partie terminée.");
      }
    } else {
      endModal.classList.add("hidden");
    }

    updateOnlineBanner();
  });
}
window.startOnlineGame = startOnlineGame;
