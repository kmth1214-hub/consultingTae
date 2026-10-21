import React from 'react';

export default function FusionChoice({ fusion, onChoose }) {
  if (!fusion) return null;
  return <section className="fusion-choice" aria-labelledby="fusion-title" aria-live="polite">
    <h2 id="fusion-title">같은 등급의 사탕을 발견했어요</h2>
    <p>{fusion.name} · {fusion.grade} + {fusion.grade} → {fusion.targetGrade}</p>
    <p className="muted">합성하면 기존 사탕의 등급이 오릅니다. 따로 보유하면 발사 순서에 사탕이 하나 더 추가돼요.</p>
    <div className="button-row"><button className="primary-button" onClick={() => onChoose(true)}>{fusion.targetGrade} 등급으로 합성</button>
      <button className="secondary-button" onClick={() => onChoose(false)}>따로 보유</button></div>
  </section>;
}
