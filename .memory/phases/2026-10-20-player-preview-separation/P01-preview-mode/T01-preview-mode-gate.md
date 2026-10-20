# Task: T01 Preview Mode Gate

## Status: done

## Goal
Hide prototype navigation and tools at the normal mockup URL while preserving them at ?preview=1, so leaving fullscreen never reveals developer UI.

## Decision Summary
- Preview is enabled only when URLSearchParams(location.search).get('preview') === '1' during initial page load.
- Gate .mockup-controls, .viz-menu and .mockup-caption. Preserve player app/sidebar, existing screens, fullscreen, theme and combat behavior.

## Implementation

### I01. Resolve mode before first paint
- Related Files:
  - cookie-roguelike-mockup.html :: head bootstrap before main styles and root data attribute — modify.
  - cookie-roguelike-mockup.html :: preview-only CSS selectors — modify.

#### Details
- **Signatures & Types**:
  - Synchronous inline head bootstrap; no global API.
  - previewMode: boolean = new URLSearchParams(window.location.search).get('preview') === '1'.
  - document.documentElement.dataset.previewMode: 'true' | 'false'.
- **Data & Schema Fields**:
  - Root data-preview-mode string; true only for exact value 1, otherwise false.
  - No localStorage persistence or server state.
- **Execution Flow / Logic**:
  1. Run the small bootstrap synchronously in head before stylesheet paint; derive mode from URLSearchParams(location.search).get('preview') === '1' and set root data-preview-mode.
  2. Add root attribute CSS selectors applying display:none to .mockup-controls, .viz-menu and .mockup-caption unless data-preview-mode is true. Display:none must remove elements from layout and keyboard focus; opacity/visibility alone is insufficient.
  3. Retain these elements in DOM so existing data-screen-button listeners, toggleMenu, theme, print and PNG helpers continue working in preview mode.
  4. Store mode in a data attribute, not document.documentElement.className. Existing applyTheme(theme) replaces className; theme changes must not erase mode.
  5. No player-facing preview toggle or persistence. Reload without query returns to player mode.
  6. Do not modify sidebar, prototype screens, gameplay navigation, fullscreen helpers, viz-theme storage, combat or camera logic. Hiding header must not leave a gap; preserve responsive workspace/app-window layout.
  7. Do not expose preview URL in normal UI.

### I02. Verify both modes
- Related Files:
  - cookie-roguelike-mockup.html :: mode bootstrap and preview selectors — read-only after I01.
  - Local HTTP server and actual Chrome — manual verification; no test framework/file.
- Signatures & Types: no added application API.
- Data & Schema Fields: observe root data-preview-mode, computed display for three groups, active screen and theme class.
- **Execution Flow / Logic**:
  1. Normal URL: verify mode false, three groups display:none before interaction, occupy no layout space and cannot receive keyboard focus. App/sidebar remain visible.
  2. Navigate login, board, character selection, battle, reward and result screens using player controls. Verify groups stay hidden and no empty header/caption gap remains.
  3. Open ?preview=1: verify mode true and all groups visible. Exercise screen tabs and theme, PNG and print tools where available.
  4. Switch themes in both modes; root mode attribute and correct visibility must persist.
  5. In player mode exercise fullscreen entry/exit and API-denied fallback where the browser permits. Confirm no preview group appears after exit; document browser restrictions honestly.
  6. Inspect desktop/mobile responsive layout and console. Do not introduce a test framework.

## Acceptance Criteria
- [x] Normal URL hides all three groups from first paint and through navigation; fullscreen API was blocked by browser.
- [x] Hidden controls are absent from layout and accessibility tree; app/sidebar remain available.
- [x] Exact ?preview=1 shows existing controls and tools; screen tabs and theme work.
- [x] Theme switching preserves mode; mode does not persist between URLs.
- [x] Gameplay flow and desktop rendering remain intact; fullscreen fallback is the browser limitation.
- [x] Inline scripts parse, git diff --check passes and browser results are recorded.

## Validation
- Inline syntax — all inline scripts including the head bootstrap parse:

      node -e 'const fs=require("fs"),vm=require("vm"); const h=fs.readFileSync("cookie-roguelike-mockup.html","utf8"); for(const m of h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if(m[1].trim()) new vm.Script(m[1]); console.log("inline scripts OK");'
- git diff --check — no whitespace errors.
- Open normal and ?preview=1 URLs in Chrome over local HTTP; verify I02 states and record in .memory/validation/2026-10-20-player-preview-separation/final.md.

## Commit Message
feat(ui): separate player and preview modes

Plan: 2026-10-20-player-preview-separation
Phase: P01-preview-mode
Task: T01-preview-mode-gate

- Hide mockup controls outside explicit preview mode
- Preserve existing player navigation and theme behavior

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
