# Task: T04 Accurate Candy Details

## Status: done

## Goal
장전된 사탕의 가능한 피해와 적용 능력을 오해 없이 읽고, 이미 정해진 다음 사탕을 확인한다.

## Decision Summary
- 피해는 발사 때 무작위 결정되므로 범위와 조건을 구분한다. 모든 보유 무기의 상시 능력을 현재 장전 무기의 고유 효과와 혼동하지 않는다.
- 각도/파워 수치는 숨기고 발사 중 사탕 카드를 숨기는 기존 규칙을 유지한다.

## Implementation
### I01. Read-only candy view model and HUD
- Related Files:
  - `src/game/candyPresentation.js` :: `getCandyDetails` — engine state -> accurate UI; new
  - `src/components/MagicCandyCard.jsx` — current/next, buffs and passive conditions; modify
  - `src/styles/arena.css` — readable compact responsive card; modify
  - `assets/js/battle-engine.js` :: damage/ability constants read-only; only expose shared constants if needed to avoid divergent logic
#### Details
- **Signatures & Types**:
  ```ts
  getCandyDetails(run):null|{current:{id,name,grade},damage:{min:number,max:number,multiplier:number},
    next:{id,name,grade}|null,reshuffleNext:boolean,buffs:string[],passives:Array<{id:string,text:string}>};
  ```
- **Data & Schema Fields**: `current` comes from BattleEngine.getCurrentWeapon; next uses weaponQueue[1] only. Pure function never rolls RNG or mutates counters/queue. C range 0–4 (min1 after zeroRollsThisRound>=2), B1–5,A2–6; Fireball ×2 shown with its resulting range or clearly separate multiplier. Conditionals remain separate from base damage. Unknown/no weapon returns null safely.
- **Execution Flow / Logic**: deduplicate passive IDs from all run.weapons. Explain Adventurer third successful permanent-hit score+10 using permanentWeaponHits; Alchemist each consumable score+10; Wizard every third projectile collision damage+1; Milk every third collision HP+1 and once-per-round first boss protection; Wind once-per-round guided target (boss+1) and current available/used status. Show meaningful trigger progress with actual counter, do not imply a bonus is guaranteed when no direct hit occurs. Buffs include fireball, pending aim inversion and armed defense/ice guard when applicable, correctly labeled shot/next-attack effects. Preserve queue as randomized once per refill and unknown next on final queue entry.
- **UI**: grade/name, “기본 피해 n–m · 발사 시 무작위”, concise active-effect badges, owned passives in a compact accessible disclosure to avoid hiding the map, “다음” preview or reshuffle notice. The current card remains hidden during all shot playback. No full trajectory or calculated aim numbers. Respect mobile overlap constraints; disclosure can scroll internally with bounded height.

### I02. Tests and full acceptance
- Related Files:
  - `tests/candy-presentation.test.mjs` — pure state ranges and counters; new
  - `tests/e2e/candy-details.spec.cjs` — real HUD and mobile/flight behavior; new
  - existing browser suites — adapt only obsolete expectations caused by this plan
#### Details
- Test all grades, zero cap, Fireball, deduplicated cross-weapon passives, queue wrap/unknown, not mutated, Wind used state, conditional counters. Browser checks names/ranges/current vs next, passive disclosure, buff changes after item use, hidden throughout flight and reappears afterward, mobile no overflow. Run all unit tests, build and complete browser suite once feature checks pass; inspect real screenshots of current/expanded cards and camp reveal.

## Acceptance Criteria
- [x] Current/next candy details match real engine state; no predicted exact roll or concealed aim numbers leak into HUD.
- [x] Full game flows, narrow screens, reduced motion and non-Forest regional effects pass validation.

## Validation
- `npm.cmd test` — pass
- `npm.cmd run build` — pass
- `npm.cmd run test:e2e` — pass (isolated preview port if needed)

## Commit Message
```text
feat(HUD): 이번 사탕의 피해 범위와 적용 능력 및 다음 사탕 안내

Plan: 2026-10-26-forest-log-physics-and-reward-clarity
Phase: P01-physical-feedback
Task: T04-candy-details

- 무작위 피해 범위와 보유 상시 능력·일시 강화 구분
- 다음 장전 예고와 모바일·전투 흐름 회귀 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 123 unit tests and build passed. Full browser run: 100/102 passed; two obsolete fixed-layout assertions were updated and both passed on targeted rerun. Current/expanded/phone HUD and camp reveal screenshots inspected.
- commit: pending
