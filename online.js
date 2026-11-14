// XIDATA STRATEGIE - Salons multijoueurs + recherche automatique d'adversaire
console.log("ONLINE.JS DÉMARRÉ");

const createRoomBtn = document.querySelector("#createRoomBtn");
const joinRoomBtn = document.querySelector("#joinRoomBtn");
const quickMatchBtn = document.querySelector("#quickMatchBtn");
const cancelQuickBtn = document.querySelector("#cancelQuickBtn");
const roomCodeInput = document.querySelector("#roomCode");
const invitationArea = document.querySelector("#invitationArea");
const invitationCode = document.querySelector("#invitationCode");
const onlineStatus = document.querySelector("#onlineStatus");
const copyInvitationBtn = document.querySelector("#copyInvitationBtn");
const shareInvitationBtn = document.querySelector("#shareInvitationBtn");

window.currentRoomCode = null;
window.currentRoomRole = null;

// Marqueur visible : si tu ne vois pas "v4", c'est l'ancienne version en cache
onlineStatus.textContent = "Mode hors ligne (v4)";

// Pré-remplir le code si on arrive par un lien ?room=CODE
const roomParam = new URLSearchParams(location.search).get("room");
if (roomParam) roomCodeInput.value = roomParam.toUpperCase();

// Réglages de la recherche automatique
const QUEUE_PATH = "matchmaking/waiting";
const QUEUE_FRESH_MS = 30000;     // une attente plus ancienne est ignorée
const HEARTBEAT_MS = 10000;       // rafraîchit la présence dans la file
const SEARCH_TIMEOUT_MS = 90000;  // abandon automatique de la recherche
let searching = null;

