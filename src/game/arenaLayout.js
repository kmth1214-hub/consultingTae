// All actors share the 3:2 source-art coordinate space. No oversized/scaled world.
export const ARENA = Object.freeze({ width: 1200, height: 800, launch: { x: 235, y: 550 } });
export function monsterPositions(enemies) {
  const columns = Math.min(7, enemies.length);
  return enemies.map((enemy, index) => ({
    ...enemy, x: enemies.length === 1 ? 950 : 730 + (index % columns) * 370 / Math.max(1, columns - 1),
    y: 615 + Math.floor(index / columns) * 52, size: enemy.isBoss ? 130 : enemies.length > 6 ? 73 : 92
  }));
}

// Baseline ballistic shot for T03's accessible angle/power controls.
// The full captured-pointer/Space camera and flight sequence is supplied by T04.
export function sampleShot(angle, power) {
  const radians = angle * Math.PI / 180;
  const speed = 420 + power * 5.8;
  const points = [];
  for (let t = 0; t <= 4; t += .012) {
    const point = { x: ARENA.launch.x + Math.cos(radians) * speed * t,
      y: ARENA.launch.y - Math.sin(radians) * speed * t + 340 * t * t };
    points.push(point);
    if (point.x > ARENA.width + 40 || point.y > ARENA.height + 40) break;
  }
  return points;
}
export function shotHitIds(points, enemies) {
  const hits = new Set();
  for (const point of points) for (const enemy of monsterPositions(enemies)) {
    if (enemy.alive && Math.hypot(point.x - enemy.x, point.y - (enemy.y - enemy.size / 2)) <= enemy.size * .45) hits.add(enemy.id);
  }
  return [...hits];
}
