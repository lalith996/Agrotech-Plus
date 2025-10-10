const CACHE_NAME = 'agrotrack-v1';
const OFFLINE_URL = '/offline';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/dashboard',
  '/products',
  '/admin/qc',
  '/offline',
  '/manifest.json',
  // Add critical CSS and JS files
  '/_next/static/css/',
  '/_next/static/js/',
];

// API endpoints to cache
const API_CACHE_URLS = [
  '/api/products',
  '/api/auth/session',
  '/api/farmer/dashboard',
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  // console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // console.log('Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  // console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              // console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method === 'GET') {
    if (url.pathname.startsWith('/api/')) {
      // API requests - Network First strategy
      event.respondWith(networkFirstStrategy(request));
    } else if (url.pathname.startsWith('/_next/static/')) {
      // Static assets - Cache First strategy
      event.respondWith(cacheFirstStrategy(request));
    } else {
      // Pages - Stale While Revalidate strategy
      event.respondWith(staleWhileRevalidateStrategy(request));
    }
  } else if (request.method === 'POST' && url.pathname.startsWith('/api/admin/qc/')) {
    // QC submissions - handle offline
    event.respondWith(handleQCSubmission(request));
  }
});

// Network First Strategy (for API calls)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // console.log('Network failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for critical API calls
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This request requires internet connection' 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache First Strategy (for static assets)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // console.log('Failed to fetch static asset:', error);
    throw error;
  }
}

// Stale While Revalidate Strategy (for pages)
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(CACHE_NAME);
      cache.then((c) => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(() => {
    // If network fails and we have no cache, show offline page
    if (!cachedResponse) {
      return caches.match(OFFLINE_URL);
    }
  });
  
  return cachedResponse || fetchPromise;
}

// Handle QC submissions when offline
async function handleQCSubmission(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Store in IndexedDB for later sync
    const requestData = await request.json();
    
    // Store offline submission
    await storeOfflineSubmission({
      url: request.url,
      method: request.method,
      data: requestData,
      timestamp: Date.now(),
      headers: Object.fromEntries(request.headers.entries())
    });
    
    // Return success response to prevent UI errors
    return new Response(
      JSON.stringify({
        success: true,
        offline: true,
        message: 'QC submission queued for sync when online'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// IndexedDB operations for offline storage
async function storeOfflineSubmission(submission) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AgroTrackOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['submissions'], 'readwrite');
      const store = transaction.objectStore('submissions');
      
      store.add({
        id: Date.now() + Math.random(),
        ...submission
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('submissions')) {
        const store = db.createObjectStore('submissions', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Background sync for offline submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'qc-submissions') {
    event.waitUntil(syncOfflineSubmissions());
  }
});

async function syncOfflineSubmissions() {
  const submissions = await getOfflineSubmissions();
  
  for (const submission of submissions) {
    try {
      const response = await fetch(submission.url, {
        method: submission.method,
        headers: submission.headers,
        body: JSON.stringify(submission.data)
      });
      
      if (response.ok) {
        await removeOfflineSubmission(submission.id);
        // console.log('Synced offline submission:', submission.id);
      }
    } catch (error) {
      // console.log('Failed to sync submission:', submission.id, error);
    }
  }
}

async function getOfflineSubmissions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AgroTrackOffline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['submissions'], 'readonly');
      const store = transaction.objectStore('submissions');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

async function removeOfflineSubmission(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AgroTrackOffline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['submissions'], 'readwrite');
      const store = transaction.objectStore('submissions');
      
      store.delete(id);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});