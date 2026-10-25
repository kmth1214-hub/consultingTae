import React from 'react';
import { REGIONS } from '../game/gameData.js';

export default function CampRewardResult({ session }) {
  const reveal = session.campRewardReveal;
  if (!reveal) return null;
  return <section className="screen-shell camp-reward-screen" aria-labelledby="camp-reward-title">
    <p className="eyebrow">야영지의 선물</p>
    <h1 id="camp-reward-title">새로운 사탕을 얻었어요</h1>
    <p className="screen-intro">이번에 받은 사탕과 합성 결과를 확인하세요.</p>
    <ul className="reward-grid camp-grants" aria-label="사탕 획득 결과">
      {reveal.items.map((item, index) => <li key={`${item.instanceId}-${index}`} className="reward-card camp-grant">
        <span className="camp-grant-top"><span className="candy-symbol" aria-hidden="true">✦</span>
          <span className="grade">{item.grade} 등급</span></span>
        <strong>{item.name}</strong><p>{item.effect}</p>
        <small>{item.fused ? '합성 완료' : '새로 획득'}</small>
      </li>)}
    </ul>
    <p className="muted">다음 목적지 · {REGIONS[reveal.area].name}</p>
    <button className="primary-button" onClick={session.continueAfterCampReward}>다음 지역으로 →</button>
  </section>;
}
