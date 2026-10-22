# Task: T01 마찰 기반 지면 굴림 기하

## Status: done

## Goal
기존 사탕 탄도 경로가 지면에 닿은 뒤 실제 수평 속도와 고정 마찰 감속을 사용해 최대 사탕 지름 5배까지 굴러가게 하고, 굴림 구간에서 먼저 만나는 적 또는 장애물을 정확히 판정한다.

## Decision Summary
- 월드 단위 최대 굴림 거리는 `5 * (2 * candyRadius)`이며 현재 값은 100이다. 실거리는 지면 도달 시 수평 속도와 마찰에 따라 더 짧을 수 있다.
- 적과 장애물 중 경로상 먼저 닿은 하나에서 멈춘다. 유효 경로는 사탕의 화면 애니메이션과 이후 엔진 처리의 공통 기준이다.

## Implementation

### I01. 굴림 경로 생성 및 탄도 경로 결합
- Related Files:
  - `src/game/battlefieldModel.js` :: `BATTLEFIELD`; modify — 마찰 상수 추가
  - `src/game/shotGeometry.js` :: `getBallisticPath`, `makePath`, `planShot`, 새 `appendGroundRoll`; modify
  - `tests/shot-geometry.test.mjs`; modify

#### Details
- **Signatures & Types**:
  ```typescript
  type Vec2 = {x:number;y:number};
  type Sample = Vec2 & {time:number;distance:number};
  type ShotPath = {kind:'ballistic'|'homing';start:Vec2;end:Vec2;samples:Sample[];
    length:number;durationSeconds:number;endKind:'ground'|'bounds'|'timeout'|'target';
    homingTargetId:string|null;d:string;rollStartDistance:number|null};
  type GroundRoll = {path:ShotPath;rollStartDistance:number;rollDistance:number};
  appendGroundRoll(path:ShotPath,horizontalSpeed:number,layout:BattlefieldLayout):GroundRoll;
  ```
- **상수·데이터**:
  - `BATTLEFIELD.maxRollDiameters = 5`; `BATTLEFIELD.groundRollDeceleration = 16000` world units/s². 최대 거리는 `layout.candyRadius * 2 * maxRollDiameters`; 상수와 감속은 초당 월드 단위이며 CSS/camera scale과 무관하다.
  - `ShotPath.rollStartDistance`는 굴림 구간의 시작 arc distance로, 굴림이 없으면 `null`이다. `GroundRoll.rollDistance`는 실제 수평 이동량의 절댓값이다.
  - `appendGroundRoll` 입력은 `endKind==='ground'`인 유효 탄도 경로, 유한한 signed 수평 속도, 유효 layout이어야 한다. 잘못된 입력은 `TypeError`를 던진다.
- **실행 흐름**:
  1. ballistic 속도를 `BATTLEFIELD.minSpeed + (maxSpeed-minSpeed)*clamp(powerRatio,0,1)`로 복원하고 `vx=direction.x*speed`를 사용한다. `planShot`은 그 속도를 `getBallisticPath`와 함께 전달한다.
  2. 지면 정지 거리는 `min(vx²/(2*groundRollDeceleration), maxRollDistance)`이고 이동 부호는 `vx` 부호를 따른다. `|vx| < 1 world unit/s`이면 0으로 처리한다. 끝점은 `[−candyRadius, width+candyRadius]` 범위에서 경계에 도달하면 더 짧게 자른다.
  3. 굴림 시간은 일정 감속 운동식 `t=(|vx|-sqrt(max(0,vx²-2*a*d)))/a`를 사용한다. 점 간격은 최대 4 world units이며 각 sample은 시간·누적 거리 모두 기존 마지막 sample보다 엄격히 증가한다. 굴림 시작은 ballistic ground sample과 중복 저장하지 않는다.
  4. 새 path의 `d`, `length`, `durationSeconds`, `end`, samples를 동일 sample 데이터에서 다시 계산한다. `sampleAtDistance`/`pathPrefixD`가 굴림부를 동일하게 보간하도록 기존 계약을 유지한다.
  5. Wind homing (`path.kind==='homing'`)과 bounds/timeout 종료에는 굴림을 추가하지 않는다.

### I02. 굴림구간 적·장애물 우선 충돌
- Related Files:
  - `src/game/shotGeometry.js` :: `findObstacleContact`, `circleContact`, `planShot`; modify
  - `src/game/battlefieldModel.js` :: `Obstacle`, `BattlefieldLayout`; read-only consumer
  - `tests/shot-geometry.test.mjs`; modify
- **반환 계약**: `ShotSolution`에 `rollStartDistance:number|null`, `rollDistance:number`, `obstacleKind:'log'|'ice'|'crate'|null`, `obstacleTargetIds:string[]`를 추가한다. `obstacleTargetIds`는 장애물 impact point부터 살아 있는 적 collider까지의 거리가 가까운 순서이며 동률은 기존 slot 순서다.
- **실행 흐름**:
  1. 기존 ballistic sample에서 swept-disc 충돌을 먼저 계산한다. 지면보다 앞선 최초 적/장애물 충돌 또는 `endKind!=='ground'`면 기존처럼 해당 지점에서 종료하고 굴림은 0이다.
  2. 탄도체가 다른 충돌 없이 지면에 닿으면 굴림 samples를 붙인다. 굴림 구간에서 각 적 원과 장애물 polygon의 swept-disc 접촉을 계산하여 가장 작은 arc distance를 선택한다. 같은 위치에 적/장애물이 있으면 장애물이 이긴다(기존 `EPS=1e-6`).
  3. 비행 중 기존처럼 첫 적부터 장애물 직전까지의 ordered `hitIds`를 보존한다. 굴림 중 적에 먼저 닿았으면 그 적 한 명만 `hitIds`에 추가하고 `impactKind='enemy'`로 멈춘다. 적 접촉 이후의 다른 적은 굴림 hit 목록에 넣지 않는다.
  4. 장애물 충돌은 `impactKind='obstacle'`, 실 충돌 id/kind와 접촉 지점을 반환한다. 바람궁수 우회 path는 단일 선택 target hit, 장애물 효과 없음 규칙을 유지한다.
  5. 충돌이 없고 굴림이 진행됐다면 `impactKind='ground'`, `impactDistance=path.length`다. 굴림 없는 땅/경계 종료도 기존 유효 결과를 유지한다.

## Acceptance Criteria
- [ ] 최대 굴림 거리가 정확히 100 world units이고 약한 수평 속도에서는 마찰에 따라 더 짧게 끝난다.
- [ ] 후진·수직·지면 근처·경계 굴림의 속도 부호와 정지점을 처리한다.
- [ ] 굴림 중 적/장애물/동시 접촉을 swept-disc 방식으로 판정하며 장애물이 동률 우선이다.
- [ ] 새 path sample은 `sampleAtDistance`에서 유한·단조 증가하며, 30% 조준 미리보기/ Wind path 규칙은 유지된다.

## Validation
- `node --test tests/shot-geometry.test.mjs tests/battlefield-model.test.mjs` — 기존 지형/경로 회귀와 새 굴림 경계·충돌 케이스 통과.
- `git diff --check` — 공백 오류 없음.

## Commit Message
```text
기능(전투): 사탕 지면 굴림 경로 계산

Plan: 2026-10-22-candy-roll-obstacle-interactions
Phase: P01-candy-roll-combat
Task: T01-ground-roll-geometry

- 최대 지름 5배의 마찰 기반 굴림 경로를 추가한다.
- 굴림 중 적과 장애물의 첫 충돌을 판정한다.
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: created
