# Task: T01 세로 릴과 우측 손잡이 연출

## Status: done

## Goal
세 보상 화면이 공유하는 슬롯을 가로형 금빛·나무 기계로 표시하고, 오른쪽 손잡이를 누르면 3개 세로 릴이 약 2.5초 움직여 왼쪽부터 멈춘 뒤 결과를 보여준다. 회전 도중에는 중복 회전과 다음 화면 이동을 막는다.

## Decision Summary
- 사용자 선택: 손잡이 클릭, 동화풍 금빛·나무 외형, 2.5초 순차 정지. 영상의 금속·네온 색을 그대로 복사하지 않는다.
- 기존 엔진 판정: `assets/js/battle-engine.js::spinRewardSlot`은 9개 기호, 가로 3줄·대각선 2줄을 평가하고 호출 즉시 스톤/소모품을 지급한다. RNG·확률·지급량과 `SlotResult` 형태는 바꾸지 않는다.

## Implementation

### I01. 공유 기계와 릴 애니메이션
- Related Files:
  - `src/components/SlotMachine.jsx` :: `SlotMachine` — 기존 즉시 공개 3×3 격자를 3개 세로 릴과 손잡이 버튼으로 교체; modify.
  - `src/styles/game.css` :: `.slot-machine*` — 기존 520px 카드 대신 가로형 금빛·나무 프레임, 릴 창, 움직이는 기호 띠, 우측 손잡이, 작은 화면 레이아웃; modify.

#### Details
- **Signatures & Types**:
  ```ts
  type SlotKind = 'stone' | 'consumable';
  type SlotResult = { symbols: string[]; winningLine: number[] | null;
    prizeId: string | null; instanceId?: string };
  type SpinEvent = { accepted: boolean; result?: SlotResult; reason?: string };
  type SlotMachineProps = { kind: SlotKind; remaining: number; results: SlotResult[];
    onSpin: () => SpinEvent; disabled?: boolean;
    onSpinningChange?: (active: boolean) => void };
  ```
- **Data & Schema Fields**:
  - 로컬 `phase`: `'idle' | 'pull' | 'rolling'` (초기 `idle`). 보상 엔진·저장소 필드가 아닌 화면 전용 상태.
  - 로컬 `stoppedCount`: `0 | 1 | 2 | 3` (초기 `0`); 멈춘 왼쪽 릴 수.
  - `results`의 최신 항목은 회전 시작 즉시 엔진에서 생성될 수 있으므로 `phase !== 'idle'` 동안 보상 문구와 `winningLine` 강조를 가린다.
- **Execution Flow / Logic**:
  1. `remaining > 0`, `!disabled`, `phase === 'idle'`일 때만 손잡이 버튼 `aria-label="돌리기"`를 활성화한다. 버튼의 기본 Enter/Space·터치 조작을 유지한다.
  2. 클릭 시 `onSpin()`을 한 번 호출한다. `accepted === false`면 애니메이션을 시작하지 않는다. 성공이면 `onSpinningChange(true)`와 함께 `phase='pull'`로 바꾼다.
  3. 약 300ms 손잡이 당김 뒤 `phase='rolling'`. 기존 기호 집합을 반복한 세로 띠가 각 릴 창에서 위아래로 흐르고 약간의 잔상을 준다. 1500·2000·2500ms에 왼쪽·가운데·오른쪽 릴을 각각 실제 `symbols`의 `[0,3,6]`, `[1,4,7]`, `[2,5,8]`에 멈춘다. 최종 정지 시 `phase='idle'`, `onSpinningChange(false)`.
  4. 정지 전에는 이전 기호 또는 중립 기호만 보이고 `role="img"`의 접근성 이름도 `회전 중`으로 둔다. 정지 후 실제 9개 결과를 행 순서로 읽으며 당첨 칸만 강조한다. 과거 회전 결과는 항상 보이되 최신 회전의 새 결과 문구는 정지 전 가린다.
  5. `prefers-reduced-motion: reduce`에서는 손잡이·릴 애니메이션과 대기를 생략하고 즉시 결과를 보여준다. 예약 타이머는 언마운트 때 정리한다.
  6. 가로 너비는 보상 화면 안에서 최대 약 900px를 쓰고 320px 폭에서도 릴 3개와 손잡이가 잘리지 않도록 셀·간격을 줄인다. 기계 버튼은 44px 이상 터치 영역과 키보드 포커스 표시를 유지한다.

