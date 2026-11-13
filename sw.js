/* لمّات service worker: keeps the game playable without a connection once it has been opened. */
const V = 'lamma-156988f8be';
const CORE = ["./", "assets/app.268bdcfcf7.js", "assets/app.77b551e52f.css", "manifest.webmanifest", "icon.svg", "icon-192.png", "favicon-32.png", "assets/fonts/baloo-bhaijaan-2-arabic.woff2", "assets/fonts/baloo-bhaijaan-2-latin-ext.woff2", "assets/fonts/baloo-bhaijaan-2-latin.woff2", "assets/fonts/rubik-arabic.woff2", "assets/fonts/rubik-latin-ext.woff2", "assets/fonts/rubik-latin.woff2"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('lamma-') && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
/* sounds play through <audio>, which asks for byte ranges: answer those from the cached file */
async function ranged(req, res) {
  const range = req.headers.get('range'); if (!range || !res || res.status !== 200) return res;
  const buf = await res.arrayBuffer(), m = /bytes=(\d*)-(\d*)/.exec(range), n = buf.byteLength;
  let a = m && m[1] ? +m[1] : 0, b = m && m[2] ? +m[2] : n - 1;
  if (m && !m[1] && m[2]) { a = Math.max(0, n - +m[2]); b = n - 1; }
  b = Math.min(b, n - 1);
  if (a > b) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${n}` } });
  return new Response(buf.slice(a, b + 1), { status: 206, headers: { 'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${a}-${b}/${n}`, 'Content-Length': String(b - a + 1), 'Accept-Ranges': 'bytes' } });
}
async function cached(req) {
  const url = req.url.split('#')[0], c = await caches.open(V);
  let res = await c.match(url, { ignoreSearch: false });
  if (!res) {
    res = await fetch(url, { credentials: 'same-origin' });
    if (res.ok && res.status === 200) c.put(url, res.clone());
  }
  return ranged(req, res);
}
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url); if (u.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    /* only the app's own page is the offline shell: the game pages (/tarneeb …) are ordinary pages */
    const home = new URL('./', self.registration.scope).pathname, root = u.pathname === home || u.pathname === home + 'index.html';
    /* always ask the server (a 304 is cheap), so a new version shows up on the next load */
    e.respondWith(fetch(u.href, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
      if (root && res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put('./', copy)); }
      return res;
    }).catch(() => caches.match('./').then((r) => r || caches.match('index.html'))));
    return;
  }
  if (/\/(assets|flags|snd)\//.test(u.pathname) || /\.(png|svg|ico|webmanifest)$/.test(u.pathname)) e.respondWith(cached(req).catch(() => fetch(req)));
});
