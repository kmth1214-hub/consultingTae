import React from 'react';

export default function BattlefieldMinimap({ layout, enemies }) {
  const living = layout.enemies.filter(slot => enemies.some(enemy => enemy.id === slot.id && enemy.alive));
  return <div className="battlefield-minimap" role="img" aria-label={`전장 미니맵: 플레이어 1명, 남은 적 ${living.length}마리, 장애물 ${layout.obstacles.length}개`}>
    <svg viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" focusable="false">
      <rect className="minimap-ground" x="0" y="0" width={layout.width} height={layout.height} rx="55" />
      <path className="minimap-road" d={`M0 ${layout.groundY}H${layout.width}`} />
      {layout.obstacles.map(item => <polygon key={item.id} className={`minimap-obstacle minimap-obstacle--${item.kind}`}
        points={item.polygon.map(point => `${point.x},${point.y}`).join(' ')} />)}
      {living.map(enemy => <circle key={enemy.id} className={`minimap-enemy${enemy.isBoss ? ' is-boss' : ''}`}
        data-minimap-enemy={enemy.id} cx={enemy.x} cy={enemy.y - enemy.size * .42} r={enemy.isBoss ? 34 : 23} />)}
      <path className="minimap-player" d={`M${layout.launcher.impact.x} ${layout.launcher.contact.y - 34}l-34 58h68Z`} />
    </svg>
    <span className="minimap-camera-window" aria-hidden="true" />
    <span className="sr-only">조준 궤적과 착탄 위치는 표시하지 않습니다.</span>
  </div>;
}
