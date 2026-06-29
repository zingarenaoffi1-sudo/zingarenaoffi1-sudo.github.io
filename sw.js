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

// sw.js file ke andar
const CACHE_NAME = 'zingarena-v1.1'; // Jab update karo, toh v1.2 kar do

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Ye purane service worker ko turant hata kar naya laata hai
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache); // Purana cache delete kar deta hai
                    }
                })
            );
        })
    );
});
