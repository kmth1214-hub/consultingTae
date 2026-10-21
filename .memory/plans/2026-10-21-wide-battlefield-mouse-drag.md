# Plan: Wide Battlefield and Mouse Drag Slingshot

- Date: 2026-10-21
- Status: in_progress (3/5 tasks done; active P01-T04; T03 completed as455990b)
- Decisions: [Confirmed interview](../decisions/2026-10-21-wide-battlefield-mouse-drag.md)

## Goal
Replace mouse + Space aiming with a direct mouse pull/release, including reverse shots, in an actual wide battlefield. Show overview → close aiming → projectile tracking, distribute existing enemies over near/far distances, stop normal candy at solid regional obstacles, and preserve Wind's once-per-round visible obstacle bypass. Complete independent depth layers for all four maps and place the selected cookie beside the weapon, receiving actual enemy hit/shield/heal feedback. Keep the full-window arena, polished weapon and existing combat/progression.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Implement and validate the wide-field mouse-drag combat as one connected game feature. | [P01](../phases/2026-10-21-wide-battlefield-mouse-drag/P01-wide-combat/phase.md) |

## Task order and rationale
1. **T01 — Canonical world and shot math:** pure, deterministic world, pull, trajectory, obstruction, homing and camera calculations, with analytic/behavioral tests. Keep the shipped compact game working until integration.
2. **T02 — Playable mouse-drag integration:** migrate input, session guards, world rendering, camera, all collision callers, Wind and enemy-response coordinates together. They share coordinates and cannot safely be switched one at a time. Migrate existing input regressions at the same time.
3. **T03 — Regional layers and elastic feedback:** independently compose sky/distant/midground/route/foreground for Forest/Snow/City/Chaos, with strong two-axis pouch/band deformation and matching solid silhouettes. Snow/City/Chaos source images are still flat; do not mistake themed panels for finished depth layers. Reserve space beside the weapon for the next player actor.
4. **T04 — Selected cookie and incoming feedback:** add the selected cookie beside the slingshot; move ranged/melee targets, injury, Defense/Milk shield, healing and fatal-response presentation to the cookie, with player-aware enemy camera bounds and unchanged combat rules. Blueprint: [T04](../phases/2026-10-21-wide-battlefield-mouse-drag/P01-wide-combat/T04-player-cookie-feedback.md).
5. **T05 — Complete browser regression and release review:** retain the former T04's full input/obstacle/Wind/progression/cleanup coverage; add all four layered maps, all five cookies and cookie-centered impacts, document captures and retire superseded compact-only helpers. Blueprint: [T05](../phases/2026-10-21-wide-battlefield-mouse-drag/P01-wide-combat/T05-wide-gameplay-regression.md).

This is one game domain with no external milestone, so it remains one Phase. T01 creates a test seam; T02 is the atomic playable migration; T03 composes the scenery and reserves the player space. T04 keeps the cookie, incoming attack destinations and protection/heal ownership together, because adding only the art would still make attacks land on the weapon. T05 validates the whole scene/combat loop after both visual tasks. Every task includes exact contracts, checks and commit message. T01/T02 completion is preserved; this amendment implements no new gameplay code.

## Scope and measurable outcomes
- Logical world is **3600×1200**, ground y900. A single ordinary enemy is centered at x2438; resting candy origin is x284. Its 2154-unit separation is three times the previous 718-unit separation (x950 minus x232). Multiple enemies span x1000–2860, preserving counts/HP and dead slots.
- Non-HUD primary mouse-down stores a **fixed CSS-pixel drag origin**. Pull direction is opposite launch; length controls force. No Space charging or separate angle/target step. Reverse and downward shots remain legal. Tiny grabs cancel, and excessive pull saturates instead of introducing a new penalty.
- All artwork, actors, path samples and collision shapes use the same logical world. Camera is a uniform transform, not a different collision coordinate system. Whole-field overview stays available between actions; reduced motion uses a stable overview.
- All four regions have separate sky/distant/midground/route/foreground render layers. Flat Snow/City/Chaos source landmarks are proportional midground inserts over native continuation; no full-map stretching or false claim that transparent layer PNGs already exist.
- The selected cookie stands left of the slingshot. T04 adds `layout.player` presentation bounds(44,748,152,152), torso impact(120,824), melee contact(170,900), and fits cookie+weapon+attacker in enemy camera. Candy origin remains(284,812); player visuals do not add a new self-collision/damage rule. Damage/shield/heal effects belong to the cookie; weapon effects remain on the slingshot.
- Regional log/ice/crate obstacles are solid and stationary. Their visible silhouettes and collider polygons match. A wall terminates eligible hits; no normal damage may pass through it.
- A valid forward Wind shot once per round visibly curves around obstacles and contacts its target. A reverse/invalid-target shot does not home or consume this opportunity. Contact remains separate from randomized damage, including zero rolls.
- Preserve item rules/shortcuts, hidden numeric aim HUD, initial <=30% path preview, candy-card flight visibility, rewards/fusion/camps, main/Chaos scoring, Snow unlock, third-attack boss cadence and Defense/Milk interception.

