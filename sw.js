const CACHE_VERSION = '2026-04-28-2';
const STATIC_CACHE = `pdf-toolbox-static-${CACHE_VERSION}`;
const PAGE_CACHE = `pdf-toolbox-page-${CACHE_VERSION}`;
const RUNTIME_CACHE = `pdf-toolbox-runtime-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    './',
    './index.html',
    './merge.html',
    './split.html',
    './edit-pages.html',
    './pdf-to-img.html',
    './img-to-pdf.html',
    './watermark.html',
    './css/style.css',
    './js/common.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter(
                        (name) =>
                            name.startsWith('pdf-toolbox-static-') ||
                            name.startsWith('pdf-toolbox-page-') ||
                            name.startsWith('pdf-toolbox-runtime-')
                    )
                    .filter((name) => !name.endsWith(CACHE_VERSION))
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

function isCacheableResponse(response) {
    return !!response && response.status === 200 && response.type === 'basic';
}

async function cachePut(cacheName, request, response) {
    if (!isCacheableResponse(response)) return response;
    try {
        const cache = await caches.open(cacheName);
        await cache.put(request, response.clone());
    } catch {
        // 缓存配额不足时不影响主流程
    }
    return response;
}

async function networkFirst(request, cacheName, timeoutMs = 3500) {
    const cache = await caches.open(cacheName);
    let timeoutId = null;
    let timedOut = false;

    const timeoutPromise = new Promise((resolve) => {
        timeoutId = setTimeout(() => {
            timedOut = true;
            resolve(null);
        }, timeoutMs);
    });

    try {
        const networkPromise = fetch(request).then(async (response) => {
            if (timeoutId !== null) clearTimeout(timeoutId);
            return cachePut(cacheName, request, response);
        });
        const networkResponse = await Promise.race([networkPromise, timeoutPromise]);
        if (networkResponse) return networkResponse;
    } catch {
        // 网络失败时回退缓存
    }

    const cached = await cache.match(request);
    if (cached) return cached;

    if (timedOut) {
        try {
            const fallbackResponse = await fetch(request);
            return cachePut(cacheName, request, fallbackResponse);
        } catch {
            // 忽略，交给后续兜底
        }
    }

    const fallback = await caches.match('./index.html');
    return fallback || Response.error();
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const networkPromise = fetch(request)
        .then((response) => cachePut(cacheName, request, response))
        .catch(() => null);

    if (cached) {
        return cached;
    }
    const network = await networkPromise;
    return network || Response.error();
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, PAGE_CACHE));
        return;
    }

    const isStaticAsset =
        /\/(?:css|js)\//.test(url.pathname) ||
        /\.(?:css|js|json|svg|png|jpg|jpeg|webp|gif|woff2?)$/i.test(url.pathname);

    if (isStaticAsset) {
        event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => cachePut(RUNTIME_CACHE, request, response))
            .catch(() => caches.match(request))
    );
});
