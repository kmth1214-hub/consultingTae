# Task: T01 관리자 조준 중 V 전체 보기

## Status: done

## Goal

로컬 관리자 테스트 플레이에서 드래그 조준 중 V를 누르는 동안 `overview` 카메라로 전체 전장을 보고, 떼면 `aim` 카메라로 돌아온다. 드래그 거리·발사 방향·Space 능력 키는 변하지 않는다.

## Decision Summary

- `import.meta.env.DEV && run.studioDepthPreview === true`인 전투에만 적용한다. 입체 배경 비교 토글과 무관하다.
- V 키를 누르고 드래그를 시작해도 전체 보기로 진입한다. 포커스 이탈·발사·취소·라운드 전환 때 V 홀드 상태를 해제한다.

## Implementation

### I01. 카메라 입력과 상태

- Related Files:
  - `src/components/BattleArena.jsx` :: `BattleArena`의 키 이벤트, `mode`, `INSTRUCTIONS`; modify.
  - `src/game/useBattlefieldCamera.js` :: 기존 mode 구독·전환 방식; read-only.
  - `src/game/useAimController.js` :: 화면 좌표 기반 드래그; read-only.

#### Details

- **Signatures & Types**: `const studioAimEnabled: boolean`, `const [overviewHeld, setOverviewHeld] = useState(false)`, `mode: 'overview'|'aim'|기존 모드`.
- **Data & Schema Fields**: React 컴포넌트 로컬 상태만 사용한다. `run`, 저장소, API 스키마 변경 없음.
- **Execution Flow / Logic**:
  1. `window`의 `keydown/keyup`에서 `event.code==='KeyV'`만 처리한다. `event.repeat`은 무시하고 입력 필드·선택 상자·버튼의 키 조작을 침범하지 않는다.
  2. `state.phase==='dragging'`이고 `overviewHeld`이면 카메라 `mode='overview'`, 그렇지 않으면 기존 `aim`을 사용한다. flight·review·enemy·split 모드는 우선한다.
  3. `window.blur`와 조준 상태 종료 시 홀드 상태를 초기화한다. 컴포넌트 언마운트 시 리스너를 정리한다.
  4. 관리자 조준 안내에 V 사용법을 추가하되 일반 게임 안내는 유지한다.
- **Error & Exception Handling**: 키를 놓는 이벤트가 창 밖에서 누락되어도 blur나 발사 종료 시 확대 상태로 복귀한다. `prefers-reduced-motion`은 기존 overview 우선 규칙을 유지한다.
- **State Transition & Return**: 드래그 값·발사 결과는 카메라 전환 전후 동일해야 한다.

### I02. 국소 검증

- Related Files:
  - `tests/studio-e2e/aim-overview-guide.spec.cjs` :: 관리자 테스트 플레이에서 키 누름·해제와 드래그 유지 확인; new.

#### Details

- 숲 관리자 플레이에서 드래그 중 `data-camera-mode`가 `aim → overview → aim`인지 확인한다. V 상태에서 발사해도 한 발만 발사되며, 일반 게임에는 V 안내와 전환이 없다.

## Acceptance Criteria

- [ ] V를 누르는 동안 전장 전체와 적이 보이고, 떼면 새총 근접 화면이다.
- [ ] V 전환이 드래그·발사 방향, Space 능력 키, 일반 게임을 바꾸지 않는다.

## Validation

- `node --test tests/battlefield-camera.test.mjs` — 카메라 좌표 관련 2개 단위 테스트 통과.
- `npm.cmd run build` — Vite 컴파일 통과.
- 브라우저 단일 시나리오는 Windows Playwright가 케이스 시작 후 결과를 반환하지 않아 중단했다. 이 케이스와 전체 회귀는 배포 검증에서 재실행한다.
- `git diff --check` — 수정 파일 공백 오류 확인.
- 전체 테스트는 배포 시 수행.

## Commit Message

```text
feat(studio): 조준 중 V 전체 보기 추가

Plan: 2026-11-11-studio-aim-overview-last-shot-guide
Phase: P01-studio-aim
Task: T01-hold-overview

- 관리자 테스트 플레이의 조준 카메라를 V 홀드로 전환
- 발사 입력과 일반 게임 동작 유지
```

## Progress

- [x] 구현 완료
- [x] 변경 범위 단위·빌드 검증 완료 (브라우저 시나리오는 배포 시 재실행)
- commit: pending
