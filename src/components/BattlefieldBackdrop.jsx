import React from 'react';

const PALETTES = {
  forest: ['#a6e0d5', '#739e9a', '#89b895', '#638b66', '#d5a27c'],
  snow: ['#ceeaf3', '#90b2c7', '#d6ebed', '#91bac7', '#ecf4f1'],
  city: ['#c6d4dc', '#9698aa', '#a3a19a', '#746f79', '#bc9f8c'],
  chaos: ['#bdb1d9', '#8983af', '#a59cbd', '#756683', '#c5a7bb'],
};

// Functional continuous world surface; illustrated regional detail follows in T03.
export default function BattlefieldBackdrop({ area, layout }) {
  const [sky, far, ground, edge, path] = PALETTES[area];
  return <svg className="battlefield-backdrop" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
    <rect x="-5000" y="-5000" width="13600" height="5900" fill={sky} />
    <path d="M-500 740 100 470 540 720 1100 420 1530 700 2100 480 2600 730 3100 450 4100 740V1200H-500Z" fill={far} />
    <path d="M-500 840Q200 680 800 820T1900 800T3000 810T4100 800V1200H-500Z" fill={edge} />
    <rect x="-5000" y="900" width="13600" height="5000" fill={ground} />
    <path d="M0 900H3600" stroke={edge} strokeWidth="138" />
    <path d="M0 900H3600" stroke={path} strokeWidth="110" />
    <path d="M0 853H3600" stroke="#ffffff30" strokeWidth="4" />
  </svg>;
}
