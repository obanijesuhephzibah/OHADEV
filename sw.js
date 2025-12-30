const CACHE_VERSION = 'v2';
const CACHE_NAME = `oha-${CACHE_VERSION}`;
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/assets/css/main.css',
  '/assets/media/freepik-luxury-800.webp'
];

// During install, cache core assets for offline and faster repeat loads
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Helper: stale-while-revalidate for images
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request).then(resp => {
    if (resp && resp.status === 200) cache.put(request, resp.clone());
    return resp;
  }).catch(() => null);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/api/chat') {
    event.respondWith((async () => {
      const body = await event.request.clone().json().catch(() => ({ messages: [] }));
      const userMsg = body && body.messages && body.messages.length ? String(body.messages[body.messages.length - 1].content || '') : '';
      async function wiki(t){
        try {
          const s = await fetch('https://en.wikipedia.org/w/api.php?action=opensearch&search=' + encodeURIComponent(t) + '&limit=1&namespace=0&format=json&origin=*');
          const arr = await s.json();
          const title = arr && arr[1] && arr[1][0];
          if (!title) return null;
          const sum = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title));
          const js = await sum.json();
          if (js && js.extract) {
            const link = js.content_urls && js.content_urls.desktop && js.content_urls.desktop.page ? js.content_urls.desktop.page : ('https://en.wikipedia.org/wiki/' + encodeURIComponent(title));
            return js.extract + ' More: ' + link;
          }
          return null;
        } catch { return null; }
      }
      async function ddg(t){
        try {
          const r = await fetch('https://api.duckduckgo.com/?q=' + encodeURIComponent(t) + '&format=json&no_html=1&skip_disambig=1');
          const js = await r.json();
          if (js && js.AbstractText) return js.AbstractText;
          if (js && js.RelatedTopics && js.RelatedTopics.length) {
            const rt = js.RelatedTopics[0];
            if (rt && rt.Text) return rt.Text;
          }
          return null;
        } catch { return null; }
      }
      async function googleCse(t, key, cx){
        if (!t || !key || !cx) return null;
        try {
          const r = await fetch('https://www.googleapis.com/customsearch/v1?key=' + encodeURIComponent(key) + '&cx=' + encodeURIComponent(cx) + '&q=' + encodeURIComponent(t));
          const js = await r.json();
          if (js && js.items && js.items.length) {
            const it = js.items[0];
            const title = it && it.title ? it.title : '';
            const snippet = it && it.snippet ? it.snippet : '';
            const link = it && it.link ? it.link : '';
            if (title || snippet) {
              return (title ? title + ' — ' : '') + snippet + (link ? ' More: ' + link : '');
            }
          }
          return null;
        } catch { return null; }
      }
      async function serpApi(t, key){
        if (!t || !key) return null;
        try {
          const r = await fetch('https://serpapi.com/search.json?engine=google&q=' + encodeURIComponent(t) + '&api_key=' + encodeURIComponent(key));
          const js = await r.json();
          const item = js && js.organic_results && js.organic_results[0];
          if (item) {
            const title = item.title || '';
            const snippet = item.snippet || item.snippets && item.snippets[0] || '';
            const link = item.link || '';
            if (title || snippet) {
              return (title ? title + ' — ' : '') + (snippet || '') + (link ? ' More: ' + link : '');
            }
          }
          return null;
        } catch { return null; }
      }
      function smartReply(t){
        const q = (t || '').toLowerCase();
        if (!q) return 'Hi, I am OHA. Ask me anything about websites, services, pricing, MO Smart Glasses, or how to contact us.';
        if (q.includes('order') || q.includes('pre-order') || q.includes('buy')) {
          return 'To order, scroll to the “Order now” button or go to the contact section to send details. We reply quickly and confirm safe payment steps.';
        }
        if (q.includes('price') || q.includes('cost') || q.includes('pricing')) {
          return 'Pricing depends on your project scope. Share your goals and budget, and we’ll provide clear options. You can message us on WhatsApp (+44 7920 371963) or email ohadevelopment@gmail.com.';
        }
        if (q.includes('mo1') || q.includes('mo 1')) {
          return 'MO1 are everyday AI glasses: hands‑free recording, built‑in assistant, and real‑time translation. Great for study, commuting, and daily use.';
        }
        if (q.includes('mo2') || q.includes('mo 2')) {
          return 'MO2 adds a smart charging case for creators and travellers. Longer use, protection, and power on the go—ideal for content creation and events.';
        }
        if (q.includes('contact') || q.includes('call') || q.includes('whatsapp') || q.includes('email')) {
          return 'Contact OHA via WhatsApp (+44 7920 371963) or email ohadevelopment@gmail.com. We respond promptly.';
        }
        if (q.includes('services') || q.includes('website') || q.includes('web design')) {
          return 'We build high‑performing WordPress websites, plus music production and live performance. Tell us your goals and timeline to get a tailored plan.';
        }
        if (q.includes('faq') || q.includes('question')) {
          return 'Common questions: phone compatibility (yes), normal eyewear look (yes), ordering via contact first. Ask me anything specific and I’ll help.';
        }
        return 'I am OHA. Here’s a helpful approach: describe what you need (goal, budget, timeline), and I will give you clear steps or options. You can also reach us on WhatsApp (+44 7920 371963) or email ohadevelopment@gmail.com.';
      }
      let source = 'smart';
      let reply = smartReply(userMsg);
      if (!reply || reply.indexOf('I am OHA.') === 0) {
        const g = await googleCse(userMsg, (body && body.googleApiKey) || '', (body && body.googleCseCx) || '');
        if (g) {
          reply = g;
          source = 'google';
        } else {
          const s = await serpApi(userMsg, (body && body.serpApiKey) || '');
          if (s) {
            reply = s;
            source = 'serpapi';
          } else {
            const w = await wiki(userMsg);
            if (w) {
              reply = w;
              source = 'wiki';
            } else {
              const d = await ddg(userMsg);
              if (d) {
                reply = d;
                source = 'ddg';
              }
            }
          }
        }
      }
      const payload = { role: 'assistant', content: reply };
      if (source === 'smart') {
        payload.cta = { href: '#products-contact', label: 'Contact OHA' };
      }
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    })());
    return;
  }

  // Only handle GET requests for other routes
  if (event.request.method !== 'GET') return;

  // Navigation requests were previously intercepted for app-shell offline support.
  // Avoid intercepting navigation responses here so the browser can use the back/forward
  // cache (bfcache) and restore pages more reliably. Static caching of samples is still
  // handled by the install/activate steps above.

  // Styles: cache-first for CSS
  if (url.pathname.endsWith('.css') || event.request.destination === 'style') {
    event.respondWith(
      caches.match(event.request).then(resp => {
        if (resp) return resp;
        return fetch(event.request).then(net => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, net.clone());
            return net;
          });
        });
      })
    );
    return;
  }

  // Images: stale-while-revalidate
  if (url.pathname.startsWith('/assets/media') || /\.(png|jpg|jpeg|webp|svg)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Default: try cache, fall back to network
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
