(() => {
  const N=5, B='black', W='white', E=null, center=12;
  let board, phase, placing, turn, selected, chain, gameOver, aiMode, aiBusy, captures, lastMove, difficulty, openingMovePending;
  let bonusTimerDuration = 0;
let bonusTimerInterval = null;
let bonusTimerLocked = false;
  let previousWinner = null;
  let chainCaptureCount = 0;
  let bonusPending = 0;
let bonusPlayer = null;
let bonusOpponent = null;
  const $=s=>document.querySelector(s);
  const boardEl=$('#customBoard'), status=$('#customStatus'), turnEl=$('#customTurn'), blackCount=$('#customBlackCount'), whiteCount=$('#customWhiteCount'), blackCap=$('#customBlackCap'), whiteCap=$('#customWhiteCap'), modal=$('#customEndModal'), modalTitle=$('#customEndTitle'), modalMsg=$('#customEndMessage');
  const other=p=>p===B?W:B, name=p=>p===B?'Noirs':'Blancs', row=i=>Math.floor(i/N), col=i=>i%N, inside=(r,c)=>r>=0&&r<N&&c>=0&&c<N;
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  function say(t){status.textContent=t;}
  function reset(){difficulty=$('#customDifficulty').value;
  bonusTimerLocked = false;
  $('#bonusTimerMode').disabled = false;
bonusTimerDuration = Number($('#bonusTimerMode')?.value || 0);

if (bonusTimerInterval) {
  clearInterval(bonusTimerInterval);
  bonusTimerInterval = null;
}
  board=Array(25).fill(E); phase='placement'; placing=previousWinner||W; turn=previousWinner||B; selected=null; chain=null;
  chainCaptureCount = 0;               
  bonusPending = 0;
bonusPlayer = null;
bonusOpponent = null;
  gameOver=false; aiBusy=false; captures={[B]:0,[W]:0}; lastMove=null; openingMovePending=true; modal.classList.add('hidden'); $('#bonusPanel')?.classList.add('hidden'); $('#chainPanel')?.classList.add('hidden'); say(`Placement : les ${name(placing)} posent leur premier pion. La case centrale reste vide.`); render();if(aiMode&&placing===B)scheduleAI();}
  function movesFrom(i){const p=board[i];if(p!==B&&p!==W)return [];let out=[];for(const [dr,dc] of dirs){let r=row(i)+dr,c=col(i)+dc;if(!inside(r,c))continue;let j=r*N+c;if(board[j]===E)out.push({from:i,to:j,cap:null});else if(board[j]===other(p)){let rr=r+dr,cc=c+dc;if(inside(rr,cc)&&board[rr*N+cc]===E)out.push({from:i,to:rr*N+cc,cap:j});}}return out;}
  function allMoves(p){let a=[];board.forEach((v,i)=>{if(v===p)a.push(...movesFrom(i));});return a;}
  function availableMoves(i){const moves=movesFrom(i);return openingMovePending&&phase==='play'&&board[i]===turn?moves.filter(m=>m.to===center):moves;}
  function hasCenterOpeningMove(p=turn){return allMoves(p).some(m=>m.to===center);}
  // Mode 2 : un joueur n'est pas bloqué s'il occupe l'une des quatre
  // cases autour du centre, ou s'il peut capturer en atterrissant au centre.
  const centerNeighbors=[7,11,13,17];
  function canAvoidBlock(p){
    if(centerNeighbors.some(i=>board[i]===p))return true;
    return allMoves(p).some(m=>m.to===center&&m.cap!==null);
  }
  function render(){boardEl.innerHTML='';let dest=new Map();if(selected!==null)for(const m of availableMoves(selected))dest.set(m.to,m.cap!==null);board.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.className='cell '+((row(i)+col(i))%2?'dark':'light');b.setAttribute('aria-label',p===B?'Pion noir':p===W?'Pion blanc':i===center?'Case centrale vide':'Case vide');if(i===selected)b.classList.add('selected');if(dest.has(i))b.classList.add(dest.get(i)?'capture-destination':'destination');if(i===lastMove)b.classList.add('last-move');if(p===B||p===W){let s=document.createElement('span');s.className='stone '+p;b.append(s);}else{let d=document.createElement('span');d.style.cssText='width:10%;height:10%;border-radius:50%;background:rgba(30,50,30,.24)';b.append(d);}b.onclick=()=>click(i);boardEl.append(b);});blackCount.textContent=board.filter(x=>x===B).length;whiteCount.textContent=board.filter(x=>x===W).length;blackCap.textContent=captures[B];whiteCap.textContent=captures[W];turnEl.textContent=phase==='placement'?`Placement : ${name(placing)}`:`Au tour des ${name(turn)}`;$('#customPhase').textContent=phase==='placement'?'Phase de placement':'Phase de jeu';$('#customHint').textContent=phase==='placement'?`Pions à placer — Blancs : ${12-board.filter(x=>x===W).length} · Noirs : ${12-board.filter(x=>x===B).length}`:'Sélectionnez un pion puis une destination verte. Les captures sont en jaune.';
  saveMode2();}
  
