// 📁 src/screens/AuthScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '@services/firebase';
import { useUser } from '@context/UserContext';
import Input from '@components/Input';
import Button from '@components/Button';

const AuthScreen = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { firebaseUser, role, loading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (firebaseUser && role) {
      navigate('/dashboard', { replace: true });
    }
  }, [firebaseUser, role, navigate]);

  if (loading) {
    return <div className="text-white text-center p-10">Loading...</div>;
  }

  const handleAuth = async () => {
    setError('');
    try {
      if (isRegistering) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(firestore, 'users', userCred.user.uid), { role: 'free' });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('❌ Auth Error', err.code, err.message);
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No user found with that email.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password.');
          break;
        case 'auth/email-already-in-use':
          setError('That email is already registered.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/weak-password':
          setError('Password should be at least 6 characters.');
          break;
        default:
          setError(`Authentication failed: ${err.message}`);
      }
    }
  };

  const handleGuestLogin = async () => {
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error('❌ Guest Login Error', err.code, err.message);
      setError(`Guest login failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-[#1E1E1E] text-white rounded-2xl shadow-lg animate-fadeIn space-y-6">
      <h1 className="text-2xl font-bold text-center">
        {isRegistering ? 'Register' : 'Login'}
      </h1>

      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        animate
      />

      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        animate
      />

      {error && (
        <div className="text-sm bg-red-600 text-white px-4 py-2 rounded-xl text-center">
          {error}
        </div>
      )}

      <Button fullWidth onClick={handleAuth}>
        {isRegistering ? 'Create Account' : 'Log In'}
      </Button>

      <button
        onClick={() => setIsRegistering(!isRegistering)}
        className="w-full text-sm text-[#B0B0B0] hover:text-white transition"
      >
        {isRegistering ? 'Already have an account?' : 'Need to create one?'}
      </button>

      <div className="border-t border-[#2A2A2A] pt-4">
        <Button variant="secondary" fullWidth onClick={handleGuestLogin}>
          Continue as Guest
        </Button>
      </div>
    </div>
  );
};

export default AuthScreen;
