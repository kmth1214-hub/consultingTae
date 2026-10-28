# Task: T02 그림·비행 연출과 관리자 화면 검증

## Status: pending

## Goal
확대된 물체가 관리자 미리보기·플레이에서 실제 판정과 같은 크기·위치로 보이고, 사탕 비행·굴림·보스 전환에도 시각적 불일치가 없게 한다.

## Decision Summary
- T01의 `layout.worldScale`만 시각 배율의 근거로 쓴다. 사용자 기본값은 1이다.
- UI HUD와 3600 전체 조망은 유지한다. 월드 SVG와 새총 내부 좌표만 확대한다.

## Implementation

### I01. 새총과 사탕 그림 정합성
- Related Files:
  - `src/components/Slingshot.jsx` :: `Slingshot` — 124×142 viewBox를 확대한 월드 박스에 배치; modify
  - `src/components/ProjectileFlight.jsx` :: `ProjectileFlight` — 사탕/잔상/굴림 회전·그림자; modify
  - `src/components/BattleArena.jsx` :: `ProjectileFlight` 호출 — 반경 전달 확인; modify if needed
  - `src/components/ArenaScenery.jsx` :: `ArenaScenery` — layout polygon 사용 확인; read-only unless mismatch
  - `src/components/MonsterGroup.jsx`, `src/components/PlayerCookie.jsx` — layout 크기 사용 확인; read-only unless mismatch
#### Details
- **Signatures & Types**:
  ```js
  ProjectileFlight({ flight, onProgress, onComplete, onFailure }) // flight.candyRadius: number
  Slingshot({ aim, run, launcherRef, layout }) // layout.worldScale: number
  ```
- **Data & Schema Fields**: `flight.candyRadius`는 T01 layout에서 오고, 없으면 `BATTLEFIELD.candyRadius`로 fallback한다.
- **Execution Flow / Logic**: 새총 SVG viewBox는 기존 로컬 좌표를 유지해 시위와 몸체가 같이 확대된다. 발사 사탕 art는 세계 원점에서 `scale(layout.worldScale)`한다. 그림자·굴림 각속도·먼지 위치를 활성 반경으로 계산한다. 방출·프리뷰·실제 projectile 시작점이 같아야 한다. 창/불공 및 분열 자식 크기의 상대 비율을 검증한다.

### I02. 관리자·사용자 회귀
- Related Files:
  - `src/dev/MapStudio.jsx` :: `MapStudio` — 미리보기/플레이 배율 연결 확인; modify if needed
  - `tests/studio-e2e/map-studio.spec.cjs`, `tests/studio-e2e/play-mode.spec.cjs` — 네 지역 크기·플레이 검증; modify
  - `tests/e2e/wide-battlefield.spec.cjs`, `tests/e2e/slingshot.spec.cjs` — 사용자 1배 검증; read-only
- **Execution Flow / Logic**: 관리자만 1.5배인 것을 DOM 크기와 실제 발사로 검증한다. 동일 seed 재실행/새 seed, 숲 탑승 적, 혼돈 보스 전환을 확인한다. 일반 화면은 1배다.

## Acceptance Criteria
- [ ] 네 지역 관리자 미리보기/플레이의 확대 물체·위치가 같다.
- [ ] 사탕 비행·착지 굴림·그림자와 충돌 반경이 일치한다.
- [ ] 새총 시위와 발사 시작점이 일치한다.
- [ ] 사용자 게임과 Azure 정적 빌드에 관리자 배율이 유입되지 않는다.

## Validation
- `node --test tests/battlefield-model.test.mjs tests/studio-session.test.mjs tests/shot-geometry.test.mjs` — 배율 정합성 유지
- `npm run test:studio` — 관리자 UI 회귀
- `npm run build` — 정적 빌드 통과

## Commit Message
```text
feat(studio): 확대 전장의 새총과 사탕 연출을 일치

Plan: 2026-10-28-studio-battlefield-scale
Phase: P01-studio-scale
Task: T02-presentation-parity

- 새총 시위와 비행 사탕을 확대 충돌 반경에 정렬
- 관리자 미리보기·플레이 및 사용자 화면 회귀 검증
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
