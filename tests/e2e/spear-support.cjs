const { BattleEngine } = require('../../src/game/battleEngine.js');
const { buildPlayableBattlefield } = require('../../src/game/battlefieldPlacement.js');
const { planShot } = require('../../src/game/shotGeometry.js');

async function aimedShot({area='forest',round=1,seed=0,piercing=true,enemies:provided,encounterPhase=null,worldScale=1.5}={}) {
  const enemies=provided || BattleEngine.createRoundEnemies(area,round,{rng:()=>.5});
  const layout=buildPlayableBattlefield({area,round,seed,enemies,encounterPhase,worldScale,
    prototype:area==='forest'?'forest-elevated-v1':'regional-elevated-v1'});
  for(let angleDeg=-5;angleDeg<=75;angleDeg+=2.5) for(let step=1;step<=40;step++) {
    const powerRatio=step/40,radians=angleDeg*Math.PI/180;
    const shot=planShot({layout,enemies,piercing,pull:{ready:true,powerRatio,direction:{x:Math.cos(radians),y:-Math.sin(radians)}}});
    if(shot?.hitIds.length && !shot.contacts.length && !shot.obstacleId) return {angleDeg,powerRatio,shot};
  }
  throw new Error(`No unobstructed ${area} aimed shot`);
}
module.exports={aimedShot};
