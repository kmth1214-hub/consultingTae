# Task: T04 바람궁수 Q 자동 유도와 연쇄 폭풍

## Status: pending

## Goal
캐릭터별 충전 스톤 조건으로 4점을 모으고, 바람궁수 스톤이 장전되었을 때 Q로 다음 한 발의 유도 또는 연쇄 폭풍을 발동한다.

## Decision Summary
- 바람궁수 본인은 기본 스톤만 충전(+1 통과, +2 통과+직접 명중)하고 Q 일반 유도는 3발 재사용 대기. 다른 쿠키는 바람궁수 스톤만 충전하며 4점 Q 연쇄만 사용하고 별도 대기는 없다.
- 유도 발사 전 궤도 미리보기는 숨기지만 비행 스톤·짧은 흔적은 보인다. 연쇄 기준은 실제 맞힌 적의 X 순서와 원래 직접 피해(불공 보정 후, 남은 HP 제한 전)다.

## Implementation

### I01. 충전·Q 상태·연쇄 피해
- Related Files:
  - `assets/js/battle-engine.js` :: `createRunState`, `enterRound`, `resolveProjectile`, `finishAction`, new `armWindSkill` — modify
  - `src/game/gameSession.js` :: new `actions.armWindSkill`, `actions.beginShot`, `actions.fireShot` — modify
  - `src/game/shotResolution.js` :: `preparePhysicalFlight`, `flightResultPayload` — modify
- **Signatures & Types**:
  ```js
  armWindSkill(state) // -> {accepted:boolean, mode?:'homing'|'storm',reason?:string}
  run.windCharge // integer 0..4; survives rounds
  run.windCooldownShots // integer 0..3, Wind Archer only; survives rounds
  run.windArmedMode // null|'homing'|'storm'; valid only until next accepted Wind-stone shot
  shotMeta.windCrossed // boolean validated against reserved flight
  ```
- **Execution Flow / Logic**: Validate active battle, no pending flight/review/response, loaded ID `wind-candy`, no duplicate Q arm. Wind Archer Q with charge below 4 and zero cooldown arms `homing` without consuming charge; with charge 4 arms `storm` and resets charge immediately. Any other character requires charge 4, arms `storm` without homing and has no cooldown. An armed shot consumes mode even on miss. Wind Archer sets `windCooldownShots=3` after that shot; each *subsequent accepted player shot* decrements once; items/enemy actions do not. Charge increment uses reserved `shotMeta.windCrossed`, loaded ID (`basic-stone` for Wind Archer, `wind-candy` for others), and actual direct contact(s), at most 2/shot, capped 4; obstacle/area/child damage never counts. Preserve round transitions. A Q shot after charge reset can begin recharging only if it is an eligible charging stone; this is possible for borrowed Wind stones but not for Wind Archer's own dedicated stone.
- **Chain Storm**: Trigger once only after real direct hit. For spear, anchor the last actually pierced enemy. Compute base from rolled weapon damage × Fireball modifier, before enemy HP capping. Sort living enemy slots by horizontal world X from launcher, stable tie-break by ID. For each preceding slot with distance in index steps `n`, apply `max(0, base-n)` as a separate `wind-chain` hit and score using current grade multiplier; a target directly hit by spear can also receive chain damage. No target/phantom hit on a miss. Do not let chain damage itself charge wind.

### I02. Guided physical path, controls, and HUD
- Related Files:
  - `src/game/shotGeometry.js` :: `getHomingPath`, `planShot` — gated homing and winding, obstacle-bypassing route; modify
  - `src/components/BattleScreen.jsx` :: keydown Q — modify
  - `src/components/BattleArena.jsx`, `src/components/TrajectoryPreview.jsx`, `src/components/ProjectileFlight.jsx` — hidden preview when armed, curved path and short trace; modify
  - `src/game/candyPresentation.js`, `src/game/gameData.js`, `src/components/MagicCandyCard.jsx` — charge/cooldown/skill descriptions; modify
  - `src/styles/arena.css` — ability-ready cue and reduced motion; modify
  - `tests/wind-skill.test.mjs`, `tests/e2e/wind-skill.spec.cjs` — new
  - `tests/shot-geometry.test.mjs`, `tests/shot-hit-integrity.test.mjs`, `tests/e2e/shot-integrity.spec.cjs` — modify
- **Execution Flow / Logic**: Preserve the existing closest-to-ballistic-endpoint target selection for Wind Archer's Q homing, with a gentle weave/roller-coaster curve that remains inside authored bounds, clears obstacles, and ends at actual target. The Q-disabled Wind stone follows ordinary ballistic wind physics. For another cookie's Q storm, use ordinary ballistic trajectory; direct contact is required. Hide only the prelaunch trajectory preview for armed homing, not the stone or playback trace. Show charge `0/4`, Q-ready/cooldown and `storm` state where players can read them; prevent Q keyboard repeat and focus hijack from controls. Existing reverse fire must not create a forced hit. Tests cover both characters, basic/borrowed charging, 2-zone one-shot cap, piercing direct count cap, cross-round persistence, Q on miss, 3 later-shot cooldown, zero falloff, Fireball/Spear combination, boss-only roster, and no fabricated enemy hit.

## Acceptance Criteria
- [ ] Wind Archer can Q home once and later reuse after exactly 3 further launches; borrowed Wind stone never homes.
- [ ] Charge is 0..4 and only eligible stone/wind crossing contributes; Q storm damages actual front enemies with 1-step falloff.
- [ ] HUD, preview, and in-flight route match the committed engine event.

## Validation
- `node --test tests/wind-skill.test.mjs tests/shot-geometry.test.mjs tests/shot-hit-integrity.test.mjs tests/stone-combat.test.mjs` — skill physics/damage
- `npx playwright test tests/e2e/wind-skill.spec.cjs tests/e2e/shot-integrity.spec.cjs` — Q controls/preview
- `npm run build` — React build

## Commit Message
```text
feat(wind): Q 자동 유도와 충전형 연쇄 폭풍 추가

Plan: 2026-10-30-active-candy-abilities-and-wind-weather
Phase: P02-battle-abilities
Task: T04-wind-q-chain-storm

- 쿠키별 바람 충전 조건과 재사용 대기 적용
- 실제 명중 위치 기준 연쇄 피해와 유도 비행 표시
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
