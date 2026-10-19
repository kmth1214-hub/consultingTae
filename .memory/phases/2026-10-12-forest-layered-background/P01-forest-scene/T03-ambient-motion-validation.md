# Task: T03 Ambient Motion and Final Validation

## Status: done

## T02 Integration Contract (2026-10-14)
T02 is complete (6990718). `forestMotionQuery` and its change listener already exist: reuse the query and extend the existing listener with ambient synchronization; do not redeclare a replacement query or duplicate camera cancellation/fit behavior. Existing `showScreen`, visibility/focus/blur and `fitArenaWorld` own camera cleanup, navigation-generation guards and parallax refresh. Add ambient state synchronization to those lifecycle boundaries without replacing them. All decorative `.forest-layer` elements are now inset0 transform wrappers; their artwork and feather masks live in overscanned ::before pseudo-elements. Place ambient children on the world-sized wrapper so their animations do not overwrite parallax transforms or inherit the artwork mask. The actual hidden-document cleanup and completed projectile flow were verified; preserve them. T02's fixed-delay tests were replaced by bounded waits for actual completion, so reuse the state-based validation approach. Existing idle-projectile hidden/display defect remains out of scope. Actual fullscreen request fell back to window mode; do not claim previous fullscreen success.

## Superseding T01R01 Layout Contract
Foreground is a separate direct `#arenaWorld` child z5; put leaves there. Midground remains inside forestScenery z0; put fog/waterfall there. Path z2 and actors lie between middle and foreground layers, trajectoryz6/projectilez7. Transparent images occupy world-normalized canvas despite their overscan container; do NOT use `-40+180*u` for the current midground waterfall. Use actual world-normalized waterfall anchor (see assets.md) and retain transparent-frame sizing/masks established by T01R01. Reuse existing `fitArenaWorld()` for reduced-motion/resize refresh with T02 updates, not an additional competing camera fit path. Current ready-forest dimensions240%×200%, mobile actor size40×46px. Earlier contradictory artwork-coordinate assumptions are superseded.

## Goal
숲 전투에 안개·나뭇잎·폭포 움직임을 더하고 카메라·가독성·반응형·접근성·다른 지역을 실제 브라우저에서 검증한다.

## Decision Summary
- 환경 연출은 장식이며 숲/배경 준비/전투 visible/document visible/일반 motion 설정에서만 재생한다.
- T01 이미지와 T02 parallax wrapper를 활용한다. 환경 animation은 별도 자식에 적용하여 parallax transform을 덮어쓰지 않는다.

## Implementation

### I01. Ambient decoration
- Related Files:
  - `cookie-roguelike-mockup.html` :: `#forestScenery`, `[data-forest-layer]`, new `.forest-fog`, `.forest-leaf`, `.forest-waterfall-flow`, keyframes, forest-only selectors; modify.

#### Details
- **Signatures & Types**: fixed decorative DOM and CSS animations; particle simulation/physics 없음.
- **Data & Schema Fields**:
  - `.forest-fog`: 2 elements, white/green gradients opacity≤0.14, duration24s/32s, alternate horizontal movement≤4% scene width.
  - `.forest-leaf`: 6 leaf shapes, left/right margins x<12% or x>88%, opacity≤0.45, size6~12px, duration12~20s, staggered negative delays. Frame별 random 생성 없음.
  - `.forest-waterfall-flow`: 1 translucent streak overlay, opacity≤0.18, duration2.8s, T01 waterfall anchor x78~84%/y26~52%. Actual generated anchor differs slightly: record normalized coordinates in assets.md and align overlay before completion.
  - All `aria-hidden=true`, pointer-events:none. No new controls/text.
- **Execution Flow / Logic**:
  1. Fog/waterfall are midground wrapper children, leaves are foreground children. They inherit parallax but animate their own transform/background-position. T02 artwork occupies -40% to140% of wrapper: normalized image coordinate u/v maps to wrapper percent `-40+180*u` / `-40+180*v`. Do not place waterfall as if asset occupied inset0.
  2. Keep leaves outside aiming area in fit and focus views. Adjust opacity/placement if obscuring health numbers/trajectory. Mist must not wash out the illustration.
  3. Animations default paused; run only under `#arena[data-area="forest"][data-forest-ready="true"][data-forest-ambient="running"]`. Other areas hide forest DOM via existing forest selectors.
  4. Preserve global `prefers-reduced-motion` animation:none rule. Explicit forest reduce mode keeps static mist/waterfall, hides leaves; no flashing substitute.

