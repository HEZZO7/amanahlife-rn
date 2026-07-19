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

const TRIAL_KEY = 'amanah-trial-start';
const TRIAL_DURATION_DAYS = 7;

interface SubscriptionContextType {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  loading: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  isPremium: boolean;
  startTrial: () => Promise<void>;
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

  const checkTrial = useCallback(async () => {
    const trialStart = await AsyncStorage.getItem(TRIAL_KEY);
    if (!trialStart) {
      setIsTrialActive(false);
      setTrialDaysRemaining(0);
      return;
    }
    const diffDays = Math.floor((Date.now() - new Date(trialStart).getTime()) / (1000 * 60 * 60 * 24));
    const remaining = TRIAL_DURATION_DAYS - diffDays;
    setIsTrialActive(remaining > 0);
    setTrialDaysRemaining(Math.max(0, remaining));
  }, []);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setTier('free');
      setStatus('active');
      setBillingCycle('monthly');
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
        .select('tier, status, billing_cycle')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        const fetchedStatus = data.status as SubscriptionStatus;
        setTier(ENTITLING_STATUSES.has(fetchedStatus) ? (data.tier as SubscriptionTier) : 'free');
        setStatus(fetchedStatus);
        setBillingCycle(data.billing_cycle as BillingCycle);
      } else {
        setTier('free');
        setStatus('active');
        setBillingCycle('monthly');
      }
    } catch {
      // Free tier fallback
      setTier('free');
      setStatus('active');
      setBillingCycle('monthly');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkTrial();
    fetchSubscription();
  }, [user]);

  const startTrial = async () => {
    await AsyncStorage.setItem(TRIAL_KEY, new Date().toISOString());
    setIsTrialActive(true);
    setTrialDaysRemaining(TRIAL_DURATION_DAYS);
  };

  const isPremium = tier !== 'free' || isTrialActive;

  return (
    <SubscriptionContext.Provider value={{
      tier, status, billingCycle, loading,
      isTrialActive, trialDaysRemaining, isPremium,
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
    isPremium: false,
    startTrial: async () => {},
    refetch: async () => {},
  };
}
