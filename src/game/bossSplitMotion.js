const clamp = value => Math.max(0, Math.min(1, value));
export const BOSS_SPLIT_FLIGHT_MS = 1340;

/** Pure playback geometry: no combat state and no random numbers. */
export function sampleBossSplit({ source, target, index = 0, progress }) {
  if (![source?.x, source?.y, target?.x, target?.y, index, progress].every(Number.isFinite)
    || !Number.isInteger(index) || index < 0 || index > 2) throw new TypeError('Invalid boss split path');
  const t = clamp((clamp(progress) * BOSS_SPLIT_FLIGHT_MS - index * 120) / 1100);
  return { x: source.x + (target.x - source.x) * t,
    y: source.y + (target.y - source.y) * t - 4 * 260 * t * (1 - t) };
}
