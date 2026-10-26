import React from 'react';
import { ASSETS } from '../game/assetCatalog.js';
import { MONSTER_NAMES } from '../game/gameData.js';
import AssetImage from './AssetImage.jsx';
import { attackStyle } from './EnemyResponse.jsx';
import EnemyProjectileArt from './EnemyProjectileArt.jsx';

function BossArmor({ kind }) {
  return <svg className="boss-armor" viewBox="0 0 100 100" aria-hidden="true" data-testid="boss-armor" data-kind={kind}>
    {kind === 'pointy-boar' ? <g stroke="#63412f" strokeWidth="1.4" strokeLinejoin="round">
      <path d="m27 40 4-18 9 12 8-19 8 18 11-14 4 23-20 12Z" fill="#715a49" />
      <path d="m29 28 2-16 9 22m9-5 2-22 8 24m7 0 7-18 1 27" fill="#f7e4b1" />
      <path d="M18 62Q4 55 12 40Q7 67 29 64M67 63Q85 69 91 48Q93 77 67 72" fill="#fff2c9" />
      <path d="m39 42 12-7 13 6-3 16-12 5-12-7Z" fill="#b88a51" /><circle cx="50" cy="47" r="4" fill="#f6c76c" />
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

function MonsterArt({ enemy }) {
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

export default function MonsterGroup({ enemies, placements, selectedTargetId, lastEvent, response, groupRef, layout, travelMs }) {
  return <div ref={groupRef} className="monster-group" role="group" aria-label={`몬스터 ${enemies.filter(enemy => enemy.alive).length}마리`}>
    {placements.map(placement => {
      const live = enemies.find(e => e.id === placement.id);
      const enemy = { ...live, ...placement };
      if (!enemy.alive) return null;
      const hit = lastEvent?.hits?.find(item => item.id === enemy.id);
      const attacking = response?.attack.enemyId === enemy.id;
      const visual = attacking ? attackStyle(response.attack) : null;
      const melee = visual?.melee;
      const hp = attacking && response.stage !== 'impact' ? enemy.hp - response.attack.healedEnemy : enemy.hp;
      return <div role="img" className={`monster ${enemy.isBoss ? 'monster--boss' : ''} ${selectedTargetId === enemy.id ? 'is-targeted' : ''} ${attacking ? 'is-attacking' : ''}`}
        data-attack-phase={attacking ? response.stage : undefined} data-melee={melee || undefined}
        data-throwing={visual?.thrown || undefined}
        key={enemy.id} data-enemy-id={enemy.id}
        aria-label={`${MONSTER_NAMES[enemy.kind]}, 체력 ${hp}/${enemy.maxHp}${selectedTargetId === enemy.id ? ', 바람 유도 목표' : ''}`}
        style={{ left: enemy.x, top: enemy.y, width: enemy.size,
          '--attack-travel': `${travelMs}ms`,
          '--strike-x': `${(layout.player.contact.x - enemy.x) / enemy.size * 100}%`,
          '--strike-y': `${(layout.player.contact.y - enemy.y) / enemy.size * 100}%` }}>
        <span className="monster-body"><span className="monster-shadow" /><MonsterArt enemy={enemy} />
          {enemy.isBoss && <BossArmor kind={enemy.kind} />}
        </span>
        {enemy.isBoss ? <span className="boss-health" data-testid="boss-health" aria-hidden="true">
          <strong>◆ {MONSTER_NAMES[enemy.kind]}</strong>
          <span className="boss-health-track"><span style={{ width: `${Math.max(0, Math.min(100, hp / enemy.maxHp * 100))}%` }} /></span>
          <small>{hp} / {enemy.maxHp}</small>
        </span> : <span className="monster-health">{hp}<span className="sr-only"> / {enemy.maxHp}</span></span>}
        {visual?.thrown && response.stage === 'windup' && <svg className="monster-throw-rig" viewBox="0 0 100 100" aria-hidden="true"
          style={{ '--ammo-color': visual.color }}>
          <g className={enemy.kind === 'snake' || enemy.kind === 'dry-ice' ? 'monster-ammo-gather' : 'monster-throw-grip'}>
            {enemy.kind !== 'snake' && enemy.kind !== 'dry-ice' && <g data-testid="monster-throw-arm" className="monster-throw-arm">
              <path d="M66 64 48 50 25 35" fill="none" stroke={enemy.kind.includes('robot') ? '#657f89' : '#8fbbc9'} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="48" cy="50" r="5" fill="#c2dee1" stroke="#577786" strokeWidth="2" />
              <circle cx="25" cy="35" r="7" fill={enemy.kind.includes('robot') ? '#a3bec2' : '#e9faff'} stroke="#577786" strokeWidth="2" />
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
