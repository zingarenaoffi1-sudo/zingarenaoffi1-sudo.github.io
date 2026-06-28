const CACHE_NAME = 'zing-arena-v1';

// Jin files ko tu offline ke liye save karna chahta hai
const ASSETS = [
  '/',
  '/index.html',
  '/player.html',
  '/namegen.html',
  '/tools.html',
  '/browser.html',
  '/translator.html',
  '/speedtest.html',
  '/coderunner.html',
  '/icon.png',
  '/icon-512.png'
];

// Install Event: Files ko Cache mein load karna
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Fetch Event: Pehle Cache check karna, agar na mile toh Network se fetch karna
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});

// Activate Event: Purana cache hatana (jab version update ho)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});
