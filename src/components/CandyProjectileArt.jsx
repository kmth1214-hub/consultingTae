import React, { useId } from 'react';

/** Same candy core and modifier silhouette in the pouch and along its flight. */
export default function CandyProjectileArt({ variant = 'normal' }) {
  const id = `candy-core-${useId().replace(/:/g, '')}`;
  const fiery = variant === 'fireball', spear = variant === 'spear';
  return <g data-candy-variant={variant}>
    <defs><radialGradient id={id} cx=".3" cy=".25" r=".8">
      <stop stopColor="#fffde9" /><stop offset=".4" stopColor={fiery ? '#ffcc57' : spear ? '#a9f4f1' : '#f8d485'} />
      <stop offset="1" stopColor={fiery ? '#ec4d24' : spear ? '#328ca6' : '#c7833c'} />
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
    <circle r="10" fill={`url(#${id})`} stroke={fiery ? '#bf5126' : spear ? '#39718c' : '#9b6936'} strokeWidth="1.5" />
    <path d="M-5-2Q0-8 5-2T-3 4" fill="none" stroke="#fff9df" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="-3" cy="-4" r="2" fill="#fffde9" />
  </g>;
}
