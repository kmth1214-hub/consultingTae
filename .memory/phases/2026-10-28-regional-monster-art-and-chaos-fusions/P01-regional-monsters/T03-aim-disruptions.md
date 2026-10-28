# Task: T03 융합 공격의 한 발 조준 교란

## Status: pending

## Goal

관리자 혼돈 융합체의 두 번째 공격이 실제로 플레이어를 맞혔을 때에만 다음 한 발에 정해진 약한 조준 교란을 남긴다. 방어·실수·발사 취소는 효과를 잘못 적용하거나 소모하지 않고, 조준 미리보기와 실제 물리 경로가 일치한다.

## Decision Summary

- 서리 기어 뱀: 다음 발사 최대 당김/출력 15% 감소. 화덕 눈멧돼지: 궤적 안내 30%→15%. 젤리 눈구름 로봇: 바닥 굴림 최대 사탕 지름 5배→3배.
- 효과는 중첩하지 않고 실제 발사 한 번으로 소모한다. 방어·빗나감은 피해와 교란을 함께 막는다. 사용자 게임과 다른 지역은 영향받지 않는다.

## Implementation

### I01. 전투 상태와 공격 결과

- Related Files:
  - `assets/js/battle-engine.js` :: `createRunState`, `resolveEnemyTurn`, `resolveProjectile`, `advanceRound`; modify.
  - `tests/chaos-studio-fusions.test.mjs` :: 상태 적용·소비·방어·빗나감; modify.

#### Signatures & Types

```typescript
type AimDisruption = 'pull' | 'preview' | 'roll' | null;
type RunState = { studioMonsterPrototype?: 'regional-monsters-v1';
  pendingAimDisruption?: AimDisruption; /* 기존 run 필드 유지 */ };
type EnemyAttack = { fusionAttack?: 'base' | 'disrupt';
  aimDisruption?: Exclude<AimDisruption, null>; blocked: boolean; missed: boolean; damage: number };
```

#### Data & Schema Fields

- 융합 종류별 교란: `frost-gear-snake → pull`, `oven-snow-boar → preview`, `jelly-cloud-robot → roll`.
- `pendingAimDisruption`: 관리자 융합 전투에서만 `null` 또는 세 값 중 하나. 다른 run은 `undefined`/`null`이며 동작이 기존과 같다.

#### Execution Flow / Logic

1. 관리자 혼돈 융합체 `disrupt` 반격에서 `missed === false && blocked === false && damage > 0`일 때만 해당 종류를 `pendingAimDisruption`에 저장한다. 한 번에 적이 하나만 반격하므로 기존 상태가 있으면 새 상태가 교체하며 중첩하지 않는다.
2. 방어·우유 보호막·실수/빗나감·피해 0에서는 상태를 만들지 않는다. `EnemyAttack.aimDisruption`은 실제 적용된 경우에만 기록하고 HUD/반격 문구가 해당 이벤트를 표시한다.
3. `resolveProjectile`은 유효한 발사 결과를 수락할 때 기존 `pendingAimDisruption`을 소모한다. 소비는 그 발사의 카메라 재생/물리 계산에 사용된 스냅샷에 영향을 주지 않고, 다음 적 반격이 새 교란을 만들 수 있게 먼저 이뤄진다. 조준 취소·거절된 발사·소모품 사용은 소모하지 않는다.
4. 관리자 라운드를 다시 시작하면 `null`로 초기화한다. 융합 보스 3라운드와 사용자 혼돈에서는 적용하지 않는다.

### I02. 조준·물리·미리보기의 단일 파라미터

- Related Files:
  - `src/game/useAimController.js` :: `useAimController`의 관리자 전용 최대 출력 상한; modify.
  - `src/game/shotGeometry.js` :: `planShot`, `planStackedShot`, `appendGroundRoll`의 궤적/굴림 옵션; modify.
  - `src/game/shotResolution.js` :: `preparePhysicalFlight`에 동일 옵션 전달; modify.
  - `src/components/BattleArena.jsx` :: `makeSolution`, `useAimController` 및 상태 표시; modify.
  - `src/game/battlefieldModel.js` :: 기존 `BATTLEFIELD.maxRollDiameters = 5` 상수; read-only.
  - `tests/shot-geometry.test.mjs`, `tests/studio-aim-disruption.test.mjs` :: 물리·상태 일치; modify|new.

#### Signatures & Types

```typescript
type ShotDisruptionOptions = { previewFraction?: number; maxRollDiameters?: number };
function planShot(input: ExistingPlanShotInput & ShotDisruptionOptions): ShotSolution | null;
function useAimController(input: ExistingAimInput & { maxPowerRatio?: number }): AimController;
```

#### Data & Schema Fields

