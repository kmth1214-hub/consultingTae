import React, { useEffect, useRef } from 'react';
import { REGIONS } from '../game/gameData.js';
import BattleArena from './BattleArena.jsx';

function combatMessage(event) {
  if (!event) return '아이템은 숫자키 1–4 · 조준 취소는 Esc';
  const damage = event.hits?.reduce((total, hit) => total + hit.damage, 0) || 0;
  const effects = event.obstacleEffects || (event.obstacleEffect ? [event.obstacleEffect] : []);
  const obstacle = effects.at(-1);
  const effectDamage = effects.reduce((sum, effect) => sum
    + effect.hits.reduce((total, hit) => total + hit.damage, 0), 0);
  const obstacleMessage = obstacle?.kind === 'log-strike' ? `통나무 충돌 · 적 피해 ${obstacle.hits.reduce((sum, hit) => sum + hit.damage, 0)}`
    : obstacle?.kind === 'ice-guard' ? '얼음 파괴 · 다음 적 공격 피해 50% 감소'
      : obstacle?.kind === 'jar-burst' ? `항아리 폭발 · 전체 적 피해 ${obstacle.hits.reduce((sum, hit) => sum + hit.damage, 0)}`
        : obstacle?.kind === 'aim-inversion' ? '혼돈의 역풍 · 다음 한 발 조작 반전' : null;
  const chainMessage = effects.length > 1 ? `연쇄 충돌 ${effects.length}회 · 추가 피해 ${effectDamage}` : obstacleMessage;
  const action = chainMessage ? `${chainMessage}${damage > effectDamage ? ` · 직접 명중 ${damage - effectDamage}` : ''}`
    : (event.key === 'heal' ? `체력 ${event.effect.healed} 회복`
    : event.key === 'defense' ? '보호막 준비 · 다음 발사 후 반격 차단' : event.key === 'fireball' ? '다음 사탕 피해 2배'
      : event.missed ? event.shotMeta?.impactKind === 'obstacle' ? '장애물에 막혔어요'
        : event.shotMeta?.reverse ? '뒤로 날아갔어요' : '빗나갔어요' : `명중 · 피해 ${damage}`);
  const attack = event.enemyAttack;
  return `${action}${attack ? attack.blocked ? ' · 적 공격 차단!' : ` · 적 반격 −${attack.damage}` : ''}`;
}

export default function BattleScreen({ session }) {
  const { run, aim, enemyResponse } = session;
  const beforeImpact = enemyResponse && enemyResponse.stage !== 'impact';
  const visibleHp = beforeImpact ? enemyResponse.attack.playerHpBefore : run.playerHp;
  const visibleAmmo = run.ammo + (beforeImpact ? enemyResponse.attack.ammoLost : 0);
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
        <h1 id="battle-title">{REGIONS[run.area].name} 지역 <span>{run.round} / 3</span></h1></div>
      <div className="battle-stats"><span>체력 <strong>{visibleHp}</strong><small> / {run.maxPlayerHp}</small></span>
        <span>사탕 <strong>{visibleAmmo}</strong><small> / {run.maxAmmo}</small></span>
        <span>{run.bonusMode ? '보너스' : '점수'} <strong>{(run.bonusMode ? run.bonusScore : run.score).toLocaleString()}</strong></span></div>
      <button className="fullscreen-button" onClick={fullscreen} aria-label="전체화면 전환">⛶</button>
    </header>
    <BattleArena key={`${run.area}-${run.round}`} run={run} aim={aim} lastEvent={session.lastEvent} setAim={session.setAim}
      enemyResponse={enemyResponse} onEnemyAdvance={session.advanceEnemyResponse} onEnemyComplete={session.completeEnemyResponse}
      shotReview={session.shotReview} onReviewComplete={session.completeShotReview}
      onFire={session.fireShot} onConsumable={session.useConsumable} arenaRef={arenaRef} />
    <div className="battle-status" role="status" aria-live="polite">{session.shotReview
      ? `결과 확인 중 · ${combatMessage({ ...session.lastEvent, enemyAttack: null })}` : enemyResponse && beforeImpact
      ? '적의 반격! 공격이 끝나면 다음 행동을 할 수 있어요.' : combatMessage(session.lastEvent)}</div>
  </section>;
}
