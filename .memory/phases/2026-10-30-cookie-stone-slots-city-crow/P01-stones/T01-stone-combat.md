# Task: T01 3발 스톤 덱과 쿠키 능력

## Status: done

## Goal
선택 쿠키 전용 1발과 기본 2발로 시작하고, 쿠키 점수 보너스 없이 발사한 전용 스톤에만 쿠키의 고유 발사·명중 효과를 적용한다.

## Decision Summary
- 시작 덱 3발, 매 라운드 덱 전체 재장전. 기존 적 체력·수와 공통 점수는 유지.
- 기본 스톤은 C등급 피해 0~4와 장애물 효과만 사용. 창은 전용 효과를 대체하고 불공은 직접 피해 2배만 적용.
- 우유의 첫 보스 공격 보호막처럼 발사와 무관한 쿠키 능력은 유지.

## Implementation

### I01. 전투 상태와 점수
- Related Files:
  - `assets/js/battle-engine.js` :: `WEAPON_CATALOG`, `createRunState`, `roundAmmoCapacity`, `resolveShot`, `useConsumable`, `getCurrentWeapon` — 기본 스톤, 3개 시작 덱, 능력 발동 조건과 점수 수정; modify.
  - `src/game/gameData.js` :: `CHARACTERS` — 점수 +10 소개를 전투 능력 소개로 변경; modify.
- Signatures & Types: 기존 `BattleEngine.createRunState(config)` 인터페이스 유지. `Weapon` = `{id:string,name:string,grade:'C'|'B'|'A',effect:string,instanceId:string,ammoType:'magic-candy'}`. `id:'basic-stone'`은 신규 공통 무기이며 `config.weapons`가 명시된 기존 테스트/관리자 설정은 그대로 존중한다.
- Data & Schema Fields: 기본 시작 `weapons=[selectedCookieWeapon,basicStone,basicStone]`, `maxAmmo=weapons.length`, `ammo=maxAmmo`, `weaponQueue`는 각 `instanceId`를 한 번씩 포함. 보유 중 새 스톤이 늘면 다음 `enterRound`에서 전체를 재장전한다.
- Execution Flow / Logic: `resolveShot`의 모험가 3회 명중 +10 및 `useConsumable`의 연금술사 +10을 제거한다. 피해와 장애물에서 발생한 공통 `addScore`는 그대로 둔다. 마법사 세 번째 명중·우유 세 번째 명중·바람궁수 유도는 `usedWeapon.id`가 전용 스톤일 때만 증가/발동한다. 우유 보호막은 선택 쿠키의 상시 능력으로 유지한다. 기본 스톤 발사에서 별도 고유 효과가 나오지 않아야 한다.
- Error Handling: 탄약 0일 때 기존 `no-ammo`·패배 처리, 빈 큐 보충, 잘못된 등급 거부 유지.

### I02. 전용 스톤 발사 효과 공개
- Related Files:
  - `src/game/shotGeometry.js` :: `planShot`, `withWizardSplit` — 모험가 튕김, 연금술사 파동, 마법사 분열을 전 지역의 전용 스톤 발사에서 계산; modify.
  - `src/game/shotResolution.js` :: `preparePhysicalFlight` — 일반 게임의 `battlefieldPrototype`을 발사 계획에 전달하고 장전된 전용 스톤만 유도 허용; modify.
  - `src/components/BattleArena.jsx` :: `makeSolution` — 조준 미리보기에도 같은 프로토타입과 장전 스톤 사용; modify.
  - `src/game/gameSession.js` :: `fireShot`의 `abilityContacts`/`childHits` 검증 — 전 지역의 일반 전투에서 실제 예약된 전용 스톤과 충돌 정보만 허용; modify.
  - `src/game/candyPresentation.js` :: `getCandyDetails` — 기본 스톤/전용 스톤 설명과 공통 피해 범위, 점수 보너스 제거; modify.
- Signatures & Types: `planShot({loadedCandyId,prototype,...})`; 기존 함수 시그니처 유지. `abilityContacts`/`childHits`는 예약된 `flight`의 접촉만 허용한다.
- Data & Schema Fields: 새 영속 필드 없음. 기존 `shotMeta`의 `abilityContacts`, `childHits`, `splitTime` 사용.
- Execution Flow / Logic: 숲 관리자 전용 조건을 일반 게임 전 지역 조건으로 넓힌다. `loadedCandyId==='basic-stone'` 및 창 준비 중에는 튕김·파동·분열·유도가 없다. 불공은 큰 스톤의 직접 피해만 2배; 파동·작은 구슬 피해 1은 그대로다. 일반 게임과 관리자 시범판의 동작을 일치시킨다.
- Error Handling: 조작된 접촉 정보는 기존 `invalid-state`로 거부하며 발사 횟수·턴을 소비하지 않는다.

### I03. 좁은 회귀 검증
- Related Files:
  - `tests/stone-combat.test.mjs` :: 시작 덱·점수·전용/기본 스톤·재장전 테스트; new.
  - `tests/candy-presentation.test.mjs` :: 기본/전용 설명 기대값 수정; modify.
- Scenarios: 다섯 쿠키 각각 1+2 시작; 모험가/연금술사 +10 없음; 기본 스톤의 전용 효과 없음; 전용 스톤의 숲·눈·도시 효과; 우유 보스 보호막; 마지막 탄약 소비.

## Acceptance Criteria
- [ ] 시작 장전 3발이며 각 스톤의 종류와 순서가 일치한다.
- [ ] 쿠키별 +10 점수는 제거되고 전용 발사 능력은 전 지역에 동작한다.
- [ ] 기본 스톤에는 쿠키 전용 발사 능력이 없다.

## Validation
- `node --test tests/stone-combat.test.mjs tests/candy-presentation.test.mjs`
- `npm run build`

## Commit Message
```text
feat(stones): 3발 시작과 쿠키 전용 발사 능력 적용

Plan: 2026-10-30-cookie-stone-slots-city-crow
Phase: P01-stones
Task: T01-stone-combat

- 전용 1발과 기본 2발로 시작하고 고유 점수 보너스 제거
- 전용 스톤 발사 능력을 모든 지역에 적용
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: T01 커밋
