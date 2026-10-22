import { useCallback, useEffect, useRef, useState } from 'react';
import { getPull } from './shotGeometry.js';

export const idleAim = () => ({ phase: 'idle', pointerId: null, origin: null,
  delta: { x: 0, y: 0 }, direction: { x: 1, y: 0 }, angleDeg: 0, powerRatio: 0,
  maxDragPx: 0, hasMoved: false, ready: false, launchId: null });

export function useAimController({ arenaRef, ammo, disabled, invertDirection = false, onLaunch, onAimChange, onCancel }) {
  const [aimState, setState] = useState(idleAim);
  const state = useRef(aimState), mounted = useRef(false), sequence = useRef(0), latest = useRef(null);
  latest.current = { ammo, disabled, invertDirection, onLaunch, onAimChange, onCancel };
  const update = useCallback(patch => {
    const previous = state.current;
    state.current = { ...previous, ...patch };
    if (mounted.current) setState(state.current);
    if (previous.phase !== state.current.phase) latest.current.onAimChange?.(state.current);
    return state.current;
  }, []);
  const release = useCallback(id => {
    try { if (id !== null && arenaRef.current?.hasPointerCapture(id)) arenaRef.current.releasePointerCapture(id); }
    catch { /* Capture can already have been revoked by the browser. */ }
  }, [arenaRef]);
  const cancelAim = useCallback(() => {
    if (state.current.phase === 'idle') return;
    const id = state.current.pointerId;
    update(idleAim()); // Invalidate before releasing, which can emit lostpointercapture.
    release(id);
    latest.current.onCancel?.();
  }, [release, update]);
  useEffect(() => {
    mounted.current = true;
    const cancel = () => cancelAim();
    const hidden = () => { if (document.hidden) cancel(); };
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    window.addEventListener('blur', cancel);
    window.addEventListener('resize', cancel);
    document.addEventListener('fullscreenchange', cancel);
    document.addEventListener('visibilitychange', hidden);
    media.addEventListener('change', cancel);
    return () => {
      mounted.current = false;
      const id = state.current.pointerId;
      state.current = idleAim(); release(id);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('resize', cancel);
      document.removeEventListener('fullscreenchange', cancel);
      document.removeEventListener('visibilitychange', hidden);
      media.removeEventListener('change', cancel);
    };
  }, [cancelAim, release]);
  useEffect(() => { if (disabled || ammo <= 0) cancelAim(); }, [disabled, ammo, cancelAim]);
  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button === 2 && state.current.phase === 'dragging') {
      event.preventDefault(); cancelAim(); return;
    }
    if (event.pointerType !== 'mouse' || !event.isPrimary || event.button !== 0
      || state.current.phase !== 'idle' || latest.current.disabled || latest.current.ammo <= 0
      || event.target.closest('.arena-hud')) return;
    const rect = arenaRef.current?.getBoundingClientRect();
    const maxDragPx = rect && Math.min(220, .34 * Math.min(rect.width, rect.height));
    if (!Number.isFinite(maxDragPx) || maxDragPx <= 12) return;
    event.preventDefault();
    try { arenaRef.current.setPointerCapture(event.pointerId); } catch { return; }
    arenaRef.current.focus({ preventScroll: true });
    update({ ...idleAim(), phase: 'dragging', pointerId: event.pointerId,
      origin: { x: event.clientX, y: event.clientY }, maxDragPx });
  }
  function move(event) {
    const current = state.current;
    if (current.phase !== 'dragging' || event.pointerId !== current.pointerId) return;
    const delta = { x: event.clientX - current.origin.x, y: event.clientY - current.origin.y };
    const pull = getPull(delta, current.maxDragPx);
    if (!pull) { cancelAim(); return; }
    const direction = latest.current.invertDirection
      ? { x: -pull.direction.x, y: -pull.direction.y } : pull.direction;
    update({ ...pull, direction, angleDeg: Math.atan2(-direction.y, direction.x) * 180 / Math.PI,
      delta, hasMoved: current.hasMoved || pull.distancePx > 0 });
  }
  function onPointerUp(event) {
    if (event.pointerId !== state.current.pointerId || state.current.phase !== 'dragging') return;
    move(event);
    if (event.button !== 0 || !state.current.ready) { cancelAim(); return; }
    const launch = update({ phase: 'launching', pointerId: null, launchId: ++sequence.current });
    release(event.pointerId);
    latest.current.onLaunch?.(structuredClone(launch));
  }
  const onPointerCancel = event => { if (event.pointerId === state.current.pointerId) cancelAim(); };
  function completeLaunch(id, resolve) {
    if (!mounted.current || state.current.phase !== 'launching' || state.current.launchId !== id) return;
    state.current = { ...state.current, launchId: null };
    resolve();
    if (mounted.current) update(idleAim());
  }
  return { aimState, onPointerDown, onPointerMove: move, onPointerUp, onPointerCancel,
    onLostPointerCapture: onPointerCancel,
    onContextMenu: event => { event.preventDefault(); cancelAim(); },
    onKeyDown: event => {
      if (event.key === 'Escape') { event.preventDefault(); cancelAim(); }
      if (event.code === 'Space' && state.current.phase !== 'idle') event.preventDefault();
    }, cancelAim, completeLaunch };
}
