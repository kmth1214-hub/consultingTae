import { BATTLEFIELD, getDragDraw, getLaunchSpeed } from './battlefieldModel.js';
import { simulateObstacleMotion, simulateRiderFall, sampleRiderMotion } from './forestLogPhysics.js';
import { sampleWindAcceleration, crossedWindZone } from './windField.js';
import { STONE_STATS } from './signatureStones.js';

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
    return { x: p.x, y: p.y, time: kind === 'homing' ? length / 1400 : p.time,
      distance: length, ...(Number.isFinite(p.vx) ? { vx: p.vx } : {}) };
  });
  return { kind, start: { x: samples[0].x, y: samples[0].y },
    end: { x: samples.at(-1).x, y: samples.at(-1).y }, samples, length,
    durationSeconds: samples.at(-1).time, endKind, homingTargetId: targetId, d: pathD(samples),
    rollStartDistance: null };
}

export function getBallisticPath({ start, direction, powerRatio, layout, windField = null, dash = null } = {}) {
  const u = unit(direction);
  if (!point(start) || !u || !Number.isFinite(powerRatio) || !validLayout(layout)) return null;
  const speed = getLaunchSpeed(powerRatio);
  return ballisticFromVelocity(start, { x: u.x * speed, y: u.y * speed }, layout, windField, dash);
}

function ballisticFromVelocity(start, velocity, layout, windField = null, dash = null) {
  if (!point(start) || !point(velocity) || !validLayout(layout)) return null;
  const ground = layout.groundY - layout.candyRadius;
  if (start.y > ground + EPS) return null;
  const vx = velocity.x, vy = velocity.y, g = BATTLEFIELD.gravity;
  let endTime = BATTLEFIELD.maxSeconds, endKind = 'timeout';
  const consider = (time, kind) => {
    if (Number.isFinite(time) && time >= 0 && time < endTime) {
      endTime = time; endKind = kind;
    }
  };
  // Positive root is the descending ground crossing, including immediate downward contact.
  consider((-vy + Math.sqrt(vy * vy + 2 * g * (ground - start.y))) / g, 'ground');
  // Camera bounds describe the artwork, not invisible walls for a flying candy.
  const at = time => ({ x: start.x + vx * time,
    y: start.y + vy * time + .5 * g * time * time, time });
  let points;
  if (windField || (dash && dash.startTime <= endTime)) {
    points = [{ ...at(0), vx }];
    let x = start.x, currentVx = vx, previousTime = 0;
    const stepCount = Math.ceil(endTime / BATTLEFIELD.sampleStep);
    const stepTo = time => {
      const dt = time - previousTime;
      if (dt <= 0) return;
      const acceleration = windField ? sampleWindAcceleration(windField, { x, y: at(previousTime).y }) : 0;
      x += currentVx * dt + .5 * acceleration * dt * dt;
      currentVx += acceleration * dt;
      points.push({ x, y: at(time).y, time, vx: currentVx });
      previousTime = time;
    };
    let dashPending = Boolean(dash);
    for (let i = 1; i <= stepCount; i++) {
      const time = i === stepCount ? endTime : i * BATTLEFIELD.sampleStep;
      if (dashPending && dash.startTime <= time) {
        stepTo(dash.startTime);
        currentVx *= dash.horizontalScale;
        points.at(-1).vx = currentVx;
        dashPending = false;
      }
      stepTo(time);
    }
  } else {
    points = [at(0)];
    for (let i = 1; i * BATTLEFIELD.sampleStep < endTime; i++) points.push(at(i * BATTLEFIELD.sampleStep));
    if (endTime > 0) points.push(at(endTime));
  }
  const end = points.at(-1);
  if (endKind === 'ground' && (end.x < -layout.candyRadius || end.x > layout.width + layout.candyRadius)) {
    endKind = 'bounds'; // No floor or ground roll beyond the authored battlefield.
  }
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
  return { ...lerp(a, b, t), time: a.time + (b.time - a.time) * t, distance: d,
    ...(Number.isFinite(a.vx) && Number.isFinite(b.vx) ? { vx: a.vx + (b.vx - a.vx) * t } : {}) };
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
  return { ...lerp(a, b, t), time, distance: a.distance + (b.distance - a.distance) * t,
    ...(Number.isFinite(a.vx) && Number.isFinite(b.vx) ? { vx: a.vx + (b.vx - a.vx) * t } : {}) };
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

/** The crow's world x at a wall-clock time, shared by preview, playback and collision. */
export function patrolX(patrol, elapsedMs) {
  return patrol.centerX + patrol.range * Math.sin(2 * Math.PI * (elapsedMs / patrol.periodMs + patrol.phase));
}

export function findPatrolContact(path, slot, flightStartMs, elapsedSeconds, candyRadius) {
  if (!slot.patrol) return circleContact(path, slot.collider, candyRadius);
  const radius = slot.collider.radius + candyRadius;
  const samples = path.samples;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const ax = patrolX(slot.patrol, flightStartMs + (elapsedSeconds + a.time) * 1000);
    const bx = patrolX(slot.patrol, flightStartMs + (elapsedSeconds + b.time) * 1000);
    const dx = a.x - ax, dy = a.y - slot.collider.y;
    const vx = (b.x - bx) - dx, vy = (b.y - slot.collider.y) - dy;
    if (dx * dx + dy * dy <= radius * radius) return a.distance;
    const aa = vx * vx + vy * vy, bb = 2 * (dx * vx + dy * vy);
    const cc = dx * dx + dy * dy - radius * radius, disc = bb * bb - 4 * aa * cc;
    if (aa <= EPS || disc < 0) continue;
    const fraction = (-bb - Math.sqrt(disc)) / (2 * aa);
    if (fraction >= 0 && fraction <= 1) return a.distance + (b.distance - a.distance) * fraction;
  }
  return null;
}

/** First swept contact against a rider whose collider follows a falling log's clock. */
export function findMovingRiderContact(path, slot, motion, elapsed, candyRadius) {
  return findTimedEnemyContact(path, elapsed, slot.collider.radius + candyRadius, time => {
    const foot = sampleRiderMotion(motion, time);
    return { x: foot.x, y: foot.y - slot.size * .52 };
  }, motion.samples.map(point => motion.startTime + point.time));
}

