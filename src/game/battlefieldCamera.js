const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const validPose = p => finitePoint(p) && Number.isFinite(p.scale) && p.scale > 0;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function getCameraPose({ mode, viewport, layout, focus, attackerId, reducedMotion } = {}) {
  if (!viewport || !Number.isFinite(viewport.width) || viewport.width <= 0
    || !Number.isFinite(viewport.height) || viewport.height <= 0 || !layout
    || ![layout.width, layout.groundY, layout.minY].every(Number.isFinite)
    || layout.width <= 0) return null;
  const { width, height } = viewport;
  if (mode === 'split') {
    // Fit the 276-unit landing bodies plus the 260-unit launch arc and nameplate.
    const scale = Math.min(width / layout.width, height * .65 / 680);
    return { scale, x: (width - layout.width * scale) / 2,
      y: height * .80 - layout.groundY * scale };
  }
  const bosses = layout.enemies?.filter(enemy => enemy.isBoss) || [];
  const overview = () => {
    const scale = Math.min(width / layout.width, bosses.length
      ? height * .66 / (Math.max(...bosses.map(enemy => enemy.size)) + 100) : Infinity);
    return { scale, x: (width - layout.width * scale) / 2,
      y: .78 * height - layout.groundY * scale };
  };
  if (reducedMotion || mode === 'overview') return overview();
  let scale, left = 0;
  if (mode === 'aim') scale = Math.min(width / 1120, height / 640);
  else if (mode === 'follow') {
    if (!finitePoint(focus)) return overview();
    scale = Math.min(width / 1600, height / 760);
    left = clamp(focus.x - .4 * width / scale, 0, Math.max(0, layout.width - width / scale));
    const top = clamp(focus.y - .46 * height / scale, layout.minY,
      layout.groundY - .78 * height / scale);
    return { scale, x: -left * scale, y: -top * scale };
  } else if (mode === 'enemy') {
    const attacker = layout.enemies?.find(enemy => enemy.id === attackerId);
    if (!attacker || !layout.launcher || !layout.player) return overview();
    const low = Math.min(layout.player.x, layout.launcher.x, attacker.x - attacker.size / 2) - 120;
    const high = Math.max(layout.player.x + layout.player.width, layout.launcher.x + layout.launcher.width,
      attacker.x + attacker.size / 2) + 120;
    scale = Math.min(width / (high - low), height / 640,
      attacker.isBoss ? height * .66 / (attacker.size + 100) : Infinity);
    left = clamp(low, 0, Math.max(0, layout.width - width / scale));
  } else return overview();
  return { scale, x: -left * scale, y: .78 * height - layout.groundY * scale };
}

export function worldToScreen(point, pose) {
  if (!finitePoint(point) || !validPose(pose)) throw new TypeError('Invalid camera transform');
  return { x: point.x * pose.scale + pose.x, y: point.y * pose.scale + pose.y };
}

export function screenToWorld(point, pose) {
  if (!finitePoint(point) || !validPose(pose)) return null;
  return { x: (point.x - pose.x) / pose.scale, y: (point.y - pose.y) / pose.scale };
}
