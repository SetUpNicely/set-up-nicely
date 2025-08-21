// 📁 /firebase/functions/src/sendNotification.ts

import { messaging } from './firebase.js';
import { Message } from 'firebase-admin/messaging';

/**
 * Sends a push notification via Firebase Cloud Messaging (FCM).
 * @param token - The device FCM token.
 * @param title - The notification title.
 * @param body - The message body content.
 * @param data - Optional routing or context metadata (e.g., scanId, symbol)
 */
export async function sendNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const message: Message = {
    token,
    notification: {
      title,
      body,
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'alerts', // 🔔 Required for Android 8+
        clickAction: 'FLUTTER_NOTIFICATION_CLICK', // 🚀 Can customize if not using Flutter
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          sound: 'default',
          category: 'alerts', // 🔔 Optional routing tag for iOS
        },
      },
    },
    webpush: {
      headers: {
        Urgency: 'high',
      },
      notification: {
        icon: '/icons/alert-icon.png',
        badge: '/icons/badge-icon.png', // ✅ Optional for web/PWA
      },
    },
    data: {
      click_action: 'FLUTTER_NOTIFICATION_CLICK', // 🔁 Ensures tap opens app
      ...data, // 🧠 Custom metadata for in-app routing (e.g., scanId, symbol)
    },
  };

  try {
    const response = await messaging.send(message);
    console.log(`✅ FCM notification sent to ${token}:`, response);
    return response;
  } catch (error) {
    console.error('❌ Error sending FCM notification:', error);
    throw error;
  }
}
