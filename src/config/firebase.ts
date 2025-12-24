/**
 * Firebase Configuration
 * Uses Firebase Authentication for user management
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  EmailAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
//   updatePassword as firebaseUpdatePassword, // Removed unused
  linkWithCredential,
  User
} from 'firebase/auth';

// Firebase config - from Firebase Console
// Firebase config - from Environment Variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
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

export const registerWithEmail = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  // Send verification email after registration
  await firebaseSendEmailVerification(userCredential.user);
  return userCredential;
};

export const loginWithGoogle = () =>
  signInWithPopup(auth, googleProvider);

export const loginWithApple = () =>
  signInWithPopup(auth, appleProvider);

export const logout = () => signOut(auth);

export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);

// Email Verification
export const sendVerificationEmail = async () => {
  if (auth.currentUser) {
    await firebaseSendEmailVerification(auth.currentUser);
  }
};

export const isEmailVerified = () => {
  return auth.currentUser?.emailVerified || false;
};

// Password Reset
export const resetPassword = async (email: string) => {
  await firebaseSendPasswordResetEmail(auth, email);
};

// Password Management for OAuth Users
export const setPasswordForOAuthUser = async (password: string) => {
  if (!auth.currentUser?.email) {
    throw new Error('No hay usuario autenticado o no tiene email');
  }

  // Create email credential and link to current user
  const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
  await linkWithCredential(auth.currentUser, credential);
};

// Check if user has password authentication
export const hasPasswordAuth = () => {
  if (!auth.currentUser) return false;
  return auth.currentUser.providerData.some(p => p.providerId === 'password');
};

// Check if user came from OAuth (Google/Apple)
export const isOAuthUser = () => {
  if (!auth.currentUser) return false;
  return auth.currentUser.providerData.some(p =>
    p.providerId === 'google.com' || p.providerId === 'apple.com'
  );
};

export type { User };

