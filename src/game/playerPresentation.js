import { CHARACTERS } from './gameData.js';

export function getPlayerPresentation({ characterId, phase, response, playerHp, defenseArmed, healActive }) {
  const character = CHARACTERS.find(item => item.id === characterId) || CHARACTERS[0];
  const attack = response?.attack;
  const impact = response?.stage === 'impact';
  const blocked = impact && Boolean(attack?.blocked);
  const damaged = impact && !blocked && Number(attack?.damage) > 0;
  const pose = blocked ? 'blocked' : damaged ? playerHp <= 0 ? 'defeated' : 'hurt'
    : healActive ? 'healing' : response && response.stage !== 'impact' ? 'brace' : phase === 'dragging' ? 'aiming'
      : phase === 'launching' ? 'release' : 'idle';
  const reason = blocked && ['defense', 'milk'].includes(attack?.blockedBy) ? attack.blockedBy : null;
  const stateName = ({ idle: '대기', aiming: '조준', release: '발사', brace: '적 공격 대비', hurt: '피격',
    blocked: reason === 'milk' ? '우유 보호막으로 방어' : '방어', healing: '회복', defeated: '쓰러짐' })[pose];
  return { characterId: character.id, assetKey: character.asset, name: character.name, pose,
    impactId: impact ? response.id : null, damage: damaged ? attack.damage : 0,
    blockedBy: reason, showShield: Boolean(defenseArmed || attack?.blocked), stateName,
  };
}
