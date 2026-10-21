import React, { useEffect, useRef } from 'react';
import { REGIONS } from '../game/gameData.js';
import BattleArena from './BattleArena.jsx';

function combatMessage(event) {
  if (!event) return '새총을 눌러 조준하고, 옆에서 각도와 파워를 조절하세요.';
  const damage = event.hits?.reduce((total, hit) => total + hit.damage, 0) || 0;
  const action = event.key === 'heal' ? `체력 ${event.effect.healed} 회복`
    : event.key === 'defense' ? '보호막 사용' : event.key === 'fireball' ? '다음 사탕 피해 2배'
      : event.missed ? '빗나갔어요' : `명중 · 피해 ${damage}`;
  const attack = event.enemyAttack;
  return `${action}${attack ? attack.blocked ? ' · 적 공격 차단!' : ` · 적 반격 −${attack.damage}` : ''}`;
}

export default function BattleScreen({ session }) {
  const { run, aim } = session;
  const arenaRef = useRef(null);
  useEffect(() => {
    const onKey = event => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      const key = ['fireball', 'spear', 'defense', 'heal'][Number(event.key) - 1];
      if (key) { event.preventDefault(); session.useConsumable(key); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session.useConsumable]);
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await arenaRef.current?.parentElement.requestFullscreen();
    } catch { /* Browser policy can reject fullscreen; the arena stays playable. */ }
  };
  return <section className="battle-screen" aria-labelledby="battle-title">
    <header className="battle-header">
      <div><p className="eyebrow">{run.bonusMode ? 'BONUS' : 'COOKIE EXPEDITION'}</p>
        <h1 id="battle-title">{REGIONS[run.area].name} 지역 <span>{run.round} / {run.bonusMode ? 3 : 5}</span></h1></div>
      <div className="battle-stats"><span>체력 <strong>{run.playerHp}</strong><small> / {run.maxPlayerHp}</small></span>
        <span>사탕 <strong>{run.ammo}</strong><small> / {run.maxAmmo}</small></span>
        <span>{run.bonusMode ? '보너스' : '점수'} <strong>{(run.bonusMode ? run.bonusScore : run.score).toLocaleString()}</strong></span></div>
      <button className="fullscreen-button" onClick={fullscreen} aria-label="전체화면 전환">⛶</button>
    </header>
    <BattleArena run={run} aim={aim} lastEvent={session.lastEvent} setAim={session.setAim}
      onFire={session.fireShot} onConsumable={session.useConsumable} arenaRef={arenaRef} />
    <div className="battle-status" role="status" aria-live="polite">{combatMessage(session.lastEvent)}</div>
  </section>;
}
