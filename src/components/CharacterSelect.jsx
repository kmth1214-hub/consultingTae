import React from 'react';
import { CHARACTERS } from '../game/gameData.js';
import { ASSETS } from '../game/assetCatalog.js';
import AssetImage from './AssetImage.jsx';

export default function CharacterSelect({ session }) {
  return <section className="screen-shell" aria-labelledby="characters-title">
    <p className="eyebrow">원정 준비</p><h1 id="characters-title">함께 떠날 쿠키</h1>
    <p className="screen-intro">쿠키를 고르면 숲에서 모험이 시작돼요. 마법사탕의 능력은 보유하는 동안 함께 적용됩니다.</p>
    <div className="character-grid">{CHARACTERS.map(character => {
      const locked = character.locked && !session.profile.snowAreaCleared;
      return <button className={`character-card ${locked ? 'is-locked' : ''}`} key={character.id}
        disabled={locked} onClick={() => session.startRun(character.id)}>
        <AssetImage src={ASSETS.characters[character.asset]} className="character-art" />
        <span className="character-name">{character.name}</span><span className="card-description">{character.note}</span>
        <span className="card-action">{locked ? '눈 지역 클리어 후 해금' : '이 쿠키로 출발 →'}</span>
      </button>;
    })}</div>
    <p className="muted footnote">해금 기록은 현재 브라우저에 저장됩니다. 진행 중인 전투는 새로고침하면 초기화돼요.</p>
  </section>;
}
