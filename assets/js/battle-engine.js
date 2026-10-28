(function attachBattleEngine(root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (root) root.BattleEngine = engine;
})(typeof globalThis === 'object' ? globalThis : this, function createBattleEngine() {
  'use strict';

  const AREAS = Object.freeze(['forest', 'snow', 'city', 'chaos']);
  const MAIN_REGION_ROUND_COUNT = 3;
  const GRADE_MULTIPLIER = Object.freeze({ C: 1, B: 2, A: 4 });
  const DAMAGE_WEIGHTS = Object.freeze([0.02, 0.40, 0.40, 0.10, 0.08]);
  const GRADE_DAMAGE = Object.freeze({ C: Object.freeze([0, 1, 2, 3, 4]),
    B: Object.freeze([1, 2, 3, 5, 6]), A: Object.freeze([2, 4, 6, 8, 10]) });
  const AREA_BOSSES = Object.freeze({
    forest: { id: 'pointy-boar', kind: 'pointy-boar', hp: 10, special: 'boar-charge' },
    snow: { id: 'cowardly-snowman', kind: 'cowardly-snowman', hp: 12, special: 'frozen-breath' },
    city: { id: 'oven-robot', kind: 'oven-robot', hp: 15, special: 'oven-overheat' }
  });
  const REGULAR_COUNTS = Object.freeze({
    forest: Object.freeze([1, 2, 2, 3]),
    snow: Object.freeze([5, 6, 6, 7]),
    city: Object.freeze([9, 10, 10, 11])
  });
  const WEAPON_CATALOG = Object.freeze([
    { id:'adventurer-candy',name:'모험가의 마법사탕',grade:'C',effect:'세 번째 영구 무기 명중마다 점수 +10' },
    { id:'alchemist-candy',name:'연금술사의 마법사탕',grade:'C',effect:'소모품 사용마다 점수 +10' },
    { id:'wizard-orb',name:'마력 구슬',grade:'C',effect:'세 번째 명중 피해 +1' },
    { id:'milk-candy',name:'우유맛 마법사탕',grade:'C',effect:'세 번째 명중마다 체력 회복',requiresSnowClear:true },
    { id:'wind-candy',name:'바람궁수 마법사탕',grade:'C',effect:'라운드당 유도 사격',requiresSnowClear:true }
  ]);
  const CONSUMABLE_CATALOG = Object.freeze([
    { id:'fireball',name:'불공',description:'다음 영구 무기 피해 2배' },
    { id:'spear',name:'창',description:'다음 사탕으로 실제 닿은 적 최대 3마리 관통' },
    { id:'defense',name:'방어',description:'다음 적 공격 차단' },
    { id:'heal',name:'회복',description:'체력 25 회복' }
  ]);
  const CHARACTER_WEAPONS = Object.freeze({
    adventurer: 'adventurer-candy', alchemist: 'alchemist-candy', wizard: 'wizard-orb',
    milk: 'milk-candy', wind: 'wind-candy'
  });

  function timestamp(value) { return Number.isFinite(value) ? value : Date.now(); }
  function hasEffect(state, id) { return state.weapons.some(weapon => weapon.id === id); }
  function activeScore(state) { return state.area === 'chaos' ? state.bonusScore : state.score; }
  function addScore(state, points) {
    if (state.area === 'chaos') state.bonusScore += points;
    else state.score += points;
  }
  function createInventory(config, rng) {
    const inventory = { fireball: 0, spear: 0, defense: 0, heal: 0 };
    if (config === undefined) inventory[CONSUMABLE_CATALOG[randomInt(rng, 0, 3)].id] = 1;
    else for (const key of Object.keys(inventory)) {
      inventory[key] = Math.max(0, Math.min(3, Math.floor(Number(config && config[key]) || 0)));
    }
    return inventory;
  }

  function roundAmmoCapacity(weapons) {
    return 9 + Math.max(0, weapons.length - 1);
  }
  function createBoss(boss, area, bonus) {
    const hp = bonus ? Math.ceil(boss.hp * 1.5) : boss.hp;
    return {
      id: `${area}-${boss.id}`, kind: boss.kind, hp,
      maxHp: boss.kind === 'oven-robot' ? (bonus ? 26 : 18) : hp,
      isBoss: true, attackCount: 0, alive: true
    };
  }

  function assertArea(area) {
    if (!AREAS.includes(area)) throw new RangeError(`Unknown area: ${area}`);
  }

  function randomInt(rng, min, max) {
    const sample = Math.max(0, Math.min(0.999999999999, Number(rng())));
    return min + Math.floor(sample * (max - min + 1));
  }

  function createRoundEnemies(area, round, options) {
    assertArea(area);
    const rng = options && typeof options.rng === 'function' ? options.rng : Math.random;
    if (area === 'chaos' && (!Number.isInteger(round) || round < 1 || round > 3)) {
      throw new RangeError('Chaos round must be 1, 2, or 3');
    }
    if (area !== 'chaos' && (!Number.isInteger(round) || round < 1 || round > MAIN_REGION_ROUND_COUNT)) {
      throw new RangeError(`Main region round must be 1, 2, or ${MAIN_REGION_ROUND_COUNT}`);
    }
    const roundNumber = round;
    if (area === 'chaos' && roundNumber === 3) {
      return [{ id: 'chaos-fused-boss', kind: 'chaos-fused-boss', hp: 56, maxHp: 56,
        isBoss: true, attackCount: 0, normalAttackCount: 0, alive: true }];
    }
    if (roundNumber === MAIN_REGION_ROUND_COUNT && AREA_BOSSES[area]) {
      return [createBoss(AREA_BOSSES[area], area, false)];
    }

    const count = area === 'chaos'
      ? randomInt(rng, 9, 13)
      : REGULAR_COUNTS[area][Math.min(roundNumber - 1, 3)];
    const kinds = area === 'forest'
      ? ['snake', ...Array.from({ length: Math.max(0, count - 1) }, () => 'boar')]
      : area === 'snow'
        ? ['dry-ice', ...Array.from({ length: Math.max(0, count - 1) }, () => 'snowball')]
        : area === 'city'
          ? Array.from({ length: count }, () => 'washing-robot')
          : Array.from({ length: count }, () => ['snake', 'boar', 'dry-ice', 'snowball', 'washing-robot'][randomInt(rng, 0, 4)]);
    return kinds.map((kind, index) => ({
      id: `${area}-r${roundNumber}-${kind}-${index + 1}`,
      kind,
      hp: 4,
      maxHp: 4,
      isBoss: false,
      attackCount: 0,
      alive: true
    }));
  }

  function createRunState(options) {
    const config = options || {};
    const area = config.area || 'forest';
    const round = Math.max(1, Math.floor(Number(config.round) || 1));
    assertArea(area);
    const rng = typeof config.rng === 'function' ? config.rng : Math.random;
    const characterId = config.characterId || 'adventurer';
    if (!Object.prototype.hasOwnProperty.call(CHARACTER_WEAPONS, characterId)) throw new RangeError(`Unknown character: ${characterId}`);
    const starter = WEAPON_CATALOG.find(weapon => weapon.id === CHARACTER_WEAPONS[characterId]);
    const initialWeapons = config.weapons || [starter];
    const maxAmmo = roundAmmoCapacity(initialWeapons);
    const state = {
      area,
      round,
      characterId,
      playerHp: Math.max(0, Math.min(100, Number.isFinite(config.playerHp) ? config.playerHp : 100)),
      maxPlayerHp: 100,
      ammo: Math.max(0, Math.min(maxAmmo, Number.isFinite(config.ammo) ? config.ammo : maxAmmo)),
      maxAmmo,
      score: Math.max(0, Number(config.score) || 0),
      bonusScore: 0,
      bonusMode: area === 'chaos',
      mainRunSummary: null,
      snowAreaCleared: false,
      snowRewardsUnlocked: config.snowRewardsUnlocked === true,
      effectCounters: { permanentWeaponHits: 0, projectileCollisions: 0, consumablesUsed: 0 },
      roundEffects: { windHomingUsed: false, milkBossBlockUsed: false },
      zeroRollsThisRound: 0,
      enemyTurnIndex: 0,
      turnNumber: 0,
      terminal: null,
      enemies: createRoundEnemies(area, round, { rng: config.rng }),
      chaosBossPhase: area === 'chaos' && round === 3 ? 'fused' : null,
      consumablesBlockedTurns: 0,
      consumablesBlocked: false,
      consumableUsedSinceShot: false,
      inventory: createInventory(config.inventory, rng),
      weapons: initialWeapons.map((weapon,index)=>Object.assign({instanceId:'weapon-'+(index+1),ammoType:'magic-candy'},weapon)),
      weaponQueue: [], currentWeaponId:null, rewardChoices:null, selectedRewards:{weapon:null,consumable:null},
      furthestArea:area, playStartedAt:timestamp(config.now), roundStartedAt:timestamp(config.now), pendingCamp:false,
      pendingCampReward: null,
      defenseArmed: false,
      fireballArmed: false,
      spearArmed: false,
      nextAttackDamageMultiplier: null,
      pendingAimInversion: false,
      toppledObstacleIds: [], forestLogDebris: [], obstacleDebris: []
    };
    refillWeaponQueue(state,config.rng);
    return state;
  }

  function shuffle(items,rng) {
    const result=items.slice();
    for(let i=result.length-1;i>0;i-=1){const j=randomInt(rng,0,i);[result[i],result[j]]=[result[j],result[i]];}
    return result;
  }
  function refillWeaponQueue(state,rng) {
    state.weaponQueue=shuffle(state.weapons.map(weapon=>weapon.instanceId),typeof rng==='function'?rng:Math.random);
    state.currentWeaponId=state.weaponQueue[0]||null;
  }
  function getCurrentWeapon(state) { return state&&state.weapons.find(weapon=>weapon.instanceId===state.currentWeaponId)||state&&state.weapons[0]||null; }
  function fusionWeapon(state, source, grade) {
    return grade === 'A' ? null : state.weapons.find(item => item.id === source.id && item.grade === grade);
  }
  function grantWeapon(state, source, grade, options) {
    if (!availableRewardWeapons(state).some(weapon => weapon.id === source.id)) return { accepted: false, reason: 'candy-locked' };
    const requestedGrade = grade || source.grade || 'C';
    if (!Object.prototype.hasOwnProperty.call(GRADE_MULTIPLIER, requestedGrade)) throw new RangeError(`Unknown weapon grade: ${requestedGrade}`);
    const match = fusionWeapon(state, source, requestedGrade);
    const mergeDuplicate = options && options.mergeDuplicate;
    if (match && typeof mergeDuplicate !== 'boolean') {
      return { accepted: false, reason: 'fusion-decision-required', fusionCandidate: {
        instanceId: match.instanceId, weaponId: match.id, name: match.name,
        grade: match.grade, targetGrade: match.grade === 'C' ? 'B' : 'A'
      } };
    }
    if (match && mergeDuplicate) {
      match.grade = requestedGrade === 'C' ? 'B' : 'A';
      return { accepted: true, weapon: match, fused: true };
    }
    let index = state.weapons.length + 1;
    while (state.weapons.some(item => item.instanceId === 'weapon-' + index)) index++;
    const weapon = Object.assign({}, source, { grade: requestedGrade, instanceId: 'weapon-' + index, ammoType: 'magic-candy' });
    delete weapon.choiceId;
    state.weapons.push(weapon);
    return { accepted: true, weapon, fused: false };
  }

  function rollWeaponDamage(rng, grade, zeroRollsThisRound) {
    if (typeof rng !== 'function') throw new TypeError('rng must be a function');
    const normalizedGrade = String(grade || 'C').toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(GRADE_MULTIPLIER, normalizedGrade)) throw new RangeError(`Unknown weapon grade: ${grade}`);
    const sample = Math.max(0, Math.min(0.999999999999, Number(rng())));
    let cumulative = 0;
    let bucket = 4;
    for (let index = 0; index < DAMAGE_WEIGHTS.length; index += 1) {
      cumulative += DAMAGE_WEIGHTS[index];
      if (sample < cumulative) { bucket = index; break; }
    }
    if (normalizedGrade === 'C' && bucket === 0 && zeroRollsThisRound >= 2) return 1;
    return GRADE_DAMAGE[normalizedGrade][bucket];
  }

  function availableRewardWeapons(state) {
    return WEAPON_CATALOG.filter(weapon => !weapon.requiresSnowClear
      || state.snowRewardsUnlocked === true || state.snowAreaCleared === true);
  }
  function drawRewardChoices(state,rng) {
    if(!state||state.terminal!=='round-clear'||state.area==='chaos')return null;
    const sourceRng=typeof rng==='function'?rng:Math.random;
    const weapons=shuffle(availableRewardWeapons(state),sourceRng).slice(0,3).map(item=>Object.assign({},item,{choiceId:'weapon:'+item.id}));
    const consumables=shuffle(CONSUMABLE_CATALOG.filter(item=>getConsumableCount(state,item.id)<3),sourceRng).slice(0,3).map(item=>Object.assign({},item,{choiceId:'consumable:'+item.id}));
    state.rewardChoices={weapons,consumables};
    state.selectedRewards={weapon:null,consumable:consumables.length?null:'skip'};
    return state.rewardChoices;
  }

  // Endpoints of the same monotone roll rule used by combat; no random source is consumed.
  function getWeaponDamageRange(grade, zeroRollsThisRound) {
    return { min: rollWeaponDamage(() => 0, grade, zeroRollsThisRound),
      max: rollWeaponDamage(() => .999999999999, grade, zeroRollsThisRound) };
  }
  function applyRewardChoice(state,category,choiceId,options) {
    if(!state||state.area==='chaos'||state.terminal!=='round-clear'||!state.rewardChoices)return {accepted:false,reason:'no-reward'};
    if(!['weapon','consumable'].includes(category)||state.selectedRewards[category])return {accepted:false,reason:'already-selected'};
    const choices=category==='weapon'?state.rewardChoices.weapons:state.rewardChoices.consumables;
    const choice=choices.find(item=>item.choiceId===choiceId);
    if(!choice)return {accepted:false,reason:'invalid-choice'};
    if(category==='weapon'){
      const granted=grantWeapon(state,choice,choice.grade,options);
      if (!granted.accepted) return granted;
      choice.fused=granted.fused;
    }else if(addConsumable(state,choice.id,1)!==1)return {accepted:false,reason:'inventory-full'};
    state.selectedRewards[category]=choiceId;
    return {accepted:true,choice};
  }
  function getRunSummary(state,now) {
    const unused = Object.values(state.inventory).reduce((total,count)=>total+Math.max(0,Number(count)||0),0);
    const main = state.mainRunSummary;
    return {
      score: state.score, bonusScore: state.bonusScore,
      finalScore: main ? main.finalScore : state.score + unused,
      unusedConsumablePoints: main ? main.unusedConsumablePoints : unused,
      playerHp: state.playerHp, ammo: state.ammo, area: state.area, round: state.round,
      furthestArea: state.furthestArea, snowAreaCleared: state.snowAreaCleared,
      durationMs: Math.max(0, timestamp(now) - state.playStartedAt)
    };
  }
  function enterRound(state,options) {
    const config=options||{};
    state.maxAmmo=roundAmmoCapacity(state.weapons);state.ammo=state.maxAmmo;state.zeroRollsThisRound=0;state.enemyTurnIndex=0;state.terminal=null;state.pendingCamp=false;
    state.roundStartedAt=timestamp(config.now);state.enemies=createRoundEnemies(state.area,state.round,{rng:config.rng});
    state.chaosBossPhase = state.area === 'chaos' && state.round === 3 ? 'fused' : null;
    state.roundEffects={windHomingUsed:false,milkBossBlockUsed:false};
    state.toppledObstacleIds=[];state.forestLogDebris=[];state.obstacleDebris=[];
    if (state.studioPrototype === 'forest-elevated-v1') state.enemyLandingPositions = {};
    state.consumablesBlocked=false;state.consumablesBlockedTurns=0;state.pendingCampReward=null;
    state.consumableUsedSinceShot=false;
    state.spearArmed=false;
    state.rewardChoices=null;state.selectedRewards={weapon:null,consumable:null};
    if(AREAS.indexOf(state.area)>AREAS.indexOf(state.furthestArea))state.furthestArea=state.area;
    refillWeaponQueue(state,config.rng);
  }
  function advanceRound(state,options) {
    if(!state||state.terminal!=='round-clear')return {accepted:false,reason:'round-not-cleared'};
    if (state.area === 'chaos') {
      if (state.round < 1 || state.round > 3) return {accepted:false,reason:'invalid-round'};
      if (state.round === 3) { state.terminal='bonus-clear'; return {accepted:true,terminal:'bonus-clear',summary:getRunSummary(state,options&&options.now)}; }
      state.round++;enterRound(state,options);return {accepted:true,area:state.area,round:state.round};
    }
    if (!Number.isInteger(state.round) || state.round < 1 || state.round > MAIN_REGION_ROUND_COUNT) {
      return {accepted:false,reason:'invalid-round'};
    }
    if(!state.selectedRewards.weapon||!state.selectedRewards.consumable)return {accepted:false,reason:'rewards-incomplete'};
    if(state.area==='city'&&state.round===MAIN_REGION_ROUND_COUNT){
      state.terminal='clear';
      state.mainRunSummary=Object.freeze(getRunSummary(state,options&&options.now));
      return {accepted:true,terminal:'clear',summary:state.mainRunSummary};
    }
    if(state.round===MAIN_REGION_ROUND_COUNT){state.pendingCamp=true;return {accepted:true,pendingCamp:true};}
    state.round+=1;enterRound(state,options);return {accepted:true,area:state.area,round:state.round};
  }
  function chooseCampReward(state,choice,options) {
    if(!state||!state.pendingCamp)return {accepted:false,reason:'camp-not-ready'};
    const config=options||{};let effect;
    if (state.pendingCampReward && choice !== 'weapon') return {accepted:false,reason:'camp-choice-locked'};
    if(choice==='heal'){const before=state.playerHp;state.playerHp=Math.min(state.maxPlayerHp,state.playerHp+60);effect={healed:state.playerHp-before};}
    else if(choice==='weapon'){
      const rng=typeof config.rng==='function'?config.rng:Math.random;
      if (!state.pendingCampReward) {
        const grade=randomInt(rng,0,9)===0?'B':'C',count=grade==='B'?1:2;
        state.pendingCampReward={grade,items:Array.from({length:count},()=>({...shuffle(availableRewardWeapons(state),rng)[0],grade})),index:0,grants:[]};
      }
      const pending=state.pendingCampReward;
      let mergeDuplicate=config.mergeDuplicate;
      while (pending.index < pending.items.length) {
        const item=pending.items[pending.index];
        const duplicate=fusionWeapon(state,item,item.grade);
        const result=grantWeapon(state,item,item.grade,{mergeDuplicate});
        if (!result.accepted && result.reason !== 'fusion-decision-required') return result;
        if (!result.accepted) return {accepted:true,pendingCamp:true,requiresFusionChoice:true,fusionCandidate:result.fusionCandidate};
        pending.grants.push({weaponId:result.weapon.id,instanceId:result.weapon.instanceId,
          name:result.weapon.name,grade:result.weapon.grade,effect:result.weapon.effect || item.effect,fused:result.fused});
        pending.index++;
        if (duplicate) mergeDuplicate=undefined;
      }
      effect={weapons:pending.grants.map(grant=>({...grant,
        grade:state.weapons.find(weapon=>weapon.instanceId===grant.instanceId)?.grade || grant.grade})),grade:pending.grade};
    }
    else return {accepted:false,reason:'invalid-choice'};
    state.area=state.area==='forest'?'snow':'city';state.round=1;enterRound(state,config);
    return {accepted:true,effect,area:state.area,round:state.round};
  }
  function startBonusRoute(state, options) {
    if (!state || state.terminal !== 'clear' || state.area !== 'city'
      || state.round !== MAIN_REGION_ROUND_COUNT || state.bonusMode) {
      return {accepted:false,reason:'bonus-not-ready'};
    }
    const config=options||{};
    if (!state.mainRunSummary) state.mainRunSummary=Object.freeze(getRunSummary(state,config.now));
    state.area='chaos';state.round=1;state.bonusMode=true;state.bonusScore=0;
    enterRound(state,config);
    return {accepted:true,area:'chaos',round:1};
  }
  function skipConsumableReward(state) {
    if(!state||!state.rewardChoices||state.selectedRewards.consumable)return false;
    state.selectedRewards.consumable='skip';return true;
  }

  function getLivingEnemies(state) {
    return state.enemies.filter(enemy => enemy.alive && enemy.hp > 0);
  }

  function isRunDefeated(state) {
    return state.terminal === 'defeat' || state.playerHp <= 0 || (state.ammo <= 0 && getLivingEnemies(state).length > 0);
  }

  function isRoundCleared(state) {
    return state.terminal === 'round-clear' || getLivingEnemies(state).length === 0;
  }

  function markRoundClear(state) {
    if (state.area === 'snow' && state.round === MAIN_REGION_ROUND_COUNT) state.snowAreaCleared = true;
    state.terminal = state.area === 'chaos' && state.round === 3 ? 'bonus-clear' : 'round-clear';
  }

  function finishAction(state, event, rng, enemyResponds = true) {
    if (!getLivingEnemies(state).length) {
      markRoundClear(state);
      event.roundCleared = true;
      event.bonusCleared = state.terminal === 'bonus-clear';
    } else if (state.ammo <= 0 || state.playerHp <= 0) {
      state.terminal = 'defeat';
    } else if (enemyResponds) {
      const fused = state.enemies.find(enemy => enemy.kind === 'chaos-fused-boss' && enemy.alive && enemy.hp > 0);
      if (state.area === 'chaos' && state.round === 3 && state.chaosBossPhase === 'fused'
        && fused && fused.hp <= fused.maxHp / 2) {
        const fromEnemy = { ...fused };
        const bosses = Object.values(AREA_BOSSES).map(boss => createBoss(boss, 'chaos', true));
        const weights = bosses.map(enemy => enemy.hp), total = weights.reduce((sum, hp) => sum + hp, 0);
        const shares = weights.map((hp, index) => ({ index, exact: fused.hp * hp / total }));
        for (const share of shares) bosses[share.index].hp = Math.floor(share.exact);
        const remainder = fused.hp - bosses.reduce((sum, enemy) => sum + enemy.hp, 0);
        shares.sort((a, b) => (b.exact % 1) - (a.exact % 1) || a.index - b.index);
        for (let i = 0; i < remainder; i++) bosses[shares[i].index].hp++;
        bosses.forEach(enemy => { enemy.alive = enemy.hp > 0; });
        const previousScenery = { toppledObstacleIds: state.toppledObstacleIds.slice(),
          forestLogDebris: state.forestLogDebris.slice(), obstacleDebris: state.obstacleDebris.slice() };
        state.enemies = bosses;
        state.chaosBossPhase = 'split';
        state.enemyTurnIndex = 0;
        state.toppledObstacleIds = []; state.forestLogDebris = []; state.obstacleDebris = [];
        const shock = applyIncomingDamage(state, { enemyId: fused.id, kind: fused.kind,
          special: null, attemptedSpecial: null, landing: true }, rng, 1, 3);
        event.bossSplit = { fromEnemy, remainingHp: fused.hp, bosses: bosses.map(enemy => ({ ...enemy })), shock, previousScenery };
        if (state.playerHp <= 0) state.terminal = 'defeat';
      } else event.enemyAttack = resolveEnemyTurn(state, rng);
    }
    event.snowAreaCleared = state.snowAreaCleared;
    event.runDefeated = state.terminal === 'defeat';
    return event;
  }

  function resolveEnemyTurn(state, rng) {
    if (state.terminal || state.playerHp <= 0) return null;
    const living = getLivingEnemies(state);
    if (!living.length) {
      markRoundClear(state);
      return null;
    }
    const size = state.enemies.length;
    let index = state.enemyTurnIndex % Math.max(1, size);
    while (!state.enemies[index] || !state.enemies[index].alive || state.enemies[index].hp <= 0) index = (index + 1) % size;
    const enemy = state.enemies[index];
    state.enemyTurnIndex = (index + 1) % size;
    state.turnNumber += 1;

    const sourceRng = typeof rng === 'function' ? rng : Math.random;
    let special = null, attackKind = enemy.kind;
    let minDamage = enemy.isBoss ? 3 : 1;
    let maxDamage = enemy.isBoss ? 15 : 8;
    if (enemy.isBoss) {
      enemy.attackCount += 1;
      const definitions = Object.values(AREA_BOSSES);
      if (enemy.kind === 'chaos-fused-boss') {
        if (enemy.attackCount % 3 === 0) {
          const boss = definitions[randomInt(sourceRng, 0, 2)];
          special = boss.special; attackKind = boss.kind;
        } else {
          attackKind = definitions[(enemy.normalAttackCount || 0) % 3].kind;
          enemy.normalAttackCount = (enemy.normalAttackCount || 0) + 1;
        }
      } else {
        const boss = definitions.find(definition => definition.kind === enemy.kind);
        if (boss && enemy.attackCount % 3 === 0) special = boss.special;
      }
    }
    if (special === 'boar-charge') { minDamage = 8; maxDamage = 15; }
    const throwing = ['snake', 'dry-ice', 'snowball', 'washing-robot', 'cowardly-snowman', 'oven-robot'].includes(attackKind);
    if (!special && throwing) {
      const sample = Math.max(0, Math.min(.999999999999, Number(sourceRng())));
      const threshold = enemy.isBoss ? .95 : .9;
      if (sample >= threshold) return {
        enemyId: enemy.id, kind: enemy.kind, attackKind, damage: 0, special: null, attemptedSpecial: null,
        playerHpBefore: state.playerHp, playerHpAfter: state.playerHp, blocked: false, blockedBy: null,
        healedEnemy: 0, ammoLost: 0, consumablesBlocked: false, missed: true,
        missStyle: sample < (enemy.isBoss ? .975 : .95) ? 'slip' : 'overshoot'
      };
    }
    const event = applyIncomingDamage(state, { enemyId: enemy.id, kind: enemy.kind, attackKind,
      special, attemptedSpecial: special }, sourceRng, minDamage, maxDamage, enemy.isBoss);
    if (!event.blocked && special === 'frozen-breath') {
      state.consumablesBlockedTurns = 1;
      state.consumablesBlocked = true;
      event.consumablesBlocked = true;
    } else if (!event.blocked && special === 'oven-overheat') {
      const previousAmmo = state.ammo;
      state.ammo = Math.max(0, state.ammo - 1);
      event.ammoLost = previousAmmo - state.ammo;
      const previousHp = enemy.hp;
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + 3);
      event.healedEnemy = enemy.hp - previousHp;
    }
    if (state.playerHp <= 0 || (state.ammo <= 0 && getLivingEnemies(state).length > 0)) state.terminal = 'defeat';
    return event;
  }

  // Both counterattacks and the single landing shock consume the same protection.
  function applyIncomingDamage(state, attack, rng, minDamage, maxDamage, isBoss = true) {
    let blockedBy = state.defenseArmed ? 'defense' : null;
    if (!blockedBy && isBoss && hasEffect(state, 'milk-candy') && !state.roundEffects.milkBossBlockUsed) {
      blockedBy = 'milk';
      state.roundEffects.milkBossBlockUsed = true;
    }
    const blocked = blockedBy !== null;
    state.defenseArmed = false;
    const damageMultiplier = state.nextAttackDamageMultiplier === null ? 1 : state.nextAttackDamageMultiplier;
    state.nextAttackDamageMultiplier = null;
    const rawDamage = blocked ? 0 : randomInt(typeof rng === 'function' ? rng : Math.random, minDamage, maxDamage);
    const damage = blocked ? 0 : Math.floor(rawDamage * damageMultiplier);
    const playerHpBefore = state.playerHp;
    state.playerHp = Math.max(0, state.playerHp - damage);
    const event = { ...attack, damage, special: blocked ? null : attack.special,
      playerHpBefore, playerHpAfter: state.playerHp,
      blocked, blockedBy, healedEnemy: 0, ammoLost: 0, consumablesBlocked: false, missed: false, missStyle: null };
    if (damageMultiplier < 1) event.damageReduction = 1 - damageMultiplier;

    return event;
  }

  function resolveProjectile(state, options) {
    const config = options || {};
    if (!state) return {accepted:false,reason:'combat-ended',hits:[],enemyAttack:null};
    if (state.terminal) return { accepted: false, reason: 'combat-ended', hits: [], enemyAttack: null, roundCleared: isRoundCleared(state), runDefeated: isRunDefeated(state) };
    if (state.playerHp <= 0) {
      state.terminal = 'defeat';
      return {accepted:false,reason:'combat-ended',hits:[],enemyAttack:null,roundCleared:false,runDefeated:true};
    }
    if (state.ammo <= 0) {
      state.terminal = 'defeat';
      return { accepted: false, reason: 'no-ammo', hits: [], enemyAttack: null, roundCleared: false, runDefeated: true };
    }
    const scoreBefore = activeScore(state);
    const spear = state.spearArmed === true;
    const permanent = config.source !== 'spear' && !spear;
    state.consumableUsedSinceShot = false;
    state.ammo = Math.max(0, state.ammo - 1);
    if(!state.weaponQueue.length)refillWeaponQueue(state,config.rng);
    const usedWeaponId=state.weaponQueue.shift();
    const usedWeapon=state.weapons.find(weapon=>weapon.instanceId===usedWeaponId);
    const grade=config.weaponGrade||(usedWeapon&&usedWeapon.grade)||'C';
    state.currentWeaponId=state.weaponQueue[0]||null;
    if(!state.weaponQueue.length)refillWeaponQueue(state,config.rng);
    state.turnNumber += 1;
    const rolledDamage = config.damage === undefined
      ? spear ? randomInt(typeof config.rng === 'function' ? config.rng : Math.random, 2, 5)
        : rollWeaponDamage(typeof config.rng === 'function' ? config.rng : Math.random, grade, state.zeroRollsThisRound)
      : Math.max(0, Math.floor(Number(config.damage) || 0));
    // Explicit damage is a legacy/captured-roll override; its caller owns its zero-roll accounting.
    if (!spear && config.damage === undefined && rolledDamage === 0) state.zeroRollsThisRound++;
    const fiery = state.fireballArmed === true;
    const damageMultiplier = fiery ? 2 : 1;
    let damage = rolledDamage * damageMultiplier;
    state.fireballArmed = false;
    state.spearArmed = false;
    state.consumablesBlocked = false;
    state.consumablesBlockedTurns = 0;
    const hits = [];
    const seen = new Set();
    const hitIds = Array.isArray(config.hitIds) ? config.hitIds.slice() : [];
    let homingTarget = null;
    if (permanent && hasEffect(state, 'wind-candy') && !state.roundEffects.windHomingUsed) {
      homingTarget = state.enemies.find(enemy => enemy.id === config.selectedTargetId && enemy.alive && enemy.hp > 0) || null;
      if (homingTarget) {
        hitIds.unshift(homingTarget.id);
        state.roundEffects.windHomingUsed = true;
      }
    }
    let healedPlayer = 0;
    // Apply the physical limit after Wind has selected its actual target too.
    if (config.shotMeta && !spear) hitIds.splice(1);
    let bonusDamage = 0;
    const shotMeta = config.shotMeta;
    const riderFalls = state.studioPrototype === 'forest-elevated-v1'
      && Array.isArray(shotMeta?.riderFalls) ? shotMeta.riderFalls : [];
    const hasContactStream = Array.isArray(shotMeta?.contacts);
    const contacts = hasContactStream ? shotMeta.contacts
      : shotMeta?.impactKind === 'obstacle' && shotMeta.obstacleKind
        ? [{ obstacleId: shotMeta.obstacleId, obstacleKind: shotMeta.obstacleKind,
          obstacleTargetIds: shotMeta.obstacleTargetIds || [] }] : [];
    const toppled = state.toppledObstacleIds || (state.toppledObstacleIds = []);
    let directHitCount = 0;
    const applySpearHit = (id, index) => {
      if (index >= 3 || seen.has(id)) return;
      seen.add(id);
      const enemy = state.enemies.find(candidate => candidate.id === id && candidate.alive && candidate.hp > 0);
      if (!enemy) return;
      const removed = Math.min(enemy.hp, Math.max(0, rolledDamage - index) * damageMultiplier);
      enemy.hp -= removed; enemy.alive = enemy.hp > 0;
      addScore(state, removed);
      hits.push({ id: enemy.id, kind: enemy.kind, damage: removed, remainingHp: enemy.hp, defeated: !enemy.alive, scoreDelta: removed });
      directHitCount++;
    };
    const applyDirectHits = () => {
      if (spear) { [...new Set(hitIds)].slice(0, 3).forEach(applySpearHit); return; }
      for (const id of hitIds) {
        if (directHitCount > 0 && damage <= 0) break;
        if (seen.has(id)) continue;
        seen.add(id);
        const enemy = state.enemies.find(candidate => candidate.id === id && candidate.alive && candidate.hp > 0);
        if (!enemy) continue;
        if (permanent) {
          state.effectCounters.projectileCollisions++;
          let extra = homingTarget === enemy && enemy.isBoss ? 1 : 0;
          if (state.effectCounters.projectileCollisions % 3 === 0) {
            if (hasEffect(state, 'wizard-orb')) extra++;
            if (hasEffect(state, 'milk-candy')) {
              const before = state.playerHp;
              state.playerHp = Math.min(state.maxPlayerHp, state.playerHp + 1);
              healedPlayer += state.playerHp - before;
            }
          }
          bonusDamage += extra * damageMultiplier;
          damage += extra * damageMultiplier;
        }
        const removed = Math.min(enemy.hp, damage);
        enemy.hp -= removed;
        enemy.alive = enemy.hp > 0;
        damage -= removed;
        const scoreDelta = removed * (GRADE_MULTIPLIER[String(grade).toUpperCase()] || 1);
        addScore(state, scoreDelta);
        hits.push({ id: enemy.id, kind: enemy.kind, damage: removed, remainingHp: enemy.hp,
          defeated: !enemy.alive, scoreDelta });
        directHitCount++;
        if (enemy.alive) break;
      }
    };
    const applyObstacle = contact => {
      const effectHits = [];
      const strike = () => {
        const targetIds = state.area === 'forest' ? (contact.logHit ? [contact.logHit.id] : []) : (contact.obstacleTargetIds || []);
        const target = targetIds.map(id => state.enemies.find(enemy =>
          enemy.id === id && enemy.alive && enemy.hp > 0)).find(Boolean);
        if (target) {
          const removed = Math.min(target.hp, 3);
          target.hp -= removed;
          target.alive = target.hp > 0;
          const scoreDelta = removed * (GRADE_MULTIPLIER[String(grade).toUpperCase()] || 1);
          addScore(state, scoreDelta);
          effectHits.push({ id: target.id, kind: target.kind, damage: removed,
            remainingHp: target.hp, defeated: !target.alive, scoreDelta });
        }
        return { kind: 'log-strike', hits: effectHits, ...(state.area === 'forest' ? { physical: true } : {}) };
      };
      const guard = () => {
        state.nextAttackDamageMultiplier = .5;
        return { kind: 'ice-guard', hits: [], damageReduction: .5, armed: true };
      };
      const burst = () => {
        for (const target of getLivingEnemies(state).slice()) {
          const removed = Math.min(target.hp, randomInt(typeof config.rng === 'function' ? config.rng : Math.random, 1, 2));
          target.hp -= removed;
          target.alive = target.hp > 0;
          const scoreDelta = removed * (GRADE_MULTIPLIER[String(grade).toUpperCase()] || 1);
          addScore(state, scoreDelta);
          effectHits.push({ id: target.id, kind: target.kind, damage: removed,
            remainingHp: target.hp, defeated: !target.alive, scoreDelta });
        }
        return { kind: 'jar-burst', hits: effectHits };
      };
      if (state.area === 'chaos') {
        const choice = randomInt(typeof config.rng === 'function' ? config.rng : Math.random, 0, 3);
        return choice === 3
          ? (state.pendingAimInversion = true, { kind: 'aim-inversion', hits: [], armed: true })
          : [strike, guard, burst][choice]();
      }
      const regional = ({ forest: contact.obstacleKind === 'log' && strike,
        snow: contact.obstacleKind === 'ice' && guard,
        city: contact.obstacleKind === 'crate' && burst })[state.area];
      return typeof regional === 'function' ? regional() : null;
    };
    // Consume a previously armed inversion before contacts; a new Chaos topple may arm the next shot.
    if (permanent && config.aimInversionApplied) state.pendingAimInversion = false;
    if (!hasContactStream) applyDirectHits();
    const obstacleEffects = [];
    const timeline = [];
    if (config.source !== 'spear') for (const contact of contacts) {
      let enabled = false, physicalEffect;
      timeline.push({ time: contact.time || 0, order: 0, apply() {
        if (!contact?.obstacleId || toppled.includes(contact.obstacleId)) return;
        toppled.push(contact.obstacleId); enabled = true;
        if (state.area === 'forest' && contact.obstacleKind === 'log') {
          physicalEffect = { kind: 'log-strike', physical: true, hits: [], obstacleId: contact.obstacleId };
          obstacleEffects.push(physicalEffect);
          const pose = contact.logEndPose;
          if (pose && [pose.x, pose.y, pose.angle].every(Number.isFinite)) {
            (state.forestLogDebris || (state.forestLogDebris = [])).push({ obstacleId: contact.obstacleId, ...pose });
          }
        } else {
          const pose = contact.obstacleEndPose;
          if (pose && [pose.x, pose.y, pose.angle].every(Number.isFinite)) {
            (state.obstacleDebris || (state.obstacleDebris = [])).push({ obstacleId: contact.obstacleId, ...pose });
          }
          const effect = applyObstacle(contact);
          if (effect) { obstacleEffects.push({ ...effect, obstacleId: contact.obstacleId }); hits.push(...effect.hits); }
        }
      } });
      if (state.area === 'forest' && contact.obstacleKind === 'log' && contact.logHit
        && Number.isFinite(contact.logHit.time)) timeline.push({ time: contact.logHit.time, order: 1, apply() {
        if (!enabled || !physicalEffect) return;
        const effect = applyObstacle(contact);
        physicalEffect.hits.push(...effect.hits); hits.push(...effect.hits);
      } });
      const fall = riderFalls.find(item => item.supportObstacleId === contact.obstacleId);
      if (fall) timeline.push({ time: fall.landingTime, order: 3, apply() {
        if (!enabled || !toppled.includes(fall.supportObstacleId)) return;
        const target = state.enemies.find(enemy => enemy.id === fall.enemyId && enemy.alive && enemy.hp > 0);
        if (!target) return;
        const removed = Math.min(target.hp, fall.fallDamage);
        target.hp -= removed;
        target.alive = target.hp > 0;
        const scoreDelta = removed * (GRADE_MULTIPLIER[String(grade).toUpperCase()] || 1);
        addScore(state, scoreDelta);
        hits.push({ id: target.id, kind: target.kind, source: 'rider-fall', damage: removed,
          remainingHp: target.hp, defeated: !target.alive, scoreDelta });
        if (target.alive) (state.enemyLandingPositions || (state.enemyLandingPositions = {}))[target.id]
          = { x: fall.landing.x, y: fall.landing.y };
      } });
    }
    if (hasContactStream) {
      if (spear && Array.isArray(shotMeta.enemyContacts)) {
        const geometricIds = new Set(hitIds);
        shotMeta.enemyContacts.slice(0, 3).forEach((contact, index) => {
          if (geometricIds.has(contact.id)) timeline.push({ time: contact.time, order: 2, apply: () => applySpearHit(contact.id, index) });
        });
      } else timeline.push({ time: Number.isFinite(shotMeta.directHitTime) ? shotMeta.directHitTime : Infinity,
        order: 2, apply: applyDirectHits });
    }
    timeline.sort((a, b) => a.time - b.time || a.order - b.order).forEach(action => action.apply());
    if (permanent && directHitCount) {
      state.effectCounters.permanentWeaponHits++;
      if (hasEffect(state, 'adventurer-candy') && state.effectCounters.permanentWeaponHits % 3 === 0) addScore(state, 10);
    }
    const event = {
      accepted: true, source: config.source || 'weapon', weaponId: usedWeaponId,
      modifier: spear ? 'spear' : fiery ? 'fireball' : null,
      damage: rolledDamage * damageMultiplier, bonusDamage, healedPlayer,
      homingTargetId: homingTarget && homingTarget.id, spillover: spear ? 0 : damage, hits,
      missed: hits.length === 0 && !obstacleEffects.some(effect =>
        ['ice-guard', 'aim-inversion'].includes(effect.kind)),
      scoreDelta: activeScore(state) - scoreBefore, enemyAttack: null,
      obstacleEffects, obstacleEffect: obstacleEffects.at(-1) || null,
      roundCleared: false, runDefeated: false
    };

    return finishAction(state, event, config.rng);
  }

  function getConsumableCount(state, key) {
    return state && state.inventory && Number(state.inventory[key]) || 0;
  }

  function addConsumable(state, key, count) {
    if (!state || !Object.prototype.hasOwnProperty.call(state.inventory, key)) return false;
    const amount = Math.max(0, Math.floor(Number(count) || 0));
    const added = Math.min(amount, 3 - getConsumableCount(state, key));
    state.inventory[key] += added;
    return added;
  }

  function useConsumable(state, key, options) {
    const config = options || {};
    const event = { accepted: false, key, effect: null, enemyAttack: null, hits: [], scoreDelta: 0, roundCleared: false, runDefeated: false };
    if (!state || state.terminal || isRunDefeated(state)) { event.reason = 'combat-ended'; return event; }
    if (!Object.prototype.hasOwnProperty.call(state.inventory, key)) { event.reason = 'unknown-item'; return event; }
    if (config.isAiming) { event.reason = 'aiming'; return event; }
    if (state.consumablesBlocked || state.consumablesBlockedTurns > 0) { event.reason = 'blocked'; return event; }
    if (getConsumableCount(state, key) <= 0) { event.reason = 'empty'; return event; }
    if (state.consumableUsedSinceShot) { event.reason = 'item-used'; return event; }

    const scoreBefore = activeScore(state);
    state.inventory[key] -= 1;
    state.consumableUsedSinceShot = true;
    state.effectCounters.consumablesUsed++;
    if (hasEffect(state, 'alchemist-candy')) addScore(state, 10);
    event.accepted = true;
    if (key === 'heal') {
      const before = state.playerHp;
      state.playerHp = Math.min(state.maxPlayerHp, state.playerHp + 25);
      event.effect = { healed: state.playerHp - before };
    } else if (key === 'defense') {
      state.defenseArmed = true;
      event.effect = { armed: true };
    } else if (key === 'fireball') {
      state.fireballArmed = true;
      event.effect = { armed: true };
    } else if (key === 'spear') {
      state.spearArmed = true;
      event.effect = { armed: true };
    }

    event.scoreDelta = activeScore(state) - scoreBefore;
    return finishAction(state, event, config.rng, false);
  }

  return Object.freeze({
    AREAS,
    GRADE_MULTIPLIER,
    AREA_BOSSES,
    WEAPON_CATALOG,
    CONSUMABLE_CATALOG,
    createRoundEnemies,
    createRunState,
    getCurrentWeapon,
    grantWeapon,
    drawRewardChoices,
    applyRewardChoice,
    advanceRound,
    chooseCampReward,
    startBonusRoute,
    getRunSummary,
    skipConsumableReward,
    rollWeaponDamage,
    getWeaponDamageRange,
    resolveProjectile,
    resolveEnemyTurn,
    getLivingEnemies,
    isRunDefeated,
    isRoundCleared,
    getConsumableCount,
    addConsumable,
    useConsumable
  });
});
