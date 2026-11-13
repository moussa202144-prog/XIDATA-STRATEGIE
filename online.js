
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
