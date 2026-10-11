// ============================================================================
// UP POLICE DIRECTORY - PWA SERVICE WORKER
// Provides offline capability, instant load cache, and network resiliency
// ============================================================================

const CACHE_NAME = 'up-police-cache-v10';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/police-icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Static assets cache notice:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Do not intercept Firebase or external API calls
  const url = new URL(event.request.url);
  if (url.origin.includes('firestore.googleapis.com') || 
      url.origin.includes('firebaseio.com') ||
      url.origin.includes('identitytoolkit.googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache internal static scripts, styles, images
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network fails (offline)
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Return root page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

// Handle incoming notification clicks to bring app into focus
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'उत्तर प्रदेश पुलिस पोर्टल', body: event.data ? event.data.text() : 'नई सूचना प्राप्त हुई।' };
  }

  const title = data.title || '🚨 उत्तर प्रदेश पुलिस पोर्टल';
  const options = {
    body: data.body || 'नया पुलिस अलर्ट प्राप्त हुआ है।',
    icon: '/police-icon.svg',
    badge: '/favicon.ico',
    vibrate: [500, 200, 500],
    data: data
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
