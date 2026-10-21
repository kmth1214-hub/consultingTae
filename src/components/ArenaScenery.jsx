import React from 'react';

export default function ArenaScenery({ area }) {
  return <svg className="scene-scenery" viewBox="0 0 1200 800" aria-hidden="true">
    {area !== 'forest' && <g fill="none" strokeLinecap="round">
      <path d="M0 636Q270 584 540 629T1200 625" stroke={area === 'snow' ? '#82a9ba' : area === 'city' ? '#68595d' : '#8c7095'} strokeWidth="132" />
      <path d="M0 630Q270 578 540 623T1200 619" stroke={area === 'snow' ? '#e3f0f1' : area === 'city' ? '#ba9b8b' : '#c0a3b8'} strokeWidth="112" />
      <path d="M0 594Q270 542 540 587T1200 583" stroke="#ffffff35" strokeWidth="5" />
    </g>}
    {['forest', 'chaos'].includes(area) && <g transform="translate(505 537) rotate(-8)" stroke="#70503c" strokeWidth="3" strokeLinejoin="round">
      <path d="M0 12 66 3Q79 4 79 18L76 39 6 42Z" fill="#9f7954" /><ellipse cx="6" cy="27" rx="10" ry="16" fill="#d4b681" />
      <path d="M24 15 66 10M26 30 67 26" fill="none" stroke="#775139" /><path d="M27 4Q45-6 63 2" stroke="#789651" strokeWidth="7" />
    </g>}
    {['snow', 'chaos'].includes(area) && <g transform="translate(543 524)" stroke="#73b6ce" strokeWidth="2" strokeLinejoin="round">
      <path d="M0 52 10 12 25 30 38 0 55 52Z" fill="#bce5f0" /><path d="m15 41 5-15M38 37V12" stroke="#f2ffff" strokeWidth="3" />
    </g>}
    {['city', 'chaos'].includes(area) && <g transform="translate(510 532)" stroke="#7e5e4e" strokeWidth="3" strokeLinejoin="round">
      <path d="M0 12 26 0 56 12 30 24ZM0 12V44L30 58 56 44V12M30 24V58" fill="#bd9163" />
      <path d="m5 21 20 26m10-19 16 12" fill="none" />
    </g>}
    <g transform="translate(650 675)" fill={area === 'snow' ? '#daebef' : area === 'city' ? '#8e8381' : '#98a17c'} stroke="#5b6b5c" strokeWidth="2">
      <path d="M0 12 9 0 26 4 35 19 5 23Z" /><path d="m49 14 9-5 10 7-4 9H50Z" />
    </g>
  </svg>;
}
