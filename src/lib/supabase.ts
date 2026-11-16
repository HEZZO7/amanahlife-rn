import { stagingFetch } from './stagingFetch';
/**
 * Supabase client — React Native
 * Migrated from app/frontend/src/lib/supabase.ts
 * Uses AsyncStorage for session persistence instead of localStorage
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, IS_STAGING } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  ...(IS_STAGING ? {global: {fetch: stagingFetch(SUPABASE_URL)}} : {}),
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Required for React Native
    flowType: 'pkce',          // Native OAuth (exchangeCodeForSession)
  },
});
