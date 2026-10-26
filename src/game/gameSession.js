import { BattleEngine } from './battleEngine.js';
import { CHARACTERS } from './gameData.js';
import { loadProfile, markSnowCleared, saveProfile } from './profileStore.js';

const initialAim = () => ({ angle: 0, power: 0, phase: 'idle', selectedTargetId: null });
const defaultLayoutRng = () => globalThis.crypto?.getRandomValues
  ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000
  : Math.random();
const REASONS = {
  'item-used': '이번 발사 전에 소모품을 이미 사용했어요. 사탕을 발사하면 다시 사용할 수 있어요.',
  reviewing: '발사 결과를 확인하고 있어요. 잠시 후 다음 행동을 할 수 있어요.',
  responding: '적이 공격하고 있어요. 반격이 끝나면 행동할 수 있어요.',
  empty: '이 소모품을 모두 사용했어요.', blocked: '얼음 숨결 때문에 이번 턴에는 소모품을 쓸 수 없어요.',
  aiming: '조준을 마친 뒤 소모품을 사용하세요.', 'combat-ended': '이미 전투가 끝났어요.',
  'inventory-full': '이 소모품은 최대 3개까지 보유할 수 있어요.', 'already-selected': '이미 선택한 보상이에요.',
  'rewards-incomplete': '무기와 소모품을 하나씩 선택하세요.', 'camp-choice-locked': '시작한 무기 보상을 먼저 마무리하세요.',
  locked: '눈 지역을 클리어하면 이 쿠키가 해금돼요.', 'invalid-state': '지금은 이 동작을 할 수 없어요.',
  'candy-locked': '눈 지역을 클리어하면 이 마법사탕이 해금돼요.'
};

