// 📁 src/utils/notificationHandler.ts (Web-only version)

import { getMessaging, onMessage, getToken } from 'firebase/messaging';
import { firebaseApp } from '../services/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';

// Initialize Firebase services
const messaging = getMessaging(firebaseApp);
const functions = getFunctions(firebaseApp);

/**
 * Sets up foreground web push listeners using Firebase and shows toast on push.
 */
export function setupWebPushListeners() {
  onMessage(messaging, (payload) => {
    console.log('🔔 Foreground push received (web):', payload);

    const { title, body } = payload.notification || {};
    const url = payload.data?.url ?? '/';

    if (title || body) {
      toast.custom((t) => (
        <div
          onClick={() => {
            window.location.href = url;
            toast.dismiss(t.id);
          }}
          className="bg-zinc-800 text-white px-4 py-3 rounded-xl shadow-lg max-w-xs w-full cursor-pointer transition hover:scale-[1.02]"
        >
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-xs text-zinc-300">{body}</div>
        </div>
      ));
    }
  });
}

/**
 * Registers and saves the user's web push token using the VAPID key.
 */
export async function registerWebPushToken(userId: string) {
  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (token) {
      const savePushToken = httpsCallable(functions, 'savePushToken');
      await savePushToken({ userId, token, platform: 'web' });
      console.log('✅ Web push token saved');
    }
  } catch (err) {
    console.error('❌ Failed to get or save web push token', err);
  }
}
