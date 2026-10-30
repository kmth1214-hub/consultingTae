import React from 'react';
import { BattleEngine } from '../game/battleEngine.js';

const LABELS = { star: '별', leaf: '잎', moon: '달', crown: '왕관',
  fireball: '불공', spear: '창', defense: '방어', heal: '회복' };
const GLYPHS = { star: '✦', leaf: '❧', moon: '☾', crown: '♛',
  fireball: '✹', spear: '➶', defense: '◆', heal: '♥' };

export default function SlotMachine({ kind, remaining, results, onSpin, disabled = false }) {
  const latest = results.at(-1);
  const prize = latest?.prizeId && (BattleEngine.WEAPON_CATALOG.find(item => item.id === latest.prizeId)
    || BattleEngine.CONSUMABLE_CATALOG.find(item => item.id === latest.prizeId));
  return <section className="slot-machine" aria-label={kind === 'stone' ? '스톤 슬롯' : '소모품 슬롯'}>
    <div className="slot-machine__head"><h2>{kind === 'stone' ? '스톤 슬롯' : '소모품 슬롯'}</h2>
      <span>남은 회전 {remaining}</span></div>
    <p className="muted">가로 또는 대각선으로 같은 그림 3개를 맞히세요.</p>
    <div className="slot-machine__grid" role="img" aria-label={latest ? latest.symbols.map(symbol => LABELS[symbol]).join(', ') : '아직 돌리지 않음'}>
      {(latest?.symbols || Array(9).fill('star')).map((symbol, index) => <span key={index}
        className={`slot-machine__cell ${latest?.winningLine?.includes(index) ? 'is-winning' : ''}`}
        title={LABELS[symbol]}>{GLYPHS[symbol]}</span>)}
    </div>
    {results.map((result, index) => <p key={index} className="slot-machine__result" role="status">
      {index + 1}회: {result.prizeId ? `${result.winningLine ? '당첨' : '기본 지급'} · ${index === results.length - 1 ? prize?.name :
        (BattleEngine.WEAPON_CATALOG.find(item => item.id === result.prizeId)?.name ||
          BattleEngine.CONSUMABLE_CATALOG.find(item => item.id === result.prizeId)?.name)}` : '빗나감 · 소모품 없음'}
    </p>)}
    {disabled && !latest ? <p className="muted">소모품이 모두 가득 차 슬롯을 건너뜁니다.</p> : null}
    <button className="secondary-button" disabled={disabled || remaining === 0} onClick={onSpin}>돌리기</button>
  </section>;
}
