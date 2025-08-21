// 📁 /public/firebase-messaging-sw.js

// ✅ Load Firebase SDKs required for messaging in service workers
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ✅ Initialize Firebase (REQUIRED!)
firebase.initializeApp({
  apiKey: "AIzaSyBpjQYdWpOBs0ijZXZ503OK-lZR5Fp4RkY",
  authDomain: "set-up-nicely-v1.firebaseapp.com",
  projectId: "set-up-nicely-v1",
  messagingSenderId: "1093056617220",
  appId: "1:1093056617220:web:792f99aa5453cc303c8e51",
});

// ✅ Initialize Messaging
const messaging = firebase.messaging();

// ✅ Handle Push
self.addEventListener('push', function (event) {
  const data = event.data.json();

  const options = {
    body: data.notification.body,
    icon: '/icons/alert-icon.png',
    data: {
      url: `/scan/${data.data?.symbol}/${data.data?.scanId}` || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.notification.title, options)
  );
});

// ✅ Handle Notification Click
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(event.notification.data.url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
