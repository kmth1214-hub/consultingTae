import React from 'react';

const SETTINGS = {
  forest: { far: ['#e4f7d0', '#ffffff'], near: ['#e7fff1', '#a5e7dd'] },
  snow: { far: ['#ffffff', '#c7efff'], near: ['#effcff', '#bde8f5'] },
  city: { far: ['#ffe2b7', '#fff4df'], near: ['#ffdb9d', '#e8c6f1'] },
  chaos: { far: ['#f0d8ff', '#c6c6ff'], near: ['#d2b4ff', '#b7dfff'] }
};

export default function SceneAtmosphere({ area, band, active, reducedMotion }) {
  const colors = SETTINGS[area]?.[band];
  if (!colors) return null;
  const far = band === 'far';
  const count = area === 'snow' ? 14 : area === 'chaos' ? 10 : 8;
  return <g className={`scene-atmosphere scene-atmosphere--${area} scene-atmosphere--${band}${active ? ' is-active' : ''}`} aria-hidden="true">
    <path d={far ? 'M0 740Q900 710 1800 740T3600 735' : 'M0 1080Q900 1040 1800 1080T3600 1075'} fill="none" stroke={colors[0]} strokeWidth="16" opacity=".045" />
    {!reducedMotion && Array.from({ length: count }, (_, i) => {
      const x = (i * 431 + 123) % 3500 + 40;
      const y = far ? 112 + (i * 83) % 560 : 1040 + (i * 17) % 92;
      const r = area === 'snow' ? 3 + i % 3 : 2 + i % 3;
      return <circle key={i} className="scene-mote" cx={x} cy={y} r={r} fill={colors[i % 2]}
        opacity={area === 'snow' ? '.34' : '.24'} style={{ '--mote-delay': `${-(i % 7) * 1.3}s`, '--mote-distance': `${8 + i % 5 * 6}px` }} />;
    })}
    {area === 'forest' && <path className="scene-mist" d="M0 1070Q480 1030 900 1075T1800 1065T2700 1078T3600 1060" fill="none" stroke={colors[0]} strokeWidth="22" opacity=".12" />}
    {area === 'snow' && <path className="scene-mist" d="M0 1100Q700 1075 1400 1095T2800 1084T3600 1098" fill="none" stroke={colors[0]} strokeWidth="20" opacity=".1" />}
    {area === 'city' && <path className="scene-mist" d="M0 1070H3600" fill="none" stroke={colors[0]} strokeWidth="12" opacity=".08" />}
    {area === 'chaos' && <path className="scene-mist" d="M0 1080Q900 1050 1800 1082T3600 1070" fill="none" stroke={colors[0]} strokeWidth="18" opacity=".1" />}
  </g>;
}
