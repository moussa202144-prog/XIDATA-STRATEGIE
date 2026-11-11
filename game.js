 SIZE = 5;
const EMPTY = null;
const BLACK = "black";
const WHITE = "white";
const WIN_CAPTURES = 12;

let board = [];
let kings = new Set();
let currentPlayer = WHITE;
let applyingOnlineState = false;
let captures = { black: 0, white: 0 };
let gameOver = false;
let selected = null;
let lastMove = null;
let pendingSanction = null;
let chainPiece = null;
let chainPlayer = null;
let aiMode = false;
let aiThinking = false;
let aiDifficulty = "medium";
let previousWinner = null;

const boardEl = document.querySelector("#board");
const turnLabel = document.querySelector("#turnLabel");
const turnStone = document.querySelector("#turnStone");
const statusText = document.querySelector("#statusText");
const blackCount = document.querySelector("#blackCount");
const whiteCount = document.querySelector("#whiteCount");
const blackCaptures = document.querySelector("#blackCaptures");
const whiteCaptures = document.querySelector("#whiteCaptures");
const blackMeter = document.querySelector("#blackMeter");
const whiteMeter = document.querySelector("#whiteMeter");
const sanctionBox = document.querySelector("#sanctionBox");
const sanctionChoices = document.querySelector("#sanctionChoices");
const endModal = document.querySelector("#endModal");
const endTitle = document.querySelector("#endTitle");
const endMessage = document.querySelector("#endMessage");
const aiModeToggle = document.querySelector("#aiMode");

function opponent(player) { return player === BLACK ? WHITE : BLACK; }
function playerName(player) { return player === BLACK ? "Noirs" : "Blancs"; }
function rowOf(i) { return Math.floor(i / SIZE); }
function colOf(i) { return i % SIZE; }
function inside(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }
function directions(i) {
  const r = rowOf(i), c = colOf(i), out = [];
  if (r > 0) out.push([-1, 0]);
  if (r < SIZE - 1) out.push([1, 0]);
  if (c > 0) out.push([0, -1]);
  if (c < SIZE - 1) out.push([0, 1]);
  return out;
}
function newGame() {
  aiThinking = false;
  board = Array(25).fill(EMPTY);
  for (let i = 0; i < 12; i++) board[i] = BLACK;
  for (let i = 13; i < 25; i++) board[i] = WHITE;
  kings = new Set();
  currentPlayer = previousWinner || WHITE;
  captures = { black: 0, white: 0 };
  gameOver = false; selected = null; lastMove = null;
  pendingSanction = null; chainPiece = null; chainPlayer = null;
  endModal.classList.add("hidden");
  sanctionBox.classList.add("hidden");
  setStatus(aiMode ? (currentPlayer === WHITE ? "Mode contre l’IA : vous commencez avec les Blancs." : "Le gagnant précédent conserve les Noirs : l’IA commence.") : `Le gagnant précédent commence avec les ${playerName(currentPlayer).toLowerCase()}.`);
  render();
if (window.currentRoomCode && window.currentRoomRole === "host") {
  saveOnlineState();
}
  if (aiMode && currentPlayer === BLACK) scheduleAiMove();
}
function getMoves(index) {
  const player = board[index];
  if (!player) return [];
  const moves = [];
  const king = kings.has(index);

  for (const [dr, dc] of directions(index)) {
    let r = rowOf(index) + dr;
    let c = colOf(index) + dc;
    if (!inside(r, c)) continue;

    let target = r * SIZE + c;

    // Pion simple : déplacement d'une case ou capture par saut court.
    if (!king) {
      if (board[target] === EMPTY) {
        moves.push({ from: index, to: target, capture: null });
      } else if (board[target] === opponent(player)) {
        const landingR = r + dr;
        const landingC = c + dc;
        if (inside(landingR, landingC)) {
          const landing = landingR * SIZE + landingC;
          if (board[landing] === EMPTY) moves.push({ from: index, to: landing, capture: target });
        }
      }
      continue;
    }

    // Roi : déplacement simple de toute distance sur les cases libres.
    // S'il rencontre un adversaire, il peut le sauter et atterrir sur
    // n'importe quelle case libre située derrière, dans la même direction.
    while (inside(r, c) && board[r * SIZE + c] === EMPTY) {
      moves.push({ from: index, to: r * SIZE + c, capture: null });
      r += dr;
      c += dc;
    }

    if (!inside(r, c) || board[r * SIZE + c] !== opponent(player)) continue;

    const captured = r * SIZE + c;
    r += dr;
    c += dc;
    while (inside(r, c) && board[r * SIZE + c] === EMPTY) {
      moves.push({ from: index, to: r * SIZE + c, capture: captured });
      r += dr;
      c += dc;
    }
  }
  return moves;
}
function allMoves(player) {
  const result = [];
  board.forEach((piece, index) => { if (piece === player) result.push(...getMoves(index)); });
  return result;
}
function allCaptures(player) { return allMoves(player).filter(m => m.capture !== null); }

