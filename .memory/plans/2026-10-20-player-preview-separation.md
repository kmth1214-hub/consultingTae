# Plan: Player and Preview UI Separation

## Goal
Present the mockup as a player-facing game by default, with developer navigation and export tools visible only at ?preview=1.

## Source Decisions
- [Confirmed decisions](../decisions/2026-10-20-player-preview-separation.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Gate preview controls by URL mode and verify both modes | [P01](../phases/2026-10-20-player-preview-separation/P01-preview-mode/phase.md) |

## Boundaries
- Production target: cookie-roguelike-mockup.html.
- Preview-only groups: .mockup-controls, .viz-menu, .mockup-caption.
- Keep the application, sidebar, screen flow, theme persistence, fullscreen behavior, combat and camera logic unchanged.
- Monster and catapult decisions are independent future work, not part of this plan.

## Execution Order
1. T01 adds an early URL-derived mode flag, gates only the three preview UI groups and verifies player/preview behavior.

## Validation Strategy
- Parse inline JavaScript with Node vm.Script and run git diff --check.
- Use local HTTP and actual Chrome at normal and ?preview=1 URLs. Inspect desktop/mobile widths, keyboard focus, navigation, theme, fullscreen exit/fallback and console.
- Normal mode hides all three groups before first paint; preview mode retains them.
- Initialize .memory/current.md to P01-T01 for execution.

## Completion
Complete when T01 is implemented, verified, committed and memory status is synchronized.

Completed 2026-10-20. T01 commit: dd4ea41. See [browser validation](../validation/2026-10-20-player-preview-separation/final.md). Fullscreen API was blocked in the validation browser.
