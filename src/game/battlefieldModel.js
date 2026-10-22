/** Canonical world units. UI pixels and camera zoom never enter game geometry. */
export const BATTLEFIELD = Object.freeze({
  width: 3600, height: 1200, groundY: 900, minY: -1200, candyRadius: 10,
  gravity: 1200, minSpeed: 240, maxSpeed: 1960, sampleStep: 1 / 120, maxSeconds: 8,
  maxRollDiameters: 5, groundRollDeceleration: 16000,
});

const SHAPES = {
  log: [[0, .30], [.85, .18], [1, .30], [.96, .88], [.15, 1], [0, .9]],
  ice: [[0, 1], [.18, .25], [.62, 0], [1, 1]],
  crate: [[0, .15], [.45, 0], [1, .18], [1, .85], [.52, 1], [0, .82]],
};
const HEIGHTS = { log: 72, ice: 84, crate: 80 };
const THEMES = { forest: 'log', snow: 'ice', city: 'crate' };

function subtract(intervals, low, high) {
  return intervals.flatMap(([a, b]) => high <= a || low >= b ? [[a, b]]
    : [[a, Math.min(b, low)], [Math.max(a, high), b]].filter(([x, y]) => y > x));
}

export function buildBattlefield({ area, round, enemies } = {}) {
  if (!['forest', 'snow', 'city', 'chaos'].includes(area) || !Number.isFinite(round)
    || !Array.isArray(enemies)) throw new TypeError('Invalid battlefield configuration');
  const ids = new Set();
  for (const enemy of enemies) {
    if (!enemy || typeof enemy.id !== 'string' || !enemy.id.trim() || ids.has(enemy.id)
      || typeof enemy.kind !== 'string' || typeof enemy.isBoss !== 'boolean') {
      throw new TypeError('Enemy slots need unique ids, kinds and boss flags');
    }
    ids.add(enemy.id);
  }
  const placements = enemies.map(({ id, kind, isBoss }, i) => {
    const x = enemies.length === 1 ? 2438 : 1000 + i * 1860 / (enemies.length - 1);
    const size = isBoss ? 130 : enemies.length <= 6 ? 92 : 60;
    return { id, kind, isBoss, x, y: 900, size,
      collider: { id, x, y: 900 - size * .52, radius: size * .42 } };
  });
  let free = [[480, 3260]];
  for (const enemy of placements) free = subtract(free, enemy.x - enemy.size / 2 - 8,
    enemy.x + enemy.size / 2 + 8);
  let centers = free.map(([a, b]) => [a + 36, b - 36]).filter(([a, b]) => a <= b);
  const obstacles = [];
  if (placements.length) for (const [slot, nominal] of [740, 1520, 2300].entries()) {
    const choices = centers.map(([a, b]) => Math.max(a, Math.min(b, nominal)));
    choices.sort((a, b) => Math.abs(a - nominal) - Math.abs(b - nominal) || a - b);
    if (!choices.length) break;
    const center = choices[0];
    const kind = area === 'chaos' ? ['log', 'ice', 'crate'][slot] : THEMES[area];
    const height = HEIGHTS[kind], x = center - 36, y = 900 - height;
    obstacles.push({ id: `${area}-${round}-obstacle-${slot}`, kind, x, y, width: 72, height,
      polygon: SHAPES[kind].map(([u, v]) => ({ x: x + u * 72, y: y + v * height })) });
    centers = subtract(centers, center - 180, center + 180);
  }
  return { ...BATTLEFIELD, key: JSON.stringify([area, round,
    enemies.map(({ id, kind, isBoss }) => [id, kind, isBoss])]), area, round,
  // Presentation-only cookie bounds and canonical incoming-attack anchor.
  player: { x: 44, y: 748, width: 152, height: 152,
    impact: { x: 120, y: 824 }, contact: { x: 170, y: 900 } },
  // restPouch is LOCAL to the sprite; impact/contact are WORLD coordinates.
  launcher: { x: 220, y: 758, width: 124, height: 142, restPouch: { x: 64, y: 54 },
    impact: { x: 284, y: 823 }, contact: { x: 319, y: 900 } },
  enemies: placements, obstacles };
}

export function getDragDraw({ direction, powerRatio }, active = true) {
  const length = Math.hypot(direction?.x, direction?.y);
  if (!Number.isFinite(length) || length === 0 || !Number.isFinite(powerRatio)) {
    throw new TypeError('Invalid pull vector');
  }
  const tension = active ? 12 + 60 * Math.max(0, Math.min(1, powerRatio)) : 0;
  return { pouch: { x: 64 - direction.x / length * tension,
    y: 54 - direction.y / length * tension }, left: { x: 34, y: 22 },
  right: { x: 91, y: 22 }, tension };
}
