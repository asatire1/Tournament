/**
 * Uber Padel — Service Worker
 *
 * Provides offline caching and PWA support.
 *
 * This file MUST live in public/. Vite copies public/ to the root of dist/
 * verbatim, which is the only way it reaches the deploy as /sw.js — a service
 * worker's scope is capped by its own URL, and anything Vite processes gets a
 * content hash in its filename. Moving it back to the repo root silently drops
 * it from the build, and registration in public/shared/nav.js 404s.
 */

// Bump this on every deploy that changes JS or CSS. Assets are cached
// cache-first with no revalidation, so returning users keep running the old
// bundle until this version changes — including after a security fix.
const CACHE_VERSION = 'v32';
const PRECACHE = 'uberpadel-precache-' + CACHE_VERSION;
const RUNTIME = 'uberpadel-runtime-' + CACHE_VERSION;

// Only paths that exist in the deployed build belong here. Everything below is
// either a built HTML page or a file in public/, which Vite copies to the root
// of dist/ verbatim — that is what keeps these literal URLs stable. Anything
// Vite processes instead gets a content hash, so it can never be named here.
//
// Still absent: the per-format quick-play/*/js/ and src/ trees. Those load as
// classic <script src> tags, which Vite neither bundles nor copies, so they are
// not in dist at all and cannot be named here. That costs less than it looks —
// the cache-first handler below caches whatever it can fetch on first use, into
// a RUNTIME cache carrying the same CACHE_VERSION, so a version bump still
// evicts it. Precaching only buys availability before a file is first fetched.
//
// Verify against a real build (`npm run build && ls dist/`) before adding.
const PRECACHE_URLS = [
    '/',
    '/quick-play/',
    '/offline.html',
    '/manifest.json',
    '/favicon.ico',
    '/favicon.svg',
    '/uberpadel-icon.svg',
    '/uberpadel-icon-192.png',
    '/uberpadel-icon-512.png',
    '/shared/nav.js',
    '/shared/crypto.js',
    '/shared/format-config.js',
    '/shared/tournament-header.js',
    '/shared/tv-mode.js',
    '/shared/social-share.js',
    '/shared/result-card.js'
];

// ---- INSTALL: precache app shell ----
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(PRECACHE)
            // Cached one at a time on purpose: cache.addAll() is atomic, so a
            // single 404 (or a host redirect on a directory URL) rejects the
            // whole install, and every existing user stays pinned to the
            // previous service worker with no way to update. A precache miss
            // should cost offline availability for one file, nothing more.
            .then(cache => Promise.allSettled(
                PRECACHE_URLS.map(url => cache.add(url))
            ))
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
