import React, { useEffect, useId, useRef } from 'react';
import { sampleAtDistance, sampleAtTime } from '../game/shotGeometry.js';
import { createProjectilePlayback } from '../game/projectilePlayback.js';
import { BATTLEFIELD } from '../game/battlefieldModel.js';
import CandyProjectileArt from './CandyProjectileArt.jsx';

export default function ProjectileFlight({ flight, onProgress, onComplete, onFailure }) {
  const id = `candy-${useId().replace(/:/g, '')}`;
  const variant = flight.projectileKind || (flight.fireball ? 'fireball' : 'normal');
  const candyRadius = flight.candyRadius ?? BATTLEFIELD.candyRadius;
  const worldScale = candyRadius / BATTLEFIELD.candyRadius;
  const wake = variant === 'spear' ? ['#3b91b2', '#b8faff'] : flight.fireball ? ['#ff6c32', '#ff9f4d'] : flight.path?.kind === 'homing' ? ['#72d9c0', '#b7f8d4'] : ['#ffe5a2', '#ffe9af'];
  const candyRef = useRef(null);
  const trailRef = useRef(null), trailGlowRef = useRef(null), gradientRef = useRef(null);
  const rollDustRef = useRef(null);
  const rollShadowRef = useRef(null), dustDirectionRef = useRef(null);
  const childRefs = useRef(new Map()), bounceRef = useRef(null);
  const complete = useRef(onComplete);
  complete.current = { onComplete, onProgress, onFailure };
  const flightRef = useRef(flight);
  flightRef.current = flight;
  useEffect(() => {
    let frame = null;
    let canceled = false;
    let done = false;
    const started = performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let clock = createProjectilePlayback(flight, { reducedMotion: reduced });
    let playbackOffset = 0, clockFlight = flight;
    const rollStart = Number.isFinite(flight.rollStartDistance) ? sampleAtDistance(flight.path, flight.rollStartDistance) : null;
    function tick(time) {
      if (canceled || done) return;
      const flight = flightRef.current;
      const elapsed = time - started;
      if (flight !== clockFlight) {
        const previousTime = clock.sampleTime(Math.max(0, elapsed - playbackOffset));
        clock = createProjectilePlayback(flight, { reducedMotion: reduced });
        let low = 0, high = clock.durationMs;
        for (let i = 0; i < 24; i++) {
          const mid = (low + high) / 2;
          if (clock.sampleTime(mid) < previousTime) low = mid; else high = mid;
        }
        playbackOffset = elapsed - (low + high) / 2;
        clockFlight = flight;
      }
      if (!flight.path || !candyRef.current?.isConnected) {
        done = true; complete.current.onFailure?.(); return;
      }
      try {
        const candyTime = flight.directHitTime ?? sampleAtDistance(flight.path, flight.impactDistance).time;
        const simulationTime = clock.sampleTime(Math.max(0, elapsed - playbackOffset));
        const point = sampleAtTime(flight.path, simulationTime);
        const distance = Math.min(flight.impactDistance, point.distance);
        const candyFinished = !flight.abilityKindPending && simulationTime > candyTime;
        const rolling = Number.isFinite(flight.rollStartDistance) && distance > flight.rollStartDistance;
        const activeChild = flight.splitOrbs?.children.find(child => simulationTime >= flight.splitOrbs.splitTime
          && simulationTime <= child.impactTime);
        const focusPoint = candyFinished && activeChild
          ? sampleAtTime(activeChild.path, simulationTime - flight.splitOrbs.splitTime) : point;
        const activation = complete.current.onProgress?.({ id: flight.id, point, focusPoint, distance, time: simulationTime });
        if (activation?.flight) flightRef.current = activation.flight;
        candyRef.current.style.visibility = candyFinished ? 'hidden' : '';
        if (trailRef.current) trailRef.current.style.visibility = candyFinished ? 'hidden' : '';
        if (trailGlowRef.current) trailGlowRef.current.style.visibility = candyFinished ? 'hidden' : '';
        candyRef.current.dataset.rolling = String(rolling);
        const before = sampleAtDistance(flight.path, Math.max(0, distance - 2));
        const after = sampleAtDistance(flight.path, Math.min(flight.path.length, distance + 2));
        const rotation = !rolling && variant !== 'normal' ? Math.atan2(after.y-before.y, after.x-before.x) * 180 / Math.PI : reduced ? 0 : rolling
          ? rollStart.time * 480 + (point.x - rollStart.x) / candyRadius * 180 / Math.PI
          : simulationTime * 480;
        candyRef.current.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${rotation})`);
        if (bounceRef.current && flight.bounce) {
          const nearLanding = Math.abs(simulationTime - flight.bounce.firstLandingTime) < .22;
          bounceRef.current.style.display = nearLanding && !reduced ? '' : 'none';
          bounceRef.current.setAttribute('transform', `translate(${flight.bounce.firstLanding.x} ${flight.bounce.firstLanding.y})`);
        }
        for (const child of flight.splitOrbs?.children || []) {
          const node = childRefs.current.get(child.id);
          if (!node) continue;
          const active = simulationTime >= flight.splitOrbs.splitTime && simulationTime <= child.impactTime;
          node.style.visibility = active ? '' : 'hidden';
          if (active) {
            const position = sampleAtTime(child.path, simulationTime - flight.splitOrbs.splitTime);
            node.setAttribute('transform', `translate(${position.x} ${position.y})`);
          }
        }
        if (rollDustRef.current) {
          rollDustRef.current.style.display = !reduced && rolling && !candyFinished ? '' : 'none';
          rollDustRef.current.setAttribute('transform', `translate(${point.x} ${point.y + 13 * worldScale})`);
          dustDirectionRef.current?.setAttribute('transform', `scale(${Math.sign(point.x - rollStart?.x) || 1} 1)`);
        }
        if (rollShadowRef.current) {
          rollShadowRef.current.style.display = rolling && !candyFinished ? '' : 'none';
          rollShadowRef.current.setAttribute('transform', `translate(${point.x} ${point.y + candyRadius})`);
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
      if (elapsed - playbackOffset >= clock.durationMs && flightRef.current === flight) {
        done = true;
        candyRef.current.dataset.rolling = 'false';
        candyRef.current.dataset.flightStage = 'settled';
        if (flight.impactKind === 'ground') {
          // A chain may outlive the candy; show its resting place during review.
          candyRef.current.style.visibility = '';
          if (rollShadowRef.current && Number.isFinite(flight.rollStartDistance)) rollShadowRef.current.style.display = '';
        }
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
  }, [flight.shotId]);
  return <>
    <defs>
      <linearGradient ref={gradientRef} id={`${id}-trail`} gradientUnits="userSpaceOnUse">
        <stop stopColor={wake[0]} stopOpacity="0" />
        <stop offset=".55" stopColor={wake[1]} stopOpacity=".5" />
        <stop offset="1" stopColor="#fff9df" />
      </linearGradient>
    </defs>
    <g className={`projectile-trail ${flight.fireball ? 'is-fiery' : ''}`} fill="none" stroke={`url(#${id}-trail)`} strokeLinecap="round" strokeLinejoin="round">
      <path ref={trailGlowRef} strokeWidth={18 * worldScale} opacity=".18" /><path ref={trailRef} strokeWidth={6 * worldScale} opacity=".9" />
    </g>
    <ellipse ref={rollShadowRef} data-testid="roll-shadow" rx={13 * worldScale} ry={3 * worldScale}
      fill="#664729" opacity=".3" style={{ display: 'none' }} />
    <g ref={candyRef} data-testid="projectile" className={flight.fireball ? 'projectile-candy is-fiery' : 'projectile-candy'}
    data-projectile-kind={variant} data-stone-id={flight.loadedStoneId || 'basic-stone'}
    transform={`translate(${flight.path?.start.x || 0} ${flight.path?.start.y || 0})`}>
      <g transform={`scale(${worldScale})`}><CandyProjectileArt variant={variant} stoneId={flight.loadedStoneId} /></g>
    </g>
    <g ref={rollDustRef} data-testid="roll-dust" aria-hidden="true" style={{ display: 'none' }}>
      <g ref={dustDirectionRef}><g className="roll-dust" transform={`scale(${worldScale})`}>
        <circle cx="-12" cy="1" r="3" /><circle cx="-24" cy="5" r="2" /><circle cx="-36" cy="0" r="3.5" />
      </g></g>
    </g>
    <g ref={bounceRef} data-testid="bounce-dust" aria-hidden="true" style={{ display: 'none' }} className="bounce-dust">
      <g transform={`scale(${worldScale})`}><circle cx="-17" cy="-2" r="5" /><circle cy="-6" r="7" /><circle cx="19" cy="-3" r="4" /></g>
    </g>
    {flight.splitOrbs?.children.map(child => <g key={child.id} ref={node => node
      ? childRefs.current.set(child.id, node) : childRefs.current.delete(child.id)}
      data-testid="wizard-child-orb" data-orb-id={child.id} className="wizard-child-orb" style={{ visibility: 'hidden' }}>
      <g transform={`scale(${worldScale})`}><circle r="15" fill="#9cdfff" opacity=".3" /><circle r="8" fill="#d7f7ff" stroke="#5389dd" strokeWidth="3" />
        <circle cx="-2" cy="-2" r="2" fill="#fff" /></g>
    </g>)}
  </>;
}
