# Task: T02 마법사 분열과 연금술사 폭발의 추가 입력

## Status: pending

## Goal
마법사·연금술사 전용 스톤 비행 중 추가 클릭/Space 한 번으로 현재 위치에서 실제 분열/폭발을 실행하고, 무입력 자동 발동도 화면과 피해가 일치한다.

## Decision Summary
- 첫 적·장애물 접촉은 즉시 자동, 바닥 접촉은 0.5초 입력 유예 후 자동. 창 관통은 기존대로 전용 능력 대신 창 판정이다.
- 연금술사 폭발은 원본을 소멸시킨다. 성공률 C/B/A = 20/45/70%, 범위 C/B/A = 300/375/450, 성공 시 적마다 1 피해; 실패도 연출한다.

## Implementation

### I01. 예약된 샷의 능력 활성화와 권위 있는 경로
- Related Files:
  - `src/game/gameSession.js` :: `actions.beginShot`, new `actions.activateFlightAbility`, `actions.fireShot` — modify
  - `src/game/shotResolution.js` :: `preparePhysicalFlight`, `flightResultPayload` — modify
  - `src/game/shotGeometry.js` :: `planShot`, `withWizardSplit`, new `activatePlannedAbility` — modify
  - `assets/js/battle-engine.js` :: `resolveProjectile` — replace splash resolution with explosion; modify
- **Signatures & Types**:
  ```js
  activateFlightAbility({ shotId, encounterId, simulationTime, source })
    // -> {accepted:boolean, flight?:Flight, reason?:string}; source 'click'|'space'|'auto-contact'|'auto-ground'
  activatePlannedAbility({ baseFlight, layout, enemies, kind, time, grade, success })
    // -> Flight with abilityActivation and authoritative derived contacts/hits
  ```
- **Data & Schema Fields**: Private pending shot holds `{shotId,encounterId,pull,baseFlight,flight,abilityActivated:false}`. `abilityActivation: null | {kind:'split'|'explosion',time:number,point:{x,y},source:string,success?:boolean,radius?:number}`. The reserved `flight` alone determines `hitIds`, child hits, explosion target IDs and `flightResultPayload`; callers cannot supply invented contacts. Keep finite times in `[0,baseFlight.durationSeconds+0.5]` and one activation per token. Use the session's injected RNG for Alchemist chance exactly once at activation; no reroll on render/retry.
- **Execution Flow / Logic**: `beginShot` plans the physical parent without automatic Wizard/Alchemist ability but with wind/obstacle/monster physics. On activation, sample current actual position at the supplied playback simulation time, clamp/validate token and state, derive Wizard child trajectories and their real contacts or truncate Alchemist parent at explosion and discard all later parent contacts/hits. Contact auto activation uses first enemy/obstacle impact time; grounded stone may continue the existing roll for 0.5s while input is accepted, then auto explodes/splits at its sampled position. For a direct enemy collision, apply original direct hit before the new effect. Keep existing Wizard original-stone continuation, two child hits of 1 each and third-hit bonus. Ground split children launch visibly above the floor. Cancellation/stale shot prevents late activation.

### I02. Playback, HUD, and tests
- Related Files:
  - `src/components/BattleArena.jsx` :: `startFlight`, flight progress callbacks, keyboard/click handlers, `completeFlight` — modify
  - `src/components/ProjectileFlight.jsx` :: animation of updated flight — modify
  - `src/components/ObstacleRegionalEffects.jsx` or `src/components/BattleArena.jsx` :: explosion/child effects — modify
  - `src/game/candyPresentation.js`, `src/game/gameData.js` :: exact ability descriptions — modify
  - `src/styles/arena.css` — explosion, reduced-motion still readable; modify
  - `tests/shot-geometry.test.mjs`, `tests/shot-hit-integrity.test.mjs`, `tests/game-session.test.mjs`, `tests/e2e/shot-integrity.spec.cjs`, `tests/e2e/stone-hud.spec.cjs` — modify
- **Execution Flow / Logic**: Accept second arena click or Space only for the active Wizard/Alchemist shot; a HUD button click must not detonate. Prevent Space scroll and repeated keyboard events. Replace the currently precomputed auto cues with cues from the updated reserved flight; keep camera following until new completion. Render success/failure explosion distinctly but do not reveal RNG before activation. Tests cover midair at various times, automatic obstacle/enemy, ground 0.5s, no second activation, off-map, moving crow/falling rider, spear exclusion, explicit Fireball modifier only on original direct damage, and forged metadata rejection.

## Acceptance Criteria
- [ ] Manual input changes actual impact/result, not just a decorative animation.
- [ ] Alchemist blast roll and grade radius match the visible effect; failed blast does no area damage.
- [ ] Wizard children originate at actual activation point; old automatic apex split is removed.

## Validation
- `node --test tests/shot-geometry.test.mjs tests/shot-hit-integrity.test.mjs tests/game-session.test.mjs tests/stone-combat.test.mjs` — dynamic paths and damage
- `npx playwright test tests/e2e/shot-integrity.spec.cjs tests/e2e/stone-hud.spec.cjs` — input/playback
- `npm run build` — React build

## Commit Message
```text
feat(candy): 비행 중 마법 분열과 연금 폭발 입력 추가

Plan: 2026-10-30-active-candy-abilities-and-wind-weather
Phase: P02-battle-abilities
Task: T02-midflight-abilities

- 추가 클릭과 Space로 현재 위치에서 한 번 발동
- 폭발 확률과 피해를 실제 충돌 판정에 연결
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
