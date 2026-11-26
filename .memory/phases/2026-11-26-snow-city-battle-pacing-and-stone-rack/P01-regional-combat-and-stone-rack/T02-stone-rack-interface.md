# Task: T02 세로 보관함과 A·D·Space 조작

## Status: done

## Goal

전장 왼쪽 과자 스틱 보관함에서 남은 모든 스톤을 확인하고 키보드와 터치로 원하는 것을 장전한다.

## Decision Summary

- T01의 loadStone을 사용한다. 선택 강조는 화면 상태이며 실제 currentWeaponId와 다르다. Space는 준비 중 장전, 비행 중 능력 발동에 사용한다.
- 선행 작업은 T01-stone-queue-and-loading이다. 목표 설계는 `.memory/decisions/2026-11-26-snow-city-battle-pacing-and-stone-rack.md`의 D01~D06을 따른다.
- 전투 진입은 createGameSession → beginShot → preparePhysicalFlight → ProjectileFlight → fireShot → BattleEngine.resolveProjectile 순서다. 물리 결과를 예약 token으로 한 번만 확정하고 화면 재생에서 피해를 재계산하지 않는다.
- 실제 코드는 JavaScript/React이고 아래 TypeScript는 문서용 타입 계약이다. 기존 함수의 사용자가 의존하는 반환값·유효성 검증을 보존한다.
- 공통 시작은 전용 C 1개+기본 2개, 일반 HP 4다. 새 API·DB 테이블·계정 해금 필드는 만들지 않는다. 지정 검증만 실행하고 전체 회귀는 배포 시 실행한다.

## Implementation

### I01. 상태·물리·화면 계약 연결

- Related Files:
  - `src/components/StoneRack.jsx` :: `StoneRack` — new
  - `src/components/BattleScreen.jsx`, `src/components/BattleArena.jsx` :: session action/보관함 입력 연결 — modify
  - `src/components/MagicCandyCard.jsx`, `src/game/candyPresentation.js` :: 소진 시 표시와 다음 스톤 — modify
  - `src/styles/arena.css` :: 보관함 및 작은 화면 배치 — modify
  - `src/dev/StudioPlay.jsx` :: 일반 전투와 같은 action 전달 — modify if needed
  - `tests/e2e/stone-rack.spec.cjs` — new
  - `tests/candy-presentation.test.mjs` — modify

#### Details

- **Signatures & Types**

```typescript
StoneRack(props: { run: RunState; disabled: boolean; onLoadStone: (instanceId: string) => LoadStoneResult }): ReactElement;
BattleArena(props: ExistingBattleArenaProps & { onLoadStone: (instanceId: string) => LoadStoneResult }): ReactElement;
```

- **Data & Schema Fields**

- 화면 내부 `selectedInstanceId: string | null`는 초기 장전 ID. 라운드 변경/삭제 후 살아 있는 첫 queue ID로 정상화한다.
- 보관함 항목은 weapons 획득순이며 `available = weaponQueue.includes(instanceId)`, `loaded = currentWeaponId === instanceId`다. 사용한 항목은 흐리게 표시한다.
- 보관함은 `.arena-hud` 내부의 `aside aria-label="스톤 보관함"`이며 항목은 이름·등급을 가진 button이다. 선택에 aria-pressed, 사용 불가에 disabled, 장전 완료에 role=status를 쓴다.

- **Execution Flow / Logic**

