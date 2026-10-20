# Task T01: Monster Illustrations

## Status
done

## Objective
Replace emoji in the regular forest battle with two original, transparent character illustrations while preserving each monster container's current position, dimensions, health badge, accessible name, and battle behavior.

## Files and Symbols
- `cookie-roguelike-mockup.html`: `.monster`, `.monster.snake`, `.monster.boar-one`, `.monster.boar-two`, `#enemyGroup`; replace the text nodes in the three existing `.monster` elements with decorative image elements and add `.monster-art` styling.
- `assets/monsters/jelly-snake.png`: new transparent sprite for the snake.
- `assets/monsters/chocolate-boar.png`: new transparent sprite shared by both boars.

## Asset Contract
- PNG with alpha transparency on a square canvas of at least 512 × 512, centered full-body character with safe transparent padding so the existing 67 × 76 desktop and responsive monster boxes can contain it without clipping. The generated source sprites are 1254 × 1254 and can be used directly at responsive CSS sizes.
- Snake: original storybook illustration, friendly but battle-ready, readable coiled jelly body, expressive face, candy/glaze details; distinct silhouette from emoji.
- Boar: original storybook illustration, chocolate-brown textured fur and biscuit tusks, readable face and compact full-body silhouette. Use the exact same asset for both boars.
- Cohesive palette, outline, shading, and light direction across both sprites; no background, text, logos, named characters, or copied franchise artwork.

## Implementation Contract
- Keep the three existing parent `.monster` elements and their classes/inline accessible labels intact. Insert `<img class="monster-art" ...>` in each; both boars reference `./assets/monsters/chocolate-boar.png` and the snake references `./assets/monsters/jelly-snake.png`.
- Give each image `alt=""` and `aria-hidden="true"`; its parent retains the existing Korean label and health value.
- Use `object-fit: contain`, size the image within the existing parent box, and keep it below the `::after` health badge in stacking order. Remove emoji-only font sizing/background styling if no longer needed, but preserve the parent dimensions, positioning, z-index, and health badge.
- Do not modify any `.bonus-monster` markup or styles, enemy positions, health, aim, or camera behavior.

## Acceptance Criteria
- The regular battle shows one jelly-bodied snake and two matching chocolate-fur boars with a cohesive original illustrated style.
- The existing three health badges, Korean accessible labels, and monster positions remain unchanged at desktop and mobile breakpoints.
- No broken image URLs or horizontal overflow; bonus-field emoji and scene composition are unchanged.

## Verification
- `git diff --check`
- Open the local page in Chrome; inspect the regular forest battle at desktop and narrow mobile widths. Verify art loads, remains contained, and badges are legible.
- Inspect the bonus-field screen and confirm its monsters remain the existing emoji.

## Execution Notes
- Passed `git diff --check`; Node parsed all 3 inline script blocks and confirmed one snake asset reference and two references to the shared boar asset.
- Confirmed both PNGs are 1254 × 1254 with transparent corner pixels; generated art was visually reviewed. The requested rendered-page desktop/mobile and bonus-field browser check remains unverified because the browser security policy blocked opening a local `file://` URL.

## Commit
`Plan: 2026-10-20-monster-visual-refresh — T01 add original monster illustrations`
