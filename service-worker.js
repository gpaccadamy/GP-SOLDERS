self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("gp-academy-cache").then(cache => {
      return cache.addAll([
        "/GP-SOLDERS/",
        "/GP-SOLDERS/index.html",
        "/GP-SOLDERS/manifest.json",
        "/GP-SOLDERS/icons/icon-192.png",
        "/GP-SOLDERS/icons/icon-512.png"
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
