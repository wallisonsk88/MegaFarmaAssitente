/* Assistente Digital MegaFarma — Service Worker */

const CACHE_NAME = 'megafarma-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
];

// Install — cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Only handle GET requests and http/https protocols
    if (event.request.method !== 'GET' || !url.startsWith('http')) {
        return;
    }

    // Skip API calls — always go to network and don't cache
    if (url.includes('/chat') || url.includes('/config')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Only cache successful, same-origin/standard responses
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, clone).catch(() => { });
                });
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
