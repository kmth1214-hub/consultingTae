import React, { useEffect, useMemo, useRef, useState } from 'react';
import ConsumableTable from './ConsumableTable.jsx';
import MagicCandyCard from './MagicCandyCard.jsx';
import MonsterGroup from './MonsterGroup.jsx';
import ArenaScenery, { ContactEffect } from './ArenaScenery.jsx';
import { FrostField, CityGroundBursts, ChaosObstacleNotice, ChaosMagicEffect } from './ObstacleRegionalEffects.jsx';
import BattlefieldBackdrop from './BattlefieldBackdrop.jsx';
import Slingshot from './Slingshot.jsx';
import PlayerCookie from './PlayerCookie.jsx';
import TrajectoryPreview from './TrajectoryPreview.jsx';
import ProjectileFlight from './ProjectileFlight.jsx';
import EnemyResponse, { EnemyResponseNotice, responseTravelMs } from './EnemyResponse.jsx';
import BattlefieldMinimap from './BattlefieldMinimap.jsx';
import { buildPlayableBattlefield } from '../game/battlefieldPlacement.js';
import { planShot, sampleAtDistance } from '../game/shotGeometry.js';
import { useAimController } from '../game/useAimController.js';
import { useBattlefieldCamera } from '../game/useBattlefieldCamera.js';
import { getChaosObstacleCues } from '../game/chaosObstacleFeedback.js';
import BossSplitTransition from './BossSplitTransition.jsx';

const INSTRUCTIONS = {
  idle: '맵 어디든 누르고 뒤로 당긴 뒤 놓으세요. 당긴 반대 방향으로 발사됩니다.',
  dragging: '당긴 거리로 힘을, 방향으로 궤도를 조절하세요. 놓으면 발사 · Esc로 취소',
  launching: '사탕이 날아가고 있어요!',
};

