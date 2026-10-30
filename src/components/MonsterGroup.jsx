import React from 'react';
import { ASSETS } from '../game/assetCatalog.js';
import { MONSTER_NAMES } from '../game/gameData.js';
import AssetImage from './AssetImage.jsx';
import { attackStyle } from './EnemyResponse.jsx';
import EnemyProjectileArt from './EnemyProjectileArt.jsx';

function BossArmor({ kind }) {
  return <svg className="boss-armor" viewBox="0 0 100 100" aria-hidden="true" data-testid="boss-armor" data-kind={kind}>
    {kind === 'pointy-boar' ? <g strokeLinejoin="round">
      <path d="M54 38 51 35 54 33 58 36Q63 34 67 39L68 47 65 52 58 53 54 49Z"
        fill="#5d4b43" stroke="#302b2c" strokeWidth="1.1" />
      <path d="M52 35 55 38M54 49 57 52" fill="none" stroke="#d5a672" strokeWidth=".8" />
      <ellipse cx="61" cy="44" rx="6" ry="7" transform="rotate(-12 61 44)"
        fill="#af9475" stroke="#f2ca91" strokeWidth="1" />
      <ellipse cx="61" cy="44" rx="4.5" ry="5.6" transform="rotate(-12 61 44)"
        fill="#2a292e" stroke="#514342" strokeWidth=".7" />
      <ellipse cx="61" cy="44" rx="2.7" ry="3.5" fill="#f0633b" stroke="#ffc276" strokeWidth=".7" />
      <circle cx="60.3" cy="43" r=".9" fill="#fff1bf" />
      <circle cx="56" cy="38" r=".8" fill="#f7d79e" />
      <circle cx="65" cy="50" r=".8" fill="#f7d79e" />
    </g> : kind === 'cowardly-snowman' ? <g stroke="#4c88ac" strokeWidth="1.3" strokeLinejoin="round">
      <path d="m26 24-4-17 15 8 12-14 13 14 16-8-5 20Z" fill="#a6e4fa" />
      <path d="m49 4 1 19m-22-12 8 13m35-13-8 13" stroke="#f4ffff" />
      <path d="m12 58 9-18 15 14-6 19-19 8Zm55-5 15-13 10 21-2 20-18-9Z" fill="#8acde8" />
      <path d="m26 72 23 10 25-10-9 22H35Z" fill="#bdedfa" /><path d="m49 82 1 10m-30-35-6 17m66-17 7 17" stroke="#fff" />
      <path d="m42 25 8-8 8 8-8 9Z" fill="#edfaff" />
    </g> : <g stroke="#69494c" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M16 30V8H29V30M71 30V4H84V31" fill="#82626c" />
      <path d="M13 8H32V15H13ZM68 4H87V11H68Z" fill="#cba484" />
      <path d="M22 8Q13-3 23-9M78 4Q91-8 78-14" fill="none" stroke="#ded1bd" strokeWidth="4" />
      <rect x="20" y="58" width="60" height="31" rx="9" fill="#503331" />
      <path d="M30 84Q23 74 38 65L37 77 48 61 56 77 64 67Q81 81 66 85Z" fill="#ffb346" stroke="#e1763f" />
      <path d="M28 69H73M28 78H73M38 61V86M51 61V86M64 61V86" stroke="#65423a" strokeWidth="3" />
      <path d="M15 42 5 54 16 63M84 42 95 54 84 63" fill="#b98b65" />
    </g>}
  </svg>;
}

const REGIONAL_MONSTER_ART = {
  'dry-ice': ASSETS.monsters.dryIceV2,
  snowball: ASSETS.monsters.snowballV2,
  'cowardly-snowman': ASSETS.monsters.cowardlySnowmanV2,
  'washing-robot': ASSETS.monsters.washingRobotV2,
  'clockwork-crow': ASSETS.monsters.clockworkCrow,
  'oven-robot': ASSETS.monsters.ovenRobotV2,
  'frost-gear-snake': ASSETS.monsters.frostGearSnake,
  'oven-snow-boar': ASSETS.monsters.ovenSnowBoar,
  'jelly-cloud-robot': ASSETS.monsters.jellyCloudRobot
};

