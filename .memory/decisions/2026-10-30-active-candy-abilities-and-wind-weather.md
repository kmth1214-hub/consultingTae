# Decisions: Active Candy Abilities and Wind Weather

- Date: 2026-10-30
- Status: Confirmed
- Feature: `active-candy-abilities-and-wind-weather`
- Workflow: Complete the `/memory-plan` and `/memory-execute` stages before the authorized Azure deployment.
- Scope: All four regions in the regular React game, including the local map studio where it uses the same battle engine. Deploy the completed work to Azure Static Web Apps after validation.

## D01. Wizard and Alchemist activation

- **Chosen by user**: After launching a dedicated Wizard or Alchemist stone, one additional click on the arena or Space activates its ability once at the stone's current position. Ignore repeat inputs and inputs for other stone types.
- **Fallback**: Automatically activate on the first enemy or obstacle contact if the player has not activated it. On ground contact, allow a 0.5-second input window, then activate automatically if still unused. There is no second activation after an automatic one.
- **Wizard**: Split from the current stone position into the existing two small orbs; the original stone continues. Preserve the existing direct-hit and small-orb collision rules, including the existing third-collision damage bonus. Ground activation must launch visible small orbs upward rather than hiding them below the ground.
- **Rationale**: The player controls the dramatic moment while a missed input still produces the dedicated stone's effect.

## D02. Alchemist detonation

- **Chosen by user**: Replace the current automatic potion-wave ability with an explosion at the manual or automatic activation point. The original stone disappears on detonation. A midair detonation ends its physical flight; a preceding direct enemy contact still deals its normal direct damage.
- **Success chance by grade**: C 20%, B 45%, A 70%. Use the same chance for manual and automatic activation. An unsuccessful explosion still plays its animation but deals no area damage.
- **Success effect**: Each living enemy whose actual position is within the grade-based radius receives 1 damage: C 300, B 375, A 450 world units. Damage, score, and visual feedback must use the same resolved result.
- **Rationale**: Timing and grade both matter, while a successful blast can affect several nearby enemies.

## D03. Milk stone protection

- **Chosen by user**: Directly hitting an enemy with the dedicated Milk stone immediately restores 5 HP, capped at the existing maximum of 100, and prepares a one-hit shield for the next player firing turn.
- **Timing**: The counterattack following the triggering hit is unaffected. After the next launched stone, block the first incoming enemy attack, if any. The shield expires when that turn ends even if no enemy attacks. The shield does not stack from repeated hits. This replaces the old every-third-hit heal and once-per-round automatic boss block.
- **Rationale**: The dedicated stone produces a predictable survival benefit without making the current turn's counterattack disappear.

## D04. Regional wind and weather

- **Chosen by user**: Forest shows falling leaves and wind; Snow shows falling snow and wind; City shows wind; Chaos shows black rain mixed with leaves and snow. Reuse the existing layered scene and keep combat objects visible.
- **Physical wind**: Place two broad, visible wind regions at different heights per round. Passing through a region gives every player-thrown stone a mild directional drift. Crossing both regions in one shot does not multiply Wind Archer charge. Forest, Snow, and City choose a left or right wind direction at round start and retain it for that round. Chaos chooses a new direction for each shot and displays it before aiming. Wind direction and physical collision must agree; the short trajectory preview reflects the same physics.
- **Rationale**: Visible environmental motion creates a meaningful aim decision and a clear charging condition.

## D05. Wind Archer charge and Q abilities

- **Chosen by user**: For Wind Archer, only a basic stone charges wind. Passing through at least one wind region adds 1 point. If that same stone then directly hits at least one enemy, the shot adds 2 points total. Direct hits without wind add 0. Each shot adds at most 2 points, even when it crosses both regions or hits multiple enemies. Charge caps at 4 and persists across rounds and regions.
- **Q availability**: Wind Archer can arm the next shot with Q only when a Wind Archer stone is loaded and the ability is off cooldown. With 0–3 charge, Q arms normal automatic homing without spending saved charge. At 4 charge, Q arms upgraded Chain Storm and immediately resets charge to 0. A missed armed shot consumes the use. Both variants have a cooldown of three *subsequent player stone launches*; consumables do not advance it, and the counter persists across rounds.
- **Homing presentation**: Keep automatic enemy targeting and obstacle bypass. The flight weaves along a visible roller-coaster-like route before reaching the target. Hide the pre-launch trajectory preview while Q is armed, but show the flying stone and a short trailing effect. Show charge, Q availability, and cooldown in the battle UI.
- **Rationale**: Basic stones build toward Wind Archer's special, while the dedicated stone spends the active ability. Charge and cooldown create separate, visible progress.

## D06. Chain Storm damage

