
// XIDATA STRATEGIE - Connexion Firebase

const firebaseConfig = {
  apiKey: "AIzaSyArjOBVkVP_7zK4053I5zvIF15gbG0KkR8",
  authDomain: "xidata-strategie-f598a.firebaseapp.com",
  databaseURL: "https://xidata-strategie-f598a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "xidata-strategie-f598a",
  storageBucket: "xidata-strategie-f598a.firebasestorage.app",
  messagingSenderId: "698942672412",
  appId: "1:698942672412:web:c666ff68c8c196db5b59d9",
  // Google Analytics : remplace par ton identifiant "G-..." (console Firebase > Paramètres du projet > Général)
    measurementId:  "G-J58GE79DWN"
};

// Initialisation Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Services Firebase
window.firebaseAuth = firebase.auth();
window.firebaseDb = firebase.database();

// Google Analytics (inactif tant que measurementId n'est pas renseigné)
window.firebaseAnalytics = null;
if (
  firebaseConfig.measurementId &&
  !firebaseConfig.measurementId.includes("XXXX") &&
  typeof firebase.analytics === "function"
) {
  try {
    window.firebaseAnalytics = firebase.analytics();
    // Rien n'est envoyé tant que le joueur n'a pas accepté (voir analytics.js)
    window.firebaseAnalytics.setAnalyticsCollectionEnabled(false);
  } catch (error) {
    console.warn("Analytics indisponible :", error);
  }
}

// Serveur d'achats (Cloud Functions), si le script est chargé
window.firebaseFunctions =
  typeof firebase.functions === "function" ? firebase.app().functions("europe-west1") : null;

// Une seule connexion : on reprend la session existante (compte Google lié),
// sinon on se connecte anonymement.
window.firebaseReady = new Promise((resolve, reject) => {
  const stop = window.firebaseAuth.onAuthStateChanged((user) => {
    stop();
    if (user) {
      resolve({ user });
      return;
    }
    window.firebaseAuth.signInAnonymously().then(resolve).catch(reject);
  });
})
  .then((result) => {
    window.currentPlayer = result.user;

    console.log(
      "XIDATA XOORE connecté !",
      result.user.uid
    );

    const status = document.querySelector("#onlineStatus");

    if (status) {
      status.textContent = "Connecté ✅ prêt à jouer en ligne.";
    }

    return result.user;
  })
  .catch((error) => {
    console.error(
      "Erreur Firebase :",
      error.code,
      error.message
    );

    throw error;
  });
