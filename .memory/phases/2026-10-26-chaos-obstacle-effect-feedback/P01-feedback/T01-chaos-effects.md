# Task: T01 혼돈 물체 효과 표시

## Status: done

## Goal
실제 엔진에서 혼돈 물체 효과가 적용될 때 결과 확인 중 대응 연출과 설명이 보인다.

## Decision Summary
- 단일 얼음 충돌의 방어 효과는 계산되지만 한기가 없는 것을 실제 브라우저에서 재현했다. 원인은 지역별 렌더 조건과 무작위 결과 미연결이다.
- 혼돈의4개 무작위 후보/확률/피해/턴은 바꾸지 않는다. 화면에서는 확정된 lastEvent만 읽으며 RNG를 호출하지 않는다.

## Implementation
### I01. 표시용 결과 모델
- Related Files: 신규 `src/game/chaosObstacleFeedback.js` :: `getChaosObstacleCues`, `getChaosEffectLabel`; `assets/js/battle-engine.js` read-only
#### Details
- Signature: `getChaosObstacleCues({area,layout,event}) => Cue[]`.
- Cue: `{id:string,kind:'log-strike'|'ice-guard'|'jar-burst'|'aim-inversion',label:string,contact:{id,obstacleId,obstacleKind,point:{x:number,y:number},direction:-1|1},hits:Array<{id:string,damage:number}>}`.
- area=chaos, event.source=weapon, 유효 event.id일 때만 결과를 만든다. obstacleEffects(legacy obstacleEffect fallback)의 물체id가 현재 layout.obstacles에 존재하고 kind가 네 후보일 때만 허용. 물체id당1회.
- 위치는 event.shotMeta.contacts의 해당 물체 point, 없으면 현재 물체 중심(유한한 좌표만). 방향은 contact.direction 또는 기본1. hits는 엔진의 실제타격 id/피해만 복사. kind별 한국어 설명: 단일 타격/피해50%감소/전체폭발/다음한발반전. id는 event.id+물체id로 재생 수명 고정. 입력 불변.
### I02. 엔진 확정 결과 재생
- Related Files: `src/components/BattleArena.jsx` :: chaosCues/render; `src/components/ObstacleRegionalEffects.jsx` :: 신규 `ChaosObstacleNotice`, `ChaosMagicEffect`; `src/styles/arena.css`; `src/components/BattleScreen.jsx` :: combatMessage의 실제 혼돈 효과 명칭; modify
- useMemo에서 area/layout/lastEvent를 읽어 Cue[] 생성. 방어는 viewport FrostField, 폭발은 world CityGroundBursts, strike는 실제 effect.hits 대상 collider에 마법 궤적/충격, inversion은 물체 충돌 지점의 양 축 화살표 룬을 렌더한다. 피해를 계산/변경하는 콜백 없음.
- 각 Cue의 id를 React key/수명 키로 사용해 같은 이벤트가 렌더링되어도 재시작하지 않는다. 기존 useEffectLifetime1700ms 재사용, 이미 끝난 이벤트를 조준/취소/리사이즈로 재생하지 않는다. 현재 라운드 물체id 필터로 이전 라운드 효과 제외.
- 네 후보 모두 짧은 이름/효과를 viewport notice로 표시한다. desktop 상단중앙, narrow 우측상단(확인 중 candyHUD가 숨겨진 자리), 포인터 차단 금지. 여러 연쇄 효과도 물체별 표시. reduced-motion은 새 애니메이션 비활성화/정적 피드백 유지.
- 기존 눈/도시 contact-time 연출은 유지. 혼돈 효과는 엔진이 RNG결과를 확정하는 발사 종료 직후, 기존2초 결과 확인 동안 표시한다.
### I03. 회귀 및 정리
- Related Files: 신규 `tests/chaos-obstacle-feedback.test.mjs`, 신규 `tests/e2e/chaos-obstacle-effects.spec.cjs`; existing region/chain/review/studio tests read-only
- 단위: 네 재질/효과 조합 중 실제 kind를 표시, source/지역/라운드 필터, 중복 물체/유효값/legacy fallback/입력 불변 검증.
- E2E: 고정10마리 Chaos roster(RNG.25에서 생성)/HP30/seed4927, 얼음만 맞히는32.5도 .6 발사. 전투 RNG .1/.3/.6/.9로 네 효과를 각각 선택한다. 일치하는 연출/설명, 실제 피해/감소/반전/점수, 다른 효과 미표시, 발사1회, 만료 및 조준취소 재생 없음. 연쇄 및 reduced-motion 모바일도 확인.
- 최소 재현 원본을 수정 후 다시 green 확인. 임시 repro는 명시적 경로로 삭제하고 영구 E2E를 유지한다. 디버그 instrumentation 추가하지 않는다.

