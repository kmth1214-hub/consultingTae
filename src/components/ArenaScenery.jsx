import React, { useEffect, useState } from 'react';

function LogStack() {
  return <>
    {[10, 46, 82, 118].map((y, index) => <g key={y} transform={`translate(${index % 2 ? 5 : 0} ${y})`}>
      <rect x="8" y="0" width="65" height="31" rx="10" fill={index % 2 ? '#a9673f' : '#b97947'} stroke="#593823" strokeWidth="3" />
      <path d="M26 5h36M27 24h30" stroke="#e0a563" strokeWidth="2.5" strokeLinecap="round" opacity=".85" />
      <path d="M38 12h23M31 20h18" stroke="#76452d" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="9" cy="15.5" rx="8" ry="14" fill="#edc183" stroke="#684125" strokeWidth="3" />
      <ellipse cx="9" cy="15.5" rx="4" ry="8" fill="none" stroke="#b17a49" strokeWidth="2" />
    </g>)}
    <path d="M13 149q24-5 49 0" fill="none" stroke="#f3d09a" strokeWidth="3" opacity=".8" />
  </>;
}

function IceStack() {
  return <>
    <path d="M9 153 4 116 19 104 40 113 70 101 77 123 70 157Z" fill="#71bfd5" stroke="#387caa" strokeWidth="3" />
    <path d="m7 111 10-47 21-12 20 13 10 48-30 16Z" fill="#b9ecf3" stroke="#579dbd" strokeWidth="3" />
    <path d="M17 64 26 13 42 3 58 20 64 64 37 78Z" fill="#e6fbf8" stroke="#73bcd2" strokeWidth="3" />
    <path d="m26 13 16-10-5 74-20-13m25-61 16 17-21 57m1-25 30 61-30 16m0-52L4 116" fill="none" stroke="#fff" strokeWidth="3" opacity=".85" />
    <path d="m43 79 15-13 9 40M24 119l12 9-5 24" fill="none" stroke="#4a9bbb" strokeWidth="3" opacity=".65" />
    <path d="M10 149q26 9 59 0" fill="none" stroke="#efffff" strokeWidth="4" opacity=".9" />
  </>;
}

function CityStack() {
  return <>
    {[102, 137].map((y, i) => <g key={y} transform={`translate(${i ? 5 : 0} ${y})`}>
      <rect x="7" y="0" width="68" height="31" rx="4" fill={i ? '#ae7654' : '#c18b5e'} stroke="#67443b" strokeWidth="3" />
      <path d="M10 2 72 28m0-26L10 28" stroke="#ebc692" strokeWidth="4" />
      <circle cx="16" cy="7" r="2" fill="#594139" /><circle cx="65" cy="23" r="2" fill="#594139" />
    </g>)}
    {[{x:15,y:52},{x:42,y:57},{x:28,y:11}].map(({ x, y }) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
      <path d="M2 6q-6 9 1 31 13 9 24 0 7-22 1-31Z" fill="#d79c70" stroke="#744944" strokeWidth="3" />
      <path d="M5 2h22v8H5Z" fill="#f5c89a" stroke="#744944" strokeWidth="2" />
      <path d="M7 21q8 6 17 0M8 30q8 5 16 0" fill="none" stroke="#fff0bf" strokeWidth="2" />
    </g>)}
  </>;
}

function StackBody({ kind, chaos }) {
  return <>
    {kind === 'log' ? <LogStack /> : kind === 'ice' ? <IceStack /> : <CityStack />}
    {chaos && <>
      <path d="M23 9 61 146M56 15 17 140" fill="none" stroke="#492d68" strokeWidth="6" opacity=".7" />
      <path d="M24 15 51 108M54 21 23 129" fill="none" stroke="#dc9aee" strokeWidth="2" opacity=".8" />
      <circle cx="39" cy="78" r="5" fill="#f6b8ff" opacity=".9" />
    </>}
  </>;
}

