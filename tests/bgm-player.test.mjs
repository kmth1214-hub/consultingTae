import test from 'node:test';
import assert from 'node:assert/strict';
import { createBgmPlayer } from '../src/game/bgmPlayer.js';

function setup({ blocked = false, supported = true } = {}) {
  const scheduled = [], timerCallbacks = new Map();
  let nextTimer = 0, gainCount = 0, closes = 0;
  const param = () => ({ value: 0, setValueAtTime(value) { this.value = value; },
    setTargetAtTime(value) { this.value = value; } });
  const context = { currentTime: 0, state: 'suspended', destination: {},
    createGain() { gainCount++; return { gain: param(), connect() {}, disconnect() {} }; },
    async resume() { if (blocked) throw new Error('gesture required'); this.state = 'running'; },
    async suspend() { this.state = 'suspended'; },
    async close() { closes++; this.state = 'closed'; } };
  const player = createBgmPlayer({ contextFactory: () => supported ? context : null,
    setTimer: callback => { const id = ++nextTimer; timerCallbacks.set(id, callback); return id; },
    clearTimer: id => timerCallbacks.delete(id),
    scheduleEvent: (_context, _track, event, when) => scheduled.push({ event, when }) });
  return { player, context, scheduled, timerCallbacks,
    gainCount: () => gainCount, closes: () => closes };
}

test('transport schedules once, changes theme, pauses, and cleans up', async () => {
  const probe = setup();
  probe.player.setScene('forest', false);
  assert.equal(probe.gainCount(), 0, 'AudioContext remains lazy');
  probe.player.setActive(true);
  await probe.player.resume();
  assert.equal(probe.player.getStatus().state, 'playing');
  assert.ok(probe.scheduled.length > 0);
  assert.equal(probe.timerCallbacks.size, 1);
  const gainCount = probe.gainCount();
  probe.player.setScene('forest', false);
  assert.equal(probe.gainCount(), gainCount, 'same scene must not restart');
  probe.player.setScene('forest', true);
  assert.equal(probe.player.getStatus().boss, true);
  assert.ok(probe.gainCount() > gainCount);
  probe.context.currentTime += .5;
  [...probe.timerCallbacks.values()][0]();
  assert.ok(probe.scheduled.some(item => item.event.beat >= 1));
  probe.player.setActive(false);
  assert.equal(probe.timerCallbacks.size, 0);
  probe.player.destroy();
  probe.player.destroy();
  assert.equal(probe.closes(), 1);
});

test('volume and mute are validated and retained without starting audio', () => {
  const { player, gainCount } = setup();
  player.setVolume(.62);
  player.setMuted(true);
  assert.deepEqual([player.getStatus().volume, player.getStatus().muted], [.62, true]);
  assert.equal(gainCount(), 0);
  assert.throws(() => player.setVolume(1.1), RangeError);
  assert.throws(() => player.setVolume(NaN), TypeError);
  assert.throws(() => player.setMuted('true'), TypeError);
  assert.throws(() => player.setScene('forest', 'yes'), TypeError);
  player.destroy();
});

test('unsupported and blocked audio do not throw into the game', async () => {
  for (const options of [{ supported: false, state: 'unavailable' },
    { blocked: true, state: 'blocked' }]) {
    const { player } = setup(options);
    player.setScene('city');
    player.setActive(true);
    await player.resume();
    assert.equal(player.getStatus().state, options.state);
    player.destroy();
  }
});
