import React from 'react';
import { REGIONS } from '../game/gameData.js';
import FusionChoice from './FusionChoice.jsx';

export default function CampScreen({ session }) {
  return <section className="screen-shell compact-screen" aria-labelledby="camp-title">
    <p className="eyebrow">{REGIONS[session.run.area].name} 지역 클리어</p><h1 id="camp-title">잠깐, 모닥불 곁에서</h1>
    <p className="screen-intro">다음 지역을 향해 떠나기 전, 하나를 선택하세요.</p>
    <p className="muted">{session.run.snowRewardsUnlocked || session.run.snowAreaCleared
      ? '모든 종류의 마법사탕을 획득할 수 있어요.'
      : '마법사탕 보상은 기본 3종에서 나와요. 눈 지역 클리어 후 우유맛·바람궁수 사탕도 획득할 수 있어요.'}</p>
    <p className="camp-hp">현재 체력 <strong>{session.run.playerHp} / {session.run.maxPlayerHp}</strong></p>
    <FusionChoice fusion={session.fusion} onChoose={session.resolveFusion} />
    <div className="camp-grid">
      <button className="reward-card" disabled={Boolean(session.fusion || session.run.pendingCampReward)} onClick={() => session.chooseCampReward('heal')}>
        <span className="camp-icon" aria-hidden="true">✚</span><strong>따뜻한 휴식</strong><span>체력 60 회복 · 최대 체력까지</span></button>
      <button className="reward-card" disabled={Boolean(session.fusion)} onClick={() => session.chooseCampReward('weapon')}>
        <span className="camp-icon" aria-hidden="true">✦</span><strong>새로운 마법사탕</strong><span>90% 확률 C 등급 2개<br />10% 확률 B 등급 1개</span></button>
    </div>
  </section>;
}