// Engine actions mutate a private draft. Subscribers only receive completed snapshots.
// Keeping this controller outside React also makes full screen-flow tests deterministic.
export function createGameSession({ rng = Math.random, layoutRng = defaultLayoutRng,
  now = Date.now, storage, engine = BattleEngine } = {}) {
  const assignLayoutSeed = run => {
    const draw = layoutRng();
    if (!Number.isFinite(draw) || draw < 0 || draw >= 1) throw new RangeError('Invalid layout RNG');
    run.layoutSeed = Math.floor(draw * 0x100000000);
  };
  let sequence = 0;
  let state = { screen: 'home', profile: loadProfile(storage), selectedCharacter: null, run: null,
    aim: initialAim(), notification: null, outcome: null, summary: null, fusion: null, lastEvent: null, enemyResponse: null,
    leaderboardReturnScreen: null, campRewardReveal: null, shotReview: null };
  const listeners = new Set();
  const publish = patch => {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
  };
  const reject = reason => {
    publish({ notification: { id: ++sequence, message: REASONS[reason] || '동작을 완료할 수 없어요. 현재 상태를 확인하세요.', kind: 'error' } });
    return { accepted: false, reason };
  };
  function persistUnlock(run) {
    if (!run.snowAreaCleared || state.profile.snowAreaCleared) return {};
    const profile = markSnowCleared();
    const saved = saveProfile(profile, storage);
    return { profile, notification: { id: ++sequence, kind: 'success', message: saved
      ? '눈 지역 클리어! 우유맛 · 바람궁수 쿠키와 마법사탕이 해금됐어요.'
      : '쿠키와 마법사탕이 해금됐어요. 브라우저 저장을 사용할 수 없어 새로고침하면 초기화돼요.' } };
  }
  function finishCombatRouting(run, patch) {
    if (run.terminal === 'defeat') Object.assign(patch, {
      screen: run.bonusMode ? 'bonus-results' : 'main-results', outcome: 'defeat', summary: engine.getRunSummary(run, now())
    });
    else if (run.terminal === 'bonus-clear') Object.assign(patch, {
      screen: 'bonus-results', outcome: 'bonus-clear', summary: engine.getRunSummary(run, now())
    });
    else if (run.terminal === 'round-clear') {
      if (run.bonusMode) {
        engine.advanceRound(run, { rng, now: now() });
        if (!run.terminal) assignLayoutSeed(run);
        patch.aim = initialAim();
      } else {
        engine.drawRewardChoices(run, rng);
        patch.screen = 'reward';
      }
    }
    return patch;
  }
  function routeCombat(run, event, reviewResult = false) {
    const id = ++sequence;
    const patch = { run, lastEvent: { ...event, id,
      visualKey: event.key || (state.run.fireballArmed ? 'fireball' : 'weapon') },
      aim: { ...state.aim, phase: 'idle' }, notification: null, ...persistUnlock(run),
      enemyResponse: event.enemyAttack ? { id, stage: 'windup', attack: event.enemyAttack } : null,
      shotReview: reviewResult ? { id } : null };
    // Damage resolves once in the engine. Playback only reveals that committed result.
    // Keep fatal hits on the arena until the player has seen what hit them.
    publish(reviewResult || event.enemyAttack ? patch : finishCombatRouting(run, patch));
    return event;
  }
  const actions = {
    startCharacterSelect() {
      publish({ screen: 'characters', run: null, selectedCharacter: null, fusion: null, outcome: null,
        summary: null, lastEvent: null, enemyResponse: null, aim: initialAim(), notification: null, leaderboardReturnScreen: null,
        campRewardReveal: null, shotReview: null });
    },
    startRun(characterId) {
      if (state.screen !== 'characters') return reject('invalid-state');
      const character = CHARACTERS.find(item => item.id === characterId);
      if (!character) return reject('invalid-state');
      if (character.locked && !state.profile.snowAreaCleared) return reject('locked');
      const run = engine.createRunState({ characterId, area: 'forest', round: 1, rng, now: now(),
        snowRewardsUnlocked: state.profile.snowAreaCleared });
      assignLayoutSeed(run);
      publish({ run, selectedCharacter: character, screen: 'battle', aim: initialAim(), notification: null, lastEvent: null,
        campRewardReveal: null, shotReview: null });
      return { accepted: true };
    },
    setAim(patch) {
      if (state.screen !== 'battle' || state.run.terminal || state.enemyResponse || state.shotReview) return;
      const aim = { ...state.aim };
      if (Number.isFinite(patch.angle)) aim.angle = ((patch.angle + 180) % 360 + 360) % 360 - 180;
      if (Number.isFinite(patch.power)) aim.power = Math.max(0, Math.min(100, patch.power));
      if (['idle', 'dragging', 'launching'].includes(patch.phase)) aim.phase = patch.phase;
      if ('selectedTargetId' in patch) aim.selectedTargetId = state.run.enemies.some(enemy => enemy.id === patch.selectedTargetId && enemy.alive)
        ? patch.selectedTargetId : null;
      publish({ aim });
    },
    resetAim() { publish({ aim: initialAim() }); },
    advanceEnemyResponse(id, stage) {
      if (state.shotReview) return;
      const response = state.enemyResponse;
      const stages = ['windup', 'travel', 'impact'];
      if (!response || response.id !== id || stages.indexOf(stage) !== stages.indexOf(response.stage) + 1) return;
      publish({ enemyResponse: { ...response, stage } });
    },
    completeEnemyResponse(id) {
      if (state.shotReview) return;
      if (state.enemyResponse?.id !== id) return;
      publish(finishCombatRouting(state.run, { enemyResponse: null, notification: null }));
    },
    completeShotReview(id) {
      if (!state.shotReview || state.shotReview.id !== id) return;
      const patch = { shotReview: null };
      publish(state.enemyResponse ? patch : finishCombatRouting(state.run, patch));
    },
    fireShot({ hitIds = [], selectedTargetId = state.aim.selectedTargetId, shotMeta, reviewResult = false } = {}) {
      if (state.screen !== 'battle') return reject('invalid-state');
      if (state.shotReview) return reject('reviewing');
      if (state.enemyResponse) return reject('responding');
      if (state.aim.phase === 'dragging') return reject('aiming');
      const obstacleKinds = ['log', 'ice', 'crate'];
      const contacts = shotMeta?.contacts;
      const validContacts = contacts === undefined || (Array.isArray(contacts)
        && contacts.every((contact, index) => contact && typeof contact.obstacleId === 'string'
          && contact.obstacleId.length > 0 && obstacleKinds.includes(contact.obstacleKind)
          && Number.isFinite(contact.distance) && contact.distance >= 0
          && Number.isFinite(contact.time) && contact.time >= 0
          && Number.isFinite(contact.point?.x) && Number.isFinite(contact.point?.y)
          && typeof contact.rolling === 'boolean'
          && Array.isArray(contact.obstacleTargetIds)
          && contact.obstacleTargetIds.every(id => typeof id === 'string')
          && new Set(contact.obstacleTargetIds).size === contact.obstacleTargetIds.length
          && (contact.trigger === undefined || (
            [-1, 1].includes(contact.direction) && Number.isInteger(contact.chainDepth)
            && (contact.trigger === 'candy' ? contact.sourceObstacleId === null && contact.chainDepth === 0
              : contact.trigger === 'obstacle' && contacts.slice(0, index).some(parent =>
                parent.obstacleId === contact.sourceObstacleId && parent.time < contact.time
                && parent.chainDepth + 1 === contact.chainDepth))))
          && (contact.obstacleEndPose === undefined || (
            [contact.obstacleEndPose.x, contact.obstacleEndPose.y, contact.obstacleEndPose.angle].every(Number.isFinite)
            && contact.obstacleEndPose.x >= 0 && contact.obstacleEndPose.x <= 3600
            && contact.obstacleEndPose.y >= -1200 && contact.obstacleEndPose.y <= 900))
          && (state.run.area !== 'forest' || contact.obstacleKind !== 'log' || (
            [contact.logEndPose?.x, contact.logEndPose?.y, contact.logEndPose?.angle].every(Number.isFinite)
            && contact.logEndPose.x >= 0 && contact.logEndPose.x <= 3600
            && contact.logEndPose.y >= -1200 && contact.logEndPose.y <= 900
            && (contact.logHit === null || (typeof contact.logHit?.id === 'string'
              && state.run.enemies.some(enemy => enemy.id === contact.logHit.id)
              && Number.isFinite(contact.logHit.time) && contact.logHit.time >= contact.time))
            && Number.isFinite(shotMeta.directHitTime)
            && (contact.trigger === 'obstacle' || shotMeta.directHitTime >= contact.time)))
          && (!index || (contact.distance >= contacts[index - 1].distance
            && contact.time >= contacts[index - 1].time)))
        && new Set(contacts.map(contact => contact.obstacleId)).size === contacts.length);
      if (shotMeta !== undefined && (!shotMeta || !['enemy', 'obstacle', 'ground', 'bounds', 'timeout'].includes(shotMeta.impactKind)
        || typeof shotMeta.reverse !== 'boolean' || typeof shotMeta.rolling !== 'boolean'
        || !Array.isArray(shotMeta.obstacleTargetIds) || shotMeta.obstacleTargetIds.some(id => typeof id !== 'string')
        || new Set(shotMeta.obstacleTargetIds).size !== shotMeta.obstacleTargetIds.length
        || !validContacts
        || (contacts !== undefined
          ? (contacts.length ? shotMeta.obstacleId !== contacts[0].obstacleId
              || shotMeta.obstacleKind !== contacts[0].obstacleKind
              || shotMeta.obstacleTargetIds.length !== contacts[0].obstacleTargetIds.length
              || shotMeta.obstacleTargetIds.some((id, index) => id !== contacts[0].obstacleTargetIds[index])
              : shotMeta.obstacleId !== null || shotMeta.obstacleKind !== null
                || shotMeta.obstacleTargetIds.length !== 0)
          : shotMeta.impactKind === 'obstacle'
          ? (typeof shotMeta.obstacleId !== 'string' || !obstacleKinds.includes(shotMeta.obstacleKind))
          : (shotMeta.obstacleId !== null || shotMeta.obstacleKind !== null || shotMeta.obstacleTargetIds.length !== 0)))) return reject('invalid-state');
      const run = structuredClone(state.run);
      const event = engine.resolveProjectile(run, { hitIds, selectedTargetId: shotMeta?.reverse ? null : selectedTargetId,
        shotMeta: shotMeta && structuredClone(shotMeta), aimInversionApplied: Boolean(run.pendingAimInversion), rng });
      if (!event.accepted) return reject(event.reason);
      if (shotMeta) event.shotMeta = structuredClone(shotMeta);
      return routeCombat(run, event, reviewResult === true);
    },
    useConsumable(key) {
      if (state.screen !== 'battle') return reject('invalid-state');
      if (state.shotReview) return reject('reviewing');
      if (state.enemyResponse) return reject('responding');
      const run = structuredClone(state.run);
      const event = engine.useConsumable(run, key, { rng, isAiming: state.aim.phase !== 'idle' });
      if (!event.accepted) return reject(event.reason);
      return routeCombat(run, event);
    },
    selectReward(category, choiceId, mergeDuplicate) {
      if (state.screen !== 'reward' || (state.fusion && mergeDuplicate === undefined)) return reject('invalid-state');
      const run = structuredClone(state.run);
      const event = engine.applyRewardChoice(run, category, choiceId, { mergeDuplicate });
      if (event.reason === 'fusion-decision-required') {
        publish({ fusion: { ...event.fusionCandidate, source: 'reward', category, choiceId } });
        return event;
      }
      if (!event.accepted) return reject(event.reason);
      publish({ run, fusion: null, notification: null });
      return event;
    },
    continueAfterReward() {
      if (state.screen !== 'reward' || state.fusion) return reject('invalid-state');
      const run = structuredClone(state.run);
      const event = engine.advanceRound(run, { rng, now: now() });
      if (!event.accepted) return reject(event.reason);
      if (!event.pendingCamp && !run.terminal) assignLayoutSeed(run);
      publish({ run, screen: event.pendingCamp ? 'camp' : run.terminal === 'clear' ? 'main-results' : 'battle',
        outcome: run.terminal === 'clear' ? 'clear' : null,
        summary: run.terminal === 'clear' ? engine.getRunSummary(run, now()) : null,
        aim: initialAim(), lastEvent: null, notification: null });
      return event;
    },
    chooseCampReward(choice, mergeDuplicate) {
      if (state.screen !== 'camp' || (state.fusion && mergeDuplicate === undefined)) return reject('invalid-state');
      const run = structuredClone(state.run);
      const event = engine.chooseCampReward(run, choice, { rng, now: now(), mergeDuplicate });
      if (!event.accepted) return reject(event.reason);
      if (!event.pendingCamp) assignLayoutSeed(run);
      const reveal = !event.pendingCamp && choice === 'weapon'
        ? { items: structuredClone(event.effect.weapons), area: run.area } : null;
      publish({ run, fusion: event.requiresFusionChoice ? { ...event.fusionCandidate, source: 'camp' } : null,
        screen: event.pendingCamp ? 'camp' : reveal ? 'camp-reward' : 'battle',
        campRewardReveal: reveal, aim: initialAim(), lastEvent: null, enemyResponse: null });
      return event;
    },
    continueAfterCampReward() {
      if (state.screen !== 'camp-reward' || !state.campRewardReveal) return reject('invalid-state');
      publish({ screen: 'battle', campRewardReveal: null, notification: null });
      return { accepted: true };
    },
    resolveFusion(mergeDuplicate) {
      const fusion = state.fusion;
      if (!fusion || typeof mergeDuplicate !== 'boolean') return reject('invalid-state');
      return fusion.source === 'camp' ? actions.chooseCampReward('weapon', mergeDuplicate)
        : actions.selectReward(fusion.category, fusion.choiceId, mergeDuplicate);
    },
    enterBonusRoute() {
      if (state.screen !== 'main-results' || state.outcome !== 'clear') return reject('invalid-state');
      const run = structuredClone(state.run);
      const event = engine.startBonusRoute(run, { rng, now: now() });
      if (!event.accepted) return reject(event.reason);
      assignLayoutSeed(run);
      publish({ run, screen: 'battle', outcome: null, summary: null, aim: initialAim(), lastEvent: null });
      return event;
    },
    openLeaderboard() {
      if (!['home', 'main-results'].includes(state.screen)) return reject('invalid-state');
      publish({ screen: 'leaderboard', leaderboardReturnScreen: state.screen, notification: null });
      return { accepted: true };
    },
    closeLeaderboard() {
      if (state.screen !== 'leaderboard') return reject('invalid-state');
      publish({ screen: state.leaderboardReturnScreen === 'main-results' ? 'main-results' : 'home',
        leaderboardReturnScreen: null, notification: null });
      return { accepted: true };
    },
    dismissNotification() { publish({ notification: null }); }
  };
  return { getSnapshot: () => state, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }, actions };
}