function loadMode2() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw);

    if (
      !data ||
      !Array.isArray(data.board) ||
      data.board.length !== 25 ||
      !data.board.every(p => p === B || p === W || p === E) ||
      !['placement', 'play'].includes(data.phase) ||
      ![B, W].includes(data.placing) ||
      ![B, W].includes(data.turn) ||
      !data.captures ||
      !Number.isFinite(data.captures[B]) ||
      !Number.isFinite(data.captures[W])
    ) {
      return false;
    }

    board = data.board;
    phase = data.phase;
    placing = data.placing;
    turn = data.turn;
    chain = data.chain ?? null;
    gameOver = false;
    captures = data.captures;
    lastMove = data.lastMove ?? null;
    difficulty = data.difficulty;
    openingMovePending = !!data.openingMovePending;
    chainCaptureCount = data.chainCaptureCount || 0;
    bonusPending = data.bonusPending || 0;
    bonusPlayer = data.bonusPlayer ?? null;
    bonusOpponent = data.bonusOpponent ?? null;
    bonusTimerDuration = data.
    previousWinner
    bonusTimerDuration || 0;
    previousWinner = data.previousWinner ?? null;

    selected = null;
    aiBusy = false;
    bonusTimerLocked = phase === 'play';

    $('#customDifficulty').value = difficulty;
    $('#bonusTimerMode').value = String(bonusTimerDuration);
    modal.classList.add('hidden');

    if (bonusPending > 0) {
      $('#bonusPanel')?.classList.remove('hidden');
      startBonusCountdown();
      say('Partie restaurée : il reste des pions bonus à retirer.');
    } else {
      $('#bonusPanel')?.classList.add('hidden');
      say('Partie précédente restaurée !');
    }

    render();
    return true;

  } catch (error) {
    console.warn('Restauration impossible :', error);
    return false;
  }
}

  
function click(i) {
  if (gameOver || aiBusy) return;

  // Choix des pions bonus
  if (bonusPending > 0) {
    if (board[i] !== bonusOpponent) {
      say('Touchez un pion adverse pour le retirer.');
      return;
    }

    board[i] = E;
    bonusPending--;

    if (bonusPending > 0) {
      say(`Choisissez encore ${bonusPending} pion(s) adverse(s) à retirer.`);
      render();
    } else {
      $('#bonusPanel')?.classList.add('hidden');

      if (bonusTimerInterval) {
        clearInterval(bonusTimerInterval);
        bonusTimerInterval = null;
      }

      render();

      if (board.filter(p => p === bonusOpponent).length === 0) {
        finish(
          bonusPlayer,
          `${name(bonusPlayer)} gagnent : tous les pions adverses ont été retirés.`
        );
        return;
      }

      finishTurn(
        bonusPlayer,
        bonusOpponent,
        'Captures et retraits bonus effectués.'
      );
    }
    return;
  }

  // Empêcher de jouer à la place de l'IA
  if (
    aiMode &&
    phase === 'placement' &&
    placing === B
  ) return;

  if (
    aiMode &&
    phase === 'play' &&
    turn === B
  ) return;

  // Phase de placement
  if (phase === 'placement') {
    if (board[i] !== E || i === center) return;

    const placed = placing;
    const countBefore = board.filter(x => x === placed).length;

    if (placed === turn && countBefore === 11) {
      board[i] = placed;
      const canStart = hasCenterOpeningMove(turn);
      board[i] = E;

      if (!canStart) {
        say(
          `Le dernier pion des ${name(turn)} doit permettre un déplacement ou une capture vers la case centrale.`
        );
        return;
      }
    }

    board[i] = placed;
    const count = board.filter(x => x === placed).length;

    if (
      board.filter(x => x === B).length === 12 &&
      board.filter(x => x === W).length === 12
    ) {
      if (!hasCenterOpeningMove(turn)) {
        finish(
          other(turn),
          `Les ${name(turn)} ont perdu : aucun déplacement ni aucune capture vers la case centrale n’est possible.`
        );
      } else {
        phase = 'play';
        lockBonusTimerSettings();
        openingMovePending = true;

        say(
          `Placement terminé. Les ${name(turn)} commencent : ils doivent entrer au centre, par déplacement ou capture.`
        );
      }
    } else {
      placing = other(placed);

      say(
        `${name(placed)} : pion ${count}/12 placé. À ${name(placing)} de placer un pion.`
      );
    }

    render();

    if (
      phase === 'play' &&
      !hasCenterOpeningMove(turn)
    ) {
      finish(
        other(turn),
        `Les ${name(turn)} ont perdu : aucun déplacement ni aucune capture vers la case centrale n’est possible.`
      );
    } else if (
      aiMode &&
      phase === 'placement' &&
      placing === B
    ) {
      scheduleAI();
    } else if (
      aiMode &&
      phase === 'play' &&
      turn === B
    ) {
      scheduleAI();
    }

    return;
  }

  // Phase de déplacement
  if (selected !== null) {
    const m = availableMoves(selected).find(x => x.to === i);

    if (m) {
      play(m);
      return;
    }

    if (
      board[i] === turn &&
      (chain === null || i === chain)
    ) {
      selected = i;
      render();
      return;
    }

    if (chain !== null) return;

    selected = null;
    render();
    return;
  }

  if (
    board[i] === turn &&
    (chain === null || i === chain)
  ) {
    selected = i;
    render();
  }
}

 
function play(m) {
  const p = turn;
  const e = other(p);

  if (openingMovePending) {
    if (m.to !== center) return;
    openingMovePending = false;
  }

  board[m.to] = p;
  board[m.from] = E;
  lastMove = m.to;
  selected = null;

  if (m.cap !== null) {
    if (chain === null) chainCaptureCount = 0;

    chainCaptureCount++;

    board[m.cap] = E;
    captures[p]++;

    chain = m.to;

    const next = movesFrom(chain).filter(x => x.cap !== null);

    if (next.length) {
      selected = chain;
      say('Capture en chaîne : choisissez une destination pour poursuivre.');
      render();

      if (aiMode && turn === B) scheduleAI();
      return;
    }

    chain = null;

    const bonusCount = chainCaptureCount;
    chainCaptureCount = 0;

    startBonusRemoval(bonusCount, p);
    return;
  }

  finishTurn(p, e, 'Déplacement effectué.');
}

  
function finishTurn(p, next, msg) {
  if (bonusTimerInterval) {
  clearInterval(bonusTimerInterval);
  bonusTimerInterval = null;
  }
  chain = null;
  selected = null;
  bonusPending = 0;
  bonusPlayer = null;
  bonusOpponent = null;

  $('#bonusPanel')?.classList.add('hidden');
  $('#chainPanel')?.classList.add('hidden');

  if (board.filter(x => x === next).length === 0) {
    finish(p, `${name(p)} gagnent : tous les pions adverses ont été retirés.`);
    return;
  }

  turn = next;

  if (allMoves(next).length === 0) {
    finish(p, `${name(p)} gagnent : les ${name(next)} ne peuvent déplacer aucun pion.`);
    return;
  }

  say(`${msg} Au tour des ${name(next)}.`);
  render();

  if (aiMode && turn === B) scheduleAI();
}

  

