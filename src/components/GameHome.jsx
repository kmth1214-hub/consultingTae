import React from 'react';
import { ASSETS } from '../game/assetCatalog.js';
import AssetImage from './AssetImage.jsx';

export default function GameHome({ session }) {
  return <div className="game-shell home-shell">
    <header className="game-header"><span className="brand-mark" aria-hidden="true">✦</span> 오븐 원정 <span className="brand-subtitle">쿠키 대작전</span></header>
    <section className="adventure-hero" aria-labelledby="game-title">
      <AssetImage className="hero-landscape" src={ASSETS.forestLayers.distant} />
      <div className="hero-copy">
        <p className="eyebrow">작은 사탕, 커다란 모험</p>
        <h1 id="game-title">오븐 밖으로<br />더 멀리.</h1>
        <p className="hero-description">새총을 당기고, 나만의 한 발을 날려보세요.<br />숲에서 설원, 도시까지 쿠키와 함께 떠나는 원정.</p>
        <button className="start-button" onClick={session.startCharacterSelect}>모험 시작 <span aria-hidden="true">→</span></button>
        <p className="game-status">한 라운드에 사탕 9개. 조준과 보상 선택이 여정을 바꿔요.</p>
      </div>
      <AssetImage className="hero-cookie" src={ASSETS.characters.adventurer} />
    </section>
    <div className="home-leaderboard-entry">
      <button className="secondary-button" onClick={session.openLeaderboard}>리더보드 보기</button>
    </div>
    <p className="game-footer">한 발씩, 더 멀리.</p>
  </div>;
}
