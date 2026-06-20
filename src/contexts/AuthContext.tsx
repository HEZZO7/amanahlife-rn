/**
 * AuthContext — React Native
 * Migrated from app/frontend/src/contexts/AuthContext.tsx
 * Replaces window.location.href with expo-router navigation
 * Replaces localStorage.clear() with AsyncStorage.clear()
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { configureGoogleSignIn, isGoogleConfigured } from '../lib/googleAuth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Configure native Google Sign-In as early as possible.
  configureGoogleSignIn();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    if (!isGoogleConfigured()) {
      return { error: new Error('Google Sign-In is not configured yet.') };
    }
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Always sign out of Google first so the account picker always appears
      // and repeated sign-ins don't silently fail with a stale session.
      try { await GoogleSignin.signOut(); } catch {}
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      if (!idToken) return { error: new Error('No ID token from Google') };
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      return { error: error as Error | null };
    } catch (e: any) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) return { error: null };
      if (e.code === statusCodes.IN_PROGRESS) return { error: null };
      return { error: e as Error };
    }
  };

  const signOut = async () => {
    // Sign out of Google so next sign-in shows account picker cleanly.
    try { await GoogleSignin.signOut(); } catch {}
    try { await supabase.auth.signOut(); } catch {}
    await AsyncStorage.clear();
    router.replace('/(auth)/landing');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null, session: null, loading: false,
      signUp: async () => ({ error: null }),
      signIn: async () => ({ error: null }),
      signInWithGoogle: async () => ({ error: null }),
      signOut: async () => {},
    };
  }
  return context;
}