function startBonusCountdown() {
  if (bonusTimerInterval) {
    clearInterval(bonusTimerInterval);
    bonusTimerInterval = null;
  }

  if (bonusTimerDuration === 0) {
  const timerDisplay = $('#bonusTimer');
  if (timerDisplay) {
    timerDisplay.textContent = '⏳ Sans limite de temps';
  }
  return;
  }

  let secondsLeft = bonusTimerDuration;
  const timerDisplay = $('#bonusTimer');

  if (timerDisplay) {
    timerDisplay.textContent = `⏳ Temps restant : ${secondsLeft} s`;
  }

  bonusTimerInterval = setInterval(() => {
    secondsLeft--;

    if (timerDisplay) {
      timerDisplay.textContent = `⏳ Temps restant : ${secondsLeft} s`;
    }

    if (secondsLeft <= 0) {
      clearInterval(bonusTimerInterval);
      bonusTimerInterval = null;

      const player = bonusPlayer;
      const opponent = bonusOpponent;

      $('#bonusPanel')?.classList.add('hidden');

      say('Temps écoulé ! Les bonus restants sont annulés.');

      finishTurn(
        player,
        opponent,
        'Temps écoulé : les bonus restants sont annulés.'
      );
    }
  }, 1000);
}




function startBonusRemoval(count, player) {
  bonusPending = count;
  bonusPlayer = player;
  bonusOpponent = other(player);

  selected = null;
  chain = null;

  const remaining = board.filter(
    p => p === bonusOpponent
  ).length;

  bonusPending = Math.min(bonusPending, remaining);

  if (bonusPending === 0) {
    finish(
      bonusPlayer,
      `${name(bonusPlayer)} gagnent : tous les pions adverses ont été retirés.`
    );
    return;
  }

  if (aiMode && bonusPlayer === B) {
    removeBonusAI();
    return;
  }

  $('#bonusPanel')?.classList.remove('hidden');
  startBonusCountdown();

  say(
    `Les ${name(bonusPlayer)} doivent retirer ${bonusPending} pion(s) bonus.`
  );

  render();
}


  

