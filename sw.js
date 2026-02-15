/**
 * Uber Padel — Service Worker
 * Provides offline caching and PWA support.
 */

const CACHE_VERSION = 'v5';
const PRECACHE = 'uberpadel-precache-' + CACHE_VERSION;
const RUNTIME = 'uberpadel-runtime-' + CACHE_VERSION;

const PRECACHE_URLS = [
    '/',
    '/quick-play/',
    '/offline.html',
    '/uberpadel-icon-512.png',
    '/uberpadel-icon-192.png',
    '/uberpadel-icon.svg',
    '/favicon.svg',
    '/favicon.ico',
    '/shared/nav.js',
    '/shared/format-config.js',
    '/shared/tournament-header.js',
    '/shared/tv-mode.js'
];

// ---- INSTALL: precache app shell ----
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(PRECACHE)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// ---- ACTIVATE: clean old caches ----
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== PRECACHE && key !== RUNTIME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// ---- FETCH: routing logic ----
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip analytics
    if (url.hostname === 'www.googletagmanager.com' ||
        url.hostname === 'www.google-analytics.com') return;

    // Skip Firebase Auth API (sensitive tokens)
    if (url.hostname === 'identitytoolkit.googleapis.com' ||
        url.hostname === 'securetoken.googleapis.com') return;

    // STRATEGY 1: Firebase Realtime Database — network-first
    if (url.hostname.includes('firebasedatabase.app') ||
        url.hostname.includes('firebaseio.com')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // STRATEGY 2: CDN resources — stale-while-revalidate
    if (url.hostname === 'cdn.tailwindcss.com' ||
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com' ||
        url.hostname === 'www.gstatic.com') {
        event.respondWith(staleWhileRevalidate(event.request));
        return;
    }

    // STRATEGY 3: Same-origin navigation (HTML pages) — network-first with offline fallback
    if (url.origin === self.location.origin && event.request.mode === 'navigate') {
        event.respondWith(networkFirstWithOfflineFallback(event.request));
        return;
    }

    // STRATEGY 4: Same-origin assets (JS, CSS, images) — cache-first
    if (url.origin === self.location.origin) {
        event.respondWith(cacheFirst(event.request));
        return;
    }
});

// ---- Strategy implementations ----

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(RUNTIME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(RUNTIME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        return cached || new Response('Offline', { status: 503 });
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(RUNTIME);
    const cached = await cache.match(request);
    const fetchPromise = fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
    }).catch(() => cached);
    return cached || fetchPromise;
}

async function networkFirstWithOfflineFallback(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(RUNTIME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return caches.match('/offline.html');
    }
}
