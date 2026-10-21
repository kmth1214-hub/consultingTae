import React, { useEffect, useId, useRef } from 'react';
import { pointAtDistance } from '../game/trajectory.js';

export default function ProjectileFlight({ flight, onComplete }) {
  const id = `candy-${useId().replace(/:/g, '')}`;
  const candyRef = useRef(null);
  const trailRef = useRef(null), trailGlowRef = useRef(null), gradientRef = useRef(null);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    let frame = null;
    let canceled = false;
    let done = false;
    const started = performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 80
      : Math.min(1150, 650 + (flight.impactDistance || 0) * .3);
    function tick(time) {
      if (canceled || done) return;
      const progress = Math.min(1, (time - started) / duration);
      if (flight.path && candyRef.current) {
        const distance = progress * flight.impactDistance;
        const point = pointAtDistance(flight.path, distance);
        candyRef.current.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${reduced ? 0 : progress * 600})`);
        if (!reduced) {
          // Decorative wake samples only the path already flown; never reveal the landing point.
          const tailStart = Math.max(0, distance - 86);
          const points = Array.from({ length: 7 }, (_, i) => pointAtDistance(flight.path, tailStart + (distance - tailStart) * i / 6));
          const d = points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
          trailRef.current?.setAttribute('d', d);
          trailGlowRef.current?.setAttribute('d', d);
          for (const [key, value] of Object.entries({ x1: points[0].x, y1: points[0].y, x2: point.x, y2: point.y }))
            gradientRef.current?.setAttribute(key, value);
        }
      }
      if (progress >= 1 || !flight.path || !candyRef.current?.isConnected) {
        done = true;
        complete.current(flight);
      } else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => { canceled = true; if (frame !== null) cancelAnimationFrame(frame); };
  }, [flight]);
  return <>
    <defs>
      <linearGradient ref={gradientRef} id={`${id}-trail`} gradientUnits="userSpaceOnUse">
        <stop stopColor={flight.fireball ? '#ff6c32' : '#ffe5a2'} stopOpacity="0" />
        <stop offset=".55" stopColor={flight.fireball ? '#ff9f4d' : '#ffe9af'} stopOpacity=".5" />
        <stop offset="1" stopColor="#fff9df" />
      </linearGradient>
      <radialGradient id={`${id}-shell`} cx=".3" cy=".25" r=".8">
        <stop stopColor="#fffce7" /><stop offset=".4" stopColor={flight.fireball ? '#ffcb6b' : '#f8d485'} />
        <stop offset="1" stopColor={flight.fireball ? '#eb502b' : '#c7833c'} />
      </radialGradient>
    </defs>
    <g className={`projectile-trail ${flight.fireball ? 'is-fiery' : ''}`} fill="none" stroke={`url(#${id}-trail)`} strokeLinecap="round" strokeLinejoin="round">
      <path ref={trailGlowRef} strokeWidth="18" opacity=".18" /><path ref={trailRef} strokeWidth="6" opacity=".9" />
    </g>
    <g ref={candyRef} data-testid="projectile" className={flight.fireball ? 'projectile-candy is-fiery' : 'projectile-candy'}
    transform={`translate(${flight.path?.start.x || 0} ${flight.path?.start.y || 0})`}>
      <circle r="19" fill={flight.fireball ? '#ff9b3038' : '#fff6b526'} />
      <circle r="10" fill={`url(#${id}-shell)`} stroke={flight.fireball ? '#c85f30' : '#9b6936'} strokeWidth="1.5" />
      <path d="M-5-2Q0-8 5-2T-3 4" fill="none" stroke="#fff8d9" strokeWidth="3" strokeLinecap="round" />
      <circle cx="-3" cy="-4" r="2" fill="#fffce9" />
    </g>
  </>;
}
