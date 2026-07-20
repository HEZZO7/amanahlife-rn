/**
 * useMetalPrices — React Native
 * Migrated from app/frontend/src/hooks/useMetalPrices.ts
 * Replaces localStorage with AsyncStorage
 */
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GRAMS_PER_TROY_OUNCE = 31.1034768;
const CACHE_KEY = 'amanah_metal_prices_cache';

// Sanity bounds in USD/gram — reject a clearly broken API response (zero,
// negative, or wildly implausible) rather than silently using it to
// calculate a real zakat obligation. Wide enough to tolerate genuine
// multi-year market moves without needing a code change.
const GOLD_MIN_PER_GRAM = 20;
const GOLD_MAX_PER_GRAM = 500;
const SILVER_MIN_PER_GRAM = 0.2;
const SILVER_MAX_PER_GRAM = 10;

// Used only if no live fetch has ever succeeded on this device and there's
// no cache to fall back to either. This WILL drift stale over time — that's
// exactly why isLive/asOf exist, so the UI can disclose when a figure is a
// fallback rather than presenting it as fact.
const FALLBACK_GOLD_PER_GRAM = 125;
const FALLBACK_SILVER_PER_GRAM = 1.6;

export interface MetalPrices {
  goldPricePerGram: number;
  silverPricePerGram: number;
  isLive: boolean;
  asOf: Date | null;
  loading: boolean;
}

interface CachedPrices {
  goldPricePerGram: number;
  silverPricePerGram: number;
  asOf: string;
}

/**
 * Live gold/silver spot price in USD/gram, for Zakat Nisab and holdings
 * valuation. Source: gold-api.com (free, no key, CORS-open). Falls back to
 * the last known-good cached price (still flagged non-live) or a hardcoded
 * fallback if nothing has ever been cached — never fabricates a "live"
 * price from bad or missing data.
 */
export function useMetalPrices(): MetalPrices {
  const [state, setState] = useState<MetalPrices>({
    goldPricePerGram: FALLBACK_GOLD_PER_GRAM,
    silverPricePerGram: FALLBACK_SILVER_PER_GRAM,
    isLive: false,
    asOf: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Seed from cache first so the UI has a sensible number immediately.
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw && !cancelled) {
          const cached: CachedPrices = JSON.parse(raw);
          setState((prev) => ({
            ...prev,
            goldPricePerGram: cached.goldPricePerGram,
            silverPricePerGram: cached.silverPricePerGram,
            asOf: new Date(cached.asOf),
          }));
        }
      } catch {
        // ignore — fallback constants already in initial state
      }

      try {
        const [goldRes, silverRes] = await Promise.all([
          fetch('https://api.gold-api.com/price/XAU'),
          fetch('https://api.gold-api.com/price/XAG'),
        ]);
        if (!goldRes.ok || !silverRes.ok) throw new Error('Metal price fetch failed');
        const [goldData, silverData] = await Promise.all([goldRes.json(), silverRes.json()]);

        const goldPerGram = Number(goldData.price) / GRAMS_PER_TROY_OUNCE;
        const silverPerGram = Number(silverData.price) / GRAMS_PER_TROY_OUNCE;

        const goldValid = Number.isFinite(goldPerGram) && goldPerGram >= GOLD_MIN_PER_GRAM && goldPerGram <= GOLD_MAX_PER_GRAM;
        const silverValid = Number.isFinite(silverPerGram) && silverPerGram >= SILVER_MIN_PER_GRAM && silverPerGram <= SILVER_MAX_PER_GRAM;
        if (!goldValid || !silverValid) {
          throw new Error('Metal price out of sane bounds, refusing to use it');
        }

        if (cancelled) return;
        const asOf = new Date();
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ goldPricePerGram: goldPerGram, silverPricePerGram: silverPerGram, asOf: asOf.toISOString() })).catch(() => {});
        setState({ goldPricePerGram: goldPerGram, silverPricePerGram: silverPerGram, isLive: true, asOf, loading: false });
      } catch {
        if (cancelled) return;
        setState((prev) => ({ ...prev, isLive: false, loading: false }));
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return state;
}
