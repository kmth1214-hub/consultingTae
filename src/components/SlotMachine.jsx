import React, { useEffect, useRef, useState } from 'react';
import { BattleEngine } from '../game/battleEngine.js';

const LABELS = { star: '별', leaf: '잎', moon: '달', crown: '왕관',
  fireball: '불공', spear: '창', defense: '방어', heal: '회복' };
const GLYPHS = { star: '✦', leaf: '❧', moon: '☾', crown: '♛',
  fireball: '✹', spear: '➶', defense: '◆', heal: '♥' };
const STONE_SYMBOLS = ['star', 'leaf', 'moon', 'crown'];
const CONSUMABLE_SYMBOLS = ['fireball', 'spear', 'defense', 'heal'];

function prizeName(prizeId) {
  return BattleEngine.WEAPON_CATALOG.find(item => item.id === prizeId)?.name
    || BattleEngine.CONSUMABLE_CATALOG.find(item => item.id === prizeId)?.name;
}

export default function SlotMachine({ kind, remaining, results, onSpin, disabled = false, onSpinningChange }) {
  const [phase, setPhase] = useState('idle');
  const [stoppedCount, setStoppedCount] = useState(0);
  const busyRef = useRef(false);
  const timersRef = useRef([]);
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const latest = results.at(-1);
  const previous = results.at(-2);
  const symbols = kind === 'stone' ? STONE_SYMBOLS : CONSUMABLE_SYMBOLS;
  const restingSymbols = (phase === 'idle' ? latest : previous)?.symbols ||
    Array.from({ length: 9 }, (_, index) => symbols[index % symbols.length]);
  const label = kind === 'stone' ? '스톤 슬롯' : '소모품 슬롯';
  const isSpinning = phase !== 'idle';

  function spin() {
    if (busyRef.current || disabled || remaining <= 0) return;
    busyRef.current = true;
    onSpinningChange?.(true);
    const event = onSpin();
    if (!event?.accepted) {
      busyRef.current = false;
      onSpinningChange?.(false);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      busyRef.current = false;
      onSpinningChange?.(false);
      return;
    }
    setPhase('pull');
    setStoppedCount(0);
    timersRef.current = [
      setTimeout(() => setPhase('rolling'), 300),
      setTimeout(() => setStoppedCount(1), 1500),
      setTimeout(() => setStoppedCount(2), 2000),
      setTimeout(() => {
        setStoppedCount(3);
        setPhase('idle');
        busyRef.current = false;
        onSpinningChange?.(false);
        timersRef.current = [];
      }, 2500)
    ];
  }

  const visibleResults = isSpinning ? results.slice(0, -1) : results;
  return <section className="slot-machine" aria-label={label} data-spin-phase={phase} data-stopped-reels={stoppedCount}>
    <div className="slot-machine__head"><h2>{label}</h2><span>남은 회전 {remaining}</span></div>
    <p className="slot-machine__hint">가로 또는 대각선으로 같은 그림 3개를 맞히세요.</p>
    <div className="slot-machine__cabinet">
      <div className="slot-machine__grid" role="img" aria-label={isSpinning ? '회전 중' :
        latest ? latest.symbols.map(symbol => LABELS[symbol]).join(', ') : '아직 돌리지 않음'}>
        {[0, 1, 2].map(column => {
          const rolling = phase === 'rolling' && column >= stoppedCount;
          const columnSymbols = phase !== 'idle' && column < stoppedCount && latest
            ? latest.symbols : restingSymbols;
          return <div key={column} className={`slot-machine__reel ${rolling ? 'is-rolling' : ''}`}
            data-reel={column + 1} data-reel-state={rolling ? 'rolling' : 'stopped'}>
            <div className="slot-machine__reel-window" aria-hidden="true">
              {rolling ? <div className="slot-machine__strip">{Array.from({ length: 12 }, (_, index) =>
                <span key={index} className="slot-machine__cell">{GLYPHS[symbols[index % symbols.length]]}</span>)}</div>
                : <div className="slot-machine__still">{[0, 1, 2].map(row => {
                  const index = row * 3 + column;
                  const symbol = columnSymbols[index];
                  return <span key={row} className={`slot-machine__cell ${!isSpinning && latest?.winningLine?.includes(index) ? 'is-winning' : ''}`}
                    title={LABELS[symbol]}>{GLYPHS[symbol]}</span>;
                })}</div>}
            </div>
          </div>;
        })}
      </div>
      <div className="slot-machine__handle">
        <button type="button" className={`slot-machine__lever ${isSpinning ? 'is-pulling' : ''}`}
          aria-label="돌리기" title="손잡이를 당겨 돌리기" disabled={disabled || remaining <= 0 || isSpinning} onClick={spin}>
          <span className="slot-machine__lever-arm" aria-hidden="true"><span className="slot-machine__lever-knob" />
            <span className="slot-machine__lever-shaft" /></span>
          <span className="slot-machine__lever-base" aria-hidden="true" />
        </button>
        <span className="slot-machine__handle-label" aria-hidden="true">당기기</span>
      </div>
    </div>
    {visibleResults.map((result, index) => <p key={index} className="slot-machine__result" role="status">
      {index + 1}회: {result.prizeId ? `${result.winningLine ? '당첨' : '기본 지급'} · ${prizeName(result.prizeId)}`
        : '빗나감 · 소모품 없음'}
    </p>)}
    {isSpinning ? <p className="slot-machine__spinning" role="status">릴이 돌아가고 있어요…</p> : null}
    {disabled && !latest && !isSpinning && remaining === 0 ? <p className="muted">소모품이 모두 가득 차 슬롯을 건너뜁니다.</p> : null}
  </section>;
}
