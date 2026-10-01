# Task: T04 Hide Top-Level Menus

## Status: pending

## Goal

Remove prototype screen-selection and utility menus from the top of every player-facing screen while retaining the existing sidebar and in-screen navigation actions.

## Decision Summary

- Hide/remove both top-level containers: `.mockup-controls` with its screen tabs and `.viz-menu` with theme/export/print actions.
- Preserve `.sidebar`, screen CTAs, and `showScreen(name)` so players can still navigate the prototype through the app UI.
- Do not leave hidden top controls keyboard-focusable or exposed as visible navigation landmarks.

## Implementation

### I01. Remove top chrome and obsolete screen-tab wiring

- Related Files:
  - `cookie-roguelike-mockup.html` :: `.mockup-controls`, `.screen-tabs`, `.screen-tab`, `.viz-menu`, `@media print`, responsive CSS — remove top menu layout and its obsolete responsive rules; modify.
  - `cookie-roguelike-mockup.html` :: `data-screen-button` markup and click-listener registration — remove top tab controls/listeners; modify.
  - `cookie-roguelike-mockup.html` :: `.mockup-caption` — remove the statement that top tabs navigate through the mockup; modify.
  - `cookie-roguelike-mockup.html` :: `showScreen`, `.sidebar`, in-screen `onclick="showScreen(...)"` actions — preserve these routes; verify only.

#### Details

- Remove the `.mockup-controls` top strip and its screen-tab children from the rendered document. Remove `.viz-menu` and its top-level dropdown from the player-facing document.
- Remove CSS that exists only to lay out the removed containers, including their max-width mobile column rule and print selector references. Do not remove general `.screen-tab` styles if they are used by any retained UI; verify first.
- Remove the `[data-screen-button]` click registration and active-state updates from `showScreen` if no retained control uses those data attributes. Keep `showScreen(name)` as the common navigation helper for in-screen buttons and sidebar links.
- Remove the now-unused `toggleMenu`, outside-click dropdown handler, and utility-only listeners/functions only when no retained control references them. Do not remove `cycleTheme`/export/print logic if another retained entry point still uses it.
- Update `.mockup-caption` so it describes the prototype without referring to a removed top screen selector.
- The screen content, sidebar, and existing CTA buttons remain visible and operable. No blank top band or empty menu placeholder remains.

## Acceptance Criteria

- [ ] The top screen selector and utility hamburger/dropdown are absent from login, board, character, battle, reward, and result screens.
- [ ] No hidden top menu button can receive keyboard focus.
- [ ] Sidebar and in-screen CTA navigation still open their intended screens.
- [ ] Responsive and print layouts contain no empty space or references to removed top containers.
- [ ] Battle full-screen behavior and all combat controls remain unchanged.

## Validation

- `Start-Process .\cookie-roguelike-mockup.html` — inspect the page at desktop and mobile widths; verify no top menu remains.
- Navigate using the sidebar and in-screen CTAs through login, board, character selection, battle, reward, clear, and defeat screens.
- Use keyboard Tab navigation to confirm no removed menu controls remain in the focus order.
- Search the HTML for `.mockup-controls`, `.viz-menu`, and `data-screen-button`; remove remaining player-facing markup/listeners while preserving unrelated text and print styles.
- Run `git diff --check` and extract the inline script for `node --check`.

## Commit Message

```text
ui: remove top prototype menus

Plan: 2026-10-01-battle-presentation-refinement
Phase: P01-battle-refinement
Task: T04-hide-top-menus

- Remove the top screen selector and utility menu from player view
- Preserve sidebar and in-screen navigation
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
