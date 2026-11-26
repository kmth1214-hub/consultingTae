import React, { useEffect, useMemo, useRef, useState } from 'react';
import ConsumableTable from './ConsumableTable.jsx';
import StoneRack from './StoneRack.jsx';
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
import { pathPrefixD, planShot, sampleAtDistance, sampleVortexPosition, shotDisruptionOptions } from '../game/shotGeometry.js';
import { AIM_DISRUPTION_LABELS } from '../game/gameData.js';
import { useAimController } from '../game/useAimController.js';
import { useBattlefieldCamera } from '../game/useBattlefieldCamera.js';
import { getChaosObstacleCues } from '../game/chaosObstacleFeedback.js';
import BossSplitTransition from './BossSplitTransition.jsx';
import { sampleRiderMotion } from '../game/forestLogPhysics.js';
import { buildWindField } from '../game/windField.js';
import WindWeather from './WindWeather.jsx';

const INSTRUCTIONS = {
  idle: '맵 어디든 누르고 뒤로 당긴 뒤 놓으세요. 당긴 반대 방향으로 발사됩니다.',
  dragging: '당긴 거리로 힘을, 방향으로 궤도를 조절하세요. 놓으면 발사 · Esc로 취소',
  launching: '사탕이 날아가고 있어요!',
};

