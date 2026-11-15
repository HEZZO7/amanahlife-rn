/**
 * SubscriptionContext — React Native
 * Migrated from app/frontend/src/contexts/SubscriptionContext.tsx
 * Replaces localStorage with AsyncStorage
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type SubscriptionTier = 'free' | 'balanced' | 'family';
type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'expired' | 'paused';
type BillingCycle = 'monthly' | 'yearly';

// Statuses that still grant access to a paid tier. 'past_due' is included
// deliberately — a payment retry is in flight, cutting off a paying customer
// mid-retry is hostile. Mirrors the same policy as the web app.
const ENTITLING_STATUSES: ReadonlySet<SubscriptionStatus> = new Set(['active', 'past_due']);

// Android gets a longer trial (14 days) than the 7-day default, since
// Play Billing isn't live yet (see PROJECT.md) and Android users have no
// fast in-app purchase path - the external Lemon Squeezy browser checkout
// still works, but a longer runway reduces pressure to convert before
// native billing ships. iOS (not yet shipped, but app.json still declares
// an iOS config) and web both stay at 7 days, where purchasing already
// works normally - Platform.OS branch here rather than a second constant
// so there's nothing to keep in sync if this file is ever shared further.
export const TRIAL_DURATION_DAYS = Platform.OS === 'android' ? 14 : 7;

function computeTrialState(trialStartedAt: string | null): { isTrialActive: boolean; trialDaysRemaining: number } {
  if (!trialStartedAt || !Number.isFinite(Date.parse(trialStartedAt)) || Date.parse(trialStartedAt) > Date.now()) return { isTrialActive: false, trialDaysRemaining: 0 };
  const diffDays = Math.floor((Date.now() - new Date(trialStartedAt).getTime()) / (1000 * 60 * 60 * 24));
  const remaining = TRIAL_DURATION_DAYS - diffDays;
  return { isTrialActive: remaining > 0, trialDaysRemaining: Math.max(0, remaining) };
}

interface SubscriptionContextType {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  // ISO date string, or null. Populated by the Lemon Squeezy webhook
  // (never fabricated) - mirrors web's SubscriptionContext.tsx. Null for
  // free/trial users and for any provider whose webhook doesn't populate
  // current_period_end yet.
  currentPeriodEnd: string | null;
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
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [trialUsed, setTrialUsed] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setTier('free');
      setStatus('active');
      setBillingCycle('monthly');
      setCurrentPeriodEnd(null);
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
        .from('app_11941c8fec_subscriptions')
        .select('tier, status, billing_cycle, current_period_end, trial_started_at, trial_used')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        const fetchedStatus = data.status as SubscriptionStatus;
        setTier(ENTITLING_STATUSES.has(fetchedStatus) ? (data.tier as SubscriptionTier) : 'free');
        setStatus(fetchedStatus);
        setBillingCycle(data.billing_cycle as BillingCycle);
        setCurrentPeriodEnd(data.current_period_end ?? null);
        setTrialUsed(!!data.trial_used);
        const computed = computeTrialState(data.trial_started_at ?? null);
        setIsTrialActive(computed.isTrialActive);
        setTrialDaysRemaining(computed.trialDaysRemaining);
      } else {
        setTier('free');
        setStatus('active');
        setBillingCycle('monthly');
        setCurrentPeriodEnd(null);
        setIsTrialActive(false);
        setTrialDaysRemaining(0);
        setTrialUsed(false);
      }
    } catch {
      setIsTrialActive(false);
      setTrialDaysRemaining(0);
      setTrialUsed(false);
      setCurrentPeriodEnd(null);
      setTier('free');
      setStatus('active');
      setBillingCycle('monthly');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const startTrial = async (): Promise<{ error: string | null }> => {
    if (!user) return { error: 'not_signed_in' };
    try {
      const { data, error } = await supabase.rpc('amanahlife_start_trial');
      if (error) return { error: error.message };
      await fetchSubscription();
      return { error: data === 'ok' ? null : typeof data === 'string' ? data : 'unknown_error' };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'unknown_error' };
    }
  };

  // The 7-day free trial grants FULL family access — both Balanced Life and
  // Family Plan features — not merely 'balanced'. Treat trial access as a
  // floor: while the trial runs the user gets family regardless of what
  // `tier` state currently holds (which is already 'free' unless
  // ENTITLING_STATUSES matched above), and when it expires they drop to
  // whatever they are genuinely entitled to. Mirrors web's
  // SubscriptionContext.tsx `effectiveTier` exactly, so a single tier-level
  // comparison (e.g. TIER_LEVELS[tier] >= TIER_LEVELS[requiredTier]) behaves
  // identically on both platforms instead of denying trialing users.
  const effectiveTier: SubscriptionTier = isTrialActive ? 'family' : tier;
  const isPremium = effectiveTier !== 'free';

  return (
    <SubscriptionContext.Provider value={{
      tier: effectiveTier, status, billingCycle, currentPeriodEnd, loading,
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
    currentPeriodEnd: null,
    loading: false,
    isTrialActive: false,
    trialDaysRemaining: 0,
    trialUsed: false,
    isPremium: false,
    startTrial: async () => ({ error: 'not_available' }),
    refetch: async () => {},
  };
}
