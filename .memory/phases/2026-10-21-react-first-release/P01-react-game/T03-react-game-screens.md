# Task: T03 React Game Screens

## Status: done

## Goal
Replace the prototype's imperative screen and HUD updates with accessible React components connected to the single tested battle engine and the confirmed first-release run flow.

## Decision Summary
- Keep the layout and game information from the current mockup while removing fake in-app login, leaderboard, admin, and prototype navigation tabs.
- Active run state is memory-only; local storage contains only the Snow-clear unlock from T02.
- Include the optional Chaos combat entry and separate result; exclude QR and all extra bonus rewards.
- Approved during T03: fix visual softness/proportions during migration. Keep the source aspect ratio and a single 1200×800 world, avoid oversized rescaling and added fog, keep HUD outside the camera world, and size decorative obstacles below actors. Replacing low-resolution regional source art remains a separate follow-up if necessary.

## Implementation

### I01. Add a single game-session controller
- Related Files:
  - `src/game/useGameSession.js` :: `useGameSession`; new
  - `src/game/battleEngine.js` :: engine adapter from T01; read-only
  - `src/game/profileStore.js` :: profile operations from T02; read-only
- **Signature**: `useGameSession({rng = Math.random, now = Date.now} = {})` returns `{screen, profile, selectedCharacter, run, aim, notification, startCharacterSelect, startRun, fireShot, useConsumable, selectReward, continueAfterReward, chooseCampReward, enterBonusRoute, resetAim, setAim, dismissNotification}`.
- **Data & Schema Fields**: screens are `home | characters | battle | reward | camp | main-results | bonus-results`; `outcome` is `defeat | clear | bonus-clear | null`; selected character is one of `{id,name,weaponId,asset}` for Adventurer, Alchemist, Wizard, Milk, Wind; `run` is a BattleEngine `RunState` or null; `notification` is `{id,message,kind}` or null.
- **Execution Flow / Logic**:
  1. Initialize at `home`; route to `characters` on the play CTA; do not render the old login or leaderboard screens.
  2. Load the Snow unlock profile once; disable Milk/Wind selection until unlocked. Selecting an unlocked Cookie calls `createRunState({area:'forest',round:1,characterId,weapons,now,rng})` and enters `battle`.
  3. Route `round-clear` to `reward`, then require one weapon and one consumable choice before continuing. Resolve a pending fusion prompt before completing a weapon reward.
  4. Route Forest/Snow boss reward into `camp`; persist the Snow unlock as soon as the Snow boss is cleared. Continue camp into the next region.
  5. Route City boss reward to `main-results`; expose a button for the optional bonus route and a separate new-run action. Starting bonus calls `startBonusRoute` and enters `battle`; Chaos rounds 1–2 bypass rewards; final bonus clear enters `bonus-results`.
  6. Actions reject stale/invalid state through engine `accepted` and `reason` values. After each accepted engine action, publish a new React object reference so all HUD fields derive from the same run state.
- **Error Handling**: do not duplicate gameplay rules in components. Show readable toast/status feedback for rejected actions, empty items, frozen-breath lockout, full inventory, and already-selected rewards.

### I02. Implement app and game screen components
- Related Files:
  - `src/App.jsx` :: `App`; replace T01 placeholder
  - `src/components/GameHome.jsx` :: `GameHome`; new
  - `src/components/CharacterSelect.jsx` :: `CharacterSelect`; new
  - `src/components/RewardScreen.jsx` :: `RewardScreen`; new
  - `src/components/CampScreen.jsx` :: `CampScreen`; new
  - `src/components/RunResults.jsx` :: `RunResults`; new
  - `src/components/Toast.jsx` :: `Toast`; new
  - `src/styles/game.css` :: screen and card styles; new
- **Signatures & Types**: each component receives values and callbacks through props; no component reads or mutates global DOM. `App()` switches on `screen` from `useGameSession` and renders one active screen with semantic headings and buttons.
- **Data & Schema Fields**: game home has the game title, short intro, and play button only; no fabricated company scores/identities. Character cards show exact Cookie art, weapon/effect description, and locked state. Reward cards identify weapon grade/effect or consumable; result view displays score, furthest area/round, Cookie, and elapsed play time. Bonus result separately displays main score and `bonusScore`.
- **Execution Flow / Logic**: convert screen markup from `cookie-roguelike-mockup.html` into React components; convert its inline `onclick` strings to callbacks. Use imported static assets from `ASSETS`; do not copy inline script or use `document.querySelector` for rendering/state.
- **Error Handling**: `img` elements have alt text; decorative art uses empty alt and `aria-hidden`; disabled character/reward actions expose accessible disabled states. Missing images render an explicit neutral fallback and do not block play.

