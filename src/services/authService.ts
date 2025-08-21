// 📁 Location: /src/services/authService.ts

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';

const authService = {
  // 🔹 Register with email and password
  async register(email: string, password: string): Promise<UserCredential> {
    return await createUserWithEmailAndPassword(auth, email, password);
  },

  // 🔹 Login with email and password
  async login(email: string, password: string): Promise<UserCredential> {
    return await signInWithEmailAndPassword(auth, email, password);
  },

  // 🔹 Sign in anonymously (guest mode)
  async signInAnonymously(): Promise<UserCredential> {
    return await signInAnonymously(auth);
  },

  // 🔹 Logout current user
  async logout(): Promise<void> {
    return await signOut(auth);
  },
};

export default authService;
