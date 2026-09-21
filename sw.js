// sw.js
const CACHE_VERSION = 'v1'; // при желании — меняй вручную, чтобы форсить сброс
const RUNTIME = 'kinoclub-runtime-' + CACHE_VERSION;

self.addEventListener('install', () => {
    self.skipWaiting(); // новый SW активируется сразу, не ждёт закрытия вкладок
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== RUNTIME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim()) // берём контроль над всеми открытыми вкладками
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // Нас интересует только свой origin и только GET
    if (req.method !== 'GET' || url.origin !== location.origin) return;

    const isHTML = req.headers.get('accept')?.includes('text/html');
    const isAsset = url.pathname.endsWith('.css') || url.pathname.endsWith('.js');

    if (isHTML || isAsset) {
        // network-first: сначала сеть, при ошибке — кэш
        event.respondWith(
            fetch(req)
                .then(res => {
                    const copy = res.clone();
                    caches.open(RUNTIME).then(c => c.put(req, copy));
                    return res;
                })
                .catch(() => caches.match(req))
        );
        return;
    }

    // Картинки, шрифты, json — можно cache-first
    event.respondWith(
        caches.match(req).then(cached => cached || fetch(req).then(res => {
            const copy = res.clone();
            caches.open(RUNTIME).then(c => c.put(req, copy));
            return res;
        }))
    );
});