// XIDATA STRATÉGIE - Statistiques de fréquentation (Firebase)
// Aucune donnée personnelle : seulement des compteurs et un identifiant anonyme par appareil.
// Pour voir les chiffres : ouvre le jeu avec  ?stats  à la fin de l'adresse.
(() => {
  const today = () => new Date().toISOString().slice(0, 10);
  let db = null;
  let uid = null;

  const inc = () => firebase.database.ServerValue.increment(1);

  // Ajoute 1 aux compteurs : total, jour, et joueur
  // kind : "visits" | "onlineGames" | "localGames" | "aiGames"
  function bump(kind) {
    if (!db || !uid) return;
    const log = error => console.warn("Statistiques :", error.message);
    db.ref("stats/totals/" + kind).set(inc()).catch(log);
    db.ref("stats/daily/" + today() + "/" + kind).set(inc()).catch(log);
    db.ref("stats/players/" + uid + "/" + kind).set(inc()).catch(log);
  }

  // ---------- Joueurs connectés en ce moment ----------
  function showOnlineCount() {
    const style = document.createElement("style");
    style.textContent =
      ".home-online-count{margin:0;text-align:center;font-weight:800;font-size:.9rem;color:#cdb899}" +
      ".home-online-count[hidden]{display:none}";
    document.head.appendChild(style);

    const nav = document.querySelector(".home-buttons");
    if (!nav) return;
    const line = document.createElement("p");
    line.className = "home-online-count";
    line.hidden = true;
    nav.insertAdjacentElement("afterend", line);

    db.ref("stats/presence").on("value", snap => {
      const count = snap.numChildren();
      line.hidden = count < 2;
      line.textContent = "🟢 " + count + " joueurs connectés";
    });
  }

  function trackPresence() {
    const presenceRef = db.ref("stats/presence/" + uid);
    db.ref(".info/connected").on("value", snap => {
      if (snap.val() === true) {
        presenceRef.onDisconnect().remove(); // disparaît tout seul quand le joueur part
        presenceRef.set(true);
      }
    });
  }

  // ---------- Page des chiffres (?stats) ----------
  async function showStats() {
    const style = document.createElement("style");
    style.textContent =
      "#statsPanel{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:16px;background:rgba(8,4,2,.85)}" +
      "#statsPanel .stats-card{box-sizing:border-box;width:min(440px,100%);max-height:90vh;overflow:auto;padding:20px;border-radius:20px;background:#2d1a0c;border:1px solid rgba(224,160,48,.5);color:#f3e6c8}" +
      "#statsPanel h2{margin:0 0 12px;color:#e0a030}#statsPanel h3{margin:16px 0 6px;font-size:1rem;color:#e0a030}" +
      "#statsPanel table{width:100%;border-collapse:collapse}" +
      "#statsPanel td,#statsPanel th{padding:7px 4px;border-bottom:1px solid rgba(224,160,48,.2);text-align:left}" +
      "#statsPanel td:last-child,#statsPanel th:last-child{text-align:right;font-weight:800}" +
      "#statsPanel button{margin-top:16px;width:100%;padding:12px;border:0;border-radius:12px;background:#e0a030;color:#2a1608;font-weight:800;cursor:pointer}";
    document.head.appendChild(style);

    const panel = document.createElement("div");
    panel.id = "statsPanel";
    panel.innerHTML =
      '<div class="stats-card"><h2>📊 Statistiques</h2><div id="statsBody">Chargement…</div>' +
      '<button type="button" id="statsClose">Fermer</button></div>';
    document.body.appendChild(panel);
    panel.querySelector("#statsClose").addEventListener("click", () => panel.remove());

    try {
      const [totalsSnap, dailySnap, presenceSnap] = await Promise.all([
        db.ref("stats/totals").once("value"),
        db.ref("stats/daily").orderByKey().limitToLast(7).once("value"),
        db.ref("stats/presence").once("value")
      ]);
      const t = totalsSnap.val() || {};
      const n = value => Number(value) || 0;

      const rows = [
        ["Joueurs différents (appareils)", n(t.players)],
        ["Visites", n(t.visits)],
        ["Parties en ligne", n(t.onlineGames)],
        ["Parties contre l'ordinateur", n(t.aiGames)],
        ["Parties à deux (même appareil)", n(t.localGames)],
        ["Connectés maintenant", presenceSnap.numChildren()]
      ];

      const days = [];
      dailySnap.forEach(child => { days.push({ date: child.key, ...child.val() }); });
      days.reverse();

      let html = "<table>" + rows.map(r => "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>").join("") + "</table>";
      html += "<h3>7 derniers jours</h3><table><tr><th>Jour</th><th>Visites</th></tr>" +
        (days.length
          ? days.map(d => "<tr><td>" + String(d.date).replace(/[^0-9-]/g, "") + "</td><td>" + n(d.visits) + "</td></tr>").join("")
          : "<tr><td colspan=\"2\">Pas encore de données</td></tr>") +
        "</table>";
      panel.querySelector("#statsBody").innerHTML = html;
    } catch (error) {
      panel.querySelector("#statsBody").textContent = "Lecture impossible : " + error.message;
    }
  }

  // ---------- Démarrage ----------
  async function init() {
    try {
      const user = await window.firebaseReady;
      db = window.firebaseDb;
      uid = user.uid;

      // Nouveau joueur ? (la règle Firebase n'accepte "first" qu'une seule fois par appareil)
      db.ref("stats/players/" + uid + "/first")
        .set(firebase.database.ServerValue.TIMESTAMP)
        .then(() => db.ref("stats/totals/players").set(inc()))
        .catch(() => {});

      db.ref("stats/players/" + uid + "/last")
        .set(firebase.database.ServerValue.TIMESTAMP)
        .catch(() => {});

      // Une visite par session (pas à chaque rechargement)
      let counted = false;
      try { counted = sessionStorage.getItem("xidata-counted") === "1"; } catch (e) {}
      if (!counted) {
        bump("visits");
        try { sessionStorage.setItem("xidata-counted", "1"); } catch (e) {}
      }

      trackPresence();
      showOnlineCount();

      // Parties à deux et contre l'ordinateur (boutons de l'accueil)
      document.addEventListener("click", event => {
        const target = event.target;
        if (!target || typeof target.closest !== "function") return;
        if (target.closest("#homeLocalBtn")) bump("localGames");
        else if (target.closest("[data-level]")) bump("aiGames");
      });

      // Parties en ligne : comptées une seule fois (par l'hôte)
      window.addEventListener("xidata-online-started", () => {
        if (window.currentRoomRole === "host") bump("onlineGames");
        else db.ref("stats/players/" + uid + "/onlineGames").set(inc()).catch(() => {});
      });

      if (new URLSearchParams(location.search).has("stats")) showStats();
    } catch (error) {
      console.warn("Statistiques indisponibles :", error);
    }
  }

  init();
})();
