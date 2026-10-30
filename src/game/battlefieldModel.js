/** Canonical world units. UI pixels and camera zoom never enter game geometry. */
export const BATTLEFIELD = Object.freeze({
  width: 3600, height: 1200, groundY: 900, minY: -1200, candyRadius: 10,
  gravity: 1200, minSpeed: 240, standardMaxSpeed: 1960, maxSpeed: 2600,
  powerBoostStart: .8, sampleStep: 1 / 120, maxSeconds: 8,
  maxRollDiameters: 5, groundRollDeceleration: 16000,
});

/** Keep ordinary pulls familiar; the last part of the draw adds extra launch energy. */
export function getLaunchSpeed(powerRatio) {
  if (!Number.isFinite(powerRatio)) return null;
  const power = Math.max(0, Math.min(1, powerRatio));
  const boost = Math.max(0, (power - BATTLEFIELD.powerBoostStart) / (1 - BATTLEFIELD.powerBoostStart));
  return BATTLEFIELD.minSpeed + (BATTLEFIELD.standardMaxSpeed - BATTLEFIELD.minSpeed) * power
    + (BATTLEFIELD.maxSpeed - BATTLEFIELD.standardMaxSpeed) * boost * boost;
}

const SHAPES = {
  log: [[0, .30], [.85, .18], [1, .30], [.96, .88], [.15, 1], [0, .9]],
  supportedLog: [[0, .08], [.08, 0], [.92, 0], [1, .08], [.96, .88], [.14, 1], [.02, .9]],
  ice: [[0, 1], [.18, .25], [.62, 0], [1, 1]],
  crate: [[0, .15], [.45, 0], [1, .18], [1, .85], [.52, 1], [0, .82]],
};
const THEMES = { forest: 'log', snow: 'ice', city: 'crate' };
const STACK_WIDTH = 80;
const FOREST_PROTOTYPE = 'forest-elevated-v1';
const REGIONAL_PROTOTYPE = 'regional-elevated-v1';
const SUPPORT_HEIGHTS = { low: 132, medium: 184, high: 236 };
const elevated = (area, prototype) => area === 'forest' ? prototype === FOREST_PROTOTYPE
  : prototype === REGIONAL_PROTOTYPE;
const riderCount = (area, round, count) => round === 3 ? 0
  : area === 'chaos' ? count < 9 ? 0 : count > 10 ? 3 : 2
    : round === 2 && count >= 2 ? 1 : 0;

function randomFromSeed(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(value ^ value >>> 15, 1 | value);
    mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, 61 | mixed);
    return ((mixed ^ mixed >>> 14) >>> 0) / 0x100000000;
  };
}

function subtract(intervals, low, high) {
  return intervals.flatMap(([a, b]) => high <= a || low >= b ? [[a, b]]
    : [[a, Math.min(b, low)], [Math.max(a, high), b]].filter(([x, y]) => y > x));
}

