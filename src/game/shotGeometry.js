import { BATTLEFIELD, getDragDraw } from './battlefieldModel.js';

const EPS = 1e-6;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const unit = v => point(v) && Math.hypot(v.x, v.y) > 0
  ? { x: v.x / Math.hypot(v.x, v.y), y: v.y / Math.hypot(v.x, v.y) } : null;
const validLayout = l => l && [l.width, l.groundY, l.minY, l.candyRadius].every(Number.isFinite)
  && l.width > 0 && l.candyRadius > 0 && l.minY < l.groundY - l.candyRadius;
const validObstacles = props => Array.isArray(props) && props.every(p => p
  && typeof p.id === 'string' && Array.isArray(p.polygon) && p.polygon.length >= 3
  && p.polygon.every(point));
const validCircle = c => point(c) && typeof c.id === 'string'
  && Number.isFinite(c.radius) && c.radius > 0;
const pathD = samples => samples.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');

export function getPull(delta, maxDragPx) {
  if (!point(delta) || !Number.isFinite(maxDragPx) || maxDragPx <= 12) return null;
  const length = Math.hypot(delta.x, delta.y);
  if (!Number.isFinite(length)) return null;
  const direction = length ? { x: -delta.x / length, y: -delta.y / length } : { x: 1, y: 0 };
  return { direction, angleDeg: Math.atan2(-direction.y, direction.x) * 180 / Math.PI,
    powerRatio: clamp((Math.min(length, maxDragPx) - 12) / (maxDragPx - 12), 0, 1),
    distancePx: length, maxDragPx, ready: length >= 12 };
}

function makePath(kind, points, endKind, targetId = null) {
  let length = 0;
  const samples = points.map((p, i) => {
    if (i) length += distance(points[i - 1], p);
    return { x: p.x, y: p.y, time: kind === 'homing' ? length / 1400 : p.time, distance: length };
  });
  return { kind, start: { x: samples[0].x, y: samples[0].y },
    end: { x: samples.at(-1).x, y: samples.at(-1).y }, samples, length,
    durationSeconds: samples.at(-1).time, endKind, homingTargetId: targetId, d: pathD(samples) };
}

export function getBallisticPath({ start, direction, powerRatio, layout } = {}) {
  const u = unit(direction);
  if (!point(start) || !u || !Number.isFinite(powerRatio) || !validLayout(layout)) return null;
  const ground = layout.groundY - layout.candyRadius;
  if (start.y > ground || start.y < layout.minY || start.x < -layout.candyRadius
    || start.x > layout.width + layout.candyRadius) return null;
  const speed = BATTLEFIELD.minSpeed + (BATTLEFIELD.maxSpeed - BATTLEFIELD.minSpeed)
    * clamp(powerRatio, 0, 1);
  const vx = u.x * speed, vy = u.y * speed, g = BATTLEFIELD.gravity;
  let endTime = BATTLEFIELD.maxSeconds, endKind = 'timeout';
  const consider = (time, kind) => {
    if (Number.isFinite(time) && time >= 0 && time < endTime) {
      endTime = time; endKind = kind;
    }
  };
  // Positive root is the descending ground crossing, including immediate downward contact.
  consider((-vy + Math.sqrt(vy * vy + 2 * g * (ground - start.y))) / g, 'ground');
  if (vx > 0) consider((layout.width + layout.candyRadius - start.x) / vx, 'bounds');
  if (vx < 0) consider((-layout.candyRadius - start.x) / vx, 'bounds');
  const ceilingDiscriminant = vy * vy + 2 * g * (layout.minY - start.y);
  if (vy < 0 && ceilingDiscriminant >= 0) {
    consider((-vy - Math.sqrt(ceilingDiscriminant)) / g, 'bounds');
  }
  const at = time => ({ x: start.x + vx * time,
    y: start.y + vy * time + .5 * g * time * time, time });
  const points = [at(0)];
  for (let i = 1; i * BATTLEFIELD.sampleStep < endTime; i++) points.push(at(i * BATTLEFIELD.sampleStep));
  if (endTime > 0) points.push(at(endTime));
  return makePath('ballistic', points, endKind);
}

function validateSamples(path) {
  if (!path || !Array.isArray(path.samples) || !path.samples.length
    || !Number.isFinite(path.length) || path.length < 0) throw new TypeError('Invalid path samples');
  let previous;
  for (const p of path.samples) {
    if (!point(p) || !Number.isFinite(p.time) || !Number.isFinite(p.distance)
      || p.time < 0 || p.distance < 0 || (!previous && (p.time !== 0 || p.distance !== 0))
      || (previous && (p.time <= previous.time || p.distance <= previous.distance))) {
      throw new TypeError('Samples must have finite, strictly increasing time and distance');
    }
    previous = p;
  }
  if (Math.abs(previous.distance - path.length) > EPS) throw new TypeError('Path length disagrees with samples');
}

