// Сохраняет страницу и модель в телефоне, чтобы всё работало без интернета.
// При обновлении модели или страницы увеличь номер версии ниже.
const CACHE = "grape-doctor-v4";
const FILES = [
  "./", "index.html", "model_info.json", "manifest.webmanifest",
  "grape_model.part1", "grape_model.part2",
  "ort.wasm.min.js", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm",
  "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Свои файлы: сначала из памяти телефона, иначе из сети
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) =>
        hit || fetch(req).catch(() => (req.mode === "navigate" ? caches.match("index.html") : Response.error()))
      )
    );
  } else if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) {
    // Шрифты: берём из памяти, а в фоне обновляем
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req).then((r) => { c.put(req, r.clone()); return r; }).catch(() => hit);
          return hit || net;
        })
      )
    );
  }
});
