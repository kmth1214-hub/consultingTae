import { useCallback, useEffect, useRef, useState } from 'react';
import { createBgmPlayer } from './bgmPlayer.js';

const STORAGE_KEY = 'cookie-expedition-bgm-v1';
const DEFAULT_SETTINGS = { volume: .35, muted: false };

function readSettings() {
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? 'null');
    if (stored && typeof stored.volume === 'number' && Number.isFinite(stored.volume)
      && stored.volume >= 0 && stored.volume <= 1 && typeof stored.muted === 'boolean') {
      return { volume: stored.volume, muted: stored.muted };
    }
  } catch { /* Private browsing or corrupt settings must not block the game. */ }
  return DEFAULT_SETTINGS;
}

/** Owns one transport per game/studio entry and keeps controls across rounds. */
export function useBattleBgm({ active, area, boss }) {
  const [settings, setSettings] = useState(readSettings);
  const [state, setState] = useState('idle');
  const playerRef = useRef(null);

  useEffect(() => {
    const player = createBgmPlayer();
    playerRef.current = player;
    player.setVolume(settings.volume);
    player.setMuted(settings.muted);
    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    try { globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(settings)); }
    catch { /* A storage failure must not change the current audio setting. */ }
  }, [settings]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return undefined;
    let cancelled = false;
    const sync = () => {
      const shouldPlay = Boolean(active && area && !document.hidden);
      if (shouldPlay) {
        player.setScene(area, Boolean(boss));
        player.setActive(true);
        void player.resume().then(status => { if (!cancelled) setState(status.state); });
      } else {
        player.setActive(false);
        setState('idle');
      }
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', sync); };
  }, [active, area, boss]);

  const setVolume = useCallback(value => {
    const volume = Math.max(0, Math.min(1, Number(value)));
    if (!Number.isFinite(volume)) return;
    playerRef.current?.setVolume(volume);
    setSettings(current => ({ ...current, volume }));
  }, []);
  const toggleMuted = useCallback(() => {
    const muted = !settings.muted;
    playerRef.current?.setMuted(muted);
    if (!muted) void playerRef.current?.resume().then(status => setState(status.state));
    setSettings(current => ({ ...current, muted }));
  }, [settings.muted]);
  const resume = useCallback(async () => {
    const status = await playerRef.current?.resume();
    if (status) setState(status.state);
  }, []);
  return { ...settings, state, setVolume, toggleMuted, resume };
}
