// Test-only dependencies. No Expo, network, credentials or device APIs loaded.
const state = () => globalThis.__preferenceAdapterTest;
export const supabase = { auth: { getSession: async () => ({ data: { session: state().session } }) } };
export const functionUrl = () => 'https://isolated.invalid/preferences';
export const getUserItem = async (key, id) => state().storage.get(key + ':' + id) ?? null;
export const setUserItem = async (key, id, value) => { state().storage.set(key + ':' + id, value); };
export const toast = { error: message => state().warnings.push(message) };
export const getAllScheduledNotificationsAsync = async () => {
  state().schedules++;
  if (state().scheduleError) throw Error('isolated schedule failure');
  return [];
};
export const cancelScheduledNotificationAsync = async () => { throw Error('Unexpected device cancellation'); };
export const scheduleNotificationAsync = async () => { throw Error('Real notification scheduling prohibited'); };
export const requestNotificationPermission = async () => false;
export const computeUpcomingTimings = async () => ({ timings: [] });
export const isRamadan = () => false;
export const SchedulableTriggerInputTypes = { DATE: 'date' };

