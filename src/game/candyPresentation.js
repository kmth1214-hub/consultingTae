import { BattleEngine } from './battleEngine.js';

const describe = weapon => ({ id: weapon.id, name: weapon.name, grade: weapon.grade });
const progress = count => Math.max(0, Number(count) || 0) % 3;

/** Read-only explanations of committed state. Never predicts a random roll or target hit. */
export function getCandyDetails(run) {
  if (!Array.isArray(run?.weapons) || !run.weapons.length) return null;
  const weapon = BattleEngine.getCurrentWeapon(run);
  if (!weapon || !['C', 'B', 'A'].includes(weapon.grade)) return null;
  const queue = run.weaponQueue || [], next = run.weapons.find(item => item.instanceId === queue[1]);
  const multiplier = run.fireballArmed ? 2 : 1;
  const range = run.spearArmed ? { min: 2, max: 5 } : BattleEngine.getWeaponDamageRange(weapon.grade, run.zeroRollsThisRound || 0);
  const buffs = [];
  let currentAbility = null;
  if (run.spearArmed) currentAbility = '이번 발은 창 관통으로 대체됩니다.';
  else if (weapon.id === 'basic-stone') currentAbility = '공통 피해와 장애물 상호작용만 적용됩니다.';
  else if (weapon.id === 'adventurer-candy') currentAbility = '첫 바닥 착지에서 한 번 튀고, 두 번째 착지 후 굴러갑니다.';
  else if (weapon.id === 'alchemist-candy') currentAbility = `비행 중 클릭·Space로 폭발. ${weapon.grade}등급 성공률 ${({ C: 20, B: 45, A: 70 })[weapon.grade]}%, 반경 ${({ C: 300, B: 375, A: 450 })[weapon.grade]}. 성공 시 주변 적마다 피해 1.`;
  else if (weapon.id === 'wizard-orb') currentAbility = '비행 중 클릭·Space로 작은 구슬 2개 분열. 각 구슬이 실제 적에게 닿으면 피해 1.';
  else if (weapon.id === 'milk-candy') currentAbility = '적에게 직접 닿으면 체력 5 회복 · 다음 발사 뒤 적 공격 1회 보호.';
  else if (weapon.id === 'wind-candy') currentAbility = '라운드당 한 번 선택한 적을 유도해 명중합니다.';
  if (run.fireballArmed) buffs.push(`불공 · 큰 스톤 직접 피해 ×2 (${range.min * 2}–${range.max * 2}), 파동·작은 구슬 피해는 그대로`);
  if (run.spearArmed) buffs.push('창 · 실제 닿은 적 최대 3마리 관통 · 관통마다 피해 1 감소 · 이번 발사는 창 피해만 적용');
  if (run.pendingAimInversion) buffs.push('혼돈의 역풍 · 다음 한 발 조작 반전');
  if (run.defenseArmed) buffs.push('보호막 · 다음 적 공격 차단');
  if (run.milkShieldPending) buffs.push('우유 보호막 · 다음 발사 뒤 첫 적 공격 차단');
  if (run.nextAttackDamageMultiplier === .5) buffs.push('얼음 보호 · 다음 적 공격 피해 50% 감소');
  const counters = run.effectCounters || {}, effects = run.roundEffects || {};
  const collision = progress(counters.projectileCollisions);
  const descriptions = {
    'adventurer-candy': '전용 스톤의 첫 착지에서 한 번 튀어 오릅니다.',
    'alchemist-candy': '추가 클릭·Space로 폭발합니다. 적·장애물 충돌 시 자동 발동합니다.',
    'wizard-orb': `사탕이 적에게 3회 닿을 때마다 추가 피해 +1 · 현재 ${collision}/3`,
    'milk-candy': `직접 명중 시 체력 +5와 다음 발사 보호막 · ${run.milkShieldPending ? '보호막 대기 중' : '명중 대기 중'}`,
    'wind-candy': `라운드당 유도 사격 1회 · ${effects.windHomingUsed ? '사용 완료' : '사용 가능'}. 유도 사탕이 보스에 명중하면 추가 피해 +1`
  };
  const passives = [...new Set(run.weapons.map(item => item.id))]
    .filter(id => descriptions[id]).map(id => ({ id, text: descriptions[id] }));
  return { current: describe(weapon), currentAbility, damage: { ...range, multiplier },
    next: next ? describe(next) : null, reshuffleNext: queue.length <= 1, buffs, passives };
}
