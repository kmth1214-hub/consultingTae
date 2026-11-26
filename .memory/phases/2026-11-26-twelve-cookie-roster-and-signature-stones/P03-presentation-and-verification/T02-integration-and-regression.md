# Task: T02 12종 선택·슬롯·발사 통합 검증

## Status: done

## Goal

새 쿠키 선택부터 라운드 보상·전용 스톤 발사·적 반격·다음 라운드까지 하나의 동작으로 이어지는지 확인한다. 새 기능 때문에 기존 5종·소모품·계정 잠금·점수 판정이 깨진 부분만 수정한다.

## Decision Summary

- 이번 작업은 일반 게임에 반영 가능한 코드 상태까지 마친다. Azure 배포는 이 계획 범위에 넣지 않는다.
- 로컬에서는 해당 기능의 제한된 테스트와 빌드만 한다. 전체 테스트·전체 E2E 순회는 실제 배포 시점에 수행한다.

## Implementation

### I01. 경계 계약 통합

- Related Files:
  - `src/game/gameSession.js` :: `startRun`, `beginShot`, `activatePendingAbility`, `fireShot`, `finishCombatRouting`의 연결 오류 수정; modify only if failure.
  - `src/game/shotResolution.js` :: `preparePhysicalFlight`/`flightResultPayload`의 누락 필드 수정; modify only if failure.
  - `assets/js/battle-engine.js` :: `resolveProjectile`, `spinRewardSlot`, `resolveEnemyTurn` 회귀 수정; modify only if failure.
  - `src/components/BattleArena.jsx`, `src/components/CharacterSelect.jsx` :: 표시·입력 회귀 수정; modify only if failure.
  - `tests/game-session.test.mjs`, `tests/shot-hit-integrity.test.mjs`, `tests/slot-rewards.test.mjs`, `tests/candy-unlock.test.mjs` :: 통합 사례 추가; modify.

#### Details

- **Signatures & Types**: `startRun(characterId:string)`, `beginShot({launchId:number,pull:Pull})`, `activateFlightAbility({shotId,encounterId,simulationTime,source})`, `fireShot({shotId,encounterId,reviewResult?})`의 기존 공개 인수와 `{accepted:boolean, reason?:string}` 결과를 유지한다.
- **Data & Schema Fields**: 12개 `Character.id`와 `WEAPON_CATALOG.id`, 12개 `ASSETS.characters` 키가 서로 대응한다. `RunState.weapons`는 선택 캐릭터 전용 1·기본 2, 슬롯 후 추가 인스턴스를 유지한다. `RunState.enemyPositionOverrides`/`Enemy.frozenNextAttack`은 라운드 경계에서 비워진다. 기존 프로필 `snowAreaCleared:boolean`만 사용한다.
- **Execution Flow / Logic**:
  1. 미해금 프로필에서 공개 8종만 시작, 해금 프로필에서 12종 시작. 직접 `startRun`으로 잠금 캐릭터 ID를 넣어도 차단된다.
  2. 각 신규 쿠키가 올바른 전용 스톤으로 3발을 시작하고, 실패/당첨 슬롯이 기본/해금 스톤을 1개 더 준다. 다른 쿠키가 받은 신규 스톤도 그 스톤의 전용 효과를 쓸 수 있다.
  3. 실제 발사 예약 → 수동/자동 능력 → 화면 재생 → `fireShot` 확정 → 적 반격 → 다음 라운드의 순서를 확인한다. 위조 `shotMeta`와 뒤늦은 샷 ID는 거절한다. 체리 폭탄 및 소용돌이는 한 발에 적 반격 1회 이상을 만들지 않는다.
  4. 창 사용 시 전용 능력 미발동, 불공 사용 시 직접 피해만 2배, 마법사/연금술사 능력, 우유 회복·보호막, 바람궁수 Q·충전 규칙을 유지한다.
  5. 빈 탄·맵 밖·바닥·장애물만 접촉한 빗나감에서는 신규 효과가 허용한 경우를 제외하고 적이 사망하지 않는다. 추가 피해가 라운드 클리어를 일으키면 적 반격 없이 결과 화면으로 이동한다.
- **Error & Exception Handling**: 검증 실패는 새 시스템만 수정하고 사용자 작업 중인 다른 파일의 내용을 버리지 않는다. 프로필 저장 실패 시 기존 재시도/진행 차단 유지. 외부 발사 메타 입력만으로 빙결·폭탄·이동을 만들 수 없게 한다.

### I02. 제한된 검증과 문서화

- Related Files:
  - `tests/grade-damage.test.mjs`, `tests/candy-presentation.test.mjs`, `tests/player-presentation.test.mjs` :: 등급·HUD·선택 데이터 회귀; modify only if failure.
  - `.memory/phases/2026-11-26-twelve-cookie-roster-and-signature-stones/P03-presentation-and-verification/phase.md` :: Task 완료 기록; modify by executor.

#### Details

- 기존 신규 기능 관련 테스트만 실행한다. E2E 전부나 `npm.cmd test`는 이 Task에서 실행하지 않는다. `npm.cmd run build`는 자산 누락·JSX 오류의 최소 배포 준비 확인이다.
- 변경이 필요한 경우 실패 원인을 테스트에 적합하게 수정하고 무관한 기능을 재설계하지 않는다. 다음 배포 때 전체 테스트를 별도 수행한다.

## Acceptance Criteria

- [ ] 12종 선택·해금·보상·전투가 한 번의 게임 세션에서 연결된다.
- [ ] 새로운 능력으로 실제 닿지 않은 적의 HP가 줄지 않고, 적 반격이 발사당 한 번만 처리된다.
- [ ] 기존 5종, 등급 피해·점수, 창·불공, 계정 잠금이 유지된다.
- [ ] 지정 테스트와 Vite 빌드가 통과한다. 전체 테스트는 배포 단계로 남긴다.

## Validation

- `node --test tests/game-session.test.mjs tests/shot-hit-integrity.test.mjs tests/slot-rewards.test.mjs tests/candy-unlock.test.mjs tests/grade-damage.test.mjs tests/candy-presentation.test.mjs tests/player-presentation.test.mjs` — 요청 기능의 제한된 통합 검증.
- `npm.cmd run build` — 누락 자산/번들 오류 확인.
- `npm.cmd run test:e2e -- tests/e2e/roster-mobile.spec.cjs` — 390px 화면의 실제 터치 드래그·발사·능력 버튼 단일 동작 확인.

### 통합 확인 중 발견한 수정

- `src/game/useAimController.js`가 기존에 마우스 입력만 허용했다. 주 입력인 터치·펜도 같은 조준·발사 경로를 사용하도록 연결했다. 멀티터치의 보조 입력은 계속 무시한다.
- 현재 기능은 일러스트 없이 검토 가능하다. 신규 5종은 사용자 공급 일러스트를 받을 때까지 임시 이름 및 시각 표시를 쓴다.

## Commit Message

```text
test(game): 쿠키 12종 전투 흐름과 기존 규칙 검증

Plan: 2026-11-26-twelve-cookie-roster-and-signature-stones
Phase: P03-presentation-and-verification
Task: T02-integration-and-regression

- 선택·슬롯·발사·반격 경계의 통합 사례 확인
- 기존 전용 스톤과 소모품 회귀 수정
```

## Progress

- [x] 구현 완료
- [x] 지정 검증 통과
- commit: 이 문서를 포함한 Task 커밋
