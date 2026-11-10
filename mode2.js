(() => {
  const N=5, B='black', W='white', E=null, center=12;
  let board, phase, placing, turn, selected, chain, bonusPending, gameOver, aiMode, aiBusy, captures, lastMove, difficulty, openingMovePending;
  let previousWinner = null;
  const $=s=>document.querySelector(s);
  const boardEl=$('#customBoard'), status=$('#customStatus'), turnEl=$('#customTurn'), blackCount=$('#customBlackCount'), whiteCount=$('#customWhiteCount'), blackCap=$('#customBlackCap'), whiteCap=$('#customWhiteCap'), modal=$('#customEndModal'), modalTitle=$('#customEndTitle'), modalMsg=$('#customEndMessage');
  const other=p=>p===B?W:B, name=p=>p===B?'Noirs':'Blancs', row=i=>Math.floor(i/N), col=i=>i%N, inside=(r,c)=>r>=0&&r<N&&c>=0&&c<N;
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  function say(t){status.textContent=t;}
  function reset(){difficulty=$('#customDifficulty').value;board=Array(25).fill(E); phase='placement'; placing=previousWinner||W; turn=previousWinner||B; selected=null; chain=null; bonusPending=null; gameOver=false; aiBusy=false; captures={[B]:0,[W]:0}; lastMove=null; openingMovePending=true; modal.classList.add('hidden'); $('#bonusPanel')?.classList.add('hidden'); $('#chainPanel')?.classList.add('hidden'); say(`Placement : les ${name(placing)} posent leur premier pion. La case centrale reste vide.`); render();if(aiMode&&placing===B)scheduleAI();}
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
  function render(){boardEl.innerHTML='';let dest=new Map();if(selected!==null)for(const m of availableMoves(selected))dest.set(m.to,m.cap!==null);board.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.className='cell '+((row(i)+col(i))%2?'dark':'light');b.setAttribute('aria-label',p===B?'Pion noir':p===W?'Pion blanc':i===center?'Case centrale vide':'Case vide');if(i===selected)b.classList.add('selected');if(dest.has(i))b.classList.add(dest.get(i)?'capture-destination':'destination');if(i===lastMove)b.classList.add('last-move');if(p===B||p===W){let s=document.createElement('span');s.className='stone '+p;b.append(s);}else{let d=document.createElement('span');d.style.cssText='width:10%;height:10%;border-radius:50%;background:rgba(30,50,30,.24)';b.append(d);}b.onclick=()=>click(i);boardEl.append(b);});blackCount.textContent=board.filter(x=>x===B).length;whiteCount.textContent=board.filter(x=>x===W).length;blackCap.textContent=captures[B];whiteCap.textContent=captures[W];turnEl.textContent=phase==='placement'?`Placement : ${name(placing)}`:`Au tour des ${name(turn)}`;
$('#customHint').textContent = bonusPending !== null
  ? `BONUS OBLIGATOIRE : choisissez un pion des ${name(bonusPending)} à retirer.`
  : phase === 'placement'
    ? `Pions à placer — Blancs : ${12-board.filter(x=>x===W).length} · Noirs : ${12-board.filter(x=>x===B).length}`
    : 'Sélectionnez un pion puis une destination verte. Les captures sont en jaune.';

  
  

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
    board[m.cap] = E;
    captures[p]++;
    chain = m.to;

    const remaining = board.filter(x => x === e).length;

    if (remaining === 0) {
      finish(p, `${name(p)} gagnent : tous les pions adverses sont capturés.`);
      return;
    }

    if (remaining >= 2) {
      bonusPending = e;
      say(`Bonus obligatoire : choisissez un pion des ${name(e)} à retirer.`);
      render();
      if (aiMode && turn === B) scheduleAI();
      return; }

    const next = movesFrom(chain).filter(x => x.cap !== null);

    if (next.length) {
      selected = chain;
      say('Capture en chaîne : choisissez une destination pour poursuivre.');
      render();
      if (aiMode && turn === B) scheduleAI();
      return;
    }
    chain = null;
    finishTurn(p, e, 'Capture effectuée.');
    return;
  }
  finishTurn(p, e, 'Déplacement effectué.');
}


