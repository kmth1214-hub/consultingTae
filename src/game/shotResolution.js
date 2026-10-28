import {buildPlayableBattlefield} from './battlefieldPlacement.js';
import {planShot} from './shotGeometry.js';

/** One canonical solution is shared by visible playback and combat resolution. */
export function preparePhysicalFlight(run, pull, launchId, shotId) {
  const layout=buildPlayableBattlefield({area:run.area,round:run.round,enemies:run.enemies,
    seed:run.layoutSeed??0,encounterPhase:run.chaosBossPhase==='split'?'split':null,
    prototype:run.studioPrototype??null,enemyLandingPositions:run.enemyLandingPositions??null});
  const solution=planShot({layout,pull,enemies:run.enemies,piercing:run.spearArmed===true,
    toppledObstacleIds:run.toppledObstacleIds||[],
    windAvailable:run.weapons.some(w=>w.id==='wind-candy')&&!run.roundEffects.windHomingUsed});
  return solution ? {...solution,id:launchId,shotId,encounterId:run.encounterId,
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
      obstacleTargetIds:flight.obstacleTargetIds||[],rolling:flight.rollStartDistance!==null
        &&flight.impactDistance>flight.rollStartDistance,reverse:flight.reverse}};
}
