# Task: T01 물체 운동 접촉

## Status: done

## Goal
기존 통나무 운동으로 다른 재질도 재생하고 회전·낙하·미끄러짐 중 다른 물체와 만나는 최초 시점과 접점 속도를 계산한다.

## Decision Summary
- 외곽의 분리축 간격과 이동·회전 상한으로 보수적 전진을 수행한다. 기존 적 충돌과 바닥 제한은 유지한다.

## Implementation
### I01. 접촉 API
- Related Files: `src/game/forestLogPhysics.js` :: `simulateForestLog`, 신규 `simulateObstacleMotion`, 다각형 접촉 helper; modify
#### Details
- Signature: `simulateObstacleMotion({obstacle,point,velocity,startTime=0,layout,enemies=[],obstacles=[],transfer=false}) => Motion|null`. `simulateForestLog(args)`는 호환 wrapper.
- Motion 기존 samples/startTime/durationSeconds/hit/endPose/slideDistance에 `obstacleHits:Array<{id:string,time:number,point:{x:number,y:number},velocity:{x:number,y:number}}>` 추가. time은 절대, samples.time은 상대 시각.
- 몸체 로컬 polygon(없으면 사각형)을 pose로 회전한다. 대상은 정지한 실제 polygon. 분리축 최대 양의 간격을 translation+cornerRadius*angleDelta 상한으로 나눠 전진한다. 먼 쌍은 swept AABB로 제외한다.
- 접점에서 중심 이동+각속도의 접선 속도를 기록한다. 속도80미만 무시, 대상당 최초 한 번. 접점은 두 외곽의 가까운 점으로 구한다.
- transfer=false의 수평 .30은 기존대로, true는 .65. 수평 최대650, 중력1200, 회전/한 폭 미끄러짐/첫 적 충돌만 타격은 기존대로. 무효 입력은 null, 입력은 불변.
### I02. 검증
- Related Files: `tests/forest-log-physics.test.mjs`; modify
- 가까운 외곽 접촉, 좌우 방향, 빠른 이동, 반복 중복 없음, 약한 속도, 재질 외곽, 입력 불변 및 기존 적 물리 회귀를 검사한다.

## Acceptance Criteria
- [x] 실제 경로에 닿은 대상만 절대 시간·유한 속도로 기록된다.
- [x] 기존 통나무/NPC API 및 결과를 유지한다.

## Validation
- `node --test tests/forest-log-physics.test.mjs`
- `npm.cmd run build`

## Commit Message
```text
feat(장애물): 회전 물체의 접촉 시점과 전달 속도 계산

Plan: 2026-10-26-obstacle-chain-reactions
Phase: P01-chain
Task: T01-motion-contacts

- 물체 외곽의 연속 충돌 검사와 전달 운동 추가
- 기존 통나무와 적 충돌 규칙 회귀 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- validation: 단위 6/6 및 production build 통과
- commit: 03921dd
