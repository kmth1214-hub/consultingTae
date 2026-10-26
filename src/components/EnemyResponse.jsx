import React, { useEffect, useRef } from 'react';
import { MONSTER_NAMES } from '../game/gameData.js';
import { createEnemyProjectileArc, sampleEnemyProjectile, enemyTrailD } from '../game/enemyProjectileMotion.js';
import EnemyProjectileArt from './EnemyProjectileArt.jsx';

export function attackStyle(attack) {
  const special = attack.attemptedSpecial;
  if (special === 'boar-charge') return { label: '가시 돌진', color: '#ef8950', melee: true };
  if (special === 'frozen-breath') return { label: '얼음 숨결', color: '#a2e9ff', breath: true };
  if (special === 'oven-overheat') return { label: '오븐 과열', color: '#ff9853', flame: true };
  if (attack.kind.includes('boar')) return { label: '몸통 박치기', color: '#d9a279', melee: true };
  if (attack.kind === 'snake') return { label: '젤리 탄', color: '#a9df78', thrown: true, ammo: 'jelly' };
  if (attack.kind === 'dry-ice') return { label: '얼음 파편', color: '#b6efff', thrown: true, ammo: 'ice' };
  if (attack.kind.includes('robot')) return { label: '에너지 탄', color: '#ffcd75', thrown: true, ammo: 'energy' };
  return { label: '눈덩이 던지기', color: '#efffff', thrown: true, ammo: 'snow' };
}

function responseLabel({ attack, stage }) {
  const visual = attackStyle(attack);
  return stage === 'windup' ? `${MONSTER_NAMES[attack.kind]} · ${visual.label} 준비!`
    : stage === 'travel' ? `${visual.label}!` : attack.blocked ? '공격을 막았어요!' : `체력 −${attack.damage}`;
}

// Notices belong to the viewport, so cropping/zooming the world never hides them.
export function EnemyResponseNotice({ response }) {
  const label = responseLabel(response);
  return <div className={`enemy-warning ${attackStyle(response.attack).thrown ? 'enemy-warning--throw' : ''} ${response.attack.attemptedSpecial ? 'is-special' : ''}`}>
    <span className="enemy-warning-long">{label}</span>
    <span className="enemy-warning-short">{response.stage === 'windup' ? `${attackStyle(response.attack).label} 준비!` : label}</span>
  </div>;
}

// One clock per committed enemy turn. Phase callbacks never resolve combat or roll RNG.
export function responseTravelMs(response, layout, reduced) {
  if (reduced) return 100;
  const attacker = layout.enemies.find(e => e.id === response?.attack.enemyId);
  return Math.max(520, Math.min(1100, Math.abs((attacker?.x ?? layout.player.impact.x) - layout.player.impact.x) / 4));
}

