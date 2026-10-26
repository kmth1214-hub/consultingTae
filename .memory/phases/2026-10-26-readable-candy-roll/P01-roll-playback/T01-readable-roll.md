# Task: T01 읽을 수 있는 사탕 굴림

## Status: done

## Goal
착지한 사탕의 지면 이동·회전이 220ms 이상 관측되며 먼지가 사탕을 따라온다.

## Decision Summary
- 기존 굴림은 실제90ms로 지나가 보이지 않는다. 렌더링 시계만 늦추고 물리 샘플과 판정은 유지한다.
- animation transform이 월드 위치 transform을 덮어쓰지 않도록 그룹을 분리한다.

## Implementation

### I01. 구간별 표시 시계
- Related Files:
  - `src/game/projectilePlayback.js` :: `createProjectilePlayback`; new
  - `src/components/ProjectileFlight.jsx` :: effect tick, rolling visuals; modify
  - `src/game/shotGeometry.js` :: path and time sampling; read-only
- Signature: `createProjectilePlayback(flight, {reducedMotion=false}={}) -> {durationMs:number, sampleTime:(elapsedMs:number)=>number}`.
- flight fields: 기존 `{path:{samples:Array<{x,y,time,distance}>,durationSeconds},rollStartDistance:number|null,directHitTime:number,simulationSeconds:number,durationMs:number,impactDistance:number}`.
- rollStartDistance에서 바닥 y를 얻고, 그 이후 연속한 바닥 수평 샘플 구간을 찾는다. time/거리는 기존 samples만 사용한다.
- 각 구간의 기본 표시 속도는 기존 durationMs/simulationSeconds. 지면 구간은 max(기본 시간,min(440,240+distance*2))ms로 보장한다. 비행과 통나무 후행은 원래 속도. 경계는 연속·단조 sampleTime으로 대응한다.
- 모션 감소는80ms로 전체 시뮬레이션을 대응한다. elapsed 범위는0..durationMs로 제한한다. 비굴림은 기존 재생 유지.
- tick은 이 시계로 simulationTime을 구해 기존 onProgress·접촉·통나무 연동을 보존한다. 완료는 표시 시계 끝에서1회 실행한다.
- 사탕 회전은 굴림 시작시 회전에 `(x-startX)/radius*180/pi`를 더해 이음새·역방향을 보존한다. 먼지는 외부 위치 그룹/내부 CSS 그룹으로 나누고 진행 반대쪽에 둔다. 지면 그림자는 별도 고정 타원으로 둔다.

### I02. 재현·회귀
- Related Files:
  - `tests/e2e/candy-roll-visibility.spec.cjs` :: 고정 시계 실제 마우스 발사; new
  - `tests/projectile-playback.test.mjs` :: 시간 연속성·구간·모션 감소; new
- 수정 전 브라우저 실행 결과6프레임으로 실패. 수정 후220ms 이상,8개 이상 서로 다른 자세, 먼지 거리85px 미만.
- 시간 매핑이 단조이고 지면 외 시간을 유지하는지, 굴림 없음·역발사·통나무 후행·모션 감소를 검증한다.

## Acceptance Criteria
- [x] 지면 회전·이동이 읽을 수 있는 시간 동안 표시된다.
- [x] 먼지와 그림자가 사탕 지면 위치를 따라온다.
- [x] 최대 지름5배 및 기존 전투/접촉/로그 재생 유지.

## Validation
- `npm.cmd test`, `npm.cmd run build`.
- `npx.cmd playwright test tests/e2e/candy-roll-visibility.spec.cjs tests/e2e/obstacle-effects.spec.cjs tests/e2e/forest-log.spec.cjs tests/e2e/regional-obstacle-effects.spec.cjs --config tmp/roll-vfx-playwright.config.cjs` (별도4192 preview).
- 일반/역방향 굴림 캡처 및 바닥 레이어 확인. 임시 preview/config 정리.

## Commit Message
```text
fix(사탕): 착지 후 굴림 표시 시간과 먼지 추적 보완

Plan: 2026-10-26-readable-candy-roll
Phase: P01-roll-playback
Task: T01-readable-roll

- 약90ms로 지나가던 지면 구간을 표시 시계에서 확장
- 굴림 거리와 충돌은 유지하고 회전·그림자·먼지 위치 보완
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending

## Validation Results
- 수정 전 `npx.cmd playwright test tests/e2e/candy-roll-visibility.spec.cjs --config tmp/roll-vfx-playwright.config.cjs`: 고정 시계6프레임으로 실패. 표시90.32ms를 실제 궤적 계산으로 재현했다.
- 수정 후 동일 재현 통과. 정방향50.18 월드 단위의 굴림 표시는340.36ms이며 궤적 샘플은 변경하지 않는다.
- `npm.cmd test`: 125/125 통과. `npm.cmd run build`: 성공.
- 지정된 브라우저 회귀13/13 통과: 정/역 굴림 시간·먼지 위치, 숲 물리 충돌, 눈/도시/혼돈 효과, 모바일 모션 감소.
- 캡처 `tmp/candy-roll-forward.png`, `tmp/candy-roll-reverse.png`에서 사탕·그림자가 전경에 가려지지 않고 지면에 표시됨을 확인했다.
- 재발 방지: 기존 테스트는 굴림 메타데이터만 확인했다. 새 테스트는 고정된 브라우저 시계로 실제 표시 프레임·지속 시간·먼지 화면 좌표를 검증한다.
- 물리 계산/피해 엔진은 수정하지 않았고, 임시 계측은 테스트 파일에만 있다. 특이사항 없음.