export default function BattleArena({ run, lastEvent, enemyResponse, shotReview, onReviewComplete, bossTransition,
  onBossImpact, onBossComplete,
  onBeginShot, onCancelShot, onActivateFlightAbility,
  onEnemyAdvance, onEnemyComplete, setAim, onFire, onConsumable, onLoadStone, arenaRef, studioDepthEnabled = false }) {
  const rebuilt = import.meta.env.DEV && run.studioDepthPreview === true && studioDepthEnabled === true;
  const [RebuiltScene, setRebuiltScene] = useState(null);
  const [sceneLoadError, setSceneLoadError] = useState(null);
  useEffect(() => {
    if (!rebuilt || RebuiltScene) return undefined;
    let active = true;
    import('../dev/StudioRebuiltScene.jsx').then(
      module => { if (active) setRebuiltScene(() => module.default); },
      error => { if (active) setSceneLoadError(error); }
    );
    return () => { active = false; };
  }, [rebuilt, RebuiltScene]);
  const worldRef = useRef(null), launcherRef = useRef(null), enemyGroupRef = useRef(null), focusRef = useRef(null);
  const sceneryRef = useRef(null);
  const crowTimeRef = useRef(null);
  const movedEnemyRef = useRef(new Map());
  const reviewingSplit = Boolean(bossTransition && shotReview);
  const activeSplit = bossTransition && !shotReview ? bossTransition : null;
  const roster = reviewingSplit ? [bossTransition.split.fromEnemy] : run.enemies;
  const scenery = reviewingSplit ? bossTransition.split.previousScenery : run;
  const slotKey = JSON.stringify(roster.map(({ id, kind, isBoss }) => [id, kind, isBoss]));
  const encounterPhase = reviewingSplit ? null : run.chaosBossPhase === 'split' ? 'split' : null;
  const landingKey = JSON.stringify(run.enemyLandingPositions || null);
  const poseKey = JSON.stringify(!reviewingSplit ? run.enemyPositionOverrides : null);
  const ventStateKey = JSON.stringify(run.area === 'city' && run.round === 3
    ? run.enemies.map(enemy => [enemy.id, enemy.attackCount || 0, Boolean(enemy.ventWeakened), enemy.alive]) : []);
  const layout = useMemo(() => buildPlayableBattlefield({ area: run.area, round: run.round,
    seed: run.layoutSeed ?? 0, encounterPhase,
    prototype: run.battlefieldPrototype ?? run.studioPrototype ?? null,
    worldScale: run.studioWorldScale ?? run.battlefieldWorldScale ?? 1,
    enemyScale: run.studioEnemyScale ?? 1,
    enemyLandingPositions: run.enemyLandingPositions ?? null,
    enemyPositionOverrides: JSON.parse(poseKey ?? 'null'),
    enemies: JSON.parse(slotKey).map(([id, kind, isBoss]) => {
      const vent = JSON.parse(ventStateKey).find(item => item[0] === id);
      return { id, kind, isBoss, alive: vent ? vent[3] : true, hp: 1,
        attackCount: vent?.[1] || 0, ventWeakened: vent?.[2] || false };
    }) }),
  [run.area, run.round, run.layoutSeed, run.battlefieldPrototype, run.studioPrototype,
    run.studioWorldScale, run.battlefieldWorldScale, run.studioEnemyScale, slotKey, encounterPhase, landingKey, poseKey, ventStateKey]);
  const splitSource = useMemo(() => bossTransition ? buildPlayableBattlefield({ area: run.area, round: run.round,
    seed: run.layoutSeed ?? 0, enemies: [bossTransition.split.fromEnemy],
    worldScale: run.studioWorldScale ?? run.battlefieldWorldScale ?? 1,
    enemyScale: run.studioEnemyScale ?? 1 }).enemies[0] : null,
  [bossTransition?.id, run.area, run.round, run.layoutSeed, run.studioWorldScale, run.battlefieldWorldScale, run.studioEnemyScale]);
  const windField = useMemo(() => buildWindField({ area: run.area, round: run.round,
    layoutSeed: run.layoutSeed ?? 0, shotOrdinal: run.playerShotsFired ?? 0, layout }),
  [run.area, run.round, run.layoutSeed, run.playerShotsFired, layout]);
  const [flight, setFlight] = useState(null), [lastImpact, setImpact] = useState(null), [retry, setRetry] = useState('');
  const [overviewHeld, setOverviewHeld] = useState(false);
  const [lastShotGuide, setLastShotGuide] = useState(null);
  const encounterKey = `${run.area}:${run.round}:${run.layoutSeed ?? 0}:${run.chaosBossPhase ?? ''}`;
  useEffect(() => { setLastShotGuide(null); }, [encounterKey]);
  const [visualContacts, setVisualContacts] = useState([]);
  const [visualEnemyContacts, setVisualEnemyContacts] = useState([]);
  const [visualAbilities, setVisualAbilities] = useState([]);
  const triggeredAbilities = useRef(new Set());
  const triggeredEnemies = useRef(new Set());
  const chaosCues = useMemo(() => activeSplit ? [] : getChaosObstacleCues({ area: run.area, layout, event: lastEvent }), [run.area, layout, lastEvent, activeSplit]);
  const activeFlight = useRef(null), triggeredContacts = useRef(new Set());
  const flightTimeRef = useRef(0);
  const reviewId = shotReview?.id;
  useEffect(() => {
    if (reviewId == null) return;
    const timer = setTimeout(() => { crowTimeRef.current = null; setFlight(null); onReviewComplete(reviewId); }, 2000);
    return () => clearTimeout(timer);
  }, [reviewId, onReviewComplete]);
  const activeResponse = shotReview ? null : enemyResponse;
  useEffect(() => {
    if (!activeSplit) return;
    clearFlight(); setImpact(null);
  }, [activeSplit?.id]);
  const makeSolution = pull => planShot({ layout, pull, enemies: run.enemies,
    flightStartMs: Date.now(),
    windField,deferAbility:true,
    ...shotDisruptionOptions(run),
    prototype: run.battlefieldPrototype ?? run.studioPrototype ?? null,
    loadedCandyId: run.weapons.find(weapon => weapon.instanceId ===
      (run.weaponQueue?.[0] ?? run.currentWeaponId))?.id ?? null,
    loadedCandyGrade: run.weapons.find(weapon => weapon.instanceId ===
      (run.weaponQueue?.[0] ?? run.currentWeaponId))?.grade ?? 'C',
    piercing: run.spearArmed === true,
    toppledObstacleIds: run.toppledObstacleIds || [],
    windAvailable: run.weapons.find(weapon => weapon.instanceId ===
      (run.weaponQueue?.[0] ?? run.currentWeaponId))?.id === 'wind-candy' && run.windArmedMode === 'homing' });
  function clearFlight() {
    if (activeFlight.current) onCancelShot(activeFlight.current.shotId);
    for (const [id] of movedEnemyRef.current) {
      const slot = layout.enemies.find(enemy => enemy.id === id);
      if (slot) moveEnemyMarker(id, slot);
    }
    movedEnemyRef.current.clear();
    activeFlight.current = null; flightTimeRef.current = 0; crowTimeRef.current = null; setFlight(null); setVisualContacts([]); setVisualEnemyContacts([]);
    setVisualAbilities([]); triggeredAbilities.current.clear();
    triggeredContacts.current.clear(); triggeredEnemies.current.clear();
  }
  function failLaunch() { controller.cancelAim(); setRetry('조준을 다시 잡고 당겨 주세요.'); }
  function startFlight(pull) {
    if (!camera.valid) { failLaunch(); return; }
    const reservation = onBeginShot({launchId:pull.launchId,pull});
    if (!reservation.accepted) { failLaunch(); return; }
    const shot = reservation.flight;
    activeFlight.current = shot;
    flightTimeRef.current = 0;
    crowTimeRef.current = shot.flightStartMs;
    triggeredContacts.current.clear();
    triggeredEnemies.current.clear(); setVisualEnemyContacts([]);
    triggeredAbilities.current.clear(); setVisualAbilities([]);
    setVisualContacts([]);
    focusRef.current = shot.path.start;
    setFlight(shot);
  }
  function activateAbility(source, simulationTime = flightTimeRef.current) {
    const shot = activeFlight.current;
    if (!shot?.abilityKindPending) return null;
    const result = onActivateFlightAbility({ shotId: shot.shotId, encounterId: shot.encounterId,
      simulationTime, source });
    if (!result?.accepted) return null;
    activeFlight.current = result.flight;
    setFlight(result.flight);
    if (source === 'auto-contact' && shot.loadedStoneId === 'wizard-orb'
      && shot.impactKind === 'enemy' && Math.abs(simulationTime - shot.directHitTime) < 1e-3
      && shot.hitIds.length > 0 && result.flight.splitOrbs) {
      const point = result.flight.abilityActivation.point;
      setVisualEnemyContacts(current => [...current, { id: shot.hitIds[0], point }]);
      setVisualAbilities(current => [...current, { id: `${shot.id}-auto-split`,
        kind: 'wizard-auto-split', point }]);
    }
    return result;
  }
  useEffect(() => {
    const onSpace = event => {
      if (event.code !== 'Space' || event.repeat || event.ctrlKey || event.metaKey || event.altKey
        || /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target?.tagName)) return;
      if (activeFlight.current?.abilityKindPending) {
        event.preventDefault();
        activateAbility('space');
      }
    };
    window.addEventListener('keydown', onSpace);
    return () => window.removeEventListener('keydown', onSpace);
  }, [onActivateFlightAbility]);
  const controller = useAimController({ arenaRef, ammo: run.ammo, invertDirection: run.pendingAimInversion,
    maxPowerRatio: shotDisruptionOptions(run).maxPowerRatio,
    disabled: Boolean(run.terminal || enemyResponse || shotReview || bossTransition), onLaunch: startFlight, onCancel: clearFlight,
    onAimChange: state => {
      if (state.phase === 'dragging') { setImpact(null); setRetry(''); setVisualContacts([]); }
      setAim({ phase: state.phase, angle: state.angleDeg, power: state.powerRatio * 100, selectedTargetId: null });
    } });
  const state = controller.aimState;
  const previousAimPhase = useRef(state.phase);
  useEffect(() => {
    if (previousAimPhase.current === 'dragging' && state.phase !== 'dragging') setOverviewHeld(false);
    previousAimPhase.current = state.phase;
  }, [state.phase]);
  useEffect(() => {
    const onKeyDown = event => {
      if (event.code !== 'KeyV' || event.repeat || event.ctrlKey || event.metaKey || event.altKey
        || /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target?.tagName)) return;
      setOverviewHeld(true);
    };
    const onKeyUp = event => { if (event.code === 'KeyV') setOverviewHeld(false); };
    const onBlur = () => setOverviewHeld(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  const mode = activeSplit ? 'split' : shotReview ? 'follow' : enemyResponse ? 'enemy' : flight ? 'follow'
    : state.phase === 'dragging' && !overviewHeld ? 'aim' : 'overview';
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
  const hitEffectsEnabled = run.studioPrototype === 'forest-elevated-v1' && run.area === 'forest';
  const hudRun = beforeImpact ? { ...run, ammo: run.ammo + enemyResponse.attack.ammoLost,
    consumablesBlocked: enemyResponse.attack.consumablesBlocked ? false : run.consumablesBlocked } : run;
  function completeFlight(shot) {
    if (activeFlight.current?.shotId !== shot.shotId) return;
    if (shot.path && Number.isFinite(shot.path.length) && shot.path.length > 0) {
      const endpoints = [shot.impactDistance, shot.rollStartDistance, shot.blockerDistance,
        ...(shot.enemyContacts || []).map(contact => contact.distance),
        ...(shot.contacts || []).filter(contact => contact.trigger === 'candy').map(contact => contact.distance)]
        .filter(distance => Number.isFinite(distance) && distance >= 0 && distance <= shot.path.length);
      const distance = endpoints.length ? Math.min(...endpoints) : shot.path.length;
      const point = sampleAtDistance(shot.path, distance);
      setLastShotGuide({ encounterKey, point,
        previewD: pathPrefixD(shot.path, distance * .8) });
    }
    const lastMotion = shot.contacts?.map(contact => contact.obstacleMotion || contact.logMotion).filter(Boolean)
      .sort((a, b) => a.startTime + a.durationSeconds - b.startTime - b.durationSeconds).at(-1);
    const motionEnd = shot.simulationSeconds > shot.directHitTime ? lastMotion?.samples.at(-1) : null;
    focusRef.current = motionEnd || sampleAtDistance(shot.path, shot.impactDistance);
    activeFlight.current = null;
    crowTimeRef.current = null;
    movedEnemyRef.current.clear();
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
  function showAbilityContacts(shot, progressTime) {
    const cues = [
      ...(shot.abilityContacts || []).map((contact, index) => ({ ...contact,
        id: `${shot.id}-ability-${index}` })),
      ...(shot.splitOrbs?.children || []).flatMap(child => [
        ...child.wobbles.map((wobble, index) => ({ ...wobble, kind: 'wobble',
          id: `${shot.id}-${child.id}-wobble-${index}` })),
        ...(child.hit ? [{ ...child.hit, kind: 'child-hit',
          id: `${shot.id}-${child.id}-hit` }] : [])
      ])
    ];
    const fresh = cues.filter(cue => cue.time <= progressTime && !triggeredAbilities.current.has(cue.id));
    if (fresh.length) {
      fresh.forEach(cue => triggeredAbilities.current.add(cue.id));
      setVisualAbilities(current => [...current, ...fresh]);
    }
  }
  function moveFallingRiders(shot, time) {
    for (const move of shot.vortex?.moves ?? []) {
      if (time < move.startTime) continue;
      const position = sampleVortexPosition(move, time);
      movedEnemyRef.current.set(move.enemyId, position);
      moveEnemyMarker(move.enemyId, position);
    }
    for (const contact of shot.contacts || []) {
      const motion = contact.riderMotion;
      if (!motion || time < motion.startTime) continue;
      const vortexFall = shot.vortex?.moves.find(move => move.enemyId === motion.enemyId)?.fall;
      if (vortexFall && vortexFall.startTime < motion.startTime) continue;
      moveEnemyMarker(motion.enemyId, sampleRiderMotion(motion, time));
    }
  }
  function moveEnemyMarker(id, position) {
    const slot = layout.enemies.find(enemy => enemy.id === id);
    if (!slot) return;
    const monster = [...enemyGroupRef.current?.querySelectorAll('[data-enemy-id]') || []]
      .find(node => node.dataset.enemyId === id);
    if (monster) { monster.style.left = `${position.x}px`; monster.style.top = `${position.y}px`; }
    const marker = [...arenaRef.current?.querySelectorAll('[data-minimap-enemy]') || []]
      .find(node => node.dataset.minimapEnemy === id);
    if (marker) {
      marker.style.left = `${position.x / layout.width * 100}%`;
      marker.style.top = `${(position.y - slot.size * .42) / layout.height * 100}%`;
    }
  }
  const manualStone = ['cherry-bomb', 'vortex'].includes(flight?.abilityKindPending);
  const frozenCueIds = flight && !shotReview ? (visualAbilities.find(cue => cue.kind === 'freeze')?.targetIds ?? [])
    : shotReview ? (lastEvent?.frozenEnemyIds ?? []) : [];
  if (rebuilt && sceneLoadError) throw sceneLoadError;
  return <>
    <div ref={arenaRef} className={`battle-arena battle-arena--${run.area}`} tabIndex={0} role="group" aria-label="전투 맵"
      data-camera-mode={camera.reducedMotion ? 'overview' : mode}
      data-studio-scene={run.studioDepthPreview === true ? (rebuilt ? 'rebuilt' : 'original') : undefined}
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
      data-aim-disruption={run.pendingAimDisruption || undefined}
      data-wind-direction={windField.direction > 0 ? 'right' : 'left'}
      data-obstacle-effect={lastEvent?.obstacleEffect?.kind || undefined} aria-describedby="aim-instructions"
      onPointerDown={event => {
        if (activeFlight.current?.abilityKindPending) {
          if (event.button === 0 && !event.target.closest('button, input, a')) activateAbility('click');
          return;
        }
        controller.onPointerDown(event);
      }} onPointerMove={controller.onPointerMove} onPointerUp={controller.onPointerUp}
      onPointerCancel={controller.onPointerCancel} onLostPointerCapture={controller.onLostPointerCapture}
      onContextMenu={controller.onContextMenu} onKeyDown={controller.onKeyDown}>
      <div ref={worldRef} className="arena-world" data-layout-key={layout.key}
        style={{ width: layout.width, height: layout.height }}>
        {rebuilt && RebuiltScene
          ? <RebuiltScene area={run.area} layout={layout} motionPaused={Boolean(run.terminal)}
            toppledObstacleIds={scenery.toppledObstacleIds || []} />
          : <BattlefieldBackdrop area={run.area} motionPaused={Boolean(run.terminal)} />}
        <WindWeather area={run.area} field={windField} paused={Boolean(run.terminal)} />
        {(!activeSplit || activeSplit.stage === 'impact') && <ArenaScenery ref={sceneryRef} layout={layout} area={run.area} toppledObstacleIds={scenery.toppledObstacleIds || []}
          visualContacts={activeSplit ? [] : visualContacts} visualWobbles={visualAbilities.filter(cue => cue.kind === 'wobble')}
          flight={activeSplit ? null : flight} forestLogDebris={scenery.forestLogDebris || []}
          obstacleDebris={scenery.obstacleDebris || []} />}
        <Slingshot aim={state} run={run} launcherRef={launcherRef} layout={layout} />
        <PlayerCookie characterId={run.characterId} placement={layout.player} aimPhase={state.phase}
          hitEffectsEnabled={hitEffectsEnabled}
          launchId={state.launchId} response={landingResponse || activeResponse} playerHp={bossTransition && bossTransition.stage !== 'impact'
            ? bossTransition.split.shock.playerHpBefore : beforeImpact
            ? enemyResponse.attack.playerHpBefore : run.playerHp} defenseArmed={run.defenseArmed || run.milkShieldPending || run.milkShieldActive
              || Boolean(bossTransition && bossTransition.stage !== 'impact' && bossTransition.split.shock.blockedBy === 'defense')
              || Boolean(shotReview && enemyResponse?.attack.blockedBy === 'defense')} lastEvent={lastEvent} />
        <svg className="projectile-layer" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
          {state.phase === 'dragging' && !shotReview && !enemyResponse
            && lastShotGuide?.encounterKey === encounterKey && <>
              <path data-testid="last-shot-guide" className="last-shot-arc" d={lastShotGuide.previewD}
                fill="none" vectorEffect="non-scaling-stroke" />
              {lastShotGuide.point.x >= 0 && lastShotGuide.point.x <= layout.width
                && lastShotGuide.point.y >= 0 && lastShotGuide.point.y <= layout.height &&
                <g data-testid="last-shot-impact" className="last-shot-impact"
                  transform={`translate(${lastShotGuide.point.x} ${lastShotGuide.point.y})`}>
                  <circle r="19" fill="none" vectorEffect="non-scaling-stroke" />
                  <path d="M-9 0H9M0 -9V9" vectorEffect="non-scaling-stroke" />
                </g>}
            </>}
          <TrajectoryPreview path={solution?.path || flight?.path} previewD={solution?.previewD}
            visible={run.windArmedMode !== 'homing' && state.phase === 'dragging' && state.hasMoved && Boolean(solution)} />
          {flight && <ProjectileFlight flight={flight} onComplete={completeFlight} onFailure={failLaunch}
            onProgress={({ id, point, focusPoint, time }) => {
              if (activeFlight.current?.id !== id) return;
              flightTimeRef.current = time;
              const live = activeFlight.current;
              if (live.abilityKindPending && live.abilityDeadlineTime !== null
                && time >= live.abilityDeadlineTime - 1e-4) {
                const activation = activateAbility(live.abilityDeadlineSource, live.abilityDeadlineTime);
                if (activation) return activation;
              }
              crowTimeRef.current = flight.flightStartMs + time * 1000;
              const logFocus = sceneryRef.current?.advance(time);
              focusRef.current = time > flight.directHitTime && logFocus ? logFocus : focusPoint || point;
              showFlightContacts(flight, time);
              showAbilityContacts(flight, time);
              moveFallingRiders(flight, time);
              const fresh = (flight.enemyContacts || []).filter(contact => contact.time <= time && !triggeredEnemies.current.has(contact.id));
              if (fresh.length) {
                fresh.forEach(contact => triggeredEnemies.current.add(contact.id));
                setVisualEnemyContacts(current => [...current, ...fresh]);
              }
            }} />}
          {visualEnemyContacts.map(contact => <g key={contact.id}
            className={flight?.abilityKind === 'bounce' ? 'bounce-hit-contact' : 'spear-path-contact'}
            data-testid={flight?.abilityKind === 'bounce' ? 'bounce-hit-contact' : 'spear-path-contact'} data-enemy-id={contact.id}
            transform={`translate(${contact.point.x} ${contact.point.y})`}>
            <circle r="23" /><path d="M-34 0H34M0-27V27M-22-20 22 20M-22 20 22-20" />
          </g>)}
          {visualContacts.map(contact => <ContactEffect key={contact.id} impact={{
            id: contact.id, point: contact.point, obstacleId: contact.obstacleId }}
            obstacles={layout.obstacles} />)}
      {visualAbilities.filter(cue => cue.kind === 'explosion' || cue.kind === 'splash').map(cue => <g key={cue.id}
            data-testid="alchemist-explosion" className={`alchemist-explosion ${cue.success ? 'is-success' : 'is-failure'}`} transform={`translate(${cue.point.x} ${cue.point.y})`}>
            <circle className="alchemist-explosion__wash" r={cue.radius} />
            <circle className="alchemist-explosion__ring" r={cue.radius * .78} />
            <circle className="alchemist-explosion__inner" r={cue.radius * .36} />
            <circle className="alchemist-explosion__core" r="48" />
            {Array.from({ length: 10 }, (_, index) => {
              const angle = index * Math.PI / 5;
              const near = cue.radius * .18, far = cue.radius * .45;
              return <path key={index} className="alchemist-explosion__spark"
                d={`M${Math.cos(angle) * near} ${Math.sin(angle) * near}L${Math.cos(angle) * far} ${Math.sin(angle) * far}`} />;
            })}
          </g>)}
          {visualAbilities.filter(cue => cue.kind === 'child-hit').map(cue => <g key={cue.id}
            data-testid="wizard-child-hit" className="wizard-child-hit" transform={`translate(${cue.point.x} ${cue.point.y})`}>
            <circle r="24" fill="none" stroke="#b6eaff" strokeWidth="5" />
          </g>)}
          {visualAbilities.filter(cue => cue.kind === 'cherry-bomb').map(cue => <g key={cue.id}
            className="cherry-blast" data-testid="cherry-blast" transform={`translate(${cue.point.x} ${cue.point.y})`}>
            <circle r={cue.radius} />
            <path d="M0-68 11-21 58-34 27 0 58 32 9 21 0 68-12 21-54 37-26 0-56-31-13-21Z" />
          </g>)}
          {run.area === 'city' && visualContacts.map(contact =>
            <CityGroundBursts key={contact.id} contact={contact} layout={layout} />)}
          {chaosCues.map(cue => cue.kind === 'jar-burst'
            ? <CityGroundBursts key={cue.id} contact={cue.contact} layout={layout} />
            : <ChaosMagicEffect key={cue.id} cue={cue} layout={layout} />)}
          {lastImpact && <ContactEffect key={lastImpact.id} impact={lastImpact} effect={lastEvent?.obstacleEffect} obstacles={layout.obstacles} />}
        </svg>
        {!activeSplit && <MonsterGroup groupRef={enemyGroupRef} enemies={visibleEnemies} placements={layout.enemies} layout={layout} travelMs={travelMs}
          patrolTimeRef={crowTimeRef} movedEnemyRef={movedEnemyRef} frozenCueIds={frozenCueIds}
          hitEffectsEnabled={hitEffectsEnabled} showDefeatedHit={Boolean(shotReview)}
          studioMonsterPrototype={run.studioMonsterPrototype}
          lastEvent={lastEvent} response={activeResponse} selectedTargetId={solution?.selectedTargetId || flight?.selectedTargetId} />}
        {visualAbilities.some(cue => cue.kind === 'wizard-auto-split') &&
          <svg className="wizard-auto-split-layer" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
            {visualAbilities.filter(cue => cue.kind === 'wizard-auto-split').map(cue =>
              <g key={cue.id} data-testid="wizard-auto-split" className="wizard-auto-split-burst"
                transform={`translate(${cue.point.x} ${cue.point.y})`}>
                <circle className="wizard-auto-split-ring" r="46" />
                <circle className="wizard-auto-split-core" r="20" />
                <path d="M-22 0H-92M22 0H92M-12-12L-58-55M12-12L58-55M-12 12L-58 55M12 12L58 55" />
              </g>)}
          </svg>}
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
        toppledObstacleIds={[...(run.toppledObstacleIds || []), ...visualContacts.map(contact => contact.obstacleId)]}
        movedEnemyRef={movedEnemyRef} patrolTimeRef={crowTimeRef} />}
      {activeResponse && <EnemyResponseNotice response={activeResponse} />}
      {activeSplit && <div className="boss-split-notice" role="status">{activeSplit.stage === 'flight'
        ? '융합 붕괴! 세 보스가 흩어집니다' : activeSplit.split.shock.blocked
          ? '착지 충격을 막았어요!' : `착지 충격 · 체력 −${activeSplit.split.shock.damage}${activeSplit.split.shock.damageReduction ? ' · 얼음 보호 50% 감소' : ''}`}</div>}
      <div className="arena-hud">
        {manualStone && !shotReview && <button type="button" className="signature-activation"
          onKeyDown={event => { if (event.code === 'Space') event.stopPropagation(); }}
          onClick={() => activateAbility('click')}>
          {flight.abilityKindPending === 'cherry-bomb' ? '폭탄 설치' : '소용돌이 발동'}
        </button>}
        <div className="stone-controls">
          <ConsumableTable run={hudRun} disabled={aiming || Boolean(enemyResponse || shotReview || bossTransition)} onConsumable={onConsumable} />
          <StoneRack run={run} onLoadStone={onLoadStone}
            disabled={aiming || Boolean(run.terminal || enemyResponse || shotReview || bossTransition || run.windArmedMode)} />
        </div>
        <MagicCandyCard run={hudRun} hidden={state.phase === 'launching' || Boolean(shotReview || bossTransition
          || (run.studioMonsterPrototype === 'regional-monsters-v1' && enemyResponse))} />
      </div>
    </div>
    <p id="aim-instructions" className="aim-instructions" role="status" aria-live="polite">{shotReview
      ? lastEvent?.enemyAttack?.frozenSkip ? '빙결된 적이 반격을 한 번 건너뛰었어요.' : '발사 결과 확인 중 · 잠시 후 다음 턴으로 이어집니다.'
      : activeSplit ? '보스 분리 중 · 착지가 끝나면 다시 조준할 수 있어요.' : enemyResponse
      ? '적의 반격 중 · 쉴드는 적의 공격과 특수 효과를 막아줍니다.' : retry || (run.pendingAimDisruption
        ? `${AIM_DISRUPTION_LABELS[run.pendingAimDisruption]} · ${INSTRUCTIONS[state.phase]}` : run.pendingAimInversion
        ? state.phase === 'dragging' ? '혼돈의 역풍 · 드래그 방향이 양 축 모두 반대로 적용 중 · 놓으면 발사' : '혼돈의 역풍 · 다음 한 발 조작 반전'
        : INSTRUCTIONS[state.phase])}{state.phase === 'dragging' && !shotReview && !enemyResponse
        ? ' · V를 누르는 동안 전체 전장 보기' : ''}</p>
  </>;
}