## Acceptance Criteria
- [x] 혼돈 단일 얼음 방어에서 frost가 실제 보인다.
- [x] 네 후보와 연쇄가 엔진 결과대로 표시되고 기존 피해/버프/확률/입력 규칙은 유지된다.

## Validation
- `node tmp/chaos-obstacle-repro.cjs` — 기존 red 출력: ice-guard,damageReduction.5,frostVisible=false. 수정 후 true.
- `npm.cmd test`
- `npm.cmd run build`
- `npx.cmd playwright test chaos-obstacle-effects.spec.cjs regional-obstacle-effects.spec.cjs obstacle-chain.spec.cjs shot-review.spec.cjs --config tmp/chaos-feedback.config.cjs --workers=2 --timeout=60000` (자체preview4192/output별도)
- 관리자 실제 Chaos 회귀 및 스크린샷. 자체서버/config/repro만 정리, 사용자5173 유지.

## Commit Message
```text
fix(혼돈): 물체의 확정된 무작위 효과와 화면 연출 연결

Plan: 2026-10-26-chaos-obstacle-effect-feedback
Phase: P01-feedback
Task: T01-chaos-effects

- 지역별 연출 조건 때문에 혼돈의 실제 효과가 보이지 않던 문제 수정
- 방어·폭발·타격·반전을 확정 이벤트에서 재생하고 재추첨 방지
- 단일 얼음 충돌과 연쇄 및 모바일 회귀 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending — 승인 검토 사용량 제한

## 결과 및 원인 기록
- 구현/검증 완료. 커밋은 기존 자동 승인 검토 사용량 제한으로 대기 중이며 우회/재시도하지 않았다.
- 재현 loop: 단일 얼음만 충돌 → engine ice-guard / damageReduction0.5 / frostVisible=false. 수정 후 원본 loop에서 같은 피해감소와 frostVisible=true 확인.
- 올바른 가설은 지역별 VFX gating과 확정 무작위 결과 미연결이었다. 물체 종류로 효과를 추측하지 않고 lastEvent.obstacleEffects를 표시 모델로 연결했다. 같은 엔진 결과를 상단/하단 설명에 공유한다.
- 혼돈 효과는 RNG 결과 확정 뒤 기존2초 결과 확인 동안 표시한다. 기존 눈/도시의 접촉 시점 연출과 gameplay RNG/피해/상태/점수는 수정하지 않았다.
- 반전 룬은 결과 카메라에서 새총이 화면 밖인 점을 시각검사로 확인해 실제 충돌 지점에 배치했다. 회귀 테스트에 viewport 안 표시를 추가했다.
- 단위149/149, production build 통과. 브라우저20개 범위 통과(혼돈6/기존 지역4/연쇄5/결과확인4/실제 관리자1). 마지막 설명 수정 후 혼돈6개와 룬 위치1개 재검증.
- 기존 테스트는 engine 효과와 물체 낙하만 확인해 혼돈의 VFX 누락을 놓쳤다. 실제 엔진 결과별 네 후보의 화면 계약, 재질 독립성, 이전 라운드/소모품/중복 필터 테스트를 추가했다.
- `tests/studio-e2e/chaos-feedback.spec.cjs`를 추가해 관리자 실제 플레이에서도 guard/VFX 일치를 검증했다.
- 디버그 로그 없음. 임시 재현 스크립트/config 및 자체 preview4192 정리. 사용자5173 유지.
- 추가 미해결 발견 사항 없음.
