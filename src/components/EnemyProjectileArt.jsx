import React from 'react';

// Shared by the held ammunition and the released projectile, in world SVG units.
export default function EnemyProjectileArt({ ammo }) {
  if (ammo === 'ice') return <>
    <path d="M30 0 0-17-23-3-16 13 3 17Z" fill="#b8ecff" stroke="#4388ab" strokeWidth="2.5" />
    <path d="m-19-2 22 3L0-15M3 1l24-1M3 1l-1 14" fill="none" stroke="#f4ffff" strokeWidth="2.5" />
  </>;
  if (ammo === 'energy') return <>
    <circle r="24" fill="#f8b35b26" stroke="#ffdc8d" strokeWidth="2" />
    <circle r="15" fill="#ffd17b" stroke="#b47542" strokeWidth="2.5" />
    <path d="m2-13-9 15h8l-3 11L10-3H2Z" fill="#fff8dc" stroke="none" />
  </>;
  if (ammo === 'jelly') return <>
    <path d="M-21 3q0-22 20-22 22 3 24 22-5 19-24 16-22 3-20-16Z" fill="#a6df70" stroke="#577d49" strokeWidth="2.5" />
    <path d="M-13-5q1-8 9-8" fill="none" stroke="#f0ffd5" strokeWidth="4" strokeLinecap="round" />
    <circle cx="6" cy="6" r="3" fill="#73ba62" stroke="none" />
  </>;
  return <>
    <path d="M-20 2-17-12-6-19 8-18 20-7 19 9 6 19-9 17Z" fill="#effcff" stroke="#85b5cb" strokeWidth="2.5" />
    <path d="m-12-8 5-4M0 11l9-3" fill="none" stroke="#c3e5ef" strokeWidth="3" strokeLinecap="round" />
    <circle cx="-2" cy="-7" r="4" fill="#fff" stroke="none" />
  </>;
}
