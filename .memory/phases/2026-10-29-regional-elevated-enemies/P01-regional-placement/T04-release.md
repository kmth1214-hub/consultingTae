# Task: T04 네 지역 검증과 Azure 출시

## Status: done

## Goal
네 지역의 공개 전투를 실제 브라우저에서 확인하고 BGM 없는 빌드를 GitHub에 반영해 Azure 배포 완료까지 확인한다.

## Decision Summary
- 모든 지역의 배치·낙하 검증 후 출시한다.
- 프로덕션 BGM은 비활성, 관리자 전용 능력은 비공개 상태로 유지한다.

## Implementation

### I01. 회귀 검증
- Related Files: `tests/e2e/regional-elevated.spec.cjs`, `tests/e2e/forest-placement.spec.cjs`, `tests/e2e/bgm.spec.cjs`; add/modify only if actual regression found. `.memory/current.md`, `phase.md`, Task status; update.
- Test the 12 area/round combinations, reachable shots and obstacle interactions, survivor landing, round transition, boss position, BGM absence in production. Keep user-owned unrelated changes out of commits.

### I02. 출시
- Run `npm test`, `npm run build:azure`, selected browser regressions. Commit source/test/Task with message below. Push `main`; monitor `.github/workflows/azure-static-web-apps.yml` through completed success. Verify actual Azure URL serves new build and no BGM controls. On failure, fix cause and repeat relevant tests.

## Acceptance Criteria
- [x] 네 지역의 전장 구도와 판정 회귀 통과.
- [x] GitHub Actions 성공과 Azure 실제 사이트의 새 버전 확인.

## Validation
- `npm test`
- `npm run build:azure`
- `npx playwright test tests/e2e/regional-elevated.spec.cjs tests/e2e/forest-placement.spec.cjs tests/e2e/bgm.spec.cjs`

## Commit Message
```text
test(release): 네 지역 높낮이 전장 출시 검증

Plan: 2026-10-29-regional-elevated-enemies
Phase: P01-regional-placement
Task: T04-release

- 공개 네 지역 플레이와 음악 제외 빌드를 검증
- Azure 출시 준비 상태를 기록
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 단위·API 253개, 공개 전장 필수 13개, 공개 전체 175개 통과 및 실패 4개 수정 후 재검증, 관리자 전체 35개 통과 및 실패 5개 수정 후 재검증, BGM 제외 Azure 빌드
- commit: test(release): 네 지역 높낮이 전장 출시 검증
