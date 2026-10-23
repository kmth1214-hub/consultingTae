# Decisions: Toppling Stacked Obstacles

- Date: 2026-10-23
- Status: Confirmed
- Feature: `toppling-stacked-obstacles`
- Applies to: React battlefield in the forest, snow, city, and chaos regions.
- Workflow: Design interview complete. Create a `/memory-plan` before implementation.
- Supersedes: The first-obstacle-stop and single-effect-per-shot rules, the fixed obstacle placement/art, and the excluded falling/chained-obstacle scope in [the earlier candy-roll decision](2026-10-22-candy-roll-obstacle-interactions.md). Preserve its ground-roll limit, regional effects, scoring, and Wind Archer exception unless changed below.

## D01. Regional stacked props
- **Chosen by user**: Replace low props with visibly stacked objects approximately 1.5–2 times a regular monster's height. Forest uses stacked logs, snow uses ice pillars/blocks, city uses stacked jars and crates, and chaos uses an unstable mixture of these regional materials.
- **Rationale**: The taller silhouette gives players a practical target and a visible topple while matching each region. Keep the stacks within the road band so they do not obscure the layered scenery, especially the city panorama.

## D02. Random layout for each round
- **Chosen by user**: Generate 2–4 stacks and new monster positions at each round entry. Monster and stack positions cannot overlap. Accept only layouts where both monsters and standing stacks can be reached by legitimate slingshot shots. Hold that layout fixed throughout the round; a new round draws a new layout.
- **Rationale**: Varied distances and prop counts improve replayability without creating impossible battles. Randomization must not occur on React rerenders or during camera movement. If candidate generation fails, use a verified playable fallback rather than an overlapping or unreachable layout.
- **Existing-code constraint**: `buildBattlefield` currently gives enemies and three low obstacles deterministic positions. Its tests and shot-reachability checks need to evolve together. Keep layout randomness separate from combat damage/effect rolls so a visual rerender cannot change combat outcomes.

## D03. Collision, momentum, and chaining
- **Chosen by user**: A candy can hit a standing stack, continue flying, hit another stack if it retains enough momentum, and still directly hit a monster. A stack triggers at most once per round. Airborne and ground-rolling candy use the same stack interaction.
- **Momentum rule**: Use the candy's instantaneous speed at impact, which reflects pull power, angle, and elapsed flight. A sufficiently fast impact reduces velocity and continues the projectile; a slow impact makes it fall and possibly roll under the existing maximum of five candy diameters. Tune the threshold and loss in the implementation plan using deterministic tests rather than UI pixel distance.
- **Collision order**: Resolve contacts in actual path order, without double-applying a contact when animation callbacks or frames repeat. A direct enemy contact uses the existing candy-damage rules and ends that projectile's motion.
- **Wind Archer exception**: Preserve its once-per-round guided shot that bypasses stacks to reach its selected enemy; a bypassed stack does not topple or trigger an effect.

## D04. Topple and debris lifecycle
- **Chosen by user**: Contact makes a stack wobble, then topple in the direction of impact. Its regional gameplay effect resolves when that stack topples, including during a chain of multiple contacts. The fallen stack remains visible as debris for the rest of that round, is non-collidable, and cannot trigger again. The next round begins with fresh standing stacks.
- **Damage interpretation**: The fall direction is a visual cue. It does not replace or add a separate physical fall-hit damage area. The existing regional effect remains authoritative. This supersedes the earlier tentative idea that only monsters in the fall path would take damage.

## D05. Preserve regional effects
- **Forest**: Toppled logs deal 3 damage to the nearest living enemy and score actual HP removed.
- **Snow**: Toppled ice reduces the next enemy attack's damage by 50% once.
- **City**: Toppled jars/crates deal independently rolled 1–2 damage to every living enemy and score actual HP removed.
- **Chaos**: Each toppled stack uniformly selects one existing outcome: forest strike, snow guard, city multi-target damage, or a one-shot inversion of both horizontal and vertical drag for the next shot. Preserve the visible inversion cue and consume it when the affected shot is fired.
- **Timing**: For every topple in a chain, resolve that stack's effect once at its topple moment. Preserve current health caps, score accounting, defense, turn, and ammo rules.

## D06. Scope and validation
- **Included**: Region-matched stacked art, wobble/topple/debris states, per-round randomized playable layouts, momentum after contact, multiple stack contacts, direct-hit continuation, existing regional effects, and player-visible feedback.
- **Excluded**: A new first-person boss sequence, Azure deployment, and changing the established regional effect values.
- **Verification**: Test non-overlap and reachability across all regions, rounds, and enemy-density extremes; stable layout during a round; 2–4 props; effect-on-topple timing; once-per-stack and multi-stack chaining; speed-dependent continuation/fall; ground-roll interactions; non-collidable debris; direct-hit and Wind Archer behavior; score, damage, and one enemy response per accepted shot. Run the project build and relevant tests.