function sampleUnchecked(path, requested) {
  const d = clamp(requested, 0, path.length), samples = path.samples;
  let low = 0, high = samples.length - 1;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (samples[mid].distance < d) low = mid + 1;
    else high = mid;
  }
  const b = samples[low];
  if (low === 0) return { ...b };
  const a = samples[low - 1], t = (d - a.distance) / (b.distance - a.distance);
  return { ...lerp(a, b, t), time: a.time + (b.time - a.time) * t, distance: d };
}

export function sampleAtDistance(path, requested) {
  validateSamples(path);
  if (!Number.isFinite(requested)) throw new TypeError('Distance must be finite');
  return sampleUnchecked(path, requested);
}

export function pathPrefixD(path, requested) {
  validateSamples(path);
  if (!Number.isFinite(requested)) throw new TypeError('Distance must be finite');
  const end = sampleUnchecked(path, requested);
  return pathD([...path.samples.filter(p => p.distance < end.distance), end]);
}

function pointEdgeDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
  const t = length2 ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / length2, 0, 1) : 0;
  return distance(p, lerp(a, b, t));
}
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function segmentsIntersect(a, b, c, d) {
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  return ((abC > 0 && abD < 0) || (abC < 0 && abD > 0))
    && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0));
}
function inside(p, polygon) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y)
      && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}
function discSegmentTouches(a, b, polygon, radius) {
  if (inside(a, polygon) || inside(b, polygon)) return true;
  return polygon.some((c, i) => {
    const d = polygon[(i + 1) % polygon.length];
    return segmentsIntersect(a, b, c, d) || Math.min(pointEdgeDistance(a, c, d),
      pointEdgeDistance(b, c, d), pointEdgeDistance(c, a, b), pointEdgeDistance(d, a, b)) <= radius;
  });
}

/** Earliest swept-disc contact; also used to verify authored Wind routes. */
export function findObstacleContact(path, obstacles, radius) {
  validateSamples(path);
  if (!validObstacles(obstacles) || !Number.isFinite(radius) || radius < 0) {
    throw new TypeError('Invalid solid obstacles');
  }
  let nearest = null;
  for (const obstacle of obstacles) {
    const samples = path.samples;
    if (discSegmentTouches(samples[0], samples[0], obstacle.polygon, radius)) {
      if (!nearest || nearest.distance > 0) nearest = { id: obstacle.id, distance: 0 };
      continue;
    }
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i];
      if (nearest && a.distance > nearest.distance) break;
      if (!discSegmentTouches(a, b, obstacle.polygon, radius)) continue;
      let low = 0, high = 1;
      // A prefix containing any contact stays contacting as its endpoint moves forward.
      // 20 subdivisions leave ~1e-5 world-unit error at full speed, larger than
      // the 1e-6 wall-wins tie rule. 32 keeps contact ordering below that tolerance.
      for (let step = 0; step < 32; step++) {
        const mid = (low + high) / 2;
        if (discSegmentTouches(a, lerp(a, b, mid), obstacle.polygon, radius)) high = mid;
        else low = mid;
      }
      const hitDistance = a.distance + (b.distance - a.distance) * high;
      if (!nearest || hitDistance < nearest.distance) nearest = { id: obstacle.id, distance: hitDistance };
      break;
    }
  }
  return nearest;
}

function circleContact(path, circle, radius) {
  const expanded = circle.radius + radius, samples = path.samples;
  if (distance(samples[0], circle) <= expanded) return 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i], dx = b.x - a.x, dy = b.y - a.y;
    const ox = a.x - circle.x, oy = a.y - circle.y;
    const aa = dx * dx + dy * dy, bb = 2 * (ox * dx + oy * dy);
    const cc = ox * ox + oy * oy - expanded * expanded, disc = bb * bb - 4 * aa * cc;
    if (aa === 0 || disc < -1e-9) continue;
    const t = (-bb - Math.sqrt(Math.max(0, disc))) / (2 * aa);
    if (t >= -1e-9 && t <= 1 + 1e-9) return a.distance + (b.distance - a.distance) * clamp(t, 0, 1);
  }
  return null;
}

