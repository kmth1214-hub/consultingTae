# Task: T02 전용 스톤 카탈로그와 해금·슬롯 보상

## Status: pending

## Goal

새 7개 쿠키로 전투를 시작할 수 있고 각자 전용 C등급 스톤 1개와 기본 스톤 2개를 보유하게 한다. 슬롯 당첨은 현재 계정에 해금된 12종 전용 스톤 중 하나를 동일 확률로 지급한다.

## Decision Summary

- 기존 5종, C/B/A 피해·점수, 보유 스톤당 탄수, 중복 스톤 선택 합성, 슬롯 3×3 규칙은 유지한다.
- 바다요정·서리여왕 스톤은 우유맛·바람궁수 스톤과 함께 `snowAreaCleared`가 계정에 저장된 뒤 보상 풀에 들어간다. 프로필 DB 필드 추가는 없다.

## Implementation

### I01. 엔진 카탈로그와 지급

- Related Files:
  - `assets/js/battle-engine.js` :: `WEAPON_CATALOG`, `CHARACTER_WEAPONS`, `createRunState`, `availableRewardWeapons`, `unlockedSlotStoneIds`, `spinRewardSlot`, `grantWeapon`; modify.
  - `src/game/gameSession.js` :: `startRun`의 `CHARACTERS` 검증·`snowRewardsUnlocked` 전달을 확인하고 신규 ID가 통과하도록 필요한 부분만 modify.
  - `api/src/leaderboard/validation.js` :: `COOKIE_IDS`에 신규 7개 ID를 추가하고 점수·지역·라운드 등 다른 제출 검증은 유지; modify.
  - `tests/battle-engine.test.cjs`, `tests/candy-unlock.test.mjs`, `tests/slot-rewards.test.mjs` :: 신규 시작·잠금·보상 검증; modify.
  - `tests/api/leaderboard-api.test.cjs` :: 신규 7개 ID 제출 허용, 임의 ID·추가 필드는 계속 거부; modify.

#### Details

- **Signatures & Types**:
  ```typescript
  type Grade = 'C'|'B'|'A';
  type Weapon = { id:string; name:string; grade:Grade; effect:string; requiresSnowClear?:boolean; instanceId?:string; ammoType?:'magic-candy' };
  type CharacterWeaponMap = Readonly<Record<CharacterId, Weapon['id']>>;
  // createRunState({characterId, snowRewardsUnlocked, weapons?, ...}) -> RunState
  // spinRewardSlot(state, 'stone', rng) -> {accepted:boolean, prizeId?:string, ...}
  ```
- **Data & Schema Fields**: `WEAPON_CATALOG`에 아래 7개를 `grade:'C'`로 추가하고 `CHARACTER_WEAPONS`에 첫 두 열을 그대로 매핑한다. `effect`는 마지막 열의 설명을 사용한다. 마지막 두 항목만 `requiresSnowClear:true`이며 나머지는 필드가 없다.

  | Character ID | Weapon ID | name | effect |
  | --- | --- | --- | --- |
  | `gingerBrave` | `ginger-dash-stone` | 용감한 돌진 스톤 | 발사 0.25초 뒤 등급별 수평 속도 +12/18/24% |
  | `strawberry` | `strawberry-lollipop-stone` | 회전 롤리팝 스톤 | 등급별 실제 충돌 반경 1.25/1.35/1.45배 |
  | `cherry` | `cherry-bomb-stone` | 체리 폭탄 스톤 | 클릭·Space로 폭탄 설치, 지연 폭발 반경 150/180/210 |
  | `chiliPepper` | `chili-slash-stone` | 칠리 베기 스톤 | 직접 명중 뒤 다른 적까지 거리 180/240/300 베기 |
  | `espresso` | `espresso-vortex-stone` | 소용돌이 스톤 | 클릭·Space로 소용돌이, 일반 적 이동 |
  | `seaFairy` | `sea-wave-stone` | 파도 스톤 | 첫 접촉 뒤 길이 420/560/700의 지면 파도 |
  | `frostQueen` | `frost-stone` | 서리 스톤 | 직접 명중한 적과 등급별 주변 적 다음 반격 1회 건너뛰기 |
