# Task: T06 전체 흐름 검증과 Azure 릴리스

## Status: pending

## Goal
새 점수 규칙·스톤 보상·도시 까마귀가 일반 게임에서 작동함을 확인하고 Azure에 배포한다. 새 버전이 정상화된 뒤 구 점수의 리더보드를 비운다.

## Decision Summary
- 적 수/체력은 임의로 줄이지 않는다. 낮은 시작 탄약과 지역 보상의 실제 플레이 가능성은 검증 결과로 보고한다.
- 사용자는 기존 `GLOBAL` 리더보드 기록 삭제를 승인했다. 새 점수 버전이 배포되기 전에는 삭제하지 않는다.
- BGM은 이전 결정대로 배포 빌드에서 제외한다.

## Implementation

### I01. 회귀 검증
- Related Files:
  - `tests/battle-engine.test.cjs` :: `roundAmmoCapacity`와 보상 기대값을 3발 덱 및 슬롯으로 수정; modify.
  - `tests/game-session.test.mjs` :: 보상/야영지/혼돈 화면 전이 기대값 수정; modify.
  - `tests/e2e/game-flow.spec.cjs` :: 전체 3지역 + 혼돈의 슬롯·발사·보상 스모크; modify.
  - `tests/e2e/stone-hud.spec.cjs`, `tests/e2e/city-crow.spec.cjs`, `tests/stone-combat.test.mjs`, `tests/slot-rewards.test.mjs` :: 안정화; modify.
- Execution Flow / Logic: 시작 3발, 라운드 보상 후 4/5발, 실패 스톤 기본 지급, 혼돈 소모품 실패 없음, 까마귀 공중 명중/빗나감, 기존 점수 보너스 없음, 모든 지역 이동을 확인한다. 오래된 9발·무기 선택·합성 단정만 새 계약으로 바꾼다. 실패 원인을 보기 전 테스트 삭제 금지.

### I02. 릴리스와 리더보드 재시작
- Related Files:
  - `.github/workflows/azure-static-web-apps.yml` :: 기존 배포 파이프라인과 BGM 제외 조건 확인; read-only unless broken.
  - `docs/azure-static-web-apps.md` :: 신규 보상·점수 변경 및 릴리스 확인 기록; modify.
  - `api/src/leaderboard/table-repository.js` :: 리더보드의 `GLOBAL` 레코드 스키마 확인; read-only.
- Execution Flow / Logic: 각 Task의 로컬 커밋과 포인터 완료 뒤 `main`으로 push하여 CI/배포를 기다린다. Azure 정상 동작을 확인하고 기존 `LeaderboardRecords` 테이블의 `GLOBAL` 레코드만 삭제한다. 다른 파티션/스토리지/리소스는 건드리지 않는다. 삭제 전에 파티션과 개수를 확인하고 삭제 후 0건을 확인한다. 이후 새로운 한 게임 기록을 검증할 수 있으면 조회한다.
- Error Handling: 배포가 실패하거나 새 버전 확인이 안 되면 구 기록 삭제를 하지 않고 실패 상태와 재시도 방법을 보고한다. Azure 접근/CLI가 없으면 로컬 구현 완료와 배포 블로커를 분리해서 보고한다.

## Acceptance Criteria
- [ ] 핵심 단위·E2E·빌드와 CI가 통과한다.
- [ ] Azure 사이트에 새 조작·보상·도시 몬스터가 반영된다.
- [ ] 새 버전 반영 후 기존 GLOBAL 기록만 비워진다.

## Validation
- `npm test`
- `npx playwright test tests/e2e/game-flow.spec.cjs tests/e2e/stone-hud.spec.cjs tests/e2e/city-crow.spec.cjs`
- `npm run build:azure`

## Commit Message
```text
test(release): 스톤 슬롯과 도시 까마귀 전체 흐름 검증

Plan: 2026-10-30-cookie-stone-slots-city-crow
Phase: P03-release
Task: T06-validation-release

- 낡은 탄약·보상 테스트를 새 규칙에 맞춰 갱신
- Azure 배포 및 리더보드 재시작을 검증
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
