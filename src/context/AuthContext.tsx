/**
 * Authentication Context
 * Provides auth state and methods throughout the app
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  auth,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  loginWithApple,
  logout as firebaseLogout,
  onAuthChange,
  sendVerificationEmail,
  isEmailVerified,
  setPasswordForOAuthUser,
  hasPasswordAuth,
  isOAuthUser,
  User
} from '../config/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  loginApple: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  // Email verification
  resendVerificationEmail: () => Promise<void>;
  emailVerified: boolean;
  // OAuth password management
  setOAuthPassword: (password: string) => Promise<void>;
  canSetPassword: boolean;
  needsPassword: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      await loginWithEmail(email, password);
    } catch (e: any) {
      setError(translateError(e.code));
      throw e;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      setError(null);
      await registerWithEmail(email, password);
    } catch (e: any) {
      setError(translateError(e.code));
      throw e;
    }
  };

  const loginGoogle = async () => {
    try {
      setError(null);
      await loginWithGoogle();
    } catch (e: any) {
      setError(translateError(e.code));
      throw e;
    }
  };

  const loginApple = async () => {
    try {
      setError(null);
      await loginWithApple();
    } catch (e: any) {
      setError(translateError(e.code));
      throw e;
    }
  };

  const logout = async () => {
    try {
      await firebaseLogout();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const clearError = () => setError(null);

  // Email verification
  const resendVerificationEmail = async () => {
    try {
      setError(null);
      await sendVerificationEmail();
    } catch (e: any) {
      setError(translateError(e.code));
      throw e;
    }
  };

  // OAuth password management
  const setOAuthPassword = async (password: string) => {
    try {
      setError(null);
      await setPasswordForOAuthUser(password);
    } catch (e: any) {
      setError(translateError(e.code));
      throw e;
    }
  };

  // Computed properties
  const emailVerified = isEmailVerified();
  const canSetPassword = isOAuthUser() && !hasPasswordAuth();
  const needsPassword = isOAuthUser() && !hasPasswordAuth();

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      register,
      loginGoogle,
      loginApple,
      logout,
      clearError,
      resendVerificationEmail,
      emailVerified,
      setOAuthPassword,
      canSetPassword,
      needsPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Translate Firebase error codes to Spanish
function translateError(code: string): string {
  const errors: Record<string, string> = {
    'auth/invalid-email': 'Email inválido',
    'auth/user-disabled': 'Usuario deshabilitado',
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/email-already-in-use': 'Email ya registrado',
    'auth/weak-password': 'Contraseña muy débil (mínimo 6 caracteres)',
    'auth/popup-closed-by-user': 'Ventana cerrada',
    'auth/cancelled-popup-request': 'Solicitud cancelada',
    'auth/operation-not-allowed': 'Método de login no habilitado',
  };
  return errors[code] || 'Error de autenticación';
}
