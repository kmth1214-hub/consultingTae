import {buildPlayableBattlefield} from './battlefieldPlacement.js';
import {planShot,shotDisruptionOptions,activatePlannedAbility,sampleAtDistance} from './shotGeometry.js';
import { buildWindField, crossedWindZone } from './windField.js';
import { STONE_STATS } from './signatureStones.js';

function abilityDeadline(shot, signature) {
  const firstContact = Math.min(...shot.contacts.filter(contact => contact.trigger === 'candy').map(contact => contact.time),
    shot.hitIds.length || shot.impactKind === 'obstacle' ? shot.directHitTime : Infinity);
  const landing = signature && shot.rollStartDistance !== null
    ? sampleAtDistance(shot.path, shot.rollStartDistance).time
    : shot.impactKind === 'ground' ? shot.path.durationSeconds : null;
  if (landing !== null && landing + .5 < firstContact) return { time: landing + .5, source: 'auto-ground', landing };
  if (Number.isFinite(firstContact)) return { time: firstContact, source: 'auto-contact', landing };
  return { time: null, source: null, landing };
}

function layoutForRun(run) {
  return buildPlayableBattlefield({area:run.area,round:run.round,enemies:run.enemies,
    seed:run.layoutSeed??0,encounterPhase:run.chaosBossPhase==='split'?'split':null,
    prototype:run.battlefieldPrototype??run.studioPrototype??null,
    enemyLandingPositions:run.enemyLandingPositions??null,
    enemyPositionOverrides:run.enemyPositionOverrides??null,
    worldScale:run.studioWorldScale??run.battlefieldWorldScale??1,
    enemyScale:run.studioEnemyScale??1});
}

export function collectVentHits(layout, flight) {
  const direct = flight.enemyContacts ?? (flight.hitIds.length ? [{ id: flight.hitIds[0],
    point: sampleAtDistance(flight.path, flight.impactDistance), time: flight.directHitTime }] : []);
  return layout.enemies.flatMap(slot => {
    const hit = direct.find(contact => contact.id === slot.id && slot.vent
      && Math.hypot(contact.point.x - slot.vent.x, contact.point.y - slot.vent.y)
        <= slot.vent.radius + flight.candyRadius);
    return hit ? [{ enemyId: slot.id, point: { x: hit.point.x, y: hit.point.y }, time: hit.time }] : [];
  });
}

/** One canonical solution is shared by visible playback and combat resolution. */
export function preparePhysicalFlight(run, pull, launchId, shotId, flightStartMs = Date.now()) {
  const layout = layoutForRun(run);
  const loaded=run.weapons.find(weapon=>weapon.instanceId===(run.weaponQueue?.[0]??run.currentWeaponId));
  const signature = STONE_STATS[loaded?.id]?.manual;
  const abilityKind=!run.spearArmed && loaded?.id==='wizard-orb'?'split'
    :!run.spearArmed && loaded?.id==='alchemist-candy'?'explosion':!run.spearArmed ? signature ?? null : null;
  const windField=buildWindField({area:run.area,round:run.round,layoutSeed:run.layoutSeed??0,
    shotOrdinal:run.playerShotsFired??0,layout});
  const planOptions={pull:{...pull,direction:{...pull.direction}},piercing:run.spearArmed===true,
    flightStartMs,
    windField,deferAbility:Boolean(abilityKind),
    ...shotDisruptionOptions(run),
    loadedCandyId:loaded?.id??null,loadedCandyGrade:loaded?.grade??'C',prototype:run.battlefieldPrototype??run.studioPrototype??null,
    toppledObstacleIds:run.toppledObstacleIds||[],
    windAvailable:loaded?.id==='wind-candy'&&run.windArmedMode==='homing'};
  const solution=planShot({layout,enemies:run.enemies,...planOptions});
  if (!solution) return null;
  const deadline = abilityKind ? abilityDeadline(solution, Boolean(signature)) : null;
  const abilityDeadlineTime = deadline?.time ?? null;
  return {...solution,ventHits:collectVentHits(layout, solution),id:launchId,shotId,encounterId:run.encounterId,flightStartMs,
    powerRatio:pull.powerRatio,abilityKindPending:abilityKind,abilityDeadlineTime,
    abilityDeadlineSource:deadline?.source ?? null, abilityLandingTime:deadline?.landing ?? null,
    ...(signature === 'vortex' ? { planOptions } : {}),
    simulationSeconds:abilityKind&&abilityDeadlineTime!==null
      ?Math.max(solution.simulationSeconds,abilityDeadlineTime):solution.simulationSeconds,
    durationMs:abilityKind&&abilityDeadlineTime!==null
      ?Math.max(solution.durationMs,Math.round(abilityDeadlineTime*1000)):solution.durationMs,
    weaponGrade:loaded?.grade??'C',
    windField,windCrossed:crossedWindZone(solution.path,windField,solution.impactDistance),
    enemyOrder:layout.enemies.slice().sort((a,b)=>a.collider.x-b.collider.x||a.id.localeCompare(b.id)).map(slot=>slot.id),
    loadedStoneId:loaded?.id??'basic-stone',
    candyRadius:solution.candyRadius,
    fireball:run.fireballArmed,projectileKind:run.spearArmed?'spear':run.fireballArmed?'fireball':'normal'};
}

