import { onCall } from 'firebase-functions/v2/https';
import { firestore } from './firebase.js'; // ✅ Correct import (you exported 'firestore', not 'firebase')

// Callable function to save a push token to /users/{userId}/fcmTokens/{token}
export const savePushToken = onCall(async (request) => {
  const uid = request.auth?.uid;
  const token = request.data?.token;

  if (!uid) {
    throw new Error('Unauthenticated request.');
  }

  if (!token || typeof token !== 'string' || token.length < 10) {
    throw new Error('Invalid or missing token.');
  }

  const ref = firestore.doc(`users/${uid}/fcmTokens/${token}`);
  await ref.set({
    createdAt: Date.now(),
    platform: request.data?.platform || 'web',
  });

  return { success: true };
});
