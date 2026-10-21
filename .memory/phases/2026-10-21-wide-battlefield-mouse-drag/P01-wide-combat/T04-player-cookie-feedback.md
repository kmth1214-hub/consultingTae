# Task: T04 Selected Cookie and Player Hit Feedback

## Status: pending

## Goal
Show the currently selected cookie standing beside the slingshot and make incoming enemy attacks visibly hit/protect/heal that cookie. Weapon and player must read as separate actors while retaining the proven launch path and single-resolution combat lifecycle.

## Decision Summary
- User amendment2026-10-21: put the selected cookie beside the weapon; actual damage should appear to be received by the cookie. T03 supplies all four regional depth layers and elastic weapon effects; this task supplies the player actor and migrates all incoming feedback together. T05 performs final whole-game verification.
- Reuse all five existing character PNGs from `ASSETS.characters`/`CHARACTERS`. Cosmetic CSS/SVG poses/glows only; no new raster asset, skeleton/animation package, player collider, self-damage, damage/HP/reward changes or engine calls from presentation.

## Implementation

### Dependency amendment — 2026-10-21
- Before executing this Task, complete `.memory/plans/2026-10-21-regional-layered-world-and-map-studio.md` (six Tasks). This cookie Task remains pending, not superseded; that plan's final handoff restores the active pointer here.
- New independent regional painted layers/decorative parallax/environment activity replace the old T03 cropped-map limitation. Keep x40..450/y720..940 clear for this actor. `useBattlefieldCamera` now delegates presentation application to `applyScenePose`; retain that call and CSS camera/depth variables while changing enemy bounds in battlefieldCamera.js. Do not reintroduce a competing camera or require decorative plane matrices to equal gameplay matrices.
- All actor/attack origins below remain canonical and fixed; only scenery depth planes move. Add player tests on the new maps without disabling the scene/studio exclusion tests. This Task still owns the complete incoming hit/shield/heal migration; no such actor was added by the inserted plan.

### I01. Canonical player bounds and camera framing
- Related Files:
  - `src/game/battlefieldModel.js` :: `buildBattlefield`; add player presentation geometry
  - `src/game/battlefieldCamera.js` :: `getCameraPose` enemy bounds; modify
  - `tests/battlefield-model.test.mjs`, `tests/battlefield-camera.test.mjs`; extend
  - `src/game/shotGeometry.js`, `src/game/useAimController.js`, `assets/js/battle-engine.js`; read-only

#### Details
```typescript
type Vec2={x:number;y:number};
type PlayerPlacement={x:number;y:number;width:number;height:number;
  impact:Vec2;contact:Vec2}; // sprite top-left and WORLD points
// Existing BattlefieldLayout fields remain; add:
type PlayerLayoutExtension={player:PlayerPlacement};
```
- Add a fresh `layout.player` to every built layout, including empty-enemy layouts: `{x:44,y:748,width:152,height:152,impact:{x:120,y:824},contact:{x:170,y:900}}`. Feet rest on ground900. These are common visual actor bounds; not new engine combat state or a player collision circle. No character-specific combat balance geometry.
- Place cookie to the **left** of launcher bounds220,758,124,142. Cookie's right edge196 remains left of the forward maximum pouch center212/radius14; reverse pulls expand right of the weapon, and T03's meter at localx>=174 remains on that side. Keep the T03 foreground reservation x40..450/y720..940 clear. Use common152×152 square canvas: existing Adventurer/Alchemist/Wizard/Wind PNGs are312×312 and Milk248×248, all rendered proportionally without stretching or reusing enemy art.
- Leave launcher sprite, local rest pouch(64,54), candy world origin(284,812), `getDragDraw`, every enemy/obstacle placement and ballistic/Wind math unchanged. Old `launcher.impact/contact` can remain unchanged as compatibility fields, but **no live incoming-player effect** may continue to consume them after migration. `layout.player.impact/contact` become the authoritative presentation destinations for enemy damage/melee.
- Enemy camera includes the union of `layout.player` and `layout.launcher` bounds and the actual attacker's sprite bounds, then adds120 world units left/right margin. Use the existing scale=`min(vw/boundsWidth,vh/640)`, clamped left and ground anchored at78% viewport height. Missing attacker falls back to overview; reduced motion always overview. Overview/aim/follow formulas and projectile focus remain unchanged; aim's left0 already frames cookie+weapon. Do not force the cookie on-screen during projectile follow.
- Validate finite/new independent player objects and consistent ground placement; unit camera tests must show cookie **and** weapon plus attacker inside enemy framing for wide/narrow/short viewports. Preserve independent shot/reachability tests and show the candy origin is unchanged.

### I02. Selected cookie actor and pure presentation model
- Related Files:
  - `src/game/playerPresentation.js` :: `getPlayerPresentation`; new pure view model
  - `src/components/PlayerCookie.jsx` :: `PlayerCookie`; new
  - `src/components/BattleArena.jsx` :: place/drive the actor; modify
  - `src/game/{assetCatalog,gameData}.js`; read-only catalog/character mapping
  - `src/styles/arena.css`; modify
  - `tests/player-presentation.test.mjs`; new focused behavior tests

