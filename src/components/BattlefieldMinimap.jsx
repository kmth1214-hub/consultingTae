import React from 'react';

export default function BattlefieldMinimap({ layout, enemies }) {
  const living = layout.enemies.filter(slot => enemies.some(enemy => enemy.id === slot.id && enemy.alive));
  return <div className="battlefield-minimap" role="img" aria-label={`전장 미니맵: 플레이어 1명, 남은 적 ${living.length}마리, 장애물 ${layout.obstacles.length}개`}>
    <svg viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" focusable="false">
      <rect className="minimap-ground" x="0" y="0" width={layout.width} height={layout.height} rx="55" />
      <path className="minimap-road" d={`M0 ${layout.groundY}H${layout.width}`} />
      {layout.obstacles.map(item => <polygon key={item.id} className={`minimap-obstacle minimap-obstacle--${item.kind}`}
        points={item.polygon.map(point => `${point.x},${point.y}`).join(' ')} />)}
    </svg>
    <span className="minimap-camera-window" aria-hidden="true" />
    <span className="minimap-enemy-count" aria-hidden="true">적 {living.length}</span>
    {living.map(enemy => <span key={enemy.id} className={`minimap-enemy${enemy.isBoss ? ' is-boss' : ''}`}
      data-minimap-enemy={enemy.id} aria-hidden="true"
      style={{ left: `${enemy.x / layout.width * 100}%`, top: `${(enemy.y - enemy.size * .42) / layout.height * 100}%` }}>
      <svg viewBox="0 0 24 24" focusable="false">
        <path className="minimap-enemy-head" d="M3.5 8 2 2l6 3a11 11 0 0 1 8 0l6-3-1.5 6a9 9 0 1 1-17 0Z" />
        <circle className="minimap-enemy-eye" cx="8.5" cy="12" r="1.6" />
        <circle className="minimap-enemy-eye" cx="15.5" cy="12" r="1.6" />
      </svg>
    </span>)}
    <span className="minimap-player" aria-hidden="true"
      style={{ left: `${layout.launcher.impact.x / layout.width * 100}%`, top: `${(layout.launcher.contact.y - 34) / layout.height * 100}%` }} />
    <span className="sr-only">조준 궤적과 착탄 위치는 표시하지 않습니다.</span>
  </div>;
}
