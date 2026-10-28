export const CHARACTERS = Object.freeze([
  { id: 'adventurer', name: '모험가맛 쿠키', weaponId: 'adventurer-candy', asset: 'adventurer', note: '세 번째 명중마다 점수 +10' },
  { id: 'alchemist', name: '연금술사맛 쿠키', weaponId: 'alchemist-candy', asset: 'alchemist', note: '소모품을 사용할 때마다 점수 +10' },
  { id: 'wizard', name: '마법사맛 쿠키', weaponId: 'wizard-orb', asset: 'wizard', note: '세 번째 명중에 추가 피해 +1' },
  { id: 'milk', name: '우유맛 쿠키', weaponId: 'milk-candy', asset: 'milk', note: '세 번째 명중에 회복 · 첫 보스 공격 방어', locked: true },
  { id: 'wind', name: '바람궁수 쿠키', weaponId: 'wind-candy', asset: 'wind', note: '라운드당 한 번 선택한 적으로 유도', locked: true }
]);

export const REGIONS = Object.freeze({
  forest: { name: '숲', subtitle: '초록빛 길에서 시작하는 모험', color: '#447955' },
  snow: { name: '눈', subtitle: '얼어붙은 길 너머의 설원', color: '#588ca1' },
  city: { name: '도시', subtitle: '오븐을 향한 마지막 여정', color: '#9d7062' },
  chaos: { name: '혼돈', subtitle: '세 번의 전투, 또 다른 도전', color: '#806497' }
});

export const MONSTER_NAMES = Object.freeze({
  snake: '젤리 뱀', boar: '초콜릿 멧돼지', 'dry-ice': '드라이아이스', snowball: '눈덩이',
  'washing-robot': '세탁 로봇', 'pointy-boar': '뾰족 멧돼지',
  'cowardly-snowman': '겁쟁이 눈사람', 'oven-robot': '오븐 로봇', 'chaos-fused-boss': '혼돈의 융합 군주',
  'frost-gear-snake': '서리 기어 뱀', 'oven-snow-boar': '화덕 눈멧돼지',
  'jelly-cloud-robot': '젤리 눈구름 로봇'
});
