// XIDATA STRATÉGIE - Service worker
// Réseau d'abord : la dernière version est toujours demandée au serveur.
// Hors ligne : les fichiers déjà mémorisés prennent le relais.

// Change ce numéro à chaque grosse mise à jour (l'ancien cache est supprimé)
const CACHE_NAME = "xidata-strategie-v3";

// Fichiers mémorisés dès l'installation (un fichier absent n'empêche pas l'installation)
const CORE_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./african-theme.css",
  "./home.css",
  "./home.js",
  "./online.js",
  "./game.js",
  "./game-online-sync.js",
  "./mode2.js",
  "./mode2-online.js",
  "./sounds.js",
  "./stats.js",
  "./firebase.js",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(CORE_FILES.map(file => cache.add(file).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    // "no-cache" : le navigateur vérifie toujours auprès du serveur
    // (GitHub Pages garde sinon les fichiers 10 minutes dans son cache)
    fetch(request, { cache: "no-cache" })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreSearch: true });

        if (cached) return cached;

        if (request.mode === "navigate") {
          return caches.match("./");
        }

        return Response.error();
      })
  );
});