import React, { useId } from 'react';

const SIGNATURE_ART = {
  'ginger-dash-stone': { palette: ['#fff9bd', '#f8ac54', '#a94235'], glyph: 'M-6-4-1 0-6 4M0-5 6 0 0 5' },
  'strawberry-lollipop-stone': { palette: ['#fff7e8', '#ee8fae', '#9f3468'], glyph: 'M-6 1a6 6 0 1 1 2 5m-2-5a3.5 3.5 0 1 1 4 3q-3-1-.3-2' },
  'chili-slash-stone': { palette: ['#ffefc0', '#e87144', '#8b2833'], glyph: 'M-7 4 6-5-1 4-5 6Z' },
  'sea-wave-stone': { palette: ['#ddfffa', '#60d3d5', '#1c618e'], glyph: 'M-7 3Q-2-8 6-4 1-3 3 0T7 4' },
  'frost-stone': { palette: ['#f1feff', '#88cee9', '#645ba8'], glyph: 'M0-7V7M-6-3 6 3M-6 3 6-3' },
  'cherry-bomb-stone': { palette: ['#fff4df', '#ed6d75', '#8f254d'], glyph: 'M-5 1a3 3 0 1 0 5 2m0-1a3 3 0 1 0 6 0m-8 0Q1-3 4-7L3 2' },
  'espresso-vortex-stone': { palette: ['#ffe5bd', '#b97967', '#4c3045'], glyph: 'M7-1c0-9-15-8-14 1s14 9 13 2-9-5-7 0l2 1' }
};

/** Same candy core and modifier silhouette in the pouch and along its flight. */
export default function CandyProjectileArt({ variant = 'normal', stoneId = 'basic-stone' }) {
  const id = `candy-core-${useId().replace(/:/g, '')}`;
  const fiery = variant === 'fireball', spear = variant === 'spear';
  const art = SIGNATURE_ART[stoneId];
  const palette = art?.palette ?? ({
    'basic-stone': ['#f4f2df', '#9a9f9c', '#525e61'],
    'adventurer-candy': ['#fff7d7', '#f8d485', '#c7833c'],
    'alchemist-candy': ['#eaffd2', '#a6dc6c', '#418a65'],
    'wizard-orb': ['#f8e8ff', '#b7a0f4', '#5d55af'],
    'milk-candy': ['#f4ffff', '#b5e8ef', '#5e9ebc'],
    'wind-candy': ['#e7fff1', '#9ce4c1', '#3b9a82']
  }[stoneId] || ['#f4f2df', '#9a9f9c', '#525e61']);
  return <g data-candy-variant={variant} data-stone-id={stoneId}>
    <defs><radialGradient id={id} cx=".3" cy=".25" r=".8">
      <stop stopColor={palette[0]} /><stop offset=".4" stopColor={fiery ? '#ffcc57' : spear ? '#a9f4f1' : palette[1]} />
      <stop offset="1" stopColor={fiery ? '#ec4d24' : spear ? '#328ca6' : palette[2]} />
    </radialGradient></defs>
    {fiery && <g stroke="#ee7230" strokeWidth="1.2">
      <path d="M11 1Q13-16-2-14L-10-23-9-10-29-15-17-3-31 5-14 7-13 18-3 12Q10 17 11 1Z" fill="#ff8e32" />
      <path d="M3-8-10-15-7-5-20-4-10 2-14 10-2 8Z" fill="#ffe78b" />
    </g>}
    {spear && <g strokeLinejoin="round">
      <path d="M-25 0H16" stroke="#31596e" strokeWidth="5" /><path d="M-24-1H15" stroke="#8ed9df" strokeWidth="2" />
      <path d="m14-8 15 8-15 8 3-8Z" fill="#dcf9ff" stroke="#497b9c" strokeWidth="1.5" />
      <path d="M-24 0-30-7-18-5-15 0-18 5-30 7Z" fill="#64cbd4" stroke="#39718c" strokeWidth="1" />
    </g>}
    <circle r="16" fill={fiery ? '#ffae3b32' : spear ? '#b0faff2e' : '#fff6b526'} />
    <circle r="10" fill={`url(#${id})`} stroke={fiery ? '#bf5126' : spear ? '#39718c' : palette[2]} strokeWidth="1.5" />
    {stoneId === 'basic-stone' && !fiery && !spear
      ? <path d="M-4 3 1 1 4 5" fill="none" stroke="#d7dfda" strokeWidth="1.2" />
      : <path d={art?.glyph ?? (stoneId === 'wizard-orb' ? 'M0-7 2-2 7 0 2 2 0 7-2 2-7 0-2-2Z'
        : stoneId === 'alchemist-candy' ? 'M-2-6H2M-1-6v4l-4 6q0 3 5 3t5-3L1-2v-4'
        : stoneId === 'milk-candy' ? 'M0-7 6-4 5 3 0 7-5 3-6-4Z'
        : stoneId === 'wind-candy' ? 'M-6 4Q3-9 7-5Q4 5-6 4Z'
        : 'M-5-2Q0-8 5-2T-3 4')} fill="none" stroke="#fff9df" strokeWidth="2" strokeLinecap="round" />}
    <circle cx="-3" cy="-4" r="2" fill="#fffde9" />
  </g>;
}
