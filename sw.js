/* Jeeves Express: funciona sin internet una vez abierto.
   Primero intenta la red (para tener siempre la versión nueva) y si tarda o no hay, usa lo guardado. */
var V = 'jeeves-express-v2';
var FILES = ['./', 'index.html', 'juego.css', 'juego.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png', 'favicon.svg', 'musica.mp3'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return Promise.all(FILES.map(function (f) { return c.add(f).catch(function () {}); })); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var nav = r.mode === 'navigate', same = new URL(r.url).origin === location.origin;
  var cached = function () { return caches.match(r, { ignoreSearch: nav }).then(function (h) { return h || (nav ? caches.match('index.html') : undefined); }); };
  var net = fetch(r).then(function (res) { if (same && res && res.ok && !/\.mp3$/.test(r.url)) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); } return res; });
  if (/\.mp3$/.test(r.url)) { e.respondWith(caches.match(r).then(function (h) { return h || net; })); return; }
  e.respondWith(new Promise(function (ok) {
    var done = false, t = setTimeout(function () { cached().then(function (h) { if (h && !done) { done = true; ok(h); } }); }, 2500);
    net.then(function (res) { if (!done) { done = true; clearTimeout(t); ok(res); } }).catch(function () { cached().then(function (h) { if (!done) { done = true; clearTimeout(t); ok(h || Response.error()); } }); });
  }));
});
