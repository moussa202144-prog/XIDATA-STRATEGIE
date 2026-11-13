// XIDATA STRATEGIE - Salons multijoueurs

const createRoomBtn = document.querySelector("#createRoomBtn");
const joinRoomBtn = document.querySelector("#joinRoomBtn");
const roomCodeInput = document.querySelector("#roomCode");
const invitationArea = document.querySelector("#invitationArea");
const invitationCode = document.querySelector("#invitationCode");
const onlineStatus = document.querySelector("#onlineStatus");
const copyInvitationBtn = document.querySelector("#copyInvitationBtn");
const shareInvitationBtn = document.querySelector("#shareInvitationBtn");

window.currentRoomCode = null;
window.currentRoomRole = null;

// Générer un code de 6 caractères
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

// CRÉER UNE PARTIE
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

    window.currentRoomCode = code;
    window.currentRoomRole = "host";
if (typeof window.startOnlineGame === "function") {
  window.startOnlineGame();
}
    invitationCode.textContent = code;
    roomCodeInput.value = code;
    invitationArea.hidden = false;

    onlineStatus.textContent =
      "Salon créé ! En attente du deuxième joueur.";

  } catch (error) {
    onlineStatus.textContent = "Erreur : " + error.message;
    console.error(error);
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

    const result = await roomRef.transaction(room => {
      if (
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
  const check = await roomRef.once("value");
  const room = check.val();

  console.log("DIAGNOSTIC SALON :", {
    code: code,
    room: room,
    uid: user.uid,
    committed: result.committed
  });

  if (!room) {
    throw new Error("Le salon n'existe pas ou est inaccessible.");
  }

  if (room.status !== "waiting") {
    throw new Error("Le salon n'est pas en attente : " + room.status);
  }

  if (room.guest != null) {
    throw new Error("Ce salon possède déjà un deuxième joueur.");
  }

  if (room.host === user.uid) {
    throw new Error("Les deux téléphones utilisent le même compte Firebase.");
  }

  throw new Error("Transaction refusée par Firebase. Vérifier les règles.");
    }

    window.currentRoomCode = code;
    window.currentRoomRole = "guest";

    if (typeof window.startOnlineGame === "function") {
      window.startOnlineGame();
    } else {
      throw new Error("La synchronisation du jeu n'est pas chargée.");
    }

    onlineStatus.textContent =
      "Partie rejointe ! Synchronisation du plateau en cours.";

  } catch (error) {
    onlineStatus.textContent = "Erreur : " + error.message;
    console.error(error);
  } finally {
    joinRoomBtn.disabled = false;
  }
});

// COPIER LE CODE
copyInvitationBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(window.currentRoomCode);
    onlineStatus.textContent = "Code copié !";
  } catch (error) {
    onlineStatus.textContent =
      "Copie impossible. Note le code affiché.";
  }
});

// PARTAGER LE LIEN
shareInvitationBtn.addEventListener("click", async () => {
  if (!window.currentRoomCode) return;

  const url = new URL(window.location.href);
  url.searchParams.set("room", window.currentRoomCode);

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