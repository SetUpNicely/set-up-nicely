import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize the app using your local Firebase CLI credentials
initializeApp({ credential: applicationDefault() });

export const firestore = getFirestore();
export const messaging = getMessaging();
