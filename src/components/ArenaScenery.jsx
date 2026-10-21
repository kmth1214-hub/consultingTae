import React from 'react';

export default function ArenaScenery({ layout }) {
  return <svg className="scene-scenery" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
    {layout.obstacles.map(prop => <g key={prop.id} data-obstacle-id={prop.id}>
      <polygon points={prop.polygon.map(p => `${p.x},${p.y}`).join(' ')}
        fill={{ log: '#ad8051', ice: '#bce9f2', crate: '#be986b' }[prop.kind]}
        stroke={{ log: '#725337', ice: '#5298b7', crate: '#795d45' }[prop.kind]} strokeWidth="3" strokeLinejoin="round" />
      {prop.kind === 'ice' ? <path d={`M${prop.x + 14} ${prop.y + 65}l12-37 17-10m-17 10 24 36`}
        fill="none" stroke="#efffff" strokeWidth="3" />
        : prop.kind === 'log' ? <path d={`M${prop.x + 13} ${prop.y + 30}l43-4m-42 20 42-5m-47-11q-12 12 0 25`}
          fill="none" stroke="#705138" strokeWidth="3" />
          : <path d={`M${prop.x + 8} ${prop.y + 20}l54 42m-54 0 54-42m-27-8v60`}
            fill="none" stroke="#806043" strokeWidth="3" />}
    </g>)}
  </svg>;
}
