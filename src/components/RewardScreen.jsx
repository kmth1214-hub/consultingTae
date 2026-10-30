import React from 'react';
import { ASSETS } from '../game/assetCatalog.js';
import { REGIONS } from '../game/gameData.js';
import AssetImage from './AssetImage.jsx';
import SlotMachine from './SlotMachine.jsx';

export default function RewardScreen({ session }) {
  const { run } = session;
  const slot = run.slotReward;
  const ready = Boolean(slot && !slot.stoneSpinsRemaining && !slot.consumableSpinsRemaining
    && run.selectedRewards.consumable);
  return <section className="screen-shell reward-screen" aria-labelledby="reward-title">
    <p className="eyebrow">{REGIONS[run.area].name} · {run.round} / 3 클리어</p>
    <h1 id="reward-title">다음 전투의 보상</h1>
    <p className="screen-intro">스톤 슬롯을 돌려 보상을 확인하세요. 당첨은 전용 스톤, 빗나가면 기본 스톤입니다.</p>
    <SlotMachine kind="stone" remaining={slot.stoneSpinsRemaining} results={slot.stoneResults}
      onSpin={() => session.spinRewardSlot('stone')} />
    {run.area === 'chaos' ? <SlotMachine kind="consumable" remaining={slot.consumableSpinsRemaining}
      results={slot.consumableResults} onSpin={() => session.spinRewardSlot('consumable')}
      disabled={run.selectedRewards.consumable === 'skip'} /> :
      <fieldset className="reward-section"><legend>소모품 <span>1개 선택 · 종류별 최대 3개</span></legend>
        {run.rewardChoices.consumables.length ? <div className="reward-grid">{run.rewardChoices.consumables.map(choice => <button key={choice.choiceId}
          className={`reward-card ${run.selectedRewards.consumable === choice.choiceId ? 'is-selected' : ''}`}
          disabled={Boolean(run.selectedRewards.consumable)} aria-pressed={run.selectedRewards.consumable === choice.choiceId}
          onClick={() => session.selectReward('consumable', choice.choiceId)}>
          <AssetImage className="item-art" src={ASSETS.items[choice.id]} /><strong>{choice.name}</strong><span>{choice.description}</span>
          <small>{run.selectedRewards.consumable === choice.choiceId ? '선택 완료' : `보유 ${run.inventory[choice.id]} / 3`}</small>
        </button>)}</div> : <p className="muted">모든 소모품이 가득 차 있어요. 이번 보상은 자동으로 건너뜁니다.</p>}
      </fieldset>}
    <button className="primary-button continue-button" disabled={!ready} onClick={session.continueAfterReward}>
      {run.round === 3 ? (run.area === 'city' ? '원정 결과 보기' : '야영지로 이동') : '다음 라운드 →'}</button>
  </section>;
}