function finishTurn(p, next, msg) {
  chain = null;
  selected = null;
  $('#chainPanel')?.classList.add('hidden');

  if (board.filter(x => x === next).length === 0) {
    finish(p, `${name(p)} gagnent : tous les pions adverses sont capturés.`);
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


  
  function finish(p,msg){gameOver=true;previousWinner=p;turn=p;say(msg);render();modalTitle.textContent=`${name(p)} gagnent !`;modalMsg.textContent=msg;modal.classList.remove('hidden');}
  function scheduleAI(){

  
if (bonusPending !== null) {
  const targets = board
    .map((p, i) => p === bonusPending ? i : -1)
    .filter(i => i >= 0);

  if (targets.length > 0) {
    const target = targets[Math.floor(Math.random() * targets.length)];
    board[target] = E;
  }

  bonusPending = null;

  const next = chain !== null
    ? movesFrom(chain).filter(x => x.cap !== null)
    : [];

  if (next.length > 0) {
    selected = chain;
    say('Bonus effectué. L’ordinateur poursuit sa capture en chaîne.');
    render();
    if (aiMode && turn === B) scheduleAI();
    return;
  }

  chain = null;
  finishTurn(B, W, 'Bonus obligatoire effectué par les Noirs.');
  return;
}

    
  if(!aiMode||gameOver||aiBusy||turn!==B&&phase==='play'||placing!==B&&phase==='placement')return;aiBusy=true;say('L’ordinateur réfléchit…');setTimeout(()=>{aiBusy=false;if(gameOver)return;if(phase==='placement'){let spots=board.map((x,i)=>x===E&&i!==center?i:-1).filter(i=>i>=0);const starter=turn;const starterCountNow=board.filter(x=>x===starter).length;if(starter===B&&starterCountNow===11)spots=spots.filter(i=>{board[i]=B;const ok=hasCenterOpeningMove();board[i]=E;return ok;});let i=choosePlacement(spots);if(i!==undefined){board[i]=B;let n=board.filter(x=>x===B).length;if(board.filter(x=>x===B).length===12&&board.filter(x=>x===W).length===12){phase='play';openingMovePending=true;say(`Placement terminé. Les ${name(turn)} commencent.`);}else{placing=W;say(`Noirs : pion ${n}/12 placé. À Blancs de placer un pion.`);}render();if(phase==='play'&&!hasCenterOpeningMove(turn))finish(other(turn),`Les ${name(turn)} ont perdu : aucun déplacement ni aucune capture vers la case centrale n’est possible.`);else if(phase==='play'){openingMovePending=true;if(turn===B)scheduleAI();}}return;}let options=chain!==null?movesFrom(chain).filter(m=>m.cap!==null):allMoves(B);if(openingMovePending)options=options.filter(m=>m.to===center);if(!options.length){finish(W,'Les Noirs sont bloqués.');return;}let m=chooseMove(options);play(m);},450);}
  $('#customRestart').onclick=reset;$('#customPlayAgain').onclick=reset;$('#customOpponent').onchange=e=>{aiMode=e.target.value==='ai';$('#customDifficultyWrap').classList.toggle('hidden',!aiMode);$('#customDifficulty').classList.toggle('hidden',!aiMode);reset();};$('#customDifficulty').onchange=reset;
  function choosePlacement(spots){if(!spots.length)return undefined;if(difficulty==='easy')return spots[Math.floor(Math.random()*spots.length)];const ranked=spots.map(i=>({i,score:(difficulty==='hard'?3:1)*(8-Math.abs(row(i)-2)-Math.abs(col(i)-2))+Math.random()*(difficulty==='hard'?0.2:5)}));ranked.sort((a,b)=>b.score-a.score);return ranked[0].i;}
  function chooseMove(options){if(!options.length)return null;if(difficulty==='easy')return options[Math.floor(Math.random()*options.length)];const ranked=options.map(m=>{let score=m.cap!==null?(difficulty==='hard'?100:60):0;const r=row(m.to),c=col(m.to);score+=(difficulty==='hard'?5:2)*(8-Math.abs(r-2)-Math.abs(c-2));if(difficulty==='hard'){const simulated=board.slice();simulated[m.to]=B;simulated[m.from]=E;if(m.cap!==null)simulated[m.cap]=E;let mobility=0;for(let j=0;j<25;j++)if(simulated[j]===B){for(const [dr,dc] of dirs){let rr=row(j)+dr,cc=col(j)+dc;if(inside(rr,cc)&&simulated[rr*N+cc]===E)mobility++;}}score+=mobility*2;}score+=Math.random()*(difficulty==='hard'?0.5:8);return {m,score};});ranked.sort((a,b)=>b.score-a.score);return ranked[0].m;}
  reset();
})();