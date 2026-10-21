import { useLayoutEffect, useRef, useState } from 'react';
import { getCameraPose } from './battlefieldCamera.js';

export function useBattlefieldCamera({ arenaRef, worldRef, layout, mode, focusRef, attackerId }) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [reducedMotion, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const poseRef = useRef(null);
  useLayoutEffect(() => {
    const measure = () => {
      const rect = arenaRef.current?.getBoundingClientRect();
      if (rect) setViewport(old => old.width === rect.width && old.height === rect.height
        ? old : { width: rect.width, height: rect.height });
    };
    const observer = new ResizeObserver(measure);
    if (arenaRef.current) observer.observe(arenaRef.current);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change); measure();
    return () => { observer.disconnect(); media.removeEventListener('change', change); };
  }, [arenaRef]);
  const valid = Boolean(getCameraPose({ mode: 'overview', viewport, layout }));
  useLayoutEffect(() => {
    const world = worldRef.current;
    if (!valid || !world) return;
    let frame, canceled = false, previousTime = performance.now();
    const started = previousTime, from = poseRef.current;
    const apply = pose => {
      poseRef.current = pose;
      world.style.transform = `translate(${pose.x}px, ${pose.y}px) scale(${pose.scale})`;
      world.style.setProperty('--camera-scale', pose.scale);
    };
    const target = () => getCameraPose({ mode, viewport, layout, focus: focusRef.current, attackerId, reducedMotion });
    if (!from || reducedMotion) { apply(target()); if (reducedMotion) return; }
    function tick(time) {
      if (canceled) return;
      const goal = target();
      const fraction = mode === 'follow' ? 1 - Math.exp(-(time - previousTime) / 90)
        : 1 - (1 - Math.min(1, (time - started) / 200)) ** 3;
      const base = mode === 'follow' ? poseRef.current : from ?? goal;
      apply(Object.fromEntries(['scale', 'x', 'y'].map(key => [key, base[key] + (goal[key] - base[key]) * fraction])));
      previousTime = time;
      if (mode === 'follow' || time - started < 200) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => { canceled = true; cancelAnimationFrame(frame); };
  }, [valid, mode, viewport, layout, attackerId, reducedMotion, focusRef, worldRef]);
  return { viewport, poseRef, valid, reducedMotion };
}
