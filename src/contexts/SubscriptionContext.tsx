/**
 * SubscriptionContext — React Native
 * Migrated from app/frontend/src/contexts/SubscriptionContext.tsx
 * Replaces localStorage with AsyncStorage
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type SubscriptionTier = 'free' | 'balanced' | 'family';
type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'expired' | 'paused';
type BillingCycle = 'monthly' | 'yearly';

// Statuses that still grant access to a paid tier. 'past_due' is included
// deliberately — a payment retry is in flight, cutting off a paying customer
// mid-retry is hostile. Mirrors the same policy as the web app.
const ENTITLING_STATUSES: ReadonlySet<SubscriptionStatus> = new Set(['active', 'past_due']);

// Local cache of the trial start date, used only to render an instant,
// optimistic value while fetchSubscription's network call is in flight.
// The server's `trial_started_at`/`trial_used` columns (subscriptions
// table) are the actual source of truth — see supabase/migrations/
// 20260720000000_add_trial_columns.sql. Trial state used to live ONLY in
// this AsyncStorage key, which meant uninstalling the app (or clearing app
// data) reset the trial indefinitely; that's now impossible since
// startTrial() checks the server before granting anything.
const TRIAL_CACHE_KEY = 'amanah-trial-start';
const TRIAL_DURATION_DAYS = 7;

function computeTrialState(trialStartedAt: string | null): { isTrialActive: boolean; trialDaysRemaining: number } {
  if (!trialStartedAt) return { isTrialActive: false, trialDaysRemaining: 0 };
  const diffDays = Math.floor((Date.now() - new Date(trialStartedAt).getTime()) / (1000 * 60 * 60 * 24));
  const remaining = TRIAL_DURATION_DAYS - diffDays;
  return { isTrialActive: remaining > 0, trialDaysRemaining: Math.max(0, remaining) };
}

interface SubscriptionContextType {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  loading: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  trialUsed: boolean;
  isPremium: boolean;
  startTrial: () => Promise<{ error: string | null }>;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState(true);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [trialUsed, setTrialUsed] = useState(false);

  // Fast, optimistic read from the local cache so the UI has a sensible
  // value immediately on launch — corrected by fetchSubscription's server
  // read the moment the network responds.
  const checkLocalTrialCache = useCallback(async () => {
    const cached = await AsyncStorage.getItem(TRIAL_CACHE_KEY);
    const computed = computeTrialState(cached);
    setIsTrialActive(computed.isTrialActive);
    setTrialDaysRemaining(computed.trialDaysRemaining);
  }, []);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setTier('free');
      setStatus('active');
      setBillingCycle('monthly');
      setIsTrialActive(false);
      setTrialDaysRemaining(0);
      setTrialUsed(false);
      setLoading(false);
      return;
    }
    try {
      // Fetch by user_id only (not filtered to status='active') so a
      // canceled/expired/paused row is still seen and can correctly reset
      // the tier to free below, instead of silently returning no row and
      // leaving whatever tier was last fetched stuck in state.
      const { data } = await supabase
        .from('subscriptions')
        .select('tier, status, billing_cycle, trial_started_at, trial_used')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        const fetchedStatus = data.status as SubscriptionStatus;
        setTier(ENTITLING_STATUSES.has(fetchedStatus) ? (data.tier as SubscriptionTier) : 'free');
        setStatus(fetchedStatus);
        setBillingCycle(data.billing_cycle as BillingCycle);
        setTrialUsed(!!data.trial_used);
        const computed = computeTrialState(data.trial_started_at ?? null);
        setIsTrialActive(computed.isTrialActive);
        setTrialDaysRemaining(computed.trialDaysRemaining);
        // Server is authoritative — keep the local cache in sync with it
        // purely so the next app launch has an instant value to show.
        if (data.trial_started_at) await AsyncStorage.setItem(TRIAL_CACHE_KEY, data.trial_started_at);
        else await AsyncStorage.removeItem(TRIAL_CACHE_KEY);
      } else {
        setTier('free');
        setStatus('active');
        setBillingCycle('monthly');
        setIsTrialActive(false);
        setTrialDaysRemaining(0);
        setTrialUsed(false);
      }
    } catch {
      // Network failed — free tier fallback for tier/status, but leave
      // whatever checkLocalTrialCache already computed for trial state
      // rather than resetting it to inactive while offline.
      setTier('free');
      setStatus('active');
      setBillingCycle('monthly');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkLocalTrialCache();
    fetchSubscription();
  }, [user]);

  const startTrial = async (): Promise<{ error: string | null }> => {
    if (!user) return { error: 'not_signed_in' };
    try {
      // Check the server fresh — not whatever's currently in local state —
      // so a stale render can't grant a second trial.
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('trial_used')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing?.trial_used) {
        setTrialUsed(true);
        return { error: 'trial_already_used' };
      }

      const startedAt = new Date().toISOString();
      const { error } = await supabase
        .from('subscriptions')
        .upsert({ user_id: user.id, trial_started_at: startedAt, trial_used: true }, { onConflict: 'user_id' });

      if (error) return { error: error.message };

      await AsyncStorage.setItem(TRIAL_CACHE_KEY, startedAt);
      setTrialUsed(true);
      setIsTrialActive(true);
      setTrialDaysRemaining(TRIAL_DURATION_DAYS);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'unknown_error' };
    }
  };

  const isPremium = tier !== 'free' || isTrialActive;

  return (
    <SubscriptionContext.Provider value={{
      tier, status, billingCycle, loading,
      isTrialActive, trialDaysRemaining, trialUsed, isPremium,
      startTrial, refetch: fetchSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  return ctx ?? {
    tier: 'free' as SubscriptionTier,
    status: 'active' as SubscriptionStatus,
    billingCycle: 'monthly' as BillingCycle,
    loading: false,
    isTrialActive: false,
    trialDaysRemaining: 0,
    trialUsed: false,
    isPremium: false,
    startTrial: async () => ({ error: 'not_available' }),
    refetch: async () => {},
  };
}
