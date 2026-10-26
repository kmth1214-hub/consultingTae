import React from 'react';
import { ASSETS } from '../game/assetCatalog.js';
import { MONSTER_NAMES } from '../game/gameData.js';
import AssetImage from './AssetImage.jsx';
import { attackStyle } from './EnemyResponse.jsx';
import EnemyProjectileArt from './EnemyProjectileArt.jsx';

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
          <span className="monster-health">{enemy.isBoss ? 'BOSS ' : ''}{hp}<span className="sr-only"> / {enemy.maxHp}</span></span></span>
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
