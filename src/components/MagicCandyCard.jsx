import React from 'react';
import { getCandyDetails } from '../game/candyPresentation.js';
import { AIM_DISRUPTION_LABELS } from '../game/gameData.js';

export default function MagicCandyCard({ run, hidden }) {
  const details = getCandyDetails(run);
  if (!details || hidden) return null;
  const { current, currentAbility, damage, next, buffs, passives } = details;
  const chips = [run.spearArmed && '창 · 최대 3마리 관통', run.fireballArmed && '불공 ×2', run.pendingAimInversion && '조작 반전',
    run.studioMonsterPrototype === 'regional-monsters-v1' && AIM_DISRUPTION_LABELS[run.pendingAimDisruption],
    run.defenseArmed && '보호막', run.nextAttackDamageMultiplier === .5 && '적 피해 50%↓'].filter(Boolean);
  return <aside className="candy-hud hud-surface" aria-label="장전된 마법사탕">
    <div className="candy-card-top"><span className="candy-symbol" aria-hidden="true">✦</span><span className="candy-label">이번 사탕</span><span className="grade">{current.grade} 등급</span></div>
    <h2>{current.name}</h2>
    {currentAbility && <p className="candy-current-ability" data-testid="current-candy-ability">{currentAbility}</p>}
    <p className="candy-damage">기본 피해 <strong>{damage.min}–{damage.max}</strong><span>발사 시 무작위 · 추가 피해는 조건부</span></p>
    {chips.length > 0 && <ul className="candy-status-chips" aria-label="적용 중인 상태 요약">{chips.map(text => <li key={text}>{text}</li>)}</ul>}
    <div className="next-candy" aria-label="다음 사탕">
      <span>다음</span>{next ? <><strong>{next.name}</strong><small>{next.grade} 등급</small></>
        : <strong>{details.reshuffleNext ? '이번 발 후 다시 섞어요 · 다음 사탕 미정' : '다음 사탕 정보 없음'}</strong>}
    </div>
    <details className="candy-passives"><summary>보유 능력 {passives.length}개{buffs.length ? ` · 강화 ${buffs.length}` : ''}</summary>
      <div className="candy-detail-body">
        {buffs.length > 0 && <ul className="candy-buffs" aria-label="적용 중인 강화와 상태">{buffs.map(text => <li key={text}>{text}</li>)}</ul>}
        <p className="passive-note">{run.spearArmed ? '이번 창 발사에는 영구 사탕의 명중 능력이 적용되지 않아요.' : '보유한 사탕의 능력이 함께 적용돼요.'}</p>
        <ul className="owned-passives">{passives.map(passive => <li key={passive.id}>{passive.text}</li>)}</ul>
      </div>
    </details>
    <div className="ammo-dots" aria-label={`남은 사탕 ${run.ammo}개`}>{Array.from({ length: run.maxAmmo }, (_, i) =>
      <i key={i} className={i < run.ammo ? '' : 'is-spent'} />)}</div>
    <p className="weapon-count">보유 사탕 {run.weapons.length}개 · 장전 대기 {run.weaponQueue.length}개</p>
  </aside>;
}
