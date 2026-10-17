// Node-only test resolver for bundler-style extensionless TypeScript imports.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === './notificationPreferenceClient' && context.parentURL?.endsWith('/usePreferenceState.ts')) {
    return nextResolve(new URL('./notificationPreferenceClient.ts', context.parentURL).href, context);
  }
  if (context.parentURL?.endsWith('/src/lib/notificationPreferences.ts') &&
      ['expo-notifications', './userStorage', './config', './prayerNotifications', './hijriDate', './toast', './supabase'].includes(specifier)) {
    return nextResolve(new URL('./native-preference-stubs.mjs', import.meta.url).href, context);
  }
  if (context.parentURL?.endsWith('/src/lib/notificationPreferences.ts') && specifier === './notificationPreferenceClient') {
    return nextResolve(new URL('./notificationPreferenceClient.ts', context.parentURL).href, context);
  }
  return nextResolve(specifier, context);
}

