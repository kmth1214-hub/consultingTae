# Task: T02 Enemy Projectile Trail

## Status: done

## Goal
Make the existing enemy projectile arc perceptible by drawing a subtle path behind the moving projectile only while the attack is in its travel stage.

## Decision Summary
- `EnemyResponse` updates projectile position with `x = source.x + (target.x - source.x) * p` and `y = source.y + (target.y - source.y) * p - Math.sin(p * Math.PI) * (visual.breath ? 0 : 75)`.
- Add a visual-only SVG path following that same arc. Breath attacks use a straight path. No combat logic or timing changes.

## Implementation

### I01. Add lifecycle and geometry assertions before production edits
- Related Files:
  - `tests/e2e/enemy-response.spec.cjs` :: `enemy projectile travels from its attacker and HP changes at impact...`; modify.
- In the actual-enemy projectile test, assert `[data-testid="enemy-projectile-trail"]` exists but is hidden before travel, becomes visible when the arena reports `data-enemy-phase="travel"`, and is hidden/removed at impact. Verify its `d` begins at the projectile's source coordinates and ends at the player impact coordinates, with expected `M{x} {y} Q{midX} {controlY} {targetX} {targetY}` geometry; the control point produces the same 75-world-unit apex. Add a second assertion for the `frozen-breath` special setup that its trail is straight.
- Run `npx playwright test tests/e2e/enemy-response.spec.cjs -g "enemy projectile travels"`; confirm it fails because the path does not exist before implementing it.

### I02. Render the travel-only trail
- Related Files:
  - `src/components/EnemyResponse.jsx` :: `EnemyResponse`; add a path before the projectile group in its existing full-arena `<svg>`.
  - `src/styles/arena.css` :: `.enemy-projectile` travel visibility styles; add trail presentation styles.
- Compute `midX = (source.x + target.x) / 2`, `midY = (source.y + target.y) / 2`; use `controlY = visual.breath ? midY : midY - 150`. A quadratic path with these values has a 75-unit midpoint lift, matching the sine arc apex; breath has no lift.
- Add `<path data-testid="enemy-projectile-trail" className="enemy-projectile-trail" d={`M${source.x} ${source.y} Q${midX} ${controlY} ${target.x} ${target.y}`} ... />` with no fill, `--attack-color` stroke, rounded ends, modest opacity, and non-scaling stroke. Keep it behind the projectile.
- Hide the trail by default and show it using `.enemy-response--travel .enemy-projectile-trail`. Do not animate or move the path independently. Keep the parent response's stage lifecycle and reduced-motion policy unchanged.

## Acceptance Criteria
- [x] Test fails before the path exists and passes afterward; path endpoints and apex match current projectile movement.
- [x] Trail appears only during travel and does not alter HP timing, response stages, or combat event count.
- [x] Trail remains legible without overpowering the projectile or blocking the scene.

## Validation
- `npx playwright test --config=tmp/diagnostic.config.cjs tests/e2e/enemy-response.spec.cjs -g "enemy projectile travels"` — failed before implementation, passed after.
- `npx playwright test --config=tmp/diagnostic.config.cjs tests/e2e/enemy-response.spec.cjs` — 11 passed, including shield, special, defeat, and reduced-motion flows.
- `npm.cmd run build` and `git diff --check` — passed.

## Commit Message
```text
기능(전투): 적 투사체 궤적 표시

Plan: 2026-10-22-battlefield-sky-projectile-visibility
Phase: P01-scene-and-projectile-clarity
Task: T02-enemy-projectile-trail

- 적 투사체 이동 경로를 이동 단계에서만 표시한다.
- 포물선 공격과 직선 숨결 공격의 경로 검증을 추가한다.
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
