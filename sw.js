/* ================================================
   ORVANE - Service Worker
   Enables offline mode + makes the site installable as a PWA
================================================ */

const CACHE_VERSION = 'orvane-v1.0.0';
const CACHE_NAME = CACHE_VERSION;

// Core files cached on install (app shell)
const CORE_ASSETS = [
    './',
    './index.html',
    './admin.html',
    './manifest.json',
    './assets/logo.png',
    './css/style.css',
    './js/products-data.js',
    './js/products.js',
    './js/main.js',
    './js/admin.js',
    './pages/products.html',
    './pages/about.html',
    './pages/contact.html'
];

// External assets (best-effort cache)
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Open+Sans:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// === Install: cache core assets ===
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(CORE_ASSETS).catch((err) => {
                console.warn('[SW] Some core assets failed to cache:', err);
                // Cache files individually so one failure doesn't break the rest
                return Promise.all(
                    CORE_ASSETS.map((url) =>
                        cache.add(url).catch((e) => console.warn('Skipped:', url, e))
                    )
                );
            });
        })
    );
});

// === Activate: clean up old caches ===
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((k) => k !== CACHE_NAME && k.startsWith('orvane-'))
                    .map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// === Fetch strategies ===
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Only handle GET
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // === Strategy 1: Stale-while-revalidate for HTML/CSS/JS ===
    if (req.destination === 'document' || req.destination === 'style' || req.destination === 'script') {
        event.respondWith(
            caches.match(req).then((cached) => {
                const fetchPromise = fetch(req).then((networkRes) => {
                    if (networkRes && networkRes.status === 200) {
                        const clone = networkRes.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                    }
                    return networkRes;
                }).catch(() => cached);
                return cached || fetchPromise;
            })
        );
        return;
    }

    // === Strategy 2: Cache-first for images (long-lived) ===
    if (req.destination === 'image') {
        event.respondWith(
            caches.match(req).then((cached) => {
                if (cached) return cached;
                return fetch(req).then((networkRes) => {
                    if (networkRes && networkRes.status === 200 && networkRes.type !== 'opaque') {
                        const clone = networkRes.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                    }
                    return networkRes;
                }).catch(() => {
                    // Return a tiny transparent SVG as fallback for failed images
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                });
            })
        );
        return;
    }

    // === Strategy 3: Network-first for everything else ===
    event.respondWith(
        fetch(req).then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
                const clone = networkRes.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            }
            return networkRes;
        }).catch(() => caches.match(req))
    );
});

// === Listen for skip-waiting message from page ===
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
