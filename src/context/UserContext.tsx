//src/context/UserContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '@services/firebase';
import { registerWebPushToken } from '../utils/notificationHandler';
import { ScanMatchResult } from '@data/ScanTypes';

type UserRole = 'guest' | 'free' | 'paid' | 'pro' | 'admin';

export interface UserSettings {
  useConfidenceScore: boolean;
  alertsEnabled: boolean;
  showWatchlist: boolean;
  defaultTimeframe: '1m' | '5m' | '15m' | '1h' | '1d';
  minPVS: number;
  alertFrequency: 'low' | 'normal' | 'high';
}

interface AppUser {
  firebaseUser: FirebaseUser | null;
  uid: string | null;
  role: UserRole;
  loading: boolean;
  userSettings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  resetUserSettings: () => void;

  // 🆕 Journal Support
  journalEntry: ScanMatchResult | null;
  openJournal: (entry: ScanMatchResult) => void;
  closeJournal: () => void;
}

const defaultSettings: UserSettings = {
  useConfidenceScore: true,
  alertsEnabled: true,
  showWatchlist: true,
  defaultTimeframe: '5m',
  minPVS: 60,
  alertFrequency: 'normal',
};

const UserContext = createContext<AppUser>({
  firebaseUser: null,
  uid: null,
  role: 'guest',
  loading: true,
  userSettings: defaultSettings,
  updateSetting: () => {},
  resetUserSettings: () => {},

  // Journal
  journalEntry: null,
  openJournal: () => {},
  closeJournal: () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole>('guest');
  const [loading, setLoading] = useState(true);
  const [userSettings, setUserSettings] = useState<UserSettings>(defaultSettings);
  const [tokenRegistered, setTokenRegistered] = useState(false);

  // Journal
  const [journalEntry, setJournalEntry] = useState<ScanMatchResult | null>(null);
  const openJournal = (entry: ScanMatchResult) => setJournalEntry(entry);
  const closeJournal = () => setJournalEntry(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      console.log('👤 Auth state changed:', user);

      if (user) {
        const docRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        let finalRole: UserRole = 'free';
        let firestoreSettings: Partial<UserSettings> = {};

        if (docSnap.exists()) {
          const data = docSnap.data();
          const firestoreRole = data.role as UserRole;
          firestoreSettings = data.userSettings as Partial<UserSettings>;

          if (user.email === 'spencer.e.reed479@gmail.com') {
            finalRole = 'pro';
          } else if (['free', 'paid', 'pro', 'admin'].includes(firestoreRole)) {
            finalRole = firestoreRole;
          }
        } else {
          finalRole = user.email === 'spencer.e.reed479@gmail.com' ? 'pro' : 'free';
          await setDoc(docRef, {
            role: finalRole,
            userSettings: defaultSettings,
          });
        }

        setRole(finalRole);
        setUserSettings({ ...defaultSettings, ...firestoreSettings });

        if (!tokenRegistered) {
          try {
            await registerWebPushToken(user.uid);
            setTokenRegistered(true);
          } catch (err) {
            console.error('❌ Web push token registration failed:', err);
          }
        }
      } else {
        setRole('guest');
        setUserSettings(defaultSettings);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [tokenRegistered]);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const updated = { ...userSettings, [key]: value };
    setUserSettings(updated);

    if (firebaseUser) {
      const ref = doc(firestore, 'users', firebaseUser.uid);
      setDoc(ref, { userSettings: updated }, { merge: true });
    }
  };

  const resetUserSettings = () => {
    setUserSettings(defaultSettings);
    if (firebaseUser) {
      const ref = doc(firestore, 'users', firebaseUser.uid);
      setDoc(ref, { userSettings: defaultSettings }, { merge: true });
    }
  };

  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_FORCE_ROLE) {
      const overrideRole = import.meta.env.VITE_DEV_FORCE_ROLE as UserRole;
      if (overrideRole !== role) setRole(overrideRole);
    }
  }, [role]);

  return (
    <UserContext.Provider
      value={{
        firebaseUser,
        uid: firebaseUser?.uid ?? null,
        role,
        loading,
        userSettings,
        updateSetting,
        resetUserSettings,
        journalEntry,
        openJournal,
        closeJournal,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
