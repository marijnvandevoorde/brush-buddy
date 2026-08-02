/* Brush Buddy service worker — offline-first caching. */
const CACHE = "brush-buddy-v12";
const HEROES = ["fairy", "girl-dentist", "boy-dentist", "girl-super", "boy-super"];
const ASSETS = [
  ".",
  "index.html",
  "styles.css",
  "streak-logic.js",
  "app.js",
  "streaks.js",
  "manifest.webmanifest",
  ...HEROES.map((h) => `manifest-${h}.webmanifest`),
];
// Optional hero art, clips + per-buddy icons — cached if present; missing must NOT fail install.
const OPTIONAL = [
  ...HEROES.map((h) => `hero-${h}.webm`),
  ...HEROES.map((h) => `hero-${h}.png`),
  ...HEROES.flatMap((h) => [
    `icons/hero-${h}-64.png`, `icons/hero-${h}-192.png`, `icons/hero-${h}-512.png`,
    `icons/hero-${h}-maskable-512.png`, `icons/hero-${h}-apple-180.png`,
  ]),
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS).then(() => Promise.allSettled(OPTIONAL.map((u) => c.add(u)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
