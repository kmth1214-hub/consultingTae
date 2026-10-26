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

const rotatePolygon = (local, pose) => {
  const c = Math.cos(pose.angle), s = Math.sin(pose.angle);
  return local.map(p => ({ x: pose.x + p.x * c - p.y * s, y: pose.y + p.x * s + p.y * c }));
};
function polygonGap(a, b) {
  let gap = -Infinity;
  for (const polygon of [a, b]) for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i], q = polygon[(i + 1) % polygon.length];
    const length = Math.hypot(q.x - p.x, q.y - p.y);
    if (!length) continue;
    const nx = -(q.y - p.y) / length, ny = (q.x - p.x) / length;
    let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
    for (const v of a) { const d = v.x * nx + v.y * ny; aMin = Math.min(aMin, d); aMax = Math.max(aMax, d); }
    for (const v of b) { const d = v.x * nx + v.y * ny; bMin = Math.min(bMin, d); bMax = Math.max(bMax, d); }
    gap = Math.max(gap, bMin - aMax, aMin - bMax);
  }
  return gap;
}
function nearestOnPolygon(point, polygon) {
  let nearest = null, best = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
    const t = length2 ? clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / length2, 0, 1) : 0;
    const p = { x: a.x + t * dx, y: a.y + t * dy }, d = Math.hypot(p.x - point.x, p.y - point.y);
    if (d < best) { best = d; nearest = p; }
  }
  return nearest;
}
function sweepPolygon(a, b, local, target, radius) {
  const box = target.bounds;
  if (Math.max(a.x, b.x) + radius < box.minX || Math.min(a.x, b.x) - radius > box.maxX
    || Math.max(a.y, b.y) + radius < box.minY || Math.min(a.y, b.y) - radius > box.maxY) return null;
  const bound = Math.hypot(b.x - a.x, b.y - a.y) + radius * Math.abs(b.angle - a.angle);
  let t = 0;
  for (let i = 0; i < 96; i++) {
    const gap = polygonGap(rotatePolygon(local, mix(a, b, t)), target.polygon);
    if (gap <= .001) return t;
    if (bound < .000001 || t + gap / bound > 1.000001) return null;
    t = Math.min(1, t + Math.max(.000001, gap / bound * .95));
  }
  return null;
}

/** World-space stack approximation. Samples own both hit testing and playback. */
export function simulateObstacleMotion({ obstacle, point, velocity, startTime = 0, layout,
  enemies = [], obstacles = [], transfer = false } = {}) {
  if (!obstacle || ![obstacle.x, obstacle.y, obstacle.width, obstacle.height, startTime,
    layout?.groundY, layout?.width].every(Number.isFinite) || obstacle.width <= 0 || obstacle.height <= 0
    || startTime < 0 || layout.width <= obstacle.width || !finitePoint(point) || !finitePoint(velocity)
    || !Array.isArray(enemies) || enemies.some(e => !e?.collider || typeof e.id !== 'string'
      || !finitePoint(e.collider) || !Number.isFinite(e.collider.radius) || e.collider.radius <= 0)
    || new Set(enemies.map(e => e.id)).size !== enemies.length
    || !Array.isArray(obstacles) || obstacles.some(o => typeof o?.id !== 'string'
      || !Array.isArray(o.polygon) || o.polygon.length < 3 || !o.polygon.every(finitePoint))) return null;
  const hx = obstacle.width / 2, hy = obstacle.height / 2;
  const initial = { x: obstacle.x + hx, y: obstacle.y + hy, angle: 0, time: 0, phase: 'airborne' };
  const height = clamp((initial.y - point.y) / hy, -1, 1);
  if (obstacle.polygon !== undefined && (!Array.isArray(obstacle.polygon)
    || obstacle.polygon.length < 3 || !obstacle.polygon.every(finitePoint))) return null;
  const local = (obstacle.polygon || [
    { x: obstacle.x, y: obstacle.y }, { x: obstacle.x + obstacle.width, y: obstacle.y },
    { x: obstacle.x + obstacle.width, y: obstacle.y + obstacle.height },
    { x: obstacle.x, y: obstacle.y + obstacle.height }
  ]).map(p => ({ x: p.x - initial.x, y: p.y - initial.y }));
  if (local.length < 3 || !local.every(finitePoint)) return null;
  const radius = Math.max(...local.map(p => Math.hypot(p.x, p.y)));
  const targets = obstacles.filter(o => o.id !== obstacle.id).map(o => ({ ...o,
    bounds: { minX: Math.min(...o.polygon.map(p => p.x)), maxX: Math.max(...o.polygon.map(p => p.x)),
      minY: Math.min(...o.polygon.map(p => p.y)), maxY: Math.max(...o.polygon.map(p => p.y)) } }));
  const obstacleHits = [], touched = new Set();
  let vx = clamp(velocity.x * (transfer ? .65 : .30), -650, 650);
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
    for (const target of targets) {
      if (touched.has(target.id)) continue;
      const fraction = sweepPolygon(prior, next, local, target, radius);
      if (fraction === null) continue;
      const pose = mix(prior, next, fraction), body = rotatePolygon(local, pose);
      // Pick the closest pair of boundary points, rather than the target centre.
      let contact = null, closest = Infinity;
      for (const p of body) {
        const q = nearestOnPolygon(p, target.polygon), d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < closest) { closest = d; contact = q; }
      }
      for (const p of target.polygon) {
        const q = nearestOnPolygon(p, body), d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < closest) { closest = d; contact = p; }
      }
      const spin = (next.angle - prior.angle) / STEP;
      const incoming = { x: (next.x - prior.x) / STEP - spin * (contact.y - pose.y),
        y: (next.y - prior.y) / STEP + spin * (contact.x - pose.x) };
      if (Math.hypot(incoming.x, incoming.y) < 80) continue;
      touched.add(target.id);
      obstacleHits.push({ id: target.id, time: startTime + pose.time, point: contact, velocity: incoming });
    }
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
    endPose: { x: last.x, y: last.y, angle: last.angle }, slideDistance,
    obstacleHits: obstacleHits.sort((a, b) => a.time - b.time) };
}

export function simulateForestLog(args) { return simulateObstacleMotion(args); }

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
