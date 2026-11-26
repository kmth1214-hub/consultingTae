export const STONE_STATS = Object.freeze({
  'ginger-dash-stone': { startTime: .25, horizontalScale: { C: 1.12, B: 1.18, A: 1.24 } },
  'strawberry-lollipop-stone': { radiusScale: { C: 1.25, B: 1.35, A: 1.45 } },
  'chili-slash-stone': { kind: 'slash', maxDistance: { C: 180, B: 240, A: 300 } },
  'sea-wave-stone': { kind: 'ground-wave', maxDistance: { C: 420, B: 560, A: 700 } },
  'frost-stone': { kind: 'freeze', radius: { C: 0, B: 180, A: 240 }, extraTargets: { C: 0, B: 1, A: 2 } },
  'cherry-bomb-stone': { manual: 'cherry-bomb', delay: .35, radius: { C: 150, B: 180, A: 210 }, targets: 2 },
  'espresso-vortex-stone': { manual: 'vortex', duration: .7, radius: { C: 170, B: 210, A: 250 },
    maxDisplacement: { C: 60, B: 80, A: 100 }, targets: { C: 2, B: 2, A: 3 } }
});

const MANUAL_CONTROLS = '비행 중 클릭·Space·발동 버튼. 미입력 시 적·장애물 접촉 또는 착지 0.5초 뒤 자동 발동.';

export function describeSignatureStone(id, grade) {
  const stone = STONE_STATS[id];
  if (!stone) return null;
  switch (id) {
    case 'ginger-dash-stone':
      return `발사 0.25초 뒤 수평 속도 +${Math.round((stone.horizontalScale[grade] - 1) * 100)}%.`;
    case 'strawberry-lollipop-stone':
      return `회전하는 스톤의 충돌 반경 ${stone.radiusScale[grade]}배.`;
    case 'chili-slash-stone':
      return `직접 명중 뒤 베기 ${stone.maxDistance[grade]} · 장애물에 막히기 전 다른 적 1명에게 피해 1.`;
    case 'sea-wave-stone':
      return `첫 접촉 후 지면 파도 ${stone.maxDistance[grade]} · 공중과 발판 위는 제외 · 지상 적 최대 2명에게 피해 1.`;
    case 'frost-stone': {
      const count = stone.extraTargets[grade];
      return count
        ? `직접 맞힌 적과 반경 ${stone.radius[grade]}의 가까운 적 최대 ${count}명 빙결 · 각각 다음 반격 1회 건너뜀.`
        : '직접 맞힌 적 빙결 · 다음 반격 1회 건너뜀.';
    }
    case 'cherry-bomb-stone':
      return `폭탄 설치 후 0.35초 뒤 폭발 · 반경 ${stone.radius[grade]}의 적 최대 2명에게 피해 1. ${MANUAL_CONTROLS}`;
    case 'espresso-vortex-stone':
      return `소용돌이 0.7초 · 반경 ${stone.radius[grade]}의 일반 적 최대 ${stone.targets[grade]}명을 ${stone.maxDisplacement[grade]}까지 끌어당김. ${MANUAL_CONTROLS}`;
    default:
      return null;
  }
}
