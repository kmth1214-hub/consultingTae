# Task: T02 Momentum-Based Projectile Chain

## Status: done

## Goal
A candy hitting a standing stack loses speed yet may fly or roll to more stacks and a monster. The visible projectile path and collision order must use one world-unit simulation.

## Decision Summary
- Impact speed incorporates pull power, angle and flight time. High-speed candy continues slower; low-speed candy falls and may roll. One shot can hit several *distinct* stacks. A direct monster hit ends it. Wind Archer's homing bypasses stacks.

## Implementation
### I01. Segmented flight and contact stream
- Related Files:
  - `src/game/shotGeometry.js` :: `getBallisticPath`, `appendGroundRoll`, `findObstacleContact`, `planShot`, `sampleAtDistance` — modify
  - `src/game/battlefieldModel.js` :: world-unit momentum constants — modify if needed
  - `tests/shot-geometry.test.mjs` :: chain/roll/boundary cases — modify
#### Details
- **Signatures & Types**: `planShot({layout,pull,enemies,windAvailable=false,toppledObstacleIds=[]}): Shot|null`; preserve path/hitIds/impactKind/impactDistance/durationMs/previewD compatibility. Add `contacts:Array<{obstacleId:string,obstacleKind:'log'|'ice'|'crate',point:{x:number,y:number},distance:number,time:number,rolling:boolean,obstacleTargetIds:string[]}>`. `path.samples[]` retain finite strictly increasing time and distance. Keep first-contact obstacleId/obstacleKind aliases while consumers migrate.
- **Execution Flow / Logic**: for each ballistic or roll segment compare first swept-disc stack and living-enemy contact; obstacle wins an exact tie. Derive velocity at an airborne contact using `vy(t)=vy0+gravity*t`, and roll velocity from friction. Mark the contacted stack ignored for the rest of this shot. High impact speed resumes from just beyond contact with an explicit speed-loss factor; low speed drops to ground and can roll. Re-enter the contact loop until an enemy, boundary, timeout or rest; bound loops by stack count plus terminal event. Preserve a *total*, not per-segment, five-diameter roll limit and continuous world-coordinate path for camera/player. Wind homing contacts remain empty. Prefix preview still reveals only the faint first 30%.
- **Errors**: reject invalid input using existing null/TypeError conventions. Avoid zero-length duplicate samples, infinite loops, teleportation and collision tunneling.

## Acceptance Criteria
- [ ] High-speed shot records multiple ordered distinct contacts and can still direct-hit; low-speed shot falls/rolls.
- [ ] Debris ids passed in `toppledObstacleIds` cannot collide; Wind homing remains unobstructed.
- [ ] Ground roll never exceeds 100 world units in total after any number of contacts.

## Validation
- `node --test tests/shot-geometry.test.mjs` — pass, including original reachability tests.
- `npm run build` — pass.

## Commit Message
```text
feat(투사체): 충돌 속도에 따라 이어지는 연쇄 궤적 구현

Plan: 2026-10-23-toppling-stacked-obstacles
Phase: P01-stacked-battlefield
Task: T02-momentum-chain

- 공중과 굴림 접촉의 순서와 잔여 속도 계산
- 장애물 연쇄 충돌 뒤 적 명중과 바람궁수 예외 유지
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in Git history
