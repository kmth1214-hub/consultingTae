# Task: T03 해금 스톤 풀에서 슬롯 당첨 보상 지급

## Status: done

## Goal
슬롯 당첨 시 현재 해금된 전용 스톤 풀에서 종류 하나를 균등 무작위로 뽑아 지급한다. 선택한 쿠키와 다른 전용 스톤도 획득할 수 있다.

## Decision Summary
- 기본 해금 풀은 모험가·연금술사·마법사 3종이다. 계정의 눈 지역 클리어 후 우유·바람궁수 2종을 더해 총 5종이다. 새 숲 플레이에도 적용된다.
- 현재 `spinRewardSlot`은 당첨 때 선택 쿠키의 스톤을 고정 지급한다. 최신 사용자 수정에 따라 수동 선택 화면 없이 균등 무작위 지급으로 교체한다. 미당첨은 기본 스톤 1개다.

## Implementation

### I01. 엔진의 해금별 당첨 풀
- Related Files:
  - `assets/js/battle-engine.js` :: `spinRewardSlot`, `grantWeapon`, `CHARACTER_WEAPONS`, `WEAPON_CATALOG` — modify
  - `src/game/gameSession.js` :: `actions.spinRewardSlot`, `startRun` — read-only/modify if needed to pass account unlock
- **Signatures & Types**:
  ```js
  unlockedSlotStoneIds(state) // -> ['adventurer-candy','alchemist-candy','wizard-orb', ...optional milk/wind]
  spinRewardSlot(state, 'stone', rng) // -> one result with exactly one granted stone
  ```
- **Data & Schema Fields**: `slotReward.stoneResults[]` keeps `{symbols,winningLine,prizeId,instanceId}`; no pending choice. `snowRewardsUnlocked || snowAreaCleared` determines whether the 5-stone pool is available. Draw an independent uniform `rng()` for prize **only after** a winning line; check finite `[0,1)` like existing slot draws. Grant one C-grade stone with `{mergeDuplicate:false}` and keep one new ammo instance. Normal unlocked non-owner stones must be accepted by `grantWeapon` without changing the character's starter stone.
- **Execution Flow / Logic**: Preserve the existing 3×3 line/symbol odds and two-spin camp/Chaos rules. On win select one of 3/5 unlocked IDs uniformly; on loss grant basic. Reject invalid RNG before mutating rewards or use a prevalidated sample so one spin never grants twice. Record exact prize for the reel result; round and camp proceed as today. A selected character's own special stone is **not** guaranteed on a win.

### I02. 슬롯 화면 및 검증
- Related Files:
  - `src/components/RewardScreen.jsx`, `src/components/CampSlotScreen.jsx`, `src/components/SlotMachine.jsx` — show actual random prize after reels stop; modify
  - `tests/slot-rewards.test.mjs`, `tests/e2e/slot-machine.spec.cjs` — modify
- **Execution Flow / Logic**: Keep existing 2.5-second reel/lever animation and hide the awarded stone until the final reel stops. Show the exact random stone name, including a different cookie's stone, without adding a choice screen. Preserve consumable slot and keyboard accessibility. Tests cover all 3/5 candidates, equal deterministic boundaries, no Milk/Wind before account unlock, a new Forest run after unlock, one prize per spin, camp double spins and no duplicate grant.

## Acceptance Criteria
- [ ] A winning spin grants exactly one currently unlocked special stone, independent of selected cookie.
- [ ] Milk/Wind cannot appear before account unlock and can appear in a new Forest run after unlock.
- [ ] A losing spin always grants one basic stone; normal round/camp continuation remains intact.

## Validation
- `node --test tests/slot-rewards.test.mjs tests/game-session.test.mjs` — engine/session rewards
- `npx playwright test tests/e2e/slot-machine.spec.cjs` — reel, selection and navigation
- `npm run build` — React build

## Commit Message
```text
feat(slot): 해금된 전용 스톤을 당첨 풀에서 지급

Plan: 2026-10-30-active-candy-abilities-and-wind-weather
Phase: P01-account-progression
Task: T03-cross-cookie-wind-reward

- 계정 해금 상태에 따라 당첨 보상 풀 구성
- 당첨 릴 결과에 실제 지급된 스톤 표시
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
