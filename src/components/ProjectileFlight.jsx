import React, { useEffect, useId, useRef } from 'react';
import { sampleAtDistance, sampleAtTime } from '../game/shotGeometry.js';

export default function ProjectileFlight({ flight, onProgress, onComplete, onFailure }) {
  const id = `candy-${useId().replace(/:/g, '')}`;
  const wake = flight.fireball ? ['#ff6c32', '#ff9f4d'] : flight.path?.kind === 'homing' ? ['#72d9c0', '#b7f8d4'] : ['#ffe5a2', '#ffe9af'];
  const candyRef = useRef(null);
  const trailRef = useRef(null), trailGlowRef = useRef(null), gradientRef = useRef(null);
  const rollDustRef = useRef(null);
  const complete = useRef(onComplete);
  complete.current = { onComplete, onProgress, onFailure };
  useEffect(() => {
    let frame = null;
    let canceled = false;
    let done = false;
    const started = performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 80 : flight.durationMs;
    function tick(time) {
      if (canceled || done) return;
      const progress = Math.min(1, (time - started) / duration);
      if (!flight.path || !candyRef.current?.isConnected) {
        done = true; complete.current.onFailure?.(); return;
      }
      try {
        const candyTime = flight.directHitTime ?? sampleAtDistance(flight.path, flight.impactDistance).time;
        const simulationTime = progress * (flight.simulationSeconds ?? candyTime);
        const point = sampleAtTime(flight.path, simulationTime);
        const distance = Math.min(flight.impactDistance, point.distance);
        const candyFinished = simulationTime > candyTime;
        const rolling = Number.isFinite(flight.rollStartDistance) && distance > flight.rollStartDistance;
        complete.current.onProgress?.({ id: flight.id, point, distance, time: simulationTime });
        candyRef.current.style.visibility = candyFinished ? 'hidden' : '';
        if (trailRef.current) trailRef.current.style.visibility = candyFinished ? 'hidden' : '';
        if (trailGlowRef.current) trailGlowRef.current.style.visibility = candyFinished ? 'hidden' : '';
        candyRef.current.dataset.rolling = String(rolling);
        const rollDistance = rolling ? distance - flight.rollStartDistance : 0;
        const rotation = reduced ? 0 : rolling ? 600 + rollDistance * 3.4 : progress * 600;
        candyRef.current.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${rotation})`);
        if (rollDustRef.current) {
          rollDustRef.current.style.display = !reduced && rolling && !candyFinished ? '' : 'none';
          rollDustRef.current.setAttribute('transform', `translate(${point.x} ${point.y + 13})`);
        }
        if (!reduced) {
          // Decorative wake samples only the path already flown; never reveal the landing point.
          const tailStart = Math.max(0, distance - 86);
          const points = Array.from({ length: 7 }, (_, i) => sampleAtDistance(flight.path, tailStart + (distance - tailStart) * i / 6));
          const d = points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
          trailRef.current?.setAttribute('d', d);
          trailGlowRef.current?.setAttribute('d', d);
          for (const [key, value] of Object.entries({ x1: points[0].x, y1: points[0].y, x2: point.x, y2: point.y }))
            gradientRef.current?.setAttribute(key, value);
        }
      } catch { done = true; complete.current.onFailure?.(); return; }
      if (progress >= 1) {
        done = true;
        complete.current.onComplete(flight);
      } else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => { canceled = true; if (frame !== null) cancelAnimationFrame(frame); };
  }, [flight]);
  return <>
    <defs>
      <linearGradient ref={gradientRef} id={`${id}-trail`} gradientUnits="userSpaceOnUse">
        <stop stopColor={wake[0]} stopOpacity="0" />
        <stop offset=".55" stopColor={wake[1]} stopOpacity=".5" />
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
    <g ref={rollDustRef} className="roll-dust" aria-hidden="true" style={{ display: 'none' }}>
      <circle cx="-12" cy="1" r="3" /><circle cx="-24" cy="5" r="2" /><circle cx="-36" cy="0" r="3.5" />
    </g>
  </>;
}
