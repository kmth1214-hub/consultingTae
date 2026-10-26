/** A committed combat outcome chooses the destination once; playback never rolls. */
export function getEnemyAttackTarget(attack, layout) {
  if (!attack.missed) return layout.player.impact;
  return attack.missStyle === 'slip'
    ? { x: layout.player.x + layout.player.width + 180, y: layout.groundY - 14 }
    : { x: 20, y: layout.groundY - 340 };
}
