const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const clamp = p => Math.max(0, Math.min(1, p));

export function createEnemyProjectileArc({ source, target, height } = {}) {
  if (!finitePoint(source) || !finitePoint(target)) throw new TypeError('Invalid enemy projectile endpoints');
  const lift = height ?? Math.max(200, Math.min(440, Math.abs(target.x - source.x) * .12 + 150));
  if (!Number.isFinite(lift) || lift < 0) throw new TypeError('Invalid enemy projectile height');
  const control = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 - 2 * lift };
  return { source: { ...source }, target: { ...target }, control, height: lift,
    d: `M${source.x} ${source.y} Q${control.x} ${control.y} ${target.x} ${target.y}` };
}

export function sampleEnemyProjectile(arc, progress) {
  if (!finitePoint(arc?.source) || !finitePoint(arc?.target) || !Number.isFinite(arc.height)
    || arc.height < 0 || !Number.isFinite(progress)) throw new TypeError('Invalid enemy projectile sample');
  const p = clamp(progress), dx = arc.target.x - arc.source.x, dy = arc.target.y - arc.source.y;
  return { x: arc.source.x + dx * p,
    y: arc.source.y + dy * p - 4 * arc.height * p * (1 - p),
    angle: Math.atan2(dy - 4 * arc.height * (1 - 2 * p), dx) * 180 / Math.PI };
}

/** Exact quadratic sub-curve: the wake shows only the last travelled portion. */
export function enemyTrailD(arc, progress, span = .16) {
  if (!Number.isFinite(span) || span <= 0 || span > 1) throw new TypeError('Invalid enemy wake span');
  const end = sampleEnemyProjectile(arc, progress), p = clamp(progress), a = Math.max(0, p - span);
  if (!p) return '';
  const start = sampleEnemyProjectile(arc, a), fraction = (p - a) / 2;
  const control = { x: start.x + (arc.target.x - arc.source.x) * fraction,
    y: start.y + (arc.target.y - arc.source.y - 4 * arc.height * (1 - 2 * a)) * fraction };
  return `M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`;
}
