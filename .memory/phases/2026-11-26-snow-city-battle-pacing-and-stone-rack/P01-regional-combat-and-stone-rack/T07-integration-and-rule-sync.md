# Task: T07 전투 흐름 통합과 규칙 동기화

## Status: pending

## Goal

일반 게임에서 보관함 선택부터 눈·도시 공략, 보상과 다음 라운드 재장전까지 확정한 규칙으로 이어진다.

## Decision Summary

- 실제 사용자 진입점과 같은 UI 흐름을 검증한다. 기존 테스트의 적 수·shuffle 기대값을 갱신하며 난이도나 범위를 추가 변경해 테스트를 통과시키지 않는다.
- 선행 작업은 T06-signature-stone-feedback이다. 목표 설계는 `.memory/decisions/2026-11-26-snow-city-battle-pacing-and-stone-rack.md`의 D01~D06을 따른다.
- 전투 진입은 createGameSession → beginShot → preparePhysicalFlight → ProjectileFlight → fireShot → BattleEngine.resolveProjectile 순서다. 물리 결과를 예약 token으로 한 번만 확정하고 화면 재생에서 피해를 재계산하지 않는다.
- 실제 코드는 JavaScript/React이고 아래 TypeScript는 문서용 타입 계약이다. 기존 함수의 사용자가 의존하는 반환값·유효성 검증을 보존한다.
- 공통 시작은 전용 C 1개+기본 2개, 일반 HP 4다. 새 API·DB 테이블·계정 해금 필드는 만들지 않는다. 지정 검증만 실행하고 전체 회귀는 배포 시 실행한다.

## Implementation

### I01. 상태·물리·화면 계약 연결

- Related Files:
  - `tests/e2e/stone-rack.spec.cjs`, `tests/e2e/snow-city-pacing.spec.cjs`, `tests/e2e/enemy-response.spec.cjs`, `tests/e2e/obstacle-chain.spec.cjs`, `tests/e2e/roster-mobile.spec.cjs` — modify only for changed contracts
  - `tests/e2e/game-flow.spec.cjs`, `tests/e2e/candy-unlock.spec.cjs`, `tests/e2e/shot-review.spec.cjs`, `tests/e2e/wind-skill.spec.cjs`, `tests/e2e/spear-projectile.spec.cjs` — modify for acquisition order/count assertions
  - `tests/studio-e2e/map-studio.spec.cjs`, `tests/studio-e2e/regional-elevated.spec.cjs` — modify for new preview/play roster
  - `Plan.md` :: 현재 조작·전투·피해·보상 규칙 — modify
  - `.memory/current.md`, 해당 phase.md, plan.md, T07 문서 — update completion records

#### Details

- **Signatures & Types**

```typescript
// No new production API or state fields in this Task.
// Integration input uses T01 RunState queue, T03 EnemySlot movement,
// T04 ObstacleContact.blast and T05 PhysicalFlight.ventHits.
```

- **Data & Schema Fields**

- 프로덕션 RunState와 네트워크 profile/leaderboard 스키마는 앞 Task의 범위를 따른다. account unlock은 snowAreaCleared를 유지한다.
- 보상 스톤은 weapons 끝에 추가되고 다음 전투 탄수에만 반영한다. 최종 점수는 실제 제거 HP 기반이며 쿠키별 점수 보너스를 만들지 않는다.
- 보관함 선택, V 보기, 직전 궤적 80%, Q 기술과 Space 비행 발동을 같은 전투 입력에서 함께 검증한다.

- **Execution Flow / Logic**

