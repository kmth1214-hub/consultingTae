import React from 'react';
import { ASSETS } from '../game/assetCatalog.js';
import { REGIONS } from '../game/gameData.js';
import AssetImage from './AssetImage.jsx';
import FusionChoice from './FusionChoice.jsx';

export default function RewardScreen({ session }) {
  const { run, fusion } = session;
  const ready = run.selectedRewards.weapon && run.selectedRewards.consumable && !fusion;
  return <section className="screen-shell reward-screen" aria-labelledby="reward-title">
    <p className="eyebrow">{REGIONS[run.area].name} · {run.round} / 3 클리어</p>
    <h1 id="reward-title">다음 한 발을 위한 선물</h1><p className="screen-intro">무기와 소모품을 하나씩 선택하세요.</p>
    <p className="muted">{run.snowRewardsUnlocked || run.snowAreaCleared
      ? '우유맛·바람궁수 사탕도 보상 후보에 포함돼요.'
      : '기본 3종 사탕 중에서 선택하세요. 우유맛·바람궁수 사탕은 눈 지역 클리어 후 해금돼요.'}</p>
    <FusionChoice fusion={fusion} onChoose={session.resolveFusion} />
    <fieldset disabled={Boolean(fusion)} className="reward-section"><legend>마법사탕 <span>C 등급 · 1개 선택</span></legend>
      <div className="reward-grid">{run.rewardChoices.weapons.map(choice => <button key={choice.choiceId}
        className={`reward-card ${run.selectedRewards.weapon === choice.choiceId ? 'is-selected' : ''}`}
        disabled={Boolean(run.selectedRewards.weapon)} aria-pressed={run.selectedRewards.weapon === choice.choiceId}
        onClick={() => session.selectReward('weapon', choice.choiceId)}>
        <span className="candy-symbol" aria-hidden="true">✦</span><strong>{choice.name}</strong><span>{choice.effect}</span>
        <small>{run.selectedRewards.weapon === choice.choiceId ? (choice.fused ? '합성 완료' : '선택 완료') : '선택'}</small>
      </button>)}</div>
    </fieldset>
    <fieldset disabled={Boolean(fusion)} className="reward-section"><legend>소모품 <span>1개 선택 · 종류별 최대 3개</span></legend>
      {run.rewardChoices.consumables.length ? <div className="reward-grid">{run.rewardChoices.consumables.map(choice => <button key={choice.choiceId}
        className={`reward-card ${run.selectedRewards.consumable === choice.choiceId ? 'is-selected' : ''}`}
        disabled={Boolean(run.selectedRewards.consumable)} aria-pressed={run.selectedRewards.consumable === choice.choiceId}
        onClick={() => session.selectReward('consumable', choice.choiceId)}>
        <AssetImage className="item-art" src={ASSETS.items[choice.id]} /><strong>{choice.name}</strong><span>{choice.description}</span>
        <small>{run.selectedRewards.consumable === choice.choiceId ? '선택 완료' : `보유 ${run.inventory[choice.id]} / 3`}</small>
      </button>)}</div> : <p className="muted">모든 소모품이 가득 차 있어요. 이번 소모품 보상은 자동으로 건너뜁니다.</p>}
    </fieldset>
    <button className="primary-button continue-button" disabled={!ready} onClick={session.continueAfterReward}>
      {run.round === 3 ? (run.area === 'city' ? '원정 결과 보기' : '야영지로 이동') : '다음 라운드 →'}</button>
  </section>;
}