### I03. Implement battle HUD and arena view composition
- Related Files:
  - `src/components/BattleScreen.jsx` :: `BattleScreen`; new
  - `src/components/BattleArena.jsx` :: `BattleArena`; new
  - `src/components/ConsumableTable.jsx` :: `ConsumableTable`; new
  - `src/components/MonsterGroup.jsx` :: `MonsterGroup`; new
  - `src/components/MagicCandyCard.jsx` :: `MagicCandyCard`; new
  - `src/styles/arena.css` :: arena and HUD layout; new
- **Data & Schema Fields**: arena gets `area`, `round`, `run`, `aim`, `onAimStart`, `onAimMove`, `onAimRelease`, `onConsumable`, and `onFullscreen` props. Consumable rows are fixed to `1=fireball`, `2=spear`, `3=defense`, `4=heal`; each shows its icon, count, keyboard number, and use button.
- **Execution Flow / Logic**:
  1. Render the active area background and its approved visual-only scenery; overlay the road, slingshot, monsters, projectile SVG, and scene feedback in one arena coordinate system.
  2. Put the consumable key table inside the arena at upper-left and magic-candy explanation at upper-right. Remove the bottom three-column aim/inventory panel from the mockup.
  3. Display angle as a compact readout adjacent to the slingshot and a vertical power meter immediately to its right.
  4. Derive HP, ammo, score, monster HP, weapon queue, and item counts from `run`; never store display copies that can drift.
  5. Show fireball/spear hit effects on monsters, Defense as a protective player shield, and Heal as a player recovery effect; these animations accompany the engine event and never substitute for it.
  6. Keep regional obstacles decorative only and preserve the route gap; do not add projectile collision or obstacle damage.
- **Error Handling**: key and button use call the same `onConsumable` action; prevent repeated use during launching or terminal screens, and announce errors via `role=status`.

## Acceptance Criteria
- [x] Play CTA opens character select; choosing a character enters Forest round 1 with live engine values.
- [x] Battle, reward, camp, city result, optional Chaos bonus, and final bonus result flow all use React state and existing engine APIs.
- [x] UI contains no fake login, leaderboard data, admin functions, QR image placeholder, or top-level prototype stage tabs.
- [x] Items and candy explanation are in the arena's upper corners; angle/power are beside the slingshot.
- [x] Refresh starts a fresh run but preserves the Snow unlock in the same browser.

## Validation
- `npm run build` — all JSX and image references compile.
- `npm run build` — home-to-character-to-battle components and image references compile; browser assertions are added in T05.

## Commit Message
```text
feat(react): build playable game screens

Plan: 2026-10-21-react-first-release
Phase: P01-react-game
Task: T03-react-game-screens

- Replace imperative mockup screens with React components.
- Connect HUD, rewards, area flow, and optional bonus challenge to the engine.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: `ba09a9d` (`feat(react): build playable game screens`)

### Implementation / Validation Notes
- Added a React-independent `createGameSession` external store plus `useSyncExternalStore` hook. Engine mutations happen on private cloned drafts, so React StrictMode cannot duplicate random rewards/actions through state-updater replays.
- Added semantic home/character/battle/reward/camp/result screens, explicit reward and multi-step camp fusion choices, immediate Snow persistence, and reward-free Chaos routing.
- `npm.cmd test`: 54 tests pass (48 existing plus six session/layout integration tests). New coverage includes all 15 main rounds/2 camps/3 bonus rounds, immutable previous snapshots, fusion gating, unlock reload, stale actions, item aim lockout, defeat/restart, and stable actor positions.
- Chrome smoke: home → character → Forest battle; real angle/power input and hit; HP/ammo/score update; keyboard Defense and enemy block; duplicate reward fusion to B; item selection; round 2 reset; refresh returns home. No warning/error console entries or missing loaded art observed. 390px viewport has no horizontal overflow; desktop and narrow HUD visually inspected; viewport restored.
- Forest layers render at identical 3:2 bounds with no inflated parent or extra blur/masking. HUD is a sibling of the world; scenery is decorative and reduced in size. Existing 764×508 regional images retain source-resolution limits.
- T03 offers baseline accessible angle/power controls and synchronous trajectory hit resolution. Captured pointer/Space phases, camera movement, deformation, animated flight/impact, and launch-time candy visibility are deliberately T04. Full Playwright regression infrastructure remains T05.
- No gameplay-engine or legacy HTML changes in this task. `sites/` and `tmp/` stay untracked.
