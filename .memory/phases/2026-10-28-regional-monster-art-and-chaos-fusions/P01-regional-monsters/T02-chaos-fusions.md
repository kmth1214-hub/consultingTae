# Task: T02 혼돈 융합체 명단과 교대 공격

## Status: pending

## Goal

로컬 관리자 혼돈 1·2라운드에 서로 다른 융합 몬스터 3종이 각 1마리 이상 등장하고, 각 종이 알아볼 수 있는 두 공격을 한 번씩 번갈아 사용하게 한다. 사용자 게임·혼돈 3라운드 융합 보스는 기존 명단과 공격을 유지한다.

## Decision Summary

- 새 세 종류는 서리 기어 뱀, 화덕 눈멧돼지, 젤리 눈구름 로봇. 숲·눈·도시 요소가 모두 보이는 별도 투명 PNG를 만든다.
- 일반 체력 4, 기본 공격 피해 1~8, 라운드 수 9~13, 발사당 반격 1회 유지. 첫 공격 A 이후 A/B 교대하며 빗나감 10%를 유지한다. 한 발 교란의 실제 적용은 T03에서 다룬다.

## Implementation

### I01. 융합체 3종 그림과 식별자

- Related Files:
  - `assets/monsters/chaos-fused-boss.png`, `assets/monsters/jelly-snake.png`, `assets/monsters/chocolate-boar.png` :: 품질·색 조합 참고; read-only.
  - `assets/monsters/frost-gear-snake.png`, `assets/monsters/oven-snow-boar.png`, `assets/monsters/jelly-cloud-robot.png` :: 새 투명 전신 일러스트; new.
  - `src/game/assetCatalog.js` :: 융합체 자산 import와 `ASSETS.monsters` 키; modify.
  - `src/game/gameData.js` :: `MONSTER_NAMES`의 3종 한국어 이름; modify.
  - `src/components/MonsterGroup.jsx` :: 관리자 플래그에서만 3종 PNG 선택; modify.

#### Signatures & Types

```typescript
type ChaosFusionKind = 'frost-gear-snake' | 'oven-snow-boar' | 'jelly-cloud-robot';
type FusionAttackVariant = 'base' | 'disrupt';
```

#### Data & Schema Fields

- `ASSETS.monsters.frostGearSnake`, `.ovenSnowBoar`, `.jellyCloudRobot`: 생성된 투명 PNG 모듈 URL.
- `MONSTER_NAMES[kind]`: 각각 `서리 기어 뱀`, `화덕 눈멧돼지`, `젤리 눈구름 로봇`.

#### Execution Flow / Logic

1. 내장 `image_gen`을 종류당 한 번 사용한다. 숲 2종과 기존 혼돈 보스를 스타일 참조로 사용하되, 각 융합체는 독자적인 전신 실루엣으로 만든다. 공통으로 숲 먹거리 질감·눈/얼음·도시 기계 부품이 모두 보여야 한다.
2. 서리 기어 뱀은 길고 휘어진 젤리 몸체에 푸른 얼음 가시와 기어 관절, 화덕 눈멧돼지는 낮은 멧돼지 체형에 설탕 눈과 작은 화덕 갑옷, 젤리 눈구름 로봇은 원형 드럼 로봇에 젤리 팔·눈구름 어깨를 준다. 60 월드 단위에서 세 실루엣을 구별할 수 있게 한다.
3. 관리자 플래그가 없으면 새 종류가 사용자 명단에 등장하지 않으므로 기존 렌더링 경로는 유지한다. 생성 결과의 투명 알파·전신 잘림을 확인한다.

### I02. 관리자 혼돈 명단 생성

- Related Files:
  - `assets/js/battle-engine.js` :: `createRoundEnemies`, `createRunState`, `resolveEnemyTurn`; modify.
  - `src/dev/createStudioSession.js` :: `createStudioScenario`의 생성 옵션; modify.
  - `src/game/battlefieldModel.js` :: `buildBattlefield` 크기·충돌 대상 유효성 확인; read-only (변경이 필요하면 크기 60 기존 유지).
  - `tests/chaos-studio-fusions.test.mjs` :: 명단·시드·교대 공격 회귀; new.

#### Signatures & Types

```typescript
type RunState = { area: string; round: number; studioMonsterPrototype?: 'regional-monsters-v1';
  enemies: Array<{ id: string; kind: string; hp: number; maxHp: number;
    isBoss: boolean; alive: boolean; attackCount: number }> };
type EnemyAttack = { enemyId: string; kind: ChaosFusionKind; attackKind: string;
  fusionAttack?: FusionAttackVariant; damage: number; missed: boolean; blocked: boolean };
```

