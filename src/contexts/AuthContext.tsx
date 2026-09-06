/**
 * AuthContext — React Native
 * Migrated from app/frontend/src/contexts/AuthContext.tsx
 * Replaces window.location.href with expo-router navigation
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { configureGoogleSignIn, isGoogleConfigured } from '../lib/googleAuth';

const GOOGLE_SIGNIN_TIMEOUT_MS = 18000;

// Neither hasPlayServices() nor signIn() has a built-in timeout - if the
// native Play Services update dialog is shown and the user backgrounds the
// app instead of resolving it, the promise can hang indefinitely with no
// error, freezing the sign-in button forever. This races the given promise
// against a timer so the caller always gets a settled promise either way.
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  // cancelled: true means the user backed out (or a sign-in was already in
  // flight) - error is null in both this case and genuine success, so
  // callers that navigate on success must check `!cancelled` too, or a
  // cancelled attempt would incorrectly navigate as if it had succeeded.
  signInWithGoogle: () => Promise<{ error: Error | null; cancelled?: boolean }>;
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
    console.log('[GoogleSignIn] start, isGoogleConfigured=', isGoogleConfigured());
    if (!isGoogleConfigured()) {
      console.log('[GoogleSignIn] not configured, aborting');
      return { error: new Error('Google Sign-In is not configured yet.') };
    }
    try {
      console.log('[GoogleSignIn] calling hasPlayServices...');
      const hasPlay = await withTimeout(
        GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }),
        GOOGLE_SIGNIN_TIMEOUT_MS,
        'Google Play Services took too long to respond. Please try again.'
      );
      console.log('[GoogleSignIn] hasPlayServices resolved:', hasPlay);

      // Always sign out of Google first so the account picker always appears
      // and repeated sign-ins don't silently fail with a stale session.
      console.log('[GoogleSignIn] calling pre-signOut...');
      try {
        await GoogleSignin.signOut();
        console.log('[GoogleSignIn] pre-signOut resolved');
      } catch (signOutErr) {
        console.log('[GoogleSignIn] pre-signOut threw (ignored):', signOutErr);
      }

      console.log('[GoogleSignIn] calling signIn()...');
      const signInResult = await withTimeout(
        GoogleSignin.signIn(),
        GOOGLE_SIGNIN_TIMEOUT_MS,
        'Google Sign-In timed out. Please try again.'
      );
      console.log('[GoogleSignIn] signIn() resolved, result=', JSON.stringify(signInResult));

      const idToken = signInResult.data?.idToken;
      console.log('[GoogleSignIn] type=', signInResult.type, 'idToken present?', !!idToken);
      if (!idToken) {
        console.log('[GoogleSignIn] no idToken, returning error');
        return { error: new Error('No ID token from Google') };
      }

      console.log('[GoogleSignIn] calling supabase signInWithIdToken...');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      console.log('[GoogleSignIn] signInWithIdToken resolved, error=', error ? error.message : null);
      return { error: error as Error | null };
    } catch (e: any) {
      console.log('[GoogleSignIn] CAUGHT ERROR code=', e?.code, 'message=', e?.message, 'name=', e?.name);
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('[GoogleSignIn] treated as SIGN_IN_CANCELLED, swallowing');
        return { error: null, cancelled: true };
      }
      if (e.code === statusCodes.IN_PROGRESS) {
        console.log('[GoogleSignIn] treated as IN_PROGRESS, swallowing');
        return { error: null, cancelled: true };
      }
      return { error: e as Error };
    }
  };

  const signOut = async () => {
    // Sign out of Google so next sign-in shows account picker cleanly.
    try { await GoogleSignin.signOut(); } catch {}
    try { await supabase.auth.signOut(); } catch {}
    // Do NOT clear AsyncStorage — nearly all user content (goals, tasks,
    // finance, wellness, fasting, dhikr, quran progress, family budget, etc.)
    // lives only here with no server copy, so a full clear() here
    // permanently destroys it. Every screen now reads/writes through
    // userStorage.ts, scoped to user.id, so a different account signing in
    // on this device simply can't see this account's data.
    //
    // The one remaining gap: `user`/`session` here normally update via the
    // async onAuthStateChange listener below, which has a small delay.
    // Since Expo Router tabs can stay mounted across navigation, a screen
    // that read `userId` from useAuth() a moment before this state update
    // lands could still show a brief flash of the previous account's data
    // (its own effect depends on [userId], so it recovers as soon as this
    // state settles — this just closes that timing gap explicitly instead
    // of waiting on the listener round-trip).
    setUser(null);
    setSession(null);
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
      signInWithGoogle: async () => ({ error: null, cancelled: false }),
      signOut: async () => {},
    };
  }
  return context;
}
