# Decisions: Battle Overlay Consumables

## Goal
Keep key battle information inside the expanded arena while removing the three-card HUD below it.

## Confirmed Decisions
- Move the consumable inventory into a compact table at the arena's top-left. Each row identifies the number key (1–4), item icon and name, and remaining count. Keep the existing Use buttons for mouse access and preserve number-key behavior.
- Move the permanent magic-candy card to the arena's top-right.
- Show the magic-candy card while the player can prepare a shot. Hide it when the shot launches, keep it hidden for the full projectile flight, then show it again after impact and reload/reset.
- Remove the lower aim-information panel. Preserve a compact angle readout beside the slingshot; the vertical power meter already communicates power.
- Keep the arena full width and make the overlaid cards legible over the scenery with opaque/translucent card surfaces and responsive sizing.

## Existing Behavior Observed
- The inventory is below the arena and already has 1–4 rows with counts and Use buttons. Number keys call `useItem()`.
- `onArenaPointerUp()` marks launch, awaits `animateProjectile()`, then calls `fireShot()` and `resetAimAfterShot()` only after the projectile animation completes.
- `cancelAim()` is used for canceled/failed shots and should restore the card if needed.
- Current angle and power readouts live in the lower aim card; power is independently rendered by the vertical meter next to the slingshot.
