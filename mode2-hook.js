// ===================================================================
// MODE 2 EN LIGNE - bloc à ajouter dans mode2.js
//
// Dans mode2.js, tout à la fin du fichier, tu as ces deux lignes :
//
//     reset();
//   })();
//
// Colle TOUT ce qui suit (à partir de "---- Jeu en ligne") entre les deux :
// c'est-à-dire APRÈS la ligne  reset();  et AVANT la ligne  })();
// ===================================================================

  // ---- Jeu en ligne : accès à l'état du jeu pour mode2-online.js ----
  window.__mode2 = {
    get: () => ({
      board, phase, placing, turn, chain, gameOver, captures, lastMove,
      openingMovePending, chainCaptureCount, bonusPending, bonusPlayer,
      bonusOpponent, previousWinner, bonusTimerDuration
    }),
    set: s => {
      board = s.board.slice();
      phase = s.phase;
      placing = s.placing;
      turn = s.turn;
      chain = s.chain;
      gameOver = s.gameOver;
      captures = { [B]: s.captures.black, [W]: s.captures.white };
      lastMove = s.lastMove;
      openingMovePending = s.openingMovePending;
      chainCaptureCount = s.chainCaptureCount;
      bonusPending = s.bonusPending;
      bonusPlayer = s.bonusPlayer;
      bonusOpponent = s.bonusOpponent;
      previousWinner = s.previousWinner;
      bonusTimerDuration = s.bonusTimerDuration;
      selected = null;
      aiBusy = false;
      const timerSelect = $('#bonusTimerMode');
      if (timerSelect) timerSelect.value = String(bonusTimerDuration);
      if (phase === 'play') lockBonusTimerSettings();
    },
    render: () => render(),
    reset: () => reset(),
    stopAI: () => {
      aiMode = false;
      aiBusy = false;
      const opp = $('#customOpponent');
      if (opp) opp.value = 'human';
      $('#customDifficultyWrap')?.classList.add('hidden');
      $('#customDifficulty')?.classList.add('hidden');
    }
  };

  // Charge la synchronisation en ligne du Mode 2 (une seule fois)
  if (!window.__mode2OnlineLoaded) {
    window.__mode2OnlineLoaded = true;
    const loader = document.createElement('script');
    loader.src = 'mode2-online.js';
    document.body.appendChild(loader);
  }
