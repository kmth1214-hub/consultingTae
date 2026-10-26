import { BATTLEFIELD, getDragDraw } from './battlefieldModel.js';
import { simulateObstacleMotion } from './forestLogPhysics.js';

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
    durationSeconds: samples.at(-1).time, endKind, homingTargetId: targetId, d: pathD(samples),
    rollStartDistance: null };
}

export function getBallisticPath({ start, direction, powerRatio, layout } = {}) {
  const u = unit(direction);
  if (!point(start) || !u || !Number.isFinite(powerRatio) || !validLayout(layout)) return null;
  const speed = BATTLEFIELD.minSpeed + (BATTLEFIELD.maxSpeed - BATTLEFIELD.minSpeed)
    * clamp(powerRatio, 0, 1);
  return ballisticFromVelocity(start, { x: u.x * speed, y: u.y * speed }, layout);
}

function ballisticFromVelocity(start, velocity, layout) {
  if (!point(start) || !point(velocity) || !validLayout(layout)) return null;
  const ground = layout.groundY - layout.candyRadius;
  if (start.y > ground + EPS || start.y < layout.minY || start.x < -layout.candyRadius
    || start.x > layout.width + layout.candyRadius) return null;
  const vx = velocity.x, vy = velocity.y, g = BATTLEFIELD.gravity;
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

/** Add a friction-limited, horizontal ground segment to a grounded ballistic path. */
export function appendGroundRoll(path, horizontalSpeed, layout,
  maxRollDistance = layout?.candyRadius * 2 * BATTLEFIELD.maxRollDiameters) {
  if (!path || path.kind !== 'ballistic' || path.endKind !== 'ground'
    || !point(path.end) || !Number.isFinite(path.durationSeconds) || path.durationSeconds < 0
    || !Number.isFinite(horizontalSpeed) || !validLayout(layout)
    || !Number.isFinite(BATTLEFIELD.groundRollDeceleration) || BATTLEFIELD.groundRollDeceleration <= 0
    || !Number.isFinite(maxRollDistance) || maxRollDistance < 0) {
    throw new TypeError('Ground roll requires a grounded ballistic path and valid speed/layout');
  }
  validateSamples(path);
  const groundY = layout.groundY - layout.candyRadius;
  if (Math.abs(path.end.y - groundY) > EPS || path.end.x < -layout.candyRadius - EPS
    || path.end.x > layout.width + layout.candyRadius + EPS) {
    throw new TypeError('Grounded path endpoint is outside the battlefield floor');
  }

  const speed = Math.abs(horizontalSpeed), acceleration = BATTLEFIELD.groundRollDeceleration;
  const rollStartDistance = path.length;
  const frictionDistance = speed < 1 ? 0 : Math.min(speed * speed / (2 * acceleration), maxRollDistance);
  const direction = Math.sign(horizontalSpeed);
  const edge = direction < 0 ? -layout.candyRadius : layout.width + layout.candyRadius;
  const availableDistance = direction ? Math.abs(edge - path.end.x) : 0;
  const rollDistance = Math.min(frictionDistance, availableDistance);
  if (rollDistance <= 0) {
    const atEdge = direction !== 0 && availableDistance <= EPS;
    const endKind = atEdge ? 'bounds' : path.endKind;
    const unchanged = endKind === path.endKind ? path : makePath(path.kind, path.samples, endKind);
    return { path: unchanged, rollStartDistance, rollDistance: 0 };
  }

  const steps = Math.ceil(rollDistance / 4), rolling = [];
  for (let i = 1; i <= steps; i++) {
    const distanceAlongRoll = rollDistance * i / steps;
    const remainingSpeed = Math.sqrt(Math.max(0, speed * speed - 2 * acceleration * distanceAlongRoll));
    const time = (speed - remainingSpeed) / acceleration;
    rolling.push({ x: path.end.x + direction * distanceAlongRoll, y: groundY,
      time: path.durationSeconds + time });
  }
  const reachedEdge = availableDistance < frictionDistance - EPS;
  const extended = makePath(path.kind, [...path.samples, ...rolling], reachedEdge ? 'bounds' : 'ground');
  extended.rollStartDistance = rollStartDistance;
  return { path: extended, rollStartDistance, rollDistance };
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

export function sampleAtTime(path, requested) {
  validateSamples(path);
  if (!Number.isFinite(requested)) throw new TypeError('Time must be finite');
  const time = clamp(requested, 0, path.durationSeconds), samples = path.samples;
  let low = 0, high = samples.length - 1;
  while (low < high) { const mid = (low + high) >>> 1; if (samples[mid].time < time) low = mid + 1; else high = mid; }
  if (!low) return { ...samples[0] };
  const a = samples[low - 1], b = samples[low], t = (time - a.time) / (b.time - a.time);
  return { ...lerp(a, b, t), time, distance: a.distance + (b.distance - a.distance) * t };
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

function planStackedShot({ layout, start, direction, powerRatio, living }) {
  const initialSpeed = BATTLEFIELD.minSpeed + (BATTLEFIELD.maxSpeed - BATTLEFIELD.minSpeed)
    * clamp(powerRatio, 0, 1);
  let velocity = { x: direction.x * initialSpeed, y: direction.y * initialSpeed };
  let position = start, rolling = false;
  let rollBudget = layout.candyRadius * 2 * BATTLEFIELD.maxRollDiameters;
  let rollDistance = 0, rollStartDistance = null;
  let elapsed = 0, traveled = 0;
  let samples = [{ ...start, time: 0 }];
  const contacts = [], ignored = new Set(), pending = [];
  let firstContactDistance = null, terminal = 'timeout', targetId = null;

  const activate = (obstacle, hitPoint, impactVelocity, time, isRolling, source = null) => {
    if (ignored.has(obstacle.id)) return;
    ignored.add(obstacle.id);
    const forestLog = layout.area === 'forest' && obstacle.kind === 'log';
    const motion = simulateObstacleMotion({ obstacle, point: hitPoint, velocity: impactVelocity,
      startTime: time, layout, enemies: forestLog ? living : [],
      obstacles: layout.obstacles.filter(item => !ignored.has(item.id)), transfer: Boolean(source) });
    const contact = { obstacleId: obstacle.id, obstacleKind: obstacle.kind,
      point: { x: hitPoint.x, y: hitPoint.y }, time, rolling: isRolling,
      trigger: source ? 'obstacle' : 'candy', sourceObstacleId: source?.obstacleId ?? null,
      chainDepth: source ? source.chainDepth + 1 : 0, direction: Math.sign(impactVelocity.x) || 1,
      obstacleTargetIds: [...living].sort((a, b) => distance(hitPoint, a.collider)
        - distance(hitPoint, b.collider)).map(item => item.id),
      ...(motion ? { obstacleMotion: motion, obstacleEndPose: motion.endPose,
        ...(forestLog ? { logMotion: motion, logHit: motion.hit, logEndPose: motion.endPose } : {}) } : {}) };
    contacts.push(contact);
    for (const hit of motion?.obstacleHits || []) pending.push({ ...hit, source: contact });
  };
  const advanceChains = until => {
    pending.sort((a, b) => a.time - b.time);
    while (pending.length && pending[0].time <= until + EPS) {
      const hit = pending.shift();
      if (ignored.has(hit.id)) continue;
      const obstacle = layout.obstacles.find(item => item.id === hit.id);
      activate(obstacle, hit.point, hit.velocity, Math.max(hit.time, hit.source.time + EPS), false, hit.source);
      pending.sort((a, b) => a.time - b.time);
    }
  };

  const appendPrefix = (segment, endDistance) => {
    const prefix = [...segment.samples.filter(p => p.distance < endDistance - EPS),
      sampleUnchecked(segment, endDistance)];
    for (const p of prefix.slice(1)) {
      const next = { x: p.x, y: p.y, time: elapsed + p.time };
      if (next.time > samples.at(-1).time + EPS
        && distance(next, samples.at(-1)) > EPS) samples.push(next);
    }
    traveled += endDistance;
    elapsed += sampleUnchecked(segment, endDistance).time;
    position = { x: samples.at(-1).x, y: samples.at(-1).y };
  };

  for (let iteration = 0; iteration <= layout.obstacles.length; iteration++) {
    let segment = rolling
      ? makePath('ballistic', [{ ...position, time: 0 }], 'ground')
      : ballisticFromVelocity(position, velocity, layout);
    if (!segment) return null;
    let localRollStart = rolling ? 0 : null;
    if (segment.endKind === 'ground' && rollBudget > 0) {
      const extended = appendGroundRoll(segment, velocity.x, layout, rollBudget);
      segment = extended.path;
      if (extended.rollDistance > 0 && !rolling) localRollStart = extended.rollStartDistance;
    }
    const enemyHits = living.map(enemy => ({ id: enemy.id,
      distance: circleContact(segment, enemy.collider, layout.candyRadius) }))
      .filter(hit => hit.distance !== null).sort((a, b) => a.distance - b.distance);
    const enemy = enemyHits[0];
    let remaining, barrier;
    // A neighbouring stack can fall before the candy reaches it. Recompute only
    // that collision, so the candy never loses energy against an empty location.
    for (;;) {
      remaining = layout.obstacles.filter(item => !ignored.has(item.id));
      barrier = findObstacleContact(segment, remaining, layout.candyRadius);
      const nextDistance = Math.min(barrier?.distance ?? segment.length, enemy?.distance ?? segment.length);
      advanceChains(elapsed + sampleUnchecked(segment, nextDistance).time);
      if (!barrier || !ignored.has(barrier.id)) break;
    }
    const obstacleFirst = barrier && (!enemy || barrier.distance <= enemy.distance + EPS);
    const endDistance = obstacleFirst ? barrier.distance : enemy ? enemy.distance : segment.length;
    const hitPoint = sampleUnchecked(segment, endDistance);
    const isRolling = localRollStart !== null && endDistance > localRollStart + EPS;
    if (localRollStart !== null && endDistance > localRollStart) {
      if (rollStartDistance === null) rollStartDistance = traveled + localRollStart;
      const moved = endDistance - localRollStart;
      rollDistance += moved;
      rollBudget = Math.max(0, rollBudget - moved);
    }
    appendPrefix(segment, endDistance);

    if (obstacleFirst) {
      const obstacle = remaining.find(item => item.id === barrier.id);
      if (firstContactDistance === null) firstContactDistance = traveled;
      const impactVelocity = isRolling ? {
        x: Math.sign(velocity.x) * Math.sqrt(Math.max(0, velocity.x ** 2
          - 2 * BATTLEFIELD.groundRollDeceleration * (endDistance - localRollStart))), y: 0 }
        : { x: velocity.x, y: velocity.y + BATTLEFIELD.gravity * hitPoint.time };
      activate(obstacle, hitPoint, impactVelocity, elapsed, isRolling);
      const speed = Math.hypot(impactVelocity.x, impactVelocity.y);
      if (isRolling) {
        rolling = true;
        velocity = { x: impactVelocity.x * .55, y: 0 };
        if (Math.abs(velocity.x) < 30 || rollBudget <= EPS) { terminal = 'ground'; break; }
      } else if (speed >= 520) {
        rolling = false;
        velocity = { x: impactVelocity.x * .72, y: impactVelocity.y * .72 };
      } else {
        rolling = false;
        velocity = { x: impactVelocity.x * .22, y: Math.max(120, impactVelocity.y * .5) };
      }
      continue;
    }
    terminal = enemy ? 'enemy' : segment.endKind;
    targetId = enemy?.id ?? null;
    break;
  }
  const path = makePath('ballistic', samples, terminal);
  path.rollStartDistance = rollStartDistance;
  advanceChains(Infinity);
  contacts.sort((a, b) => a.time - b.time);
  for (const contact of contacts) contact.distance = sampleAtTime(path, contact.time).distance;
  const first = contacts[0];
  const simulationSeconds = Math.max(path.durationSeconds, ...contacts.map(c =>
    c.obstacleMotion ? c.obstacleMotion.startTime + c.obstacleMotion.durationSeconds : 0));
  return { path, hitIds: targetId ? [targetId] : [], selectedTargetId: null,
    impactKind: terminal, impactDistance: path.length,
    obstacleId: first?.obstacleId ?? null, obstacleKind: first?.obstacleKind ?? null,
    obstacleTargetIds: first?.obstacleTargetIds ?? [], contacts,
    rollStartDistance, rollDistance, blockerDistance: firstContactDistance,
    previewD: pathPrefixD(path, Math.min(.30 * path.length, firstContactDistance ?? Infinity)),
    reverse: direction.x < 0, directHitTime: path.durationSeconds, simulationSeconds,
    durationMs: clamp(simulationSeconds * 1000, 420, 4500) };
}

export function planShot({ layout, pull, enemies, windAvailable = false,
  toppledObstacleIds = [] } = {}) {
  if (!validLayout(layout) || !validObstacles(layout.obstacles)
    || !Array.isArray(layout.enemies) || !layout.enemies.every(e => validCircle(e?.collider))
    || !point(layout.launcher) || !Array.isArray(enemies) || !pull?.ready
    || !unit(pull.direction) || !Number.isFinite(pull.powerRatio)
    || !Array.isArray(toppledObstacleIds)) return null;
  const activeLayout = { ...layout, obstacles: layout.obstacles.filter(item =>
    !toppledObstacleIds.includes(item.id)) };
  const direction = unit(pull.direction), draw = getDragDraw({ ...pull, direction });
  const start = { x: layout.launcher.x + draw.pouch.x, y: layout.launcher.y + draw.pouch.y };
  const ballistic = getBallisticPath({ start, direction, powerRatio: pull.powerRatio, layout: activeLayout });
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
      path = getHomingPath({ start, target: target.collider, obstacles: activeLayout.obstacles, layout });
      if (!path) return null;
    }
  }
  if (!target && activeLayout.obstacles.some(item => item.kind)) {
    return planStackedShot({ layout: activeLayout, start, direction,
      powerRatio: pull.powerRatio, living });
  }
  const hitsFor = candidate => target ? [{ id: target.id, distance: candidate.length }]
    : living.map(e => ({ id: e.id, distance: circleContact(candidate, e.collider, layout.candyRadius) }))
      .filter(h => h.distance !== null)
      .sort((a, b) => a.distance - b.distance);
  let barrier = findObstacleContact(path, activeLayout.obstacles, layout.candyRadius);
  let hits = hitsFor(path).filter(h => !barrier || h.distance < barrier.distance - EPS);
  let first = hits[0];
  let obstacleFirst = Boolean(barrier && (!first || barrier.distance <= first.distance + EPS));
  let rollStartDistance = null, rollDistance = 0;

  // Only an unobstructed ballistic landing may continue into a ground roll.
  if (!target && path.kind === 'ballistic' && path.endKind === 'ground' && !barrier && !first) {
    const speed = BATTLEFIELD.minSpeed + (BATTLEFIELD.maxSpeed - BATTLEFIELD.minSpeed)
      * clamp(pull.powerRatio, 0, 1);
    const rolling = appendGroundRoll(path, direction.x * speed, layout);
    path = rolling.path;
    rollDistance = rolling.rollDistance;
    rollStartDistance = rollDistance > 0 ? rolling.rollStartDistance : null;
    barrier = findObstacleContact(path, activeLayout.obstacles, layout.candyRadius);
    hits = hitsFor(path).filter(h => !barrier || h.distance < barrier.distance - EPS);
    first = hits[0];
    obstacleFirst = Boolean(barrier && (!first || barrier.distance <= first.distance + EPS));
  }

  const impactDistance = obstacleFirst ? barrier.distance : first ? first.distance : path.length;
  const obstacle = obstacleFirst ? activeLayout.obstacles.find(item => item.id === barrier.id) : null;
  const impactPoint = obstacleFirst ? sampleUnchecked(path, impactDistance) : null;
  const obstacleTargetIds = obstacleFirst ? [...living]
    .sort((a, b) => distance(impactPoint, a.collider) - distance(impactPoint, b.collider))
    .map(enemy => enemy.id) : [];
  const resolvedHits = rollStartDistance === null ? hits : hits.slice(0, 1);
  return { path, hitIds: [...new Set(resolvedHits.map(h => h.id))], selectedTargetId: target?.id ?? null,
    impactKind: obstacleFirst ? 'obstacle' : first ? 'enemy' : path.endKind,
    impactDistance, obstacleId: obstacleFirst ? barrier.id : null,
    obstacleKind: obstacle?.kind ?? null, obstacleTargetIds, rollStartDistance, rollDistance,
    blockerDistance: barrier?.distance ?? null, contacts: [],
    previewD: pathPrefixD(path, Math.min(.30 * path.length, barrier?.distance ?? Infinity)),
    reverse: direction.x < 0,
    directHitTime: sampleUnchecked(path, impactDistance).time,
    simulationSeconds: sampleUnchecked(path, impactDistance).time,
    durationMs: clamp(sampleUnchecked(path, impactDistance).time * 1000, 420, 3200) };
}
