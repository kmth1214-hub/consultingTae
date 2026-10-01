# Task: T03 Consumable Item Artwork

## Status: done

## Goal

Replace emoji placeholders for the four consumables with the artwork selected by the user in both the battle inventory and round-reward choices.

## Decision Summary

- 불공 → `Fiery Candy Comet.png`
- 방어 → `Gigawatt Cube.png`
- 회복 → `Mini Energy Potion.png`
- 창 → `Candy Cane Staff of Darkness.png`
- Copy only these four files into `assets/items/` and use local relative paths; do not track the full Fan Kit.

## Implementation

### I01. Copy the selected images into the application assets

- Related Files:
  - `Cookie Run_ OvenBreak Fan Kit/03. Treasures/Fiery Candy Comet.png` — source; read-only.
  - `Cookie Run_ OvenBreak Fan Kit/03. Treasures/Gigawatt Cube.png` — source; read-only.
  - `Cookie Run_ OvenBreak Fan Kit/07. UI/Items/Mini Energy Potion.png` — source; read-only.
  - `Cookie Run_ OvenBreak Fan Kit/03. Treasures/Candy Cane Staff of Darkness.png` — source; read-only.
  - `assets/items/fiery-candy-comet.png` — new tracked project copy.
  - `assets/items/gigawatt-cube.png` — new tracked project copy.
  - `assets/items/mini-energy-potion.png` — new tracked project copy.
  - `assets/items/candy-cane-staff-of-darkness.png` — new tracked project copy.

#### Details

- Copy each file byte-for-byte and use the normalized lowercase destination names listed above.
- Do not remove or rename any source file and do not copy additional items.
- Use this constant in the HTML script:
  ```javascript
  /** @typedef {'fireball'|'defense'|'heal'|'spear'} ConsumableId */
  /** @type {Readonly<Record<ConsumableId, {src: string}>>} */
  const CONSUMABLE_ART;
  ```
- Exact `CONSUMABLE_ART` map:
  ```javascript
  const CONSUMABLE_ART = Object.freeze({
    fireball: {src: './assets/items/fiery-candy-comet.png'},
    defense: {src: './assets/items/gigawatt-cube.png'},
    heal: {src: './assets/items/mini-energy-potion.png'},
    spear: {src: './assets/items/candy-cane-staff-of-darkness.png'}
  });
  ```

### I02. Render the images in inventory and reward-choice cards

- Related Files:
  - `cookie-roguelike-mockup.html` :: `[data-screen="battle"] .inventory .item-slot` — replace emoji with mapped `<img>`; modify.
  - `cookie-roguelike-mockup.html` :: `[data-screen="reward"] .reward-section .reward-card` — replace the three consumable reward emojis with mapped `<img>`; modify.
  - `cookie-roguelike-mockup.html` :: `.item-icon`, `.reward-art`, responsive item styles — add image sizing; modify.
  - `cookie-roguelike-mockup.html` :: `CONSUMABLE_ART`, `renderConsumableImage` — add reusable image rendering helper; modify.

#### Details

- Use a single helper:
  ```javascript
  function renderConsumableImage(itemId: ConsumableId, className: string): HTMLImageElement;
  ```
  It creates an `<img>`, assigns `src` from `CONSUMABLE_ART`, sets `alt=""` and `aria-hidden="true"` because the visible sibling text names each item, adds the requested CSS class, and sets `loading='eager'` for the four small local files. If the id is unknown, return no image; do not interpolate user-provided strings into HTML.
- Add stable `data-consumable` identifiers to the four inventory slots and three reward cards (`fireball`, `spear`, `heal` in rewards; inventory also includes `defense`). The item display names and hotkeys stay unchanged.
- Inventory icon size: `32 × 32 px`, `object-fit: contain`, no crop; reward artwork size: `54 × 54 px`, `object-fit: contain`, no crop.
- Keep current item descriptions, item counts, reward logic, and key mapping unchanged. In particular, slot 2 remains 창, slot 3 remains 방어, and slot 4 remains 회복.
- The adjacent visible item name remains the accessible name. Mark the image decorative with `alt=""` and `aria-hidden="true"` so screen readers do not announce the same item twice.

## Acceptance Criteria

- [x] The four selected local image copies exist under `assets/items/` and open successfully.
- [x] Battle inventory displays Fiery Candy Comet, Candy Cane Staff of Darkness, Gigawatt Cube, and Mini Energy Potion beside the correct Korean names and keys.
- [x] Round-reward cards display the corresponding icons for 불공, 창, and 회복.
- [x] Icon aspect ratios are preserved and no image is stretched or cropped.
- [x] No full Fan Kit source folders or unselected item assets are added.
- [x] Existing item hotkeys, descriptions, and counts are unchanged; each item name remains available to screen readers without duplicate icon announcements.

## Validation

- `Start-Process .\cookie-roguelike-mockup.html` — open the prototype and inspect both battle inventory and round rewards.
- Manually verify all images load from `./assets/items/` when the HTML is opened directly from disk, and check that adjacent visible names remain the accessible labels while the icons are decorative.
- Inspect Git staging/status before commit to confirm only the four selected item files were copied.

## Commit Message

```text
feat(items): apply selected consumable artwork

Plan: 2026-10-01-battle-presentation
Phase: P01-battle-experience
Task: T03-consumable-artwork

- Copy the four selected consumable images into project assets
- Render item icons in inventory and reward cards
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- Static checks and byte-for-byte asset comparisons passed; the user confirmed the browser image review on 2026-10-01.
- commit: see Task-specific Git commit