1. 소모품 표 아래 왼쪽에 좁고 세로로 긴 과자 스틱 프레임을 만든다. 항목은 종류별 기존 스톤 그림/기호, 등급, 장전 여부가 보이게 한다. 선택한 항목의 이름·능력은 상세 영역에 표시한다. 새 일러스트 파일은 만들지 않는다.
2. A 위/D 아래는 사용 가능한 항목만 이동하고 끝에서는 멈춘다. 선택한 항목은 목록 안에서 scrollIntoView({block:'nearest'})로 보이게 한다. 반복 키 입력은 이동에 허용하되 Space 반복은 무시한다.
3. 전투 준비 상태이고 입력/textarea/select/contenteditable에 포커스가 없을 때만 단축키를 받는다. 조준 중·비행 중·반격·결과 확인·분리·terminal·Q 준비 중에는 이동/장전을 잠근다. Space 장전 처리는 해당 이벤트를 소비해 새총 발사나 비행 능력과 중복되지 않게 한다. 보관함 button의 native Space와 window handler가 이중 실행되지 않도록 한 경로로 모은다.
4. 마우스/터치는 항목을 탭해 선택하고 장전 버튼으로 확정한다. onLoadStone 성공 시만 장전 표시를 갱신한다. 실패는 session notification을 사용한다. 소모품·V·Q와 같은 기존 입력은 유지한다.
5. 390×844와 844×390에서는 목록의 높이를 제한하고 내부 스크롤을 제공한다. 화면 가장자리/소모품/쿠키/새총/중앙 조준 드래그가 서로 가려지지 않게 HUD를 배치한다. HUD 위에서 드래그해도 새총 조준을 시작하지 않는다.

### I02. 해당 기능 검증과 회귀 방지

- Related Files:
  - 위 I01의 tests 경로 — 변경된 실제 진입점과 실패 조건을 검증한다. modify/new 구분은 I01과 같다.

#### Details

- **Signatures & Types** — Node 테스트는 `node:test`의 `test(name, fn)`와 assert를, 브라우저 테스트는 기존 `tests/e2e/support.cjs`의 `test`, `installGame`, `start`, `dragPull`, `snapshot`, `phase`를 사용한다.
- **Data & Schema Fields** — fixture는 기존 instanceId/seed/flightStartMs/주입 RNG를 사용한다. 기대 피해는 실제 감소 HP와 해당 이벤트를 검사한다.
- **Execution Flow / Logic** — 획득순, 사용한 항목 건너뜀, 중복 스톤 구별, A/D 끝 경계, Space 1회 장전, 스톤을 바꾸고 실제 발사, 자동 획득순 복귀, 비행 중 Space로 마법사 능력 발동, Q 잠금, 모바일 장전과 목록 스크롤, 라운드 변경 시 선택 초기화를 검사한다.
- 실패 시 원래 재현 입력으로 원인을 확인하고, 확인 전 Task를 done으로 바꾸지 않는다. 브라우저 자산 로딩 시간과 물리 시간은 구분하며 타이밍 실패를 피해 결과 덮어쓰기로 해결하지 않는다.

## Acceptance Criteria

- [x] 전장 왼쪽 보관함에서 모든 보유 스톤과 이번 라운드 사용 여부를 읽을 수 있다.
- [x] A/D/Space와 터치 장전이 같은 session action을 사용한다.
- [x] 장전 선택이 발사나 스톤 특수 능력을 중복 실행하지 않는다.

## Validation

- `node --test tests/candy-presentation.test.mjs tests/stone-rack.test.mjs` — 지정 기능의 회귀와 실제 입력 경로가 통과한다.
- `npm.cmd run test:e2e -- tests/e2e/stone-rack.spec.cjs` — 지정 기능의 회귀와 실제 입력 경로가 통과한다.
- `npm.cmd run build -- --logLevel error` — 빌드 또는 변경 형식 검증이 통과한다.

## Commit Message

```text
feat(ui): 스톤 보관함과 키보드 터치 장전 추가

Plan: 2026-11-26-snow-city-battle-pacing-and-stone-rack
Phase: P01-regional-combat-and-stone-rack
Task: T02-stone-rack-interface

- 전장 왼쪽 과자 스틱 보관함에서 남은 모든 스톤을 확인하고 키보드와 터치로 원하는 것을 장전한다.
- 지정 검증 결과와 회귀 수정 반영
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 문서를 포함한 Task 커밋