export function activatePhysicalFlight(run, baseFlight, { time, source, success = false } = {}) {
  const layout = layoutForRun(run);
  const revised=activatePlannedAbility({baseFlight,layout,enemies:run.enemies,
    kind:baseFlight.abilityKindPending,time,grade:baseFlight.weaponGrade,success,source});
  return revised ? {...revised,ventHits:collectVentHits(layout, revised),windCrossed:crossedWindZone(revised.path,revised.windField,revised.impactDistance),
    abilityKindPending:null,abilityDeadlineTime:null} : null;
}

export function flightResultPayload(flight) {
  return {hitIds:flight.hitIds.slice(),selectedTargetId:flight.selectedTargetId,
    shotMeta:{impactKind:flight.impactKind,obstacleId:flight.obstacleId,obstacleKind:flight.obstacleKind,
      contacts:(flight.contacts||[]).map(({logMotion,obstacleMotion,riderMotion,...contact})=>structuredClone(contact)),
      ...(flight.contacts?.some(contact=>contact.riderMotion)?{riderFalls:flight.contacts
        .filter(contact=>contact.riderMotion).map(contact=>({enemyId:contact.riderMotion.enemyId,
          supportObstacleId:contact.obstacleId,startTime:contact.time,
          landingTime:contact.riderMotion.startTime+contact.riderMotion.durationSeconds,
          landing:contact.riderMotion.landing,fallDamage:contact.riderMotion.fallDamage,
          elevation:contact.riderMotion.elevation}))}:{}),
      directHitTime:flight.directHitTime??flight.path.durationSeconds,
      ventHits:structuredClone(flight.ventHits || []),
      ...(flight.enemyContacts?{enemyContacts:structuredClone(flight.enemyContacts)}:{}),
      ...(flight.abilityContacts?.length?{abilityContacts:structuredClone(flight.abilityContacts)}:{}),
      ...(flight.abilityActivation?{abilityActivation:structuredClone(flight.abilityActivation)}:{}),
      ...(flight.vortex?{vortex:structuredClone(flight.vortex)}:{}),
      ...(flight.splitOrbs?{
        childHits:flight.splitOrbs.children.filter(child=>child.hit).map(child=>({orbId:child.id,
          enemyId:child.hit.enemyId,time:child.hit.time,point:child.hit.point})),
        childWobbles:flight.splitOrbs.children.flatMap(child=>child.wobbles.map(wobble=>({orbId:child.id,...wobble}))),
        splitTime:flight.splitOrbs.splitTime
      }:{}),
      windCrossed:flight.windCrossed===true,
      enemyOrder:flight.enemyOrder?.slice(),
      obstacleTargetIds:flight.obstacleTargetIds||[],rolling:flight.rollStartDistance!==null
        &&flight.impactDistance>flight.rollStartDistance,reverse:flight.reverse}};
}
