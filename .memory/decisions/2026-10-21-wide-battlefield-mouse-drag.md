# Decisions: Wide Battlefield and Mouse Drag Slingshot

- Date: 2026-10-21
- Status: Confirmed
- Feature: `wide-battlefield-mouse-drag`
- Stage: Design interview complete; [implementation plan ready](../plans/2026-10-21-wide-battlefield-mouse-drag.md), implementation not started.
- Applies to the React game. Supersedes its mouse + Space aiming flow, compact battlefield layout and decorative-only obstacle restriction. Other first-release rules remain applicable.

## D01. Mouse-only aiming and release
- **Chosen by user**: Press at a non-HUD point on the map to establish a fixed drag origin. Drag distance controls power; drag direction controls the opposite launch direction. Releasing the mouse fires. Space-based charging and separate angle/power/direction confirmation steps are replaced.
- **Rationale**: Directly pulling the slingshot ties the player's hand movement to tension and shot strength, instead of stopping an automatically moving gauge.
- **Input contract**: Pulling left/down launches right/up. Pulling right launches left. Changing the camera must not move the stored screen-space drag origin or change power while the cursor remains still. Keep existing mouse capture, focus and cancellation safeguards.

## D02. Reverse shots are allowed
- **Chosen by user**: Permit shots in the opposite direction as a deliberate mistake/playful element; do not silently clamp a rightward pull into a forward shot.
- **Rationale**: A consistent pull-opposite-to-launch rule is intuitive and allows amusing mistakes.
- **Compatibility inferred from existing rules**: An accepted reverse shot uses the normal ammo/turn/miss rules and existing enemy-response rules. It does not introduce self-damage or a new penalty. Negligible drag remains a canceled grab rather than a spent shot; the exact dead-zone/max-drag tuning belongs in task blueprints.

## D03. Camera sequence
- **Chosen by user**: Whole-field overview → slingshot aiming view → projectile follow camera.
- **Rationale**: The player first sees enemies and obstacles, then feels the pull up close, then experiences the distance traveled through the expanded map. Keeping the whole field permanently fit to one screen would make the actors too small.
- **Required integration**: Return to a useful battlefield view for enemy responses and the next shot. Follow reverse shots too, and settle normally on collision/landing/out-of-bounds. HUD stays in viewport space. Camera movement must not alter the shot, create phantom drag input or restart combat.

## D04. An actually wider battlefield
- **Chosen by user**: Expand the actual battlefield distance to roughly three times the current layout, with near and far enemies distributed across rounds containing multiple monsters.
- **Rationale**: Different target distances require different pull strengths, and intervening obstacles give launch angle a purpose. This is a world-distance change, beyond filling the browser window.
- **Preserved from the selection**: Monster count and HP remain unchanged. Keep the single-enemy/boss rounds; do not add monsters merely to fill the new map. Use the same rules across Forest, Snow, City and optional Chaos combat.
- **Layout requirement**: Keep the full-window viewport from T08 and the established regional art style. Extend the world/background composition without horizontally stretching actors or existing artwork. All required targets must remain reachable with legal shots; do not create unavoidable walls.

## D05. Solid, stationary obstacles
- **Chosen by user**: Logs, ice and crates become fixed obstacles. A normal candy stops when it touches one; players aim above obstacles or through visible gaps.
- **Rationale**: Establish meaningful trajectory choices first, before adding rolling/falling chain reactions.
- **Collision contract inferred from this choice**: The first obstacle collision truncates the normal shot path. Enemies behind that collision cannot receive that shot's damage. Preserve existing valid damage/spillover rules before the obstruction, and resolve an accepted action only once. Match collision bounds to the visible props.
- **Deferred explicitly**: Moving, collapsing, destructible obstacles and obstacle-caused monster damage are not included in this feature.

## D06. Wind homing keeps its special advantage
- **Chosen by user**: The existing once-per-round Wind homing shot visibly bypasses obstacles and reaches a valid target, preserving the character's special strength.
- **Rationale**: Wind should provide a distinct exception to ordinary obstacle play, instead of losing its existing guaranteed-hit identity.
- **Also confirmed in the question**: Reverse shots never apply homing. They continue backward normally.
- **Compatibility inferred from engine behavior**: Preserve `roundEffects.windHomingUsed`, reset once per round, and existing invalid-target behavior. Reverse/no-valid-target shots must not consume that homing opportunity. Guaranteed contact does not override damage rolls, including existing zero-damage outcomes. A homing bypass should be shown by an actual avoiding trajectory, not by letting the art pass through solid obstacles.
- **Targeting integration**: Replace the old horizontal-target phase with targeting derived from the forward drag/expected landing area, using a valid living enemy and a visible target cue. Preserve the existing automatic target-selection convention; define its exact deterministic selection and boundary cases in the plan.

