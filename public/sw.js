/* ══════════════════════════════════════════════════════════════════════════════
 *  GestioPro — Service Worker (PWA)
 *
 *  Objectif : rendre l'application installable sur Android et iPhone
 *  (icône, plein écran, lancement direct), sans magasin d'applications.
 *
 *  Règle importante : le HTML est toujours récupéré depuis le réseau
 *  (« réseau d'abord »). Ainsi, une mise à jour déployée sur Vercel est
 *  visible immédiatement, et le cache ne sert qu'en cas de coupure.
 *  Seuls les fichiers d'assets (nomвые avec un hash, donc immuables) sont
 *  servis depuis le cache.
 * ══════════════════════════════════════════════════════════════════════════════ */

const CACHE_NAME = "gestiopro-v1";

/* Le minimum nécessaire pour ouvrir l'application hors connexion */
const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined) /* un fichier manquant ne doit pas bloquer l'installation */
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  /* Les appels à Supabase (autre domaine) ne sont jamais mis en cache :
     les données de l'entreprise doivent toujours venir du serveur. */
  if (url.origin !== self.location.origin) return;

  /* Page ouverte (HTML) : réseau d'abord, cache en secours */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  /* Fichiers compilés par Vite (nom avec un hash = contenu immuable) :
     cache d'abord, c'est instantané et sans risque. */
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
});
