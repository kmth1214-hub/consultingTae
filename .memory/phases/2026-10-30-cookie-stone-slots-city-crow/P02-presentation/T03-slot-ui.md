# Task: T03 스톤 발사체와 전투 HUD

## Status: done

## Goal
기본 스톤과 선택 쿠키의 전용 스톤을 장전·비행·HUD에서 구분할 수 있게 한다.

## Decision Summary
- 기본 스톤은 공통 피해만, 전용 스톤은 쿠키의 고유 능력을 가진다.
- 현재/다음 스톤과 보유량을 명확히 보여주되 각도·파워 수치는 계속 숨긴다.

## Implementation

### I01. 스톤 아트와 이름
- Related Files:
  - `src/components/CandyProjectileArt.jsx` :: `CandyProjectileArt` — `stoneId` prop을 추가하고 기본 스톤은 무늬 없는 광택 석구, 전용 스톤은 쿠키별 색·문양으로 표시. 불공/창 variant 우선; modify.
  - `src/components/Slingshot.jsx` :: `Slingshot` — 현재 장전 인스턴스의 `id`를 발사대 SVG에 전달; modify.
  - `src/components/ProjectileFlight.jsx` :: `ProjectileFlight` — 예약된 `flight.loadedStoneId`를 비행체에 전달; modify.
  - `src/game/shotResolution.js` :: `preparePhysicalFlight` — 예약된 `loadedStoneId:string`을 반환해 장전과 비행 그림을 일치; modify.
  - `src/game/assetCatalog.js` :: 기존 쿠키 이미지/아이템만 사용하며 새 외부 파일 필요 여부 확인; read-only.
- Signatures & Types: `CandyProjectileArt({variant:'normal'|'fireball'|'spear',stoneId:string})`. `flight.loadedStoneId`는 `basic-stone` 또는 선택 쿠키 전용 ID.
- Data & Schema Fields: 무기 카탈로그의 기존 `id`와 `grade` 사용. 별도 이미지 URL 또는 지속 상태 필드 없음.
- Execution Flow / Logic: 현재 장전된 스톤과 날아가는 스톤의 이름/색이 같아야 한다. 불공·창 사용 시 무기 변형 모습은 기존처럼 우선한다. 작은 분열 구슬은 마법사 전용 아트를 사용한다.
- Error Handling: 알 수 없는 `stoneId`는 기본 스톤 아트로 폴백한다.

### I02. 전투 안내
- Related Files:
  - `src/components/MagicCandyCard.jsx` :: `MagicCandyCard` — 현재 전용/기본 종류, 발사 가능 횟수, 다음 스톤, 전용 능력 텍스트; modify.
  - `src/game/candyPresentation.js` :: `getCandyDetails` — 현재/다음 스톤과 발사 능력은 실제 `weaponQueue`에서만 읽기; modify.
  - `src/components/CharacterSelect.jsx` :: 캐릭터 소개 문구를 점수 아닌 스톤 능력으로 정리; modify.
  - `src/styles/arena.css` :: 좁은 화면에서도 스톤 배지·숫자가 겹치지 않게 정리; modify.
- Signatures & Types: `getCandyDetails(run)`의 기존 객체 반환 유지; `current.id`, `current.name`, `next.id`를 직접 사용한다.
- Data & Schema Fields: `run.weapons`의 전용/기본 개수는 `id`로 계산, 새로운 중복 상태 없음.
- Execution Flow / Logic: 전용 스톤에는 고유 능력, 기본에는 ‘공통 피해·장애물 상호작용’만 보여준다. 점수 +10과 옛 사탕 보상 설명은 화면에서 제거한다.

### I03. 검증
- Related Files:
  - `tests/e2e/stone-hud.spec.cjs` :: 전용·기본 장전/비행/다음 예고와 좁은 화면 확인; new.
- Scenarios: 시작 전용 1·기본 2, 순서 변경 후 현재와 다음 배지, 불공/창 우선, 모바일 HUD, 기본 스톤에 고유 능력 문구 없음.

## Acceptance Criteria
- [ ] 기본·전용 스톤이 발사대와 비행 중 구분된다.
- [ ] HUD가 실제 큐와 스톤 능력을 설명한다.
- [ ] 점수 보너스 문구가 선택·전투 화면에 남지 않는다.

## Validation
- `npx playwright test tests/e2e/stone-hud.spec.cjs`
- `npm run build`

## Commit Message
```text
feat(ui): 기본 스톤과 쿠키 전용 스톤을 전투 화면에 표시

Plan: 2026-10-30-cookie-stone-slots-city-crow
Phase: P02-presentation
Task: T03-slot-ui

- 발사대·비행체·HUD의 장전 스톤 표현 통일
- 점수 보너스 설명을 고유 능력 설명으로 교체
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: T03 커밋
