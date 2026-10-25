# Task: T01 Forest Log Physics

## Status: done

## Goal
숲 통나무가 실제 이동 궤적에서 적의 몸에 닿을 때만 첫 대상에 피해 3을 준다. 멀리 떨어진 가장 가까운 적에게 자동 피해를 주던 문제를 없앤다.

## Decision Summary
- 숲만 변경한다. 접촉 속도/높이/방향을 사용한 2D 통나무의 중력·회전·착지 후 최대 한 통나무 폭의 마찰 이동을 계산한다.
- 사탕 경로와 독립적으로 통나무의 첫 충돌 시각을 구하고 엔진은 모든 피해를 시간순 한 번만 정산한다. 다른 지역의 기존 효과는 유지한다.

## Implementation
### I01. Pure moving-log solver
- Related Files:
  - `src/game/forestLogPhysics.js` :: `simulateForestLog`, `sampleLogMotion` — 순수 물리 및 보간; new
  - `src/game/shotGeometry.js` :: `planStackedShot`, `planShot` — 충돌 순간 속도를 전달하고 로그 궤적 첨부; modify
#### Details
- **Signatures & Types**:
  ```ts
  type Pose = {time:number,x:number,y:number,angle:number,phase:'airborne'|'sliding'|'settled'};
  type LogHit = {id:string,time:number}; // absolute simulation seconds
  type LogMotion = {samples:Pose[],startTime:number,durationSeconds:number,hit:LogHit|null,
    endPose:{x:number,y:number,angle:number},slideDistance:number};
  simulateForestLog({obstacle,point,velocity,startTime,layout,enemies}): LogMotion | null;
  sampleLogMotion(motion:LogMotion, absoluteTime:number): Pose;
  ```
- **Data & Schema Fields**: `obstacle` is the existing `{id,kind,x,y,width,height,polygon}`; `enemies` are living layout slots with `collider:{id,x,y,radius}`. Pose x/y is body center, angle radians. `contact.logMotion` is Forest-only; add contact summaries `logHit:LogHit|null` and `logEndPose:{x,y,angle}`. A shot exposes `directHitTime:number` and `simulationSeconds:number` including the last log settling; legacy/homing shots may omit new fields.
- **Execution Flow / Logic**:
  1. Validate finite dimensions/velocity/contact, positive rectangle, layout bounds, unique living targets. Invalid input returns null; sampling invalid motion throws TypeError.
  2. Transfer a bounded fraction of candy velocity to log translation, upward impulse and angular velocity depending on normalized contact height. Use gravity 1200 world units/s²; direction follows impact x. Integrate at at most 1/240s with finite max duration. Use an oriented rectangular body matching stack dimensions and circle-vs-body clearance for enemies; conservative advancement within each movement/rotation segment finds earliest contact without tunneling. Deterministic ties follow layout slot order.
  3. Record only the first encountered initially living enemy, stop further damage checks, damp horizontal travel, and let the body settle. Landing uses rotated body's support height, no bounce, friction and a total slide cap of obstacle.width. Clamp at world bounds. Keep final body at ground as persistent debris.
  4. `planStackedShot` already calculates instantaneous candy impact velocity; compute it before adding the contact and call the solver only for Forest log props. Keep candy residual momentum and five-diameter roll budget unchanged. Its path still ends at first candy target. Compute total simulation duration as max(candy finish, log finishes). Never expose future full log path as an aim guide.

### I02. Authoritative damage and metadata
- Related Files:
  - `assets/js/battle-engine.js` :: `createRunState`, `enterRound`, `resolveProjectile` — physical result/time order and persistent end poses; modify
  - `src/game/gameSession.js` :: `fireShot` — validate Forest summary; modify
#### Details
- **Data & Schema Fields**: `run.forestLogDebris: Array<{obstacleId:string,x:number,y:number,angle:number}>`, default/reset `[]`; `shotMeta.directHitTime:number` optional for legacy, required on new Forest contact streams. Forest contacts require finite endPose and nullable logHit with an existing enemy id, time >= contact.time. UI-only samples are not required by the engine. `obstacleEffects` retains `{kind:'log-strike',obstacleId,hits}` and adds `physical:true` for Forest.
- **Execution Flow / Logic**:
  1. Missing/invalid Forest physical metadata cannot fall back to nearest-enemy damage; session rejects malformed payloads before ammo/turn/RNG mutation. Direct legacy calls with no physical hit deal zero Forest log damage.
  2. Build one timeline: contact marks a new stack toppled and saves debris; Forest hit at logHit.time applies damage if its fixed physical target is still alive; direct hit at directHitTime applies existing rolled candy damage. Sort by time, stable contact/log/direct tie precedence. Never retarget a log to a distant enemy when its struck target has already died. Non-Forest regional effects occur at contact time; preserve legacy no-contact behavior.
  3. Deduplicate by obstacleId; add actual HP removed to score and event.hits. Execute finishAction once after the complete timeline, not once per moving body. One ammo and enemy turn per shot; reset debris each round; Chaos random strike remains the old nearest-candidate behavior.

### I03. Regression tests
- Related Files:
  - `tests/forest-log-physics.test.mjs` — hit/miss/slide/direction/height/first target; new
  - `tests/shot-geometry.test.mjs`, `tests/battle-engine.test.cjs`, `tests/game-session.test.mjs` — physical metadata, time order, duplicate and non-Forest behavior; modify
#### Details
- Check distant enemy no hit, airborne/landing/slide hit, leftward impact, weaker momentum shorter travel, contact-height changes, max slide width, body/world bounds, stable sampling, fast swept hit and near miss. Test log hit before/after direct candy, killed-target no retarget, duplicate no damage, score cap and reset. Update obsolete automatic-nearest Forest tests with explicit physical summaries; keep Chaos legacy tests.

## Acceptance Criteria
- [x] A remote log contact cannot damage a monster without body collision; one log hits at most one target.
- [x] Shot damage, score and one-turn behavior follow chronological physical contacts and reset correctly.

## Validation
- `node --test tests/forest-log-physics.test.mjs tests/shot-geometry.test.mjs tests/battle-engine.test.cjs tests/game-session.test.mjs` — pass
- `npm.cmd run build` — pass

## Commit Message
```text
feat(물리): 숲 통나무의 실제 충돌 경로로 피해 계산

Plan: 2026-10-26-forest-log-physics-and-reward-clarity
Phase: P01-physical-feedback
Task: T01-forest-log-physics

- 통나무 비행·낙하·마찰 이동과 첫 적 충돌 계산
- 시간순 피해와 중복 방지 및 지역 효과 회귀 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 59 unit tests and production build passed.
- commit: pending