### I02. Lifecycle and final checks
- Related Files:
  - `cookie-roguelike-mockup.html` :: new `syncForestAmbientState`, `setupForestAmbientMotion`; existing `showScreen`, `setArenaArea`, `prepareForestScenery`, T02 visibility handling; modify.
  - `.memory/validation/2026-10-12-forest-layered-background/final.md` :: measured results/screenshots; new documentation.

#### Details
- **Signatures & Types**: `syncForestAmbientState(): void`, `setupForestAmbientMotion(): void`, `forestMotionQuery: MediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)')`.
- **Data & Schema Fields**: `arena.dataset.forestAmbient: 'running'|'paused'`, default paused. Existing area/forestReady are authoritative. No API/DB/save schema change.
- **Execution Flow / Logic**:
  1. sync requires arena, `[data-screen="battle"]`, ready=true, area=forest, battle.hidden=false, document.hidden=false, query.matches=false. All true→running, otherwise paused. Missing DOM returns safely.
  2. setup once after DOM registers media query change handler and reuses T02 document visibility listener. No perpetual JS ambient loop/timers.
  3. sync after showScreen toggles hidden, after valid setArenaArea, after asset success/failure. Changing motion preference to reduce invalidates introId, stops camera, fits visible battle when aim idle, refreshes parallax, pauses ambient. Changing back resumes ambient without replaying intro.
  4. Hidden screens/other areas pause effects; reentry resumes CSS effects. Image failure uses original PNG. Keep existing reward/fullscreen routing and combat cancellation behavior.
  5. Verify final desktop/mobile/fullscreen/reduce scene; fix new asset/CSS/integration failures without expanding gameplay scope. No new test framework required.
  6. Record actual outcomes in final.md. If browser file URL blocked use HTTP; if still unavailable document limitation and leave visual criteria unverified. Syntax alone cannot complete this visual task.

## Acceptance Criteria
- [x] Fog, leaves and waterfall gently animate in forest battle.
- [x] Motion pauses on area change, battle exit, hidden document and reduce motion, resumes correctly.
- [x] Camera and ambient transforms compose without jitter or blank edges.
- [x] Launcher, enemies, health numbers, aiming and projectiles remain clear.
- [x] Widths1440/760/390 and theme switch pass inspection; fullscreen request/fallback checked, actual fullscreen unavailable (see final.md).
- [x] Four areas and image-error fallback work; bonus remains unchanged.
- [x] Actual browser checks recorded before completion.

## Validation
- `node -e 'const fs=require("fs"),vm=require("vm"); const h=fs.readFileSync("cookie-roguelike-mockup.html","utf8"); for(const m of h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(m[1].trim())new vm.Script(m[1]); console.log("inline scripts OK");'` — syntax passes.
- `git diff --check` — passes.
- `npx --yes http-server . -a 127.0.0.1 -p 4173 -c-1` — HTTP page: no asset404/new JS errors. Capture enemy/launcher/full-scene states and narrow scene. Inspect1440×900,760×900,390×844; fullscreen entry/exit and light/dark.
- Browser: `document.getElementById('arena').dataset.forestAmbient` is running only active/ready/normal motion. Inspect animation-play-state of fog/leaf/waterfall. Emulate reduce before load and during intro: camera fits and effects stop.
- Complete shot: ammo decrements once. Early release: ammo unchanged. Leave during launch: existing cancellation and decoration pause. Select forest/snow/city/chaos, reenter battle, hide/restore document, block one layer URL and reload. Record expected/actual in final.md, not merely selector checks.

## Commit Message
```text
feat(forest): add ambient motion and validate the layered scene

Plan: 2026-10-12-forest-layered-background
Phase: P01-forest-scene
Task: T03-ambient-motion-validation

- Add subtle fog leaves and waterfall motion with visibility controls
- Verify responsive rendering accessibility and combat readability
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in Git history under the specified T03 commit message.

## Validation Results (2026-10-20)
34 ambient checks, 3 combat checks, 3 intro motion checks and initial reduced-motion checks passed in Chrome. Actual hidden event and missing-image fallback verified. Fullscreen API fell back to window mode; actual fullscreen and OS-level reduced-motion switching remain unverified. See [final results](../../../validation/2026-10-12-forest-layered-background/final.md).
