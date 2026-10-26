import React, { useEffect, useId, useRef } from 'react';
import { sampleAtDistance, sampleAtTime } from '../game/shotGeometry.js';
import { createProjectilePlayback } from '../game/projectilePlayback.js';
import { BATTLEFIELD } from '../game/battlefieldModel.js';

export default function ProjectileFlight({ flight, onProgress, onComplete, onFailure }) {
  const id = `candy-${useId().replace(/:/g, '')}`;
  const wake = flight.fireball ? ['#ff6c32', '#ff9f4d'] : flight.path?.kind === 'homing' ? ['#72d9c0', '#b7f8d4'] : ['#ffe5a2', '#ffe9af'];
  const candyRef = useRef(null);
  const trailRef = useRef(null), trailGlowRef = useRef(null), gradientRef = useRef(null);
  const rollDustRef = useRef(null);
  const rollShadowRef = useRef(null), dustDirectionRef = useRef(null);
  const complete = useRef(onComplete);
  complete.current = { onComplete, onProgress, onFailure };
  useEffect(() => {
    let frame = null;
    let canceled = false;
    let done = false;
    const started = performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock = createProjectilePlayback(flight, { reducedMotion: reduced });
    const rollStart = Number.isFinite(flight.rollStartDistance) ? sampleAtDistance(flight.path, flight.rollStartDistance) : null;
    function tick(time) {
      if (canceled || done) return;
      const elapsed = time - started;
      if (!flight.path || !candyRef.current?.isConnected) {
        done = true; complete.current.onFailure?.(); return;
      }
      try {
        const candyTime = flight.directHitTime ?? sampleAtDistance(flight.path, flight.impactDistance).time;
        const simulationTime = clock.sampleTime(elapsed);
        const point = sampleAtTime(flight.path, simulationTime);
        const distance = Math.min(flight.impactDistance, point.distance);
        const candyFinished = simulationTime > candyTime;
        const rolling = Number.isFinite(flight.rollStartDistance) && distance > flight.rollStartDistance;
        complete.current.onProgress?.({ id: flight.id, point, distance, time: simulationTime });
        candyRef.current.style.visibility = candyFinished ? 'hidden' : '';
        if (trailRef.current) trailRef.current.style.visibility = candyFinished ? 'hidden' : '';
        if (trailGlowRef.current) trailGlowRef.current.style.visibility = candyFinished ? 'hidden' : '';
        candyRef.current.dataset.rolling = String(rolling);
        const rotation = reduced ? 0 : rolling
          ? rollStart.time * 480 + (point.x - rollStart.x) / BATTLEFIELD.candyRadius * 180 / Math.PI
          : simulationTime * 480;
        candyRef.current.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${rotation})`);
        if (rollDustRef.current) {
          rollDustRef.current.style.display = !reduced && rolling && !candyFinished ? '' : 'none';
          rollDustRef.current.setAttribute('transform', `translate(${point.x} ${point.y + 13})`);
          dustDirectionRef.current?.setAttribute('transform', `scale(${Math.sign(point.x - rollStart?.x) || 1} 1)`);
        }
        if (rollShadowRef.current) {
          rollShadowRef.current.style.display = rolling && !candyFinished ? '' : 'none';
          rollShadowRef.current.setAttribute('transform', `translate(${point.x} ${point.y + BATTLEFIELD.candyRadius})`);
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
      if (elapsed >= clock.durationMs) {
        done = true;
        candyRef.current.dataset.rolling = 'false';
        candyRef.current.dataset.flightStage = 'settled';
        if (flight.impactKind !== 'ground') {
          candyRef.current.style.visibility = 'hidden';
          if (rollShadowRef.current) rollShadowRef.current.style.display = 'none';
        }
        if (rollDustRef.current) rollDustRef.current.style.display = 'none';
        if (trailRef.current) trailRef.current.style.visibility = 'hidden';
        if (trailGlowRef.current) trailGlowRef.current.style.visibility = 'hidden';
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
    <ellipse ref={rollShadowRef} data-testid="roll-shadow" rx="13" ry="3" fill="#664729" opacity=".3" style={{ display: 'none' }} />
    <g ref={candyRef} data-testid="projectile" className={flight.fireball ? 'projectile-candy is-fiery' : 'projectile-candy'}
    transform={`translate(${flight.path?.start.x || 0} ${flight.path?.start.y || 0})`}>
      <circle r="19" fill={flight.fireball ? '#ff9b3038' : '#fff6b526'} />
      <circle r="10" fill={`url(#${id}-shell)`} stroke={flight.fireball ? '#c85f30' : '#9b6936'} strokeWidth="1.5" />
      <path d="M-5-2Q0-8 5-2T-3 4" fill="none" stroke="#fff8d9" strokeWidth="3" strokeLinecap="round" />
      <circle cx="-3" cy="-4" r="2" fill="#fffce9" />
    </g>
    <g ref={rollDustRef} data-testid="roll-dust" aria-hidden="true" style={{ display: 'none' }}>
      <g ref={dustDirectionRef}><g className="roll-dust">
        <circle cx="-12" cy="1" r="3" /><circle cx="-24" cy="5" r="2" /><circle cx="-36" cy="0" r="3.5" />
      </g></g>
    </g>
  </>;
}
