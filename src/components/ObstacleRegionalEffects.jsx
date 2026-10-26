import React, { useEffect, useState } from 'react';

// Cosmetic lifetimes never dispatch combat actions or delay the next turn.
function useEffectLifetime(id) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 1700);
    return () => clearTimeout(timer);
  }, [id]);
  return visible;
}

export function FrostField({ contact }) {
  const visible = useEffectLifetime(contact.id);
  if (!visible) return null;
  return <div className="obstacle-frost" data-testid="obstacle-frost" aria-hidden="true">
    <div className="obstacle-frost-glaze" />
    <div className="obstacle-frost-mist" />
    <svg className="obstacle-frost-crystals" viewBox="0 0 1000 600" preserveAspectRatio="none">
      {[0, 1, 2, 3].map(edge => <g key={edge} transform={[
        '', 'translate(1000 600) rotate(180)', 'translate(0 600) rotate(-90) scale(.6 1)',
        'translate(1000 0) rotate(90) scale(.6 1)',
      ][edge]}>
        {Array.from({ length: 11 }, (_, i) => <g key={i} transform={`translate(${i * 100} 0)`}>
          <path d={`M-23 0 0 ${20 + i % 3 * 14} 21 0M-10 0 0 ${12 + i % 3 * 8} 9 0`}
            fill={i % 2 ? '#d5f5ff' : '#f1fdff'} fillOpacity=".5" stroke="#e7fbff" strokeWidth="1.4" />
          <path d="M0 0v29m-9-14 9 8 9-8m-6-6-3 4-4-4" fill="none" stroke="#eaffff" opacity=".6" />
        </g>)}
      </g>)}
      {Array.from({ length: 14 }, (_, i) => <path key={i} className="obstacle-frost-flake"
        d="M-5 0H5M0-5V5m-3-3 6 6m-6 0 6-6" fill="none" stroke="#edfdff" strokeWidth="1.4"
        transform={`translate(${45 + i * 71 % 910} ${90 + i * 97 % 430})`} />)}
    </svg>
  </div>;
}

export function CityGroundBursts({ contact, layout }) {
  const visible = useEffectLifetime(contact.id);
  if (!visible) return null;
  const nearest = layout.enemies.reduce((best, enemy) =>
    !best || Math.abs(enemy.x - contact.point.x) < Math.abs(best.x - contact.point.x) ? enemy : best, null);
  const direction = Math.sign((nearest?.x ?? contact.point.x + contact.direction) - contact.point.x) || contact.direction;
  const reach = Math.min(600, Math.max(320, Math.abs((nearest?.x ?? contact.point.x + 420) - contact.point.x)));
  return <g className="city-ground-chain" data-testid="city-ground-chain" aria-hidden="true">
    {Array.from({ length: 7 }, (_, i) => {
      const x = Math.max(45, Math.min(layout.width - 45, contact.point.x + direction * reach * i / 6));
      return <g key={i} className="city-ground-burst" data-ground-y={layout.groundY}
        transform={`translate(${x} ${layout.groundY})`} style={{ '--burst-delay': `${i * 110}ms` }}>
        <ellipse className="city-burst-shadow" cy="3" rx="37" ry="8" fill="#6f4237" />
        <g className="city-burst-plume">
          <path d="M-34-4q-19-18-2-30-8-22 14-27 6-27 25-17 24-12 29 14 24 7 12 27 17 18-8 33Z"
            fill="#ba785f" opacity=".55" />
          <path d="M-30-3q-17-17 2-29-4-19 14-20L0-74l16 22q22 0 16 21 22 17-1 28Z"
            fill="#ee9456" stroke="#d87b48" strokeWidth="2" />
          <path d="m-21-3 9-21 6 7L1-48l11 27 8-6 5 24Z" fill="#ffe1a1" />
          <path d="m-8-2 9-24L12-2Z" fill="#fff6d4" />
        </g>
        <ellipse className="city-burst-ring" cy="-2" rx="41" ry="10" fill="none" stroke="#ffdd9a" strokeWidth="4" />
        <g className="city-burst-embers" fill="#ffcd82">
          <path d="m-43-26 5-9 4 9-5 8Zm79-14 4-9 5 9-5 7Z" />
          <circle cx="-18" cy="-86" r="3" /><circle cx="31" cy="-76" r="2.5" />
        </g>
      </g>;
    })}
  </g>;
}
