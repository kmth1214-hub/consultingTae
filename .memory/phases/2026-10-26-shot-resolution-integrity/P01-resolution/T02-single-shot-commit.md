# Task: T02 Single Shot Commit

## Status: done

## Goal
하나의 물리 발사에 탄약소모·피해·반격·스테이지 진행이 한 번만 발생하고 취소/지연/중복 콜백은 새 행동에 영향을 주지 않는다.

## Decision Summary
- 현재 세션이 UI hitIds를 그대로 신뢰하고 발사 식별자를 갖지 않아 동일 완료가 새 행동으로 수락된다. 세션 소유 궤적 예약을 도입한다.
- 별도 시간 지연이나 피해 추측으로 막지 않고 실제 action id/context와 저장된 geometry 결과로 검증한다.

## Implementation
### I01. 세션의 발사 계약
- Related Files:
  - `src/game/gameSession.js` :: createGameSession/actions — modify
  - `src/game/shotResolution.js` — new (canonical payload 변환)
#### Details
```typescript
type PendingShot={shotId:number;encounterId:number;flight:ShotSolution}; // private closure, default null
beginShot({launchId:number,pull:{direction:{x:number,y:number},powerRatio:number,ready:true}}):
  {accepted:true,shotId:number,encounterId:number,flight:ShotSolution}|{accepted:false,reason:string};
cancelShot(shotId:number):void;
fireShot({shotId?:number,encounterId?:number,hitIds?:string[],shotMeta?:object,reviewResult?:boolean}):CombatEvent;
```
- assignLayoutSeed가 새 round/run 진입마다 run.encounterId를 세션 단조증가값으로 설정. run seed는 기존 RNG와 독립 유지.
- beginShot은 battle/terminal/탄약/리뷰/반격/분리/중복pending/유효pull과 launchId 검증 후 현재 run과 buildPlayableBattlefield/planShot으로 결과를 계산. run.chaosBossPhase split 배치 반영. wind/spear/toppled flags를 현재 run으로 결정. event sequence로 shotId를 발급하고 private pending에 저장; 반환 flight에는 해당id와encounterId 및 고정 modifier 포함.
- UI preview는 같은 planShot을 쓰되 실제 발사 flight는 beginShot의 반환값을 사용. 발사 중 반격/아이템/abstract fire를 차단.
- physical fire는 shotId/encounterId가 pending 및 현재 run과 일치해야 하고 저장된 flight로 payload를 생성. 외부 hitIds/shotMeta와 selectedTarget은 덮어써 전투 권위로 사용하지 않는다. 성공 시 pending을소비하고 단한번 resolveProjectile. 실패/중복/이전round/새run은 탄약·HP·RNG·진행 변화 없음.
- metadata 없는 기존 abstract fireShot은 unit/controller seam용 유지. metadata가 있지만 토큰 없는 물리commit은 거부. 기존 valid-contact 단위 테스트는 beginShot로 실제 geometry를 만든 후 검증하도록 이관하거나 불법입력 거부 기대는 유지.
- cancelShot은 id가현재pending과같을때만 예약/aim을해제. 취소는 기존대로탄약미소모. 새run/라운드에pending잔존금지. null/undefined completion 콜백에결과라우팅금지.

### I02. UI 연결과 수명
- Related Files:
  - `src/components/BattleArena.jsx` :: startFlight/clearFlight/completeFlight — modify
  - `src/components/BattleScreen.jsx` — pass beginShot/cancelShot
  - `src/game/useAimController.js` — 필요 시 launching취소와정상commit 순서만 수정
- startFlight는 beginShot 호출실패시조준취소. 반환 flight.id는 controller launchId 유지, flight.shotId는세션토큰. activeFlight ref에는토큰또는확실한identity저장.
- completeFlight는해당토큰만소비하고 onFire({shotId,encounterId,reviewResult:true}) 호출. clearFlight는 active pending id만cancel, 새발사·oldscene에영향없음. controller.completeLaunch 이후 idle 업데이트는 성공run을바꾸지않음.
- 기존 rAF cancel/resize/blur/fullscreen/reduced-motion/document.hidden 동작을 검증한다. stale read가있으면 해당 scope에만고친다.

### I03. 실제 플레이와 광범위 회귀
- Related Files:
  - `tests/shot-resolution.test.mjs` — new
  - `tests/e2e/shot-integrity.spec.cjs` — new
  - 기존 `tests/game-session`, `spear-projectile`, `chaos-fused-boss`, `forest-log` 등 실제 physical session 호출 테스트 — contract 이관
