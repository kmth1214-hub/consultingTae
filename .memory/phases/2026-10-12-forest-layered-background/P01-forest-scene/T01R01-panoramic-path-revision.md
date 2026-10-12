# Task: T01R01 Panoramic Forest Path Revision

## Status: done

## Goal
사용자의 T01 후속 요청: 길목을 중경(2번)과 전경(3번) 사이에 두고 원본 숲 이미지의 분홍 흙길로 재제작한다. 맵을 넓게 보여주고 투석기와 몬스터 사이 거리를 늘린다.

## Decision Summary
- User request overrides T01 actor-position/world-size preservation only for ready forest. Other areas retain existing size and positions.
- This revision precedes pending T02 parallax. No ambient or parallax work is included.

## Implementation
### I01. Path artwork and stacking
- Related Files: `assets/maps/forest_theme.png` read-only; `assets/maps/forest-layers/path.png` new; `cookie-roguelike-mockup.html` forest DOM/CSS/preload modify.
- Signatures: `prepareForestScenery(): Promise<boolean>` retained, now loads distant/midground/path/foreground.
- Schema: path PNG landscape1536×1024, RGBA, transparent upper scenery region; natural dusty pink horizontal route spans x0~100%, around y66~90%, warm pebbles, thin grass borders, no raised rectangular slab/UI/characters. Built-in imagegen, original reference inspected, copy generated file to project.
- Logic: `#forestScenery` retains only distant/midground. `#forestPath` absolute inset0 z2 uses path image full world and pointer-events:none. Move the foreground layer to a direct world child with z5, keeping its feather mask and center transparent. Actors retain z3/4, trajectory above foreground (z6), projectile z7, caption remains outside world. Display forestPath/foreground only ready forest, hide existing areaRoad entirely for ready forest. Delete obsolete forest-only SVG road group and gradient; other areas' original SVG shapes/gradient unchanged.
- Image failure keeps old forest and world dimensions/positions. Missing DOM returns false; preload errors resolve false. No original art overwrite.

### I02. Spacious layout and camera framing
- Related Files: HTML ready-forest selectors, `setArenaArea`, `prepareForestScenery`, new `fitArenaWorld` and existing resize/fullscreen handlers; modify.
- Signature: `fitArenaWorld(): void` fits visible battle world when not launching/aiming and no camera animation; computes scale=min(arena.clientWidth/world.offsetWidth,arena.clientHeight/world.offsetHeight), uses cameraTransformFor(world,scale). Return early for missing/zero-size/hidden battle. No animation timer added.
- Schema: ready-forest world width240%, height200%. Launcher left14%, bottom26%; base foot line at74% world height. Enemy group left73%, right16%, bottom26%, height112px. Forest monsters all bottom0, preserving individual horizontal group offsets. Visual inspection refined margins from8% to14%/16% because the closer foreground otherwise hid the launcher and last enemy. Final margins keep actors within the transparent center and retain a large central gap.
- Logic: existing world pointer inverse transform/trajectory coordinate functions unchanged; changed CSS offsets are read dynamically. All layer/actor overrides depend on forest+ready. Refresh fitted layout after ready success/failure and area selection when idle; refresh existing resize/fullscreen listeners when idle. Intro retains existing flow and zoom. No stage obstacle/physics/damage change. Check scenery coverage if camera exposes world boundaries.
- Validation: node inline vm.Script syntax via stdin on Windows; PNG signature/dimensions/alpha check; git diff --check; actual Chrome screenshot and CSS geometry measurements comparing old default160%/43% layout to new240%/73%; launcher/enemy feet on path; early release and completed mouse/Space shot; other area/fallback states. HTTP serve with `npx --yes http-server . -a 127.0.0.1 -p 4173 -c-1`. Record prompts and results in `.memory/validation/2026-10-12-forest-layered-background/path-revision.md`.

## Acceptance Criteria
- [x] Genuine referenced path PNG, no brown platform slab.
- [x] DOM/stacking order: distant→midground→path/gameplay→foreground; trajectory stays visible.
- [x] Whole scene reads as a larger map; numeric world and on-screen launcher-enemy gap increase.
- [x] Dynamic aim/shot, other regions and image-error fallback work.

## Commit Message
```text
feat(forest): add a panoramic illustrated path between scenery layers

Plan: 2026-10-12-forest-layered-background
Phase: P01-forest-scene
Task: T01R01-panoramic-path-revision

- Rebuild the forest path from the original artwork reference
- Expand the forest world and separate launcher and enemies
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — check-path-revision.cjs, real Chrome layout/shot/fallback/other-area checks, fixed390px iframe overlap verification. See path-revision.md.
- commit: pending
