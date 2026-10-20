const fs = require('node:fs');
const path = require('node:path');

const file = path.resolve('cookie-roguelike-mockup.html');
const html = fs.readFileSync(file, 'utf8');
const inlineScripts = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
for (const script of inlineScripts) new Function(script);

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error('Duplicate ids: ' + [...new Set(duplicates)].join(', '));
if ((html.match(/id="powerMeter"/g) || []).length !== 1) throw new Error('powerMeter id must be unique');
if (!html.includes('aria-orientation="vertical"')) throw new Error('Vertical meter orientation is missing');
if (!html.includes('id="slingshotPouch"') || !html.includes('function updateSlingshotDraw(angleDeg)')) throw new Error('Slingshot pouch or angle linkage is missing');
if (!html.includes('<aside class="combat-hud"') || html.includes('class="combat-side"')) throw new Error('Combat HUD is missing or still uses the side rail');
if (!html.includes('.battle-grid { display:grid;grid-template-columns:minmax(0,1fr);')) throw new Error('Battle grid is not full width');

const brokenAssets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"#?]+)"/g)]
  .map(match => match[1])
  .filter(asset => !fs.existsSync(path.resolve(path.dirname(file), asset)));
if (brokenAssets.length) throw new Error('Missing local assets: ' + brokenAssets.join(', '));

console.log('Parsed ' + inlineScripts.length + ' inline scripts; ids, slingshot, meter, HUD, and local asset checks passed.');