function MonsterArt({ enemy, studioMonsterPrototype }) {
  const [failedSource, setFailedSource] = React.useState(null);
  const studioArt = enemy.kind === 'clockwork-crow' ? REGIONAL_MONSTER_ART[enemy.kind]
    : studioMonsterPrototype === 'regional-monsters-v1' ? REGIONAL_MONSTER_ART[enemy.kind] : null;
  if (studioArt && failedSource !== studioArt) return <img src={studioArt} alt="" aria-hidden="true"
    className="monster-art monster-art--regional" data-monster-art={enemy.kind}
    onError={() => setFailedSource(studioArt)} />;
  if (enemy.kind === 'chaos-fused-boss') return <AssetImage src={ASSETS.monsters.chaosFusedBoss} className="monster-art monster-art--fused" />;
  const art = enemy.kind === 'snake' ? ASSETS.monsters.jellySnake
    : ['boar', 'pointy-boar'].includes(enemy.kind) ? ASSETS.monsters.chocolateBoar : null;
  if (art) return <AssetImage src={art} className="monster-art" />;
  const robot = enemy.kind.includes('robot');
  const ice = enemy.kind === 'dry-ice';
  return <svg viewBox="0 0 100 110" className="monster-art" aria-hidden="true">
    <ellipse cx="50" cy="103" rx="31" ry="5" fill="#283d4030" />
    {robot ? <g stroke="#454255" strokeWidth="3" strokeLinejoin="round">
      <path d="M23 86 19 102H39L43 86M61 86 65 102H83L78 86" fill="#657984" />
      <rect x="13" y="26" width="74" height="65" rx="16" fill={enemy.isBoss ? '#b98b7a' : '#91b7b8'} />
      <rect x="23" y="36" width="54" height="24" rx="9" fill="#2f4f60" />
      <path d="M33 72H67M36 80H64M50 26V14" strokeLinecap="round" /><circle cx="50" cy="12" r="5" fill="#f8c073" />
      <path d="M33 46H40M60 46H67" stroke="#b5ffdb" strokeWidth="5" strokeLinecap="round" />
    </g> : ice ? <g stroke="#478aa7" strokeWidth="3" strokeLinejoin="round">
      <path d="M18 90 12 38 35 16 79 21 90 72 72 98Z" fill="#bceaf1" />
      <path d="M12 38 62 44 79 21M62 44 72 98" fill="none" /><path d="m22 42 8 35M32 28 44 30" stroke="#fff" strokeWidth="5" />
      <path d="M30 56 38 58M68 56 75 52" stroke="#27516b" strokeWidth="5" strokeLinecap="round" />
      <path d="M43 74Q51 81 60 73" fill="none" />
    </g> : <g stroke="#6594aa" strokeWidth="2.5">
      <ellipse cx="50" cy="78" rx="36" ry="26" fill="#e3f6fa" /><circle cx="50" cy="40" r="27" fill="#f6fdfc" />
      <path d="M19 22H81L67 15 64 5H35L32 15Z" fill={enemy.isBoss ? '#7f668a' : '#7eacba'} />
      <path d="m42 46 14 3-14 4Z" fill="#ed9d65" stroke="none" /><circle cx="37" cy="38" r="3" fill="#335265" stroke="none" />
      <circle cx="62" cy="38" r="3" fill="#335265" stroke="none" /><path d="M24 62Q49 77 77 61" fill="none" stroke="#e1848b" strokeWidth="8" />
      <circle cx="50" cy="85" r="3" fill="#527385" stroke="none" />
    </g>}
  </svg>;
}

