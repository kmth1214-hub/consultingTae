import { buildBgmScore } from './bgmScore.js';
import { scheduleBgmEvent } from './bgmSynth.js';

const LOOKAHEAD = .35;
const TICK_MS = 100;

/** A single browser music transport; no audio context exists before play is requested. */
export function createBgmPlayer({
  contextFactory = () => {
    const Constructor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    return Constructor ? new Constructor() : null;
  },
  setTimer = (callback, ms) => globalThis.setInterval(callback, ms),
  clearTimer = id => globalThis.clearInterval(id),
  scheduleEvent = scheduleBgmEvent,
} = {}) {
  let context = null, master = null, track = null, score = null;
  let area = null, boss = false, active = false, muted = false, volume = .35;
  let state = 'idle', timer = null, eventIndex = 0, cycle = 0, originTime = null;
  let destroyed = false;
  const retiredTracks = [];

  const status = () => ({ area, boss, active, volume, muted, state });
  const stopTimer = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };
  const applyVolume = () => {
    if (!master || !context) return;
    master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, .035);
  };
  const newTrack = () => {
    if (!context) return;
    if (track) {
      track.gain.setTargetAtTime(.0001, context.currentTime, .025);
      retiredTracks.push(track);
    }
    track = context.createGain();
    track.gain.setValueAtTime(1, context.currentTime);
    track.connect(master);
  };
  const ensureContext = () => {
    if (context) return true;
    try {
      context = contextFactory();
      if (!context) { state = 'unavailable'; return false; }
      master = context.createGain();
      master.gain.setValueAtTime(0, context.currentTime);
      master.connect(context.destination);
      applyVolume();
      newTrack();
      return true;
    } catch {
      state = 'unavailable';
      context = null;
      return false;
    }
  };
  const schedule = () => {
    if (destroyed || !active || !score || !context || context.state !== 'running') return;
    if (originTime === null) originTime = context.currentTime + .025;
    const secondsPerBeat = 60 / score.bpm;
    const until = context.currentTime + LOOKAHEAD;
    while (true) {
      const event = score.events[eventIndex];
      const when = originTime + cycle * score.durationSeconds + event.beat * secondsPerBeat;
      if (when > until) break;
      if (when >= context.currentTime - .03) {
        scheduleEvent(context, track, event, when, secondsPerBeat);
      }
      eventIndex++;
      if (eventIndex >= score.events.length) { eventIndex = 0; cycle++; }
    }
  };
  const startTimer = () => {
    if (timer !== null) return;
    schedule();
    timer = setTimer(schedule, TICK_MS);
  };

  return {
    getStatus: status,
    setScene(nextArea, nextBoss = false) {
      if (destroyed) return status();
      const nextScore = buildBgmScore(nextArea, nextBoss);
      if (area === nextArea && boss === nextBoss) return status();
      area = nextArea;
      boss = nextBoss;
      score = nextScore;
      eventIndex = 0;
      cycle = 0;
      originTime = null;
      if (context) newTrack();
      if (active && context?.state === 'running') schedule();
      return status();
    },
    setActive(nextActive) {
      if (typeof nextActive !== 'boolean') throw new TypeError('Active must be boolean');
      if (destroyed || active === nextActive) return status();
      active = nextActive;
      if (active) { void this.resume(); }
      else {
        stopTimer();
        state = 'idle';
        if (context?.state === 'running') void context.suspend().catch(() => {});
      }
      return status();
    },
    setVolume(nextVolume) {
      if (typeof nextVolume !== 'number' || !Number.isFinite(nextVolume)) throw new TypeError('Invalid volume');
      if (nextVolume < 0 || nextVolume > 1) throw new RangeError('Volume out of range');
      volume = nextVolume;
      applyVolume();
      return status();
    },
    setMuted(nextMuted) {
      if (typeof nextMuted !== 'boolean') throw new TypeError('Muted must be boolean');
      muted = nextMuted;
      applyVolume();
      return status();
    },
    async resume() {
      if (destroyed || !active || !score) return status();
      if (!ensureContext()) return status();
      try {
        await context.resume();
        if (destroyed || !active) return status();
        state = 'playing';
        startTimer();
      } catch {
        stopTimer();
        state = 'blocked';
      }
      return status();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      active = false;
      stopTimer();
      track?.disconnect();
      retiredTracks.forEach(item => item.disconnect());
      master?.disconnect();
      if (context) void context.close().catch(() => {});
      state = 'idle';
    },
  };
}