1. T01~T06의 완료 기록과 지정 검증을 확인한다. 일반 게임 홈→쿠키 선택→숲 보상→눈→도시 보스→선택적 혼돈의 변경된 계약을 점검한다. 보상·계정 저장 API는 테스트 fixture를 사용해 실사용 리더보드에 가짜 점수를 올리지 않는다.
2. 적 수 감소로 테스트 fixture ID/배치 seed가 달라졌다면 실제 의도한 명중 시나리오가 유지되는 새 fixture를 선택하고, 빗나감 테스트를 직접 피해로 덮지 않는다. 이동 타이밍 테스트는 clock을 고정한다.
3. round clear와 game over 전에 비행·낙하·상자 연쇄를 모두 확정하고 한 번만 점수와 다음 화면을 표시하는지 확인한다. 보관함에서 사용한 ID가 결과 확인 도중 재장전되지 않는지 확인한다.
4. Plan.md의 눈 3/4, 도시 5/6, 획득순, A/D/Space, 전용 스톤 연출, 수동/자동 폭발, 도시 원형 범위와 환기구 규칙을 현재 코드와 맞춘다. 관리자에서도 같은 런 규칙을 사용하되 개발 전용 화면의 외부 접근 제약을 유지한다.
5. 지정 범위 테스트와 build를 기록한다. 배포 요청이 있는 후속 단계에서 npm test, test:e2e, test:studio를 모두 실행하는 기존 Azure 파이프라인을 사용한다. 이 계획 자체는 workflow 변경·점검 모드 변경·푸시·배포를 포함하지 않는다.

### I02. 해당 기능 검증과 회귀 방지

- Related Files:
  - 위 I01의 tests 경로 — 변경된 실제 진입점과 실패 조건을 검증한다. modify/new 구분은 I01과 같다.

#### Details

- **Signatures & Types** — Node 테스트는 `node:test`의 `test(name, fn)`와 assert를, 브라우저 테스트는 기존 `tests/e2e/support.cjs`의 `test`, `installGame`, `start`, `dragPull`, `snapshot`, `phase`를 사용한다.
- **Data & Schema Fields** — fixture는 기존 instanceId/seed/flightStartMs/주입 RNG를 사용한다. 기대 피해는 실제 감소 HP와 해당 이벤트를 검사한다.
- **Execution Flow / Logic** — 획득 스톤과 다음 라운드 탄수, 수동 선택 후 Q 잠금/사용 해제, Space 장전 뒤 마법사/연금술사 발동, 도시 다중 폭발과 보스 과열 직전 환기구, 좁은 화면 HUD, 눈 클리어 계정 해금, 혼돈 기존 효과, V/직전 궤적 유지 등을 확인한다. 실패가 실제 게임 결함이면 담당 Task 파일을 고치고 그 검증부터 다시 실행한다.
- 실패 시 원래 재현 입력으로 원인을 확인하고, 확인 전 Task를 done으로 바꾸지 않는다. 브라우저 자산 로딩 시간과 물리 시간은 구분하며 타이밍 실패를 피해 결과 덮어쓰기로 해결하지 않는다.

## Acceptance Criteria

- [ ] 일반 게임에서 확정된 눈·도시·보관함 흐름을 확인한다.
- [ ] 슬롯 보상과 라운드 재장전, 계정 해금이 기존 저장 방식과 이어진다.
- [ ] 문서·검증 결과·current 포인터가 구현 완료 상태로 맞는다.

## Validation

- `node --test tests/stone-rack.test.mjs tests/city-blast-chain.test.mjs tests/oven-vent.test.mjs tests/game-session.test.mjs tests/candy-presentation.test.mjs tests/slot-rewards.test.mjs tests/shot-hit-integrity.test.mjs` — 지정 기능의 회귀와 실제 입력 경로가 통과한다.
- `npm.cmd run test:e2e -- tests/e2e/stone-rack.spec.cjs tests/e2e/snow-city-pacing.spec.cjs tests/e2e/shot-review.spec.cjs tests/e2e/wind-skill.spec.cjs tests/e2e/roster-mobile.spec.cjs` — 지정 기능의 회귀와 실제 입력 경로가 통과한다.
- `npm.cmd run test:studio -- tests/studio-e2e/regional-elevated.spec.cjs` — 지정 기능의 회귀와 실제 입력 경로가 통과한다.
- `npm.cmd run build -- --logLevel error` — 빌드 또는 변경 형식 검증이 통과한다.
- `git diff --check` — 빌드 또는 변경 형식 검증이 통과한다.

## Commit Message

```text
test(game): 지역 전투와 보관함 흐름 검증 및 규칙 갱신

Plan: 2026-11-26-snow-city-battle-pacing-and-stone-rack
Phase: P01-regional-combat-and-stone-rack
Task: T07-integration-and-rule-sync

- 일반 게임에서 보관함 선택부터 눈·도시 공략, 보상과 다음 라운드 재장전까지 확정한 규칙으로 이어진다.
- 지정 검증 결과와 회귀 수정 반영
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
