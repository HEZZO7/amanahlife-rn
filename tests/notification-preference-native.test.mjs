import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLocalPreferences, getScheduledPreferenceClient, updatePreference } from '../src/lib/notificationPreferences.ts';
import { DEFAULT_NOTIFICATION_PREFERENCES as defaults } from '../src/lib/notificationPreferenceClient.ts';

function setup(id) {
  const state = { session: { user: { id }, access_token: 'isolated-token' }, storage: new Map(), schedules: 0, warnings: [], scheduleError: false };
  globalThis.__preferenceAdapterTest = state;
  globalThis.fetch = async () => Response.json({ success: true });
  return state;
}
test('native adapter: old local row returns only the six valid flags', async () => {
  const s = setup('legacy');
  s.storage.set('amanah-notification-preferences:legacy', JSON.stringify({ ...defaults, fasting_reminders: false, user_id: 'B', updated_at: 'old' }));
  assert.deepEqual(await getLocalPreferences('legacy'), { ...defaults, fasting_reminders: false });
});
test('native adapter: failed save does not update cache or invoke scheduling', async () => {
  const s = setup('failed');
  globalThis.fetch = async () => Response.json({}, { status: 401 });
  await assert.rejects(() => updatePreference('isolated-token', 'failed', 'bill_reminders', false, false));
  assert.equal(s.storage.size, 0);
  assert.equal(s.schedules, 0);
});
test('native adapter: confirmed save invokes scheduling only afterwards', async () => {
  const s = setup('success');
  globalThis.fetch = async (_url, init) => {
    assert.equal(s.storage.size, 0);
    assert.equal(s.schedules, 0);
    assert.deepEqual(JSON.parse(init.body), { action: 'update_preferences', preferences: { bill_reminders: false } });
    return Response.json({ success: true });
  };
  const result = await updatePreference('isolated-token', 'success', 'bill_reminders', false, false);
  assert.equal(result.bill_reminders, false);
  assert.equal(s.schedules, 1);
  assert.equal(JSON.parse(s.storage.get('amanah-notification-preferences:success')).bill_reminders, false);
});
test('native adapter: reminder failure reports saved preference separately from schedule failure', async () => {
  const s = setup('schedule-error'); s.scheduleError = true;
  const result = await updatePreference('isolated-token', 'schedule-error', 'bill_reminders', false, false);
  assert.equal(result.bill_reminders, false);
  assert.equal(s.warnings.length, 1);
});
test('native adapter: actual SDK identity mismatch prevents cross-account cache and scheduling', async () => {
  const s = setup('B'); let requests = 0;
  globalThis.fetch = async () => { requests++; throw Error('must not send'); };
  await assert.rejects(() => updatePreference('claimed-token-A', 'A', 'bill_reminders', false, false));
  assert.equal(requests, 0);
  assert.equal(s.storage.size, 0);
  assert.equal(s.schedules, 0);
});
test('native adapter: unauthenticated caller cannot save or schedule', async () => {
  const s = setup('missing'); s.session = null;
  await assert.rejects(() => updatePreference(null, 'missing', 'bill_reminders', false, false));
  assert.equal(s.schedules, 0);
});
test('native adapter: forbidden-only patch rejected before transport or reminders', async () => {
  const s = setup('forbidden');
  await assert.rejects(async () => getScheduledPreferenceClient('forbidden', false).save({ user_id: 'B', updated_at: 'old' }));
  assert.equal(s.storage.size, 0);
  assert.equal(s.schedules, 0);
});

