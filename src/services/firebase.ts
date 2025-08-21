// 📁 src/services/firebase.ts

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import functionsService from './functionsService';
// ⚠️ Don't import getFunctions at top-level (breaks Vite + browser)

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);


// ✅ Lazy-load getFunctions only if needed (client-safe)
const getFirebaseFunctions = async () => {
  const { getFunctions } = await import('firebase/functions');
  return getFunctions(firebaseApp);
};

export { firebaseApp, auth, firestore, getFirebaseFunctions };