### I02. 보상 화면 진행 잠금
- Related Files:
  - `src/components/RewardScreen.jsx` :: `RewardScreen` — 두 슬롯이 회전 중일 때 서로의 시작과 다음 화면 버튼을 잠금; modify.
  - `src/components/CampSlotScreen.jsx` :: `CampSlotScreen` — 야영지 두 회전과 다음 지역 버튼을 같은 방식으로 잠금; modify.
- **Execution Flow / Logic**:
  1. 부모 화면에 `slotSpinning: boolean`(기본 `false`)을 둔다. 각 `SlotMachine`의 `onSpinningChange`에 부모 setter를 넘긴다.
  2. 라운드/혼돈 보상에서는 `ready` 계산에 `!slotSpinning`을 추가하고 나머지 슬롯의 `disabled`에 회전 상태를 반영한다. 소모품 선택은 기존 규칙을 유지한다.
  3. 야영지에서는 두 번째 회전과 `다음 지역으로` 버튼도 회전 종료 전에는 비활성화한다. 게임 세션 전이는 기존 `session.spinRewardSlot`/`continueAfterReward`/`continueAfterCampSlot`을 그대로 사용한다.

### I03. 회귀 검증
- Related Files:
  - `tests/e2e/slot-machine.spec.cjs` :: 슬롯 UI 시나리오 — 일반 라운드의 클릭·중복 방지·왼쪽부터 정지·최종 보상 및 모션 감소를 검증; new.
  - `tests/e2e/game-flow.spec.cjs` :: 기존 보상 진행 시나리오 — 필요하면 애니메이션 종료를 기다리는 위치만 수정; modify if needed.
  - `tests/e2e/support.cjs` :: `selectRewards` — 혼돈의 두 슬롯을 차례로 기다려 돌리도록 보조 함수 수정; modify if needed.
- **Test Cases**:
  1. 손잡이를 한 번 클릭하면 `phase='pull'`에서 `rolling`으로 바뀌고 회전 중 버튼·계속 버튼이 잠긴다. 결과 문구는 아직 보이지 않는다.
  2. 세 릴이 순서대로 정지하고 마지막에 당첨 칸/보상 문구가 나타나며 실제 엔진 결과와 일치한다. 같은 회전에 보상은 하나만 지급한다.
  3. `reducedMotion: 'reduce'`에서 결과가 즉시 표시되고 진행 가능하다.
  4. 야영지 2회, 혼돈 스톤·소모품 슬롯에서도 공통 손잡이 UI와 중복 방지가 작동한다. 기존 3×3 당첨 확률 테스트는 유지한다.

## Acceptance Criteria
- [x] 일반·야영지·혼돈 슬롯이 가로형 세로 릴과 우측 손잡이로 표시된다.
- [x] 손잡이 클릭 뒤 약 2.5초 회전하고 왼쪽부터 차례로 멈추며 결과는 마지막에 공개된다.
- [x] 회전 중 보상 중복·다음 화면 이동이 막히고 모션 감소에서 즉시 완료된다.
- [x] 엔진의 보상 판정·확률·지급량이 변하지 않는다.

## Validation
- `npm test` — 엔진·보상 규칙 회귀 통과.
- `npx playwright test tests/e2e/slot-machine.spec.cjs tests/e2e/game-flow.spec.cjs` — 화면 조작과 기존 게임 흐름 통과.
- `npm run build` — React/CSS 빌드 통과.

## Commit Message
```text
feat(slots): 손잡이와 순차 회전 릴 연출 추가

Plan: 2026-10-30-slot-machine-reel-motion
Phase: P01-slot-machine
Task: T01-reel-lever-animation

- 동화풍 가로형 슬롯 기계와 우측 손잡이 구현
- 회전 중 진행 잠금과 모션 감소 대응 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 단위 테스트 266개, 슬롯 E2E 3개, 기존 흐름 E2E 10개, Vite 빌드
- commit: `feat(slots): 손잡이와 순차 회전 릴 연출 추가`
