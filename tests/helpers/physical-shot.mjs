import {buildPlayableBattlefield} from '../../src/game/battlefieldPlacement.js';
import {planShot} from '../../src/game/shotGeometry.js';
export function pullAt(angle=90,powerRatio=1) {
 const rad=angle*Math.PI/180;return {ready:true,powerRatio,direction:{x:Math.cos(rad),y:-Math.sin(rad)}};
}
export function reserveAt(session,angle=90,powerRatio=1) {
 return session.actions.beginShot({launchId:1,pull:pullAt(angle,powerRatio)});
}
export function commitFlight(session,reservation,extra={}) {
 return session.actions.fireShot({shotId:reservation.shotId,encounterId:reservation.encounterId,...extra});
}
export function findPhysicalShot(session,predicate) {
 const run=session.getSnapshot().run;
 const layout=buildPlayableBattlefield({area:run.area,round:run.round,enemies:run.enemies,
   seed:run.layoutSeed,encounterPhase:run.chaosBossPhase==='split'?'split':null});
 for(let angle=-5;angle<=75;angle+=2.5)for(let p=1;p<=40;p++) {
  const pull=pullAt(angle,p/40),shot=planShot({layout,pull,enemies:run.enemies,
    toppledObstacleIds:run.toppledObstacleIds,piercing:run.spearArmed,
    windAvailable:run.weapons.some(w=>w.id==='wind-candy')&&!run.roundEffects.windHomingUsed});
  if(shot&&predicate(shot))return session.actions.beginShot({launchId:1,pull});
 }
 throw new Error('No physical shot matches the regression fixture');
}
