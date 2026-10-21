import React, { useEffect, useId, useState } from 'react';

export default function ArenaScenery({ layout }) {
  const id = `props-${useId().replace(/:/g, '')}`;
  return <svg className="scene-scenery" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-log`} x2=".15" y2="1"><stop stopColor="#d5ad6c" /><stop offset=".42" stopColor="#a17848" /><stop offset="1" stopColor="#6b5035" /></linearGradient>
      <linearGradient id={`${id}-ice`} x2=".9" y2=".8"><stop stopColor="#f3ffff" /><stop offset=".45" stopColor="#b7e9f1" /><stop offset="1" stopColor="#559fc2" /></linearGradient>
      <linearGradient id={`${id}-crate`} x2=".8" y2="1"><stop stopColor="#d4b587" /><stop offset="1" stopColor="#916843" /></linearGradient>
    </defs>
    {layout.obstacles.map(prop => <g key={prop.id} data-obstacle-id={prop.id}>
      <defs><clipPath id={`${id}-${prop.id}`}><polygon points={prop.polygon.map(p => `${p.x},${p.y}`).join(' ')} /></clipPath></defs>
      <polygon points={prop.polygon.map(p => `${p.x},${p.y}`).join(' ')}
        fill={`url(#${id}-${prop.kind})`} stroke={{ log: '#725337', ice: '#5298b7', crate: '#795d45' }[prop.kind]}
        strokeWidth="3" strokeLinejoin="round" />
      <g clipPath={`url(#${id}-${prop.id})`}><g transform={`translate(${prop.x} ${prop.y})`}>
        {prop.kind === 'ice' ? <>
          <path d="m13 78 1-49L45 0 39 84M14 29 71 84M14 29 54 34" fill="#ddfbff65" stroke="#f4ffff" strokeWidth="2" />
          <path d="M23 36 30 20M24 47l-2 15M52 54l8 10M41 13l8 8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <path d="M0 81H72" stroke="#4488ae" strokeWidth="8" opacity=".4" />
        </> : prop.kind === 'log' ? <>
          <path d="m15 19 49-8m-48 18 45-7m-42 17 50-5m-47 14 44-5m-46 16 42-5m-41 11 47-6" stroke="#67432e" strokeWidth="2.5" opacity=".7" />
          <ellipse cx="8" cy="47" rx="12" ry="23" fill="#e2c68c" stroke="#795334" strokeWidth="3" />
          <ellipse cx="8" cy="47" rx="7" ry="17" fill="none" stroke="#b08b54" strokeWidth="2" />
          <path d="M8 38Q-1 47 9 55M26 31q13-9 22-5m-17 19q11-7 18-3" fill="none" stroke="#8c643c" strokeWidth="2" />
          <path d="m14 22 49-8" stroke="#dfbd7c" strokeWidth="3" />
        </> : <>
          <path d="M34 9 34 78M10 20v49M57 19v52" stroke="#7e593a" strokeWidth="2" />
          <path d="m4 17 62 47m-59 5L65 19" stroke="#765237" strokeWidth="10" />
          <path d="m4 16 62 47m-59 5L65 18" stroke="#d8b17a" strokeWidth="6" />
          {[[10, 22], [59, 59], [11, 62], [58, 23]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" fill="#5e4734" />)}
          <path d="M0 12 34 3 73 16" fill="none" stroke="#eed2a2" strokeWidth="3" />
        </>}
      </g></g>
    </g>)}
  </svg>;
}

// A cosmetic timer never resolves combat; the frozen contact point owns this effect.
export function ContactEffect({ impact, obstacles }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 420);
    return () => clearTimeout(timer);
  }, [impact.id]);
  if (!visible || !Number.isFinite(impact.point?.x) || !Number.isFinite(impact.point?.y)) return null;
  const prop = obstacles.find(o => o.id === impact.obstacleId);
  const color = prop?.kind === 'ice' ? '#d9faff' : prop?.kind === 'crate' ? '#e9c88c' : '#f1d2a3';
  return <g data-testid="contact-effect" data-obstacle-impact={prop?.id} className="contact-effect"
    transform={`translate(${impact.point.x} ${impact.point.y})`} style={{ '--contact-color': color }}>
    <circle className="contact-ring" r="17" fill="none" stroke={prop ? color : '#fff1bd'} strokeWidth="3" />
    {prop && Array.from({ length: 7 }, (_, i) => <g key={i} className="contact-particle" style={{ '--dx': `${Math.cos(i * 2.4) * (25 + i % 3 * 11)}px`, '--dy': `${-15 - i % 4 * 15}px` }}>
      {prop.kind === 'ice' ? <path d={`m${i % 3 * 5}-3 4-6 4 6-4 7Z`} fill={color} />
        : <circle cx={i % 3 * 4} cy="-2" r={2 + i % 3} fill={color} />}
    </g>)}
  </g>;
}
