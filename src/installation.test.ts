import { test } from 'node:test';
import assert from 'node:assert/strict';
import { watchInstallation, type InstallState } from './installation.ts';

function environment(standalone = false, ios = false) {
  const mode = Object.assign(new EventTarget(), { matches: standalone });
  const host = Object.assign(new EventTarget(), { matchMedia: () => mode, navigator: { standalone: ios } });
  let state: InstallState;
  const watcher = watchInstallation(host as unknown as Window, value => { state = value; });
  return { host, mode, watcher, state: () => state! };
}
function offer(host: EventTarget, prompt: () => Promise<{outcome: 'accepted' | 'dismissed'}>) {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt });
  host.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
}

test('native installation is only requested by a click, accepted installations hide the button', async () => {
  const env = environment();
  let calls = 0;
  offer(env.host, async () => { calls++; return { outcome: 'accepted' }; });
  assert.equal(calls, 0);
  assert.deepEqual(env.state(), { hidden: false, available: true });
  const completion = env.watcher.install();
  assert.equal(calls, 1); // Prompt starts synchronously to retain user activation.
  assert.equal(await completion, true);
  assert.deepEqual(env.state(), { hidden: true, available: false });
  assert.equal(await env.watcher.install(), false);
  env.watcher.dispose();
});

test('dismissed prompts are not reused; a fresh offer can be used', async () => {
  const env = environment();
  let calls = 0;
  const prompt = async () => { calls++; return { outcome: 'dismissed' as const }; };
  offer(env.host, prompt);
  assert.equal(await env.watcher.install(), true);
  assert.deepEqual(env.state(), { hidden: false, available: false });
  assert.equal(await env.watcher.install(), false);
  offer(env.host, prompt);
  assert.equal(await env.watcher.install(), true);
  assert.equal(calls, 2);
  env.watcher.dispose();
});

test('missing or failed native prompt falls back to instructions', async () => {
  const env = environment();
  assert.equal(await env.watcher.install(), false);
  offer(env.host, async () => { throw new Error('Unavailable'); });
  assert.equal(await env.watcher.install(), false);
  assert.deepEqual(env.state(), { hidden: false, available: false });
  env.watcher.dispose();
});

test('standalone modes and installations from browser controls hide the button', () => {
  for (const env of [environment(true), environment(false, true)]) {
    assert.equal(env.state().hidden, true);
    env.watcher.dispose();
  }
  const env = environment();
  env.mode.matches = true;
  env.mode.dispatchEvent(new Event('change'));
  assert.equal(env.state().hidden, true);
  env.mode.matches = false;
  env.mode.dispatchEvent(new Event('change'));
  assert.equal(env.state().hidden, false);
  env.host.dispatchEvent(new Event('appinstalled'));
  assert.equal(env.state().hidden, true);
  env.watcher.dispose();
});

test('disposing removes listeners and does not persist an installed flag', () => {
  const env = environment();
  env.watcher.dispose();
  env.host.dispatchEvent(new Event('appinstalled'));
  env.mode.matches = true;
  env.mode.dispatchEvent(new Event('change'));
  assert.deepEqual(env.state(), { hidden: false, available: false });
  const reloaded = environment();
  assert.equal(reloaded.state().hidden, false);
  reloaded.watcher.dispose();
});