export default function MonsterGroup({ enemies, placements, selectedTargetId, lastEvent, response, groupRef, layout, travelMs,
  hitEffectsEnabled = false, showDefeatedHit = false, studioMonsterPrototype = null }) {
  return <div ref={groupRef} className="monster-group" role="group" aria-label={`몬스터 ${enemies.filter(enemy => enemy.alive).length}마리`}>
    {placements.map(placement => {
      const live = enemies.find(e => e.id === placement.id);
      const enemy = { ...live, ...placement };
      const actualHits = lastEvent?.hits?.filter(item => item.id === enemy.id && item.damage > 0) || [];
      const hit = hitEffectsEnabled && actualHits.length
        ? { ...actualHits.at(-1), damage: actualHits.reduce((sum, item) => sum + item.damage, 0) }
        : lastEvent?.hits?.find(item => item.id === enemy.id);
      const hitNow = hitEffectsEnabled && showDefeatedHit && actualHits.length > 0;
      if (!enemy.alive && !hitNow) return null;
      const attacking = response?.attack.enemyId === enemy.id;
      const visual = attacking ? attackStyle(response.attack) : null;
      const melee = visual?.melee;
      const hp = attacking && response.stage !== 'impact' ? enemy.hp - response.attack.healedEnemy : enemy.hp;
      return <div role="img" className={`monster ${enemy.isBoss ? 'monster--boss' : ''} ${enemy.kind === 'clockwork-crow' ? 'monster--crow' : ''} ${selectedTargetId === enemy.id ? 'is-targeted' : ''} ${attacking ? 'is-attacking' : ''} ${hitNow ? 'is-hit' : ''} ${!enemy.alive ? 'is-defeated-hit' : ''}`}
        data-attack-phase={attacking ? response.stage : undefined} data-melee={melee || undefined}
        data-throwing={visual?.thrown || undefined}
        data-miss-style={attacking ? response.attack.missStyle || undefined : undefined}
        key={enemy.id} data-enemy-id={enemy.id}
        aria-label={`${MONSTER_NAMES[enemy.kind]}, 체력 ${hp}/${enemy.maxHp}${selectedTargetId === enemy.id ? ', 바람 유도 목표' : ''}`}
        style={{ left: enemy.x, top: enemy.y, width: enemy.size,
          '--attack-travel': `${travelMs}ms`,
          '--strike-x': `${(layout.player.contact.x - enemy.x) / enemy.size * 100}%`,
          '--strike-y': `${(layout.player.contact.y - enemy.y) / enemy.size * 100}%` }}>
        <span key={hitNow ? `hit-${lastEvent.id}` : 'idle'} className="monster-body"><span className="monster-shadow" /><MonsterArt enemy={enemy} studioMonsterPrototype={studioMonsterPrototype} />
          {enemy.isBoss && enemy.kind !== 'chaos-fused-boss'
            && !(studioMonsterPrototype === 'regional-monsters-v1' && ['cowardly-snowman', 'oven-robot'].includes(enemy.kind))
            && <BossArmor kind={enemy.kind} />}
          {attacking && response.attack.missed && response.stage === 'windup' && <span className="monster-mistake" aria-hidden="true">?!</span>}
        </span>
        {hitNow && <span key={`burst-${lastEvent.id}`} className="monster-hit-burst" data-testid="monster-hit-burst"
          data-hit-kind={lastEvent.visualKey || 'candy'} aria-hidden="true">
          <i className="monster-hit-ring" />{Array.from({ length: 5 }, (_, index) => <i key={index} className="monster-hit-crumb" />)}
        </span>}
        {enemy.isBoss ? <span className="boss-health" data-testid="boss-health" aria-hidden="true">
          <strong>◆ {MONSTER_NAMES[enemy.kind]}</strong>
          <span className="boss-health-track"><span style={{ width: `${Math.max(0, Math.min(100, hp / enemy.maxHp * 100))}%` }} /></span>
          <small>{hp} / {enemy.maxHp}</small>
        </span> : <span className="monster-health">{hp}<span className="sr-only"> / {enemy.maxHp}</span></span>}
        {visual?.thrown && response.stage === 'windup' && <svg className="monster-throw-rig" viewBox="0 0 100 100" aria-hidden="true"
          style={{ '--ammo-color': visual.color }}>
          <g className={['snake', 'dry-ice'].includes(response.attack.attackKind || enemy.kind) ? 'monster-ammo-gather' : 'monster-throw-grip'}>
            {!['snake', 'dry-ice'].includes(response.attack.attackKind || enemy.kind) && <g data-testid="monster-throw-arm" className="monster-throw-arm">
              <path d="M66 64 48 50 25 35" fill="none" stroke={(response.attack.attackKind || enemy.kind).includes('robot') ? '#657f89' : '#8fbbc9'} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="48" cy="50" r="5" fill="#c2dee1" stroke="#577786" strokeWidth="2" />
              <circle cx="25" cy="35" r="7" fill={(response.attack.attackKind || enemy.kind).includes('robot') ? '#a3bec2' : '#e9faff'} stroke="#577786" strokeWidth="2" />
            </g>}
            <g data-testid="monster-held-projectile" data-ammo={visual.ammo} transform={`translate(25 35) scale(${100 / enemy.size})`}>
              <EnemyProjectileArt ammo={visual.ammo} />
            </g>
          </g>
        </svg>}
        {hit && <span key={lastEvent.id} className={`hit-effect hit-effect--${lastEvent.visualKey}`}>−{hit.damage}</span>}
      </div>;
    })}
  </div>;
}
