import { sampleAtDistance, sampleAtTime } from './shotGeometry.js';

export function getSignaturePlaybackFrame(flight, time) {
  const travel = flight.abilityContacts?.find(cue => cue.kind === 'slash' || cue.kind === 'ground-wave');
  const progress = travel && time >= travel.time
    ? Math.min(1, (time - travel.time) / Math.max(1e-6, travel.endTime - travel.time)) : null;
  return {
    dash: flight.physicsModifier?.kind === 'dash' && time >= flight.physicsModifier.startTime && time <= flight.directHitTime,
    bombPlanted: Boolean(flight.bomb && time >= flight.bomb.plantedAt && time < flight.bomb.explodeAt),
    vortexActive: Boolean(flight.vortex && time >= flight.vortex.time && time < flight.vortex.time + flight.vortex.duration),
    travelPoint: progress === null ? null : {
      x: travel.point.x + (travel.end.x - travel.point.x) * progress,
      y: travel.point.y + (travel.end.y - travel.point.y) * progress
    }
  };
}

/** Presentation time only: never change the path, collision order, or simulation timestamps. */
export function createProjectilePlayback(flight, { reducedMotion = false } = {}) {
  const total = flight.simulationSeconds ?? flight.directHitTime ?? flight.path.durationSeconds;
  const baseDuration = reducedMotion ? 80 : flight.durationMs;
  const bounded = (value, limit) => Math.max(0, Math.min(limit, value));
  if (reducedMotion || total <= 0 || !Number.isFinite(flight.rollStartDistance)) {
    return { durationMs: baseDuration, sampleTime: ms => total * bounded(ms / baseDuration, 1) };
  }
  const floor = sampleAtDistance(flight.path, flight.rollStartDistance).y;
  const candyEnd = flight.directHitTime ?? total;
  const samples = [...flight.path.samples.filter(p => p.time < candyEnd), sampleAtTime(flight.path, candyEnd)];
  const rolls = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    if (a.distance < flight.rollStartDistance - 1e-6 || Math.abs(a.y - floor) > 1e-6
      || Math.abs(b.y - floor) > 1e-6 || b.time <= a.time) continue;
    const moved = Math.abs(b.x - a.x);
    if (moved <= 1e-6) continue;
    const previous = rolls.at(-1);
    if (previous && Math.abs(previous.end - a.time) < 1e-6) {
      previous.end = b.time; previous.distance += moved;
    } else rolls.push({ start: a.time, end: b.time, distance: moved });
  }
  const pieces = [];
  let cursorTime = 0, cursorMs = 0;
  function append(end, rollingDistance = 0) {
    if (end <= cursorTime) return;
    const normalMs = (end - cursorTime) * baseDuration / total;
    const readableMs = rollingDistance > 1 ? Math.min(440, 240 + rollingDistance * 2) : 0;
    const ms = Math.max(normalMs, readableMs);
    pieces.push({ start: cursorTime, end, startMs: cursorMs, endMs: cursorMs + ms });
    cursorMs += ms; cursorTime = end;
  }
  for (const roll of rolls) { append(roll.start); append(roll.end, roll.distance); }
  append(total);
  return { durationMs: cursorMs, sampleTime: elapsed => {
    const ms = bounded(elapsed, cursorMs);
    const piece = pieces.find(item => ms <= item.endMs);
    return piece ? piece.start + (piece.end - piece.start) * (ms - piece.startMs) / (piece.endMs - piece.startMs) : total;
  } };
}
