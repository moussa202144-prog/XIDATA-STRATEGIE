
// XIDATA STRATEGIE - Connexion Firebase

const firebaseConfig = {
  apiKey: "AIzaSyArjOBVkVP_7zK4053I5zvIF15gbG0KkR8",
  authDomain: "xidata-strategie-f598a.firebaseapp.com",
  databaseURL: "https://xidata-strategie-f598a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "xidata-strategie-f598a",
  storageBucket: "xidata-strategie-f598a.firebasestorage.app",
  messagingSenderId: "698942672412",
  appId: "1:698942672412:web:c666ff68c8c196db5b59d9"
};

// Initialisation Firebase
firebase.initializeApp(firebaseConfig);

// Services Firebase
window.firebaseAuth = firebase.auth();
window.firebaseDb = firebase.database();

// Connexion anonyme du joueur
window.firebaseAuth.signInAnonymously()
  .then((result) => {
    window.currentPlayer = result.user;

    console.log(
      "XIDATA STRATEGIE connecté !",
      result.user.uid
    );
  })
  .catch((error) => {
    console.error("Erreur Firebase :", error.message);
  });
window.firebaseReady = window.firebaseAuth.signInAnonymously()
  .then(result => {
    window.currentPlayer = result.user;
    return result.user;
  });