// Le jeu en ligne n'existe que pour le Mode 1 (Classique)
function forceClassicMode() {
  const gm = document.querySelector("#gameMode");
  if (gm.value !== "classic") {
    gm.value = "classic";
    gm.dispatchEvent(new Event("change"));
  }
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ---------- Briques communes ----------

// Crée un salon "en attente" et renvoie son code
async function createRoomRecord(user, quick) {
  for (let i = 0; i < 5; i++) {
    const code = generateRoomCode();
    const result = await window.firebaseDb
      .ref("rooms/" + code)
      .transaction(room => {
        if (room !== null) return; // code déjà pris
        return {
          host: user.uid,
          status: "waiting",
          createdAt: Date.now(),
          quick: !!quick
        };
      });
    if (result.committed) return code;
  }
  throw new Error("Impossible de créer un code, réessaie.");
}

// Rejoint le salon d'un code (lance une erreur si impossible)
async function joinRoom(code, user) {
  const roomRef = window.firebaseDb.ref("rooms/" + code);

  // Charger le salon d'abord : le cache local n'est plus vide
  await roomRef.once("value");

  const result = await roomRef.transaction(room => {
    if (room === null) return null; // cache vide : Firebase relance avec la vraie valeur

    if (
      room.status !== "waiting" ||
      room.guest != null ||
      room.host === user.uid
    ) {
      return; // refus réel
    }

    room.guest = user.uid;
    room.status = "playing";
    return room;
  });

  const finalRoom = result.snapshot.val();

  if (!result.committed || !finalRoom || finalRoom.guest !== user.uid) {
    const check = await roomRef.once("value");
    const room = check.val();

    console.log("DIAGNOSTIC SALON :", {
      code: code,
      room: room,
      uid: user.uid,
      committed: result.committed
    });

    if (!room) throw new Error("Salon introuvable ou inaccessible.");
    if (room.status !== "waiting") throw new Error("Salon non disponible : " + room.status);
    if (room.guest != null) throw new Error("Salon déjà occupé.");
    if (room.host === user.uid) throw new Error("Même compte Firebase sur les deux téléphones.");
    throw new Error("Transaction refusée par Firebase. Vérifier les règles.");
  }

  window.currentRoomCode = code;
  window.currentRoomRole = "guest";

  if (typeof window.startOnlineGame === "function") {
    window.startOnlineGame();
  } else {
    throw new Error("La synchronisation du jeu n'est pas chargée.");
  }
}

// Attend qu'un adversaire rejoigne le salon, puis appelle onStart
function waitForGuest(code, onStart) {
  const statusRef = window.firebaseDb.ref("rooms/" + code + "/status");
  const listener = statusRef.on("value", snap => {
    if (snap.val() === "playing") {
      statusRef.off("value", listener);
      onStart();
    }
  });
  return () => statusRef.off("value", listener);
}

async function removeRoom(code) {
  try {
    await window.firebaseDb.ref("rooms/" + code).remove();
  } catch (error) {
    console.warn("Suppression du salon impossible :", error);
  }
}

// ---------- CRÉER UNE PARTIE (avec code) ----------
createRoomBtn.addEventListener("click", async () => {
  try {
    createRoomBtn.disabled = true;
    forceClassicMode();
    onlineStatus.textContent = "Création de la partie...";

    const user = await window.firebaseReady;
    const code = await createRoomRecord(user, false);

    window.currentRoomCode = code;
    window.currentRoomRole = "host";

    invitationCode.textContent = code;
    invitationArea.hidden = false;
    onlineStatus.textContent = "Partie créée ! Envoie le code à ton ami.";

    waitForGuest(code, () => {
      onlineStatus.textContent = "Adversaire connecté !";
      if (typeof window.startOnlineGame === "function") {
        window.startOnlineGame();
      }
    });

  } catch (error) {
    onlineStatus.textContent = "Erreur : " + error.message;
    console.error(error);
  } finally {
    createRoomBtn.disabled = false;
  }
});

// ---------- REJOINDRE UNE PARTIE AVEC UN CODE ----------
joinRoomBtn.addEventListener("click", async () => {
  try {
    joinRoomBtn.disabled = true;
    forceClassicMode();

    const user = await window.firebaseReady;
    const code = roomCodeInput.value.trim().toUpperCase();

    if (!/^[A-Z0-9]{6}$/.test(code)) {
      throw new Error("Le code doit contenir 6 caractères.");
    }

    await joinRoom(code, user);

    onlineStatus.textContent =
      "Partie rejointe ! Synchronisation du plateau en cours.";

  } catch (error) {
    onlineStatus.textContent = "Erreur : " + error.message;
    console.error(error);
  } finally {
    joinRoomBtn.disabled = false;
  }
});

// ---------- RECHERCHE AUTOMATIQUE D'ADVERSAIRE ----------
function setBusy(busy) {
  createRoomBtn.disabled = busy;
  joinRoomBtn.disabled = busy;
  if (quickMatchBtn) quickMatchBtn.disabled = busy;
  if (cancelQuickBtn) cancelQuickBtn.hidden = !busy;
}

function stopSearching() {
  if (!searching) return;
  searching.stopListening();
  clearInterval(searching.heartbeat);
  clearTimeout(searching.timeout);
  searching = null;
}

// Aucun adversaire pour l'instant : on attend dans la file
function startWaiting(code) {
  const queueRef = window.firebaseDb.ref(QUEUE_PATH);

  window.currentRoomCode = code;
  window.currentRoomRole = "host";

  const stopListening = waitForGuest(code, () => {
    stopSearching();
    setBusy(false);
    onlineStatus.textContent = "Adversaire trouvé ! La partie commence.";
    if (typeof window.startOnlineGame === "function") {
      window.startOnlineGame();
    }
  });

  // Signale régulièrement qu'on est toujours là
  const heartbeat = setInterval(() => {
    queueRef.transaction(entry =>
      entry && entry.code === code ? { ...entry, ts: Date.now() } : undefined
    ).catch(() => {});
  }, HEARTBEAT_MS);

  const timeout = setTimeout(() => {
    cancelSearch("Aucun adversaire trouvé. Réessaie, ou joue contre l'IA.");
  }, SEARCH_TIMEOUT_MS);

  searching = { code, stopListening, heartbeat, timeout };
  onlineStatus.textContent = "Recherche d'un adversaire...";
}

async function cancelSearch(message) {
  if (!searching) return;
  const code = searching.code;

  try {
    const roomRef = window.firebaseDb.ref("rooms/" + code);
    await roomRef.once("value");

    // On ne supprime le salon que si personne ne vient de le rejoindre
    const res = await roomRef.transaction(room =>
      room && room.status === "waiting" ? null : undefined
    );
    const room = res.snapshot.val();

    if (!res.committed && room && room.status === "playing") {
      stopSearching();
      setBusy(false);
      onlineStatus.textContent = "Adversaire trouvé ! La partie commence.";
      if (typeof window.startOnlineGame === "function") {
        window.startOnlineGame();
      }
      return;
    }

    stopSearching();
    window.currentRoomCode = null;
    window.currentRoomRole = null;

    await window.firebaseDb.ref(QUEUE_PATH).transaction(entry =>
      entry && entry.code === code ? null : undefined
    );
  } catch (error) {
    console.error(error);
    stopSearching();
    window.currentRoomCode = null;
    window.currentRoomRole = null;
  }

  setBusy(false);
  onlineStatus.textContent = message || "Recherche annulée.";
}

async function quickMatch() {
  if (searching || window.currentRoomCode) {
    onlineStatus.textContent = "Une partie en ligne est déjà en cours.";
    return;
  }

  let waiting = false;
  try {
    forceClassicMode();
    setBusy(true);
    onlineStatus.textContent = "Recherche d'un adversaire...";

    const user = await window.firebaseReady;
    const queueRef = window.firebaseDb.ref(QUEUE_PATH);

    for (let attempt = 0; attempt < 3; attempt++) {
      await queueRef.once("value"); // amorce le cache local

      // 1. Je prépare mon salon (il doit exister avant d'être visible dans la file)
      const myCode = await createRoomRecord(user, true);

      // 2. Je prends la place d'un joueur en attente, sinon j'attends à mon tour
      let matched = null;
      await queueRef.transaction(entry => {
        matched = null;
        if (entry && entry.uid !== user.uid && Date.now() - entry.ts < QUEUE_FRESH_MS) {
          matched = entry;
          return null; // sa place dans la file est libérée
        }
        return { uid: user.uid, code: myCode, ts: Date.now() };
      });

      if (matched) {
        await removeRoom(myCode); // inutile : je rejoins le salon de l'autre
        try {
          await joinRoom(matched.code, user);
          onlineStatus.textContent =
            "Adversaire trouvé ! Synchronisation du plateau en cours.";
          return;
        } catch (error) {
          console.warn("Salon de l'adversaire indisponible, nouvel essai :", error);
          continue;
        }
      }

      startWaiting(myCode);
      waiting = true;
      return;
    }

    throw new Error("Aucun adversaire disponible, réessaie.");

  } catch (error) {
    onlineStatus.textContent = "Erreur : " + error.message;
    console.error(error);
  } finally {
    if (!waiting) setBusy(false);
  }
}

if (quickMatchBtn) quickMatchBtn.addEventListener("click", quickMatch);
if (cancelQuickBtn) cancelQuickBtn.addEventListener("click", () => cancelSearch());

// ---------- COPIER LE CODE ----------
copyInvitationBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(window.currentRoomCode);
    onlineStatus.textContent = "Code copié !";
  } catch (error) {
    onlineStatus.textContent = "Copie impossible. Note le code affiché.";
  }
});

// ---------- PARTAGER LE LIEN ----------
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
