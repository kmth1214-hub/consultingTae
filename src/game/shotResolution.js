import {buildPlayableBattlefield} from './battlefieldPlacement.js';
import {planShot,shotDisruptionOptions} from './shotGeometry.js';
import { buildWindField, crossedWindZone } from './windField.js';

/** One canonical solution is shared by visible playback and combat resolution. */
export function preparePhysicalFlight(run, pull, launchId, shotId, flightStartMs = Date.now()) {
  const layout=buildPlayableBattlefield({area:run.area,round:run.round,enemies:run.enemies,
    seed:run.layoutSeed??0,encounterPhase:run.chaosBossPhase==='split'?'split':null,
    prototype:run.battlefieldPrototype??run.studioPrototype??null,
    enemyLandingPositions:run.enemyLandingPositions??null,
    worldScale:run.studioWorldScale??run.battlefieldWorldScale??1});
  const loaded=run.weapons.find(weapon=>weapon.instanceId===(run.weaponQueue?.[0]??run.currentWeaponId));
  const windField=buildWindField({area:run.area,round:run.round,layoutSeed:run.layoutSeed??0,
    shotOrdinal:run.playerShotsFired??0,layout});
  const solution=planShot({layout,pull,enemies:run.enemies,piercing:run.spearArmed===true,
    flightStartMs,
    windField,
    ...shotDisruptionOptions(run),
    loadedCandyId:loaded?.id??null,prototype:run.battlefieldPrototype??run.studioPrototype??null,
    toppledObstacleIds:run.toppledObstacleIds||[],
    windAvailable:loaded?.id==='wind-candy'&&!run.roundEffects.windHomingUsed});
  return solution ? {...solution,id:launchId,shotId,encounterId:run.encounterId,flightStartMs,
    windField,windCrossed:crossedWindZone(solution.path,windField,solution.impactDistance),
    loadedStoneId:loaded?.id??'basic-stone',
    candyRadius:layout.candyRadius,
    fireball:run.fireballArmed,projectileKind:run.spearArmed?'spear':run.fireballArmed?'fireball':'normal'} : null;
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
      ...(flight.enemyContacts?{enemyContacts:structuredClone(flight.enemyContacts)}:{}),
      ...(flight.abilityContacts?.length?{abilityContacts:structuredClone(flight.abilityContacts)}:{}),
      ...(flight.splitOrbs?{
        childHits:flight.splitOrbs.children.filter(child=>child.hit).map(child=>({orbId:child.id,
          enemyId:child.hit.enemyId,time:child.hit.time,point:child.hit.point})),
        childWobbles:flight.splitOrbs.children.flatMap(child=>child.wobbles.map(wobble=>({orbId:child.id,...wobble}))),
        splitTime:flight.splitOrbs.splitTime
      }:{}),
      windCrossed:flight.windCrossed===true,
      obstacleTargetIds:flight.obstacleTargetIds||[],rolling:flight.rollStartDistance!==null
        &&flight.impactDistance>flight.rollStartDistance,reverse:flight.reverse}};
}
