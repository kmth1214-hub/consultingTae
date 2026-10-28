import React, { useEffect, useRef, useState } from 'react';
import { getPlayerPresentation } from '../game/playerPresentation.js';
import { ASSETS } from '../game/assetCatalog.js';
import AssetImage from './AssetImage.jsx';

export default function PlayerCookie({ characterId, placement, aimPhase, launchId, response, playerHp, defenseArmed, lastEvent,
  hitEffectsEnabled = false }) {
  const [healActive, setHealActive] = useState(false);
  const seenEvent = useRef(lastEvent?.id ?? null);
  const timer = useRef(null);
  useEffect(() => {
    if (!lastEvent || lastEvent.id === seenEvent.current) return;
    seenEvent.current = lastEvent.id;
    clearTimeout(timer.current);
    if (lastEvent.key === 'heal' && lastEvent.effect?.healed > 0) {
      setHealActive(true);
      timer.current = setTimeout(() => setHealActive(false), 700);
    }
  }, [lastEvent]);
  useEffect(() => { if (aimPhase === 'dragging') { clearTimeout(timer.current); setHealActive(false); } }, [aimPhase]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const view = getPlayerPresentation({ characterId, phase: aimPhase, response, playerHp, defenseArmed, healActive });
  return <div className={`player-cookie player-cookie--${view.pose}`} data-testid="player-cookie"
    data-character-id={view.characterId} data-player-pose={view.pose} data-impact-id={view.impactId ?? undefined}
    role="img" aria-label={`${view.name}, ${view.stateName}`}
    style={{ left: placement.x, top: placement.y, width: placement.width, height: placement.height,
      '--player-launch-id': launchId ?? 0 }}>
    {view.showShield && <span className="player-shield" data-testid="player-shield" aria-hidden="true" />}
    <span className="player-cookie-body" aria-hidden="true">
      <AssetImage src={ASSETS.characters[view.assetKey] || ASSETS.characters.adventurer} className="player-cookie-art" draggable="false" />
    </span>
    {view.pose === 'healing' && <span className="player-heal-sign" aria-hidden="true">✦ ＋ ✦</span>}
    {view.impactId !== null && (view.damage > 0 || view.blockedBy) && <span key={view.impactId} className={`player-hit-feedback ${view.blockedBy ? 'is-blocked' : ''}`}
      data-testid="player-hit-feedback" aria-hidden="true">{view.blockedBy ? '방어!' : view.damage ? `−${view.damage}` : ''}</span>}
    {hitEffectsEnabled && view.impactId !== null && view.damage > 0 && <span key={`crumbs-${view.impactId}`}
      className="player-hit-crumbs" data-testid="player-hit-crumbs" aria-hidden="true">
      <i className="player-hit-glow" />{Array.from({ length: 5 }, (_, index) => <i key={index} className="player-hit-crumb" />)}
    </span>}
    {hitEffectsEnabled && view.impactId !== null && view.pose === 'blocked' && <span key={`guard-${view.impactId}`}
      className="player-guard-wave" data-testid="player-guard-wave" aria-hidden="true" />}
  </div>;
}
