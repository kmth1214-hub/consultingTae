# Task: T01 Physical Hit Boundary

## Status: done

## Goal
장애물이 모두 파괴된 뒤에도 일반 사탕은 실제 첫 충돌한 적에게만 직접 피해를 주고 뒤 적과 라운드를 보존한다.

## Decision Summary
- 이미 red인 눈1/seed0/각도7.5/파워.95 fixture를 실제 geometry→engine 경계의 영구 테스트로 먼저 옮긴다.
- 일반 사탕은 최대1 직접 접촉, 창은 실제 접촉 최대3. 지역 장애물의 광역/단일 효과와 유도는 유지.

## Implementation
### I01. 충돌 종료 경계
- Related Files:
  - `src/game/shotGeometry.js` :: `planShot` — modify
  - `assets/js/battle-engine.js` :: `resolveProjectile` — modify
#### Details
```typescript
// 기존 signature/필드 유지. 일반 shot.hitIds 길이는0또는1.
// piercing=true만 enemyContacts 시간/거리 순서로 최대3.
```
- 장애물 없는 branch의 resolvedHits를 항상 impactDistance 이내로 제한하고 일반은첫1개. 현재 rollStartDistance null일 때 전체 hits를 반환하는 분기를 제거.
- 물리 shotMeta가 있고 !spear인 경우 engine hitIds를첫1개로 제한. 기존 abstract metadata 없는 다중 대상 단위 API는 보존. 동일 접촉의 장애물효과는별도 timeline 그대로.
- 실제 피해/score/clear는 제한된 target 기준. 에러와 RNG/강화/아이템 수치 변경 없음.

### I02. 회귀/재현
- Related Files:
  - `tests/shot-hit-integrity.test.mjs` — new
  - `tests/shot-geometry.test.mjs` — 필요한 expectation만 갱신
#### Details
- 실제 눈1 roster와 seed0에서 모든 prop toppled, shot7.5°/.95. 첫 두 적만 생존시켜 실제 두 번째가 죽을 때 잘못된 round clear가 드러나도록 한다. endpoint~908, 뒤 collider x1330. normal hitIds첫1 / 두번째hp4 / terminal아님 / 반격최대1.
- 같은 경로의 창은 직접 닿는 뒤 적에게만 피해. 정상miss(직상/역발사/초과사거리), active props, 유도, rolled contacts 회귀.
- original tmp/remote-hit-probe.mjs green 확인 후 prototype 정리/영구 테스트로 대체.

## Acceptance Criteria
- [x] 원래 remote-hit 재현 green
- [x] 뒤 적 생존 및 잘못된 클리어 없음
- [x] 창/장애물/유도 회귀 없음

## Validation
- `node --test tests/shot-hit-integrity.test.mjs tests/shot-geometry.test.mjs tests/spear-projectile.test.mjs`
- `node tmp/remote-hit-probe.mjs` — 원래 재현 green 후 영구 테스트로 대체

## Commit Message
```text
fix(충돌): 일반 사탕 종료 지점 뒤의 원격 피해 차단

Plan: 2026-10-26-shot-resolution-integrity
Phase: P01-resolution
Task: T01-physical-hit-boundary

- 장애물 소진 후 전체 경로 적이 피해 목록에 남던 원인 수정
- 첫 충돌 뒤 적의 생존과 잘못된 클리어 회귀 검증
- 창의 실제 관통과 지역 장애물 효과 유지
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 원본 CLI green, 영구 회귀 red2→green 및 geometry/spear 검증
- commit: pending
- 기존 geometry 단위 테스트가 첫 적에 멈추면서 뒤 적도 포함하는 잘못된 기대값을 갖고 있었다. 실제 종료 경계에 맞춰 기대값도 수정했다.
