import forestManifest from '../../assets/maps/studio-depth/forest/layers.json';
import snowManifest from '../../assets/maps/studio-depth/snow/layers.json';
import cityManifest from '../../assets/maps/studio-depth/city/layers.json';
import chaosManifest from '../../assets/maps/studio-depth/chaos/layers.json';

const imageUrls = import.meta.glob('../../assets/maps/studio-depth/*/*.png', { eager: true, query: '?url', import: 'default' });
const manifests = { forest: forestManifest, snow: snowManifest, city: cityManifest, chaos: chaosManifest };
const roles = ['midground', 'path', 'foreground'];
const sides = ['west', 'east'];

export function getStudioScenePanels(area) {
  const manifest = manifests[area];
  if (!manifest) throw new TypeError(`Unknown studio scene area: ${area}`);
  if (manifest.version !== 1 || manifest.area !== area || manifest.baselineRatio !== .75
    || manifest.panels?.west?.x !== -600 || manifest.panels?.west?.worldWidth !== 2700
    || manifest.panels?.east?.x !== 1500 || manifest.panels?.east?.worldWidth !== 2700
    || !Array.isArray(manifest.assets) || manifest.assets.length !== 6) {
    throw new TypeError(`Invalid ${area} studio depth manifest`);
  }
  const result = {};
  for (const role of roles) {
    const panels = sides.map(side => {
      const key = `${role}-${side}`;
      const matches = manifest.assets.filter(asset => asset.layer === role && asset.side === side);
      const source = matches[0];
      if (matches.length !== 1 || source.file !== `${key}.png` || source.width !== 1536
        || source.height !== 1024 || source.alphaMode !== 'cutout') {
        throw new TypeError(`Invalid ${area} studio panel: ${key}`);
      }
      const href = imageUrls[`../../assets/maps/studio-depth/${area}/${source.file}`];
      if (!href) throw new TypeError(`Missing ${area} studio panel image: ${source.file}`);
      const width = manifest.panels[side].worldWidth;
      const height = width * source.height / source.width;
      return Object.freeze({ href, side, x: manifest.panels[side].x,
        y: 900 - manifest.baselineRatio * height, width, height,
        sourceWidth: source.width, sourceHeight: source.height });
    });
    result[role] = Object.freeze(panels);
  }
  return Object.freeze(result);
}
