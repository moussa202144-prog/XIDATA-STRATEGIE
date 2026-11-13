const gm = document.querySelector("#gameMode");
if (gm.value !== "classic") { gm.value = "classic"; gm.dispatchEvent(new Event("change")); }
console.log("ONLINE.JS DÉMARRÉ");

console.log("Bouton créer :", document.querySelector("#createRoomBtn"));

console.log("Firebase :", window.firebaseDb);
 // XIDATA STRATEGIE - Salons multijoueurs
const roomParam = new URLSearchParams(location.search).get("room");
if (roomParam) roomCodeInput.value = roomParam.toUpperCase();
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
// Créer une partie
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

createRoomBtn.addEventListener("click", async () => {
  try {
    createRoomBtn.disabled = true;
    onlineStatus.textContent = "Création de la partie...";

    const user = await window.firebaseReady;

    let code = "";
    let created = false;

    for (let i = 0; i < 5 && !created; i++) {
      code = generateRoomCode();
      const result = await window.firebaseDb
        .ref("rooms/" + code)
        .transaction(room => {
          if (room !== null) return; // code déjà pris
          return {
            host: user.uid,
            status: "waiting",
            createdAt: Date.now()
          };
        });
      created = result.committed;
    }

    if (!created) throw new Error("Impossible de créer un code, réessaie.");

    window.currentRoomCode = code;
    window.currentRoomRole = "host";

    invitationCode.textContent = code;
    invitationArea.hidden = false;
    onlineStatus.textContent = "Partie créée ! Envoie le code à ton ami.";

    // Attendre que l'invité rejoigne
    const statusRef = window.firebaseDb.ref("rooms/" + code + "/status");
    const listener = statusRef.on("value", snap => {
      if (snap.val() === "playing") {
        statusRef.off("value", listener);
        onlineStatus.textContent = "Adversaire connecté !";
        if (typeof window.startOnlineGame === "function") {
          window.startOnlineGame();
        }
      }
    });

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
    console.log("CODE SAISI :", roomCodeInput.value);
console.log("CODE RÉCUPÉRÉ :", code);

    if (!/^[A-Z0-9]{6}$/.test(code)) {
      throw new Error("Le code doit contenir 6 caractères.");
    }

    const roomRef = window.firebaseDb.ref("rooms/" + code);

    const result = await roomRef.transaction(room => {
      if (room === null) return;

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
        throw new Error("Salon introuvable ou inaccessible.");
      }

      if (room.status !== "waiting") {
        throw new Error("Salon non disponible : " + room.status);
      }

      if (room.guest != null) {
        throw new Error("Salon déjà occupé.");
      }

      if (room.host === user.uid) {
        throw new Error("Même compte Firebase sur les deux téléphones.");
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
