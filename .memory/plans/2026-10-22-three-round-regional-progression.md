# Plan: Three-Round Regional Progression

## Goal
Shorten each main region to three rounds while preserving two reward breaks, all regional bosses, snow unlock, region transitions, the final clear, Chaos bonus scoring, and accurate leaderboard submissions. Defer the first-person candy dodge segment to a later update.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Move main-region bosses to round 3 and align the UI, battlefield coverage, and leaderboard submission validation. | [P01](../phases/2026-10-22-three-round-regional-progression/P01-three-round-progression/phase.md) |

## Decisions
- [Three-round regional progression and boss candy dodge](../decisions/2026-10-22-three-round-regional-boss-dodge.md)

## Scope
- Forest, Snow, and City each contain regular rounds 1 and 2, followed by the regional boss in round 3.
- Keep weapon and consumable reward selection after rounds 1 and 2. Clearing Forest or Snow round 3 enters the existing camp flow; camp begins the next region at round 1. Clearing City round 3 completes the main run and remains the gate for the optional Chaos route.
- Snow unlock is granted when Snow round 3 is cleared.
- Chaos remains three rounds with its current enemies, scoring, and completion rules.
- Update new leaderboard submissions to accept main-run rounds 1 through 3. Existing stored records remain readable and are not migrated.
- The first-person candy dodge sequence and its collision-tier damage rules are deferred; one-collision reward choice remains undecided until that update is planned.

## Existing Work Queue
- The prior active pointer was React First Release P02 T01 Azure Static Web App. It remains pending because owner-supplied Azure tenant, application, resource, and deployment-token values are required. This plan becomes the active pointer; the Azure task remains in its existing plan for later resumption.