- **Chosen by user**: On the Q-armed Chain Storm shot's actual direct enemy hit, apply the normal direct damage and once-only chain damage to living enemies in front of the struck enemy. Sort enemies by horizontal world position from the launcher, including airborne and elevated enemies. The struck enemy's rolled stone damage, after direct-damage modifiers such as Fireball but before remaining-HP capping, is the chain starting value.
- **Falloff**: Each earlier enemy in that order takes one less damage than the previous position, floored at 0. For example, enemy 3 with starting damage 4 gives enemy 2 damage 3 and enemy 1 damage 2; enemy 6 with starting damage 2 gives enemy 5 damage 1 and earlier enemies damage 0. If a Spear shot directly hits several enemies, the last pierced enemy is the chain anchor; apply the chain once. A miss causes no chain. Existing damage and score conventions apply to each actual hit.
- **Rationale**: Aiming farther into the enemy line rewards the player, while explicit zero falloff prevents free damage across the whole map.

## D07. Other cookies using Wind Archer stones

- **Latest correction by user**: A winning stone slot awards one randomly selected dedicated stone from the currently unlocked pool, not necessarily the selected cookie's own stone and without an extra choice screen. Adventurer, Alchemist, and Wizard stones are available initially; Milk and Wind Archer stones enter the pool once Snow clear is stored on the signed-in account, including Forest in later runs. A slot loss still grants one basic stone. All unlocked stones use equal selection weight unless a later balancing decision changes it.
- **Other-cookie charge**: Only Wind Archer stones charge wind for another cookie. Their basic stones and own dedicated stones do not charge it. A Wind Archer stone gains +1 for crossing at least one wind region, or +2 total if it also directly hits an enemy. The same per-shot cap of 2 and total cap of 4 apply, and charge persists across rounds and regions.
- **Other-cookie Q**: Before 4 charge, Q is unavailable. At 4 charge and with a Wind Archer stone loaded, Q arms the next shot's Chain Storm and consumes the charge. That shot does **not** home; it must physically hit an enemy to trigger the chain. Other cookies have no three-shot cooldown: they may use Q again whenever they have recharged to 4 and loaded another Wind Archer stone. Their Q shot keeps the same chain damage rule in D06.
- **Rationale**: Borrowed Wind Archer stones provide a distinct unlock reward without giving every cookie Wind Archer's normal homing skill.

## D08. Account-backed unlock persistence

- **Chosen by user**: Persist Snow clear and Milk/Wind unlock status per signed-in company account, across refreshes, browsers, and devices. Use a new `PlayerProfiles` Azure Table in the existing Storage Account, keyed by the authenticated account identity using the server-side principal convention already used by the leaderboard. No Cosmos DB is needed for this scope.
- **Production authority**: On Azure, load the account profile before allowing a run to start. On load failure, show a retry state and do not fall back to local browser data. When Snow is cleared, save the unlock to the account profile; if saving fails, keep the clear result visible with a retry action and block the next-region transition until saving succeeds. Writes are monotonic: an unlocked account is not downgraded by a later false value.
- **Local development**: Continue using browser `localStorage` only for the local development environment. Do not import an existing browser unlock into the new account profile; account progress starts fresh. A browser refresh alone does not erase `localStorage`, but clearing site data or switching browser/device loses a local-only record.
- **Rationale**: Company login already supplies a stable account identity, and the existing Azure Storage Account supports a separate profile table without mixing progression data into leaderboard rows.

## D09. Existing code constraints and delivery

- **Confirmed from code**: `src/game/shotGeometry.js` currently precomputes the complete flight and automatically places Wizard split near the apex or first third; `src/game/gameSession.js` reserves that result at launch; `assets/js/battle-engine.js` resolves all damage at shot completion. The implementation must keep manual activation, the visible path, validated collision metadata, and committed damage in agreement. It must not accept a visual-only midair explosion while allowing the old stone to hit later.
- **Confirmed from code**: Milk currently heals on every third dedicated hit and blocks the first boss attack per round. Wind currently auto-homes once per round. These old rules are superseded by D03, D05, and D07, including their HUD text and tests.
- **Confirmed from code**: Slot wins currently always grant the selected cookie's dedicated stone; `grantWeapon` can nevertheless admit other unlocked stone IDs. `profileStore.js` currently saves only Snow clear in browser `localStorage`; the game does not persist a stone inventory. The leaderboard API already reads the trusted Static Web Apps principal and hashes the user ID for Azure Table storage. Reuse that identity convention for profile storage and add the slot choice after a Snow-unlocked account loads.
- **Delivery chosen by user**: Implement in the regular game and deploy to Azure after the project checks pass. Add the profile API and `PlayerProfiles` Table in the existing Storage Account; do not change leaderboard ranking rules.