export default function BattleArena({ run, lastEvent, enemyResponse, shotReview, onReviewComplete, bossTransition,
  onBossImpact, onBossComplete,
  onBeginShot, onCancelShot,
  onEnemyAdvance, onEnemyComplete, setAim, onFire, onConsumable, arenaRef }) {
  const worldRef = useRef(null), launcherRef = useRef(null), enemyGroupRef = useRef(null), focusRef = useRef(null);
  const sceneryRef = useRef(null);
  const reviewingSplit = Boolean(bossTransition && shotReview);
  const activeSplit = bossTransition && !shotReview ? bossTransition : null;
  const roster = reviewingSplit ? [bossTransition.split.fromEnemy] : run.enemies;
  const scenery = reviewingSplit ? bossTransition.split.previousScenery : run;
  const slotKey = JSON.stringify(roster.map(({ id, kind, isBoss }) => [id, kind, isBoss]));
  const encounterPhase = reviewingSplit ? null : run.chaosBossPhase === 'split' ? 'split' : null;
  const layout = useMemo(() => buildPlayableBattlefield({ area: run.area, round: run.round,
    seed: run.layoutSeed ?? 0, encounterPhase,
    enemies: JSON.parse(slotKey).map(([id, kind, isBoss]) => ({ id, kind, isBoss, alive: true, hp: 1 })) }),
  [run.area, run.round, run.layoutSeed, slotKey, encounterPhase]);
  const splitSource = useMemo(() => bossTransition ? buildPlayableBattlefield({ area: run.area, round: run.round,
    seed: run.layoutSeed ?? 0, enemies: [bossTransition.split.fromEnemy] }).enemies[0] : null,
  [bossTransition?.id, run.area, run.round, run.layoutSeed]);
  const [flight, setFlight] = useState(null), [lastImpact, setImpact] = useState(null), [retry, setRetry] = useState('');
  const [visualContacts, setVisualContacts] = useState([]);
  const [visualEnemyContacts, setVisualEnemyContacts] = useState([]);
  const triggeredEnemies = useRef(new Set());
  const chaosCues = useMemo(() => activeSplit ? [] : getChaosObstacleCues({ area: run.area, layout, event: lastEvent }), [run.area, layout, lastEvent, activeSplit]);
  const activeFlight = useRef(null), triggeredContacts = useRef(new Set());
  const reviewId = shotReview?.id;
  useEffect(() => {
    if (reviewId == null) return;
    const timer = setTimeout(() => { setFlight(null); onReviewComplete(reviewId); }, 2000);
    return () => clearTimeout(timer);
  }, [reviewId, onReviewComplete]);
  const activeResponse = shotReview ? null : enemyResponse;
  useEffect(() => {
    if (!activeSplit) return;
    clearFlight(); setImpact(null);
  }, [activeSplit?.id]);
  const makeSolution = pull => planShot({ layout, pull, enemies: run.enemies,
    piercing: run.spearArmed === true,
    toppledObstacleIds: run.toppledObstacleIds || [],
    windAvailable: run.weapons.some(w => w.id === 'wind-candy') && !run.roundEffects.windHomingUsed });
  function clearFlight() {
    if (activeFlight.current) onCancelShot(activeFlight.current.shotId);
    activeFlight.current = null; setFlight(null); setVisualContacts([]); setVisualEnemyContacts([]);
    triggeredContacts.current.clear(); triggeredEnemies.current.clear();
  }
  function failLaunch() { controller.cancelAim(); setRetry('조준을 다시 잡고 당겨 주세요.'); }
  function startFlight(pull) {
    if (!camera.valid) { failLaunch(); return; }
    const reservation = onBeginShot({launchId:pull.launchId,pull});
    if (!reservation.accepted) { failLaunch(); return; }
    const shot = reservation.flight;
    activeFlight.current = shot;
    triggeredContacts.current.clear();
    triggeredEnemies.current.clear(); setVisualEnemyContacts([]);
    setVisualContacts([]);
    focusRef.current = shot.path.start;
    setFlight(shot);
  }
  const controller = useAimController({ arenaRef, ammo: run.ammo, invertDirection: run.pendingAimInversion,
    disabled: Boolean(run.terminal || enemyResponse || shotReview || bossTransition), onLaunch: startFlight, onCancel: clearFlight,
    onAimChange: state => {
      if (state.phase === 'dragging') { setImpact(null); setRetry(''); setVisualContacts([]); }
      setAim({ phase: state.phase, angle: state.angleDeg, power: state.powerRatio * 100, selectedTargetId: null });
    } });
  const state = controller.aimState;
  const mode = activeSplit ? 'split' : shotReview ? 'follow' : enemyResponse ? 'enemy' : flight ? 'follow' : state.phase === 'dragging' ? 'aim' : 'overview';
  const camera = useBattlefieldCamera({ arenaRef, worldRef, layout, mode, focusRef, attackerId: enemyResponse?.attack.enemyId });
  const solution = state.phase === 'dragging' && state.ready ? makeSolution(state) : null;
  const aiming = state.phase !== 'idle';
  const travelMs = enemyResponse ? responseTravelMs(enemyResponse, layout, camera.reducedMotion) : 520;
  const beforeImpact = enemyResponse && enemyResponse.stage !== 'impact';
  // Counterattack healing remains hidden while its playback is waiting in review.
  const visibleEnemies = shotReview && beforeImpact && enemyResponse.attack.healedEnemy
    ? run.enemies.map(enemy => enemy.id === enemyResponse.attack.enemyId
      ? { ...enemy, hp: enemy.hp - enemyResponse.attack.healedEnemy } : enemy) : roster;
  const landingResponse = activeSplit?.stage === 'impact'
    ? { id: activeSplit.id, stage: 'impact', attack: activeSplit.split.shock } : null;
  const hudRun = beforeImpact ? { ...run, ammo: run.ammo + enemyResponse.attack.ammoLost,
    consumablesBlocked: enemyResponse.attack.consumablesBlocked ? false : run.consumablesBlocked } : run;
  function completeFlight(shot) {
    if (activeFlight.current?.shotId !== shot.shotId) return;
    const lastMotion = shot.contacts?.map(contact => contact.obstacleMotion || contact.logMotion).filter(Boolean)
      .sort((a, b) => a.startTime + a.durationSeconds - b.startTime - b.durationSeconds).at(-1);
    const motionEnd = shot.simulationSeconds > shot.directHitTime ? lastMotion?.samples.at(-1) : null;
    focusRef.current = motionEnd || sampleAtDistance(shot.path, shot.impactDistance);
    activeFlight.current = null;
    controller.completeLaunch(shot.id, () => {
      setImpact(shot.contacts?.length && shot.impactKind !== 'enemy' ? null
        : { id: shot.id, point: sampleAtDistance(shot.path, shot.impactDistance), kind: shot.impactKind,
          obstacleId: shot.impactKind === 'obstacle' ? shot.obstacleId : null,
          obstacleKind: shot.impactKind === 'obstacle' ? shot.obstacleKind : null,
          rollStartDistance: shot.rollStartDistance, impactDistance: shot.impactDistance,
          rollDistance: shot.rollDistance,
          rolling: shot.rollStartDistance !== null && shot.impactDistance > shot.rollStartDistance });
      onFire({shotId:shot.shotId,encounterId:shot.encounterId,reviewResult:true});
    });
    // Keep a grounded candy at its settled position throughout the result review.
  }
  function showFlightContacts(shot, progressTime) {
    const fresh = [];
    for (const contact of shot.contacts || []) {
      if (contact.time > progressTime || triggeredContacts.current.has(contact.obstacleId)) continue;
      triggeredContacts.current.add(contact.obstacleId);
      const before = sampleAtDistance(shot.path, Math.max(0, contact.distance - 4));
      fresh.push({ ...contact, direction: contact.direction || Math.sign(contact.point.x - before.x) || 1,
        id: `${shot.id}-${contact.obstacleId}` });
    }
    if (fresh.length) setVisualContacts(current => [...current, ...fresh]);
  }
  return <>
    <div ref={arenaRef} className={`battle-arena battle-arena--${run.area}`} tabIndex={0} role="group" aria-label="전투 맵"
      data-camera-mode={camera.reducedMotion ? 'overview' : mode}
      data-boss-battle={run.enemies.some(enemy => enemy.isBoss) ? 'true' : undefined}
      data-shot-review={shotReview ? 'true' : undefined}
      data-boss-phase={reviewingSplit ? 'fused' : run.chaosBossPhase || undefined}
      data-boss-transition={activeSplit?.stage || undefined}
      data-aim-phase={shotReview ? 'reviewing' : activeSplit ? 'splitting' : enemyResponse ? 'responding' : state.phase} data-enemy-phase={activeResponse?.stage || 'idle'}
      data-impact-kind={flight?.impactKind || lastImpact?.kind || lastEvent?.shotMeta?.impactKind}
      data-obstacle-id={flight?.obstacleId || lastEvent?.obstacleEffect?.obstacleId || lastImpact?.obstacleId || undefined}
      data-roll-start-distance={flight?.rollStartDistance ?? lastImpact?.rollStartDistance ?? undefined}
      data-roll-distance={flight?.rollDistance ?? lastImpact?.rollDistance ?? undefined}
      data-shot-rolling={flight ? undefined : lastImpact ? (lastImpact.rolling ? 'true' : 'false') : undefined}
      data-aim-inverted={run.pendingAimInversion ? 'true' : undefined}
      data-obstacle-effect={lastEvent?.obstacleEffect?.kind || undefined} aria-describedby="aim-instructions"
      onPointerDown={controller.onPointerDown} onPointerMove={controller.onPointerMove} onPointerUp={controller.onPointerUp}
      onPointerCancel={controller.onPointerCancel} onLostPointerCapture={controller.onLostPointerCapture}
      onContextMenu={controller.onContextMenu} onKeyDown={controller.onKeyDown}>
      <div ref={worldRef} className="arena-world" style={{ width: layout.width, height: layout.height }}>
        <BattlefieldBackdrop area={run.area} layout={layout} motionPaused={Boolean(run.terminal)} />
        {(!activeSplit || activeSplit.stage === 'impact') && <ArenaScenery ref={sceneryRef} layout={layout} area={run.area} toppledObstacleIds={scenery.toppledObstacleIds || []}
          visualContacts={activeSplit ? [] : visualContacts} flight={activeSplit ? null : flight} forestLogDebris={scenery.forestLogDebris || []}
          obstacleDebris={scenery.obstacleDebris || []} />}
        <Slingshot aim={state} run={run} launcherRef={launcherRef} layout={layout} />
        <PlayerCookie characterId={run.characterId} placement={layout.player} aimPhase={state.phase}
          launchId={state.launchId} response={landingResponse || activeResponse} playerHp={bossTransition && bossTransition.stage !== 'impact'
            ? bossTransition.split.shock.playerHpBefore : beforeImpact
            ? enemyResponse.attack.playerHpBefore : run.playerHp} defenseArmed={run.defenseArmed
              || Boolean(bossTransition && bossTransition.stage !== 'impact' && bossTransition.split.shock.blockedBy === 'defense')
              || Boolean(shotReview && enemyResponse?.attack.blockedBy === 'defense')} lastEvent={lastEvent} />
        <svg className="projectile-layer" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
          <TrajectoryPreview path={solution?.path || flight?.path} previewD={solution?.previewD}
            visible={state.phase === 'dragging' && state.hasMoved && Boolean(solution)} />
          {flight && <ProjectileFlight flight={flight} onComplete={completeFlight} onFailure={failLaunch}
            onProgress={({ id, point, time }) => {
              if (activeFlight.current?.id !== id) return;
              const logFocus = sceneryRef.current?.advance(time);
              focusRef.current = time > flight.directHitTime && logFocus ? logFocus : point;
              showFlightContacts(flight, time);
              const fresh = (flight.enemyContacts || []).filter(contact => contact.time <= time && !triggeredEnemies.current.has(contact.id));
              if (fresh.length) {
                fresh.forEach(contact => triggeredEnemies.current.add(contact.id));
                setVisualEnemyContacts(current => [...current, ...fresh]);
              }
            }} />}
          {visualEnemyContacts.map(contact => <g key={contact.id} className="spear-path-contact"
            data-testid="spear-path-contact" data-enemy-id={contact.id}
            transform={`translate(${contact.point.x} ${contact.point.y})`}>
            <circle r="23" /><path d="M-34 0H34M0-27V27M-22-20 22 20M-22 20 22-20" />
          </g>)}
          {visualContacts.map(contact => <ContactEffect key={contact.id} impact={{
            id: contact.id, point: contact.point, obstacleId: contact.obstacleId }}
            obstacles={layout.obstacles} />)}
          {run.area === 'city' && visualContacts.map(contact =>
            <CityGroundBursts key={contact.id} contact={contact} layout={layout} />)}
          {chaosCues.map(cue => cue.kind === 'jar-burst'
            ? <CityGroundBursts key={cue.id} contact={cue.contact} layout={layout} />
            : <ChaosMagicEffect key={cue.id} cue={cue} layout={layout} />)}
          {lastImpact && <ContactEffect key={lastImpact.id} impact={lastImpact} effect={lastEvent?.obstacleEffect} obstacles={layout.obstacles} />}
        </svg>
        {!activeSplit && <MonsterGroup groupRef={enemyGroupRef} enemies={visibleEnemies} placements={layout.enemies} layout={layout} travelMs={travelMs}
          lastEvent={lastEvent} response={activeResponse} selectedTargetId={solution?.selectedTargetId || flight?.selectedTargetId} />}
        {activeSplit && <BossSplitTransition transition={activeSplit} source={splitSource} layout={layout}
          onImpact={onBossImpact} onComplete={onBossComplete} />}
        {activeResponse && <EnemyResponse response={activeResponse} layout={layout} travelMs={travelMs}
          onAdvance={onEnemyAdvance} onComplete={onEnemyComplete} />}
      </div>
      {run.area === 'snow' && visualContacts.map(contact => <FrostField key={contact.id} contact={contact} />)}
      {chaosCues.filter(cue => cue.kind === 'ice-guard').map(cue => <FrostField key={cue.id} contact={cue.contact} />)}
      {chaosCues.length > 0 && <div className="chaos-obstacle-notices">
        {chaosCues.map(cue => <ChaosObstacleNotice key={cue.id} cue={cue} />)}
      </div>}
      {!run.terminal && !bossTransition && <BattlefieldMinimap layout={layout} enemies={run.enemies} aim={state}
        toppledObstacleIds={[...(run.toppledObstacleIds || []), ...visualContacts.map(contact => contact.obstacleId)]} />}
      {activeResponse && <EnemyResponseNotice response={activeResponse} />}
      {activeSplit && <div className="boss-split-notice" role="status">{activeSplit.stage === 'flight'
        ? '융합 붕괴! 세 보스가 흩어집니다' : activeSplit.split.shock.blocked
          ? '착지 충격을 막았어요!' : `착지 충격 · 체력 −${activeSplit.split.shock.damage}${activeSplit.split.shock.damageReduction ? ' · 얼음 보호 50% 감소' : ''}`}</div>}
      <div className="arena-hud">
        <ConsumableTable run={hudRun} disabled={aiming || Boolean(enemyResponse || shotReview || bossTransition)} onConsumable={onConsumable} />
        <MagicCandyCard run={hudRun} hidden={state.phase === 'launching' || Boolean(shotReview || bossTransition)} />
      </div>
    </div>
    <p id="aim-instructions" className="aim-instructions" role="status" aria-live="polite">{shotReview
      ? '발사 결과 확인 중 · 잠시 후 다음 턴으로 이어집니다.' : activeSplit ? '보스 분리 중 · 착지가 끝나면 다시 조준할 수 있어요.' : enemyResponse
      ? '적의 반격 중 · 쉴드는 적의 공격과 특수 효과를 막아줍니다.' : retry || (run.pendingAimInversion
        ? state.phase === 'dragging' ? '혼돈의 역풍 · 드래그 방향이 양 축 모두 반대로 적용 중 · 놓으면 발사' : '혼돈의 역풍 · 다음 한 발 조작 반전'
        : INSTRUCTIONS[state.phase])}</p>
  </>;
}
