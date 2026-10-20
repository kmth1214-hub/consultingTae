(function () {
  'use strict';

  var state = null;
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
    ['fireball','spear','defense','heal'].forEach(function(key){
      var slot=document.querySelector('.item-slot[data-consumable="'+key+'"]');
      if(!slot)return;
      var count=window.BattleEngine.getConsumableCount(state,key);
      slot.querySelector('.item-count').textContent=count;
      slot.querySelector('.item-use').disabled=count===0||!!state.terminal;
    });
    var enemies = window.BattleEngine.getLivingEnemies(state);
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

  window.startRun = function () {
    state = window.BattleEngine.createRunState({area:'forest',round:1});
    render(); showScreen('battle');
  };
  window.fireShot = function () {
    if (!state || state.terminal) return;
    var damage=window.BattleEngine.rollWeaponDamage(Math.random,'C',state.zeroRollsThisRound);
    if (damage===0) state.zeroRollsThisRound++;
    var result=window.BattleEngine.resolveProjectile(state,{damage:damage,hitIds:pathHits(),weaponGrade:'C'});
    render();
    if(result.runDefeated) showOutcome('defeat');
    else if(result.roundCleared) showOutcome('round-clear');
    else showToast(result.missed?'빗나갔어요 · 적이 반격합니다.':'명중! 피해 '+result.hits.reduce(function(sum,hit){return sum+hit.damage;},0)+' · 적의 차례');
  };
  window.useItem = function (key) {
    if(!state||document.querySelector('[data-screen="battle"]').hidden){showToast('전투 중에만 소모품을 사용할 수 있어요.');return;}
    var itemKey={1:'fireball',2:'spear',3:'defense',4:'heal'}[Number(key)];
    var result=window.BattleEngine.useConsumable(state,itemKey,{isAiming:!!(window.aimState&&window.aimState.phase!=='idle')});
    if(!result.accepted){showToast(({aiming:'조준을 마친 뒤 사용할 수 있어요.',blocked:'얼어붙는 숨결 때문에 이번 턴에는 소모품을 쓸 수 없어요.',empty:'이 소모품을 모두 사용했어요.','combat-ended':'전투가 끝났어요.'}[result.reason])||'지금은 사용할 수 없어요.');return;}
    if(window.showItemVisualEffect)window.showItemVisualEffect(Number(key));
    render();
    if(result.runDefeated)showOutcome('defeat');else if(result.roundCleared)showOutcome('round-clear');
    else if(itemKey==='heal')showToast('회복 사용 · 체력 '+result.effect.healed+' 회복'+(result.enemyAttack.blocked?' · 적 공격 방어':' · 적의 차례'));
    else if(itemKey==='defense')showToast('방어 사용 · 다음 공격 '+(result.enemyAttack.blocked?'차단':'대기'));
    else if(itemKey==='fireball')showToast('불공 사용 · 다음 새총 피해 2배'+(result.enemyAttack.blocked?' · 적 공격 방어':' · 적의 차례'));
    else showToast('창 사용 · '+result.hits.length+'마리 타격 · 적의 차례');
  };
  document.addEventListener('DOMContentLoaded',function(){
    var start=document.querySelector('.character-bottom .btn');
    if(start) start.addEventListener('click',function(event){event.preventDefault();window.startRun();});
  });
})();
