# Task: T02 시간순 연쇄와 전투 화면

## Status: done

## Goal
물체 접촉이 다음 물체의 운동·지역 효과로 이어지고 연쇄 전체가 화면에서 재생된다.

## Decision Summary
- 사탕과 물체 충돌 중 먼저 일어난 것만 처리한다. 물체당 라운드1회, 기존 지역 효과와 입력/반격 흐름 유지.

## Implementation
### I01. 연쇄 계획
- Related Files: `src/game/shotGeometry.js` :: `planStackedShot`; modify
#### Details
- Contact 신규 필드: `trigger:'candy'|'obstacle'`, `sourceObstacleId:string|null`, `chainDepth:number`, `direction:-1|1`, `obstacleMotion:Motion|null`, `obstacleEndPose:{x:number,y:number,angle:number}|undefined`. 숲 logMotion/logHit/logEndPose 호환 별칭 유지.
- activate는 used에 먼저 등록하고 simulateObstacleMotion을 호출한다. 숲 통나무만 enemies를 전달한다. obstacleHits를 source id/depth/속도와 함께 큐에 넣는다.
- 다음 사탕 충돌/종료 시각까지 큐를 시간순 처리한다. 이미 활성화한 대상은 건너뛴다. 큐가 사탕의 다음 장애물을 먼저 쓰러뜨리면 장애물 접촉을 재계산한다. 사탕 종료 후 남은 큐도 처리한다. 활성화 최대 횟수는 물체 수다.
- contacts는 시간순·동시 생성순으로 정렬. 완성 path에서 contact.time을 clamp한 사탕 distance를 부여한다. blockerDistance는 사탕의 첫 충돌 거리, 기존30% 미리보기 유지. simulationSeconds는 모든 운동 정지까지 확장. 유도탄 우회 분기 유지.
### I02. 전투와 입력 검증
- Related Files: `src/game/gameSession.js` :: `fireShot`; `assets/js/battle-engine.js` :: RunState/enterRound/resolveProjectile; modify
- RunState `obstacleDebris:Array<{obstacleId:string,x:number,y:number,angle:number}>` 기본[], 라운드초기화. forestLogDebris 호환 유지, 비숲 자세는 obstacleDebris에 저장.
- session 신규 메타데이터가 있으면 trigger/부모 선행/depth/유한 direction/endPose를 검증하고 과거 payload도 허용한다. `directHitTime>=contact.time`은 candy에만 적용(연쇄는 사탕 종료 후 가능).
- 엔진 기존 활성화→물리 NPC타격→사탕타격 타임라인 유지. 중복 id 효과/점수/잔해 추가 금지. 숲 logHit만 피해3, 눈 .5배 갱신(중복 누적 금지), 도시 각 새 물체당 생존 전체1~2, 혼돈 기존 네 후보.
### I03. 표시
- Related Files: `src/components/ArenaScenery.jsx` :: physical branch/advance; `src/components/BattleArena.jsx` :: completeFlight/showFlightContacts/onProgress; `src/components/ProjectileFlight.jsx` :: tick 종료 처리; modify
- obstacleMotion(과거 logMotion fallback)으로 모든 재질 재생. StackBody(kind,chaos)로 얼음/상자의 그림 유지. 두 debris 배열에서 최종 자세 복원.
- source/depth data 속성, 방향은 contact.direction 우선. 샘플 대용량 배열은 전투 payload에서 제거.
- 마지막 운동 물체를 추적하고 전체 종료 뒤 기존2초 확인 유지. frost/burst는 실제 contact.time에 맞춰 활성화.
### I04. 회귀
- Related Files: `tests/shot-geometry.test.mjs`, `tests/game-session.test.mjs`, `tests/battle-engine.test.cjs`, 신규 `tests/e2e/obstacle-chain.spec.cjs`; modify|new
- A→B→C에서 사탕이 B/C에 직접 닿지 않아도 연쇄, 큰 틈 중단, 역방향, 중복 경쟁, 사탕 종료 뒤 전파, 숲 실제 적 타격, 지역 효과/점수1회, 재질/잔해/카메라/모바일 검증.
- support installGame과 검증한 seed/각도/power를 사용. 좁은 타이밍 검사는 page.clock을 pauseAt으로 고정.

## Acceptance Criteria
- [x] 실제 물체 간 접촉으로 후속 물체가 쓰러지는 모습이 재생된다.
- [x] 원거리/중복 반응 없이 지역 효과와 기존 발사 흐름을 유지한다.

## Validation
- `npm.cmd test`
- `npm.cmd run build`
- `npx.cmd playwright test obstacle-chain.spec.cjs forest-log.spec.cjs wide-battlefield.spec.cjs regional-obstacle-effects.spec.cjs --config tmp/chain-playwright.config.cjs --workers=2 --timeout=60000` — 자체 preview4192, 점유시 빈포트. 검증 후 자체 프로세스/config만 정리.
- 영향 범위 추가 E2E 및 시각 검사.

## Commit Message
```text
feat(장애물): 물체 충돌의 연쇄 반응과 지역 효과 연결

Plan: 2026-10-26-obstacle-chain-reactions
Phase: P01-chain
Task: T02-chain-playback

- 사탕과 물체 충돌을 시간순으로 합쳐 각 물체 한 번만 활성화
- 재질별 낙하와 최종 위치 및 연쇄 카메라 연결
- 지역 효과와 중복 방지 및 실전 연쇄 회귀 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- validation: 단위 137/137, production build 통과. E2E 26개 범위 검증 통과(기존16 + 신규연쇄5 + 굴림/준비5).

## 검증 메모
- 신규 E2E 관찰 코드가 session의 나중 메타데이터 부착보다 먼저 이벤트를 복사하는 문제를 수정했다. 입력 메타데이터를 직접 관찰한다.
- 도시 시나리오는 직접 사탕 명중 피해2도 발생하므로 연쇄 범위피해와 직접 피해를 분리해 검증한다. 적 수리 능력은 별도 기존 테스트에 두고 해당 시나리오의 적을 세탁 로봇으로 고정한다.
- 연쇄가 사탕보다 오래 남는 경우 착지 사탕이 숨겨지던 재생 경계를 함께 수정해 2초 확인 중 정지 사탕을 표시한다.
- 이미 쓰러진 물체 사이의 재충돌은 이번 범위에서 제외. 추가 발견 사항 없음.
