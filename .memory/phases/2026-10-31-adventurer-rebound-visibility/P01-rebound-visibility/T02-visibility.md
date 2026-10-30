# Task: T02 능력 연출 및 관리자 비교

## Status: done

## Goal
모험가의 반동과 연금술사의 폭발이 전투 중 구별되게 하고, 관리자 테스트 플레이에서 2.5D 장면을 직접 비교하게 한다.

## Decision Summary
- 폭발 성공률·범위·피해는 변경하지 않는다. 입체감 토글은 로컬 관리자 테스트 플레이 전용이다.

## Implementation
### I01. 시각 효과
- Related Files: `src/components/ProjectileFlight.jsx` :: `ProjectileFlight`; `src/components/BattleArena.jsx` :: `BattleArena`; `src/styles/arena.css` :: `.bounce-dust`, `.alchemist-explosion`; `src/game/candyPresentation.js` :: `getCandyDetails`; `src/game/gameData.js` :: `CHARACTERS`.
- Data fields: `flight.bounces`의 각 충돌점을 비행 시간에 맞춰 보여준다. 접촉 강조는 창의 시각 효과와 구분한다.
- Logic: 반동 순간 짧고 뚜렷한 빛·먼지 고리와 흔적을 표시한다. 폭발은 중심 섬광·충격파·파편을 추가하고 성공/실패를 색으로 구분한다. 낮은 움직임 설정에서는 정지 프레임으로 표시한다. 능력 설명을 등급별 반동으로 갱신한다.
### I02. 관리자 비교
- Related Files: `src/dev/StudioPlay.jsx` :: `StudioPlay`; `src/dev/mapStudio.css` :: `.studio-play`.
- Data fields: 로컬 `depthEnabled:boolean` 기본값 true; 버튼 `aria-pressed`로 상태 노출.
- Logic: 테스트 플레이에서만 장면 오버레이를 켜고 끈다. 지도 미리보기·일반 게임은 건드리지 않는다.

## Acceptance Criteria
- [x] 반동과 폭발이 플레이 화면에서 구별된다.
- [x] 관리자 테스트 플레이에서 원본/입체 장면 비교 버튼이 동작한다.
- [x] 공개 게임에는 관리자 토글이 표시되지 않는다.

## Validation
- `node --test tests/shot-geometry.test.mjs tests/shot-hit-integrity.test.mjs`
- `npm.cmd run build`

## Commit Message
```text
feat(visual): 튕김과 폭발 연출 및 입체감 비교 추가

Plan: 2026-10-31-adventurer-rebound-visibility
Phase: P01-rebound-visibility
Task: T02-visibility

- 반동·폭발 순간의 전투 효과 강화
- 로컬 관리자 테스트 플레이에 입체감 비교 추가
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
