// All actors share the 3:2 source-art coordinate space. No oversized/scaled world.
export const ARENA = Object.freeze({ width: 1200, height: 800, launch: { x: 232, y: 558 } });
export function monsterPositions(enemies) {
  const columns = Math.min(7, enemies.length);
  return enemies.map((enemy, index) => ({
    ...enemy, x: enemies.length === 1 ? 950 : 730 + (index % columns) * 370 / Math.max(1, columns - 1),
    y: 615 + Math.floor(index / columns) * 52, size: enemy.isBoss ? 130 : enemies.length > 6 ? 73 : 92
  }));
}