- **Execution Flow / Logic**:
  1. `createRunState`의 기존 `[starter,basic,basic]` 구조를 유지해 모든 신규 쿠키가 3발 시작한다. 임의의 없는 ID는 기존처럼 RangeError.
  2. `availableRewardWeapons`는 `snowRewardsUnlocked || snowAreaCleared` 기준으로 잠금 스톤 4종을 함께 필터링한다. `unlockedSlotStoneIds`는 기본 스톤을 제외한 현재 해금 스톤만 반환한다.
  3. `spinRewardSlot`의 3×3 당첨 확률과 풀에서 균등한 1회 추첨을 유지한다. 실패는 기본 스톤 1개, 당첨은 전용 스톤 C등급 1개. 슬롯 지급은 자동 합성하지 않으며 재장전은 다음 라운드부터 기존 규칙을 따른다.
  4. 다른 쿠키가 보상으로 받은 전용 스톤도 `grantWeapon`에서 수락한다. 잠긴 스톤 직접 지급 시 기존 `candy-locked`를 반환한다.
  5. 결과 화면의 `submitMainRunRecord`가 보내는 신규 `cookieId` 7개를 리더보드 API의 `COOKIE_IDS`에서도 허용한다. 클라이언트 명단 확장만 하고 API를 그대로 두면 점수 제출이 400으로 실패하므로 같은 Task에서 고친다.
- **Error & Exception Handling**: 비어 있는 당첨 풀이면 `undefined` 무기를 만들지 않도록 방어한다. 프로필 로드 실패 시 기존 게임 시작 차단을 유지하고 브라우저 기록을 계정 기록으로 수입하지 않는다.
- **State Transition & Return**: `state.weapons`에는 `instanceId`를 가진 서로 다른 스톤 인스턴스가 추가되고 `roundAmmoCapacity`는 인스턴스 수를 그대로 반환한다.

### I02. 경계별 지정 테스트

- Related Files:
  - `tests/candy-unlock.test.mjs` :: `snowAreaCleared` 전후 네 잠금 스톤 확인.
  - `tests/slot-rewards.test.mjs` :: 12종 풀의 균등 인덱스 추첨·실패 시 기본 스톤·중복 지급 확인.

#### Details

- 해금 전 8종(기존 3 + 신규 공개 5), 해금 후 12종 전용 스톤이 풀에 있는지 검사한다.
- 다른 쿠키가 얻은 전용 스톤을 발사 큐에 올릴 수 있고, C 스톤 중복 당첨 시 개수가 증가하며 자동으로 B가 되지 않는지 검사한다.
- 기존 점수·등급 피해 데이터와 우유맛·바람궁수 해금 규칙이 변하지 않았는지 검사한다.

## Acceptance Criteria

- [ ] 12개 캐릭터 ID 모두 `createRunState`에서 전용 1·기본 2개, `maxAmmo=3`으로 시작한다.
- [ ] 해금 전후 슬롯 풀에 각각 8·12개 전용 스톤 ID가 있으며 잠금된 보상은 나오지 않는다.
- [ ] 슬롯 보상, 합성, 무기 큐, 등급 피해와 계정 프로필 경계가 유지된다.
- [ ] 신규 7종으로 종료한 원정의 리더보드 제출이 쿠키 ID 검증을 통과한다.

## Validation

- `node --test tests/battle-engine.test.cjs tests/candy-unlock.test.mjs tests/slot-rewards.test.mjs tests/api/leaderboard-api.test.cjs` — 신규 카탈로그·해금·보상·제출 계약 확인.
- `npm.cmd run build` — 번들 확인.

## Commit Message

```text
feat(stones): 쿠키 12종 전용 스톤과 해금 보상 연결

Plan: 2026-11-26-twelve-cookie-roster-and-signature-stones
Phase: P01-roster-and-catalog
Task: T02-stone-catalog-and-unlocks

- 신규 전용 스톤 7종의 시작 지급과 눈 지역 잠금 등록
- 슬롯 해금 풀과 신규 쿠키 리더보드 제출 검증
```

## Progress

- [ ] 구현 완료
- [ ] 지정 검증 통과
- commit: pending
