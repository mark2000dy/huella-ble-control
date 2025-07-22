/**
 * HUELLA BLE PWA - Service Worker
 * Version: 2.0.1
 * Estrategia de cache optimizada para PWA
 */

const CACHE_NAME = 'huella-ble-v2.0.1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css',
  '/css/theme.css',
  '/js/app.js',
  '/js/ble-service.js',
  '/js/storage-service.js',
  '/js/chart-service.js',
  '/js/utils.js',
  '/favicon.svg',
  '/favicon.ico',
  '/icons/icon-48.png',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Archivos externos de CDN
const externalUrls = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css',
  'https://code.jquery.com/jquery-3.7.0.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell...');
        // Cachear archivos locales
        return cache.addAll(urlsToCache)
          .then(() => {
            // Intentar cachear archivos externos (no crítico si falla)
            return Promise.allSettled(
              externalUrls.map(url => 
                fetch(url)
                  .then(response => {
                    if (response.ok) {
                      return cache.put(url, response);
                    }
                  })
                  .catch(err => console.warn(`[SW] Failed to cache external: ${url}`, err))
              )
            );
          });
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

// Estrategia de Fetch
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar peticiones que no son GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Estrategia para archivos de la aplicación
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          // Cache First para archivos estáticos
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Network fallback
          return fetch(request).then(response => {
            // No cachear respuestas no exitosas
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Clonar la respuesta
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseToCache);
              });
            
            return response;
          });
        })
        .catch(() => {
          // Offline fallback para HTML
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
        })
    );
  } 
  // Estrategia para recursos externos (CDN)
  else {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Stale While Revalidate para recursos externos
            fetch(request)
              .then(response => {
                if (response && response.status === 200) {
                  const responseToCache = response.clone();
                  caches.open(CACHE_NAME)
                    .then(cache => {
                      cache.put(request, responseToCache);
                    });
                }
              })
              .catch(() => {}); // Silently fail
            
            return cachedResponse;
          }
          
          // Network con cache fallback
          return fetch(request)
            .then(response => {
              if (!response || response.status !== 200) {
                return response;
              }
              
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(request, responseToCache);
                });
              
              return response;
            })
            .catch(() => {
              console.warn(`[SW] Failed to fetch: ${request.url}`);
            });
        })
    );
  }
});

// Mensaje para skipWaiting desde la app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested');
    self.skipWaiting();
  }
});

// Sincronización en background (para futuras implementaciones)
self.addEventListener('sync', event => {
  console.log('[SW] Sync event:', event.tag);
  if (event.tag === 'sync-data') {
    // Implementar sincronización de datos cuando sea necesario
  }
});
