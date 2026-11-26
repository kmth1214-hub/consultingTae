# Task: T01 새 스톤 그림·능력 HUD·발동 연출

## Status: done

## Goal

7종 스톤을 발사 전·비행 중·피격 후 구별할 수 있게 그리고, 수동 능력 두 종류의 사용 시점을 화면과 터치 입력으로 알린다. 화면은 P02에서 확정한 실제 이벤트만 재생한다.

## Decision Summary

- 모든 12종 캐릭터 카드와 현재 스톤의 이름·등급·기본 피해 범위·능력·발동 방식이 읽혀야 한다.
- 체리·에스프레소는 비행 중 클릭·Space 또는 모바일 능력 버튼으로 발동한다. 충돌/착지 후 자동 발동도 화면에 보인다.
- 기존 마법사·연금술사·바람궁수·우유맛 연출과 성능·단축키는 유지한다. 발사체 그림만 바꿔 물리 판정과 어긋나지 않게 한다.

## Implementation

### I01. 스톤별 발사체와 시간별 효과

- Related Files:
  - `src/components/CandyProjectileArt.jsx` :: `stoneId` 7종에 대한 SVG 그림/색상; modify.
  - `src/components/ProjectileFlight.jsx` :: 예약된 `flight.physicsModifier`, `flight.candyRadius`, `flight.bomb`, `flight.vortex`, `flight.abilityContacts`의 시간별 재생; modify.
  - `src/components/BattleArena.jsx` :: `showAbilityContacts`, `visualAbilities`, 적 위치/미니맵 반영, 능력 버튼; modify.
  - `src/styles/arena.css` :: 가속, 확장 반경, 베기, 파도, 서리, 체리 폭발, 소용돌이 시각 효과; modify.
  - `tests/projectile-playback.test.mjs` :: 발사체 재생이 실제 event time과 일치하는지; modify.

#### Details

- **Signatures & Types**:
  ```typescript
  type ProjectileVisual = {stoneId:string; variant:'normal'|'fireball'|'spear';
    radius:number; simulationTime:number};
  // CandyProjectileArt({variant, stoneId}) -> SVG artwork
  // ProjectileFlight({flight,onProgress,onComplete,onFailure}) -> time-sampled playback
  ```
- **Data & Schema Fields**: 기존 `flight.loadedStoneId`, `flight.candyRadius`, `flight.abilityKindPending`, `flight.abilityActivation`, `flight.abilityContacts`를 이용한다. P02의 `physicsModifier`, `bomb`, `vortex`, `event.frozenEnemyIds`, `enemy.frozenNextAttack`을 읽어 그린다. UI 전용 RNG나 가상 피해 대상 ID를 만들지 않는다.
- **Execution Flow / Logic**:
  1. 각 새 스톤에 식별 가능한 색·실루엣을 지정한다. 용감한은 0.25초 가속 흔적, 딸기맛은 실제 확대 반경과 같은 시각 크기, 칠리는 실제 선분, 바다요정은 지면 파도, 서리여왕은 선택된 적의 빙결 표시를 쓴다.
  2. 체리 폭탄은 설치 지점에서 원래 스톤과 분리되어 0.35초 뒤 폭발한다. 에스프레소는 0.7초 소용돌이와 P02의 `VortexMove`대로 적이 이동하는 모습을 보인다. 파동·폭발·베기가 적에게 닿지 않았으면 피해 숫자를 만들어 표시하지 않는다.
  3. `onProgress`의 현재 시뮬레이션 시간으로 새 contact가 된 순간에 한 번만 cue를 노출한다. 화면 크기/카메라 확대가 바뀌어도 월드 좌표를 그대로 사용한다.
  4. `<button type="button">능력 발동</button>`을 비행 중 수동 능력(`cherry-bomb|vortex`)이 대기 중일 때만 표시한다. 터치 버튼은 `activateAbility('click')`의 기존 샷 ID 검사로 전달한다. 발동 직후 숨기고 자동 발동과 중복되지 않게 한다.
- **Error & Exception Handling**: `flight` 교체/장면 이탈 시 오래된 폭탄·소용돌이 animation frame과 cue를 비운다. 발사 취소·적 반격 중에는 능력 버튼이 없다.

### I02. 명단·보상·스톤 정보 문구

- Related Files:
  - `src/game/candyPresentation.js` :: `getCandyDetails` 새 7종 `currentAbility`, `passives`, 피해 범위; modify.
  - `src/components/MagicCandyCard.jsx` :: 현재 능력 문구·발동 키 읽기 쉬운 배치; 필요시 modify.
  - `src/components/RewardScreen.jsx`, `src/components/CampRewardResult.jsx` :: 새 스톤 이름·그림이 기존 보상 흐름에 드러나는지 확인, 필요시 modify.
  - `src/styles/game.css` :: HUD 및 터치 버튼 반응형 스타일; modify.
  - `tests/candy-presentation.test.mjs` :: 7종 능력 문구/등급 및 창·불공 설명; modify.

#### Details

- `getCandyDetails(run)`의 기존 반환 구조 `current:{id,name,grade}`, `damage:{min,max,multiplier}`, `currentAbility:string`, `next`, `buffs`, `passives`는 유지한다. 새 문구에는 등급별 실제 수치를 표시한다. 체리·에스프레소는 클릭·Space·터치 버튼 및 자동 발동 조건을, 나머지는 자동 발동 조건을 적는다.
- 창을 준비한 경우는 기존 우선 문구처럼 전용 능력이 이번 발사에서 대체됨을 표시한다. 불공은 기본 직접 피해만 2배라는 기존 설명을 유지한다. `candyPresentation.js`의 이미 수정된 사용자 변경분을 버리지 않고 관련 부분만 수정한다.

## Acceptance Criteria

- [ ] 신규 7종 모두 장전·비행 시 그림이 구별되고 실제 접촉 이벤트와 연출 시점이 일치한다.
- [ ] 체리·에스프레소는 마우스·Space·터치 버튼이 같은 한 번 발동으로 연결된다.
- [ ] 빙결·적 이동 후 현재 전장과 미니맵이 서로 다른 적 위치를 보여주지 않는다.
- [ ] 기존 5종 HUD와 능력 버튼·단축키는 유지된다.

## Validation

- `node --test tests/candy-presentation.test.mjs tests/projectile-playback.test.mjs` — 문구와 시간별 연출.
- `npm.cmd run build` — JSX/CSS/자산 번들 확인. 전체 브라우저·전체 테스트는 배포 때 실행한다.

## Commit Message

```text
feat(ui): 신규 전용 스톤 연출과 능력 안내 추가

Plan: 2026-11-26-twelve-cookie-roster-and-signature-stones
Phase: P03-presentation-and-verification
Task: T01-stone-visuals-and-controls

- 스톤별 발사체·피격 효과를 예약 발사 결과에 연결
- 체리·에스프레소의 터치 발동 버튼과 HUD 설명 추가
```

## Progress

- [x] 구현 완료
- [x] 지정 검증 통과
- commit: 이 문서를 포함한 Task 커밋
