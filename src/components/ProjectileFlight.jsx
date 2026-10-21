import React, { useEffect, useRef } from 'react';
import { pointAtDistance } from '../game/trajectory.js';

export default function ProjectileFlight({ flight, onComplete }) {
  const candyRef = useRef(null);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    let frame = null;
    let canceled = false;
    let done = false;
    const started = performance.now();
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 80
      : Math.min(1150, 650 + (flight.impactDistance || 0) * .3);
    function tick(time) {
      if (canceled || done) return;
      const progress = Math.min(1, (time - started) / duration);
      if (flight.path && candyRef.current) {
        const point = pointAtDistance(flight.path, progress * flight.impactDistance);
        candyRef.current.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${progress * 600})`);
      }
      if (progress >= 1 || !flight.path || !candyRef.current?.isConnected) {
        done = true;
        complete.current(flight);
      } else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => { canceled = true; if (frame !== null) cancelAnimationFrame(frame); };
  }, [flight]);
  return <g ref={candyRef} data-testid="projectile" className={flight.fireball ? 'projectile-candy is-fiery' : 'projectile-candy'}
    transform={`translate(${flight.path?.start.x || 0} ${flight.path?.start.y || 0})`}>
    <circle r="16" fill={flight.fireball ? '#ff9b3050' : '#fff6b54d'} />
    <circle r="9" fill={flight.fireball ? '#f28e39' : '#f1d087'} stroke="#835834" strokeWidth="2" />
    <path d="M-5-2Q0-8 5-2T-3 4" fill="none" stroke="#fff4cf" strokeWidth="3" strokeLinecap="round" />
  </g>;
}
