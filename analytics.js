// XIDATA STRATÉGIE - Google Analytics : consentement et événements de jeu
// Ne fait rien tant que measurementId n'est pas renseigné dans firebase.js.
// Rien n'est envoyé à Google avant que le joueur ait appuyé sur "Accepter".
(() => {
  const analytics = window.firebaseAnalytics;
  if (!analytics) return;

  const KEY = "xidata-analytics-consent";
  const currentMode = () =>
    document.querySelector("#gameMode")?.value === "custom" ? "custom" : "classic";

  function log(name, params) {
    try { analytics.logEvent(name, params || {}); } catch (error) { /* ignoré */ }
  }
  function setCollection(enabled) {
    try { analytics.setAnalyticsCollectionEnabled(enabled); } catch (error) { /* ignoré */ }
  }
  function readConsent() {
    try { return localStorage.getItem(KEY); } catch (error) { return null; }
  }
  function saveConsent(value) {
    try { localStorage.setItem(KEY, value); } catch (error) { /* ignoré */ }
  }

  // ---------- Bandeau de consentement ----------
  function showBanner() {
    const style = document.createElement("style");
    style.textContent =
      "#consentBanner{position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:80;" +
      "max-width:480px;margin:0 auto;padding:14px;border-radius:16px;background:#2d1a0c;color:#f3e6c8;" +
      "border:1px solid rgba(224,160,48,.6);box-shadow:0 8px 24px rgba(0,0,0,.5);font-size:.9rem;line-height:1.4}" +
      "#consentBanner p{margin:0 0 10px}" +
      "#consentBanner .row{display:flex;gap:8px}" +
      "#consentBanner button{flex:1;padding:11px;border-radius:12px;border:1px solid rgba(224,160,48,.6);" +
      "background:#3a2210;color:#f3e6c8;font-weight:800;cursor:pointer}" +
      "#consentBanner button.yes{background:#e0a030;color:#2a1608;border-color:#e0a030}";
    document.head.appendChild(style);

    const banner = document.createElement("div");
    banner.id = "consentBanner";
    banner.setAttribute("role", "dialog");
    banner.innerHTML =
      "<p>Autoriser des statistiques anonymes de fréquentation pour améliorer le jeu ?</p>" +
      '<div class="row"><button type="button" class="no">Refuser</button>' +
      '<button type="button" class="yes">Accepter</button></div>';
    document.body.appendChild(banner);

    banner.querySelector(".yes").addEventListener("click", () => {
      saveConsent("yes");
      setCollection(true);
      banner.remove();
      log("consent_accepted");
    });
    banner.querySelector(".no").addEventListener("click", () => {
      saveConsent("no");
      setCollection(false);
      banner.remove();
    });
  }

  const consent = readConsent();
  if (consent === "yes") setCollection(true);
  else if (consent === null) showBanner();

  // ---------- Événements de jeu ----------
  document.addEventListener("click", event => {
    const target = event.target;
    if (!target || typeof target.closest !== "function") return;

    if (target.closest("#homeLocalBtn")) {
      log("game_start", { type: "local", mode: currentMode() });
    } else if (target.closest("[data-level]")) {
      log("game_start", {
        type: "ordinateur",
        mode: currentMode(),
        niveau: target.closest("[data-level]").dataset.level
      });
    } else if (target.closest("#quickMatchBtn")) {
      log("online_search", { mode: currentMode() });
    } else if (target.closest("#homeShareBtn")) {
      log("share_game");
    } else if (target.closest("[data-open-rules]")) {
      log("view_rules", { mode: currentMode() });
    }
  });

  // Partie en ligne commencée
  window.addEventListener("xidata-online-started", () => {
    log("game_start", {
      type: "en_ligne",
      mode: window.currentRoomMode || currentMode(),
      role: window.currentRoomRole || "inconnu"
    });
  });

  // Fin de partie (la fenêtre de victoire s'affiche)
  ["#endModal", "#customEndModal"].forEach(selector => {
    const modal = document.querySelector(selector);
    if (!modal || typeof MutationObserver !== "function") return;
    let wasHidden = modal.classList.contains("hidden");
    new MutationObserver(() => {
      const hidden = modal.classList.contains("hidden");
      if (wasHidden && !hidden) {
        log("game_end", {
          mode: selector === "#customEndModal" ? "custom" : "classic",
          type: window.onlineGameStarted ? "en_ligne" : "hors_ligne"
        });
      }
      wasHidden = hidden;
    }).observe(modal, { attributes: true, attributeFilter: ["class"] });
  });
})();