export function buildBattlefield({ area, round, enemies, seed = 0, encounterPhase = null,
  prototype = null, enemyLandingPositions = null, worldScale = 1 } = {}) {
  if (!['forest', 'snow', 'city', 'chaos'].includes(area) || !Number.isFinite(round)
    || !Array.isArray(enemies) || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff
    || ![1, 1.5].includes(worldScale)
    || (enemyLandingPositions !== null && (!elevated(area, prototype)
      || !enemyLandingPositions || Array.isArray(enemyLandingPositions)
      || typeof enemyLandingPositions !== 'object'))
    || (prototype !== null && (!elevated(area, prototype)
      || !Number.isInteger(round) || round < 1 || round > 3))) {
    throw new TypeError('Invalid battlefield configuration');
  }
  const ids = new Set();
  for (const enemy of enemies) {
    if (!enemy || typeof enemy.id !== 'string' || !enemy.id.trim() || ids.has(enemy.id)
      || typeof enemy.kind !== 'string' || typeof enemy.isBoss !== 'boolean') {
      throw new TypeError('Enemy slots need unique ids, kinds and boss flags');
    }
    ids.add(enemy.id);
  }
  if (prototype === FOREST_PROTOTYPE && round === 2
    && (enemies.length !== 2 || enemies.some(enemy => enemy.isBoss))) {
    throw new TypeError('Elevated forest round needs two regular enemies');
  }
  if (elevated(area, prototype) && round < 3 && riderCount(area, round, enemies.length)
    && enemies.some(enemy => enemy.isBoss)) {
    throw new TypeError('Elevated round needs a complete regular enemy roster');
  }
  const random = randomFromSeed(seed);
  const stackWidth = STACK_WIDTH * worldScale;
  const placements = enemies.map(({ id, kind, isBoss }, i) => {
    const nominal = enemies.length === 1 ? 2438
      : area === 'chaos' && elevated(area, prototype) && round < 3
        ? 760 + i * 2470 / (enemies.length - 1) : 1000 + i * 1860 / (enemies.length - 1);
    const jitter = enemies.length > 10 ? 24 : enemies.length > 6 ? 42 : 135;
    const x = Math.round(nominal + (random() * 2 - 1) * jitter);
    const size = (kind === 'chaos-fused-boss' ? 92 * 4.5 : isBoss ? 92 * 3 : enemies.length <= 6 ? 92 : 60) * worldScale;
    const y = kind === 'clockwork-crow' ? 900 - 240 - (i % 2) * 80 : 900;
    const patrol = kind === 'clockwork-crow' ? { centerX: x, range: 75 * worldScale,
      periodMs: 2100 + i % 3 * 300, phase: random() } : null;
    return { id, kind, isBoss, x, y, size, ...(patrol ? { patrol } : {}),
      collider: { id, x, y: y - size * .52, radius: size * .42 } };
  });
  let free = [[560, 3240]];
  for (const enemy of placements) free = subtract(free, enemy.x - enemy.size / 2 - (enemy.patrol?.range || 0) - 8,
    enemy.x + enemy.size / 2 + (enemy.patrol?.range || 0) + 8);
  let centers = free.map(([a, b]) => [a + stackWidth / 2 + 8, b - stackWidth / 2 - 8])
    .filter(([a, b]) => a <= b);
  const obstacles = [];
  const split = area === 'chaos' && round === 3 && encounterPhase === 'split';
  const count = placements.length ? split ? 3 : 2 + Math.floor(random() * 3) : 0;
  const regularSize = (enemies.length <= 6 ? 92 : 60) * worldScale;
  const nearEnemy = area === 'forest' && placements.length ? placements[Math.floor(random() * placements.length)] : null;
  for (let slot = 0; slot < count; slot++) {
    const landingBoss = split ? placements[slot] : null;
    const nominal = landingBoss ? landingBoss.x - landingBoss.size / 2 - stackWidth / 2 - 40
      : slot === 0 && nearEnemy
      ? nearEnemy.x - nearEnemy.size / 2 - stackWidth / 2 - (24 + random() * 86)
      : [740, 1510, 2290, 3050][slot] + (random() * 2 - 1) * 190;
    const choices = centers.map(([a, b]) => Math.max(a, Math.min(b, nominal)));
    choices.sort((a, b) => Math.abs(a - nominal) - Math.abs(b - nominal) || a - b);
    if (!choices.length) break;
    const center = Math.round(choices[0]);
    const kind = area === 'chaos' ? ['log', 'ice', 'crate'][slot % 3] : THEMES[area];
    const height = Math.round(regularSize * 1.7), x = center - stackWidth / 2, y = 900 - height;
    obstacles.push({ id: `${area}-${round}-${split ? 'split-' : ''}obstacle-${slot}`, kind, x, y,
      width: stackWidth, height,
      polygon: SHAPES[kind].map(([u, v]) => ({ x: x + u * stackWidth, y: y + v * height })) });
    centers = subtract(centers, center - stackWidth / 2 - 105, center + stackWidth / 2 + 105);
  }
  let launcherPlatform = null;
  let lift = 0;
  if (elevated(area, prototype)) {
    const required = riderCount(area, round, placements.length);
    const groundIndices = placements.flatMap((slot, index) => slot.kind === 'clockwork-crow' ? [] : [index]);
    const riderIndices = area === 'chaos' && required
      ? (required === 3 ? [1, Math.floor(placements.length / 2), placements.length - 2]
        : [1, placements.length - 2]) : required ? [groundIndices[Math.floor(random() * groundIndices.length)]] : [];
    const elevations = ['low', 'medium', 'high'];
    const offset = Math.floor(random() * 3);
    const supports = [];
    for (const [index, riderIndex] of riderIndices.entries()) {
      const rider = placements[riderIndex];
      const elevation = elevations[(offset + index) % 3];
      const width = 128 * worldScale, height = SUPPORT_HEIGHTS[elevation] * worldScale;
      const x = rider.x - width / 2, y = BATTLEFIELD.groundY - height;
      const kind = area === 'chaos' ? ['log', 'ice', 'crate'][index] : THEMES[area];
      const support = { id: `${area}-${round}-support-${index}`, kind, x, y, width, height,
        supportsEnemyId: rider.id, elevation,
        polygon: SHAPES.supportedLog.map(([u, v]) => ({ x: x + u * width, y: y + v * height })) };
      supports.push(support);
      rider.y = y;
      rider.groundY = BATTLEFIELD.groundY;
      rider.supportObstacleId = support.id;
      rider.elevation = elevation;
      rider.collider = { ...rider.collider, y: y - rider.size * .52 };
    }
    if (supports.length) {
      const retained = obstacles.filter(item => supports.every(support =>
        item.x + item.width + 28 < support.x || item.x > support.x + support.width + 28));
      obstacles.splice(0, obstacles.length, ...supports, ...retained.slice(0, Math.max(0, count - supports.length)));
    }
    if ((round >= 2 || area === 'chaos' && round === 1) && random() < .5) {
      lift = 80 * worldScale;
      launcherPlatform = { x: 28, y: BATTLEFIELD.groundY - lift, width: 330 * worldScale, height: lift };
    }
  }
  if (enemyLandingPositions) for (const [id, landing] of Object.entries(enemyLandingPositions)) {
    const slot = placements.find(item => item.id === id);
    if (!slot || !Number.isFinite(landing?.x) || landing?.y !== BATTLEFIELD.groundY
      || landing.x < slot.size / 2 || landing.x > BATTLEFIELD.width - slot.size / 2) {
      throw new TypeError('Invalid enemy landing position');
    }
    slot.x = landing.x;
    slot.y = landing.y;
    slot.collider = { ...slot.collider, x: landing.x, y: landing.y - slot.size * .52 };
  }
  const playerX = 44, launcherX = 220 + (worldScale - 1) * 160;
  return { ...BATTLEFIELD, candyRadius: BATTLEFIELD.candyRadius * worldScale, worldScale,
    encounterPhase, key: JSON.stringify([area, round, seed, encounterPhase,
    enemies.map(({ id, kind, isBoss }) => [id, kind, isBoss]), ...(prototype ? [prototype] : []),
    ...(worldScale !== 1 ? [worldScale] : []),
    ...(enemyLandingPositions && Object.keys(enemyLandingPositions).length
      ? [Object.entries(enemyLandingPositions).sort(([a], [b]) => a.localeCompare(b))] : [])]), area, round,
  ...(prototype ? { prototype, launcherPlatform } : {}),
  // Presentation-only cookie bounds and canonical incoming-attack anchor.
  player: { x: playerX, y: 900 - lift - 152 * worldScale, width: 152 * worldScale, height: 152 * worldScale,
    impact: { x: playerX + 76 * worldScale, y: 900 - lift - 76 * worldScale },
    contact: { x: playerX + 126 * worldScale, y: 900 - lift } },
  // restPouch is LOCAL to the sprite; impact/contact are WORLD coordinates.
  launcher: { x: launcherX, y: 900 - lift - 142 * worldScale,
    width: 124 * worldScale, height: 142 * worldScale,
    restPouch: { x: 64 * worldScale, y: 54 * worldScale },
    impact: { x: launcherX + 64 * worldScale, y: 900 - lift - 77 * worldScale },
    contact: { x: launcherX + 99 * worldScale, y: 900 - lift } },
  enemies: placements, obstacles };
}

export function getDragDraw({ direction, powerRatio }, active = true, worldScale = 1) {
  const length = Math.hypot(direction?.x, direction?.y);
  if (!Number.isFinite(length) || length === 0 || !Number.isFinite(powerRatio)
    || ![1, 1.5].includes(worldScale)) {
    throw new TypeError('Invalid pull vector');
  }
  const tension = active ? 12 + 60 * Math.max(0, Math.min(1, powerRatio)) : 0;
  return { pouch: { x: (64 - direction.x / length * tension) * worldScale,
    y: (54 - direction.y / length * tension) * worldScale },
  left: { x: 34 * worldScale, y: 22 * worldScale },
  right: { x: 91 * worldScale, y: 22 * worldScale }, tension: tension * worldScale };
}
