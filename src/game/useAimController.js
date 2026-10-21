import { useCallback, useEffect, useRef, useState } from 'react';
import { ARENA } from './arenaLayout.js';
import { clamp } from './trajectory.js';

export const idleAim = () => ({ phase: 'idle', pointerId: null, isPointerHeld: false, angleDeg: 42,
  powerPercent: 20, powerDirection: 1, isPowerLocked: false, targetX: null, targetY: null,
  hasSelectedDirection: false, cameraScale: 1, launchId: null });

export function useAimController({ arenaRef, worldRef, launcherRef, enemyGroupRef, ammo, disabled,
  onLaunch, onAimChange, onCancel }) {
  const [aimState, setState] = useState(idleAim);
  const state = useRef(aimState);
  const latest = useRef(null);
  latest.current = { ammo, disabled, onLaunch, onAimChange, onCancel };
  const frame = useRef(null);
  const mounted = useRef(false);
  const sequence = useRef(0);
  const lastY = useRef(0);
  const update = useCallback(patch => {
    const previous = state.current;
    state.current = { ...previous, ...patch };
    if (mounted.current) setState(state.current);
    if (state.current.phase !== previous.phase) latest.current.onAimChange?.(state.current);
    return state.current;
  }, []);
  const stopFrame = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);
  const releasePointer = useCallback(pointerId => {
    try { if (pointerId !== null && arenaRef.current?.hasPointerCapture(pointerId)) arenaRef.current.releasePointerCapture(pointerId); }
    catch { /* The browser may have already released it after blur/cancel. */ }
  }, [arenaRef]);
  const cancelAim = useCallback(() => {
    const pointerId = state.current.pointerId;
    stopFrame();
    update(idleAim());
    releasePointer(pointerId);
    latest.current.onCancel?.();
  }, [releasePointer, stopFrame, update]);
  useEffect(() => {
    mounted.current = true;
    const cancel = () => cancelAim();
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel);
    window.addEventListener('resize', cancel);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      mounted.current = false;
      stopFrame();
      const pointerId = state.current.pointerId;
      state.current = idleAim();
      releasePointer(pointerId);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('resize', cancel);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [cancelAim, releasePointer, stopFrame]);
  useEffect(() => { if (disabled || ammo <= 0) cancelAim(); }, [disabled, ammo, cancelAim]);

  function worldPoint(clientX, clientY) {
    const bounds = worldRef.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) return null;
    return { x: (clientX - bounds.left) / bounds.width * ARENA.width,
      y: (clientY - bounds.top) / bounds.height * ARENA.height };
  }
  function onPointerDown(event) {
    if (event.pointerType !== 'mouse' || !event.isPrimary || event.button !== 0 || state.current.phase !== 'idle'
      || latest.current.disabled || latest.current.ammo <= 0 || !launcherRef.current?.contains(event.target)) return;
    event.preventDefault();
    try { arenaRef.current.setPointerCapture(event.pointerId); } catch { return; }
    arenaRef.current.focus({ preventScroll: true });
    const boxes = Array.from(enemyGroupRef.current?.querySelectorAll('[data-enemy-id]') || []).map(node => node.getBoundingClientRect());
    const center = boxes.length ? worldPoint((Math.min(...boxes.map(box => box.left)) + Math.max(...boxes.map(box => box.right))) / 2,
      (Math.min(...boxes.map(box => box.top)) + Math.max(...boxes.map(box => box.bottom))) / 2) : null;
    lastY.current = event.clientY;
    update({ ...idleAim(), phase: 'angle', pointerId: event.pointerId, isPointerHeld: true,
      targetX: center?.x ?? 950, targetY: center?.y ?? 570, cameraScale: 1.5 });
  }
  function onPointerMove(event) {
    const current = state.current;
    if (!current.isPointerHeld || event.pointerId !== current.pointerId) return;
    if (current.phase === 'angle') {
      update({ angleDeg: clamp(current.angleDeg + (lastY.current - event.clientY) * .25, 10, 80) });
      lastY.current = event.clientY;
    } else if (current.phase === 'direction') {
      const point = worldPoint(event.clientX, event.clientY);
      if (point) update({ targetX: clamp(point.x, ARENA.launch.x + 40, ARENA.width - 16), targetY: point.y, hasSelectedDirection: true });
    }
  }
  function onKeyDown(event) {
    if (event.key === 'Escape' && state.current.phase !== 'idle') { event.preventDefault(); cancelAim(); return; }
    if (event.code !== 'Space' || !state.current.isPointerHeld || state.current.phase === 'launching') return;
    event.preventDefault();
    if (event.repeat || state.current.phase !== 'angle') return;
    const started = performance.now();
    let previousTime = started;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    update({ phase: 'power', cameraScale: reducedMotion ? 1 : state.current.cameraScale });
    function tick(time) {
      if (state.current.phase !== 'power' || !mounted.current) return;
      const elapsed = Math.min(.1, (time - previousTime) / 1000);
      previousTime = time;
      let powerPercent = state.current.powerPercent + state.current.powerDirection * 80 * elapsed;
      let powerDirection = state.current.powerDirection;
      while (powerPercent > 100 || powerPercent < 20) {
        if (powerPercent > 100) { powerPercent = 200 - powerPercent; powerDirection = -1; }
        if (powerPercent < 20) { powerPercent = 40 - powerPercent; powerDirection = 1; }
      }
      const progress = clamp((time - started) / 1400, 0, 1);
      update({ powerPercent, powerDirection, cameraScale: reducedMotion ? 1 : 1 + .5 * (1 - progress) ** 2 });
      frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
  }
  function onKeyUp(event) {
    if (event.code !== 'Space' || state.current.phase !== 'power' || !state.current.isPointerHeld) return;
    event.preventDefault();
    stopFrame();
    update({ phase: 'direction', isPowerLocked: true });
  }
  function onPointerUp(event) {
    const current = state.current;
    if (event.pointerId !== current.pointerId) return;
    if (event.button !== 0 || current.phase !== 'direction' || !current.isPowerLocked || !current.hasSelectedDirection) { cancelAim(); return; }
    stopFrame();
    const launch = update({ phase: 'launching', pointerId: null, isPointerHeld: false, launchId: ++sequence.current });
    releasePointer(event.pointerId);
    latest.current.onLaunch(launch);
  }
  function onPointerCancel(event) {
    if (event.pointerId === state.current.pointerId) cancelAim();
  }
  function completeLaunch(id, resolve) {
    if (!mounted.current || state.current.phase !== 'launching' || state.current.launchId !== id) return;
    // Invalidate first; even two completion callbacks can resolve combat only once.
    state.current = { ...state.current, launchId: null };
    resolve();
    if (mounted.current) update(idleAim());
  }
  return { aimState, onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
    onLostPointerCapture: onPointerCancel, onKeyDown, onKeyUp, cancelAim, completeLaunch };
}
