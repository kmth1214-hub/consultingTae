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
  const range = BattleEngine.getWeaponDamageRange(weapon.grade, run.zeroRollsThisRound || 0);
  const buffs = [];
  if (run.fireballArmed) buffs.push(`불공 · 이번 사탕 피해 ×2 (${range.min * 2}–${range.max * 2}, 조건부 추가 피해도 2배)`);
  if (run.pendingAimInversion) buffs.push('혼돈의 역풍 · 다음 한 발 조작 반전');
  if (run.defenseArmed) buffs.push('보호막 · 다음 적 공격 차단');
  if (run.nextAttackDamageMultiplier === .5) buffs.push('얼음 보호 · 다음 적 공격 피해 50% 감소');
  const counters = run.effectCounters || {}, effects = run.roundEffects || {};
  const collision = progress(counters.projectileCollisions), permanent = progress(counters.permanentWeaponHits);
  const descriptions = {
    'adventurer-candy': `영구 사탕 명중 3회마다 점수 +10 · 현재 ${permanent}/3`,
    'alchemist-candy': '소모품 사용마다 점수 +10',
    'wizard-orb': `사탕이 적에게 3회 닿을 때마다 추가 피해 +1 · 현재 ${collision}/3`,
    'milk-candy': `사탕이 적에게 3회 닿을 때마다 체력 +1 · 현재 ${collision}/3. 라운드당 보스 공격 1회 차단 · ${effects.milkBossBlockUsed ? '사용 완료' : '대기 중'}`,
    'wind-candy': `라운드당 유도 사격 1회 · ${effects.windHomingUsed ? '사용 완료' : '사용 가능'}. 유도 사탕이 보스에 명중하면 추가 피해 +1`
  };
  const passives = [...new Set(run.weapons.map(item => item.id))]
    .filter(id => descriptions[id]).map(id => ({ id, text: descriptions[id] }));
  return { current: describe(weapon), damage: { ...range, multiplier },
    next: next ? describe(next) : null, reshuffleNext: queue.length <= 1, buffs, passives };
}
