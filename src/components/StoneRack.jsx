import React, { useEffect, useRef, useState } from 'react';
import { getCandyDetails } from '../game/candyPresentation.js';
import CandyProjectileArt from './CandyProjectileArt.jsx';

export default function StoneRack({ run, disabled, onLoadStone }) {
  const root = useRef(null);
  const [selectedId, select] = useState(run.currentWeaponId);
  const available = run.weapons.filter(stone => run.weaponQueue.includes(stone.instanceId));
  const selected = available.find(stone => stone.instanceId === selectedId) ?? available[0];
  const details = selected && getCandyDetails({ ...run, currentWeaponId: selected.instanceId });
  useEffect(() => {
    root.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected?.instanceId]);
  useEffect(() => {
    const onKey = event => {
      if (disabled || event.ctrlKey || event.altKey || event.metaKey || event.target?.isContentEditable
        || /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName)) return;
      if (event.target?.tagName === 'BUTTON' && !root.current?.contains(event.target)) return;
      const key = event.code;
      if (!['KeyA', 'KeyD', 'Space'].includes(key) || !selected) return;
      event.preventDefault();
      if (key === 'Space') {
        if (!event.repeat) onLoadStone(selected.instanceId);
      } else {
        const index = available.findIndex(stone => stone.instanceId === selected.instanceId);
        select(available[Math.max(0, Math.min(available.length - 1, index + (key === 'KeyA' ? -1 : 1)))].instanceId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, selected, available, onLoadStone]);
  return <aside ref={root} className="stone-rack" aria-label="스톤 보관함">
    <h2>스톤 보관함 <small>A 위 · D 아래</small></h2>
    <div className="stone-rack-list">
      {run.weapons.map(stone => <button key={stone.instanceId} type="button"
        data-stone-instance={stone.instanceId} aria-label={`${stone.name} ${stone.grade}등급${run.currentWeaponId === stone.instanceId ? ' 장전됨' : ''}`}
        aria-pressed={selected?.instanceId === stone.instanceId}
        disabled={disabled || !run.weaponQueue.includes(stone.instanceId)}
        onClick={() => select(stone.instanceId)}>
        <svg viewBox="-26 -26 52 52" aria-hidden="true"><CandyProjectileArt stoneId={stone.id} /></svg>
        <span>{stone.name}</span><strong>{stone.grade}</strong>
        {run.currentWeaponId === stone.instanceId && <i aria-hidden="true">●</i>}
      </button>)}
    </div>
    <details><summary>{selected ? `${selected.name} · ${selected.grade}` : '남은 스톤 없음'}</summary>
      <p>{details?.currentAbility}</p></details>
    <button type="button" className="stone-rack-load" disabled={disabled || !selected}
      onClick={() => selected && onLoadStone(selected.instanceId)}>장전 <kbd>Space</kbd></button>
    <p className="sr-only" role="status">{run.weapons.find(stone => stone.instanceId === run.currentWeaponId)?.name ?? '남은 스톤 없음'} 장전</p>
  </aside>;
}
