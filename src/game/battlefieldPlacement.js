import { buildBattlefield, getDragDraw, getLaunchSpeed } from './battlefieldModel.js';
import { planShot } from './shotGeometry.js';

const ANGLES = [45, 55, 35, 65, 25, 70, 15, 75];
const asPull = (angle, powerRatio) => {
  const radians = angle * Math.PI / 180;
  return { direction: { x: Math.cos(radians), y: -Math.sin(radians) },
    angleDeg: angle, powerRatio, ready: true };
};

function witnessAt(layout, enemies, x, y, matches) {
  for (const angle of ANGLES) {
    const pullAt = power => asPull(angle, power);
    const error = power => {
      const pull = pullAt(power);
      const pouch = getDragDraw(pull).pouch;
      const x0 = layout.launcher.x + pouch.x;
      const y0 = layout.launcher.y + pouch.y;
      const speed = getLaunchSpeed(power);
      const time = (x - x0) / (pull.direction.x * speed);
      return y0 + pull.direction.y * speed * time + layout.gravity / 2 * time * time - y;
    };
    if (error(0) * error(1) > 0) continue;
    let low = 0, high = 1;
    for (let i = 0; i < 25; i++) {
      const mid = (low + high) / 2;
      if (error(mid) > 0) low = mid;
      else high = mid;
    }
    const shot = planShot({ layout, pull: pullAt((low + high) / 2), enemies });
    if (matches(shot)) return { shot, pull: pullAt((low + high) / 2) };
  }
  return false;
}

export function findForestLogOpportunity(layout) {
  const enemies = layout.enemies.map(slot => ({ id: slot.id, alive: true, hp: 1 }));
  for (const stack of layout.obstacles) for (const height of [.25, .5, .75, .1, .9]) {
    const witness = witnessAt(layout, enemies, stack.x + stack.width / 2,
      stack.y + stack.height * height, shot => shot?.contacts?.some(contact => contact.logMotion?.hit));
    if (witness) return witness;
  }
  return null;
}

/** Use actual first-contact shots to reject random layouts that cannot be played. */
export function isPlayableBattlefield(layout, enemies) {
  if (!layout || !Array.isArray(enemies) || !Array.isArray(layout.obstacles)) return false;
  if (layout.prototype === 'forest-elevated-v1') {
    const riders = layout.enemies.filter(slot => slot.supportObstacleId);
    const supports = layout.obstacles.filter(prop => prop.supportsEnemyId);
    if (layout.round === 2 ? riders.length !== 1 || supports.length !== 1
      || supports[0].id !== riders[0].supportObstacleId || supports[0].supportsEnemyId !== riders[0].id
      || riders[0].y !== supports[0].y || riders[0].collider.y !== riders[0].y - riders[0].size * .52
      : riders.length !== 0 || supports.length !== 0) return false;
    for (const prop of layout.obstacles) {
      if (prop.x < 0 || prop.x + prop.width > layout.width || prop.y + prop.height !== layout.groundY) return false;
      for (const slot of layout.enemies) {
        if (prop.supportsEnemyId === slot.id) continue;
        if (prop.x + prop.width > slot.x - slot.size / 2 - 8
          && prop.x < slot.x + slot.size / 2 + 8) return false;
      }
      for (const other of layout.obstacles) {
        if (other.id === prop.id) continue;
        if (prop.x < other.x + other.width + 16 && other.x < prop.x + prop.width + 16) return false;
      }
    }
  }
  const fullRound = layout.enemies.map(slot => ({ id: slot.id, alive: true, hp: 1 }));
  for (const slot of layout.enemies) {
    const c = slot.collider;
    if (![c.y, c.y - c.radius * .5, c.y + c.radius * .5].some(y =>
      witnessAt(layout, fullRound, c.x, y, shot => shot?.impactKind === 'enemy'
        && shot.hitIds[0] === slot.id))) return false;
  }
  for (const stack of layout.obstacles) {
    const x = stack.x + stack.width / 2;
    if (![.25, .5, .75].some(ratio => witnessAt(layout, fullRound,
      x, stack.y + stack.height * ratio, shot => shot?.contacts?.some(contact =>
        contact.obstacleId === stack.id)))) return false;
  }
  if (layout.prototype === 'forest-elevated-v1') return true;
  return layout.area !== 'forest' || !layout.enemies.length || Boolean(findForestLogOpportunity(layout));
}

/** All attempts derive from one round seed, so rerenders cannot shuffle the battlefield. */
export function buildPlayableBattlefield({ area, round, enemies, seed = 0, encounterPhase = null, prototype = null } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new TypeError('Invalid battlefield seed');
  }
  for (let attempt = 0; attempt < 32; attempt++) {
    const candidateSeed = (seed + Math.imul(attempt, 0x9e3779b9)) >>> 0;
    const layout = buildBattlefield({ area, round, enemies, seed: candidateSeed, encounterPhase, prototype });
    if (isPlayableBattlefield(layout, enemies)) return layout;
  }
  // A deliberately placed two-stack layout is still verified before use.
  const fallback = buildBattlefield({ area, round, enemies, seed: 0, encounterPhase, prototype });
  if (isPlayableBattlefield(fallback, enemies)) return fallback;
  throw new Error('Could not place a playable battlefield');
}
