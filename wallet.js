// XIDATA XOORE - Compte joueur et cauris achetés
// Les cauris achetés sont gardés par le serveur (Firebase) : ils ne se perdent pas
// en changeant de téléphone, à condition d'être connecté avec Google.
(() => {
  // Passe "enabled" à true quand le serveur d'achats est en ligne (dossier functions/ déployé)
  const PAYMENTS = { enabled: false };

  const $ = s => document.querySelector(s);
  let purchased = 0;
  let balanceRef = null;

  const isNative = () =>
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "app:" ||
    !!(window.Capacitor &&
       typeof window.Capacitor.isNativePlatform === "function" &&
       window.Capacitor.isNativePlatform());

  const auth = () => window.firebaseAuth;

  function accountInfo() {
    const user = auth() && auth().currentUser;
    const signedIn = !!user && !user.isAnonymous;
    return { signedIn, email: (user && user.email) || "", anonymous: !signedIn };
  }

  function notify(text) {
    if (window.xidataExtras && typeof window.xidataExtras.toast === "function") window.xidataExtras.toast(text);
    else console.warn(text);
  }

  // ---------- Affichage du compte dans la boutique ----------
  function updateUI() {
    const info = accountInfo();
    const box = $("#accountBox");
    const status = $("#accountStatus");
    const signIn = $("#accountSignIn");
    const signOut = $("#accountSignOut");
    const native = isNative();

    if (box) box.hidden = !(PAYMENTS.enabled || native);
    if (status) {
      status.textContent = native
        ? "La connexion Google et les achats arrivent bientôt dans l'application Android."
        : info.signedIn
          ? "Connecté : " + info.email
          : "Non connecté : connecte-toi avec Google pour acheter et garder tes cauris.";
    }
    if (signIn) signIn.hidden = native || info.signedIn;
    if (signOut) signOut.hidden = native || !info.signedIn;
  }

  // ---------- Solde de cauris achetés ----------
  function watchBalance() {
    const user = auth() && auth().currentUser;
    if (!user || !window.firebaseDb) return;
    if (balanceRef) balanceRef.off("value");
    balanceRef = window.firebaseDb.ref("wallets/" + user.uid + "/purchased");
    balanceRef.on(
      "value",
      snap => { purchased = Number(snap.val()) || 0; },
      () => { purchased = 0; } // règles pas encore publiées : on reste à zéro
    );
  }

  // ---------- Connexion Google ----------
  async function signIn() {
    const a = auth();
    if (!a) throw new Error("Connexion indisponible");
    const provider = new firebase.auth.GoogleAuthProvider();
    const user = a.currentUser;
    try {
      if (user && user.isAnonymous) await user.linkWithPopup(provider); // garde le même identifiant
      else await a.signInWithPopup(provider);
    } catch (error) {
      if (error && error.code === "auth/credential-already-in-use" && error.credential) {
        // Ce compte Google est déjà connu : on le retrouve (et ses cauris achetés)
        await a.signInWithCredential(error.credential);
        location.reload();
        return;
      }
      if (error && error.code === "auth/popup-blocked" && user && user.isAnonymous) {
        await user.linkWithRedirect(provider);
        return;
      }
      throw error;
    }
    watchBalance();
    updateUI();
  }

  async function signOut() {
    if (!auth()) return;
    await auth().signOut();
    location.reload(); // une nouvelle session anonyme démarre
  }

  // ---------- Achat (page de paiement Stripe) ----------
  async function buy(packId) {
    if (!PAYMENTS.enabled) throw new Error("disabled");
    const user = auth() && auth().currentUser;
    if (!user || user.isAnonymous) {
      const error = new Error("Connexion Google requise");
      error.code = "needs-login";
      throw error;
    }
    if (!window.firebaseFunctions) throw new Error("Serveur indisponible");
    const call = window.firebaseFunctions.httpsCallable("createCheckoutSession");
    const result = await call({ packId, returnUrl: location.origin + location.pathname });
    const url = result.data && result.data.url;
    if (!url) throw new Error("Pas d'adresse de paiement");
    location.href = url;
  }

  // ---------- Dépense de cauris achetés ----------
  async function spend(amount) {
    if (!window.firebaseFunctions) throw new Error("Serveur indisponible");
    const call = window.firebaseFunctions.httpsCallable("spendPurchased");
    const result = await call({ amount });
    const data = (result && result.data) || {};
    if (data.ok) purchased = Number(data.purchased) || 0;
    return !!data.ok;
  }

  // ---------- Retour du paiement (?achat=ok ou ?achat=annule) ----------
  function readPurchaseReturn() {
    const params = new URLSearchParams(location.search);
    const back = params.get("achat");
    if (back !== "ok" && back !== "annule") return;
    window.xidataPurchaseReturn = back;
    params.delete("achat");
    const rest = params.toString();
    try { history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") + location.hash); } catch (e) { /* ignoré */ }
  }

  // ---------- Démarrage ----------
  window.xidataWallet = {
    get enabled() { return PAYMENTS.enabled; },
    isNative,
    purchased: () => purchased,
    account: accountInfo,
    signIn,
    signOut,
    buy,
    spend
  };

  readPurchaseReturn();

  const signInBtn = $("#accountSignIn");
  const signOutBtn = $("#accountSignOut");
  if (signInBtn) {
    signInBtn.addEventListener("click", () =>
      signIn().catch(error => {
        if (error && (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request")) return;
        notify("Connexion impossible : réessaie.");
      })
    );
  }
  if (signOutBtn) signOutBtn.addEventListener("click", () => signOut().catch(() => notify("Déconnexion impossible.")));

  if (window.firebaseReady && typeof window.firebaseReady.then === "function") {
    window.firebaseReady
      .then(() => {
        watchBalance();
        updateUI();
        if (auth() && typeof auth().getRedirectResult === "function") {
          auth().getRedirectResult().catch(async error => {
            if (error && error.code === "auth/credential-already-in-use" && error.credential) {
              await auth().signInWithCredential(error.credential);
              location.reload();
            }
          });
        }
      })
      .catch(() => {});
  }
  updateUI();
})();
