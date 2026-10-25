const STEP = 1 / 240;
const GRAVITY = 1200;
const FRICTION = 2500;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const mix = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
  angle: a.angle + (b.angle - a.angle) * t, time: a.time + (b.time - a.time) * t,
  phase: t === 1 ? b.phase : a.phase });
const extent = (angle, hx, hy) => ({ x: Math.abs(Math.cos(angle)) * hx + Math.abs(Math.sin(angle)) * hy,
  y: Math.abs(Math.sin(angle)) * hx + Math.abs(Math.cos(angle)) * hy });

function clearance(pose, circle, hx, hy) {
  const dx = circle.x - pose.x, dy = circle.y - pose.y;
  const c = Math.cos(pose.angle), s = Math.sin(pose.angle);
  return Math.hypot(Math.max(0, Math.abs(dx * c + dy * s) - hx),
    Math.max(0, Math.abs(-dx * s + dy * c) - hy)) - circle.radius;
}

// Clearance cannot shrink faster than translation + corner-radius * rotation.
// Advancing by that bound finds the first swept contact, including a grazing hit.
function sweep(a, b, circle, hx, hy) {
  const bound = Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(hx, hy) * Math.abs(b.angle - a.angle);
  let t = 0;
  for (let i = 0; i < 96; i++) {
    const gap = clearance(mix(a, b, t), circle, hx, hy);
    if (gap <= .001) return t;
    if (bound < .000001 || t + gap / bound > 1.000001) return null;
    t = Math.min(1, t + Math.max(.000001, gap / bound * .95));
  }
  return null;
}

/** World-space rigid stack approximation. Samples own both hit testing and playback. */
export function simulateForestLog({ obstacle, point, velocity, startTime = 0, layout, enemies } = {}) {
  if (!obstacle || ![obstacle.x, obstacle.y, obstacle.width, obstacle.height, startTime,
    layout?.groundY, layout?.width].every(Number.isFinite) || obstacle.width <= 0 || obstacle.height <= 0
    || startTime < 0 || layout.width <= obstacle.width || !finitePoint(point) || !finitePoint(velocity)
    || !Array.isArray(enemies) || enemies.some(e => !e?.collider || typeof e.id !== 'string'
      || !finitePoint(e.collider) || !Number.isFinite(e.collider.radius) || e.collider.radius <= 0)
    || new Set(enemies.map(e => e.id)).size !== enemies.length) return null;
  const hx = obstacle.width / 2, hy = obstacle.height / 2;
  const initial = { x: obstacle.x + hx, y: obstacle.y + hy, angle: 0, time: 0, phase: 'airborne' };
  const height = clamp((initial.y - point.y) / hy, -1, 1);
  let vx = clamp(velocity.x * .30, -650, 650);
  let vy = Math.min(0, velocity.y * .16) - Math.min(330, 60 + Math.abs(vx) * (.4 + height * .15));
  const direction = Math.sign(vx) || 1;
  const omega = direction * clamp(Math.abs(velocity.x) / obstacle.width * .22 + 1.2 + height * .8, 1.2, 6);
  const samples = [initial];
  let hit = null, slideDistance = 0;
  for (let step = 1; step <= 720; step++) {
    const prior = samples.at(-1), angle = direction * Math.min(Math.PI / 2, Math.abs(prior.angle + omega * STEP));
    const support = extent(angle, hx, hy);
    const next = { time: step * STEP, x: prior.x + vx * STEP,
      y: prior.y + vy * STEP + .5 * GRAVITY * STEP ** 2, angle, phase: 'airborne' };
    vy += GRAVITY * STEP;
    if (next.y + support.y >= layout.groundY) {
      next.y = layout.groundY - support.y;
      next.phase = 'sliding'; vy = 0;
      const movement = Math.min(Math.abs(next.x - prior.x), Math.max(0, obstacle.width - slideDistance));
      next.x = prior.x + Math.sign(vx) * movement;
      slideDistance += movement;
      vx = Math.sign(vx) * Math.max(0, Math.abs(vx) - FRICTION * STEP);
      if (slideDistance >= obstacle.width - .000001) vx = 0;
    }
    const boundedX = clamp(next.x, support.x, layout.width - support.x);
    if (boundedX !== next.x) vx = 0;
    next.x = boundedX;
    if (!hit) {
      let first = null;
      for (const enemy of enemies) {
        const fraction = sweep(prior, next, enemy.collider, hx, hy);
        if (fraction !== null && (!first || fraction < first.fraction - .000001)) first = { enemy, fraction };
      }
      if (first) {
        hit = { id: first.enemy.id, time: startTime + mix(prior, next, first.fraction).time };
        vx *= .08;
      }
    }
    if (next.phase === 'sliding' && Math.abs(vx) < .001 && Math.abs(angle) >= Math.PI / 2 - .000001) {
      next.phase = 'settled'; samples.push(next); break;
    }
    samples.push(next);
  }
  const last = samples.at(-1);
  last.phase = 'settled';
  return { samples, startTime, durationSeconds: last.time, hit,
    endPose: { x: last.x, y: last.y, angle: last.angle }, slideDistance };
}

export function sampleLogMotion(motion, absoluteTime) {
  if (!motion?.samples?.length || !Number.isFinite(motion.startTime) || !Number.isFinite(absoluteTime)) {
    throw new TypeError('Invalid log motion');
  }
  const time = clamp(absoluteTime - motion.startTime, 0, motion.durationSeconds);
  const samples = motion.samples;
  let low = 0, high = samples.length - 1;
  while (low < high) { const mid = (low + high) >>> 1; if (samples[mid].time < time) low = mid + 1; else high = mid; }
  if (!low) return { ...samples[0] };
  const a = samples[low - 1], b = samples[low];
  return mix(a, b, (time - a.time) / (b.time - a.time));
}
