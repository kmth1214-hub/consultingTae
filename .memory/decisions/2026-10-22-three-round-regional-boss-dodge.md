# Decision: Three-Round Regional Progression and Boss Candy Dodge

## Goal
Shorten the main adventure's repetitive combat while reserving the first-person candy dodge sequence as a later boss-fight update.

## Confirmed Decisions
- The Forest, Snow, and City regions each have three rounds: two regular encounters followed by one boss encounter.
- The boss moves to round 3 in each main region. The existing regional completion and unlock flow remains attached to clearing that boss.
- Keep the round reward flow after rounds 1 and 2. Clearing round 3 routes directly to the existing regional transition or final result flow.
- The optional Chaos bonus route is separate from main-region progression and keeps its existing three-round rules, maps, monsters, and scoring.
- Defer the first-person candy dodge sequence to a second update. In that sequence, the cookie launches a candy on the boss's third attack; the player steers the candy for about 10–15 seconds and dodges regional obstacles that approach and grow in view.
- Planned dodge outcomes: zero collisions gives the boss maximum damage; one collision gives medium damage or blocks the next boss attack; two collisions gives minor damage; three collisions makes the candy fall and deals no damage.

## Deferred Design Detail
- Decide whether one collision grants medium damage, blocks the next boss attack, or lets the player choose between those outcomes when planning the second update.

## Rationale
- Three encounters per region give a clear short arc: two preparation fights and a boss finale, reducing repeated combat while preserving all three regional bosses.
- The first-person dodge segment requires its own steering, obstacle collision, camera presentation, and damage feedback. Keeping it for a second update limits risk to the first release and gives the boss a distinct later feature.

## Scope
- This decision changes main-region round progression only. It does not define Azure deployment, change the optional Chaos bonus route, or implement the first-person dodge sequence.
