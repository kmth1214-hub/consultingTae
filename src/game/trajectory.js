export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerpPoint = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const quadratic = (a, b, c, t) => lerpPoint(lerpPoint(a, b, t), lerpPoint(b, c, t), t);
const pathD = (a, b, c) => `M ${a.x} ${a.y} Q ${b.x} ${b.y} ${c.x} ${c.y}`;

// Power changes range; selecting an enemy's X coordinate does not guarantee a hit.
// Arc-length samples drive preview, flight AND hit tests, avoiding three different paths.
export function getTrajectory({ start, targetX, angleDeg, powerPercent, worldWidth, worldHeight, homingTarget }) {
  if (![start?.x, start?.y, targetX, angleDeg, powerPercent, worldWidth, worldHeight].every(Number.isFinite)
    || worldWidth <= 0 || worldHeight <= 0) return null;
  const angle = clamp(angleDeg, 10, 80) * Math.PI / 180;
  const distance = clamp(targetX, start.x + 40, worldWidth - 16) - start.x;
  const range = distance * (.35 + clamp(powerPercent, 20, 100) * .0115);
  const homing = homingTarget && [homingTarget.x, homingTarget.y].every(Number.isFinite) ? homingTarget : null;
  const end = homing ? { x: homing.x, y: homing.y } : { x: start.x + range, y: worldHeight * .86 };
  const control = { x: start.x + range / 2, y: start.y - Math.min(worldHeight * .9, range * Math.tan(angle) / 2) };
  const samples = [{ ...start, t: 0, distance: 0 }];
  let length = 0;
  for (let i = 1; i <= 400; i++) {
    const point = quadratic(start, control, end, i / 400);
    const previous = samples.at(-1);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    samples.push({ ...point, t: i / 400, distance: length });
  }
  const path = { start, control, end, samples, length, d: pathD(start, control, end), homingTargetId: homing?.id ?? null };
  const previewEnd = pointAtDistance(path, length * .3);
  path.previewD = pathD(start, lerpPoint(start, control, previewEnd.t), previewEnd);
  return path;
}

export function pointAtDistance(path, distance) {
  const d = clamp(distance, 0, path.length);
  let low = 1, high = path.samples.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (path.samples[mid].distance < d) low = mid + 1;
    else high = mid;
  }
  const a = path.samples[low - 1], b = path.samples[low];
  const fraction = (d - a.distance) / (b.distance - a.distance || 1);
  const t = a.t + (b.t - a.t) * fraction;
  return { ...quadratic(path.start, path.control, path.end, t), t };
}

export function getSlingshotDraw(angleDeg, powerPercent, active = true) {
  const angle = clamp(angleDeg, 10, 80) * Math.PI / 180;
  const tension = clamp((powerPercent - 20) / 80, 0, 1);
  const pull = active ? 12 + 32 * tension : 0;
  const lean = active ? (42 - angleDeg) * .18 : 0;
  return { pouch: { x: 64 - Math.cos(angle) * pull, y: 54 + Math.sin(angle) * pull },
    left: { x: 34 + lean, y: 22 }, right: { x: 91 + lean, y: 22 }, tension };
}

// Input rects are screen coordinates; inverse camera/SVG matrix puts them in the same world as the arc.
export function getHitDetails(path, monsterRects, matrix) {
  if (!path?.samples?.length || !matrix) return [];
  const { a, b, c, d, e, f } = matrix;
  const det = a * d - b * c;
  if (![a, b, c, d, e, f, det].every(Number.isFinite) || Math.abs(det) < 1e-10) return [];
  const inverse = (x, y) => ({ x: (d * (x - e) - c * (y - f)) / det, y: (-b * (x - e) + a * (y - f)) / det });
  const targets = monsterRects.filter(rect => rect.alive !== false && rect.width > 0 && rect.height > 0).map(rect => {
    const center = inverse(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const corner = inverse(rect.left, rect.top);
    return { id: rect.id, ...center, radius: Math.max(Math.abs(center.x - corner.x), Math.abs(center.y - corner.y)) * .85 };
  });
  const hits = new Map();
  for (let i = 1; i < path.samples.length; i++) {
    const from = path.samples[i - 1], to = path.samples[i];
    const dx = to.x - from.x, dy = to.y - from.y;
    const segmentLength = to.distance - from.distance;
    for (const target of targets) {
      if (hits.has(target.id)) continue;
      const t = clamp(((target.x - from.x) * dx + (target.y - from.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      if (Math.hypot(from.x + t * dx - target.x, from.y + t * dy - target.y) <= target.radius)
        hits.set(target.id, from.distance + t * segmentLength);
    }
  }
  return [...hits].sort((a, b) => a[1] - b[1]).map(([id, distance]) => ({ id, distance }));
}

export const getHitIds = (path, rects, matrix) => getHitDetails(path, rects, matrix).map(hit => hit.id);
