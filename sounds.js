// XIDATA STRATÉGIE - Sons d'inspiration africaine
// Les sons sont synthétisés (mbira, tambours, shaker) : aucun fichier audio requis.
// Le script observe le plateau tout seul : pas besoin de modifier game.js ni mode2.js.
(() => {
  // Pour utiliser tes propres fichiers audio, indique leur chemin ici.
  // Un son sans chemin utilise la version synthétisée.
  const SOUND_FILES = {
    // select:  "sounds/select.mp3",
    // move:    "sounds/move.mp3",
    // capture: "sounds/capture.mp3",
    // king:    "sounds/king.mp3",
    // victory: "sounds/victory.mp3",
    // defeat:  "sounds/defeat.mp3"
  };

  let ctx = null;
  let master = null;
  let muted = false;
  try { muted = localStorage.getItem("xidata-muted") === "1"; } catch (e) {}

  // Le navigateur n'autorise le son qu'après un premier toucher
  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  ["pointerdown", "touchend", "click", "keydown"].forEach(ev =>
    window.addEventListener(ev, getCtx, { passive: true })
  );

  // ---------- Briques sonores ----------
  function tone(freq, start, dur, opts = {}) {
    const { type = "sine", gain = 0.3, endFreq = null, attack = 0.003 } = opts;
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(start, dur, opts = {}) {
    const { freq = 2000, q = 1, gain = 0.3, type = "bandpass" } = opts;
    const t = ctx.currentTime + start;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // Mbira (piano à pouces) : note pincée avec petit "clic" métallique
  function mbira(freq, start = 0, gain = 0.25) {
    tone(freq, start, 0.7, { type: "triangle", gain });
    tone(freq * 2.01, start, 0.35, { gain: gain * 0.4 });
    tone(freq * 5.4, start, 0.08, { gain: gain * 0.25 });
  }
  // Tambour grave
  function drum(start = 0, pitch = 120, gain = 0.5) {
    tone(pitch * 1.8, start, 0.3, { gain, endFreq: pitch });
    noise(start, 0.04, { freq: 900, gain: gain * 0.3 });
  }
  // Claque de djembé
  function slap(start = 0, gain = 0.4) {
    noise(start, 0.09, { freq: 2200, q: 0.8, gain });
    tone(260, start, 0.12, { gain: gain * 0.6, endFreq: 140 });
  }
  // Tambour de bois
  function logDrum(start = 0, pitch = 300, gain = 0.35) {
    tone(pitch, start, 0.16, { type: "triangle", gain, endFreq: pitch * 0.6 });
    noise(start, 0.02, { freq: 3000, gain: gain * 0.25 });
  }
  // Shaker (hochet)
  function shaker(start = 0, gain = 0.18) {
    noise(start, 0.07, { freq: 7000, q: 0.7, gain, type: "highpass" });
  }

  // Gamme pentatonique (do ré mi sol la)
  const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5, G4 = 392;

  const SOUNDS = {
    // Toucher un pion : note de mbira
    select: () => mbira(A5, 0, 0.18),
    // Déplacement : tambour de bois
    move: () => logDrum(0, 320, 0.35),
    // Capture : claque de djembé + tambour grave
    capture: () => { slap(0, 0.45); drum(0.02, 110, 0.45); },
    // Pion qui devient roi : arpège de mbira + shaker
    king: () => {
      [C5, D5, E5, G5, A5, C6].forEach((f, i) => mbira(f, i * 0.09, 0.22));
      shaker(0.05); shaker(0.2); shaker(0.35);
      drum(0.6, 120, 0.4);
    },
    // Victoire : rythme de tambours + mélodie de mbira
    victory: () => {
      [0, 0.25, 0.5, 0.875].forEach((t, i) => drum(t, i === 3 ? 90 : 120, 0.5));
      slap(0.375, 0.35);
      slap(0.75, 0.35);
      [G4, C5, D5, E5, G5, E5, G5, C6].forEach((f, i) => mbira(f, 0.2 + i * 0.16, 0.24));
      for (let i = 0; i < 8; i++) shaker(i * 0.2, 0.12);
    },
    // Défaite : mbira descendante + tambour grave
    defeat: () => {
      [E5, D5, C5, G4].forEach((f, i) => mbira(f, i * 0.25, 0.2));
      drum(1.0, 80, 0.45);
    }
  };

  function play(name) {
    if (muted) return;
    if (SOUND_FILES[name]) {
      try { new Audio(SOUND_FILES[name]).play().catch(() => {}); } catch (e) {}
      return;
    }
    if (!getCtx() || !SOUNDS[name]) return;
    try { SOUNDS[name](); } catch (e) { console.error("Son :", e); }
  }
  window.xidataPlaySound = play;

  // ---------- Détection des événements sur les plateaux ----------
  function snapshot(boardEl) {
    return Array.from(boardEl.children).map(cell => {
      const stone = cell.querySelector(".stone");
      if (!stone) return "";
      return (stone.classList.contains("black") ? "b" : "w") +
             (stone.classList.contains("king") ? "K" : "");
    });
  }
  function selectedIndex(boardEl) {
    return Array.from(boardEl.children).findIndex(c => c.classList.contains("selected"));
  }

  function watchBoard(boardEl) {
    if (!boardEl) return;
    let prev = null;
    let prevSel = -1;
    new MutationObserver(() => {
      const cur = snapshot(boardEl);
      if (cur.length !== 25) return;
      const sel = selectedIndex(boardEl);

      if (prev) {
        const count = a => a.filter(Boolean).length;
        const kings = a => a.filter(x => x.endsWith("K")).length;
        const before = count(prev);
        const after = count(cur);
        const changed = prev.some((v, i) => v !== cur[i]);

        if (after - before > 1 || after === 0) {
          // nouvelle partie : silence
        } else if (kings(cur) > kings(prev)) {
          play("king");
        } else if (after < before) {
          play("capture");
        } else if (changed) {
          play("move");
        } else if (sel !== -1 && sel !== prevSel) {
          play("select");
        }
      }
      prev = cur;
      prevSel = sel;
    }).observe(boardEl, { childList: true });
  }

  // ---------- Fin de partie ----------
  function playEnd(titleText) {
    const winner = titleText.startsWith("Blancs") ? "Blancs" : "Noirs";
    let mine = null; // null = deux joueurs sur le même appareil
    if (window.currentRoomCode) {
      mine = window.currentRoomRole === "host" ? "Blancs" : "Noirs";
    } else {
      const mode = document.querySelector("#gameMode").value;
      const ai = mode === "classic"
        ? document.querySelector("#aiMode")?.checked
        : document.querySelector("#customOpponent")?.value === "ai";
      if (ai) mine = "Blancs";
    }
    play(mine === null || mine === winner ? "victory" : "defeat");
  }

  function watchModal(modalSel, titleSel) {
    const modal = document.querySelector(modalSel);
    const title = document.querySelector(titleSel);
    if (!modal || !title) return;
    let wasHidden = modal.classList.contains("hidden");
    new MutationObserver(() => {
      const hidden = modal.classList.contains("hidden");
      if (wasHidden && !hidden) setTimeout(() => playEnd(title.textContent), 250);
      wasHidden = hidden;
    }).observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  // ---------- Bouton son (🔊 / 🔇) ----------
  function buildToggle() {
    const style = document.createElement("style");
    style.textContent =
      ".sound-toggle{position:fixed;right:max(12px,env(safe-area-inset-right));" +
      "bottom:max(12px,env(safe-area-inset-bottom));z-index:50;width:48px;height:48px;" +
      "border-radius:50%;border:2px solid #e0a030;background:#2d1a0c;color:#f3e6c8;" +
      "font-size:22px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.5)}";
    document.head.appendChild(style);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sound-toggle";
    btn.setAttribute("aria-label", "Activer ou couper le son");
    const refresh = () => {
      btn.textContent = muted ? "🔇" : "🔊";
      btn.setAttribute("aria-pressed", String(!muted));
    };
    btn.addEventListener("click", () => {
      muted = !muted;
      try { localStorage.setItem("xidata-muted", muted ? "1" : "0"); } catch (e) {}
      refresh();
      if (!muted) play("select");
    });
    refresh();
    document.body.appendChild(btn);
  }

  watchBoard(document.querySelector("#board"));
  watchBoard(document.querySelector("#customBoard"));
  watchModal("#endModal", "#endTitle");
  watchModal("#customEndModal", "#customEndTitle");
  buildToggle();
})();
