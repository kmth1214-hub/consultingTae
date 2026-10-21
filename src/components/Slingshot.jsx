import React from 'react';
import { getSlingshotDraw } from '../game/trajectory.js';

export default function Slingshot({ aim, run, lastEvent, launcherRef }) {
  const active = !['idle', 'launching'].includes(aim.phase);
  const { pouch, left, right, tension } = getSlingshotDraw(aim.angleDeg, aim.powerPercent, active);
  const strength = aim.powerPercent < 45 ? '약하게 당김' : aim.powerPercent < 75 ? '보통으로 당김' : '강하게 당김';
  return <div className={`launcher ${run.defenseArmed || lastEvent?.key === 'defense' ? 'has-shield' : ''} ${lastEvent?.key === 'heal' ? 'is-healing' : ''}`}>
    <button ref={launcherRef} className={`launcher-button ${active ? 'is-drawn' : ''} ${aim.phase === 'launching' ? 'is-releasing' : ''}`}
      aria-label="새총 잡기" aria-describedby="aim-instructions" disabled={aim.phase === 'launching'}>
      <svg viewBox="0 0 124 142" aria-hidden="true">
        <path className="slingshot-band" data-testid="sling-band"
          d={`M ${left.x} ${left.y} L ${pouch.x} ${pouch.y} L ${right.x} ${right.y}`}
          fill="none" stroke="#ebc382" strokeWidth={4 + tension} strokeLinecap="round" />
        <path d={`M42 127 Q55 87 63 58 M63 58 Q50 40 ${left.x} ${left.y} M63 58 Q78 39 ${right.x} ${right.y}`}
          fill="none" stroke="#704628" strokeWidth="13" strokeLinecap="round" />
        <path d="M46 119 38 133" stroke="#b7804e" strokeWidth="7" strokeLinecap="round" />
        <circle className="slingshot-pouch" cx={pouch.x} cy={pouch.y} r="10"
          fill={run.fireballArmed ? '#ee6b35' : '#d9af6f'} stroke="#745033" strokeWidth="3" />
      </svg>
      <span>{aim.phase === 'launching' ? '발사!' : active ? '당기는 중' : '잡아당기기'}</span>
    </button>
    <div className="power-meter" role="img" aria-label={`새총의 힘: ${strength}`}>
      <span className="power-meter-fill" style={{ height: `${aim.powerPercent}%` }} />
      <span className="power-meter-mark" />
    </div>
  </div>;
}
