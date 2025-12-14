/**
 * Firebase Configuration
 * Uses Firebase Authentication for user management
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

// Firebase config - from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCy6KzSqt5-751gkdX_S-7XvwK2Ly8fJSo",
  authDomain: "pk-grower.firebaseapp.com",
  projectId: "pk-grower",
  storageBucket: "pk-grower.firebasestorage.app",
  messagingSenderId: "664237832244",
  appId: "1:664237832244:web:14f6b72c15118cb18f7261",
  measurementId: "G-7FY8Z2522E"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Auth Providers
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

// Auth Functions
export const loginWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const loginWithGoogle = () =>
  signInWithPopup(auth, googleProvider);

export const loginWithApple = () =>
  signInWithPopup(auth, appleProvider);

export const logout = () => signOut(auth);

export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);

export type { User };
