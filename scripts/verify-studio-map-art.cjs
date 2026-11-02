'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const { inspectImage } = require('./verify-region-art.cjs');

const ROOT = path.resolve(__dirname, '..', 'assets', 'maps', 'studio-depth');
const AREAS = ['forest', 'snow', 'city', 'chaos'];
const ROLES = ['midground', 'path', 'foreground'];
const SIDES = ['west', 'east'];

function validateStudioManifest(manifest, area) {
  if (!AREAS.includes(area)) throw new Error(`Unknown area: ${area}`);
  if (!manifest || manifest.version !== 1 || manifest.area !== area || manifest.baselineRatio !== .75)
    throw new Error(`${area}: expected version 1, matching area, and baselineRatio 0.75`);
  for (const [side, x] of [['west', -600], ['east', 1500]]) {
    if (manifest.panels?.[side]?.x !== x || manifest.panels?.[side]?.worldWidth !== 2700)
      throw new Error(`${area}: invalid ${side} panel registration`);
  }
  if (!Array.isArray(manifest.assets) || manifest.assets.length !== 6)
    throw new Error(`${area}: expected exactly six assets`);
  const expected = ROLES.flatMap(layer => SIDES.map(side => `${layer}-${side}`));
  for (let i = 0; i < expected.length; i++) {
    const entry = manifest.assets[i];
    const key = expected[i];
    if (!entry || `${entry.layer}-${entry.side}` !== key || entry.file !== `${key}.png`)
      throw new Error(`${area}: invalid or out-of-order asset at index ${i}; expected ${key}.png`);
    if (entry.width !== 1536 || entry.height !== 1024 || entry.alphaMode !== 'cutout')
      throw new Error(`${area}/${entry.file}: expected 1536x1024 cutout metadata`);
  }
  return manifest;
}

async function verifyStudioMapArt(areas) {
  if (!Array.isArray(areas) || !areas.length || areas.some(area => !AREAS.includes(area)))
    throw new Error(`Expected one or more of: ${AREAS.join(', ')}`);
  const manifests = areas.map(area => {
    const folder = path.join(ROOT, area);
    const filename = path.join(folder, 'layers.json');
    let manifest;
    try { manifest = validateStudioManifest(JSON.parse(fs.readFileSync(filename, 'utf8')), area); }
    catch (error) { throw new Error(`${filename}: ${error.message}`); }
    const actualFiles = fs.readdirSync(folder).filter(name => name.toLowerCase().endsWith('.png')).sort();
    const expectedFiles = manifest.assets.map(entry => entry.file).sort();
    if (actualFiles.join('|') !== expectedFiles.join('|'))
      throw new Error(`${area}: PNG file inventory differs from manifest: ${actualFiles.join(', ')}`);
    return { area, folder, manifest };
  });

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    const failures = [];
    let totalFiles = 0;
    let totalBytes = 0;
    const percent = value => `${(value * 100).toFixed(2)}%`;
    for (const { area, folder, manifest } of manifests) {
      for (const entry of manifest.assets) {
        const label = `${area}/${entry.file}`;
        try {
          const actual = await inspectImage(page, path.join(folder, entry.file));
          const errors = [];
          if (actual.width !== entry.width || actual.height !== entry.height)
            errors.push(`decoded size ${actual.width}x${actual.height} differs from manifest`);
          const transparencyMin = { midground: .35, path: .65, foreground: .72 }[entry.layer];
          if (actual.transparentFraction < transparencyMin)
            errors.push(`${entry.layer} transparency ${percent(actual.transparentFraction)} < ${percent(transparencyMin)}`);
          if (entry.layer === 'path' && actual.baselineOpaqueFraction < .95)
            errors.push(`path baseline opacity ${percent(actual.baselineOpaqueFraction)} < 95%`);
          if (entry.layer === 'foreground' && actual.topTransparentFraction < .99)
            errors.push(`foreground top 80% transparency ${percent(actual.topTransparentFraction)} < 99%`);
          console.log(`${errors.length ? 'FAIL' : 'PASS'} ${label} ${actual.width}x${actual.height}`
            + ` transparent=${percent(actual.transparentFraction)}`
            + ` baseline=${percent(actual.baselineOpaqueFraction)}`
            + ` top80-clear=${percent(actual.topTransparentFraction)}`);
          failures.push(...errors.map(error => `${label}: ${error}`));
          totalFiles++;
          totalBytes += actual.bytes;
        } catch (error) { failures.push(`${label}: ${error.message}`); }
      }
    }
    if (failures.length) throw new Error(failures.join('\n'));
    console.log(`Verified ${totalFiles} PNGs; ${totalBytes} bytes. Visual review is also required.`);
  } finally { await browser?.close(); }
}

module.exports = { validateStudioManifest, verifyStudioMapArt };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || ![...AREAS, 'all'].includes(args[0])) {
    console.error('Usage: node scripts/verify-studio-map-art.cjs forest|snow|city|chaos|all');
    process.exitCode = 1;
  } else {
    verifyStudioMapArt(args[0] === 'all' ? AREAS : [args[0]]).catch(error => {
      console.error(error.message); process.exitCode = 1;
    });
  }
}
