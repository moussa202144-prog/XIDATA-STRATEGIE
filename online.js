
// XIDATA STRATEGIE - Salons multijoueurs

const createRoomBtn = document.querySelector("#createRoomBtn");
const joinRoomBtn = document.querySelector("#joinRoomBtn");
const roomCodeInput = document.querySelector("#roomCode");
const invitationArea = document.querySelector("#invitationArea");
const invitationCode = document.querySelector("#invitationCode");
const onlineStatus = document.querySelector("#onlineStatus");

let currentRoomCode = null;

// Générer un code de 6 caractères
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

// Créer une partie
createRoomBtn.addEventListener("click", async () => {
  try {
    createRoomBtn.disabled = true;
    onlineStatus.textContent = "Création du salon...";

    const user = await window.firebaseReady;
    const mode = document.querySelector("#gameMode").value;

    let code;
    let created = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateRoomCode();

      const roomData = {
        mode: mode,
        host: user.uid,
        guest: null,
        status: "waiting",
        currentPlayer: "white",
        board: null,
        captures: {
          black: 0,
          white: 0
        },
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };

      const result = await window.firebaseDb
        .ref("rooms/" + code)
        .transaction(current => {
          if (current === null) return roomData;
          return;
        });

      if (result.committed) {
        created = true;
        break;
      }
    }

    if (!created) {
      throw new Error("Impossible de créer un code disponible.");
    }

    currentRoomCode = code;
    invitationCode.textContent = code;
    roomCodeInput.value = code;
    invitationArea.hidden = false;

    onlineStatus.textContent =
      "Salon créé ! En attente du deuxième joueur.";

  } catch (error) {
    onlineStatus.textContent = "Erreur : " + error.message;
  } finally {
    createRoomBtn.disabled = false;
  }
});

// Rejoindre une partie avec un code
joinRoomBtn.addEventListener("click", async () => {
  try {
    joinRoomBtn.disabled = true;

    const user = await window.firebaseReady;
    const code = roomCodeInput.value.trim().toUpperCase();

    if (!/^[A-Z0-9]{6}$/.test(code)) {
      throw new Error("Le code doit contenir 6 caractères.");
    }

    const roomRef = window.firebaseDb.ref("rooms/" + code);

    
    const roomRef = window.firebaseDb.ref("rooms/" + code);

    // Vérifier que le salon existe
    const snapshot = await roomRef.get();

    if (!snapshot.exists()) {
      throw new Error("Ce code ne correspond à aucun salon.");
    }

    const roomInfo = snapshot.val();

    if (roomInfo.status !== "waiting" ||
        roomInfo.guest != null ||
        roomInfo.host === user.uid) {
      throw new Error("Salon déjà occupé ou impossible à rejoindre.");
    }

    // Rejoindre le salon
    const result = await roomRef.transaction(room => {
      if (
        room === null ||
        room.status !== "waiting" ||
        room.guest != null ||
        room.host === user.uid
      ) {
        return;
      }

      room.guest = user.uid;
      room.status = "playing";
      return room;
    });

    if (!result.committed) {
      throw new Error("Impossible de rejoindre ce salon. Réessaie.");
    }

    currentRoomCode = code;

    onlineStatus.textContent =
      "Partie rejointe ! En attente de la synchronisation du plateau.";


// Copier le code
document.querySelector("#copyInvitationBtn")
  .addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(currentRoomCode);
      onlineStatus.textContent = "Code copié !";
    } catch (error) {
      onlineStatus.textContent =
        "Copie impossible. Note le code affiché.";
    }
  });

// Partager le lien
document.querySelector("#shareInvitationBtn")
  .addEventListener("click", async () => {
    if (!currentRoomCode) return;

    const url = new URL(window.location.href);
    url.searchParams.set("room", currentRoomCode);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "XIDATA STRATÉGIE",
          text: "Rejoins ma partie !",
          url: url.toString()
        });
      } else {
        await navigator.clipboard.writeText(url.toString());
        onlineStatus.textContent = "Lien copié !";
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        onlineStatus.textContent = "Impossible de partager le lien.";
      }
    }
  });
