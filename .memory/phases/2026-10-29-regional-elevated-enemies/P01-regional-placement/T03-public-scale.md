# Task: T03 공개 게임 1.5배 월드

## Status: done

## Goal
관리자 시범판의 실제 월드 물체·충돌 판정 1.5배를 네 지역 공개 게임에 적용해 몬스터 식별성과 받침 고저차를 개선한다.

## Decision Summary
- 사용자 결정 D06: 이번 배포의 일반 게임도 1.5배. 사탕·장애물·쿠키·새총·몬스터가 함께 커진다.
- 월드 폭·높이 3600×1200은 유지하고, 보스의 일반 몬스터 대비 비율과 기존 지역 효과는 유지한다.

## Implementation

### I01. 공개 세션 월드 스케일
- Related Files: `src/game/gameSession.js` :: `assignLayoutSeed`; `src/components/BattleArena.jsx` :: `buildPlayableBattlefield` 호출과 boss-transition layout; `src/game/shotResolution.js` :: `preparePhysicalFlight`; modify.
- Data & Schema: `run.battlefieldWorldScale:1.5` for public run; `run.studioWorldScale?:1.5` remains admin-only. All consumers use `run.studioWorldScale ?? run.battlefieldWorldScale ?? 1` and the same layout seed. `layout.worldScale=1.5`, `candyRadius=15`. Canvas viewport and world bounds remain unchanged.
- Flow: assign scale when starting/advancing a real run. Preview, flight, boss split, enemy response, minimap, rendered body all use the same scaled layout. Studio remains 1.5 and private abilities remain gated by `studioPrototype`, not scale. Do not infer scale from CSS zoom.

### I02. 샷 도우미와 회귀 검증
- Related Files: `tests/public-forest-placement.test.mjs`, `tests/regional-elevated-placement.test.mjs`, `tests/e2e/support.cjs`, `tests/e2e/spear-support.cjs`, `tests/e2e/regional-elevated.spec.cjs`, `tests/e2e/forest-placement.spec.cjs`; modify only expectations and physical shot setup to use public scale. Additional affected e2e fixtures only if a concrete failure appears.
- Test that actual `preparePhysicalFlight` start point equals scaled pouch, collision circles/obstacle footprints enlarged, five-diameter roll scales with candy, supported enemy fall survives, boss ratio unchanged, public screen has 1.5 scale, and mini map stays aligned. The public shot solvers must use `worldScale:1.5` and the active prototype; the studio solver keeps its own 1.5 setup.
- Existing no-prototype `buildBattlefield` tests retain their explicit scale-1 baseline.

## Acceptance Criteria
- [ ] 공개 네 지역에서 쿠키·새총·적·장애물·사탕의 월드 크기와 판정이 1.5배로 일치한다.
- [ ] 보스 비율과 월드 범위는 유지되고 받침 타격 및 착지 좌표가 일치한다.
- [ ] 관리자 전용 사탕 능력은 공개 게임에 나타나지 않는다.

## Validation
- `node --test tests/public-forest-placement.test.mjs tests/regional-elevated-placement.test.mjs tests/regional-elevated-combat.test.mjs tests/shot-hit-integrity.test.mjs`
- `npx playwright test tests/e2e/regional-elevated.spec.cjs tests/e2e/forest-placement.spec.cjs`
- `npm run build`

## Commit Message
```text
feat(battlefield): 일반 게임 전장 물체 크기 1.5배 적용

Plan: 2026-10-29-regional-elevated-enemies
Phase: P01-regional-placement
Task: T03-public-scale

- 공개 게임의 캐릭터·새총·사탕·장애물과 충돌 판정을 함께 확대
- 네 지역의 발사와 받침 낙하를 동일 월드 좌표로 유지
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 단위 테스트 16개, 공개 브라우저 테스트 12개, Vite 빌드
- commit: feat(battlefield): 일반 게임 전장 물체 크기 1.5배 적용
