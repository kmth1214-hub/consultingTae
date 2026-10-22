# Task: T03 React 굴림·효과 피드백 및 조작 반전

## Status: done

## Goal
사용자가 사탕의 착지 후 굴림과 장애물 효과를 알아볼 수 있고, 혼돈의 1회 조작 반전도 버그로 오인하지 않도록 실제 전투 화면에 표현한다.

## Decision Summary
- T01의 동일 sampled path로 투사체를 ground-roll 구간까지 애니메이션하고, 첫 적/장애물 impact에서 엔진을 한 번만 호출한다.
- 혼돈 반전은 다음 발사 전 한 번만 양 축 입력을 뒤집고 소비하며, armed 상태와 조준 중 반전 상태를 한국어 HUD 안내로 표시한다.

## Implementation

### I01. 경로 impact metadata를 세션으로 전달
- Related Files:
  - `src/game/shotGeometry.js` :: `planShot`; T01 consumer — `rollStartDistance`, `obstacleKind`, nearest-first target ids 포함
  - `src/components/BattleArena.jsx` :: `makeSolution`, `completeFlight`; modify
  - `src/game/gameSession.js` :: `fireShot`; T02 consumer — validated metadata only
- **전달 규격**:
  ```typescript
  type Flight = ShotSolution & {id:number;fireball:boolean};
  type ShotMeta = {impactKind:'enemy'|'obstacle'|'ground'|'bounds'|'timeout';
    obstacleId:string|null;obstacleKind:'log'|'ice'|'crate'|null;
    obstacleTargetIds:string[];rolling:boolean;reverse:boolean};
  ```
- **흐름**: `completeFlight`는 `sampleAtDistance(shot.path,shot.impactDistance)`를 ContactEffect에 제공하고 shot solution 필드로 ShotMeta를 구성한다. `rolling=true`는 `impactDistance > rollStartDistance`인 경우로 정의한다. 직접 effect/damage를 React에서 계산하지 않는다. Wind path는 rolling=false와 장애물 값 null이다.

### I02. 굴림 투사체 애니메이션과 충돌 표현
- Related Files:
  - `src/components/ProjectileFlight.jsx` :: progress `tick`; modify
  - `src/components/BattleArena.jsx` :: projectile state, `ContactEffect`, arena attributes; modify
  - `src/components/ArenaScenery.jsx` :: `ContactEffect`; modify
  - `src/styles/arena.css` :: projectile/impact presentation; modify
  - `tests/e2e/obstacle-effects.spec.cjs`; new
- **세부 동작**:
  1. `ProjectileFlight.tick`는 기존 `sampleAtDistance(path,progress*impactDistance)`로 굴림을 포함한 path를 재생한다. `rollStartDistance`를 처음 넘을 때 회전 속도를 높이고 저상 먼지/잔디 스침 trail을 표시한다. 시스템 reduced-motion이면 회전·먼지를 끄되 sample 위치와 impact 결과는 유지한다.
  2. `ContactEffect`는 장애물 id와 kind에 맞는 간단한 파편/흔들림/시럽 burst를 구분한다. 장식 애니메이션은 고정된 `lastImpact.id`를 key로 쓰고 어떤 엔진 상태도 변경하지 않는다.
  3. 결과 메시지는 `obstacleEffect.kind`에 따라 통나무 타격, 얼음 방어 준비, 항아리 범위 피해, 혼돈 조작 반전을 명확히 알린다. 기존 메시지/공격 피드백이 동시에 중복 노출되지 않게 `BattleScreen`의 한 개 combatMessage에 우선순위를 둔다. 피해 hit popup은 기존 MonsterGroup 경로를 쓴다.
  4. passive observable 속성 `data-impact-kind`, `data-obstacle-id`, `data-roll-start-distance`, `data-obstacle-effect`를 제공하여 실제 플레이와 테스트가 애니메이션/발동 결과를 확인하게 한다. 액션을 실행하는 debug API를 추가하지 않는다.

### I03. 혼돈 1회 반전 입력과 HUD
- Related Files:
  - `src/game/useAimController.js` :: `useAimController`, `move`; modify
  - `src/components/BattleArena.jsx` :: controller props, instruction/HUD; modify
  - `src/components/BattleScreen.jsx` :: event summary; modify
  - `src/styles/arena.css`; modify
  - `tests/e2e/obstacle-effects.spec.cjs`; new or T02-created
- **입력 계약**: 훅 입력에 `invertDirection:boolean`을 추가하고 ref `latest.current`에 보관한다. `getPull(delta,maxDragPx)`가 만든 `direction`을 invert가 켜졌을 때 `{x:-direction.x,y:-direction.y}`로 변환한다. 거리/power/dead zone은 바꾸지 않는다. 같은 `ShotSolution`에 변환된 방향을 넣어 preview/flight/impact가 같다.
- **소비 규칙**: `pendingAimInversion`은 엔진 accepted shot에서만 clear된다. pointer cancel, launch 계산 실패, pointer up dead-zone, enemy response, invalid action은 소비하지 않는다. fire 후 다음 aim에는 정상 입력이 온다. 우회 캐릭터의 기존 reverse/Wind 규칙을 변경하지 않는다.
- **표현**: `pendingAimInversion`일 때 맵 HUD에 “혼돈의 역풍: 다음 한 발 조작 반전”을 표시한다. 조준 중에는 “드래그 방향이 반대로 적용 중” 안내를 추가하고, power/angle 숫자는 공개하지 않는다. `aria-live="polite"`를 사용한다. session UI state와 engine state가 분리되지 않게 `run.pendingAimInversion`을 source of truth로 사용한다.

## Acceptance Criteria
- [x] 사탕이 지면 위 굴림 경로를 실제로 회전하며 따라가고 첫 impact에서 멈춘다.
- [x] impact 이벤트/점수/적 체력 변화가 정확히 한 번 처리되며 feedback은 효과 종류와 실제 적중 대상을 반영한다.
- [x] 혼돈 반전은 다음 한 발의 양 축 조준만 뒤집고 취소/실패에는 남으며 발사 뒤 정상화된다.
- [x] 키보드 접근성, reduced motion, 기존 item lock/response/기존 캐릭터 동작을 유지한다.

## Validation
- `npm.cmd run build` — React/Vite 빌드 통과.
- `node --test tests/game-session.test.mjs tests/shot-geometry.test.mjs` — 순수 경로/세션 전달 회귀 통과.
- `npm.cmd run test:e2e -- tests/e2e/obstacle-effects.spec.cjs` — 실제 pointer drag, ground roll, 장애물 효과, Chaos 반전 소비 시나리오 통과.
- `git diff --check` — 공백 오류 없음.

## Commit Message
```text
기능(UI): 사탕 굴림과 혼돈 조작 반전 표현

Plan: 2026-10-22-candy-roll-obstacle-interactions
Phase: P01-candy-roll-combat
Task: T03-react-roll-and-controls

- 굴림 경로와 지역별 충돌 피드백을 전투 화면에 연결한다.
- 혼돈의 다음 한 발 조작 반전과 취소/소비 규칙을 표현한다.
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`22` unit tests; `21` Playwright tests; production build; `git diff --check`)
- commit: `기능(UI): 사탕 굴림과 혼돈 조작 반전 표현`