export function getHomingPath({ start, target, obstacles, layout } = {}) {
  if (!point(start) || !validCircle(target) || !validLayout(layout)
    || !validObstacles(obstacles) || distance(start, target) < EPS) return null;
  const safeY = Math.min(start.y, target.y, ...obstacles.flatMap(o => o.polygon.map(p => p.y))) - 140;
  if (safeY < layout.minY || start.y > layout.groundY - layout.candyRadius
    || target.y > layout.groundY - layout.candyRadius || start.y < layout.minY
    || [start.x, target.x].some(x => x < 0 || x > layout.width)) return null;
  const route = [start, { x: start.x, y: safeY }, { x: target.x, y: safeY }, target];
  const points = [{ ...start }];
  const lineTo = end => {
    const a = points.at(-1), count = Math.max(1, Math.ceil(distance(a, end) / 4));
    for (let i = 1; i <= count; i++) {
      const p = lerp(a, end, i / count);
      if (distance(points.at(-1), p) > 1e-10) points.push(p);
    }
  };
  for (let i = 1; i <= 2; i++) {
    const a = route[i - 1], corner = route[i], b = route[i + 1];
    const radius = Math.min(48, distance(a, corner) / 4, distance(corner, b) / 4);
    const before = lerp(corner, a, radius / (distance(a, corner) || 1));
    const after = lerp(corner, b, radius / (distance(corner, b) || 1));
    lineTo(before);
    const count = Math.max(1, Math.ceil(2 * radius / 4));
    for (let j = 1; j <= count; j++) {
      const t = j / count;
      const p = lerp(lerp(before, corner, t), lerp(corner, after, t), t);
      if (distance(points.at(-1), p) > 1e-10) points.push(p);
    }
  }
  lineTo(target);
  const path = makePath('homing', points, 'target', target.id);
  return findObstacleContact(path, obstacles, layout.candyRadius) ? null : path;
}

export function planShot({ layout, pull, enemies, windAvailable = false } = {}) {
  if (!validLayout(layout) || !validObstacles(layout.obstacles)
    || !Array.isArray(layout.enemies) || !layout.enemies.every(e => validCircle(e?.collider))
    || !point(layout.launcher) || !Array.isArray(enemies) || !pull?.ready
    || !unit(pull.direction) || !Number.isFinite(pull.powerRatio)) return null;
  const direction = unit(pull.direction), draw = getDragDraw({ ...pull, direction });
  const start = { x: layout.launcher.x + draw.pouch.x, y: layout.launcher.y + draw.pouch.y };
  const ballistic = getBallisticPath({ start, direction, powerRatio: pull.powerRatio, layout });
  if (!ballistic) return null;
  const alive = new Set(enemies.filter(e => e && e.alive === true && Number.isFinite(e.hp) && e.hp > 0).map(e => e.id));
  const living = layout.enemies.filter(e => alive.has(e.id));
  let path = ballistic, target = null;
  if (windAvailable && direction.x > 1e-4) {
    const candidates = living.filter(e => e.collider.x > start.x);
    // Stable sort preserves original slot order for equal endpoint distances.
    candidates.sort((a, b) => Math.abs(a.collider.x - ballistic.end.x) - Math.abs(b.collider.x - ballistic.end.x));
    target = candidates[0] ?? null;
    if (target) {
      path = getHomingPath({ start, target: target.collider, obstacles: layout.obstacles, layout });
      if (!path) return null;
    }
  }
  const barrier = findObstacleContact(path, layout.obstacles, layout.candyRadius);
  const hits = target ? [{ id: target.id, distance: path.length }]
    : living.map(e => ({ id: e.id, distance: circleContact(path, e.collider, layout.candyRadius) }))
      .filter(h => h.distance !== null && (!barrier || h.distance < barrier.distance - EPS))
      .sort((a, b) => a.distance - b.distance);
  const hitIds = [...new Set(hits.map(h => h.id))];
  const first = hits[0];
  const obstacleFirst = barrier && (!first || barrier.distance <= first.distance + EPS);
  const impactDistance = obstacleFirst ? barrier.distance : first ? first.distance : path.length;
  return { path, hitIds, selectedTargetId: target?.id ?? null,
    impactKind: obstacleFirst ? 'obstacle' : first ? 'enemy' : path.endKind,
    impactDistance, obstacleId: obstacleFirst ? barrier.id : null,
    blockerDistance: barrier?.distance ?? null,
    previewD: pathPrefixD(path, Math.min(.30 * path.length, barrier?.distance ?? Infinity)),
    reverse: direction.x < 0,
    durationMs: clamp(sampleUnchecked(path, impactDistance).time * 1000, 420, 3200) };
}
