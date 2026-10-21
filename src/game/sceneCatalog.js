import { ASSETS } from './assetCatalog.js';

export const SCENE_PROFILES = Object.freeze({
  forest: Object.freeze({ area: 'forest', renderer: 'forest', palette: Object.freeze({ sky: '#72d5d3', horizon: '#f0efbd', bank: '#527c51', ground: '#386c58', lane: '#deaa83', light: '#f8cdab', dark: '#af775d' }), panels: null }),
  snow: profile('snow', '#91badf', '#edf5ff', '#a5c7da', '#739cb6', '#bad4e5', '#f4fbff', '#81a4c3'),
  city: profile('city', '#654a75', '#f5c798', '#7b657d', '#49425f', '#927da5', '#d9b8bb', '#66547e'),
  chaos: profile('chaos', '#23214d', '#b598e7', '#726296', '#292750', '#9f8abd', '#d2bce9', '#655783')
});

function profile(area, sky, horizon, bank, ground, lane, light, dark) {
  const layers = ASSETS.regionLayers[area];
  const meta = layers.metadata;
  if (meta.version !== 1 || meta.area !== area || !meta.panels?.west || !meta.panels?.east
    || meta.assets?.length !== 8 || !['distant', 'midground', 'path', 'foreground'].every(role =>
      meta.assets.some(item => item.layer === role && item.side === 'west' && item.width > 0 && item.height > 0)
      && meta.assets.some(item => item.layer === role && item.side === 'east' && item.width > 0 && item.height > 0))) {
    throw new Error(`Invalid ${area} regional layer manifest`);
  }
  const panels = {};
  for (const role of ['distant', 'midground', 'path', 'foreground']) {
    panels[role] = ['west', 'east'].map(side => {
      const source = meta.assets.find(item => item.layer === role && item.side === side);
      const region = meta.panels[side];
      const width = region.worldWidth;
      const height = width * source.height / source.width;
      return Object.freeze({ href: layers[role][side], x: region.x, width, height,
        y: 900 - meta.baselineRatio * height, sourceWidth: source.width, sourceHeight: source.height, side });
    });
  }
  return Object.freeze({ area, renderer: 'panorama', palette: Object.freeze({ sky, horizon, bank, ground, lane, light, dark }), panels: Object.freeze(panels) });
}

export function getSceneProfile(area) {
  const result = SCENE_PROFILES[area];
  if (!result) throw new TypeError(`Unknown scene area: ${area}`);
  return result;
}
