import React from 'react';
import { BattleEngine } from '../game/battleEngine.js';

export default function MagicCandyCard({ run, hidden }) {
  const weapon = BattleEngine.getCurrentWeapon(run);
  if (!weapon || hidden) return null;
  return <aside className="candy-hud hud-surface" aria-label="장전된 마법사탕">
    <div className="candy-card-top"><span className="candy-symbol" aria-hidden="true">✦</span><span className="grade">{weapon.grade} 등급</span></div>
    <h2>{weapon.name}</h2><p>{weapon.effect}</p>
    <div className="ammo-dots" aria-label={`남은 사탕 ${run.ammo}개`}>{Array.from({ length: run.maxAmmo }, (_, i) =>
      <i key={i} className={i < run.ammo ? '' : 'is-spent'} />)}</div>
    <p className="weapon-count">보유 사탕 {run.weapons.length}개 · 장전 대기 {run.weaponQueue.length}개</p>
  </aside>;
}
