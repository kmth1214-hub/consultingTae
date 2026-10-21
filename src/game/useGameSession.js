import { useState, useSyncExternalStore } from 'react';
import { createGameSession } from './gameSession.js';

export function useGameSession(options = {}) {
  const [session] = useState(() => createGameSession(options));
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return { ...snapshot, ...session.actions };
}