export default function EnemyResponse({ response, layout, travelMs, onAdvance, onComplete }) {
  const projectile = useRef(null);
  const projectileArt = useRef(null), trail = useRef(null);
  const callbacks = useRef(null);
  callbacks.current = { onAdvance, onComplete };
  const { attack, stage, id } = response;
  const visual = attackStyle(attack);
  const attacker = layout.enemies.find(enemy => enemy.id === attack.enemyId);
  const source = { x: attacker ? attacker.x - (visual.thrown ? attacker.size * .25 : 0) : layout.player.impact.x,
    y: attacker ? attacker.y - attacker.size * (visual.thrown ? .65 : .55) : layout.player.impact.y };
  const target = layout.player.impact;
  const arc = createEnemyProjectileArc({ source, target,
    height: visual.thrown ? undefined : visual.breath ? 0 : 75 });
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const windup = reduced ? 150 : attack.attemptedSpecial ? 480 : 340;
    const travel = travelMs;
    const impact = reduced ? 400 : 520;
    const started = performance.now();
    let frame, canceled = false, previous = 'windup', done = false;
    const finish = () => {
      if (done || canceled) return;
      done = true;
      callbacks.current.onComplete(id);
    };
    function tick(time) {
      if (canceled || done) return;
      const elapsed = time - started;
      const next = elapsed < windup ? 'windup' : elapsed < windup + travel ? 'travel' : 'impact';
      // A suspended frame may cross both boundaries; publish them in order.
      if (previous === 'windup' && next !== 'windup') {
        callbacks.current.onAdvance(id, 'travel');
        previous = 'travel';
      }
      if (previous === 'travel' && next === 'impact') {
        callbacks.current.onAdvance(id, 'impact');
        previous = 'impact';
      }
      const p = reduced ? 1 : Math.max(0, Math.min(1, (elapsed - windup) / travel));
      const { x, y, angle } = sampleEnemyProjectile(arc, p);
      projectile.current?.setAttribute('transform', `translate(${x} ${y})`);
      if (projectile.current) projectile.current.dataset.progress = String(p);
      if (visual.thrown) {
        projectileArt.current?.setAttribute('transform', `rotate(${angle})`);
        trail.current?.setAttribute('d', enemyTrailD(arc, p));
      }
      if (elapsed >= windup + travel + impact) finish();
      else frame = requestAnimationFrame(tick);
    }
    const visibility = () => { if (document.hidden) finish(); };
    document.addEventListener('visibilitychange', visibility);
    if (document.hidden) finish();
    else frame = requestAnimationFrame(tick);
    return () => {
      canceled = true;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [id]);
  const label = responseLabel(response);
  return <div className={`enemy-response enemy-response--${stage} ${attack.attemptedSpecial ? 'is-special' : ''}`}
    data-testid="enemy-attack" data-attacker-id={attack.enemyId} data-stage={stage}
    data-special={attack.attemptedSpecial || ''} role="img" aria-label={label}>
    <svg viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" style={{ '--attack-color': visual.color }}>
      {stage === 'windup' && <g className="attack-telegraph" transform={`translate(${source.x} ${source.y - 70})`}>
        <circle r="22" /><text y="9" textAnchor="middle">!</text></g>}
      {!visual.melee && <path ref={trail} data-testid="enemy-projectile-trail" className="enemy-projectile-trail"
        data-trajectory={arc.d} data-arc-height={arc.height}
        d={visual.thrown ? '' : arc.d}
        vectorEffect="non-scaling-stroke" />}
      {!visual.melee && <g ref={projectile} data-testid="enemy-projectile" className="enemy-projectile"
        data-ammo={visual.ammo}
        transform={`translate(${source.x} ${source.y})`}>
        {visual.thrown ? <g ref={projectileArt}><EnemyProjectileArt ammo={visual.ammo} /></g>
          : visual.breath ? <path d="M-55 0 50-34 27 0 50 34Z" />
            : visual.flame ? <path d="M-38 0Q-9-38 16-21L8-42Q57-7 28 23Q-3 43-38 0Z" />
              : <><path d="M18-9 70-5M18 0H88M18 9 70 5" fill="none" /><circle r="19" /></>}
        {!visual.thrown && <circle r="6" fill="#fffbea" stroke="none" />}
      </g>}
      {stage === 'impact' && <g transform={`translate(${target.x} ${target.y})`}>
        {attack.blocked ? <g className="shield-impact" data-testid="shield-impact">
          <path d="M-31-26 0-38 31-26V4Q30 28 0 43Q-30 28-31 4Z" />
          <text y="-122" textAnchor="middle">{attack.blockedBy === 'milk' ? '우유 보호막 · 차단!' : '쉴드 · 차단!'}</text>
          <text y="134" textAnchor="middle">피해 0</text>
        </g> : <g className="player-impact" data-testid="player-impact">
          <path d="M0-62 15-25 47-42 30-8 66 5 29 18 46 51 8 33-13 64-22 28-57 38-34 4-62-18-23-19-24-54Z" />
          <text y="-100" textAnchor="middle">−{attack.damage}</text>
          {attack.special && <text className="special-impact-label" y="130" textAnchor="middle">
            {attack.special === 'frozen-breath' ? '다음 턴 아이템 동결' : attack.special === 'oven-overheat' ? '사탕 −1 · 보스 회복' : '가시 돌진 명중'}</text>}
        </g>}
      </g>}
    </svg>
  </div>;
}
