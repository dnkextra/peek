/* Peek — service worker
   1. caches the app shell so it opens offline
   2. catches POSTs from the Android share sheet and parks the photos for the page

   Deliberately dumb about the photos: it stores the raw blobs and lets index.html
   do the import, so EXIF parsing, labelling and thumbnails live in exactly one place. */

const CACHE = 'peek-v4';
const SHELL = ['./','./index.html','./manifest.webmanifest',
               './icon-192.png','./icon-512.png','./icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function openDB(){
  return new Promise((res, rej) => {
    const r = indexedDB.open('peek', 2);
    r.onupgradeneeded = e => {
      const db = r.result;
      if (e.oldVersion < 2) {
        ['frames','sets','meta'].forEach(n => { if (db.objectStoreNames.contains(n)) db.deleteObjectStore(n); });
        db.createObjectStore('frames', { keyPath:'id' }).createIndex('setId','setId');
        db.createObjectStore('sets', { keyPath:'id' });
        db.createObjectStore('meta');
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function park(files){
  const items = [];
  for (const f of files) {
    if (!f || !f.size) continue;
    items.push({ blob: f, name: f.name || '', type: f.type || '' });
  }
  if (!items.length) return 0;
  const db = await openDB();
  await new Promise((res, rej) => {
    const t = db.transaction('meta', 'readwrite');
    t.objectStore('meta').put({ items, at: Date.now() }, 'pending');
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  });
  return items.length;
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target/')) {
    event.respondWith((async () => {
      try {
        const form = await event.request.formData();
        const n = await park(form.getAll('images'));
        return Response.redirect(n ? './?shared=1' : './?shared=0', 303);
      } catch (_) {
        return Response.redirect('./?shared=0', 303);
      }
    })());
    return;
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch:true }).then(hit => hit || fetch(event.request)
      .then(res => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match('./index.html')))
  );
});
