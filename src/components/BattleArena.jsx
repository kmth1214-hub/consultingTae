import React, { useRef, useState } from 'react';
import { ASSETS } from '../game/assetCatalog.js';
import AssetImage from './AssetImage.jsx';
import ConsumableTable from './ConsumableTable.jsx';
import MagicCandyCard from './MagicCandyCard.jsx';
import MonsterGroup from './MonsterGroup.jsx';
import ArenaScenery from './ArenaScenery.jsx';
import Slingshot from './Slingshot.jsx';
import TrajectoryPreview from './TrajectoryPreview.jsx';
import ProjectileFlight from './ProjectileFlight.jsx';
import { ARENA, monsterPositions } from '../game/arenaLayout.js';
import { getTrajectory, getSlingshotDraw, getHitDetails } from '../game/trajectory.js';
import { useAimController } from '../game/useAimController.js';

const INSTRUCTIONS = {
  idle: '새총을 마우스로 누른 채 위아래로 움직여 각도를 잡으세요.',
  angle: '마우스를 누른 채 Space를 길게 눌러 힘을 모으세요.',
  power: 'Space를 놓으면 힘이 고정됩니다. 마우스는 계속 누르고 있으세요.',
  direction: '마우스를 좌우로 움직여 목표를 잡고, 버튼을 놓아 발사하세요.',
  launching: '사탕이 날아가고 있어요!'
};

export default function BattleArena({ run, aim, lastEvent, setAim, onFire, onConsumable, arenaRef }) {
  const worldRef = useRef(null), launcherRef = useRef(null), enemyGroupRef = useRef(null), svgRef = useRef(null);
  const [flight, setFlight] = useState(null);
  const positions = monsterPositions(run.enemies).filter(enemy => enemy.alive);
  const closestTarget = x => positions.reduce((best, enemy) => !best || Math.abs(enemy.x - x) < Math.abs(best.x - x) ? enemy : best, null)?.id;
  const makePath = state => {
    const draw = getSlingshotDraw(state.angleDeg, state.powerPercent);
    const homing = run.weapons.some(weapon => weapon.id === 'wind-candy') && !run.roundEffects.windHomingUsed
      ? positions.find(enemy => enemy.id === closestTarget(state.targetX)) : null;
    return getTrajectory({ start: { x: 168 + draw.pouch.x, y: 504 + draw.pouch.y },
      targetX: state.targetX, angleDeg: state.angleDeg, powerPercent: state.powerPercent,
      worldWidth: ARENA.width, worldHeight: ARENA.height,
      homingTarget: homing ? { id: homing.id, x: homing.x, y: homing.y - homing.size / 2 } : null });
  };
  function startFlight(state) {
    const path = makePath(state);
    let hits = [];
    let geometryAvailable = false;
    try {
      const rects = Array.from(enemyGroupRef.current?.querySelectorAll('[data-enemy-id]') || []).map(node => {
        const rect = node.getBoundingClientRect();
        return { id: node.dataset.enemyId, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      });
      const matrix = svgRef.current?.getScreenCTM();
      geometryAvailable = Boolean(path && matrix && Number.isFinite(matrix.a * matrix.d - matrix.b * matrix.c)
        && Math.abs(matrix.a * matrix.d - matrix.b * matrix.c) > 1e-10);
      hits = getHitDetails(path, rects, matrix);
    } catch { /* Disconnected/missing geometry is a miss, never a stalled launch. */ }
    const homingHit = path?.homingTargetId ? hits.find(hit => hit.id === path.homingTargetId) : null;
    if (homingHit) hits = hits.filter(hit => hit.distance >= homingHit.distance);
    setFlight({ id: state.launchId, path, hitIds: hits.map(hit => hit.id), impactDistance: hits[0]?.distance ?? path?.length ?? 0,
      selectedTargetId: geometryAvailable ? closestTarget(state.targetX) : null, fireball: run.fireballArmed });
  }
  const controller = useAimController({ arenaRef, worldRef, launcherRef, enemyGroupRef,
    ammo: run.ammo, disabled: Boolean(run.terminal), onLaunch: startFlight, onCancel: () => setFlight(null),
    onAimChange: state => setAim({ phase: state.phase, angle: state.angleDeg, power: state.powerPercent }) });
  const state = controller.aimState;
  const aiming = state.phase !== 'idle';
  const path = state.phase === 'direction' ? makePath(state) : flight?.path;
  function completeFlight(shot) {
    controller.completeLaunch(shot.id, () => onFire({ hitIds: shot.hitIds, selectedTargetId: shot.selectedTargetId }));
    setFlight(current => current?.id === shot.id ? null : current);
  }
  const instructions = state.phase === 'direction' && state.hasSelectedDirection
    ? '준비됐어요. 마우스 버튼을 놓으면 발사합니다. Esc로 취소할 수 있어요.' : INSTRUCTIONS[state.phase];
  return <>
    <div ref={arenaRef} className={`battle-arena battle-arena--${run.area}`} tabIndex={0} role="group" aria-label="전투 맵"
      data-aim-phase={state.phase} aria-describedby="aim-instructions"
      onPointerDown={controller.onPointerDown} onPointerMove={controller.onPointerMove} onPointerUp={controller.onPointerUp}
      onPointerCancel={controller.onPointerCancel} onLostPointerCapture={controller.onLostPointerCapture}
      onKeyDown={controller.onKeyDown} onKeyUp={controller.onKeyUp}>
      <div ref={worldRef} className="arena-world" style={{ transformOrigin: '0 0',
        transform: `translateY(${-81.25 * (state.cameraScale - 1)}%) scale(${state.cameraScale})` }}>
        {run.area === 'forest' ? <>
          <AssetImage className="scene-layer scene-distant" src={ASSETS.forestLayers.distant} />
          <AssetImage className="scene-layer scene-midground" src={ASSETS.forestLayers.midground} />
          <AssetImage className="scene-layer scene-path" src={ASSETS.forestLayers.path} />
        </> : <AssetImage className="scene-layer scene-distant" src={ASSETS.maps[run.area]} />}
        <ArenaScenery area={run.area} />
        <Slingshot aim={state} run={run} lastEvent={lastEvent} launcherRef={launcherRef} />
        {run.area === 'forest' && <AssetImage className="scene-layer scene-foreground" src={ASSETS.forestLayers.foreground} />}
        <svg ref={svgRef} className="projectile-layer" viewBox="0 0 1200 800" aria-hidden="true">
          <TrajectoryPreview path={path} visible={state.phase === 'direction'} />
          {flight && <ProjectileFlight flight={flight} onComplete={completeFlight} />}
        </svg>
        <MonsterGroup groupRef={enemyGroupRef} enemies={run.enemies} lastEvent={lastEvent} disabled={aiming}
          selectedTargetId={state.phase === 'direction' && state.hasSelectedDirection ? closestTarget(state.targetX) : aim.selectedTargetId}
          onSelectTarget={selectedTargetId => setAim({ selectedTargetId })} />
      </div>
      <div className="arena-hud">
        <ConsumableTable run={run} disabled={aiming} onConsumable={onConsumable} />
        <MagicCandyCard run={run} hidden={state.phase === 'launching'} />
      </div>
    </div>
    <p id="aim-instructions" className="aim-instructions" role="status" aria-live="polite">{instructions}</p>
  </>;
}
