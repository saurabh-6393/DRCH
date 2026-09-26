/**
 * Disaster Response Coordination Hub (DRCH) - Production Service Worker
 * Handles Web Push notifications and notificationclick navigation safely.
 * Contract §8.4 compliant.
 */

// Install event - activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate event - claim control of all open clients
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event - handle incoming emergency push payloads
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = {
        title: 'Emergency Alert',
        body: event.data.text(),
      };
    }
  } else {
    payload = {
      title: 'Emergency Alert',
      body: 'New emergency update received from DRCH.',
    };
  }

  const title = payload.title || 'Emergency Notification';
  const options = {
    body: payload.body || 'You have a new emergency update.',
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    tag: payload.tag || payload.data?.alertId || 'drch-emergency-alert',
    renotify: true,
    requireInteraction: payload.severity === 'CRITICAL' || payload.severity === 'HIGH',
    data: {
      url: payload.data?.url || '/public-map',
      alertId: payload.data?.alertId,
      timestamp: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event - safe navigation to destination
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Safely extract target path (must be relative path starting with '/' on same origin)
  let targetPath = '/public-map';
  const rawUrl = event.notification.data?.url;
  if (typeof rawUrl === 'string' && rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
    targetPath = rawUrl;
  }

  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url === targetUrl) {
            return client.focus();
          }
          if ('navigate' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
