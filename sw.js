const CACHE_VERSION = '2026-04-28-7';
const STATIC_CACHE = `pdf-toolbox-static-${CACHE_VERSION}`;
const PAGE_CACHE = `pdf-toolbox-page-${CACHE_VERSION}`;
const RUNTIME_CACHE = `pdf-toolbox-runtime-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    './index.html',
    './merge.html',
    './split.html',
    './edit-pages.html',
    './pdf-to-img.html',
    './img-to-pdf.html',
    './watermark.html',
    './css/style.css',
    './js/common.js',
    './js/index.js',
    './js/merge.js',
    './js/split.js',
    './js/edit-pages.js',
    './js/pdf-to-img.js',
    './js/img-to-pdf.js',
    './js/watermark.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(
                STATIC_ASSETS.map((asset) => new Request(asset, { cache: 'reload' }))
            );
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

function fetchWithCacheMode(request, cacheMode) {
    if (!cacheMode) return fetch(request);
    return fetch(request, { cache: cacheMode });
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = (await cache.match(request)) || (await caches.match(request));

    const networkPromise = fetch(request)
        .then((response) => cachePut(cacheName, request, response))
        .catch(() => null);

    if (cached) {
        return cached;
    }
    const network = await networkPromise;
    return network || Response.error();
}

async function fastCacheThenUpdate(request, cacheName, fallbackUrl = './index.html') {
    const cache = await caches.open(cacheName);
    const cached = (await cache.match(request)) || (await caches.match(request));

    const networkPromise = fetchWithCacheMode(request, 'reload')
        .then((response) => cachePut(cacheName, request, response))
        .catch(() => null);

    if (cached) return cached;

    const network = await networkPromise;
    if (network) return network;

    if (!fallbackUrl) return Response.error();

    const fallback = await caches.match(fallbackUrl);
    return fallback || Response.error();
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    const isHtmlRequest = request.mode === 'navigate' || /\.html$/i.test(url.pathname);
    if (isHtmlRequest) {
        event.respondWith(fastCacheThenUpdate(request, PAGE_CACHE));
        return;
    }

    const isCoreAsset =
        url.pathname.endsWith('/css/style.css') || url.pathname.endsWith('/js/common.js');
    if (isCoreAsset) {
        event.respondWith(fastCacheThenUpdate(request, RUNTIME_CACHE, null));
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
