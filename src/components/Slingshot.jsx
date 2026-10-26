import React, { useEffect, useId, useState } from 'react';
import { BATTLEFIELD, getDragDraw } from '../game/battlefieldModel.js';
import CandyProjectileArt from './CandyProjectileArt.jsx';

export default function Slingshot({ aim, run, launcherRef, layout }) {
  const id = `sling-${useId().replace(/:/g, '')}`;
  const active = !['idle', 'launching'].includes(aim.phase);
  const launching = aim.phase === 'launching';
  const { pouch: drawn, left, right } = getDragDraw(aim, active);
  const tension = aim.powerRatio;
  const release = getDragDraw(aim, true).pouch;
  const [recoil, setRecoil] = useState({ id: null, fraction: 1 });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (!launching || reduced) return;
    let frame, canceled = false;
    const started = performance.now();
    const tick = time => {
      if (canceled) return;
      const t = Math.min(1, (time - started) / 200);
      const fraction = 1 - (1 - t) ** 3 + Math.sin(t * Math.PI * 3) * (1 - t) * .12;
      setRecoil({ id: aim.launchId, fraction });
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { canceled = true; cancelAnimationFrame(frame); };
  }, [launching, aim.launchId, reduced]);
  const fraction = reduced ? 1 : recoil.id === aim.launchId ? recoil.fraction : 0;
  const pouch = launching ? { x: release.x + (64 - release.x) * fraction,
    y: release.y + (54 - release.y) * fraction } : drawn;
  const bow = active ? { x: -aim.direction.x * tension * 3, y: -aim.direction.y * tension * 2 } : { x: 0, y: 0 };
  const frame = `M44 127 Q${49 + bow.x} 103 ${61 + bow.x} ${65 + bow.y} Q${65 + bow.x} ${55 + bow.y} 48 41 L${left.x} ${left.y} M${61 + bow.x} ${65 + bow.y} Q${74 + bow.x} 43 ${right.x} ${right.y}`;
  const bands = `M${left.x} ${left.y} L${pouch.x} ${pouch.y} L${right.x} ${right.y}`;
  const overdraw = tension > BATTLEFIELD.powerBoostStart;
  const strength = overdraw ? '한계까지 당김' : tension < .35 ? '약하게 당김' : tension < .7 ? '보통으로 당김' : '강하게 당김';
  return <div className={`launcher ${active ? 'is-aiming' : ''} ${active && tension >= .68 ? 'is-primed' : ''} ${active && overdraw ? 'is-overdrawn' : ''} ${run.fireballArmed ? 'is-fireball' : ''}`}
    style={{ left: layout.launcher.x, top: layout.launcher.y, width: layout.launcher.width, height: layout.launcher.height,
      '--sling-tension': tension, '--sling-color': run.fireballArmed ? '#ff9c53' : '#ffe5a0' }}>
    <button ref={launcherRef} className={`launcher-button ${active ? 'is-drawn' : ''} ${launching ? 'is-releasing' : ''}`}
      aria-label="새총 잡기" aria-describedby="aim-instructions" disabled={launching}>
      <svg viewBox="0 0 124 142" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="1" y2=".5">
            <stop stopColor="#643a24" /><stop offset=".42" stopColor="#c88849" /><stop offset=".62" stopColor="#edb96c" /><stop offset="1" stopColor="#86502c" />
          </linearGradient>
          <linearGradient id={`${id}-brass`} x1="0" y1="0" x2=".8" y2="1">
            <stop stopColor="#fff1bb" /><stop offset=".35" stopColor="#e8bd65" /><stop offset=".65" stopColor="#ae7335" /><stop offset="1" stopColor="#f2d58a" />
          </linearGradient>
          <linearGradient id={`${id}-leather`} x2="1" y2=".4">
            <stop stopColor="#5a3027" /><stop offset=".5" stopColor="#a25c40" /><stop offset="1" stopColor="#653523" />
          </linearGradient>
          <radialGradient id={`${id}-aura`}>
            <stop stopColor={run.fireballArmed ? '#ffc576' : '#fff1b1'} stopOpacity=".65" />
            <stop offset="1" stopColor={run.fireballArmed ? '#ff6d36' : '#ffe5a0'} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="54" cy="138" rx="32" ry="5" fill="#362e2342" />
        {active && <g className="sling-charge" transform={`translate(${pouch.x} ${pouch.y})`}>
          <circle r={25 + tension * 18} fill={`url(#${id}-aura)`} />
          <ellipse className="sling-charge-orbit" rx={19 + tension * 10} ry={12 + tension * 5}
            transform="rotate(-35)" fill="none" stroke="var(--sling-color)" strokeWidth="1.2" strokeDasharray="3 7" />
          <g className="sling-charge-sparks" fill="var(--sling-color)">
            <path d="M-24-16v8m-4-4h8" stroke="var(--sling-color)" strokeWidth="1.5" />
            <circle cx="21" cy="-17" r="2" /><circle cx="-17" cy="21" r="1.6" />
            <path d="m26 12 3 4-3 4-3-4Z" /><circle cx="0" cy="-29" r="1.5" />
          </g>
        </g>}
        <path d={bands} fill="none" stroke="#4d3229" strokeWidth="7" strokeLinecap="round" />
        <path className="slingshot-band" data-testid="sling-band" d={bands}
          fill="none" stroke={active ? '#ffe3a1' : '#cfa16a'} strokeWidth={4.5 - tension} strokeLinecap="round" />
        <g className="slingshot-frame" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={frame} stroke="#482c21" strokeWidth="23" />
          <path d={frame} stroke={`url(#${id}-wood)`} strokeWidth="17" />
          <path d={`M40 120Q47 94 57 68Q60 57 44 43L${left.x - 2} ${left.y + 2} M66 57Q79 39 ${right.x - 2} ${right.y + 1}`}
            stroke="#ffe3a0" strokeOpacity=".55" strokeWidth="2.5" />
          <path d="M53 69q4 6-1 13M75 44q8-3 10-10M43 45l-4-6" stroke="#6b3e29" strokeWidth="1.4" />
        </g>
        <path d="M51 80 66 85 53 123Q48 132 37 124Z" fill={`url(#${id}-leather)`} stroke="#4e3025" strokeWidth="2" />
        <path d="m49 88 14 5m-17 4 14 5m-17 4 14 5m-17 4 13 5" stroke="#d49865" strokeWidth="3" strokeLinecap="round" />
        <path d="m52 87-11 34" stroke="#ebba84" strokeWidth="1" strokeDasharray="1 4" />
        <path d="m37 120 18 6-3 7q-9 4-18-5Z" fill={`url(#${id}-brass)`} stroke="#604129" strokeWidth="2" />
        {[left, right].map((anchor, i) => <g key={i} transform={`translate(${anchor.x} ${anchor.y}) rotate(${i ? 30 : -30})`}>
          <rect x="-10" y="-10" width="20" height="19" rx="5" fill={`url(#${id}-brass)`} stroke="#67432a" strokeWidth="2" />
          <path d="M-6-4H6M-6 4H6" stroke="#fff0b9" strokeWidth="1.5" />
          <circle r="3" fill="#794d30" /><circle cx="-.7" cy="-.8" r="1.3" fill="#fff0ba" />
        </g>)}
        <g transform={`translate(${bow.x} ${bow.y})`}>
        <path d="m61 49 12 13-12 14-12-14Z" fill={`url(#${id}-brass)`} stroke="#6f4b2f" strokeWidth="1.7" />
        <path className="sling-rune" d="m61 54 7 8-7 9-7-9Z" fill={run.fireballArmed ? '#fa9852' : '#8ad9be'} stroke="#305c4b" strokeWidth="1.5" />
        <path d="m58 61 3-4 3 4-3 5Z" fill="#edfff1" opacity=".85" />
        </g>
        <path d={`M${left.x} ${left.y + 2} L${pouch.x} ${pouch.y + 3}`} fill="none" stroke="#59382b" strokeWidth="6" strokeLinecap="round" />
        <path d={`M${left.x} ${left.y + 1} L${pouch.x} ${pouch.y + 2}`} fill="none" stroke="#f3cf88" strokeWidth={3.5 - tension} strokeLinecap="round" />
        <g className="slingshot-pouch" transform={`translate(${pouch.x} ${pouch.y})`}>
          <ellipse rx="14" ry="11" fill={`url(#${id}-leather)`} stroke="#4e3026" strokeWidth="2" />
          {!launching && <g className="sling-loaded-candy" data-testid="loaded-candy"
            transform={`rotate(${Math.atan2(aim.direction.y, aim.direction.x) * 180 / Math.PI})`}>
            <CandyProjectileArt variant={run.spearArmed ? 'spear' : run.fireballArmed ? 'fireball' : 'normal'} />
          </g>}
          <path d="M-14 2Q0 10 14 2L12 11Q0 18-12 11Z" fill={`url(#${id}-leather)`} stroke="#4e3026" strokeWidth="1.5" />
          <path d="M-10 7Q0 14 10 7" fill="none" stroke="#e2ad76" strokeWidth="1" strokeDasharray="2 2" />
        </g>
        {launching && <g className="sling-release" transform={`translate(${release.x} ${release.y})`}>
          <ellipse className="sling-release-ring" rx="16" ry="11" fill="none" stroke="var(--sling-color)" strokeWidth="3" />
          <path className="sling-release-rays" d="M-29-7-18-4M-21-26-13-16M2-34 1-22M24-25 16-17M33 0H22M22 25 15 17M-6 30-4 20"
            fill="none" stroke="var(--sling-color)" strokeWidth="2.5" strokeLinecap="round" />
        </g>}
      </svg>
      <span>{aim.phase === 'launching' ? '발사!' : active ? '당기는 중' : '잡아당기기'}</span>
    </button>
    <div className="power-meter" role="img" aria-label={`새총의 힘: ${strength}`}
      style={{ '--boost-zone': `${(1 - BATTLEFIELD.powerBoostStart) * 100}%` }}>
      <span className="power-meter-boost" />
      <span className="power-meter-fill" style={{ height: `${aim.powerRatio * 100}%` }} />
      <span className="power-meter-mark" />
    </div>
  </div>;
}