function captureMovesOnBoard(state, kingSet, index, player) {
  const moves = [];
  const king = kingSet.has(index);
  for (const [dr, dc] of directions(index)) {
    let r = rowOf(index) + dr, c = colOf(index) + dc;
    if (!inside(r, c)) continue;
    if (!king) {
      const target = r * SIZE + c;
      if (state[target] !== opponent(player)) continue;
      const lr = r + dr, lc = c + dc;
      if (inside(lr, lc) && state[lr * SIZE + lc] === EMPTY) {
        moves.push({ from: index, to: lr * SIZE + lc, capture: target });
      }
      continue;
    }
    while (inside(r, c) && state[r * SIZE + c] === EMPTY) { r += dr; c += dc; }
    if (!inside(r, c) || state[r * SIZE + c] !== opponent(player)) continue;
    const captured = r * SIZE + c;
    r += dr; c += dc;
    while (inside(r, c) && state[r * SIZE + c] === EMPTY) {
      moves.push({ from: index, to: r * SIZE + c, capture: captured });
      r += dr; c += dc;
    }
  }
  return moves;
}
function maxCapturesFrom(state, kingSet, index, player) {
  let best = 0;
  for (const move of captureMovesOnBoard(state, kingSet, index, player)) {
    const nextBoard = state.slice();
    const nextKings = new Set(kingSet);
    nextBoard[move.to] = player;
    nextBoard[move.from] = EMPTY;
    nextBoard[move.capture] = EMPTY;
    const wasKing = nextKings.has(move.from);
    nextKings.delete(move.from);
    nextKings.delete(move.capture);
    if (wasKing || (player === WHITE && rowOf(move.to) === 0) ||
        (player === BLACK && rowOf(move.to) === SIZE - 1)) nextKings.add(move.to);
    best = Math.max(best, 1 + maxCapturesFrom(nextBoard, nextKings, move.to, player));
  }
  return best;
}
function bestCaptureMoves(player, fromIndex = null) {
  const candidates = fromIndex === null
    ? allCaptures(player)
    : captureMovesOnBoard(board, kings, fromIndex, player);
  if (!candidates.length) return [];
  const ranked = candidates.map(move => {
    const nextBoard = board.slice();
    const nextKings = new Set(kings);
    nextBoard[move.to] = player;
    nextBoard[move.from] = EMPTY;
    nextBoard[move.capture] = EMPTY;
    const wasKing = nextKings.has(move.from);
    nextKings.delete(move.from);
    nextKings.delete(move.capture);
    if (wasKing || (player === WHITE && rowOf(move.to) === 0) ||
        (player === BLACK && rowOf(move.to) === SIZE - 1)) nextKings.add(move.to);
    return { move, total: 1 + maxCapturesFrom(nextBoard, nextKings, move.to, player) };
  });
  const maximum = Math.max(...ranked.map(item => item.total));
  return ranked.filter(item => item.total === maximum).map(item => item.move);
}
function legalMovesFrom(index) {
  if (chainPiece !== null) {
    return index === chainPiece ? captureMovesOnBoard(board, kings, chainPiece, currentPlayer) : [];
  }
  // En mode classique, un déplacement normal reste possible même si une
  // capture existe : commitMove déclenche alors la sanction de capture refusée.
  return getMoves(index);
}
function legalMovesForPlayer(player) {
  // Laisser l'IA voir aussi les déplacements normaux ; elle privilégie
  // les captures, tandis qu'un refus humain déclenche la sanction.
  return allMoves(player);
}
function setStatus(message) { statusText.textContent = message; }

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

  window.firebaseDb
    .ref("rooms/" + window.currentRoomCode + "/gameState")
    .set(state);
}

