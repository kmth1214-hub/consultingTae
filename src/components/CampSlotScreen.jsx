import React from 'react';
import SlotMachine from './SlotMachine.jsx';

export default function CampSlotScreen({ session }) {
  const slot = session.run.slotReward;
  return <section className="screen-shell compact-screen" aria-labelledby="camp-slot-title">
    <p className="eyebrow">야영지 보상</p><h1 id="camp-slot-title">스톤 슬롯 두 번</h1>
    <p className="screen-intro">각 회전마다 스톤 한 개를 얻습니다. 당첨이면 선택 쿠키의 전용 스톤입니다.</p>
    <SlotMachine kind="stone" remaining={slot.stoneSpinsRemaining} results={slot.stoneResults}
      onSpin={() => session.spinRewardSlot('stone')} />
    <button className="primary-button continue-button" disabled={slot.stoneSpinsRemaining > 0}
      onClick={session.continueAfterCampSlot}>다음 지역으로 →</button>
  </section>;
}
