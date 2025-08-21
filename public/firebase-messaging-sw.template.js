/* Generated at build time */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__"
});

const messaging = firebase.messaging();

self.addEventListener('push', event => {
  const data = event?.data?.json?.() ?? {};
  const options = {
    body: data?.notification?.body || '',
    icon: '/icons/alert-icon.png',
    data: { url: `/scan/${data?.data?.symbol}/${data?.data?.scanId}` || '/' },
  };
  event.waitUntil(self.registration.showNotification(data?.notification?.title || 'Alert', options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(event.notification.data.url);
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data.url);
    })
  );
});