function findTimedEnemyContact(path, elapsed, radius, centerAt, breakpoints) {
  const { samples } = path;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const cuts = [a.time, b.time];
    for (const breakpoint of breakpoints) {
      const t = breakpoint - elapsed;
      if (t > a.time + EPS && t < b.time - EPS) cuts.push(t);
    }
    cuts.sort((x, y) => x - y);
    for (let j = 1; j < cuts.length; j++) {
      const t0 = cuts[j - 1], t1 = cuts[j];
      const f0 = (t0 - a.time) / (b.time - a.time), f1 = (t1 - a.time) / (b.time - a.time);
      const p0 = lerp(a, b, f0), p1 = lerp(a, b, f1);
      const r0 = centerAt(elapsed + t0), r1 = centerAt(elapsed + t1);
      const dx = p0.x - r0.x, dy = p0.y - r0.y;
      if (dx * dx + dy * dy <= radius * radius) return a.distance + (b.distance - a.distance) * f0;
      const vx = (p1.x - r1.x) - dx, vy = (p1.y - r1.y) - dy;
      const aa = vx * vx + vy * vy, bb = 2 * (dx * vx + dy * vy);
      const cc = dx * dx + dy * dy - radius * radius, disc = bb * bb - 4 * aa * cc;
      if (aa <= EPS || disc < 0) continue;
      const fraction = (-bb - Math.sqrt(disc)) / (2 * aa);
      if (fraction >= 0 && fraction <= 1) {
        const t = t0 + (t1 - t0) * fraction;
        return a.distance + (b.distance - a.distance) * ((t - a.time) / (b.time - a.time));
      }
    }
  }
  return null;
}

export function sampleVortexPosition(move, time) {
  if (move.fall && time >= move.fall.startTime) return sampleRiderMotion(move.fall, time);
  const phase = clamp((time - move.startTime) / (move.pullEndTime - move.startTime), 0, 1);
  const baseX = move.patrol ? patrolX(move.patrol, move.flightStartMs + time * 1000) : move.from.x;
  return { x: baseX + move.shift * phase, y: move.from.y };
}

