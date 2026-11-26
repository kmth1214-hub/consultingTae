# Task: T01 몬스터 명중 직후 자동 분열

## Status: done

## Goal

큰 마법사 스톤이 몬스터를 직접 맞히면 명중 장면 뒤 자동 분열이 나타나고, 작은 구슬이 발사 방향의 뒤쪽 적만 실제로 때리게 한다.

## Decision Summary

- `preparePhysicalFlight`는 `hitIds`가 있으면 `abilityDeadlineTime=directHitTime`으로 설정하고 `BattleArena`/`gameSession`은 `auto-contact`를 호출한다. 이 경로를 국소 테스트로 고정한다.
- 자동 직접 명중 후에는 맞힌 적을 자식 후보에서 제외하고 전방 X 위치의 적만 후보로 둔다. 수동 클릭·Space, 장애물 자동 접촉, 바닥 0.5초 자동 발동 판정은 바꾸지 않는다.

## Implementation

### I01. 직접 명중 후 분열 이펙트

- Related Files:
  - `src/components/BattleArena.jsx` :: `activateAbility`, `visualAbilities`, 상단 이펙트 SVG; modify.
  - `src/styles/arena.css` :: `.wizard-auto-split-*` 짧은 섬광·분열 링; modify.
  - `src/game/shotGeometry.js` :: `activatePlannedAbility`, `withWizardSplit`의 직접 명중 뒤쪽 대상 필터; modify.
  - `src/game/candyPresentation.js` :: `getCandyDetails`의 마법사 능력 설명; modify only wizard text, preserve existing Adventurer edit.
  - `src/game/shotResolution.js` :: `preparePhysicalFlight` 자동 deadline; read-only.
  - `src/game/gameSession.js` :: `activatePendingAbility` 자동 소스 검증; read-only.

#### Details

- **Signatures & Types**: `flight.abilityActivation?: {kind:'split'|'explosion'; source:'click'|'space'|'auto-contact'|'auto-ground'; time:number; point:{x:number;y:number}}`; 신규 상태나 저장 필드 없음.
- **Data & Schema Fields**: `flight.splitOrbs?: {splitTime:number; splitPoint:{x:number;y:number}; children:ChildOrb[]}` 기존 구조를 사용한다. React ref 기반 SVG 표시는 비전투 데이터다.
- **Execution Flow / Logic**:
  1. 자동 분열이 직접 명중에서 왔는지 `flight.abilityActivation.kind==='split'`, `source==='auto-contact'`, `flight.hitIds.length>0`으로 판별한다.
  2. `activatePlannedAbility`가 `withWizardSplit`에 직접 맞힌 적의 ID와 진행 방향을 넘긴다. 자식 충돌 후보에서 이 적을 빼고, 명중점보다 발사 방향 앞쪽 X 위치에 있는 적만 남긴다. 자동 직접 명중의 자식은 위로 튀어 뒤쪽으로 이어지는 분열 속도를 갖고, 후보가 없어도 두 자식 경로를 생성한다.
  3. `BattleArena.activateAbility`가 명중점에 짧은 분열 큐를 저장한다. 몬스터보다 위에 놓인 별도 SVG 레이어에서 약 0.4초간 양쪽으로 퍼지는 링·파편을 표시한다. 기존 큰 사탕의 충돌과 두 자식 경로는 유지한다.
  4. reduce-motion에서는 긴 애니메이션을 생략하고 짧은 정적 강조를 보인다. 현재 피해 수치·발사 예약·발사 결과는 바꾸지 않는다.
- **Error & Exception Handling**: 능력 메타가 없거나 수동 발동이면 새 이펙트는 렌더링하지 않는다. 시간 값이 유효하지 않으면 숨긴다.
- **State Transition & Return**: 발사 1회와 피해 해결 1회를 유지하며, 직접 맞힌 적은 큰 스톤 피해만 받고 자식은 뒤쪽 적에 닿은 경우만 추가 피해를 준다.

### I02. 국소 회귀 검증

- Related Files:
  - `tests/shot-hit-integrity.test.mjs` :: 직접 명중 후 자동 발동·자식 궤적·결과 메타 확인; modify.

#### Details

- 고정된 숲 2라운드 seed 0에서 `wizard-orb`, 각도 60도·power .31의 직접 명중을 준비한다. 자동 발동 시각이 `directHitTime`과 같고 `auto-contact`가 허용되며 두 자식 경로가 실제 발사 결과에 반영되는지 검증한다. 직접 맞힌 적은 `childHits`에 없어야 한다.
- 전체 테스트와 브라우저 회귀는 배포 시 실행한다.

## Acceptance Criteria

- [ ] 직접 명중 뒤 자동 분열 섬광이 보이고 두 구슬이 표시된다.
- [ ] 직접 맞힌 몬스터는 자식 구슬에 즉시 다시 맞지 않으며, 뒤쪽 적에 닿으면 자식 피해가 적용된다.
- [ ] 자동 발동이 수동 입력 없이 완료되며 수동 발동 규칙은 유지된다.

## Validation

- `node --test tests/shot-hit-integrity.test.mjs` — 12개 통과. 직접 명중 뒤 자동 분열·재타격 방지·뒤쪽 적 실제 충돌 확인.
- `node --test tests/shot-geometry.test.mjs` — 관련 궤적 테스트 27개 통과.
- `node --test tests/candy-presentation.test.mjs` — 능력 HUD 5개 통과.
- `npm.cmd run build` — 변경된 JSX/CSS 컴파일 확인.
- `git diff --check` — 공백 오류 확인.
- 전체 단위·브라우저 테스트는 배포 때 실행.

## Commit Message

```text
fix(game): 마법사 스톤 명중 후 자동 분열 연출 강화

Plan: 2026-11-11-wizard-hit-auto-split
Phase: P01-auto-split
Task: T01-impact-then-split

- 직접 명중 후 자동 분열 지점을 분명하게 표시
- 자동 발동과 자식 충돌 결과를 국소 테스트로 확인
```

## Progress

- [x] 구현 완료
- [x] 변경 범위 국소 테스트·빌드 검증 완료 (브라우저·전체 회귀는 배포 시 확인)
- commit: `2ed3f16`
