# Decisions: Regional Layered World and Development Map Studio

- Date: 2026-10-21
- Status: Confirmed
- Target: Vite + React game under `src/`; legacy HTML is a visual reference only.
- References: [Forest layered background](./2026-10-12-forest-layered-background.md), [Wide battlefield and mouse drag](./2026-10-21-wide-battlefield-mouse-drag.md).

## D01. Extend the forest's original visual design to the other regions
- **Chosen by user**: Reconstruct Snow, City and Chaos with the same side-view composition and illustrated depth established for Forest. Preserve regional identity and the existing game's visual quality; geometry-only scenery or cropped flat-map panels are insufficient as the final artwork.
- **Rationale**: The user is broadly satisfied with current progress but wants the regions to feel consistent and richer during play.
- **Reference contract**: Distant scenery, midground landmarks, a continuous horizontal gameplay road and foreground decoration, supported by subtle atmosphere. Preserve Forest's existing dedicated artwork as the style/composition reference rather than gratuitously replacing it.

## D02. Produce dedicated regional artwork rather than describing crops as extracted layers
- **Chosen from the user's referenced forest decision**: Create dedicated bitmap scenery layers for Snow, City and Chaos. Midground/foreground artwork must have appropriate transparent surroundings; merely cropping the original flattened maps does not meet this requirement.
- **Implementation judgment**: Keep current source maps unchanged as references. Match the forest's playful painted treatment, side-view perspective, landscape proportions and visual detail, while retaining each area's palette and motifs. Plan concrete artwork generation, asset dimensions, transparency, edge coverage and visual inspection before implementation.
- **Current gap verified in code**: `assetCatalog.js` has dedicated `forestLayers` only. `BattlefieldBackdrop.jsx` gives all regions five SVG siblings but uses cropped flat Snow/City/Chaos maps with native SVG continuation. This is real render-layer separation, not finished independent painted assets. T03's earlier completion does not imply that the original forest reconstruction contract was fully extended to those regions.
- **Acceptance**: No baked theme labels, hard poster boundaries, distorted artwork or identical repeated major landmarks. A wide scene must remain continuous at entrance, middle and far end, including close aiming and projectile-follow views. Asset loading alone is not visual acceptance.

## D03. Share depth behavior and use restrained regional atmosphere
- **Chosen from the user's reference**: Restore camera-driven parallax: far scenery moves less than near scenery. Add subtle environmental motion appropriate to each region, using the same visual hierarchy across the maps.
- **Implementation judgment**: Reuse Forest's fog/leaves/waterfall vocabulary where appropriate; use restrained snow drift in Snow, ambient dust/light in City, and motes/mist in Chaos. These are decorative treatments, not new gameplay mechanics. Final values and exact assets belong in the task blueprints.
- **Code-derived constraint**: React's current camera is `useBattlefieldCamera`, not the old HTML's `focusCameraOn`/`playRoundIntro`. It currently applies one uniform transform to `.arena-world` and publishes `--camera-scale`; it does not drive independent decorative parallax. Extend this single camera source instead of adding a competing game camera.
- **Safety of gameplay coordinates**: Only decorative scenery receives depth offsets. Road contact plane, registered solids, launcher, cookie, enemies, projectile, hit effects and trajectory remain in the canonical world and retain the same coordinate transform. Parallax must not make a visible obstacle disagree with its collider.
- **Lifecycle/accessibility**: Pause decorative animation when the document or battle/preview is hidden; clean up animation work on navigation/unmount. Reduced motion keeps static layers and a usable inspection view. Cover all camera extremes without exposing blank edges. Foreground/atmosphere must not hide the weapon, reserved cookie, enemies, early preview or HUD.
- **Road**: Preserve the existing level horizontal route and ground900. Give each region a matching painted road edge and visible ground depth without introducing slopes, holes or new collisions.

