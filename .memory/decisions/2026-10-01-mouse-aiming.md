# Decisions: Mouse Aiming, Power, Camera, and Full-Screen Play

- Date: 2026-10-01
- Status: Confirmed

## D01. Angle control
- **Chosen**: The player presses and holds the left mouse button in the battle arena. Vertical mouse movement adjusts the catapult's launch angle.
- **Rationale**: Direct mouse movement gives the player hands-on control of the catapult's elevation.

## D02. Power gauge
- **Chosen**: While the player holds Space, the power gauge cycles repeatedly up and down. Releasing Space locks in the current power.
- **Rationale**: The oscillating gauge lets the player choose launch power with timing.

## D03. Direction and launch
- **Chosen**: After locking power, horizontal mouse movement sets the firing direction while the left mouse button remains held. Releasing the left mouse button immediately launches the projectile using the selected angle, power, and direction.
- **Rationale**: The mouse controls elevation and direction while the keyboard controls power; releasing the held mouse press completes the shot.

## D04. Trajectory preview
- **Chosen**: While the player holds the left mouse button and moves the pointer to aim, show the predicted trajectory as a faint dashed line. Update the preview as the angle or direction changes.
- **Rationale**: The player can inspect the current shot before releasing to fire, while the faint treatment keeps the preview from obscuring the arena.

## D05. Round camera introduction
- **Chosen**: At the beginning of every round, show the enemies in a close view first, then slowly pan toward the catapult. When the area changes, use the new area's background during the same round introduction.
- **Rationale**: The recurring camera move establishes the enemy-to-catapult distance and presents each new area before combat.

## D06. Full-screen play
- **Chosen**: The game switches to a full-screen game view for play.
- **Rationale**: Using the full display gives the wide map and the distance between enemies and catapult room to read clearly.