function startOnlineGame() {
  if (!window.currentRoomCode) return;

  const roomRef = window.firebaseDb
    .ref("rooms/" + window.currentRoomCode + "/gameState");

  roomRef.on("value", (snapshot) => {
    const state = snapshot.val();

    if (!state) {
      if (window.currentRoomRole === "host") {
        saveOnlineState();
      }
      return;
    }

    applyingOnlineState = true;

    board = state.board;
    kings = new Set(state.kings || []);
    currentPlayer = state.currentPlayer;
    captures = state.captures;
    gameOver = state.gameOver;
    lastMove = state.lastMove;
    pendingSanction = state.pendingSanction;
    chainPiece = state.chainPiece;
    chainPlayer = state.chainPlayer;

    selected = null;

    render();

    applyingOnlineState = false;
  });
}
window.startOnlineGame = startOnlineGame;

function render() {
  boardEl.innerHTML = "";
  const destinations = selected === null ? [] : legalMovesFrom(selected);
  const destinationIds = new Set(destinations.map(m => m.to));
  const captureIds = new Set(destinations.filter(m => m.capture !== null).map(m => m.to));
  const sanctionIds = new Set(pendingSanction ? pendingSanction.candidates : []);
  board.forEach((piece, index) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `cell ${(rowOf(index) + colOf(index)) % 2 === 0 ? "light" : "dark"}`;
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", piece ? `${playerName(piece)}${kings.has(index) ? " roi" : ""}, case ${index + 1}` : `Case libre, case ${index + 1}`);
    if (selected === index) cell.classList.add("selected");
    if (sanctionIds.has(index)) cell.classList.add("sanction-candidate");
    if (destinationIds.has(index)) cell.classList.add(captureIds.has(index) ? "capture-destination" : "destination");
    if (lastMove === index) cell.classList.add("last-move");
    if (piece) {
      const stone = document.createElement("span");
      stone.className = `stone ${piece}${kings.has(index) ? " king" : ""}`;
      if (kings.has(index)) { stone.setAttribute("aria-hidden", "true"); }
      cell.appendChild(stone);
    } else {
      const dot = document.createElement("span");
      dot.setAttribute("aria-hidden", "true");
      dot.style.cssText = "width:10%;height:10%;border-radius:50%;background:rgba(30,50,30,.24)";
      cell.appendChild(dot);
    }
    cell.addEventListener("click", () => handleCell(index));
    boardEl.appendChild(cell);
  });
  blackCount.textContent = board.filter(p => p === BLACK).length;
  whiteCount.textContent = board.filter(p => p === WHITE).length;
  blackCaptures.textContent = captures[BLACK]; whiteCaptures.textContent = captures[WHITE];
  blackMeter.style.width = `${Math.min(100, captures[BLACK] / WIN_CAPTURES * 100)}%`;
  whiteMeter.style.width = `${Math.min(100, captures[WHITE] / WIN_CAPTURES * 100)}%`;
  turnLabel.textContent = gameOver ? "Partie terminée" : `Aux ${playerName(currentPlayer)} de jouer`;
  turnStone.className = `turn-stone ${currentPlayer}`;
}
function handleCell(index) {
if (window.currentRoomCode) {
  const myColor =
    window.currentRoomRole === "host" ? WHITE : BLACK;

  if (currentPlayer !== myColor || gameOver) {
    return;
  }
}
  if (gameOver || aiThinking || (aiMode && currentPlayer === BLACK)) return;
  if (pendingSanction) {
    if (pendingSanction.candidates.includes(index)) applySanction(index);
    else setStatus("Touchez sur le plateau un pion encadré en jaune pour le retirer.");
    return;
  }
  const piece = board[index];
  if (selected !== null) {
    const move = legalMovesFrom(selected).find(m => m.to === index);
    if (move) { commitMove(move); return; }
    if (piece === currentPlayer && (chainPiece === null || index === chainPiece)) {
      selected = index; setStatus("Pion sélectionné. Choisissez une destination indiquée."); render(); return;
    }
    if (chainPiece !== null) return;
    selected = null; setStatus("Déplacement annulé. Sélectionnez un de vos pions."); render(); return;
  }
  if (piece === currentPlayer && (chainPiece === null || index === chainPiece)) {
    selected = index; setStatus("Choisissez une case libre. Les cases jaunes indiquent les captures.");
  } else setStatus(`Sélectionnez un pion ${playerName(currentPlayer).toLowerCase()}.`);
  render();
}
function promoteIfNeeded(index, player) {
  if ((player === WHITE && rowOf(index) === 0) || (player === BLACK && rowOf(index) === SIZE - 1)) {
    if (!kings.has(index)) { kings.add(index); setStatus(`Promotion ! Ce pion devient un roi des ${playerName(player).toLowerCase()}.`); }
  }
}
 function commitMove(move) {
  const player = currentPlayer, enemy = opponent(player);
  const availableCaptures = chainPiece === null ? allCaptures(player) : [];
  const isCapture = move.capture !== null;
  const wasKing = kings.has(move.from);
  board[move.to] = player; board[move.from] = EMPTY;
  if (wasKing) { kings.delete(move.from); kings.add(move.to); }
  lastMove = move.to; selected = null;
  promoteIfNeeded(move.to, player);
  if (isCapture) {
    board[move.capture] = EMPTY; kings.delete(move.capture); captures[player]++;
    chainPiece = move.to; chainPlayer = player;
    if (captures[player] >= WIN_CAPTURES) { finishGame(player, `${playerName(player)} gagnent en capturant les 12 pions adverses !`); return; }
    const nextCaptures = captureMovesOnBoard(board, kings, chainPiece, player);
    if (nextCaptures.length) {
      selected = chainPiece;
      setStatus("Capture en chaîne : choisissez une destination pour poursuivre la capture.");
      render();
      if (aiMode && player === BLACK) scheduleAiMove();
      return;
    }
    endTurn(player, enemy, "Capture terminée. Tour terminé.");
    return;
  }
  if (availableCaptures.length > 0) {
    const candidateSet = new Set(availableCaptures.map(m => m.from));
    const candidates = [...candidateSet]
      .map(index => index === move.from ? move.to : index)
      .filter(index => board[index] === player);
    if (candidates.length) {
      if (aiMode) {
        // Contre l'IA : la sanction est appliquée automatiquement.
        const removedIndex = candidates[Math.floor(Math.random() * candidates.length)];
        board[removedIndex] = EMPTY;
        kings.delete(removedIndex);
        captures[enemy]++;
        if (captures[enemy] >= WIN_CAPTURES) {
          finishGame(enemy, `${playerName(enemy)} gagnent : les 12 pions adverses ont été capturés.`);
          return;
        }
        endTurn(player, enemy, "Capture refusée : un pion pouvant capturer a été retiré automatiquement.");
      } else {
        // À deux joueurs humains : l'adversaire choisit le pion à retirer.
        pendingSanction = { offender: player, beneficiary: enemy, candidates };
saveOnlineState();
        currentPlayer = enemy;
        selected = null;
        setStatus("Capture refusée : touchez sur le plateau un pion encadré en jaune pour le retirer.");
        sanctionBox.classList.add("hidden");
        render();
      }
      return;
    }
  }
  endTurn(player, enemy, "Déplacement effectué.");
}
function showSanctionChoices() {
  sanctionBox.classList.add("hidden");
}
function applySanction(index) {
  if (!pendingSanction || !pendingSanction.candidates.includes(index)) return;
  const { offender, beneficiary } = pendingSanction;
  board[index] = EMPTY; kings.delete(index); captures[beneficiary]++;
  pendingSanction = null; sanctionBox.classList.add("hidden"); sanctionChoices.innerHTML = "";
  if (captures[beneficiary] >= WIN_CAPTURES) { finishGame(beneficiary, `${playerName(beneficiary)} gagnent : les 12 pions adverses ont été capturés.`); return; }
  endTurn(offender, beneficiary, `Sanction appliquée : un pion pouvant capturer a été retiré.`);
}
function endTurn(lastPlayer, nextPlayer, message) {
  chainPiece = null; chainPlayer = null; selected = null;
  const box = document.querySelector("#chainBox"); if (box) box.classList.add("hidden");
  if (captures[lastPlayer] >= WIN_CAPTURES) { finishGame(lastPlayer, `${playerName(lastPlayer)} gagnent en capturant les 12 pions adverses !`); return; }
  if (captures[nextPlayer] >= WIN_CAPTURES) { finishGame(nextPlayer, `${playerName(nextPlayer)} gagnent en capturant les 12 pions adverses !`); return; }
  currentPlayer = nextPlayer;
saveOnlineState();
  if (allMoves(currentPlayer).length === 0) { finishGame(lastPlayer, `${playerName(lastPlayer)} gagnent : l'adversaire est bloqué.`); return; }
  setStatus(`${message} Au tour des ${playerName(nextPlayer).toLowerCase()}.`); render();
  if (aiMode && currentPlayer === BLACK && !gameOver) scheduleAiMove();
}
function finishGame(winner, message) {
  gameOver = true; previousWinner = winner; currentPlayer = winner; chainPiece = null; chainPlayer = null; selected = null;
  setStatus(message); render(); showEnd(`${playerName(winner)} gagnent !`, message);
}
function showEnd(title, message) { endTitle.textContent = title; endMessage.textContent = message; endModal.classList.remove("hidden"); }
function chooseAiMove(moves) {
  if (!moves.length) return null;
  if (aiDifficulty === "easy") return moves[Math.floor(Math.random() * moves.length)];
  // Priorité aux captures, puis à la promotion et aux déplacements qui laissent des options.
  const scored = moves.map(move => {
    let score = 0;
    if (move.capture !== null) score += aiDifficulty === "hard" ? 180 : 100;
    const becomesKing = (BLACK && rowOf(move.to) === SIZE - 1 && !kings.has(move.from));
    if (becomesKing) score += aiDifficulty === "hard" ? 55 : 25;
    const enemyNear = directions(move.to).some(([dr, dc]) => {
      const r = rowOf(move.to) + dr, c = colOf(move.to) + dc;
      return inside(r, c) && board[r * SIZE + c] === WHITE;
    });
    if (enemyNear) score -= aiDifficulty === "hard" ? 18 : 2;
    score += Math.random() * (aiDifficulty === "hard" ? 1 : 8);
    return { move, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}
function scheduleAiMove() {
  if (!aiMode || gameOver || currentPlayer !== BLACK || aiThinking || pendingSanction) return;
  aiThinking = true;
  setStatus("L’IA réfléchit…");
  window.setTimeout(() => {
    aiThinking = false;
    if (!aiMode || gameOver || currentPlayer !== BLACK) return;
    const moves = chainPiece !== null ? legalMovesFrom(chainPiece) : legalMovesForPlayer(BLACK);
    if (!moves.length) { finishGame(WHITE, "Blancs gagnent : l’IA est bloquée."); return; }
    const capturesAvailable = moves.filter(m => m.capture !== null);
    const move = chooseAiMove(capturesAvailable.length ? capturesAvailable : moves);
    if (move) commitMove(move);
  }, 650);
}
const classicDifficulty = document.querySelector("#classicDifficulty");
const classicDifficultyWrap = document.querySelector("#classicDifficultyWrap");
aiModeToggle.addEventListener("change", () => {
  aiMode = aiModeToggle.checked;
  classicDifficultyWrap.classList.toggle("hidden", !aiMode);
  newGame();
});
classicDifficulty.addEventListener("change", () => { aiDifficulty = classicDifficulty.value; newGame(); });
document.querySelector("#restartBtn").addEventListener("click", newGame);
document.querySelector("#playAgainBtn").addEventListener("click", newGame);
newGame();
