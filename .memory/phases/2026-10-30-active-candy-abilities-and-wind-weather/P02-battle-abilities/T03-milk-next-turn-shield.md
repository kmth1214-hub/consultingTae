# Task: T03 우유 전용 스톤의 즉시 회복과 다음 턴 보호막

## Status: done

## Goal
우유 스톤이 적에게 실제로 직접 닿으면 체력 5가 즉시 회복되고 다음 **플레이어 발사 턴**의 적 공격 한 번만 막는다.

## Decision Summary
- 발동한 발사 직후 반격은 막지 않는다. 다음 발사가 끝날 때 미사용 보호막도 사라진다. 기존 3회 명중 회복과 라운드당 보스 1회 자동 방어는 제거한다.
- 다른 쿠키가 슬롯으로 우유 스톤을 얻었다면 스톤의 직접 명중 능력은 동일하게 적용한다. 창 아이템이 전용 능력을 대체하는 기존 규칙은 유지한다.

## Implementation

### I01. 엔진 턴 상태와 공격 차단
- Related Files:
  - `assets/js/battle-engine.js` :: `createRunState`, `enterRound`, `resolveProjectile`, `applyIncomingDamage`, `finishAction`, `WEAPON_CATALOG` — modify
  - `src/game/gameData.js` :: `CHARACTERS` note — modify
  - `src/game/candyPresentation.js` :: `getCandyDetails` — modify
- **Signatures & Types**:
  ```js
  run.milkShieldPending // boolean: direct hit during current shot earned next-shot shield
  run.milkShieldActive  // boolean: activated only for the following accepted player shot
  // resolveProjectile(state, { shotMeta, hitIds, ... }) existing signature
  ```
- **Data & Schema Fields**: `healedPlayer` event remains an integer. `event.milkShieldGained: boolean`, `enemyAttack.blockedBy: 'milk'` when used. Do not use the old `roundEffects.milkBossBlockUsed` or the shared `effectCounters.projectileCollisions` for Milk healing. `playerHp` stays within `[0,100]`.
- **Execution Flow / Logic**: At the start of the next accepted projectile, move the pending protection into active before `finishAction`; the shield gained during that same projectile stays pending for the following turn. On first live direct Milk hit (not obstacle/rider/child hit), heal 5 once per shot, cap 100, and arm pending shield; no healing on missed shot. `applyIncomingDamage` gives an armed consumable defense first priority, then Milk active shield. Resolve the current enemy counterattack with preexisting active shield only, not the newly earned one. After next projectile's `finishAction`, expire the active shield even if no attack or the round cleared; keep newly pending shield if the next shot itself was Milk. Across round transition preserve a pending shield until the actual next player launch. Do not let a consumable use or enemy animation consume a turn.

### I02. Visible feedback and tests
- Related Files:
  - `src/components/PlayerCookie.jsx`, `src/components/BattleArena.jsx`, `src/components/BattleScreen.jsx` — shield/heal feedback; modify
  - `tests/battle-engine.test.cjs`, `tests/gameplay-rules.test.cjs`, `tests/candy-presentation.test.mjs`, `tests/e2e/player-cookie.spec.cjs` — modify
- **Execution Flow / Logic**: Render the protection only while pending for the next shot or active during its enemy response; show +5 actual healing (including +0 at full HP) and blue shield block. Tests cover direct hit, miss, over-heal cap, immediate counterattack not blocked, next hit blocked, no attack next shot expiry, defense-item priority, boss shock, multiple Milk hits, and borrowed Milk stone.

## Acceptance Criteria
- [ ] Direct Milk hit heals exactly 5 once and does not block its own turn's attack.
- [ ] Next player shot blocks at most one enemy attack and protection then expires.
- [ ] Old third-hit/boss auto-block rules are gone from engine and HUD.

## Validation
- `node --test tests/battle-engine.test.cjs tests/gameplay-rules.test.cjs tests/candy-presentation.test.mjs` — protection state
- `npx playwright test tests/e2e/player-cookie.spec.cjs tests/e2e/candy-details.spec.cjs` — visible behavior
- `npm run build` — React build

## Commit Message
```text
feat(milk): 직접 명중 회복과 다음 발사 보호막 적용

Plan: 2026-10-30-active-candy-abilities-and-wind-weather
Phase: P02-battle-abilities
Task: T03-milk-next-turn-shield

- 우유 스톤 적중 시 체력 5 회복
- 다음 발사 뒤 첫 적 공격만 보호
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