function removeBonusAI() {
  if (bonusTimerInterval) {
  clearInterval(bonusTimerInterval);
  bonusTimerInterval = null;
  }
  while (bonusPending > 0) {
    const choices = board
      .map((p, i) => p === bonusOpponent ? i : -1)
      .filter(i => i >= 0);

    if (choices.length === 0) break;

    const i = choices[
      Math.floor(Math.random() * choices.length)
    ];

    board[i] = E;
    bonusPending--;
  }

  bonusPending = 0;

  $('#bonusPanel')?.classList.add('hidden');

  render();

  if (board.filter(p => p === bonusOpponent).length === 0) {
    finish(
      bonusPlayer,
      `${name(bonusPlayer)} gagnent : tous les pions adverses ont été retirés.`
    );
    return;
  }

  finishTurn(
    bonusPlayer,
    bonusOpponent,
    'Captures et retraits bonus effectués.'
  );
}


  
  function finish(p,msg){gameOver=true;previousWinner=p;turn=p;say(msg);render();modalTitle.textContent=`${name(p)} gagnent !`;modalMsg.textContent=msg;modal.classList.remove('hidden');}
  
function lockBonusTimerSettings() {
  bonusTimerLocked = true;

  const setting = $('#bonusTimerMode');
  if (setting) {
    setting.disabled = true;
  }
}

  function scheduleAI(){if(!aiMode||gameOver||aiBusy||turn!==B&&phase==='play'||placing!==B&&phase==='placement')return;aiBusy=true;say('L’ordinateur réfléchit…');setTimeout(()=>{aiBusy=false;if(gameOver)return;if(phase==='placement'){let spots=board.map((x,i)=>x===E&&i!==center?i:-1).filter(i=>i>=0);const starter=turn;const starterCountNow=board.filter(x=>x===starter).length;if(starter===B&&starterCountNow===11)spots=spots.filter(i=>{board[i]=B;const ok=hasCenterOpeningMove();board[i]=E;return ok;});let i=choosePlacement(spots);if(i!==undefined){board[i]=B;let n=board.filter(x=>x===B).length;if(board.filter(x=>x===B).length===12&&board.filter(x=>x===W).length===12){
  phase='play';
lockBonusTimerSettings();
openingMovePending=true;say(`Placement terminé. Les ${name(turn)} commencent.`);}else{placing=W;say(`Noirs : pion ${n}/12 placé. À Blancs de placer un pion.`);}render();if(phase==='play'&&!hasCenterOpeningMove(turn))finish(other(turn),`Les ${name(turn)} ont perdu : aucun déplacement ni aucune capture vers la case centrale n’est possible.`);else if(phase==='play'){openingMovePending=true;if(turn===B)scheduleAI();}}return;}let options=chain!==null?movesFrom(chain).filter(m=>m.cap!==null):allMoves(B);if(openingMovePending)options=options.filter(m=>m.to===center);if(!options.length){finish(W,'Les Noirs sont bloqués.');return;}let m=chooseMove(options);play(m);},450);}
  $('#customRestart').onclick=reset;$('#customPlayAgain').onclick=reset;$('#customOpponent').onchange=e=>{aiMode=e.target.value==='ai';$('#customDifficultyWrap').classList.toggle('hidden',!aiMode);$('#customDifficulty').classList.toggle('hidden',!aiMode);reset();};$('#customDifficulty').onchange=reset;
  $('#bonusTimerMode').onchange = reset;
  function choosePlacement(spots) {
  if (!spots.length) return undefined;

  if (difficulty === 'easy') {
    return spots[Math.floor(Math.random() * spots.length)];
  }

  const ranked = spots.map(i => {
    let score = 0;

    const r = row(i);
    const c = col(i);

    // Favoriser les positions proches du centre
    const centerDistance = Math.abs(r - 2) + Math.abs(c - 2);
    score += (8 - centerDistance) * (difficulty === 'hard' ? 5 : 2);

    // Éviter de placer un pion directement exposé
let danger = 0;

for (const [dr, dc] of dirs) {
  const enemyR = r + dr;
  const enemyC = c + dc;
  const landingR = r + 2 * dr;
  const landingC = c + 2 * dc;

  if (
    inside(enemyR, enemyC) &&
    inside(landingR, landingC) &&
    board[enemyR * N + enemyC] === W &&
    board[landingR * N + landingC] === E
  ) {
    danger++;
  }
}

    score -= danger * (difficulty === 'hard' ? 12 : 4);

    // Légère variation pour éviter les choix toujours identiques
    score += Math.random() * (difficulty === 'hard' ? 0.1 : 5);

    return { i, score };
  });

  ranked.sort((a, b) => b.score - a.score);

  return ranked[0].i;
  }
  function chooseMove(options) {
  if (!options.length) return null;

  if (difficulty === 'easy') {
    return options[Math.floor(Math.random() * options.length)];
  }

  const opponent = other(B);

  const ranked = options.map(m => {
    const simulated = board.slice();

    simulated[m.to] = B;
    simulated[m.from] = E;

    let score = 0;

    // 1. Valoriser les captures
    if (m.cap !== null) {
      simulated[m.cap] = E;
      score += 100;
    }

    // 2. Favoriser les positions centrales
    const distance =
      Math.abs(row(m.to) - 2) +
      Math.abs(col(m.to) - 2);

    score += (8 - distance) * 5;

    // 3. Évaluer les possibilités de capture adverses
    let danger = 0;

    for (let i = 0; i < 25; i++) {
      if (simulated[i] !== opponent) continue;

      const r = row(i);
      const c = col(i);

      for (const [dr, dc] of dirs) {
        const middleR = r + dr;
        const middleC = c + dc;
        const landingR = r + 2 * dr;
        const landingC = c + 2 * dc;

        if (
          inside(middleR, middleC) &&
          inside(landingR, landingC) &&
          simulated[middleR * N + middleC] === B &&
          simulated[landingR * N + landingC] === E
        ) {
          danger++;
        }
      }
    }

    score -= danger * 35;

    // 4. Favoriser les déplacements qui gardent des possibilités
    let mobility = 0;

    for (let i = 0; i < 25; i++) {
      if (simulated[i] !== B) continue;

      for (const [dr, dc] of dirs) {
        const rr = row(i) + dr;
        const cc = col(i) + dc;

        if (inside(rr, cc) && simulated[rr * N + cc] === E) {
          mobility++;
        }
      }
    }

    score += mobility * 2;

    // 5. Petite variation pour départager les coups proches
    score += Math.random() * 0.1;

    return { m, score };
  });

  ranked.sort((a, b) => b.score - a.score);

  return ranked[0].m;
  }
  if (!loadMode2()) {
  reset();
  }
})();