- 정상miss, same-shot두번(리뷰동안/반격후), cancel후latecomplete, 새발사중이전complete/cancel, 다음round이전payload, HP/탄약/score/RNG不변 검증.
- 브라우저 actual눈fixturepropstopped/HP1인마지막2적: 일반사탕첫접촉뒤적생존/다음stage안감. 멀리던진miss(100%파워고각), 역발사, 빠른마우스입력, resize/blur/hidden 취소, actual창/불공/wind/지역chain, fused분리흐름, 관리자혼돈3 확인. 매발사resolve1/반격0~1, 새행동없으면추가변화없음.
- 전투의 정상 범위 피해는 obstacleEffects로, 유도는실제homingpath로 구분. 특정random증상을재현못했으면테스트범위한계를최종보고하고원인으로단정하지않는다.
- [DEBUG-...] 임시로그금지/사용시전부삭제. tmpprototype은원래loopgreen확인후정리/명시적debugfolder이동.

## Acceptance Criteria
- [x] 정상 물리 발사와 취소/중복/지연 id 불변식 통과
- [x] 원래 중복 반격 재현을 새 물리 발사 계약으로 재실행하여 green
- [x] 전체 단위/build/일반·관리자 브라우저 통과
- [x] 재현 근거·원인·방지 수단·검증 한계 문서화

## Validation
- `node --test tests/shot-resolution.test.mjs tests/shot-hit-integrity.test.mjs`
- `npm.cmd test`
- `npm.cmd run build`
- `npx.cmd playwright test tests/e2e/shot-integrity.spec.cjs` + 기존 영향을 받는 shot/review/chain/spear/fused/browser fixtures
- `npx.cmd playwright test --config playwright.studio.config.cjs tests/studio-e2e/chaos-fused-boss.spec.cjs`
- `git diff --check`

## Commit Message
```text
fix(전투): 발사 예약을 한 번만 확정하고 지연 콜백 차단

Plan: 2026-10-26-shot-resolution-integrity
Phase: P01-resolution
Task: T02-single-shot-commit

- 완료 신호를 새 행동으로 받던 세션 경계에 발사 식별자 추가
- 화면과 피해가 세션에서 확정한 하나의 실제 궤적을 공유
- 중복 반격과 이전 라운드 완료 및 취소 수명 회귀 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
- 이전 자동 승인 검토 제한 보존. 메시지 `tmp/T02-single-shot-commit-commit.txt` 준비. 이전12건과 혼합 스테이징 금지.

## Final results (2026-10-26)
- 전체 단위 **195/195**, `tmp/shot-integrity-unit-final.log`.
- final build 성공, `tmp/shot-integrity-build-final.log`: `App-CZzm7LNQ.js`, `index-CkEWaPgj.js`, `App-CIYn4x7K.css`.
- 일반 브라우저 고유 **58개**: 기존 관련50(shot-integrity의hidden1 포함) + 신규 integrity 나머지6 + 등급 실제HUD/피해2. 첫 실행48/50, 2실패는 테스트수명/fastCombat fixture였으며 수정 후 각각 재검증 통과. 마지막 final build에서 신규7+grade2+City→Chaos 전체진행1 =10/10 재검증.
- 관리자 고유 **13개**: fused1 + play-mode12. 첫 실행12/13의 fastCombat fixture 실패를 추상 fixture로 명시한 뒤 snow/chaos2개 재실행 통과.
- shield impact 테스트는 paused clock으로 정확한 단계를 검사해 1/1 통과. 실제 방어/피해 계산 코드는 해당 실패 때문에 변경하지 않았다.
- original CLI green: duplicateAccepted:false, secondCounter:false, HP95→95; combined failures:[]; remote found:false. 진단 probe는 삭제하고 `tests/shot-resolution.test.mjs`, `tests/shot-hit-integrity.test.mjs`에 영구화.
- 최종 엔진 경계에서 실제 바람궁수 유도/장애물 우회 브라우저1개 추가 재검증 통과. 고유 테스트수에는 기존 관련50에 포함되어 중복 가산하지 않았다. 검증용 preview4192 종료, 관리자4182 HTTP200 유지.
- `git diff --check` exit0, [DEBUG-...] source 로그 없음.
- 사용한 검증 임시 config: `tmp/chaos-fused.playwright.cjs`, `tmp/integrity-recheck.playwright.cjs`, `tmp/chaos-fused.studio.cjs`. 기존 사용 중인4180을 건드리지 않고4192 preview 사용. 검토용4182 관리자 서버는 유지, 자체4192는 검증 후 종료.
- 실제 원격피해 수정 화면 `tmp/shot-integrity-remote-hit-fixed.png` 육안 확인: 첫 NPC 사라짐/뒤 NPC1HP 생존/눈1라운드 유지.
- 상세 원인/가설/한계: `.memory/reviews/2026-10-26-shot-resolution-integrity.md`. 특정 사용자 장치에서 중복 UI 이벤트를 발생시키는 네이티브 순서는 미확인이나, 재전달 시 중복 반격을 허용하는 세션 결함은 실제로 재현/차단했다.
