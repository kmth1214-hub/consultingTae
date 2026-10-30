import React from 'react';
import { CHARACTERS } from '../game/gameData.js';
import { ASSETS } from '../game/assetCatalog.js';
import AssetImage from './AssetImage.jsx';

export default function CharacterSelect({ session }) {
  return <section className="screen-shell" aria-labelledby="characters-title">
    <p className="eyebrow">원정 준비</p><h1 id="characters-title">함께 떠날 쿠키</h1>
    <p className="screen-intro">쿠키를 고르면 전용 스톤 1개와 기본 스톤 2개로 숲에서 시작합니다. 전용 능력은 해당 스톤을 던질 때 발동합니다.</p>
    <div className="character-grid">{CHARACTERS.map(character => {
      const locked = character.locked && !session.profile.snowAreaCleared;
      return <button className={`character-card ${locked ? 'is-locked' : ''}`} key={character.id}
        disabled={locked} onClick={() => session.startRun(character.id)}>
        <AssetImage src={ASSETS.characters[character.asset]} className="character-art" />
        <span className="character-name">{character.name}</span><span className="card-description">{character.note}</span>
        <span className="card-action">{locked ? '눈 지역 클리어 후 해금' : '이 쿠키로 출발 →'}</span>
      </button>;
    })}</div>
    {!session.profile.snowAreaCleared && <p className="muted">눈 지역을 클리어하면 우유맛·바람궁수 쿠키가 해금돼요. 슬롯 당첨에는 해금된 쿠키 중 하나의 전용 스톤이 나옵니다.</p>}
    <p className="muted footnote">해금 기록은 {import.meta.env.VITE_REQUIRE_ACCOUNT_PROFILE === 'true' ? '회사 계정' : '현재 브라우저'}에 저장됩니다. 진행 중인 전투는 새로고침하면 초기화돼요.</p>
  </section>;
}
