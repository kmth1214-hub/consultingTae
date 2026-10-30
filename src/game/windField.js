const AREAS = ['forest', 'snow', 'city', 'chaos'];
const finitePoint = point => point && Number.isFinite(point.x) && Number.isFinite(point.y);
const inside = (point, zone) => point.x >= zone.x && point.x <= zone.x + zone.width
  && point.y >= zone.y && point.y <= zone.y + zone.height;

function mix(value) {
  value = Math.imul(value ^ value >>> 16, 0x7feb352d);
  value = Math.imul(value ^ value >>> 15, 0x846ca68b);
  return (value ^ value >>> 16) >>> 0;
}

export function buildWindField({ area, round, layoutSeed = 0, shotOrdinal = 0, layout } = {}) {
  if (!AREAS.includes(area) || !Number.isInteger(round) || round < 1
    || !Number.isInteger(layoutSeed) || layoutSeed < 0 || layoutSeed > 0xffffffff
    || !Number.isInteger(shotOrdinal) || shotOrdinal < 0
    || !Number.isFinite(layout?.width) || !Number.isFinite(layout?.height))
    throw new TypeError('Invalid wind field configuration');
  const seed = mix((layoutSeed ^ Math.imul(round, 0x9e3779b9) ^ Math.imul(AREAS.indexOf(area) + 1, 0x85ebca6b)) >>> 0);
  const directionSeed = area === 'chaos' ? mix(seed ^ Math.imul(shotOrdinal + 1, 0x27d4eb2d)) : seed;
  const direction = directionSeed & 1 ? 1 : -1;
  const width = layout.width;
  return { direction, acceleration: 60, zones: [
    { id: 'wind-low', x: Math.round(width * (.245 + (seed % 9) / 1000)), y: 500,
      width: Math.round(width * .16), height: 420 },
    { id: 'wind-high', x: Math.round(width * (.565 + ((seed >>> 8) % 9) / 1000)), y: 180,
      width: Math.round(width * .17), height: 570 }
  ] };
}

export function sampleWindAcceleration(field, point) {
  if (!field || !finitePoint(point)) return 0;
  return field.zones.some(zone => inside(point, zone)) ? field.direction * field.acceleration : 0;
}

function segmentTouchesZone(a, b, zone) {
  if (inside(a, zone) || inside(b, zone)) return true;
  let enter = 0, leave = 1;
  for (const [axis, min, max] of [['x', zone.x, zone.x + zone.width],
    ['y', zone.y, zone.y + zone.height]]) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-9) { if (a[axis] < min || a[axis] > max) return false; continue; }
    const first = (min - a[axis]) / delta, second = (max - a[axis]) / delta;
    enter = Math.max(enter, Math.min(first, second));
    leave = Math.min(leave, Math.max(first, second));
    if (enter > leave) return false;
  }
  return enter <= leave;
}

export function crossedWindZone(path, field, maxDistance = Infinity) {
  if (!field || !Array.isArray(path?.samples)) return false;
  const samples = path.samples.filter(sample => sample.distance <= maxDistance);
  if (Number.isFinite(maxDistance) && maxDistance < path.length) {
    const next = path.samples.find(sample => sample.distance > maxDistance);
    const prev = samples.at(-1);
    if (prev && next) {
      const t = (maxDistance - prev.distance) / (next.distance - prev.distance);
      samples.push({ x: prev.x + (next.x - prev.x) * t, y: prev.y + (next.y - prev.y) * t });
    }
  }
  return samples.some((sample, index) => field.zones.some(zone =>
    index ? segmentTouchesZone(samples[index - 1], sample, zone) : inside(sample, zone)));
}
