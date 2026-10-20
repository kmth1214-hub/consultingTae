(function () {
  'use strict';

  var state = null;
  var characterName='모험가맛 쿠키';
  var weaponIds={'모험가의 마법사탕':'adventurer-candy','연금술사의 마법사탕':'alchemist-candy','마력 구슬':'wizard-orb','우유맛 마법사탕':'milk-candy','바람궁수 마법사탕':'wind-candy'};
  var labels = { snake:'젤리 뱀', boar:'초코 멧돼지', 'dry-ice':'드라이아이스', snowball:'눈덩이', 'washing-robot':'세탁 로봇', 'pointy-boar':'뾰족 멧돼지', 'cowardly-snowman':'겁쟁이 눈사람', 'oven-robot':'오븐 로봇' };
  var art = { snake:'./assets/monsters/jelly-snake.png', boar:'./assets/monsters/chocolate-boar.png' };

  function showOutcome(kind) {
    showScreen(kind === 'round-clear' ? 'reward' : 'defeat');
  }

  function render() {
    if (!state) return;
    document.getElementById('hpValue').textContent = state.playerHp;
    document.getElementById('ammoValue').textContent = state.ammo;
    var stats = document.querySelector('[data-screen="battle"] .battle-stats');
    var score = document.getElementById('scoreValue');
    if (!score) {
      score = document.createElement('span'); score.id = 'scoreValue'; score.className = 'stat-chip';
      score.append('점수 '); var value = document.createElement('strong'); value.id = 'scoreNumber'; score.appendChild(value); stats.appendChild(score);
    }
    document.getElementById('scoreNumber').textContent = state.score.toLocaleString('ko-KR');
    var weapon=window.BattleEngine.getCurrentWeapon(state),weaponCard=document.getElementById('weaponCard');
    if(weapon&&weaponCard){weaponCard.querySelector('.weapon-name').textContent=weapon.name;weaponCard.querySelector('.grade').textContent=weapon.grade+' 등급';weaponCard.querySelector('.weapon-desc').textContent=weapon.effect||'';
      var dots=weaponCard.querySelector('.ammo-dots');dots.replaceChildren();for(var shot=0;shot<9;shot++){var dot=document.createElement('i');dot.className='ammo-dot'+(shot>=state.ammo?' spent':'');dots.appendChild(dot);}dots.setAttribute('aria-label','남은 탄약 '+state.ammo+'발');}
    ['fireball','spear','defense','heal'].forEach(function(key){
      var slot=document.querySelector('.item-slot[data-consumable="'+key+'"]');
      if(!slot)return;
      var count=window.BattleEngine.getConsumableCount(state,key);
      slot.querySelector('.item-count').textContent=count;
      slot.querySelector('.item-use').disabled=count===0||!!state.terminal;
    });
    var enemies = window.BattleEngine.getLivingEnemies(state);
    window.currentArea=state.area;
    var caption=document.getElementById('areaCaptionText');if(caption)caption.textContent=state.area==='forest'?'숲 지역':state.area==='snow'?'눈 지역':state.area==='city'?'도시 지역':'혼돈 지역';
    var nextWeapon=document.querySelector('[data-screen="battle"] .status-bar strong'),activeWeapon=window.BattleEngine.getCurrentWeapon(state);if(nextWeapon&&activeWeapon)nextWeapon.textContent=activeWeapon.name+' · '+activeWeapon.grade;
    var group = document.getElementById('enemyGroup');
    group.style.cssText = 'left:55%;right:22%;bottom:26%;height:112px;z-index:4;';
    group.replaceChildren();
    group.setAttribute('aria-label','현재 라운드의 적 ' + enemies.length + '마리');
    enemies.forEach(function (enemy,index) {
      var node = document.createElement('div');
      node.className = 'monster'; node.dataset.enemyId = enemy.id; node.setAttribute('role','img');
      node.setAttribute('aria-label',(labels[enemy.kind] || '몬스터') + ', 체력 ' + enemy.hp);
      node.style.cssText = 'left:' + ((index + .5) / enemies.length * 100) + '%;bottom:' + (index % 2 * 18) + 'px;transform:translateX(-50%);width:' + (enemy.isBoss ? 96 : 67) + 'px;height:' + (enemy.isBoss ? 105 : 76) + 'px';
      if (art[enemy.kind]) { var img = document.createElement('img'); img.className='monster-art'; img.src=art[enemy.kind]; img.alt=''; node.appendChild(img); }
      else { node.textContent = ({'dry-ice':'🧊',snowball:'☃️','washing-robot':'🤖','pointy-boar':'🐗','cowardly-snowman':'⛄','oven-robot':'🤖'}[enemy.kind] || '👾'); node.style.fontSize = enemy.isBoss ? '4rem' : '2.6rem'; }
      var hp = document.createElement('span'); hp.className='monster-hp'; hp.textContent=enemy.hp; node.appendChild(hp); group.appendChild(node);
    });
    document.querySelector('[data-screen="battle"] .battle-title .eyebrow').textContent = state.area.toUpperCase() + ' · ROUND ' + state.round + ' / 5';
    document.querySelector('[data-screen="battle"] .battle-title p').textContent = enemies.length + '마리의 적';
  }

  function pathHits() {
    var path = document.getElementById('trajectoryGeometry');
    if (!path || !path.getTotalLength || !path.getTotalLength()) return [];
    var svg = path.ownerSVGElement, total = path.getTotalLength(), hits = new Map();
    var targets = Array.from(document.querySelectorAll('#enemyGroup .monster[data-enemy-id]')).map(function (node) {
      var rect=node.getBoundingClientRect(), pt=svg.createSVGPoint(); pt.x=rect.left+rect.width/2; pt.y=rect.top+rect.height/2;
      var center=pt.matrixTransform(svg.getScreenCTM().inverse());
      return {id:node.dataset.enemyId,x:center.x,y:center.y,r:Math.max(18,Math.max(rect.width,rect.height)*.4)};
    });
    for (var d=0;d<=total;d+=Math.max(3,total/260)) {
      var point=path.getPointAtLength(Math.min(total,d));
      targets.forEach(function (target) { if (!hits.has(target.id) && Math.hypot(point.x-target.x,point.y-target.y)<=target.r) hits.set(target.id,d); });
    }
    return Array.from(hits.entries()).sort(function(a,b){return a[1]-b[1];}).map(function(entry){return entry[0];});
  }

  function renderRewards(){
    var grids=document.querySelectorAll('[data-screen="reward"] .reward-grid'),icons={'adventurer-candy':'🧭','alchemist-candy':'🧪','wizard-orb':'🪄','milk-candy':'🥛','wind-candy':'🏹',fireball:'🔥',spear:'🔱',defense:'🛡',heal:'♥'};
    function fill(grid,items,category){grid.replaceChildren();items.forEach(function(item){var article=document.createElement('article'),body=document.createElement('div'),icon=document.createElement('div'),title=document.createElement('h3'),desc=document.createElement('p'),button=document.createElement('button');article.className='reward-card';article.dataset.rewardId=item.choiceId;article.dataset.rewardCategory=category;icon.className='reward-art';icon.textContent=icons[item.id]||'✨';title.textContent=item.name;desc.textContent=category==='weapon'?item.grade+' 등급 · '+item.effect:item.description;button.className='btn secondary';button.type='button';button.textContent='선택하기';button.onclick=function(){window.selectReward(button);};body.append(icon,title,desc);article.append(body,button);grid.appendChild(article);});}
    fill(grids[0],state.rewardChoices.weapons,'weapon');fill(grids[1],state.rewardChoices.consumables,'consumable');
    var rewardEyebrow=document.querySelector('[data-screen="reward"] .content-header .eyebrow');if(rewardEyebrow)rewardEyebrow.textContent='ROUND CLEAR · '+state.area.toUpperCase()+' '+state.round;
    if(!state.rewardChoices.consumables.length){state.selectedRewards.consumable='skip';var note=document.createElement('p');note.className='muted';note.textContent='보유 수량이 가득 차 소모품 보상을 건너뜁니다.';grids[1].appendChild(note);}
    document.querySelector('[data-screen="reward"] .result-actions .btn').disabled=!(state.selectedRewards.weapon&&state.selectedRewards.consumable);
  }
  function renderRunResults(screenName){
    var summary=window.BattleEngine.getRunSummary(state),stats=document.querySelector('[data-screen="'+screenName+'"] .result-stats');if(!stats)return;
    var values=stats.querySelectorAll('.result-stat strong');if(values[0])values[0].textContent=summary.finalScore.toLocaleString('ko-KR');if(values[1])values[1].textContent=summary.furthestArea.toUpperCase()+' '+summary.round+' / 5';if(values[2])values[2].textContent=characterName;if(values[3])values[3].textContent=Math.floor(summary.durationMs/60000)+':'+String(Math.floor(summary.durationMs/1000)%60).padStart(2,'0');
  }

  window.startRun = function () {
    var selected=document.querySelector('.character-card.selected'),weaponName=selected&&selected.dataset.weapon||'모험가의 마법사탕';
    characterName=selected&&selected.dataset.character||'모험가맛 쿠키';
    var template=window.BattleEngine.WEAPON_CATALOG.find(function(item){return item.id===weaponIds[weaponName];})||window.BattleEngine.WEAPON_CATALOG[0];
    state = window.BattleEngine.createRunState({area:'forest',round:1,weapons:[Object.assign({},template,{instanceId:'weapon-1'})]});
    render(); showScreen('battle');
  };
  window.fireShot = function () {
    if (!state || state.terminal) return;
    var weapon=window.BattleEngine.getCurrentWeapon(state)||{grade:'C'};
    var damage=window.BattleEngine.rollWeaponDamage(Math.random,weapon.grade,state.zeroRollsThisRound);
    if (damage===0) state.zeroRollsThisRound++;
    var result=window.BattleEngine.resolveProjectile(state,{damage:damage,hitIds:pathHits(),weaponGrade:weapon.grade});
    render();
    if(result.runDefeated){renderRunResults('defeat');showOutcome('defeat');}
    else if(result.roundCleared){state.rewardChoices=window.BattleEngine.drawRewardChoices(state);renderRewards();showOutcome('round-clear');}
    else showToast(result.missed?'빗나갔어요 · 적이 반격합니다.':'명중! 피해 '+result.hits.reduce(function(sum,hit){return sum+hit.damage;},0)+' · 적의 차례');
  };
  window.useItem = function (key) {
    if(!state||document.querySelector('[data-screen="battle"]').hidden){showToast('전투 중에만 소모품을 사용할 수 있어요.');return;}
    var itemKey={1:'fireball',2:'spear',3:'defense',4:'heal'}[Number(key)];
    var result=window.BattleEngine.useConsumable(state,itemKey,{isAiming:!!(window.aimState&&window.aimState.phase!=='idle')});
    if(!result.accepted){showToast(({aiming:'조준을 마친 뒤 사용할 수 있어요.',blocked:'얼어붙는 숨결 때문에 이번 턴에는 소모품을 쓸 수 없어요.',empty:'이 소모품을 모두 사용했어요.','combat-ended':'전투가 끝났어요.'}[result.reason])||'지금은 사용할 수 없어요.');return;}
    if(window.showItemVisualEffect)window.showItemVisualEffect(Number(key));
    render();
    if(result.runDefeated){renderRunResults('defeat');showOutcome('defeat');}else if(result.roundCleared){state.rewardChoices=window.BattleEngine.drawRewardChoices(state);renderRewards();showOutcome('round-clear');}
    else if(itemKey==='heal')showToast('회복 사용 · 체력 '+result.effect.healed+' 회복'+(result.enemyAttack.blocked?' · 적 공격 방어':' · 적의 차례'));
    else if(itemKey==='defense')showToast('방어 사용 · 다음 공격 '+(result.enemyAttack.blocked?'차단':'대기'));
    else if(itemKey==='fireball')showToast('불공 사용 · 다음 새총 피해 2배'+(result.enemyAttack.blocked?' · 적 공격 방어':' · 적의 차례'));
    else showToast('창 사용 · '+result.hits.length+'마리 타격 · 적의 차례');
  };
  window.selectReward=function(button){
    var card=button.closest('.reward-card'),result=window.BattleEngine.applyRewardChoice(state,card.dataset.rewardCategory,card.dataset.rewardId);
    if(!result.accepted){showToast('이미 선택했거나 선택할 수 없는 보상입니다.');return;}
    card.closest('.reward-grid').querySelectorAll('.reward-card').forEach(function(node){node.classList.toggle('selected',node===card);});button.textContent='선택됨';
    var ready=!!state.selectedRewards.weapon&&!!state.selectedRewards.consumable;document.querySelector('[data-screen="reward"] .result-actions .btn').disabled=!ready;showToast(result.choice.name+' 선택');
  };
  document.addEventListener('click',function(event){
    var continueButton=event.target.closest('[data-screen="reward"] .result-actions .btn');
    if(continueButton){event.preventDefault();event.stopImmediatePropagation();if(!state.selectedRewards.weapon||!state.selectedRewards.consumable){showToast('영구 무기와 소모품을 하나씩 선택하세요.');return;}
      var next=window.BattleEngine.advanceRound(state);if(next.pendingCamp){var campLabel=document.querySelector('[data-screen="transition"] .content-header .eyebrow');if(campLabel)campLabel.textContent=state.area.toUpperCase()+' CLEARED';showScreen('transition');return;}if(next.terminal==='clear'){renderRunResults('clear');showScreen('clear');return;}render();showScreen('battle');return;}
    var campButton=event.target.closest('[data-screen="transition"] .choice-card button');
    if(campButton){event.preventDefault();event.stopImmediatePropagation();var cards=document.querySelectorAll('[data-screen="transition"] .choice-card'),choice=campButton.closest('.choice-card')===cards[0]?'heal':'weapon';var result=window.BattleEngine.chooseCampReward(state,choice);if(!result.accepted){showToast('야영지 보상을 선택할 수 없습니다.');return;}render();showToast(choice==='heal'?'체력 '+result.effect.healed+' 회복':'무기 강화 · '+result.effect.grade+' 등급');showScreen('battle');}
  },true);
  document.addEventListener('DOMContentLoaded',function(){
    var start=document.querySelector('.character-bottom .btn');
    if(start) start.addEventListener('click',function(event){event.preventDefault();window.startRun();});
  });
})();
