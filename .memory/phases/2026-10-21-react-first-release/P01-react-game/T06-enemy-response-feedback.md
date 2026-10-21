# T06 Enemy Response Feedback

## Status
done

## Problem and decisions
- User reports enemy damage without any visible attack, making Defense meaningless.
- Deterministic real-browser repro: `npm.cmd run test:e2e -- enemy-response.spec.cjs` fails because `enemy-attack` is absent, although the real engine reports a Defense block and unchanged HP.
- Confirmed cause: `BattleScreen.combatMessage` is the only enemyAttack consumer; `resolveEnemyTurn` consumes defense immediately. No hidden attack animation exists. Slingshot incorrectly retains a shield from lastEvent.key.
- Preserve current damage, one enemy response per accepted action, full Defense interception, Milk block, and third-attack boss specials. Add presentation only; no balance redesign or Azure changes.

## Target files and symbols
- `assets/js/battle-engine.js`: resolveEnemyTurn adds event metadata for HP before/after and attempted special (blocked specials remain suppressed).
- `src/game/gameSession.js`: routeCombat and presentation commands; authoritative combat resolves once, animation never reapplies damage. Pending response prevents overlapping actions and delays fatal result screen.
- `src/components/{BattleScreen,BattleArena,MonsterGroup,Slingshot,EnemyResponse}.jsx`: actual attacker pose, themed projectile/charge, impact and shield interception, delayed visible HP. Remove stale shield.
- `src/styles/arena.css`: response layering, windup/travel/impact, reduced-motion alternative.
- `tests/game-session.test.mjs`, `tests/e2e/{enemy-response,game-flow,slingshot}.spec.cjs`, `tests/e2e/support.cjs`: lifecycle, actual visible travel, damage/block, boss specials, no overlapping/double actions, lethal hit, reduced motion.

## Model
- EnemyAttack adds `playerHpBefore:number`, `playerHpAfter:number`, `attemptedSpecial:string|null`.
- Session `enemyResponse:null|{id:number,stage:'windup'|'travel'|'impact',attack:EnemyAttack}`. Stage advance is monotonic and guarded by id; completion is idempotent. Input is locked until response completes. HP is derived from event metadata before impact, authoritative run afterward.
- Playback owns timing only; cancel/unmount removes timers/frames. Hidden-tab completion settles the committed result without rerolling.

## Validation
```powershell
npm.cmd run test:e2e -- enemy-response.spec.cjs
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
git diff --check
```
Inspect desktop/narrow captures for attack travel and shield impact. Existing main/bonus/reward/input regressions must remain green.

## Completion evidence and learning notes
- Repro initially failed with `getByTestId('enemy-attack'): element(s) not found`; the engine had already blocked the attack correctly. First ranked hypothesis (event used only as text) was confirmed, with immediate Defense consumption explaining why final-state-only rendering could not show a block.
- `npm.cmd test`: 62/62 pass. `npm.cmd run test:e2e`: 41/41 pass (11 new enemy-response cases). After the final moving-health-label and notification cleanup, the targeted projectile/Forest-boss/narrow suite passes 4/4 on a fresh build. `npm.cmd run build` and `git diff --check` pass.
- Browser coverage includes actual projectile/body movement, attack source id, impact-time HP, blocked/unblocked third specials in all three regions, Milk block without spending Defense, stale-shield removal, input lock, fatal impact before defeat, retry, reduced motion and hidden-tab completion. Test-only fixtures seed advanced scenarios; production has no test/debug entry point.
- Visually inspected desktop attack/shield/special captures and 390px reduced-motion shield capture in `tmp/react-t06-*.jpg` (untracked). The final mobile banner uses native-size text and sits below the candy card. Development URL returns HTTP 200: `http://127.0.0.1:5173/`.
- Engine changes add metadata only. `playerHpBefore` preserves overkill/healing cases correctly; `attemptedSpecial` lets a blocked special still look like the attack attempted, while `special === null` keeps its actual effects suppressed.
- Session owns the response and guards its id. `enemyResponse.stage === 'impact'` reveals the already-committed HP; playback does not call `resolveEnemyTurn` again. This also delays defeat routing until the fatal blow is seen. A hidden tab settles that result immediately; reduced-motion mode removes lunge/shake and shortens playback.
- Adjacent required fixes: consumed shield no longer persists from `lastEvent.key`; HUD ammo/freeze and boss healing reveal at impact; blocked-input notification clears when the response ends; moving monster health/shadow follow its body. Existing repeated-action tests now wait for the visible response to finish.
- Damage ranges, third-attack cadence and Defense's current turn consumption are unchanged. This task fixes React presentation and flow, not long-term item balance or the legacy HTML UI. Prevent recurrence by verifying a full visible enemy turn and interception, rather than HP values alone. No separate architecture rewrite is necessary.

## Commit
```text
fix(game): show enemy attacks and shield interception

Plan: 2026-10-21-react-first-release
Phase: P01-react-game
Task: T06-enemy-response-feedback

Consume committed enemyAttack events for windup, attack and impact instead of text alone.
Synchronize HP feedback and shield interception without resolving damage twice.
```

## Next
Restore P02-T01 pointer after validation and commit. Deployment remains a separate task.
