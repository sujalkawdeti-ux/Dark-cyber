// OmniMind Vision OS - Service Worker
// Ye service worker "Share Target" ko handle karta hai — jab koi doosri app
// (Photos, Gallery, Browser) se image/text "Share" ki jaati hai, ye request
// yahin intercept hoti hai aur data page tak pahunchaya jaata hai.

const CACHE_NAME = 'omnimind-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Share Target POST request ko intercept karein
  if (event.request.method === 'POST' && url.pathname.endsWith('index.html')) {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const title = formData.get('shared_title') || '';
    const text = formData.get('shared_text') || '';
    const sharedUrl = formData.get('shared_url') || '';
    const file = formData.get('shared_image');

    let base64Image = null;
    if (file && file.size > 0) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      base64Image = `data:${file.type};base64,${btoa(binary)}`;
    }

    // Data ko temporarily is worker ke andar store karein, page ise load hote hi maang lega
    const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    const payload = { title, text, sharedUrl, base64Image };

    // Client ko turant redirect karke message bhejte hain
    return Response.redirect('./index.html?shared=1', 303).then(async (res) => {
      // Store in a cache so the newly-loading page can retrieve it
      const cache = await caches.open(CACHE_NAME);
      await cache.put('shared-data', new Response(JSON.stringify(payload)));
      return res;
    });
  } catch (err) {
    return Response.redirect('./index.html', 303);
  }
}
