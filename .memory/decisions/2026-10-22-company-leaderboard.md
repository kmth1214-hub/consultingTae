# Decisions: Company Leaderboard

- Date: 2026-10-22
- Status: Confirmed
- Scope change: Reopen the React first-release exclusion for a company-wide leaderboard. The game remains Vite + React and Azure Static Web Apps is the hosting target.

## D01. Shared storage and API
- **Chosen**: Azure Static Web Apps managed API backed by Azure Table Storage.
- **Rationale**: The board must be shared across company accounts; browser storage cannot provide that. This keeps the API alongside the current static app and avoids a separate SQL service.
- **Implementation boundary**: Integrate the API with Static Web Apps Microsoft Entra identity. Production requests fail closed when identity or Table Storage configuration is missing. Azure resource provisioning and live deployment remain in the separate Azure release task.

## D02. Account identity and local development
- **Chosen**: Use the authenticated Entra principal as the record owner and use its display name for public presentation. Never accept a user ID or display name asserted by the browser, and never show or store email for the board.
- **Rationale**: One employee must map to one best record while their identity remains controlled by Entra.
- **Local mode**: Permit an explicit development-only fake principal and in-memory repository for local tests. These must not be included or enabled in production builds.

## D03. Eligible score and record policy
- **Chosen**: Automatically submit the final main-run score when a run ends by defeat or main clear. Bonus score never contributes. Keep at most one all-time best record per Entra user; a worse or tied submission does not replace it.
- **Rationale**: Reuses the existing game decision: every ended main run is eligible and the company board retains personal bests.
- **Score trust**: Accept the completed score reported by the React client and perform shape/range validation, but do not rebuild gameplay as a server-authoritative simulation in this scope. The board is an internal feature, not cheat-proof competition; users can tamper with client-computed results.

## D04. Ranking rules and visible fields
- **Chosen**: Show the top 10 records ordered by score descending, then furthest main-run round descending, then shorter play time ascending. Show only rank, Entra display name, selected cookie, and score. Do not display furthest area/round or play time, so the tie-break criteria remain hidden. Users outside the top 10 see their own best score and rank separately.
- **Rationale**: Keep the leaderboard focused on the main competition score without exposing the tie-break values. Preserve the existing decision to keep weapons and inventory private.
- **Tie fallback**: If score, round and duration are identical, use a stable deterministic order so refreshes do not shuffle equal entries.

## D05. Entry points and return behavior
- **Chosen**: Add a leaderboard entry on the game home and on both main-run result outcomes (defeat and clear). Returning from the board goes back to the screen that opened it. Bonus-result screens do not submit or display bonus score on the company board.
- **Rationale**: Players can check standings before play and immediately after a recorded run, while the bonus route remains separate.

## D06. API failure behavior
- **Chosen**: Show loading, empty, and retryable error states in the leaderboard. Failure to load or submit a record must not block viewing the game result or starting another run; report that the record could not be saved.
- **Rationale**: The leaderboard is a feature around the game loop, not a dependency for playing it.

## Existing-code constraints
- `assets/js/battle-engine.js:getRunSummary` already separates `score`, `bonusScore`, `finalScore`, `furthestArea`, `round`, and `durationMs`; `src/game/gameSession.js` creates `main-results` for main defeat/clear and `bonus-results` for bonus outcomes.
- `src/game/profileStore.js` persists only the Snow unlock flag. There is no existing identity, leaderboard API, server repository or database integration.
- `src/components/RunResults.jsx` currently has no record submission or leaderboard control; `src/components/GameHome.jsx` currently only starts character selection.
- The existing first-release plan omits leaderboard, but this request explicitly reopens that scope. Planning must update the release boundary and include API/Storage work without treating Azure resources or credentials as available.

## Out-of-scope findings
- This design does not add server-authoritative combat, score replay, anti-cheat, account profile editing, leaderboards by season, admin score moderation, email display, or a new login screen.
- Current local preview cannot represent real company-wide persistence or production Entra claims. The development fake principal is for local tests only.