#### Details
```typescript
type PlayerPose='idle'|'aiming'|'release'|'brace'|'hurt'|'blocked'|'healing'|'defeated';
type PlayerPresentation={characterId:string;assetKey:string;name:string;pose:PlayerPose;
  impactId:number|null;damage:number;blockedBy:'defense'|'milk'|null;showShield:boolean};
getPlayerPresentation(input:{characterId:string;phase:'idle'|'dragging'|'launching';
  response:null|{id:number;stage:'windup'|'travel'|'impact';attack:{damage:number;
    blocked:boolean;blockedBy:string|null}};
  playerHp:number;defenseArmed:boolean;healActive:boolean}):PlayerPresentation;
PlayerCookie({characterId,placement,aimPhase,launchId,response,playerHp,defenseArmed,lastEvent});
```
- Resolve `CHARACTERS.find(character.id===characterId)` and use its `asset` key in `ASSETS.characters`; unknown ids use the existing Adventurer fallback. Do not concatenate paths or write new character data into the run/profile. PNG alpha is preserved; fit the square canvas with `object-fit:contain`/bottom alignment or proportional SVG image. Body shadow stays under feet; subtle idle stance only, no new sprite-sheet requirement.
- Render one passive `role="img"` named with the selected cookie and qualitative state, plus `data-testid="player-cookie"`, `data-character-id`, `data-player-pose` and current response id when relevant. Decorative inner art is aria-hidden and non-draggable. Actor uses absolute world px bounds and z7 with pointer-events:none, so clicking it still starts the existing non-HUD map grab. No new buttons or numeric power/angle labels.
- Pure pose precedence: impact+blocked → blocked (even if an old heal flash is active); impact+unblocked+damage>0 → defeated when playerHp<=0, otherwise hurt; other active heal flash → healing; response windup/travel → brace; dragging → aiming; launching → release; otherwise idle. Zero-damage/unblocked response must not fabricate hurt or a negative HP number. `damage` is the actual impact damage only, zero before impact/when blocked. `blockedBy` accepts only the committed defense/milk reason. `impactId` is response.id at impact, otherwise null. `showShield = defenseArmed || Boolean(response?.attack.blocked)`; clear after the consumed response ends.
- CSS/SVG feedback: slight aim lean/brace while pulling, release gesture200ms, brief hurt flash/backward recoil at impact, protective bubble centered on the cookie, green healing signs at the cookie, brief defeated slump while fatal response completes. Use an inner body wrapper so transforms do not move the canonical actor container/contact point. Key transient impact motion to response.id; stage rerenders must not restart it. BattleArena passes its existing controller state.launchId so release can be keyed to that sequence, with no callback into combat.
- Heal flash is local presentation state only: observe **new** `lastEvent.id` with keyheal and positive effect.healed, start~700ms glow once; initialize seen id on mount to ignore a previous round's event. Keep latest timer/ref and cancel on new event/new grab/round/unmount. Never call useConsumable or adjust HP from an animation. Actual healing/header values stay session-owned. Heal flash can start before a subsequent incoming hit, which takes visual precedence at impact.
- Reduced motion disables idle bob/release translation/hurt shake/defeat movement and particles, retaining a static tint/outline, shield and result text. Use media CSS and existing preference handling; no independent camera or forced device-pixel scaling. Overview sprites remain proportional; T03's suppression of crowded health boxes still applies.
- Missing optional art may use the existing safe `AssetImage` fallback with a named actor; missing imported/built assets still fail browser health and must be fixed. Null response/cleared event returns normal pose without stale protection. View model must not mutate arguments, roll RNG, store run state or access DOM/storage.

### I03. Redirect incoming attacks and feedback atomically
- Related Files:
  - `src/components/EnemyResponse.jsx` :: `responseTravelMs`, ranged destination, impact/block/heal placement; modify
  - `src/components/MonsterGroup.jsx` :: melee strike deltas; modify
  - `src/components/Slingshot.jsx` :: remove player injury/heal/protection ownership; modify
  - `src/components/BattleArena.jsx` :: pass placement/response and shared travel duration; modify
  - `src/game/gameSession.js`, `src/components/BattleScreen.jsx`; read-only lifecycle/HP reveal unless a reproduced migration defect requires a regression fix
  - `src/styles/arena.css`; migrate related selectors