#### Data & Schema Fields

- `createRoundEnemies(..., {rng, studioMonsterPrototype})`: `area === 'chaos' && round < 3 && flag === 'regional-monsters-v1'`에서만 새 종류 사용. 기존 사용자 호출은 옛 5종을 계속 사용.
- 명단은 세 고정 종류를 먼저 넣고 나머지 `count-3`개를 기존 RNG로 세 종류에서 고른다. `id`는 기존 `${area}-r${round}-${kind}-${index+1}` 형식, `hp=maxHp=4`.
- `enemy.attackCount`: 관리자 융합체는 매 반격 시 1 증가. `0`에서 첫 공격 `base`, `1`에서 `disrupt`, 이후 교대. 보스의 기존 카운터와 별개.

#### Execution Flow / Logic

1. `createStudioScenario`가 관리자 혼돈 시나리오를 만들 때 `studioMonsterPrototype:'regional-monsters-v1'`을 `engine.createRunState` 옵션에 전달한다. `createRunState`는 플래그를 run에 보관하고 `createRoundEnemies`에 전달한다. 같은 시드를 쓰는 지도 미리보기와 플레이 명단이 일치해야 한다.
2. `resolveEnemyTurn`은 플래그+혼돈+세 융합 종류일 때만 첫/짝수 `base`, 둘째/홀수 `disrupt`를 고른다. 공격 계열은 뱀: `snake`↔`dry-ice`, 멧돼지: `boar`↔`snowball`, 로봇: `washing-robot`↔`snowball`이고 원본 `kind`는 융합 종류로 보존한다.
3. `base`와 `disrupt` 모두 기본 피해 1~8, 반격 1회, 10% 빗나감. missed/blocked 결과는 기존 이벤트 계약을 유지한다. T02에는 교란 상태를 만들지 않는다. 사용자 일반 적, 융합 보스, 분리된 보스의 공격은 기존 분기를 탄다.
4. `src/components/EnemyResponse.jsx`의 `attackStyle`은 융합 `fusionAttack`과 `attackKind`로 6개의 준비/발사 레이블·색을 구별한다. `MonsterGroup.jsx`의 투척 팔 예외 조건은 `attackKind` 기준으로 처리해 그림만 바뀌었다고 발사 동작이 깨지지 않게 한다.

### I03. 검증

- Related Files:
  - `tests/studio-e2e/play-mode.spec.cjs` :: 혼돈 1·2라운드 미리보기·플레이 3종 표시; modify.
  - `tests/e2e/chaos-fused-boss.spec.cjs`, `tests/gameplay-rules.test.cjs` :: 사용자 혼돈·보스 회귀; read-only.

#### Test cases

- 같은 시드 2회 명단 일치, 다른 시드에서 나머지 멤버 변동, 각 종류 최소 1개, 9~13마리, 4 HP.
- 한 융합 적의 1·2·3·4번째 반격 `base/disrupt/base/disrupt`, 피해 1~8, 빗나감은 피해 0, 사용자 적과 융합/분리 보스는 원래 방식.
- 관리자 지도 혼돈 미리보기와 같은 배치 테스트 플레이에서 새 3종 아트가 보이고 사용자 게임의 기존 5종 혼합은 보존.

## Acceptance Criteria

- [ ] 관리자 혼돈 1·2라운드에 세 새 종류가 각각 최소 한 마리 등장하고 시드 재실행이 같다.
- [ ] 세 종류를 구별할 수 있는 별도 투명 전신 일러스트와 교대 공격 모션·이름이 표시된다.
- [ ] 사용자 혼돈 일반전, 융합 보스 및 분리전의 종류·능력·점수가 달라지지 않는다.

## Validation

- `node --test tests/chaos-studio-fusions.test.mjs tests/chaos-fused-boss.test.mjs tests/gameplay-rules.test.cjs` — 관리자 규칙과 사용자 회귀 통과.
- `npm.cmd run test:studio` — 관리자 지도/플레이 회귀 통과.
- `npm.cmd run build` — 세 PNG import와 번들 성공.
- 관리자 혼돈 1·2라운드 캡처에서 세 종류의 축소 실루엣·발사 동작을 육안 확인.

## Commit Message

```text
feat(관리자시범판): 혼돈 융합 일반 몬스터 3종 추가

Plan: 2026-10-28-regional-monster-art-and-chaos-fusions
Phase: P01-regional-monsters
Task: T02-chaos-fusions

- 세 지역 특징을 합친 일러스트와 시드 명단 구성
- 일반 피해를 유지한 두 공격 교대 구현
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
