const KINDS = new Set(['log-strike', 'ice-guard', 'jar-burst', 'aim-inversion']);
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);

export function getChaosEffectLabel(effect) {
  if (!effect || !KINDS.has(effect.kind)) return null;
  const damage = (Array.isArray(effect.hits) ? effect.hits : []).reduce((sum, hit) => sum
    + (Number.isFinite(hit?.damage) && hit.damage >= 0 ? hit.damage : 0), 0);
  return effect.kind === 'ice-guard' ? '혼돈 · 다음 적 공격 피해 50% 감소'
    : effect.kind === 'jar-burst' ? `혼돈 · 전체 적 폭발 · 피해 ${damage}`
      : effect.kind === 'aim-inversion' ? '혼돈 · 다음 한 발 조작 반전'
        : `혼돈 · 단일 타격 · ${damage ? `피해 ${damage}` : '대상 없음'}`;
}

/** Present the committed outcome; rendering must never roll Chaos randomness. */
export function getChaosObstacleCues({ area, layout, event } = {}) {
  if (area !== 'chaos' || event?.source !== 'weapon' || !Number.isInteger(event.id) || event.id <= 0
    || !Array.isArray(layout?.obstacles)) return [];
  const effects = event.obstacleEffects || (event.obstacleEffect ? [event.obstacleEffect] : []);
  if (!Array.isArray(effects)) return [];
  const contacts = Array.isArray(event.shotMeta?.contacts) ? event.shotMeta.contacts : [];
  const seen = new Set(), cues = [];
  for (const effect of effects) {
    if (!effect || !KINDS.has(effect.kind) || seen.has(effect.obstacleId)) continue;
    const prop = layout.obstacles.find(o => o?.id === effect.obstacleId);
    if (!prop) continue; // A prior bonus round's result must not play in the next round.
    const contact = contacts.find(c => c?.obstacleId === prop.id);
    const point = finitePoint(contact?.point) ? contact.point : { x: prop.x + prop.width / 2, y: prop.y + prop.height / 2 };
    if (!finitePoint(point)) continue;
    const id = `chaos-${event.id}-${prop.id}`;
    const hits = (Array.isArray(effect.hits) ? effect.hits : []).filter(h => typeof h?.id === 'string'
      && Number.isFinite(h.damage) && h.damage >= 0).map(h => ({ id: h.id, damage: h.damage }));
    const label = getChaosEffectLabel({ kind: effect.kind, hits });
    cues.push({ id, kind: effect.kind, label, hits,
      contact: { id, obstacleId: prop.id, obstacleKind: prop.kind, point: { ...point }, direction: contact?.direction === -1 ? -1 : 1 } });
    seen.add(prop.id);
  }
  return cues;
}
