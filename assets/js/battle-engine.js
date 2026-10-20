(function attachBattleEngine(root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (root) root.BattleEngine = engine;
})(typeof globalThis === 'object' ? globalThis : this, function createBattleEngine() {
  'use strict';

  const AREAS = Object.freeze(['forest', 'snow', 'city', 'chaos']);
  const GRADE_MULTIPLIER = Object.freeze({ C: 1, B: 2, A: 4 });
  const DAMAGE_WEIGHTS = Object.freeze([0.02, 0.40, 0.40, 0.10, 0.08]);
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
    { id:'milk-candy',name:'우유맛 마법사탕',grade:'C',effect:'세 번째 명중마다 체력 회복' },
    { id:'wind-candy',name:'바람궁수 마법사탕',grade:'C',effect:'라운드당 유도 사격' }
  ]);
  const CONSUMABLE_CATALOG = Object.freeze([
    { id:'fireball',name:'불공',description:'다음 영구 무기 피해 2배' },
    { id:'spear',name:'창',description:'최대 3마리 관통' },
    { id:'defense',name:'방어',description:'다음 적 공격 차단' },
    { id:'heal',name:'회복',description:'체력 25 회복' }
  ]);

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
    const roundNumber = Math.max(1, Math.floor(Number(round) || 1));
    if (roundNumber >= 5 && AREA_BOSSES[area]) {
      const boss = AREA_BOSSES[area];
      return [{
        id: `${area}-${boss.id}`,
        kind: boss.kind,
        hp: boss.hp,
        maxHp: area === 'city' ? 18 : boss.hp,
        isBoss: true,
        attackCount: 0,
        alive: true
      }];
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
    const initialWeapons=config.weapons||[Object.assign({instanceId:'weapon-1',ammoType:'magic-candy'},WEAPON_CATALOG[0])];
    const state = {
      area,
      round,
      playerHp: Math.max(0, Math.min(100, Number.isFinite(config.playerHp) ? config.playerHp : 100)),
      maxPlayerHp: 100,
      ammo: Math.max(0, Math.min(9, Number.isFinite(config.ammo) ? config.ammo : 9)),
      maxAmmo: 9,
      score: Math.max(0, Number(config.score) || 0),
      zeroRollsThisRound: 0,
      enemyTurnIndex: 0,
      turnNumber: 0,
      terminal: null,
      enemies: createRoundEnemies(area, round, { rng: config.rng }),
      consumablesBlockedTurns: 0,
      consumablesBlocked: false,
      inventory: Object.assign({ fireball: 1, spear: 2, defense: 1, heal: 1 }, config.inventory || {}),
      weapons: initialWeapons.map((weapon,index)=>Object.assign({instanceId:'weapon-'+(index+1),ammoType:'magic-candy'},weapon)),
      weaponQueue: [], currentWeaponId:null, rewardChoices:null, selectedRewards:{weapon:null,consumable:null},
      furthestArea:area, playStartedAt:Number(config.now)||Date.now(), roundStartedAt:Number(config.now)||Date.now(), pendingCamp:false,
      defenseArmed: false,
      fireballArmed: false
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
  function grantWeapon(state,source,grade) {
    const requestedGrade=grade||source.grade||'C';
    if(requestedGrade==='C'||requestedGrade==='B'){
      const match=state.weapons.find(item=>item.id===source.id&&item.grade==='C')||state.weapons.find(item=>item.id===source.id&&item.grade==='B');
      if(match&&match.grade==='C'){match.grade='B';return {weapon:match,fused:true};}
      if(match&&match.grade==='B'){match.grade='A';return {weapon:match,fused:true};}
    }
    const weapon=Object.assign({},source,{grade:requestedGrade,instanceId:'weapon-'+(state.weapons.length+1),ammoType:'magic-candy'});
    state.weapons.push(weapon);return {weapon,fused:false};
  }

  function rollWeaponDamage(rng, grade, zeroRollsThisRound) {
    if (typeof rng !== 'function') throw new TypeError('rng must be a function');
    const normalizedGrade = String(grade || 'C').toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(GRADE_MULTIPLIER, normalizedGrade)) throw new RangeError(`Unknown weapon grade: ${grade}`);
    const sample = Math.max(0, Math.min(0.999999999999, Number(rng())));
    let cumulative = 0;
    let baseDamage = 4;
    for (let index = 0; index < DAMAGE_WEIGHTS.length; index += 1) {
      cumulative += DAMAGE_WEIGHTS[index];
      if (sample < cumulative) { baseDamage = index; break; }
    }
    if (baseDamage === 0 && zeroRollsThisRound >= 2) baseDamage = 1;
    return baseDamage + (normalizedGrade === 'A' ? 2 : normalizedGrade === 'B' ? 1 : 0);
  }

  function drawRewardChoices(state,rng) {
    if(!state||state.terminal!=='round-clear')return null;
    const sourceRng=typeof rng==='function'?rng:Math.random;
    const weapons=shuffle(WEAPON_CATALOG,sourceRng).slice(0,3).map(item=>Object.assign({},item,{choiceId:'weapon:'+item.id}));
    const consumables=shuffle(CONSUMABLE_CATALOG.filter(item=>getConsumableCount(state,item.id)<3),sourceRng).slice(0,3).map(item=>Object.assign({},item,{choiceId:'consumable:'+item.id}));
    state.rewardChoices={weapons,consumables};
    state.selectedRewards={weapon:null,consumable:consumables.length?null:'skip'};
    return state.rewardChoices;
  }
  function applyRewardChoice(state,category,choiceId) {
    if(!state||state.terminal!=='round-clear'||!state.rewardChoices)return {accepted:false,reason:'no-reward'};
    if(!['weapon','consumable'].includes(category)||state.selectedRewards[category])return {accepted:false,reason:'already-selected'};
    const choices=category==='weapon'?state.rewardChoices.weapons:state.rewardChoices.consumables;
    const choice=choices.find(item=>item.choiceId===choiceId);
    if(!choice)return {accepted:false,reason:'invalid-choice'};
    if(category==='weapon'){
      const granted=grantWeapon(state,choice,choice.grade);choice.fused=granted.fused;
    }else if(addConsumable(state,choice.id,1)!==1)return {accepted:false,reason:'inventory-full'};
    state.selectedRewards[category]=choiceId;
    return {accepted:true,choice};
  }
  function getRunSummary(state,now) {
    const time=Number(now)||Date.now();
    const unusedConsumablePoints=Object.values(state.inventory).reduce((total,count)=>total+Math.max(0,Number(count)||0),0);
    return {score:state.score,finalScore:state.score+unusedConsumablePoints,unusedConsumablePoints,playerHp:state.playerHp,ammo:state.ammo,area:state.area,round:state.round,furthestArea:state.furthestArea,durationMs:Math.max(0,time-state.playStartedAt)};
  }
  function enterRound(state,options) {
    const config=options||{};
    state.ammo=state.maxAmmo;state.zeroRollsThisRound=0;state.enemyTurnIndex=0;state.terminal=null;state.pendingCamp=false;
    state.roundStartedAt=Number(config.now)||Date.now();state.enemies=createRoundEnemies(state.area,state.round,{rng:config.rng});
    state.rewardChoices=null;state.selectedRewards={weapon:null,consumable:null};
    if(AREAS.indexOf(state.area)>AREAS.indexOf(state.furthestArea))state.furthestArea=state.area;
    refillWeaponQueue(state,config.rng);
  }
  function advanceRound(state,options) {
    if(!state||state.terminal!=='round-clear')return {accepted:false,reason:'round-not-cleared'};
    if(!state.selectedRewards.weapon||!state.selectedRewards.consumable)return {accepted:false,reason:'rewards-incomplete'};
    if(state.area==='city'&&state.round>=5){state.terminal='clear';return {accepted:true,terminal:'clear',summary:getRunSummary(state,options&&options.now)};}
    if(state.round>=5){state.pendingCamp=true;return {accepted:true,pendingCamp:true};}
    state.round+=1;enterRound(state,options);return {accepted:true,area:state.area,round:state.round};
  }
  function chooseCampReward(state,choice,options) {
    if(!state||!state.pendingCamp)return {accepted:false,reason:'camp-not-ready'};
    const config=options||{};let effect;
    if(choice==='heal'){const before=state.playerHp;state.playerHp=Math.min(state.maxPlayerHp,state.playerHp+60);effect={healed:state.playerHp-before};}
    else if(choice==='weapon'){const rng=typeof config.rng==='function'?config.rng:Math.random;const grade=randomInt(rng,0,9)===0?'B':'C',count=grade==='B'?1:2,grants=[];for(let i=0;i<count;i++){const item=shuffle(WEAPON_CATALOG,rng)[0],result=grantWeapon(state,item,grade);grants.push({name:result.weapon.name,grade:result.weapon.grade,fused:result.fused});}effect={weapons:grants,grade};}
    else return {accepted:false,reason:'invalid-choice'};
    state.area=state.area==='forest'?'snow':'city';state.round=1;enterRound(state,config);
    return {accepted:true,effect,area:state.area,round:state.round};
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

  function resolveEnemyTurn(state, rng) {
    if (state.terminal || state.playerHp <= 0) return null;
    const living = getLivingEnemies(state);
    if (!living.length) {
      state.terminal = 'round-clear';
      return null;
    }
    const size = state.enemies.length;
    let index = state.enemyTurnIndex % Math.max(1, size);
    while (!state.enemies[index] || !state.enemies[index].alive || state.enemies[index].hp <= 0) index = (index + 1) % size;
    const enemy = state.enemies[index];
    state.enemyTurnIndex = (index + 1) % size;
    state.turnNumber += 1;

    let special = null;
    let minDamage = enemy.isBoss ? 3 : 1;
    let maxDamage = enemy.isBoss ? 15 : 8;
    if (enemy.isBoss) {
      enemy.attackCount += 1;
      if (enemy.attackCount % 3 === 0) special = AREA_BOSSES[state.area].special;
    }
    if (special === 'boar-charge') { minDamage = 8; maxDamage = 15; }
    const sourceRng = typeof rng === 'function' ? rng : Math.random;
    const blocked = state.defenseArmed;
    state.defenseArmed = false;
    const damage = blocked ? 0 : randomInt(sourceRng, minDamage, maxDamage);
    state.playerHp = Math.max(0, state.playerHp - damage);
    const event = { enemyId: enemy.id, kind: enemy.kind, damage, special: blocked ? null : special, blocked, healedEnemy: 0, ammoLost: 0, consumablesBlocked: false };

    if (!blocked && special === 'frozen-breath') {
      state.consumablesBlockedTurns = 1;
      state.consumablesBlocked = true;
      event.consumablesBlocked = true;
    } else if (!blocked && special === 'oven-overheat') {
      const previousAmmo = state.ammo;
      state.ammo = Math.max(0, state.ammo - 1);
      event.ammoLost = previousAmmo - state.ammo;
      const previousHp = enemy.hp;
      enemy.hp = Math.min(18, enemy.hp + 3);
      event.healedEnemy = enemy.hp - previousHp;
    }
    if (state.playerHp <= 0 || (state.ammo <= 0 && getLivingEnemies(state).length > 0)) state.terminal = 'defeat';
    return event;
  }

  function resolveProjectile(state, options) {
    const config = options || {};
    if (state.terminal) return { accepted: false, reason: 'combat-ended', hits: [], enemyAttack: null, roundCleared: isRoundCleared(state), runDefeated: isRunDefeated(state) };
    if (state.ammo <= 0) {
      state.terminal = 'defeat';
      return { accepted: false, reason: 'no-ammo', hits: [], enemyAttack: null, roundCleared: false, runDefeated: true };
    }
    state.ammo = Math.max(0, state.ammo - 1);
    if(!state.weaponQueue.length)refillWeaponQueue(state,config.rng);
    const usedWeaponId=state.weaponQueue.shift();
    state.currentWeaponId=state.weaponQueue[0]||null;
    if(!state.weaponQueue.length)refillWeaponQueue(state,config.rng);
    state.turnNumber += 1;
    const rolledDamage = Math.max(0, Math.floor(Number(config.damage) || 0));
    const damageMultiplier = config.source === 'spear' ? 1 : (state.fireballArmed ? 2 : 1);
    let damage = rolledDamage * damageMultiplier;
    if (config.source !== 'spear') state.fireballArmed = false;
    state.consumablesBlocked = false;
    state.consumablesBlockedTurns = 0;
    const hits = [];
    const seen = new Set();
    for (const id of Array.isArray(config.hitIds) ? config.hitIds : []) {
      if (damage <= 0) break;
      if (seen.has(id)) continue;
      seen.add(id);
      const enemy = state.enemies.find(candidate => candidate.id === id && candidate.alive && candidate.hp > 0);
      if (!enemy) continue;
      const before = enemy.hp;
      const removed = Math.min(before, damage);
      enemy.hp = before - removed;
      enemy.alive = enemy.hp > 0;
      damage -= removed;
      const scoreDelta = removed * (GRADE_MULTIPLIER[String(config.weaponGrade || 'C').toUpperCase()] || 1);
      state.score += scoreDelta;
      hits.push({ id: enemy.id, kind: enemy.kind, damage: removed, remainingHp: enemy.hp, defeated: !enemy.alive, scoreDelta });
      if (enemy.alive) break;
    }
    const event = {
      accepted: true,
      source: config.source || 'weapon',
      weaponId: usedWeaponId,
      damage: rolledDamage * damageMultiplier,
      spillover: damage,
      hits,
      missed: hits.length === 0,
      scoreDelta: hits.reduce((sum, hit) => sum + hit.scoreDelta, 0),
      enemyAttack: null,
      roundCleared: false,
      runDefeated: false
    };

    if (getLivingEnemies(state).length === 0) {
      state.terminal = 'round-clear';
      event.roundCleared = true;
      return event;
    }
    if (state.ammo === 0) {
      state.terminal = 'defeat';
      event.runDefeated = true;
      return event;
    }
    event.enemyAttack = resolveEnemyTurn(state, config.rng);
    event.runDefeated = state.terminal === 'defeat';
    return event;
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
    if (!state || state.terminal) { event.reason = 'combat-ended'; return event; }
    if (!Object.prototype.hasOwnProperty.call(state.inventory, key)) { event.reason = 'unknown-item'; return event; }
    if (config.isAiming) { event.reason = 'aiming'; return event; }
    if (state.consumablesBlocked || state.consumablesBlockedTurns > 0) { event.reason = 'blocked'; return event; }
    if (getConsumableCount(state, key) <= 0) { event.reason = 'empty'; return event; }

    state.inventory[key] -= 1;
    state.turnNumber += 1;
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
      const rng = typeof config.rng === 'function' ? config.rng : Math.random;
      let damage = randomInt(rng, 2, 5);
      for (const enemy of getLivingEnemies(state).slice(0, 3)) {
        const removed = Math.min(enemy.hp, damage);
        enemy.hp -= removed;
        enemy.alive = enemy.hp > 0;
        state.score += removed;
        event.scoreDelta += removed;
        event.hits.push({ id: enemy.id, kind: enemy.kind, damage: removed, remainingHp: enemy.hp, defeated: !enemy.alive, scoreDelta: removed });
        damage = Math.max(0, damage - 1);
      }
      event.effect = { hits: event.hits };
    }

    if (getLivingEnemies(state).length === 0) {
      state.terminal = 'round-clear';
      event.roundCleared = true;
      return event;
    }
    state.consumablesBlocked = false;
    state.consumablesBlockedTurns = 0;
    event.enemyAttack = resolveEnemyTurn(state, config.rng);
    event.runDefeated = state.terminal === 'defeat';
    return event;
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
    getRunSummary,
    skipConsumableReward,
    rollWeaponDamage,
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