- 기본 옵션: `previewFraction=.30`, `maxRollDiameters=5`, `maxPowerRatio=1`. 플래그가 없으면 이전 동작과 동일하다.
- `pull` 교란: 원래 마우스 드래그의 방향/12px 시작 문턱은 보존하고 `powerRatio`만 `Math.min(originalPowerRatio,.85)`로 제한한다. 새총 시위와 실제 발사 출력이 같은 상한을 사용한다.
- `preview` 교란: `planShot.previewD` 길이에 `.15`를 사용한다. 모든 분기(장애물 연쇄를 쓰는 `planStackedShot`, 일반 탄도, 마법사 분리/유도)를 같은 상한으로 처리한다. 실제 탄도 자체는 바꾸지 않는다.
- `roll` 교란: `planStackedShot`의 `rollBudget`과 일반 분기의 `appendGroundRoll` 최대 거리를 `layout.candyRadius*2*3`으로 맞춘다. 기존 감속/맵 경계는 계속 적용한다.

#### Execution Flow / Logic

1. `BattleArena.makeSolution`과 `preparePhysicalFlight`는 동일 `run.pendingAimDisruption`을 옵션으로 변환해 `planShot`에 넘긴다. 별도 하드코딩된 미리보기/실제 값을 만들지 않는다.
2. `useAimController`는 `pull` 상태에서만 상한 `.85`를 적용한다. 조준 중 효과가 바뀌는 전투 상태는 없지만 상태 변화/화면 전환 시 드래그를 취소한다.
3. 이 옵션을 비행 스냅샷으로 보관하고 `gameSession.beginShot`에서 만든 `pendingShot.flight`를 재생/해결의 단일 진실 공급원으로 사용한다. 취소하면 run 효과는 남는다.
4. `tests/studio-aim-disruption.test.mjs`에서 같은 입력의 preview와 flight 경로·롤 거리·충돌 ID를 비교하고 사용자 기본 옵션이 그대로인 것도 확인한다.

### I03. 관리자 전투 안내와 전체 회귀

- Related Files:
  - `src/components/BattleArena.jsx`, `src/styles/arena.css` :: 관리자 혼돈 HUD의 효과 이름·`다음 한 발` 상태; modify.
  - `src/components/EnemyResponse.jsx` :: 교란이 실제 적용된 적 공격 결과 레이블; modify.
  - `tests/studio-e2e/play-mode.spec.cjs` :: 세 종류·방어·조준/발사·취소; modify.
  - `tests/e2e/chaos-fused-boss.spec.cjs`, `tests/e2e/shot-review.spec.cjs`, `tests/e2e/studio-exclusion.spec.cjs` :: 사용자/보스 회귀; read-only.

#### Test cases

- 실제 피해를 받은 두 번째 반격만 각 교란을 한 발 생성. 방어·실수·소모품 사용·조준 취소·발사 거절은 상태를 바꾸거나 소비하지 않음.
- 최대 당김 85%, 궤적 15%, 굴림 최대 지름 3배가 수치/화면에 일치. 일반 게임은 100%/30%/5배.
- 혼돈 융합 보스·분리전과 숲 `forest-elevated-v1` 고유 사탕 능력, 기존 점수·리더보드·보스 3타 규칙 회귀 없음.
- 데스크톱과 좁은 화면에서 관리자 피격 문구·조준 HUD가 배경/몬스터를 가리지 않는지 확인.

## Acceptance Criteria

- [ ] 한 번 맞은 두 번째 융합 공격만 정해진 교란을 표시하고, 막거나 빗나간 공격은 표시하지 않는다.
- [ ] 취소 후에는 남고 실제 발사 한 번 뒤 사라진다. 조준 표시와 명중/굴림 결과가 같은 교란을 따른다.
- [ ] 일반 사용자 게임과 혼돈 보스·숲 시범판은 원래 전투 규칙을 유지한다.

## Validation

- `npm.cmd test` — 엔진·물리·세션 회귀 통과.
- `npm.cmd run test:studio` — 관리자 미리보기/테스트 플레이 통과.
- `npm.cmd run build` — 번들 성공.
- `npx.cmd playwright test tests/e2e/chaos-fused-boss.spec.cjs tests/e2e/shot-review.spec.cjs tests/e2e/studio-exclusion.spec.cjs` — 사용자/보스/관리자 차단 회귀 통과.
- 관리자 혼돈 1·2라운드 공격/방어/조준 화면을 캡처해 시각 확인.

## Commit Message

```text
feat(관리자시범판): 융합체 공격의 한 발 조준 교란 추가

Plan: 2026-10-28-regional-monster-art-and-chaos-fusions
Phase: P01-regional-monsters
Task: T03-aim-disruptions

- 당김·궤적 안내·굴림을 한 발만 교란하고 방어로 차단
- 조준 미리보기와 실제 발사 결과 일치 검증
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