## Technical baseline / migration constraints
- Runtime: Vite 8.3.4, React 19.3.1; JavaScript ES modules under `src/game/package.json`; the shared UMD engine is `assets/js/battle-engine.js` through `src/game/battleEngine.js`.
- Existing `useAimController` phases are idle/angle/power/direction/launching; `gameSession.setAim` also clamps angles to 10–80 degrees. Both must change in T02. Existing input tests press Space and use world x950; update rather than silently dropping equivalent coverage.
- `ArenaScenery` only paints props. Current shot calculation is a target-X quadratic, and current hit sampling depends on DOM rectangles. New pure world geometry becomes authoritative; DOM/camera matrices are used only to verify rendering alignment, not to compute a second path.
- Engine `resolveProjectile` prepends a valid Wind `selectedTargetId`. The React caller must always pass explicit `null` for ordinary, blocked and reverse shots. Do not accidentally fall back to a stale selected target.
- Engine RNG/combat remains at actual impact/end, exactly once. Preserve its existing damage/spillover model and immediate enemy-turn calculation; enemy playback remains a separate guarded presentation stage. No pre-rolling at pointer-down/release.
- Art: use existing transparent forest layers and regional source art at uniform scale with native SVG continuation. Do not stretch the 3:2 images to 3:1 or merely enlarge the compact image. T03 defines the concrete composition. No image generation/dependency/network service is required by this plan.
- Verified after T02: incoming attack impact/contact and injury/protection/heal selectors still reference the launcher. T04 must migrate all of those to `layout.player` in one task and extend enemy camera bounds; adding the cookie PNG alone is not sufficient. Existing `ASSETS.characters` provides five proportional square PNGs, with no new asset pipeline required.

## Validation strategy
- Pure contracts: `npm.cmd test` plus focused `node --test tests/battlefield-model.test.mjs tests/shot-geometry.test.mjs tests/battlefield-camera.test.mjs` introduced in T01. Compare ballistic samples with independent analytic coordinates; exercise swept collision and wall ordering, all area/round layouts, Wind/reverse and camera round trips.
- Browser: `npm.cmd run test:e2e` builds/serves production on **4180**, installed Chrome, one worker, no retries. Keep runtime/failed-asset diagnostics. Leave existing 4173/5173 servers alone.
- Screens: 2007×1037, 2560×1080, 1440×900, 844×390 and 390×844. Check overview/aim/follow/enemy framing, HUD reachability, same-scale x/y rendering and no unwanted page overflow. Inspect art/captures manually; test passing is not visual approval by itself.
- Standard task completion: task Status done → prescribed source/task commit → phase/current progress sync → next pointer. Only related tracked files are staged; `sites/`, `tmp/`, build and test artifacts stay outside commits.

## Boundaries / deferred work
- No moving, falling, rolling or destructible obstacle physics; no obstacle-caused monster damage, terrain height rules, first-person steering, Unity or new dependency.
- No rebalance of damage/HP/enemy count/rewards. Art variants may differ, but shared collision and camera rules apply to all existing regions.
- Legacy HTML is untouched. Azure configuration/deployment is a later explicit return to the existing [React release P02-T01](../phases/2026-10-21-react-first-release/P02-azure-release/T01-azure-static-web-app.md). It is not the next task of this plan.
- Adjacent out-of-scope findings: none beyond the necessary integration documented here. If execution uncovers unrelated defects, report them separately instead of extending the task automatically.

## Completion / pointer after this plan
After T05 passes, mark this plan/Phase5/5 complete and set `current.md` to completed with no automatic new implementation task. Link the deferred Azure task as a possible next project step; do not start or mark deployment complete.
