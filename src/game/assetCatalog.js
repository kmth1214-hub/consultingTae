import adventurer from '../../Cookie Run_ OvenBreak Fan Kit/01. Cookies/Adventurer Cookie.png';
import alchemist from '../../Cookie Run_ OvenBreak Fan Kit/01. Cookies/Alchemist Cookie.png';
import wizard from '../../Cookie Run_ OvenBreak Fan Kit/01. Cookies/Wizard Cookie.png';
import milk from '../../Cookie Run_ OvenBreak Fan Kit/01. Cookies/Milk Cookie.png';
import wind from '../../Cookie Run_ OvenBreak Fan Kit/01. Cookies/Wind Archer Cookie.png';
import distant from '../../assets/maps/forest-layers/distant.png';
import midground from '../../assets/maps/forest-layers/midground.png';
import path from '../../assets/maps/forest-layers/path.png';
import foreground from '../../assets/maps/forest-layers/foreground.png';
import snowDistantWest from '../../assets/maps/snow-layers/distant-west.png';
import snowDistantEast from '../../assets/maps/snow-layers/distant-east.png';
import snowMidgroundWest from '../../assets/maps/snow-layers/midground-west.png';
import snowMidgroundEast from '../../assets/maps/snow-layers/midground-east.png';
import snowPathWest from '../../assets/maps/snow-layers/path-west.png';
import snowPathEast from '../../assets/maps/snow-layers/path-east.png';
import snowForegroundWest from '../../assets/maps/snow-layers/foreground-west.png';
import snowForegroundEast from '../../assets/maps/snow-layers/foreground-east.png';
import cityDistantWest from '../../assets/maps/city-layers/distant-west.png';
import cityDistantEast from '../../assets/maps/city-layers/distant-east.png';
import cityMidgroundWest from '../../assets/maps/city-layers/midground-west.png';
import cityMidgroundEast from '../../assets/maps/city-layers/midground-east.png';
import cityPathWest from '../../assets/maps/city-layers/path-west.png';
import cityPathEast from '../../assets/maps/city-layers/path-east.png';
import cityForegroundWest from '../../assets/maps/city-layers/foreground-west.png';
import cityForegroundEast from '../../assets/maps/city-layers/foreground-east.png';
import chaosDistantWest from '../../assets/maps/chaos-layers/distant-west.png';
import chaosDistantEast from '../../assets/maps/chaos-layers/distant-east.png';
import chaosMidgroundWest from '../../assets/maps/chaos-layers/midground-west.png';
import chaosMidgroundEast from '../../assets/maps/chaos-layers/midground-east.png';
import chaosPathWest from '../../assets/maps/chaos-layers/path-west.png';
import chaosPathEast from '../../assets/maps/chaos-layers/path-east.png';
import chaosForegroundWest from '../../assets/maps/chaos-layers/foreground-west.png';
import chaosForegroundEast from '../../assets/maps/chaos-layers/foreground-east.png';
import snowLayers from '../../assets/maps/snow-layers/layers.json';
import cityLayers from '../../assets/maps/city-layers/layers.json';
import chaosLayers from '../../assets/maps/chaos-layers/layers.json';
import jellySnake from '../../assets/monsters/jelly-snake.png';
import chocolateBoar from '../../assets/monsters/chocolate-boar.png';
import chaosFusedBoss from '../../assets/monsters/chaos-fused-boss.png';
import dryIceV2 from '../../assets/monsters/dry-ice-v2.png';
import snowballV2 from '../../assets/monsters/snowball-v2.png';
import cowardlySnowmanV2 from '../../assets/monsters/cowardly-snowman-v2.png';
import washingRobotV2 from '../../assets/monsters/washing-robot-v2.png';
import ovenRobotV2 from '../../assets/monsters/oven-robot-v2.png';
import frostGearSnake from '../../assets/monsters/frost-gear-snake.png';
import ovenSnowBoar from '../../assets/monsters/oven-snow-boar.png';
import jellyCloudRobot from '../../assets/monsters/jelly-cloud-robot.png';
import fireball from '../../assets/items/fiery-candy-comet.png';
import spear from '../../assets/items/candy-cane-staff-of-darkness.png';
import defense from '../../assets/items/gigawatt-cube.png';
import heal from '../../assets/items/mini-energy-potion.png';

export const ASSETS = Object.freeze({
  characters: Object.freeze({ adventurer, alchemist, wizard, milk, wind }),
  forestLayers: Object.freeze({ distant, midground, path, foreground }),
  regionLayers: Object.freeze({
    snow: Object.freeze({ distant: Object.freeze({ west: snowDistantWest, east: snowDistantEast }), midground: Object.freeze({ west: snowMidgroundWest, east: snowMidgroundEast }), path: Object.freeze({ west: snowPathWest, east: snowPathEast }), foreground: Object.freeze({ west: snowForegroundWest, east: snowForegroundEast }), metadata: snowLayers }),
    city: Object.freeze({ distant: Object.freeze({ west: cityDistantWest, east: cityDistantEast }), midground: Object.freeze({ west: cityMidgroundWest, east: cityMidgroundEast }), path: Object.freeze({ west: cityPathWest, east: cityPathEast }), foreground: Object.freeze({ west: cityForegroundWest, east: cityForegroundEast }), metadata: cityLayers }),
    chaos: Object.freeze({ distant: Object.freeze({ west: chaosDistantWest, east: chaosDistantEast }), midground: Object.freeze({ west: chaosMidgroundWest, east: chaosMidgroundEast }), path: Object.freeze({ west: chaosPathWest, east: chaosPathEast }), foreground: Object.freeze({ west: chaosForegroundWest, east: chaosForegroundEast }), metadata: chaosLayers })
  }),
  monsters: Object.freeze({ jellySnake, chocolateBoar, chaosFusedBoss,
    dryIceV2, snowballV2, cowardlySnowmanV2, washingRobotV2, ovenRobotV2,
    frostGearSnake, ovenSnowBoar, jellyCloudRobot }),
  items: Object.freeze({ fireball, spear, defense, heal })
});
