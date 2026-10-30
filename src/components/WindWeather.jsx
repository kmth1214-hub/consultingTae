import React from 'react';
import { useSceneActivity } from '../game/useSceneActivity.js';

export default function WindWeather({ area, field, paused = false }) {
  const { active, reducedMotion } = useSceneActivity({ paused });
  const symbol = { forest: '❧', snow: '❄', city: '〰', chaos: '♦' }[area];
  return <svg className={`wind-weather wind-weather--${area}${active ? ' is-active' : ''}`}
    viewBox="0 0 3600 1200" aria-hidden="true" data-weather-area={area}
    data-wind-direction={field.direction > 0 ? 'right' : 'left'}>
    {field.zones.map((zone, index) => <g key={zone.id} data-wind-zone={zone.id}>
      <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx="90"
        className="wind-weather__zone" />
      <path d={`M${zone.x + 60} ${zone.y + 78}h${field.direction * 130}`}
        className="wind-weather__arrow" markerEnd={undefined} />
      <text x={zone.x + 75} y={zone.y + 74} className="wind-weather__direction">
        {field.direction > 0 ? '→' : '←'}
      </text>
      {!reducedMotion && Array.from({ length: 9 }, (_, i) => <text key={i}
        x={zone.x + 65 + (i * 91) % (zone.width - 130)}
        y={zone.y + 125 + (i * 73) % (zone.height - 180)}
        className="wind-weather__particle"
        style={{ '--wind-delay': `${-(i + index * 3) * .43}s`, '--wind-shift': `${field.direction * 70}px` }}>
        {area === 'chaos' ? (i % 3 === 0 ? '❄' : i % 3 === 1 ? '❧' : '╱') : symbol}
      </text>)}
    </g>)}
  </svg>;
}
