import React from 'react';
import { ASSETS } from '../game/assetCatalog.js';
import AssetImage from './AssetImage.jsx';
import ConsumableTable from './ConsumableTable.jsx';
import MagicCandyCard from './MagicCandyCard.jsx';
import MonsterGroup from './MonsterGroup.jsx';
import ArenaScenery from './ArenaScenery.jsx';
import { sampleShot, shotHitIds } from '../game/arenaLayout.js';

export default function BattleArena({ run, aim, lastEvent, setAim, onFire, onConsumable, arenaRef }) {
  const aiming = aim.phase !== 'idle';
  const points = sampleShot(aim.angle, aim.power);
  const preview = points.slice(0, Math.floor(points.length * .3)).map(point => `${point.x},${point.y}`).join(' ');
  const launch = () => onFire({ hitIds: shotHitIds(points, run.enemies) });
  return <div ref={arenaRef} className={`battle-arena battle-arena--${run.area}`} aria-label="전투 맵">
    <div className="arena-world">
      {run.area === 'forest' ? <>
        <AssetImage className="scene-layer scene-distant" src={ASSETS.forestLayers.distant} />
        <AssetImage className="scene-layer scene-midground" src={ASSETS.forestLayers.midground} />
        <AssetImage className="scene-layer scene-path" src={ASSETS.forestLayers.path} />
      </> : <AssetImage className="scene-layer scene-distant" src={ASSETS.maps[run.area]} />}
      <ArenaScenery area={run.area} />
      <div className={`launcher ${run.defenseArmed || lastEvent?.key === 'defense' ? 'has-shield' : ''} ${lastEvent?.key === 'heal' ? 'is-healing' : ''}`}
        key={`${run.area}-${run.round}-${lastEvent?.id || 0}`}>
        <button className="launcher-button" aria-label={aiming ? '사탕 발사' : '새총 조준 시작'} onClick={() => aiming ? launch() : setAim({ phase: 'aiming' })}>
          <svg viewBox="0 0 124 142" aria-hidden="true">
            <path d="M34 22 64 54 91 22" fill="none" stroke="#e1b36d" strokeWidth="5" />
            <path d="M63 58Q55 87 42 127M62 59Q50 40 34 22M64 58Q78 39 91 22" fill="none" stroke="#704628" strokeWidth="13" strokeLinecap="round" />
            <path d="M46 119 38 133" stroke="#b7804e" strokeWidth="7" strokeLinecap="round" />
            <circle cx="64" cy="54" r="10" fill={run.fireballArmed ? '#ee6b35' : '#d9af6f'} stroke="#745033" strokeWidth="3" />
          </svg>
          <span>{aiming ? '발사' : '조준'}</span>
        </button>
        <label className="power-control"><span className="sr-only">발사 파워</span>
          <input aria-label="발사 파워" type="range" min="20" max="100" value={aim.power}
            disabled={!aiming} onChange={event => setAim({ power: Number(event.target.value) })} />
          <output>{Math.round(aim.power)}%</output>
        </label>
        <label className="angle-control"><span className="sr-only">발사 각도</span>
          <input aria-label="발사 각도" type="range" min="10" max="80" value={aim.angle}
            disabled={!aiming} onChange={event => setAim({ angle: Number(event.target.value) })} />
          <output>{Math.round(aim.angle)}°</output>
        </label>
        {aiming && <button className="cancel-aim" onClick={() => setAim({ phase: 'idle' })}>취소</button>}
      </div>
      {run.area === 'forest' && <AssetImage className="scene-layer scene-foreground" src={ASSETS.forestLayers.foreground} />}
      <svg className="projectile-layer" viewBox="0 0 1200 800" aria-hidden="true">
        {aiming && <polyline points={preview} fill="none" stroke="#fff7ca" strokeWidth="4" strokeDasharray="5 12" opacity=".7" />}
      </svg>
      <MonsterGroup enemies={run.enemies} selectedTargetId={aim.selectedTargetId} lastEvent={lastEvent}
        onSelectTarget={selectedTargetId => setAim({ selectedTargetId })} />
    </div>
    <div className="arena-hud">
      <ConsumableTable run={run} disabled={aiming} onConsumable={onConsumable} />
      <MagicCandyCard run={run} hidden={aim.phase === 'launching'} />
    </div>
  </div>;
}
