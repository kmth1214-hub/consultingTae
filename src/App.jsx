import React from 'react';
import { ASSETS } from './game/assetCatalog.js';
import { BattleEngine } from './game/battleEngine.js';

const REGIONS = Object.freeze({
  forest: { name: '숲', description: '초록빛 길에서 시작하는 첫 모험' },
  snow: { name: '눈길', description: '차가운 숨결 너머 기다리는 친구들' },
  city: { name: '도시', description: '오븐을 향해 날리는 마지막 한 발' }
});

export default function App() {
  return (
    <div className="game-shell">
      <a className="skip-link" href="#main">본문으로 이동</a>
      <header className="game-header">
        <span className="brand-mark" aria-hidden="true">✦</span>
        <span>오븐 탈출 <span className="brand-subtitle">쿠키 대작전</span></span>
        <span className="header-tag">새총으로 떠나는 모험</span>
      </header>

      <main id="main">
        <section className="adventure-hero" aria-labelledby="game-title">
          <img className="hero-landscape" src={ASSETS.maps.forest} alt="" />
          <div className="hero-copy">
            <p className="eyebrow">작은 사탕, 커다란 모험</p>
            <h1 id="game-title">오븐 밖으로,<br />더 멀리!</h1>
            <p className="hero-description">새총을 당기고 사탕을 날려보세요.<br />숲과 눈길을 지나 도시까지, 쿠키들의 탈출이 시작됩니다.</p>
            <button className="start-button" type="button" disabled aria-describedby="game-status">모험 준비 중 <span aria-hidden="true">→</span></button>
            <p className="game-status" id="game-status" role="status">곧 쿠키를 선택하고 모험을 시작할 수 있어요.</p>
          </div>
          <img className="hero-cookie" src={ASSETS.characters.adventurer} alt="" />
        </section>

        <section className="journey" aria-labelledby="journey-title">
          <div className="journey-heading">
            <h2 id="journey-title">세 지역을 향한 여정</h2>
            <p>각도를 맞추고, 힘을 모으고, 한 발에 집중하세요.</p>
          </div>
          <ol className="region-list">
            {BattleEngine.AREAS.filter((area) => REGIONS[area]).map((area, index) => (
              <li className="region-card" key={area}>
                <img src={ASSETS.maps[area]} alt="" />
                <div className="region-copy">
                  <span className="region-number" aria-hidden="true">0{index + 1}</span>
                  <div><h3>{REGIONS[area].name}</h3><p>{REGIONS[area].description}</p></div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="game-footer">한 발씩, 더 멀리.</footer>
    </div>
  );
}
