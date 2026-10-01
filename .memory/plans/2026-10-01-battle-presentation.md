# Plan: Battle Presentation

## Goal

Update the existing single-file browser prototype so its battle scene uses the four supplied area maps, introduces each round with a short enemy-to-catapult camera move, plays in a full-screen game view, supports the confirmed mouse-and-spacebar firing sequence, and displays the chosen consumable artwork. The result remains a self-contained HTML prototype; this plan does not create the production React application or implement the full combat simulator.

## Confirmed decisions

- Map sources and area mapping are in [map background decisions](../decisions/2026-10-01-map-backgrounds.md).
- Camera cadence, full-screen play, and the updated mouse/space control sequence are in [mouse aiming decisions](../decisions/2026-10-01-mouse-aiming.md).
- Consumable artwork and source files are in [consumable item art decisions](../decisions/2026-10-01-consumable-item-art.md).
- Project workflow requirements are in `AGENTS.md`.

## Scope and implementation assumptions

- The repository currently has `cookie-roguelike-mockup.html` as its only application file; there is no `package.json`, React source tree, or build system. Implement the approved prototype behavior in that HTML file using its existing CSS and plain JavaScript.
- Preserve the existing sample screen navigation, reward screen, and mocked shot result except where the approved immersive battle view or direct firing gesture replaces current controls.
- Copy only the four approved map images and four approved consumable icons out of the ignored Fan Kit folder. Reference the copies with relative paths under `assets/`; keep the full Fan Kit excluded from Git.
- Reuse the existing angle bounds (10–80 degrees) and power bounds (20–100 percent) as the prototype's initial tuning range. Keep tuning values in named constants so a later playtest can adjust them.
- Use the existing battle screen's forest sample as the initial scene. Implement a callable area setter for Forest, Snow, City, and Chaos so later run-state logic can change the theme; full campaign progression remains outside this plan.
- A round entry is represented by entering the battle screen in the current mockup. Each entry applies the current area and runs the camera intro once. Respect `prefers-reduced-motion` by skipping the camera animation and showing the final play framing immediately.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Integrate the immersive battle view, controllable firing sequence, and consumable artwork into the existing HTML prototype. | [P01](../phases/2026-10-01-battle-presentation/P01-battle-experience/phase.md) |

## Out of scope

- React conversion, company login, server persistence, leaderboard integration, campaign state, collision/damage simulation, and reward economy changes.
- Reworking the full prototype into the previously discussed sequential game flow. The existing top mockup screen selector and in-app sidebar are retained for now; native full-screen presentation hides controls outside the full-screen `.app-window` element.
- Touch/gamepad input. The confirmed control design uses a mouse and Spacebar.
