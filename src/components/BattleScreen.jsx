import React, { useEffect, useRef } from 'react';
import { REGIONS } from '../game/gameData.js';
import BattleArena from './BattleArena.jsx';
import { getChaosEffectLabel } from '../game/chaosObstacleFeedback.js';

function combatMessage(event, area) {
  if (!event) return '아이템은 숫자키 1–4 · 조준 취소는 Esc';
  const damage = event.hits?.reduce((total, hit) => total + hit.damage, 0) || 0;
  const effects = event.obstacleEffects || (event.obstacleEffect ? [event.obstacleEffect] : []);
  const obstacle = effects.at(-1);
  const effectDamage = effects.reduce((sum, effect) => sum
    + effect.hits.reduce((total, hit) => total + hit.damage, 0), 0);
  const obstacleMessage = area === 'chaos' ? getChaosEffectLabel(obstacle)
    : obstacle?.kind === 'log-strike' ? `통나무 충돌 · 적 피해 ${obstacle.hits.reduce((sum, hit) => sum + hit.damage, 0)}`
    : obstacle?.kind === 'ice-guard' ? '얼음 파괴 · 다음 적 공격 피해 50% 감소'
      : obstacle?.kind === 'jar-burst' ? `항아리 폭발 · 전체 적 피해 ${obstacle.hits.reduce((sum, hit) => sum + hit.damage, 0)}`
        : obstacle?.kind === 'aim-inversion' ? '혼돈의 역풍 · 다음 한 발 조작 반전' : null;
  const chainMessage = effects.length > 1 ? `연쇄 충돌 ${effects.length}회 · 추가 피해 ${effectDamage}` : obstacleMessage;
  const action = chainMessage ? `${chainMessage}${damage > effectDamage ? ` · 직접 명중 ${damage - effectDamage}` : ''}`
    : (event.key === 'heal' ? `체력 ${event.effect.healed} 회복`
    : event.key === 'defense' ? '보호막 준비 · 다음 발사 후 반격 차단' : event.key === 'fireball' ? '다음 사탕 피해 2배'
      : event.key === 'spear' ? '관통 사탕 준비 · 직접 조준해 발사하세요'
      : event.missed ? event.shotMeta?.impactKind === 'obstacle' ? '장애물에 막혔어요'
        : event.shotMeta?.reverse ? '뒤로 날아갔어요' : '빗나갔어요' : `명중 · 피해 ${damage}`);
  const attack = event.enemyAttack;
  if (event.bossSplit) return `${action} · 보스 분리${event.bossSplit.shock.blocked ? ' · 착지 충격 차단!' : ` · 착지 충격 −${event.bossSplit.shock.damage}`}`;
  return `${action}${attack ? attack.missed ? ' · 적 투척 빗나감 · 피해 없음'
    : attack.blocked ? ' · 적 공격 차단!' : ` · 적 반격 −${attack.damage}` : ''}`;
}

export default function BattleScreen({ session, music }) {
  const { run, aim, enemyResponse, bossTransition } = session;
  const beforeImpact = enemyResponse && enemyResponse.stage !== 'impact';
  const visibleHp = bossTransition && bossTransition.stage !== 'impact' ? bossTransition.split.shock.playerHpBefore
    : beforeImpact ? enemyResponse.attack.playerHpBefore : run.playerHp;
  const visibleAmmo = run.ammo + (beforeImpact ? enemyResponse.attack.ammoLost : 0);
  const arenaRef = useRef(null);
  useEffect(() => {
    const onKey = event => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      const key = ['fireball', 'spear', 'defense', 'heal'][Number(event.key) - 1];
      if (key) { event.preventDefault(); session.useConsumable(key); }
      if (event.key.toLowerCase() === 'q' && event.target.tagName !== 'BUTTON') {
        event.preventDefault(); session.armWindSkill();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session.useConsumable, session.armWindSkill]);
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
      {music && <div className="battle-bgm-controls" aria-label="배경 음악 설정">
        <button type="button" className="battle-bgm-toggle" aria-label={music.state === 'blocked' && !music.muted
          ? 'BGM 재생' : music.muted ? 'BGM 켜기' : 'BGM 음소거'}
          aria-pressed={music.muted} onClick={() => music.state === 'blocked' && !music.muted
            ? music.resume() : music.toggleMuted()}>♫</button>
        <input type="range" min="0" max="100" step="1" value={Math.round(music.volume * 100)}
          onChange={event => music.setVolume(Number(event.target.value) / 100)} aria-label="BGM 음량" />
      </div>}
      <button className="fullscreen-button" onClick={fullscreen} aria-label="전체화면 전환">⛶</button>
    </header>
    <BattleArena key={`${run.area}-${run.round}`} run={run} aim={aim} lastEvent={session.lastEvent} setAim={session.setAim}
      enemyResponse={enemyResponse} onEnemyAdvance={session.advanceEnemyResponse} onEnemyComplete={session.completeEnemyResponse}
      shotReview={session.shotReview} onReviewComplete={session.completeShotReview}
      bossTransition={bossTransition} onBossImpact={session.advanceBossTransition} onBossComplete={session.completeBossTransition}
      onBeginShot={session.beginShot} onCancelShot={session.cancelShot}
      onActivateFlightAbility={session.activateFlightAbility}
      onFire={session.fireShot} onConsumable={session.useConsumable} arenaRef={arenaRef} />
    <div className="battle-status" role="status" aria-live="polite">{session.shotReview
      ? `결과 확인 중 · ${combatMessage({ ...session.lastEvent, enemyAttack: null, bossSplit: null }, run.area)}` : bossTransition
      ? bossTransition.stage === 'flight' ? '융합체가 세 보스로 분리됩니다!' : combatMessage(session.lastEvent, run.area) : enemyResponse && beforeImpact
      ? '적의 반격! 공격이 끝나면 다음 행동을 할 수 있어요.' : combatMessage(session.lastEvent, run.area)}</div>
  </section>;
}
