const LAYERS = Object.freeze({
  sky: { factor: .08, capX: 540, capY: 150 },
  distant: { factor: .4, capX: 540, capY: 150 },
  midground: { factor: .9, capX: 160, capY: 40 },
  route: { factor: 1, capX: 0, capY: 0 },
  foreground: { factor: 1.03, capX: 45, capY: 10 }
});
const zero = () => Object.fromEntries(Object.keys(LAYERS).map(layer => [layer, { x: 0, y: 0 }]));
const clamp = (value, cap) => {
  const result = Math.max(-cap, Math.min(cap, value));
  return Object.is(result, -0) ? 0 : result;
};

export function getSceneOffsets({ pose, viewport, reducedMotion = false } = {}) {
  if (reducedMotion || !pose || !viewport
    || ![pose.x, pose.y, pose.scale, viewport.width, viewport.height].every(Number.isFinite)
    || pose.scale <= 0 || viewport.width <= 0 || viewport.height <= 0) return zero();
  const dx = pose.x / pose.scale;
  const referenceY = .78 * viewport.height - 900 * pose.scale;
  const dy = (pose.y - referenceY) / pose.scale;
  return Object.fromEntries(Object.entries(LAYERS).map(([name, { factor, capX, capY }]) => [name,
    { x: clamp((factor - 1) * dx, capX), y: clamp((factor - 1) * dy, capY) }]));
}

export function applyScenePose(world, pose, viewport, reducedMotion = false) {
  if (!world) return;
  world.style.transform = `translate(${pose.x}px, ${pose.y}px) scale(${pose.scale})`;
  world.style.setProperty('--camera-scale', pose.scale);
  const offsets = getSceneOffsets({ pose, viewport, reducedMotion });
  for (const [layer, point] of Object.entries(offsets)) {
    world.style.setProperty(`--scene-${layer}-x`, `${point.x}px`);
    world.style.setProperty(`--scene-${layer}-y`, `${point.y}px`);
  }
  const arena = world.parentElement;
  if (arena) {
    const width = Number.parseFloat(world.style.width), height = Number.parseFloat(world.style.height);
    const left = Math.max(0, Math.min(width, -pose.x / pose.scale));
    const top = Math.max(0, Math.min(height, -pose.y / pose.scale));
    arena.style.setProperty('--minimap-camera-left', `${left / width * 100}%`);
    arena.style.setProperty('--minimap-camera-top', `${top / height * 100}%`);
    arena.style.setProperty('--minimap-camera-width', `${Math.min(width, viewport.width / pose.scale) / width * 100}%`);
    arena.style.setProperty('--minimap-camera-height', `${Math.min(height, viewport.height / pose.scale) / height * 100}%`);
  }
}