## D04. Provide a separate development map-review screen
- **Chosen by user**: Supply a screen distinct from ordinary player gameplay, where the developer can switch between all maps and move around to inspect them.
- **Review scope inferred from that request**: Forest/Snow/City/Chaos selection; free camera pan and zoom; reset/full-scene framing; individual scenery-layer visibility; environment-animation pause/resume. Reuse the actual runtime scene assets/composition so the review represents the game rather than an unrelated showcase.
- **Boundary**: This is a visual inspection tool. Combat balancing, enemy/item editors, account management, persistent game-state mutation and a full operational administration system are not requested. The ordinary user screen and gameplay controls remain distinct.
- **Usability**: Keep map/layer/camera controls outside the preview so they cannot trigger slingshot inputs. Include a clear development-review title and an easy route back to the ordinary game. Select the exact route and control bindings in planning; provide the actual verified link only after implementation.

## D05. Development-only access now; authenticated administrator access at Azure release
- **Chosen by user, explicit interview answer**: “우선 개발 환경 전용으로 제작하고, Azure 배포 시 지정된 최상위 관리자 계정만 접근하도록 연결”.
- **Current implementation requirement**: Gate the review entry and its module behind Vite development mode (`import.meta.env.DEV`). Ordinary production builds must not expose the studio through a URL, hidden menu or query parameter. Verify production route behavior and that review-only modules/fixtures do not leak into the production bundle.
- **Honest access semantics**: A development-only page is not an authenticated administrator role. Whoever can reach the development server may be able to reach that page. Do not claim that a secret URL or browser flag authenticates a top-level administrator.
- **Deferred deployment requirement**: At the explicit Azure release step, connect Microsoft Entra authentication and restrict this screen to designated administrator identities/roles with host/server-enforced authorization. Being in the same corporate tenant alone is not administrator permission. Tenant, registration and allowed administrator details remain owner-provided; no credentials or authentication setup are needed for this development-only implementation.
- **Current gap**: `App.jsx` has player screens only; no map studio, sign-in or role enforcement is present. There is currently no verified administrator URL to hand over.

## D06. Preserve the wide-field gameplay and keep workflow history accurate
- **Code-derived constraints**: Keep the3600×1200 world, mouse-vector pull/reverse, overview→aim→follow→enemy camera ownership, normal solid collisions, Wind bypass, hidden numeric aiming HUD, item timing and existing progression/score rules. New art and review controls must not change combat RNG, damage, enemy counts or obstacle density/placement.
- **Necessary test update**: Existing T03 layer tests assume every decorative layer has an identical screen transform. Planning must replace that obsolete assumption with explicit decorative parallax expectations while retaining uniform scale and exact alignment for all gameplay geometry. Do not weaken hit/collision/input regressions to accommodate scenery.
- **Related pending work**: `.memory/current.md` still points to Wide Combat T04 (selected cookie and cookie-centered incoming effects), with T05 final review afterward. This interview does not mark those tasks completed or overwrite their pointer. The next planning step must explicitly reconcile the new visual/studio tasks with that pending work; preserve the cookie standing space and avoid duplicate camera implementations.
- **Adjacent findings**: Current React is also missing Forest's originally requested independent parallax/environment motion; this shared presentation gap is included in D03. No other unrelated defect was identified. Azure deployment/authentication remains deferred, per the user's chosen access scope.

## Verification expectations for planning
- Inspect original assets and actual screenshots for all four regions at overview, close aim, flight follow and enemy response; verify consistent style, transparent edges, wide continuity and road depth.
- Cover desktop2007×1037/2560×1080/1440×900, short844×390 and narrow390×844; reduced motion and hidden-document cleanup.
- Check independent decorative depth offsets without any trajectory, obstacle, actor or hit-position drift; verify single accepted combat resolution and unchanged progression.
- Exercise development map selection, pan/zoom/reset, layer controls and environment pause. Compare studio and gameplay composition. Confirm production builds expose neither the studio UI nor review-only code and fail closed at its development URL.
- Run affected Node/browser tests and the production build; inspect images manually as well as checking DOM/assets. Report limitations honestly and provide the real local studio URL after it works. No claim of deployed admin security before the later Azure authorization work.

## Next workflow step
- `/memory-plan regional-layered-world-and-map-studio`
- This interview created the decision document only. No implementation, generated artwork, plan/task pointer change, commit or deployment was performed.
