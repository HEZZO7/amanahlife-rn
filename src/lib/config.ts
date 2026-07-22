/**
 * Centralized Supabase project config — single source of truth for the
 * project URL/anon key. Previously the project ref was hardcoded
 * separately in supabase.ts and in every screen that called an Edge
 * Function directly (subscription.tsx, ai-life-coach.tsx, ai-search.tsx,
 * settings.tsx) - five copies of the same string that could silently
 * drift if the project ever changed.
 */
export const SUPABASE_URL = 'https://nyhsnvjdgifphwkqzwel.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aHNudmpkZ2lmcGh3a3F6d2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDE2ODAsImV4cCI6MjA5NDcxNzY4MH0.dFdjuFJjlhxpRySsJGzflgrR-2A1IVlS37wF15319Og';

export function functionUrl(functionName: string): string {
  return `${SUPABASE_URL}/functions/v1/${functionName}`;
}