## D07. Pull and flight feedback
- **From the user's request**: The elastic pull must feel substantially stronger. Make the pouch/bands track the drag direction and distance, with readable increasing tension and a clear spring release. Retain the carved-wood/brass/leather style from T07.
- **Existing confirmed requirements retained**: Hide exact angle/power values. Show only the initial 30% trajectory preview during active mouse movement; do not reveal the full landing solution. Retain the item HUD at upper left and candy information at upper right, including its shot-flight visibility behavior.
- **Implementation constraints inferred from existing behavior**: Reduced-motion settings keep readable feedback without forced camera animation/shake. Items keep mouse buttons and optional number shortcuts; mouse-only refers to aiming/power/release, not deleting existing optional shortcuts or Esc cancellation.

## D08. Existing rules and validation boundary
- **Preserve**: Damage/grade rolls, ammo counts, rewards/fusion, camps, scoring, Snow unlock persistence, optional bonus combat, item counts/effects, third-attack boss cadence, Defense/Milk blocking and T06 visible enemy turns.
- **Architectural constraint from code**: One path must drive preview, flight, obstacle and monster collision. New camera transforms must use a consistent world-to-screen mapping. Resolve the engine once at the actual collision/end, with guarded callbacks; animation callbacks never apply duplicate damage.
- **No platform change**: Continue Vite + React. Unity, login/leaderboard/admin, Azure setup and deployment are separate work.

## Code findings and adjacent issues for planning
- `src/game/arenaLayout.js` still defines a 1200×800 world, with regular enemies clustered around x730–1100. T08 filled the browser viewport but retained these logical distances.
- `src/game/useAimController.js` currently separates angle → Space-driven power → horizontal targeting → release. Both this hook and the session aim guards must be migrated together; keeping the old 10–80 degree clamp would invalidate reverse/vector aiming.
- `src/game/trajectory.js` currently builds a quadratic from target X, angle and a power multiplier. It samples that same path for preview/flight/monster hits. Replace the target-X dependency with pull-driven launch behavior while preserving a shared path representation.
- `src/components/ArenaScenery.jsx` draws obstacle art only; no obstacle collision data is registered. Add geometry and ordered collision resolution rather than only repositioning the drawings.
- `assets/js/battle-engine.js` currently forces a valid Wind target into `hitIds`. Planning must preserve the authorized Wind exception while ensuring normal obstacle-blocked shots cannot be reported as hits behind a wall.
- Camera, slingshot origin, enemy attack origins and layout currently contain compact-world coordinate assumptions. Update them together; a CSS-only resize would not fulfill this feature.
- Out-of-scope findings: none requiring a separate feature decision. The issues above are necessary integration work for the selected controls/map/obstacle behavior; moving-obstacle physics remains deferred.

## D09. Amendment — layered regions and a visible player cookie (2026-10-21)
- **User confirmed**: Snow/City/Chaos also need layered backgrounds; place a cookie beside the slingshot and show enemy damage as hitting that cookie. Allocate the additions within T03–T05.
- **Verified current state**: only Forest has separate transparent distant/midground/path/foreground PNGs. Snow/City/Chaos have single source images. T02 currently renders functional SVG terrain, not the finished illustrated region composition.
- **Implementation choice**: T03 gives each of all four regions independent sky/distant/midground/route/foreground render layers, using existing art proportionally plus native SVG continuation. Cropped flat source landmarks do not substitute for an entire layered map. No new bitmap generation or raster extraction is assumed.
- **Implementation choice**: T04 renders the **selected** one of the existing five cookie assets standing to the left of the launcher. Canonical presentation-only player bounds/impact/contact anchors let incoming projectiles, melee, hurt, Defense/Milk shield and heal feedback share the cookie's location. Weapon pull/release feedback and cookie injury/protection feedback have separate owners.
- **Preserve**: player HP/damage/turns/RNG, item effects, boss third-attack cadence, launch/collision/Wind rules and reverse no-self-damage. Poses/particles never call combat actions. Camera framing must include cookie+weapon during enemy response.
- **Task allocation confirmed by this amendment**: T03 regional layers/tension → new T04 selected cookie/player feedback → T05 full gameplay/visual regression (renamed from the former T04). One Phase, now five Tasks; T01/T02 remain completed and current remains T03. This turn updates planning files only.

## Next step
The [plan and rich task blueprints](../plans/2026-10-21-wide-battlefield-mouse-drag.md) now include the D09 amendment. T01/T02 are implemented; `.memory/current.md` stays at P01-T03. Run `/memory-execute` to implement the revised T03 sequentially, then T04 and T05 on subsequent task executions. Azure stays deferred. This amendment itself changes no production code.
