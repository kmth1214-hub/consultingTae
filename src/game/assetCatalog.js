import adventurer from '../../Cookie Run_ OvenBreak Fan Kit/01. Cookies/Adventurer Cookie.png';
import alchemist from '../../Cookie Run_ OvenBreak Fan Kit/01. Cookies/Alchemist Cookie.png';
import wizard from '../../Cookie Run_ OvenBreak Fan Kit/01. Cookies/Wizard Cookie.png';
import milk from '../../Cookie Run_ OvenBreak Fan Kit/01. Cookies/Milk Cookie.png';
import wind from '../../Cookie Run_ OvenBreak Fan Kit/01. Cookies/Wind Archer Cookie.png';
import forest from '../../assets/maps/forest_theme.png';
import snow from '../../assets/maps/snow_theme.png';
import city from '../../assets/maps/city_theme.png';
import chaos from '../../assets/maps/chaos_theme.png';
import distant from '../../assets/maps/forest-layers/distant.png';
import midground from '../../assets/maps/forest-layers/midground.png';
import path from '../../assets/maps/forest-layers/path.png';
import foreground from '../../assets/maps/forest-layers/foreground.png';
import jellySnake from '../../assets/monsters/jelly-snake.png';
import chocolateBoar from '../../assets/monsters/chocolate-boar.png';
import fireball from '../../assets/items/fiery-candy-comet.png';
import spear from '../../assets/items/candy-cane-staff-of-darkness.png';
import defense from '../../assets/items/gigawatt-cube.png';
import heal from '../../assets/items/mini-energy-potion.png';

export const ASSETS = Object.freeze({
  characters: Object.freeze({ adventurer, alchemist, wizard, milk, wind }),
  maps: Object.freeze({ forest, snow, city, chaos }),
  forestLayers: Object.freeze({ distant, midground, path, foreground }),
  monsters: Object.freeze({ jellySnake, chocolateBoar }),
  items: Object.freeze({ fireball, spear, defense, heal })
});
