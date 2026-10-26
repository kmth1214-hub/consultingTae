# Task: T01 지역 접촉 연출

## Status: done

## Goal
얼음 접촉은 전체 화면의 한기로, 도시 접촉은 지면 연쇄 폭발로 보이며 기존 전투 결과와 입력은 유지된다.

## Decision Summary
- 최초 물체 접촉 이벤트만 사용한다. 전투 완료 이벤트로 중복 재생하지 않는다.
- 숲/혼돈은 이번 연출 대상에서 제외한다. 애니메이션은 피해를 처리하지 않는다.

## Implementation

### I01. 타이머를 가진 순수 시각 컴포넌트
- Related Files:
  - `src/components/ObstacleRegionalEffects.jsx` :: `FrostField`, `CityGroundBursts`, `useEffectLifetime`; new
  - `src/components/BattleArena.jsx` :: `showFlightContacts`, render; modify
  - `src/styles/arena.css` :: 지역 충돌 스타일과 reduced-motion; modify
- Signatures & Types:
  - `FrostField({contact})`, `CityGroundBursts({contact,layout})`: ReactNode|null
  - contact: `{id:string,obstacleId:string,point:{x:number,y:number},direction:number}` (기존 visualContacts)
  - layout: `{width:number,height:number,groundY:number,enemies:Array<{x:number,id:string}>}` (기존 layout)
- Execution Flow / Logic:
  1. 해당 지역 visualContacts를 stable contact.id key로 렌더한다. 접촉이 없으면 미표시.
  2. FrostField는 arena-world 외부에 absolute inset0 z7로 렌더, 1700ms 뒤 null. SVG 가장자리 결정과 CSS 냉기·안개를 조합한다.
  3. CityGroundBursts는 projectile-layer SVG 내부에서 contact.x부터 가까운 적.x를 향해 7개 지면 폭발을 110ms 간격으로 재생한다. groundY를 사용하고 x를 월드 안으로 제한한다. 1700ms 뒤 null.
  4. useEffectLifetime은 contact.id에만 의존하며 unmount 시 timer 해제. 재렌더로 재시작하지 않는다. clearFlight와 새 조준에서 기존 visualContacts 제거를 따른다.
  5. pointer-events:none, aria-hidden:true; 모션 감소는 정적 저강도 cue. HUD z10와 미니맵 z9를 가리지 않는다.

### I02. 실제 충돌 브라우저 검증
- Related Files:
  - `tests/e2e/regional-obstacle-effects.spec.cjs`; new
- seed4927 fixture로 눈/도시 장애물 접촉을 실제 마우스로 수행한다. 전체 화면 크기, groundY 정렬, 시간차, 자동 종료, 전투 처리 1회 및 기존 효과를 확인한다.
- 모바일 모션 감소에서도 정적 표시 및 가로 overflow 없음 확인. 숲에는 새 지역 VFX가 없음을 기존 회귀와 함께 확인한다.

## Acceptance Criteria
- [x] 얼음 접촉 시 화면 냉기가 보이고 HUD 클릭을 방해하지 않는다.
- [x] 도시 접촉 시 작은 폭발이 실제 지면에서 순서대로 발생한다.
- [x] 효과는 자동 종료하며 기존 피해·피해 감소·숲 연출 유지.
- [x] 모션 감소·모바일에서 정상 표시.

## Validation
- `npm.cmd test` — 기존 게임/리더보드 회귀 통과.
- `npm.cmd run build` — production build 성공.
- `npx.cmd playwright test tests/e2e/regional-obstacle-effects.spec.cjs tests/e2e/obstacle-effects.spec.cjs tests/e2e/forest-log.spec.cjs --config tmp/regional-vfx-playwright.config.cjs` — 별도 4192 preview에서 실행, 캡처 육안 확인.

## Commit Message
```text
feat(연출): 얼음 한기와 도시 장애물 지면 연쇄 폭발 추가

Plan: 2026-10-26-regional-obstacle-effects
Phase: P01-contact-vfx
Task: T01-regional-contact-vfx

- 물체 접촉 순간 전장 냉기와 지면 폭발 연출
- 모션 감소 및 모바일 표시와 기존 전투 효과 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending

## Validation Results
- 단위 테스트 123/123, production build 통과.
- 지정된 E2E 11/11 통과. 연쇄 중간 장면 캡처를 보강한 도시 테스트 1/1 추가 재실행 통과.
- 눈 전장 전체 레이어, 도시 groundY=900과 110ms 시간차, 자동 종료, 모션 감소, 모바일 overflow, 기존 피해·방어와 숲 물리 충돌 검증.
- 육안 캡처: `tmp/snow-obstacle-frost.png`, `tmp/city-obstacle-chain.png`, `tmp/snow-obstacle-mobile.png`, `tmp/city-obstacle-mobile.png`.
- 임시 preview/config는 검증 후 종료·제거한다. 기존 mockup 및 다른 미추적 파일은 수정/커밋하지 않는다.