function forMovingEnemy(path, slot, move, fall, elapsed, radius) {
  const falls = [move.fall, fall].filter(Boolean).sort((a, b) => a.startTime - b.startTime);
  const cuts = [move.startTime, move.pullEndTime,
    ...falls.flatMap(motion => motion.samples.map(sample => motion.startTime + sample.time))];
  return findTimedEnemyContact(path, elapsed, slot.collider.radius + radius, time => {
    const foot = falls[0] && time >= falls[0].startTime
      ? sampleRiderMotion(falls[0], time) : sampleVortexPosition(move, time);
    return { x: foot.x, y: foot.y - slot.size * .52 };
  }, cuts);
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
  const lineTo = (end, weave = false) => {
    const a = points.at(-1), count = Math.max(1, Math.ceil(distance(a, end) / (weave ? 2.5 : 4)));
    for (let i = 1; i <= count; i++) {
      const p = lerp(a, end, i / count);
      if (weave) p.y += 22 * Math.sin(Math.PI * i / count) * Math.sin(4 * Math.PI * i / count);
      if (distance(points.at(-1), p) > 1e-10) points.push(p);
    }
  };
  for (let i = 1; i <= 2; i++) {
    const a = route[i - 1], corner = route[i], b = route[i + 1];
    const radius = Math.min(48, distance(a, corner) / 4, distance(corner, b) / 4);
    const before = lerp(corner, a, radius / (distance(a, corner) || 1));
    const after = lerp(corner, b, radius / (distance(corner, b) || 1));
    lineTo(before, i === 2);
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

function planStackedShot({ layout, start, direction, powerRatio, living, piercing = false,
  abilityKind = null, previewFraction = .30, maxRollDiameters = BATTLEFIELD.maxRollDiameters,
  flightStartMs = 0, windField = null, maxBounces = 1, dash = null, vortexMoves = [] }) {
  const initialSpeed = getLaunchSpeed(powerRatio);
  let velocity = { x: direction.x * initialSpeed, y: direction.y * initialSpeed };
  let position = start, rolling = false;
  let rollBudget = layout.candyRadius * 2 * maxRollDiameters;
  let rollDistance = 0, rollStartDistance = null;
  let elapsed = 0, traveled = 0;
  let samples = [{ ...start, time: 0 }];
  const contacts = [], ignored = new Set(), pending = [];
  const enemyContacts = [], pierced = new Set();
  let firstContactDistance = null, terminal = 'timeout', targetId = null;
  let bounce = null, bounceExhausted = false, obstacleTouched = false;
  const bounces = [];

  const activate = (obstacle, hitPoint, impactVelocity, time, isRolling, source = null) => {
    if (ignored.has(obstacle.id)) return;
    ignored.add(obstacle.id);
    const forestLog = layout.area === 'forest' && obstacle.kind === 'log';
    let rider = obstacle.supportsEnemyId ? living.find(item =>
      item.id === obstacle.supportsEnemyId && item.supportObstacleId === obstacle.id) : null;
    const riderMove = vortexMoves.find(move => move.enemyId === rider?.id);
    if (riderMove?.fall && riderMove.fall.startTime <= time) rider = null;
    else if (riderMove && time >= riderMove.startTime) rider = { ...rider, ...sampleVortexPosition(riderMove, time) };
    const motion = simulateObstacleMotion({ obstacle, point: hitPoint, velocity: impactVelocity,
      startTime: time, layout, enemies: forestLog ? living.filter(item => item.id !== rider?.id) : [],
      enemyColliderAt: vortexMoves.length ? (slot, time) => {
        const move = vortexMoves.find(item => item.enemyId === slot.id);
        const fall = contacts.find(item => item.riderMotion?.enemyId === slot.id)?.riderMotion;
        if (!move && !fall) return slot.collider;
        const moved = fall && time >= fall.startTime && (!move?.fall || fall.startTime <= move.fall.startTime)
          ? sampleRiderMotion(fall, time) : move ? sampleVortexPosition(move, time) : slot;
        return { ...slot.collider, x: moved.x, y: moved.y - slot.size * .52 };
      } : null,
      obstacles: layout.obstacles.filter(item => !ignored.has(item.id)), transfer: Boolean(source) });
    if (!motion && rider) throw new TypeError('Invalid supported obstacle motion');
    const riderMotion = rider ? simulateRiderFall({ supportMotion: motion, riderSlot: rider,
      layout, startTime: time }) : null;
    const contact = { obstacleId: obstacle.id, obstacleKind: obstacle.kind,
      point: { x: hitPoint.x, y: hitPoint.y }, time, rolling: isRolling,
      trigger: source ? source.blastTransfer ? 'blast' : 'obstacle' : 'candy', sourceObstacleId: source?.obstacleId ?? null,
      chainDepth: source ? source.chainDepth + 1 : 0, direction: Math.sign(impactVelocity.x) || 1,
      obstacleTargetIds: [...living].sort((a, b) => distance(hitPoint, a.collider)
        - distance(hitPoint, b.collider)).map(item => item.id),
      ...(motion ? { obstacleMotion: motion, obstacleEndPose: motion.endPose,
        ...(forestLog ? { logMotion: motion, logHit: motion.hit, logEndPose: motion.endPose } : {}),
        ...(riderMotion ? { riderMotion } : {}) } : {}) };
    contacts.push(contact);
    if (layout.area === 'city' && obstacle.kind === 'crate') {
      const center = { x: obstacle.x + obstacle.width / 2, y: obstacle.y + obstacle.height / 2 };
      const radius = 420;
      contact.blast = { obstacleId: obstacle.id, point: center, time, radius,
        targetIds: living.filter(slot => distance(enemyCenterAt(slot, contacts, flightStartMs, time), center)
          <= radius + slot.collider.radius).map(slot => slot.id) };
      for (const other of layout.obstacles) {
        if (other.kind !== 'crate' || ignored.has(other.id)) continue;
        const polygon = other.polygon;
        const touches = inside(center, polygon) || polygon.some((p, i) =>
          pointEdgeDistance(center, p, polygon[(i + 1) % polygon.length]) <= radius);
        if (touches) pending.push({ id: other.id, time: time + .18,
          point: { x: other.x + other.width / 2, y: other.y + other.height / 2 },
          velocity: { x: Math.sign(other.x - obstacle.x) * 320, y: -80 },
          source: { ...contact, blastTransfer: true } });
      }
    }
    for (const hit of motion?.obstacleHits || []) pending.push({ ...hit, source: contact });
  };
  const advanceChains = until => {
    let changed = false;
    pending.sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
    while (pending.length && pending[0].time <= until + EPS) {
      const hit = pending.shift();
      if (ignored.has(hit.id)) continue;
      const obstacle = layout.obstacles.find(item => item.id === hit.id);
      activate(obstacle, hit.point, hit.velocity, Math.max(hit.time, hit.source.time + EPS), false, hit.source);
      changed = true;
      pending.sort((a, b) => a.time - b.time);
    }
    return changed;
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

  for (let iteration = 0; iteration <= layout.obstacles.length + maxBounces + 2; iteration++) {
    let segment = rolling
      ? makePath('ballistic', [{ ...position, time: 0 }], 'ground')
      : ballisticFromVelocity(position, velocity, layout, windField,
        dash && elapsed < dash.startTime ? { ...dash, startTime: dash.startTime - elapsed } : null);
    if (!segment) return null;
    const landingTime = segment.endKind === 'ground' ? elapsed + segment.durationSeconds : null;
    let localRollStart = rolling ? 0 : null;
    if (segment.endKind === 'ground' && rollBudget > 0
      && (abilityKind !== 'bounce' || bounces.length >= maxBounces || bounceExhausted)) {
      const extended = appendGroundRoll(segment, segment.samples.at(-1).vx ?? velocity.x, layout, rollBudget);
      segment = extended.path;
      if (extended.rollDistance > 0 && !rolling) localRollStart = extended.rollStartDistance;
    }
    let remaining, barrier, enemyHits, enemy;
    // A neighbouring stack can fall before the candy reaches it. Recompute only
    // that collision, so the candy never loses energy against an empty location.
    for (;;) {
      enemyHits = living.filter(item => !pierced.has(item.id)).map(item => {
        const riderMotion = contacts.find(contact => contact.riderMotion?.enemyId === item.id)?.riderMotion;
        const vortex = vortexMoves.find(move => move.enemyId === item.id);
        return { id: item.id, distance: vortex
          ? forMovingEnemy(segment, item, vortex, riderMotion, elapsed, layout.candyRadius)
          : riderMotion
          ? findMovingRiderContact(segment, item, riderMotion, elapsed, layout.candyRadius)
          : findPatrolContact(segment, item, flightStartMs, elapsed, layout.candyRadius) };
      }).filter(hit => hit.distance !== null).sort((a, b) => a.distance - b.distance);
      enemy = piercing ? enemyHits[3 - enemyContacts.length - 1] : enemyHits[0];
      remaining = layout.obstacles.filter(item => !ignored.has(item.id));
      barrier = findObstacleContact(segment, remaining, layout.candyRadius);
      const nextDistance = Math.min(barrier?.distance ?? segment.length, enemy?.distance ?? segment.length);
      const changed = advanceChains(elapsed + sampleUnchecked(segment, nextDistance).time);
      if (!changed && (!barrier || !ignored.has(barrier.id))) break;
    }
    const obstacleFirst = barrier && (!enemy || barrier.distance <= enemy.distance + EPS);
    const endDistance = obstacleFirst ? barrier.distance : enemy ? enemy.distance : segment.length;
    const hitPoint = sampleUnchecked(segment, endDistance);
    for (const hit of enemyHits) {
      if (hit.distance > endDistance + EPS || (obstacleFirst && hit.distance >= endDistance - EPS)) break;
      if (!piercing && !enemy) break;
      const p = sampleUnchecked(segment, hit.distance);
      enemyContacts.push({ id: hit.id, point: { x: p.x, y: p.y }, time: elapsed + p.time, distance: traveled + hit.distance });
      pierced.add(hit.id);
      if (!piercing || enemyContacts.length === 3) break;
    }
    const isRolling = localRollStart !== null && endDistance > localRollStart + EPS;
    if (localRollStart !== null && endDistance > localRollStart) {
      if (rollStartDistance === null) rollStartDistance = traveled + localRollStart;
      const moved = endDistance - localRollStart;
      rollDistance += moved;
      rollBudget = Math.max(0, rollBudget - moved);
    }
    appendPrefix(segment, endDistance);

    if (obstacleFirst) {
      obstacleTouched = true;
      const obstacle = remaining.find(item => item.id === barrier.id);
      if (firstContactDistance === null) firstContactDistance = traveled;
      const impactVelocity = isRolling ? {
        x: Math.sign(hitPoint.vx ?? velocity.x) * Math.sqrt(Math.max(0, (hitPoint.vx ?? velocity.x) ** 2
          - 2 * BATTLEFIELD.groundRollDeceleration * (endDistance - localRollStart))), y: 0 }
        : { x: hitPoint.vx ?? velocity.x, y: velocity.y + BATTLEFIELD.gravity * hitPoint.time };
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
    if (abilityKind === 'bounce' && bounces.length < maxBounces
      && (enemy || (!obstacleTouched && segment.endKind === 'ground'))
      && Math.abs(hitPoint.vx ?? velocity.x) >= 30 && elapsed < BATTLEFIELD.maxSeconds - .5
      && position.x > -layout.candyRadius && position.x < layout.width + layout.candyRadius) {
      const impactVy = velocity.y + BATTLEFIELD.gravity * hitPoint.time;
      const reboundVy = -clamp(Math.abs(impactVy) * .42, 280, 660);
      if (elapsed + (-2 * reboundVy / BATTLEFIELD.gravity) <= BATTLEFIELD.maxSeconds) {
        bounces.push({ time: elapsed, point: { ...position }, trigger: enemy ? 'enemy' : 'ground' });
        if (!bounce) bounce = { firstLandingTime: elapsed, firstLanding: { ...position }, secondLandingTime: null };
        rolling = false;
        velocity = { x: (hitPoint.vx ?? velocity.x) * .78, y: reboundVy };
        continue;
      }
    }
    if (bounce && bounce.secondLandingTime === null && landingTime !== null && !enemy)
      bounce.secondLandingTime = landingTime;
    if (!enemy && segment.endKind === 'ground' && abilityKind === 'bounce'
      && bounces.length < maxBounces && !bounceExhausted
      && rollBudget > 0) {
      bounceExhausted = true;
      rolling = true;
      velocity = { x: velocity.x, y: 0 };
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
  const abilityContacts = abilityKind === 'splash' ? [
    ...contacts.filter(contact => contact.trigger === 'candy').map(contact => ({
      kind: 'splash', time: contact.time, point: contact.point,
      trigger: 'obstacle', sourceId: contact.obstacleId, radius: 180 })),
    ...(targetId ? [{ kind: 'splash', time: path.durationSeconds, point: path.end,
      trigger: 'enemy', sourceId: targetId, radius: 180 }] : [])
  ].sort((a, b) => a.time - b.time).map(contact => ({ ...contact, targetIds: living.filter(item => {
    const motion = contacts.find(hit => hit.riderMotion?.enemyId === item.id)?.riderMotion;
    const location = motion && contact.time >= motion.startTime
      ? sampleRiderMotion(motion, contact.time) : item.patrol
        ? { ...item.collider, x: patrolX(item.patrol, flightStartMs + contact.time * 1000) } : item.collider;
    return distance(location, contact.point) <= 180 + item.collider.radius;
  }).map(item => item.id) })) : [];
  const simulationSeconds = Math.max(path.durationSeconds, ...contacts.map(c => Math.max(
    c.obstacleMotion ? c.obstacleMotion.startTime + c.obstacleMotion.durationSeconds : 0,
    c.riderMotion ? c.riderMotion.startTime + c.riderMotion.durationSeconds : 0)));
  return { path, hitIds: piercing || abilityKind === 'bounce' ? enemyContacts.map(hit => hit.id) : targetId ? [targetId] : [], selectedTargetId: null,
    ...(piercing || abilityKind === 'bounce' ? { enemyContacts } : {}),
    impactKind: terminal, impactDistance: path.length,
    obstacleId: first?.obstacleId ?? null, obstacleKind: first?.obstacleKind ?? null,
    obstacleTargetIds: first?.obstacleTargetIds ?? [], contacts,
    rollStartDistance, rollDistance, blockerDistance: firstContactDistance,
    previewD: pathPrefixD(path, Math.min(previewFraction * path.length, firstContactDistance ?? Infinity)),
    reverse: direction.x < 0, directHitTime: path.durationSeconds, simulationSeconds,
    ...(abilityKind ? { abilityKind, ...(bounce ? { bounce, bounces } : {}),
      ...(abilityContacts.length ? { abilityContacts } : {}) } : {}),
    durationMs: clamp(simulationSeconds * 1000, 420, 4500) };
}

function withWizardSplit(solution, { layout, start, direction, powerRatio, living, flightStartMs = 0, windField = null,
  activationTime = null, autoHitTargetId = null }) {
  if (!solution?.path || solution.path.kind !== 'ballistic') return solution;
  const speed = getLaunchSpeed(powerRatio), vx = direction.x * speed, vy = direction.y * speed;
  const firstContactTime = Math.min(solution.path.durationSeconds,
    ...solution.contacts.filter(contact => contact.trigger === 'candy').map(contact => contact.time));
  const apex = vy < -60 ? -vy / BATTLEFIELD.gravity : null;
  const marker = activationTime === null ? apex !== null && apex < firstContactTime - EPS
    ? sampleAtTime(solution.path, apex)
    : sampleAtDistance(solution.path, sampleAtTime(solution.path, firstContactTime).distance / 3)
    : sampleAtTime(solution.path, Math.min(activationTime, solution.path.durationSeconds));
  const splitTime = activationTime === null ? marker.time : activationTime;
  if (!Number.isFinite(splitTime) || (activationTime === null ? splitTime <= EPS : splitTime < 0)
    || (activationTime === null && splitTime >= firstContactTime - EPS)
    || splitTime >= BATTLEFIELD.maxSeconds || marker.y > layout.groundY - layout.candyRadius + EPS
    || marker.x < 0 || marker.x > layout.width) return solution;
  const splitPoint = { x: marker.x, y: Math.min(marker.y, layout.groundY - layout.candyRadius - 1) };
  const children = [];
  for (const [id, sign] of [['left', -1], ['right', 1]]) {
    const angle = sign * .19, dx = (marker.vx ?? vx) * .7,
      dy = autoHitTargetId || marker.y >= layout.groundY - layout.candyRadius - 2
        ? -440 : (vy + BATTLEFIELD.gravity * Math.min(splitTime, solution.path.durationSeconds)) * .7;
    const child = ballisticFromVelocity(splitPoint, {
      x: dx * Math.cos(angle) - dy * Math.sin(angle),
      y: dx * Math.sin(angle) + dy * Math.cos(angle)
    }, layout, windField);
    if (!child) continue;
    const limit = BATTLEFIELD.maxSeconds - splitTime;
    const capped = child.durationSeconds > limit ? makePath('ballistic', [
      ...child.samples.filter(sample => sample.time < limit - EPS), sampleAtTime(child, limit)], 'timeout') : child;
    const relative = capped;
    const enemy = living.filter(item => {
      if (!autoHitTargetId) return true;
      if (item.id === autoHitTargetId) return false;
      const targetX = item.patrol
        ? patrolX(item.patrol, flightStartMs + splitTime * 1000) : item.collider.x;
      return direction.x >= 0 ? targetX > marker.x + EPS : targetX < marker.x - EPS;
    }).map(item => {
      const motion = solution.contacts.find(contact => contact.riderMotion?.enemyId === item.id)?.riderMotion;
      return { id: item.id, distance: motion
        ? findMovingRiderContact(relative, item, motion, splitTime, layout.candyRadius * .62)
        : findPatrolContact(relative, item, flightStartMs, splitTime, layout.candyRadius * .62) };
    }).filter(hit => hit.distance !== null).sort((a, b) => a.distance - b.distance)[0];
    const impactDistance = enemy?.distance ?? relative.length;
    const impact = sampleUnchecked(relative, impactDistance);
    const path = enemy ? makePath('ballistic', [
      ...relative.samples.filter(sample => sample.distance < impactDistance - EPS), impact], 'enemy') : relative;
    const wobbles = layout.obstacles.map(obstacle => ({ obstacleId: obstacle.id,
      distance: findObstacleContact(relative, [obstacle], layout.candyRadius * .62)?.distance }))
      .filter(item => item.distance !== null && item.distance !== undefined && item.distance < impactDistance - EPS)
      .map(item => { const hit = sampleUnchecked(relative, item.distance);
        return { obstacleId: item.obstacleId, time: splitTime + hit.time, point: { x: hit.x, y: hit.y } }; });
    children.push({ id, path, impactKind: enemy ? 'enemy' : capped.endKind,
      impactTime: splitTime + impact.time,
      hit: enemy ? { enemyId: enemy.id, time: splitTime + impact.time, point: { x: impact.x, y: impact.y } } : null,
      wobbles });
  }
  if (children.length !== 2) return solution;
  const simulationSeconds = Math.max(solution.simulationSeconds, ...children.map(child => child.impactTime));
  return { ...solution, abilityKind: 'split', splitOrbs: { splitTime, splitPoint, children },
    simulationSeconds, durationMs: clamp(simulationSeconds * 1000, 420, 4500) };
}

export function shotDisruptionOptions(run) {
  const active = run?.studioMonsterPrototype === 'regional-monsters-v1'
    && run.area === 'chaos' && run.round < 3 ? run.pendingAimDisruption : null;
  return { maxPowerRatio: active === 'pull' ? .85 : 1,
    previewFraction: active === 'preview' ? .15 : .30,
    maxRollDiameters: active === 'roll' ? 3 : BATTLEFIELD.maxRollDiameters };
}

function enemyCenterAt(slot, contacts, flightStartMs, time) {
  const motion = contacts.find(contact => contact.riderMotion?.enemyId === slot.id)?.riderMotion;
  if (motion && time >= motion.startTime) {
    const foot = sampleRiderMotion(motion, time);
    return { x: foot.x, y: foot.y - slot.size * .52 };
  }
  return slot.patrol ? { x: patrolX(slot.patrol, flightStartMs + time * 1000), y: slot.collider.y } : slot.collider;
}

function firstStoneContact(shot) {
  const direct = shot.hitIds.length
    ? { time: shot.directHitTime, point: sampleAtDistance(shot.path, shot.impactDistance), id: shot.hitIds[0] } : null;
  const obstacle = shot.contacts?.find(contact => contact.trigger === 'candy')
    ?? (shot.impactKind === 'obstacle' ? { time: shot.directHitTime,
      point: sampleAtDistance(shot.path, shot.impactDistance), obstacleId: shot.obstacleId } : null);
  const floor = shot.rollStartDistance !== null && shot.rollStartDistance <= shot.impactDistance
    ? sampleAtDistance(shot.path, shot.rollStartDistance)
    : shot.impactKind === 'ground' ? sampleAtDistance(shot.path, shot.impactDistance) : null;
  return [direct, obstacle && { ...obstacle, id: obstacle.obstacleId },
    floor && { time: floor.time, point: floor, id: null }].filter(Boolean).sort((a, b) => a.time - b.time)[0] ?? null;
}

function withTravelingAbility(shot, layout, living, stone, grade, direction, flightStartMs) {
  const wave = stone.kind === 'ground-wave';
  const contact = wave ? firstStoneContact(shot) : shot.hitIds.length
    ? { time: shot.directHitTime, point: sampleAtDistance(shot.path, shot.impactDistance), id: shot.hitIds[0] } : null;
  if (!contact || contact.point.x < 0 || contact.point.x > layout.width) return shot;
  const maxDistance = stone.maxDistance[grade] ?? stone.maxDistance.C;
  const incoming = unit({
    x: contact.point.x - sampleAtTime(shot.path, Math.max(0, contact.time - .02)).x,
    y: contact.point.y - sampleAtTime(shot.path, Math.max(0, contact.time - .02)).y
  }) ?? direction;
  const heading = wave ? { x: Math.sign(incoming.x), y: 0 } : incoming;
  if (wave && !heading.x) return shot;
  const point = { x: contact.point.x, y: wave ? layout.groundY - 28 : contact.point.y };
  const extent = heading.x > EPS ? Math.min(maxDistance, (layout.width - point.x) / heading.x)
    : heading.x < -EPS ? Math.min(maxDistance, -point.x / heading.x) : maxDistance;
  if (extent <= EPS) return shot;
  const speed = wave ? 1050 : 1600, radius = wave ? 18 : 0;
  const at = d => ({ x: point.x + d * heading.x, y: point.y + d * heading.y, time: d / speed });
  const sampleCount = Math.ceil(extent / 12);
  const trail = makePath('ballistic', Array.from({ length: sampleCount + 1 }, (_, i) => at(extent * i / sampleCount)), 'ability');
  const topples = shot.contacts ?? [];
  const block = layout.obstacles.map(prop => findObstacleContact(trail, [prop], radius)).filter(Boolean)
    .filter(hit => !topples.some(topple => topple.obstacleId === hit.id
      && topple.time <= contact.time + hit.distance / speed + EPS))
    .sort((a, b) => a.distance - b.distance)[0];
  const candidates = living.filter(slot => !shot.hitIds.includes(slot.id) && !(wave && slot.movement === 'fly'))
    .map(slot => {
      const motion = topples.find(entry => entry.riderMotion?.enemyId === slot.id)?.riderMotion;
      const hit = motion ? findMovingRiderContact(trail, slot, motion, contact.time, radius)
        : findPatrolContact(trail, slot, flightStartMs, contact.time, radius);
      if (hit === null || hit >= (block?.distance ?? Infinity) - EPS) return null;
      const time = contact.time + hit / speed;
      const atGround = motion ? time >= motion.startTime + motion.durationSeconds - EPS
        : !slot.supportObstacleId && (slot.y ?? layout.groundY) >= layout.groundY - EPS;
      if (wave && !atGround) return null;
      const { x, y } = at(hit);
      return { id: slot.id, distance: hit, time, point: { x, y } };
    }).filter(Boolean).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
  const hits = candidates.slice(0, wave ? 2 : 1);
  const endDistance = hits.length === (wave ? 2 : 1) ? hits.at(-1).distance : block?.distance ?? extent;
  const { x, y } = at(endDistance);
  const endTime = contact.time + endDistance / speed;
  return { ...shot, abilityContacts: [{ kind: stone.kind, time: contact.time, point,
    sourceId: contact.id, targetIds: hits.map(hit => hit.id), hits, maxDistance,
    blockedBy: block && Math.abs(endDistance - block.distance) < EPS ? block.id : null,
    end: { x, y }, endTime }],
  simulationSeconds: Math.max(shot.simulationSeconds, endTime),
  durationMs: Math.max(shot.durationMs, Math.round(endTime * 1000)) };
}

function withFreeze(shot, living, stone, grade, flightStartMs) {
  const source = living.find(slot => slot.id === shot.hitIds[0]);
  if (!source) return shot;
  const time = shot.directHitTime;
  const atContact = slot => enemyCenterAt(slot, shot.contacts ?? [], flightStartMs, time);
  const point = atContact(source);
  const radius = stone.radius[grade] ?? stone.radius.C;
  const nearby = living.filter(slot => slot !== source)
    .map(slot => ({ id: slot.id, distance: distance(atContact(slot), point) }))
    .filter(entry => entry.distance <= radius)
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
  const targetIds = [source.id, ...nearby.slice(0, stone.extraTargets[grade] ?? 0).map(entry => entry.id)];
  return { ...shot, abilityContacts: [{ kind: 'freeze', time, point, sourceId: source.id, targetIds, radius }] };
}

export function planShot({ layout, pull, enemies, windAvailable = false,
  toppledObstacleIds = [], piercing = false, loadedCandyId = null, loadedCandyGrade = 'C', prototype = null,
  maxPowerRatio = 1, previewFraction = .30,
  maxRollDiameters = BATTLEFIELD.maxRollDiameters, flightStartMs = 0, windField = null,
  deferAbility = false, vortexMoves = [] } = {}) {
  if (!validLayout(layout) || !validObstacles(layout.obstacles)
    || !Array.isArray(layout.enemies) || !layout.enemies.every(e => validCircle(e?.collider))
    || !point(layout.launcher) || !Array.isArray(enemies) || !pull?.ready
    || !unit(pull.direction) || !Number.isFinite(pull.powerRatio)
    || !Number.isFinite(maxPowerRatio) || maxPowerRatio <= 0 || maxPowerRatio > 1
    || !Number.isFinite(previewFraction) || previewFraction < 0 || previewFraction > 1
    || !Number.isFinite(maxRollDiameters) || maxRollDiameters < 0
    || !Array.isArray(toppledObstacleIds) || !Number.isFinite(flightStartMs)) return null;
  pull = { ...pull, powerRatio: Math.min(pull.powerRatio, maxPowerRatio) };
  const stone = piercing ? null : STONE_STATS[loadedCandyId];
  const horizontalScale = stone?.horizontalScale?.[loadedCandyGrade];
  const radiusScale = stone?.radiusScale?.[loadedCandyGrade];
  const dash = horizontalScale ? { kind: 'dash', startTime: stone.startTime, horizontalScale } : null;
  const physicsModifier = dash ?? (radiusScale ? { kind: 'wide-collider', radiusScale } : null);
  if (radiusScale) layout = { ...layout, candyRadius: layout.candyRadius * radiusScale };
  const physics = { physicsModifier, candyRadius: layout.candyRadius };
  const activeLayout = { ...layout, obstacles: layout.obstacles.filter(item =>
    !toppledObstacleIds.includes(item.id)) };
  const abilityKind = !piercing && !deferAbility
    ? ({ 'adventurer-candy': 'bounce', 'alchemist-candy': 'splash', 'wizard-orb': 'split' })[loadedCandyId] || null : null;
  const maxBounces = abilityKind === 'bounce' ? ({ C: 1, B: 2, A: 3 })[loadedCandyGrade] ?? 1 : 0;
  const direction = unit(pull.direction), draw = getDragDraw({ ...pull, direction }, true, layout.worldScale ?? 1);
  const start = { x: layout.launcher.x + draw.pouch.x, y: layout.launcher.y + draw.pouch.y };
  const ballistic = getBallisticPath({ start, direction, powerRatio: pull.powerRatio, layout: activeLayout, windField, dash });
  if (!ballistic) return null;
  const alive = new Set(enemies.filter(e => e && e.alive === true && Number.isFinite(e.hp) && e.hp > 0).map(e => e.id));
  const living = layout.enemies.filter(e => alive.has(e.id));
  const decorate = shot => {
    if (stone?.kind === 'freeze') return withFreeze(shot, living, stone, loadedCandyGrade, flightStartMs);
    if (stone?.kind === 'slash' || stone?.kind === 'ground-wave')
      return withTravelingAbility(shot, activeLayout, living, stone, loadedCandyGrade, direction, flightStartMs);
    return shot;
  };
  let path = ballistic, target = null;
  if (windAvailable && !piercing && direction.x > 1e-4) {
    const candidates = living.filter(e => e.collider.x > start.x);
    // Stable sort preserves original slot order for equal endpoint distances.
    candidates.sort((a, b) => Math.abs(a.collider.x - ballistic.end.x) - Math.abs(b.collider.x - ballistic.end.x));
    target = candidates[0] ?? null;
    if (target) {
      let destination = target.collider;
      for (let i = 0; i < (target.patrol ? 3 : 1); i++) {
        path = getHomingPath({ start, target: destination, obstacles: activeLayout.obstacles, layout });
        if (!path) return null;
        if (target.patrol) destination = { ...target.collider,
          x: patrolX(target.patrol, flightStartMs + path.durationSeconds * 1000) };
      }
      if (target.patrol) path = getHomingPath({ start, target: destination,
        obstacles: activeLayout.obstacles, layout });
      if (!path) return null;
    }
  }
  if (!target && (activeLayout.obstacles.some(item => item.kind) || abilityKind)) {
    const solution = planStackedShot({ layout: activeLayout, start, direction,
      powerRatio: pull.powerRatio, living, piercing, abilityKind, previewFraction, maxRollDiameters,
      flightStartMs, windField, maxBounces, dash, vortexMoves });
    if (!solution) return null;
    const adjusted = { ...solution, ...physics };
    return abilityKind === 'split' ? withWizardSplit(adjusted, { layout: activeLayout, start,
      direction, powerRatio: pull.powerRatio, living, flightStartMs, windField }) : decorate(adjusted);
  }
  const hitsFor = candidate => target ? [{ id: target.id, distance: candidate.length }]
    : living.map(e => {
      const vortex = vortexMoves.find(move => move.enemyId === e.id);
      return { id: e.id, distance: vortex
        ? forMovingEnemy(candidate, e, vortex, null, 0, layout.candyRadius)
        : findPatrolContact(candidate, e, flightStartMs, 0, layout.candyRadius) };
    })
      .filter(h => h.distance !== null)
      .sort((a, b) => a.distance - b.distance);
  let barrier = findObstacleContact(path, activeLayout.obstacles, layout.candyRadius);
  let hits = hitsFor(path).filter(h => !barrier || h.distance < barrier.distance - EPS);
  let first = hits[0];
  let obstacleFirst = Boolean(barrier && (!first || barrier.distance <= first.distance + EPS));
  let rollStartDistance = null, rollDistance = 0;

  // Only an unobstructed ballistic landing may continue into a ground roll.
  if (!target && path.kind === 'ballistic' && path.endKind === 'ground' && !barrier && (!first || piercing)) {
    const speed = getLaunchSpeed(pull.powerRatio);
    const rolling = appendGroundRoll(path, path.samples.at(-1).vx ?? direction.x * speed, layout,
      layout.candyRadius * 2 * maxRollDiameters);
    path = rolling.path;
    rollDistance = rolling.rollDistance;
    rollStartDistance = rollDistance > 0 ? rolling.rollStartDistance : null;
    barrier = findObstacleContact(path, activeLayout.obstacles, layout.candyRadius);
    hits = hitsFor(path).filter(h => !barrier || h.distance < barrier.distance - EPS);
    first = hits[0];
    obstacleFirst = Boolean(barrier && (!first || barrier.distance <= first.distance + EPS));
  }

  const finalEnemy = piercing ? hits[2] : first;
  if (piercing) obstacleFirst = Boolean(barrier && (!finalEnemy || barrier.distance <= finalEnemy.distance + EPS));
  const impactDistance = obstacleFirst ? barrier.distance : finalEnemy ? finalEnemy.distance : path.length;
  const obstacle = obstacleFirst ? activeLayout.obstacles.find(item => item.id === barrier.id) : null;
  const impactPoint = obstacleFirst ? sampleUnchecked(path, impactDistance) : null;
  const obstacleTargetIds = obstacleFirst ? [...living]
    .sort((a, b) => distance(impactPoint, a.collider) - distance(impactPoint, b.collider))
    .map(enemy => enemy.id) : [];
  // The visible flight ends at impactDistance. Only Spear travels through a hit.
  const resolvedHits = hits.filter(h => h.distance <= impactDistance + EPS).slice(0, piercing ? 3 : 1);
  return decorate({ ...physics, path, hitIds: [...new Set(resolvedHits.map(h => h.id))], selectedTargetId: target?.id ?? null,
    ...(piercing ? { enemyContacts: resolvedHits.map(hit => {
      const p = sampleUnchecked(path, hit.distance);
      return { id: hit.id, point: { x: p.x, y: p.y }, time: p.time, distance: hit.distance };
    }) } : {}),
    impactKind: obstacleFirst ? 'obstacle' : finalEnemy ? 'enemy' : path.endKind,
    impactDistance, obstacleId: obstacleFirst ? barrier.id : null,
    obstacleKind: obstacle?.kind ?? null, obstacleTargetIds, rollStartDistance, rollDistance,
    blockerDistance: barrier?.distance ?? null, contacts: [],
    previewD: pathPrefixD(path, Math.min(previewFraction * path.length, barrier?.distance ?? Infinity)),
    reverse: direction.x < 0,
    directHitTime: sampleUnchecked(path, impactDistance).time,
    simulationSeconds: sampleUnchecked(path, impactDistance).time,
    durationMs: clamp(sampleUnchecked(path, impactDistance).time * 1000, 420, 3200) });
}

function planVortexMoves({ layout, enemies, baseFlight, time, point, stone, grade }) {
  const radius = stone.radius[grade] ?? stone.radius.C;
  const maxDisplacement = stone.maxDisplacement[grade] ?? stone.maxDisplacement.C;
  const pullEndTime = time + stone.duration;
  const targetLimit = stone.targets[grade] ?? stone.targets.C;
  const flightStartMs = baseFlight.flightStartMs ?? 0;
  const impacts = baseFlight.contacts ?? [];
  const impactByEnemy = new Map(impacts.filter(hit => hit.riderMotion && hit.time <= time)
    .map(hit => [hit.riderMotion.enemyId, hit.riderMotion]));
  const fallenObstacles = new Set([...(baseFlight.planOptions?.toppledObstacleIds ?? []),
    ...impacts.filter(hit => hit.time <= time).map(hit => hit.obstacleId)]);
  const barriers = layout.obstacles.filter(item => !fallenObstacles.has(item.id));
  const livingIds = new Set(enemies.filter(enemy => enemy.alive && enemy.hp > 0).map(enemy => enemy.id));
  const slots = layout.enemies.filter(slot => livingIds.has(slot.id));
  const footAt = (slot, t) => {
    const falling = impactByEnemy.get(slot.id);
    if (falling) return sampleRiderMotion(falling, t);
    return { x: slot.patrol ? patrolX(slot.patrol, flightStartMs + t * 1000) : slot.x, y: slot.y };
  };
  const nearby = slots.filter(slot => !slot.isBoss).map(slot => {
    const from = footAt(slot, time);
    return { slot, from, distance: distance(point, { x: from.x, y: from.y - slot.size * .52 }) };
  }).filter(entry => entry.distance <= radius && !impactByEnemy.has(entry.slot.id))
    .sort((a, b) => a.distance - b.distance || a.slot.id.localeCompare(b.slot.id)).slice(0, targetLimit);
  const moves = [];
  for (const { slot, from } of nearby) {
    const half = slot.size / 2;
    const bound = half + (slot.patrol?.range ?? 0);
    const anchorX = slot.patrol?.centerX ?? from.x;
    const maxShift = clamp(clamp(point.x - from.x, -maxDisplacement, maxDisplacement),
      bound - anchorX, layout.width - bound - anchorX);
    const support = barriers.find(item => item.id === slot.supportObstacleId);
    const buildMove = shift => {
      let fall = null;
      if (support && (from.x + shift < support.x || from.x + shift > support.x + support.width)) {
        const edge = shift > 0 ? support.x + support.width : support.x;
        const takeoff = time + stone.duration * clamp((edge - from.x) / shift, 0, 1);
        const supportMotion = { samples: [{ x: edge, time: 0 }, { x: edge + shift / stone.duration, time: 1 }] };
        fall = simulateRiderFall({ supportMotion, riderSlot: { ...slot, x: edge, y: from.y }, layout, startTime: takeoff });
      }
      const endTime = Math.max(pullEndTime, fall ? fall.startTime + fall.durationSeconds : 0);
      const move = { enemyId: slot.id, from, shift, startTime: time, pullEndTime, endTime,
        supportLost: Boolean(fall), fall, patrol: slot.patrol ?? null, flightStartMs };
      move.to = sampleVortexPosition(move, endTime);
      move.position = slot.patrol
        ? { x: anchorX + shift, y: from.y, patrolCenterX: anchorX + shift }
        : { x: move.to.x, y: move.to.y };
      return move;
    };
    const safe = move => {
      if (Math.abs(move.shift) < EPS) return true;
      let previous = { x: from.x, y: from.y - slot.size * .52 };
      const checkUntil = move.endTime + (slot.patrol?.periodMs ?? 0) / 1000;
      const samples = Math.max(1, Math.ceil((checkUntil - time) / .035));
      for (let i = 1; i <= samples; i++) {
        const t = time + (checkUntil - time) * i / samples;
        const step = sampleVortexPosition(move, t);
        const center = { x: step.x, y: step.y - slot.size * .52 };
        if (step.x < half || step.x > layout.width - half
          || barriers.some(item => item !== support && discSegmentTouches(previous, center, item.polygon, slot.collider.radius))) return false;
        for (const other of slots) {
          if (other.id === slot.id) continue;
          const previousMove = moves.find(item => item.enemyId === other.id);
          const otherFoot = previousMove ? sampleVortexPosition(previousMove, t) : footAt(other, t);
          if (distance(center, { x: otherFoot.x, y: otherFoot.y - other.size * .52 })
            < slot.collider.radius + other.collider.radius - EPS) return false;
        }
        previous = center;
      }
      return true;
    };
    for (let attempt = 0; attempt <= 12; attempt++) {
      const move = buildMove(maxShift * (12 - attempt) / 12);
      if (safe(move)) {
        if (Math.abs(move.shift) >= EPS) moves.push(move);
        break;
      }
    }
  }
  return { kind: 'vortex', time, duration: stone.duration, point, radius, maxDisplacement, moves };
}

/** Rebuild the reserved physical result at the one player-selected activation point. */
export function activatePlannedAbility({ baseFlight, layout, enemies, kind, time, grade = 'C',
  success = false, source = 'click' } = {}) {
  if (!baseFlight?.path || !validLayout(layout) || !Array.isArray(enemies)
    || !['split', 'explosion', 'cherry-bomb', 'vortex'].includes(kind) || !Number.isFinite(time)
    || time < 0 || time > baseFlight.path.durationSeconds + .5 + EPS) return null;
  const boundedTime = Math.min(time, baseFlight.path.durationSeconds);
  const marker = sampleAtTime(baseFlight.path, boundedTime);
  const activation = { kind, time, point: { x: marker.x, y: marker.y }, source };
  if (kind === 'vortex') {
    const stone = STONE_STATS['espresso-vortex-stone'];
    const anchor = source === 'auto-ground' && Number.isFinite(baseFlight.abilityLandingTime)
      ? sampleAtTime(baseFlight.path, baseFlight.abilityLandingTime) : marker;
    const point = { x: anchor.x, y: anchor.y };
    const vortex = planVortexMoves({ layout, enemies, baseFlight, time, point, stone, grade });
    const revised = vortex.moves.length
      ? planShot({ ...baseFlight.planOptions, layout, enemies, vortexMoves: vortex.moves }) : baseFlight;
    if (!revised) return null;
    const completed = Math.max(revised.simulationSeconds, time + stone.duration, ...vortex.moves.map(move => move.endTime));
    return { ...baseFlight, ...revised, vortex, abilityActivation: { ...activation, point },
      simulationSeconds: completed, durationMs: Math.max(revised.durationMs, Math.round(completed * 1000)) };
  }
  if (kind === 'cherry-bomb') {
    const stone = STONE_STATS['cherry-bomb-stone'];
    const anchor = source === 'auto-ground' && Number.isFinite(baseFlight.abilityLandingTime)
      ? sampleAtTime(baseFlight.path, baseFlight.abilityLandingTime) : marker;
    const point = { x: anchor.x, y: anchor.y };
    const explodeAt = time + stone.delay;
    const radius = stone.radius[grade] ?? stone.radius.C;
    const alive = new Set(enemies.filter(enemy => enemy.alive && enemy.hp > 0).map(enemy => enemy.id));
    const targetIds = layout.enemies.filter(slot => alive.has(slot.id)).map(slot => ({
      id: slot.id, radius: slot.collider.radius,
      distance: distance(point, enemyCenterAt(slot, baseFlight.contacts ?? [], baseFlight.flightStartMs ?? 0, explodeAt))
    })).filter(target => target.distance <= radius + target.radius)
      .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
      .slice(0, stone.targets).map(target => target.id);
    const bomb = { kind, plantedAt: time, explodeAt, point, radius, targetIds };
    return { ...baseFlight, bomb, abilityActivation: { ...activation, point },
      abilityContacts: [{ kind, time: explodeAt, point, radius, targetIds }],
      simulationSeconds: Math.max(baseFlight.simulationSeconds, explodeAt),
      durationMs: Math.max(baseFlight.durationMs, Math.round(explodeAt * 1000)) };
  }
  if (kind === 'split') {
    const beginning = baseFlight.path.samples[0];
    const next = baseFlight.path.samples.find(sample => sample.time > .02) || baseFlight.path.samples.at(-1);
    const direction = unit({ x: next.x - beginning.x, y: next.y - beginning.y }) || { x: 1, y: -1 };
    const living = layout.enemies.filter(slot => enemies.some(enemy => enemy.id === slot.id && enemy.alive && enemy.hp > 0));
    const revised = withWizardSplit(baseFlight, { layout, start: baseFlight.path.start,
      direction, powerRatio: baseFlight.powerRatio ?? .7, living,
      flightStartMs: baseFlight.flightStartMs ?? 0, windField: baseFlight.windField,
      activationTime: time,
      autoHitTargetId: source === 'auto-contact' && baseFlight.impactKind === 'enemy'
        && Math.abs(time - baseFlight.directHitTime) < 1e-3 ? baseFlight.hitIds[0] ?? null : null });
    return { ...revised, abilityActivation: activation,
      simulationSeconds: Math.max(revised.simulationSeconds, time),
      durationMs: Math.max(revised.durationMs, Math.round(time * 1000)) };
  }
  const radius = ({ C: 300, B: 375, A: 450 })[grade] ?? 300;
  const directHit = baseFlight.hitIds.length && time >= baseFlight.directHitTime - EPS;
  const priorContacts = (baseFlight.contacts || []).filter(contact => contact.time <= time + EPS);
  const points = [...baseFlight.path.samples.filter(sample => sample.time < boundedTime - EPS), marker];
  const path = points.length > 1 ? makePath('ballistic', points, 'explosion')
    : makePath('ballistic', [baseFlight.path.samples[0],
      { ...marker, time: Math.max(.001, boundedTime) }], 'explosion');
  const targets = success ? layout.enemies.filter(slot => enemies.some(enemy => enemy.id === slot.id && enemy.alive && enemy.hp > 0))
    .filter(slot => {
      const position = slot.patrol ? { ...slot.collider,
        x: patrolX(slot.patrol, (baseFlight.flightStartMs ?? 0) + time * 1000) } : slot.collider;
      return distance(position, marker) <= radius + slot.collider.radius;
    }).map(slot => slot.id) : [];
  return { ...baseFlight, path, hitIds: directHit ? baseFlight.hitIds : [],
    contacts: priorContacts,
    ...(directHit && baseFlight.enemyContacts ? { enemyContacts: baseFlight.enemyContacts } : {}),
    impactKind: 'explosion', impactDistance: path.length, directHitTime: boundedTime,
    rollStartDistance: null, rollDistance: 0,
    obstacleId: priorContacts[0]?.obstacleId ?? null,
    obstacleKind: priorContacts[0]?.obstacleKind ?? null,
    obstacleTargetIds: priorContacts[0]?.obstacleTargetIds ?? [],
    simulationSeconds: time, durationMs: Math.max(100, Math.round(time * 1000)),
    abilityContacts: [{ kind: 'explosion', time, point: activation.point,
      trigger: source === 'auto-contact' ? baseFlight.hitIds.length ? 'enemy' : 'obstacle' : 'manual',
      sourceId: directHit ? baseFlight.hitIds[0] : null, radius, success, targetIds: targets }],
    abilityActivation: { ...activation, radius, success },
    previewD: pathPrefixD(path, Math.min(path.length * .3, path.length)) };
}
