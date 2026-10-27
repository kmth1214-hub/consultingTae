# Task: T01 새 마법사탕에 따른 라운드 발사 횟수 증가

## Status: done

## Goal

시작 9발을 유지하되 새 마법사탕을 따로 보유할 때마다 다음 라운드 발사 횟수가 1회씩 증가한다. 합성은 탄약을 늘리지 않으며 실제 전투 HUD가 이를 표시한다.

## Decision Summary

- 다음 라운드 탄약 한도는 `9 + Math.max(0, state.weapons.length - 1)`이다. 보상 직후 현재 라운드 탄약은 변경하지 않는다.
- 야영지에서 얻은 새 사탕도 눈/도시 첫 라운드에 반영한다. 혼돈 지역도 당시 보유 사탕 수를 반영한다.

## Implementation

### I01. 엔진의 라운드 탄약 산정

- Related Files:
  - `assets/js/battle-engine.js` :: `createRunState`, `enterRound`, `grantWeapon`, `getRunSummary` — 탄약 초기화와 보상·진행 경로; modify

#### Details

- **Signatures & Types**: `createRunState(options?: { weapons?: Weapon[]; ammo?: number; ... }): RunState`; `enterRound(state: RunState, options?: object): void`; `grantWeapon(state: RunState, source: Weapon, grade?: 'C'|'B'|'A', options?: { mergeDuplicate?: boolean }): GrantResult`.
- **Data & Schema Fields**: `RunState.weapons: Weapon[]`는 별도 사탕 인스턴스 목록, `maxAmmo: number`는 라운드 시작 총 발사 횟수, `ammo: number`는 남은 횟수. 기존 `Weapon.instanceId: string`, `grade: 'C'|'B'|'A'`는 유지한다.
- **Execution Flow / Logic**:
  1. `createRunState`에서 초기 무기 개수로 `maxAmmo = 9 + Math.max(0, initialWeapons.length - 1)`을 정하고 기본 `ammo = maxAmmo`로 설정한다. 테스트용 빈 사탕 목록은 9발을 유지한다. 명시적 `options.ammo`는 `0..maxAmmo`로 제한한다.
  2. `grantWeapon`은 기존처럼 새 인스턴스 추가 또는 기존 등급 합성만 수행한다. 보상 화면에 머무는 동안 현재 `ammo/maxAmmo`를 변경하지 않는다.
  3. `enterRound`에서 `state.maxAmmo = 9 + Math.max(0, state.weapons.length - 1)`로 재계산한 후 `state.ammo = state.maxAmmo`로 장전한다. `advanceRound`, `chooseCampReward`, `startBonusRoute`가 같은 `enterRound`를 사용한다.
  4. 유효하지 않은 보상·합성 결정은 기존 거부 흐름을 유지하고 탄약을 변경하지 않는다. 발사 시 한 발 차감·라운드 종료 판정도 그대로 사용한다.

### I02. 화면 안내와 실제 보상 경로 검증

- Related Files:
  - `src/components/GameHome.jsx` :: `GameHome` — 기본 9발과 새 사탕 보유 증가 규칙 안내; modify
  - `src/components/BattleScreen.jsx` :: `BattleScreen` — 기존 `run.ammo / run.maxAmmo` 표시 확인; read-only
  - `src/components/MagicCandyCard.jsx` :: `MagicCandyCard` — 기존 `run.maxAmmo` 기반 탄약 점 표시 확인; read-only
  - `tests/gameplay-rules.test.cjs` :: 보상→다음 라운드, 합성, 야영지·혼돈 탄약 검증; modify
  - `tests/e2e/game-flow.spec.cjs` :: 보상 선택 뒤 화면에 보이는 남은 탄약; modify
  - `tests/battle-engine.test.cjs` 및 다른 `maxAmmo/ammo=9` 기대 테스트 :: 명시적 다중 사탕 초기화에 한해 새 규칙과 맞춤; modify as needed

#### Details

- **Validation scenarios**: 새 사탕 1개 별도 보유→다음 라운드 10/10, 사탕 2개 별도 보유→11/11, 합성→9/9, 보상 직후 아직 기존 `ammo/maxAmmo`, 야영지 새 사탕과 혼돈 진입 시 재계산, 첫 발사 후 한 발 감소.
- **UI**: 시작 화면은 “기본 9발, 새 사탕을 보유하면 다음 라운드부터 +1발”을 설명한다. 기존 전투 HUD의 숫자와 점은 동적 `maxAmmo`를 사용하므로 고정 9 가정이 남지 않았는지 확인한다.

## Acceptance Criteria

- [x] 첫 라운드 시작 사탕 1개는 9/9다.
- [x] 새 사탕 별도 보유 개수만큼 다음 라운드 탄약이 증가하고 합성은 증가하지 않는다.
- [x] 라운드 보상·야영지·혼돈 경로와 전투 HUD가 같은 수치를 표시한다.
- [x] 기존 게임 동작과 보상 검증에서 회귀가 없다.

## Validation

- `node --test tests/gameplay-rules.test.cjs tests/battle-engine.test.cjs` — 보상·탄약 전환 검증.
- `npx.cmd playwright test tests/e2e/game-flow.spec.cjs` — 실제 UI 탄약 표시 검증.
- `npm.cmd test` — 엔진·API 전체 단위 검증.
- `npm.cmd run build:azure` (PowerShell 환경 변수 `ENTRA_TENANT_ID` 설정) — 배포 산출물 생성.
- `git diff --check` — 변경 파일 공백 검사.

## Commit Message

```text
fix(전투): 보유한 마법사탕만큼 다음 라운드 발사 횟수 증가

Plan: 2026-10-27-reward-candy-ammo-growth
Phase: P01-ammo
Task: T01-round-ammo-scaling

- 새 사탕을 별도로 보유하면 다음 라운드 탄약을 늘린다.
- 합성, 야영지, 혼돈 진행과 전투 HUD의 탄약 표시를 검증한다.
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: `fix(전투): 보유한 마법사탕만큼 다음 라운드 발사 횟수 증가`