#### Details
1. Ranged incoming target becomes `layout.player.impact`. `responseTravelMs` uses distance from attacker.x to that x; retain existing clamp520..1100, reduced100, windup340/special480 and impact520/reduced400. Compute/share the same travel value with MonsterGroup CSS and EnemyResponse clock. No second response timer or engine call in PlayerCookie.
2. Melee strike deltas use `layout.player.contact`, preserving attacker-only windup/travel/return and original response.id. An enemy body arrives beside the cookie; its impact flare/damage text is centered on the cookie torso. Boss third-attack cadence/terrain handling/special data stay unchanged.
3. Existing `player-impact`/`shield-impact` groups/test ids and notice stay usable, but world origins come from the cookie. PlayerCookie owns the **one full protective bubble**; EnemyResponse's shield-impact contains contact sparks/icon/text only, avoiding two full shields. Numeric damage appears only in the existing impact group/header; PlayerCookie adds no duplicate damage number. `blockedBy` names Defense/Milk and real blocked events alone select protection, not cosmetic guesses from player HP.
4. Remove `has-shield`, `is-hit`, `is-healing` player-state ownership from Slingshot and migrate/restrict `.launcher.is-hit`, `.has-shield::before`, `.is-healing::before` selectors to the player actor. Weapon still owns its charged rune, pull, empty pouch, recoil, Fireball arm and release ring. Item Defense/Milk should protect the cookie; Heal should brighten the cookie. Update old browser assertions that target `.launcher.has-shield` to the real player bubble; preserve their actual inventory/HP checks.
5. Keep HP/ammo/freeze/boss heal reveal at the existing committed response's impact stage and fatal result delay until response completion. No animation can call resolveProjectile/useConsumable or change attack counts/RNG. Stale/unmounted callbacks remain invalidated by the existing controller/session guards. Hiding the tab settles the same committed event once; a new run/round cannot retain hurt/shield/heal state.
6. Reverse/downward player candy keeps existing miss/turn behavior and no self-damage. Passing the cookie visually does not create a new collision or hurt event. Props still only stop ordinary candy; they do not grant new protection against enemy replies.

### I04. Player-centered real-input regression and visual acceptance
- Related Files:
  - `tests/e2e/player-cookie.spec.cjs`; new focused cases
  - `tests/e2e/{enemy-response,game-flow,slingshot,accessibility}.spec.cjs`; migrate only necessary player feedback expectations
  - `tests/e2e/support.cjs`; retain existing test-only engine observation/fixtures
  - `tests/{battlefield-model,battlefield-camera,player-presentation}.test.mjs`; pure guarantees above

#### Details
- Pure tests: all five character mappings/fallback, full pose precedence, no flinch before impact/for zero or blocked damage, Defense/Milk reason, fatal pose, heal reset inputs and argument immutability; player placement freshness and camera framing. Do not mirror SVG path/style string construction.
- Use real selection UI for each of five cookies (seed the existing Snow-unlock profile for Milk/Wind). Assert correct named actor/asset and no duplicate player after next round/new run. Fixed RNG and existing seed inventory create real enemy responses; no production test action API.
- Observe actual ranged and melee transforms against the cookie world anchor; one engine turn, HP unchanged before impact then updated as committed. Defense/Milk bubble surrounds the cookie and suppresses hurt/HP loss; Heal affects real HP/inventory and glows at that cookie. Verify all three third-attack boss specials and lethal impact before results; no launcher injury/shield/heal remains. Reverse miss consumes one shot/reply without an extra self-hit.
- Visual cases: idle/strong/reverse aim, release, ranged hit, melee/boss hit, Defense/Milk block, heal, fatal, reduced motion at1440×900 and390×844; also framing/HUD checks at2007×1037,2560×1080 and844×390. Check all four T03 maps reserve actor space and no foreground/HUD/meter overlap. Captures stay untracked `tmp/wide-t04-player-{character}-{area}-{state}-{width}.jpg`; inspect them rather than claiming layout from class presence alone.
- On failure, fix the reproduced migration issue with its regression. Do not weaken HP/turn/collision assertions or introduce new damage rules to make poses appear. Record unrelated findings without implementing them.

## Acceptance Criteria
- [ ] Correct selected cookie stands visibly beside the weapon, with proportions and feet aligned across all four maps.
- [ ] Ranged/melee origins/destinations and hit flashes match the cookie, with HP reveal at actual response impact and no duplicate turns.
- [ ] Defense/Milk shield and healing belong to the cookie; slingshot retains only weapon effects.
- [ ] Player+weapon+attacker framing works on prescribed viewports; reduced-motion and cancel/hidden/new-run cleanup remain correct.
- [ ] Existing launch origins, solids/Wind/reverse rules, damage/HP/inventory/progression and all prior regressions stay valid.

## Validation
- `node --test tests/battlefield-model.test.mjs tests/battlefield-camera.test.mjs tests/player-presentation.test.mjs` — player metadata, poses and framing pass.
- `npm.cmd test` — full pure/session/engine suite passes.
- `npm.cmd run test:e2e` — complete fresh-production actual-Chrome suite on4180 passes with no runtime/asset failures or retries.
- `npm.cmd run build` and `git diff --check` — pass.
- Inspect and document all required player captures under untracked tmp; keep4173/5173 preview services intact.

## Commit Message
```text
feat(game): place selected cookie beside the slingshot and receive enemy hits

Plan: 2026-10-21-wide-battlefield-mouse-drag
Phase: P01-wide-combat
Task: T04-player-cookie-feedback

- Render the selected cookie and center enemy strikes, shields and healing on it.
- Preserve single-response combat and validate player framing and feedback.
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

## Next pointer
After prescribed source/task commit and phase/current sync, advance to `T05-wide-gameplay-regression.md`. Do not start Azure deployment or mark the full feature complete yet.