function Debris({ kind }) {
  return kind === 'ice' ? <>
    <path d="m3 156 12-22 18 21Zm22 0 15-30 15 30Zm31 0 10-22 12 22Z" fill="#a6e4f1" stroke="#5aa2c3" strokeWidth="3" />
    <path d="m18 143 4 9m20-18 2 15m22-11 5 14" stroke="#fff" strokeWidth="2" />
  </> : kind === 'crate' ? <>
    <path d="M2 145 24 139 37 155 5 158Zm38 10 15-22 21 9-4 16Z" fill="#bc8863" stroke="#674438" strokeWidth="3" />
    <path d="m15 139 3-16 8 4 7 22m22-17 4-13 10 4-1 17" fill="#e2ac83" stroke="#855347" strokeWidth="2" />
  </> : <>
    <rect x="3" y="139" width="49" height="18" rx="8" fill="#a66d42" stroke="#68412b" strokeWidth="3" />
    <rect x="34" y="132" width="42" height="20" rx="8" fill="#b97e4a" stroke="#68412b" strokeWidth="3" />
    <ellipse cx="8" cy="148" rx="5" ry="8" fill="#e9be80" stroke="#68412b" strokeWidth="2" />
  </>;
}

export default function ArenaScenery({ layout, area = layout.area,
  toppledObstacleIds = [], visualContacts = [] }) {
  const fallen = new Set(toppledObstacleIds);
  const active = new Map(visualContacts.map(contact => [contact.obstacleId, contact]));
  return <svg className="scene-scenery" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
    {layout.obstacles.map(prop => {
      const touching = active.get(prop.id);
      const state = fallen.has(prop.id) ? 'toppled' : touching ? 'falling' : 'standing';
      const direction = touching?.direction < 0 ? 'left' : 'right';
      return <g key={prop.id} data-obstacle-id={prop.id} data-obstacle-kind={prop.kind}
        data-stack-state={state} className={`stack stack--${prop.kind} stack--${state} stack--fall-${direction}`}
        transform={`translate(${prop.x} ${prop.y})`}>
        <ellipse cx={prop.width / 2} cy={prop.height - 4} rx={prop.width * .54} ry="9" fill="#2e281c" opacity=".25" />
        <g transform={`scale(${prop.width / 80} ${prop.height / 160})`}>
          <g className="stack-body"><StackBody kind={prop.kind} chaos={area === 'chaos'} /></g>
          <g className="stack-debris"><Debris kind={prop.kind} /></g>
        </g>
      </g>;
    })}
  </svg>;
}

// A cosmetic timer never resolves combat; the frozen contact point owns this effect.
export function ContactEffect({ impact, obstacles, effect }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 420);
    return () => clearTimeout(timer);
  }, [impact.id]);
  if (!visible || !Number.isFinite(impact.point?.x) || !Number.isFinite(impact.point?.y)) return null;
  const prop = obstacles.find(o => o.id === impact.obstacleId);
  const color = prop?.kind === 'ice' ? '#d9faff' : prop?.kind === 'crate' ? '#e9c88c' : '#f1d2a3';
  return <g data-testid="contact-effect" data-obstacle-impact={prop?.id} data-effect={effect?.kind || undefined}
    className={`contact-effect ${effect?.kind ? `contact-effect--${effect.kind}` : ''}`}
    transform={`translate(${impact.point.x} ${impact.point.y})`} style={{ '--contact-color': color }}>
    <circle className="contact-ring" r="17" fill="none" stroke={prop ? color : '#fff1bd'} strokeWidth="3" />
    {prop && Array.from({ length: 7 }, (_, i) => <g key={i} className="contact-particle" style={{ '--dx': `${Math.cos(i * 2.4) * (25 + i % 3 * 11)}px`, '--dy': `${-15 - i % 4 * 15}px` }}>
      {prop.kind === 'ice' ? <path d={`m${i % 3 * 5}-3 4-6 4 6-4 7Z`} fill={color} />
        : <circle cx={i % 3 * 4} cy="-2" r={2 + i % 3} fill={color} />}
    </g>)}
  </g>;
}
