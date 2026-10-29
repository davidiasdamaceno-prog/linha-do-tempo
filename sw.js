// Service worker da Linha do Tempo: deixa o site abrir sem internet depois da primeira visita.
// Para forçar todo mundo a baixar tudo de novo, troque o número da versão.
var VERSION = 'v1';
var CORE = 'jt-core-' + VERSION;      // página, ícones e modelos (nossos arquivos)
var EXT = 'jt-ext-' + VERSION;        // fontes e scripts do Firebase (de outros domínios)
var PRECACHE = [
  './', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
  'modelos/antiguidade.json', 'modelos/idade-media.json', 'modelos/segunda-guerra.json',
  'modelos/grandes-revolucoes.json', 'modelos/revolucao-francesa.json', 'modelos/revolucao-russa-urss.json', 'modelos/guerras-guerra-fria.json'
];
var EXT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CORE).then(function (c) {
    // um arquivo que falhe não impede os outros
    return Promise.all(PRECACHE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return (k.indexOf('jt-core-') === 0 && k !== CORE) || (k.indexOf('jt-ext-') === 0 && k !== EXT); }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function networkFirst(req, cacheName, key) {
  return fetch(req).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(cacheName).then(function (c) { c.put(key || req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(key || req, { ignoreSearch: true }).then(function (r) { return r || Promise.reject(new Error('offline')); });
  });
}
function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function (c) {
    return c.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(function () { return hit; });
      return hit || net;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // a página: sempre tenta a versão mais nova; sem internet, usa a guardada (inclusive para links com #... ou ?s=)
  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    e.respondWith(networkFirst(req, CORE, 'index.html').catch(function () { return caches.match('index.html'); }));
    return;
  }
  if (url.origin === self.location.origin) {
    if (/sw\.js$/.test(url.pathname)) return;   // o próprio service worker não passa por aqui
    e.respondWith(staleWhileRevalidate(req, CORE));
    return;
  }
  // fontes e scripts do Firebase: guarda na primeira vez (o Firestore e o login nunca passam por aqui)
  if (EXT_HOSTS.indexOf(url.hostname) >= 0 && (url.hostname !== 'www.gstatic.com' || url.pathname.indexOf('/firebasejs/') === 0)) {
    e.respondWith(staleWhileRevalidate(req, EXT));
  }
});
