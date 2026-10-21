const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const AREAS = ['snow', 'city', 'chaos'];
const ROLES = ['distant', 'midground', 'path', 'foreground'];
const SIDES = ['west', 'east'];
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function validateManifest(manifest, area) {
  if (!AREAS.includes(area)) throw new Error(`Unknown area: ${area}`);
  if (!manifest || manifest.version !== 1 || manifest.area !== area || manifest.baselineRatio !== .75)
    throw new Error(`${area}: expected version1 manifest and baselineRatio0.75`);
  for (const [side, x] of [['west', -600], ['east', 1500]]) {
    if (manifest.panels?.[side]?.x !== x || manifest.panels?.[side]?.worldWidth !== 2700)
      throw new Error(`${area}: invalid ${side} panel registration`);
  }
  if (!Array.isArray(manifest.assets) || manifest.assets.length !== 8)
    throw new Error(`${area}: expected exactly eight layer/side pairs`);
  const seen = new Set();
  for (const entry of manifest.assets) {
    if (!entry || !ROLES.includes(entry.layer) || !SIDES.includes(entry.side))
      throw new Error(`${area}: unknown layer/side`);
    const key = `${entry.layer}-${entry.side}`;
    if (seen.has(key) || entry.file !== `${key}.png`)
      throw new Error(`${area}: duplicate or invalid file for ${key}`);
    seen.add(key);
    if (!Number.isInteger(entry.width) || !Number.isInteger(entry.height)
      || entry.width < 1536 || entry.height < 1024 || Math.abs(entry.width / entry.height - 1.5) > .01)
      throw new Error(`${area}/${entry.file}: expected native3:2 dimensions >=1536x1024`);
    if (entry.alphaMode !== (entry.layer === 'distant' ? 'opaque' : 'cutout'))
      throw new Error(`${area}/${entry.file}: wrong alphaMode`);
  }
  return manifest;
}

async function inspectImage(page, filename) {
  const bytes = fs.readFileSync(filename);
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)
    || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`${filename}: invalid PNG header`);
  const header = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  const result = await page.evaluate(async data => {
    const image = new Image(); image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const { naturalWidth: width, naturalHeight: height } = image;
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const rgba = ctx.getImageData(0, 0, width, height).data;
    const baselineRow = Math.round(.75 * height), topRows = Math.floor(.8 * height);
    const rowLeft = Math.ceil(.02 * width), rowRight = Math.floor(.98 * width);
    let transparent = 0, opaque = 0, topTransparent = 0, rowOpaque = 0;
    let left = width, right = -1, top = height, bottom = -1;
    const opaqueRows = [];
    for (let y = 0; y < height; y++) {
      let centralOpaque = 0;
      for (let x = 0; x < width; x++) {
        const alpha = rgba[(y * width + x) * 4 + 3];
        if (alpha <= 8) { transparent++; if (y < topRows) topTransparent++; }
        if (alpha >= 247) {
          opaque++;
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
          if (x >= rowLeft && x < rowRight) centralOpaque++;
        }
      }
      if (y === baselineRow) rowOpaque = centralOpaque;
      if (centralOpaque / (rowRight - rowLeft) >= .95) opaqueRows.push(y);
    }
    return { width, height, transparentFraction: transparent / (width * height),
      opaqueFraction: opaque / (width * height),
      topTransparentFraction: topTransparent / (width * topRows),
      baselineRow, baselineOpaqueFraction: rowOpaque / (rowRight - rowLeft),
      opaqueBounds: right < 0 ? null : { left, top, right, bottom },
      fullWidthOpaqueRows: opaqueRows.length ? { first: opaqueRows[0], last: opaqueRows.at(-1) } : null };
  }, bytes.toString('base64'));
  if (result.width !== header.width || result.height !== header.height)
    throw new Error(`${filename}: PNG header/decode dimensions disagree`);
  return { ...result, bytes: bytes.length };
}

function imageErrors(entry, actual) {
  const errors = [];
  if (actual.width !== entry.width || actual.height !== entry.height) errors.push('decoded/native metadata mismatch');
  if (entry.layer === 'distant' && actual.opaqueFraction < .99) errors.push('distant must be >=99% opaque');
  if (entry.layer === 'midground' && actual.transparentFraction < .35) errors.push('midground must be >=35% transparent');
  if (entry.layer === 'path') {
    if (actual.transparentFraction < .65) errors.push('path must be >=65% transparent');
    if (actual.baselineOpaqueFraction < .95) errors.push('path registration row must be >=95% opaque');
  }
  if (entry.layer === 'foreground') {
    if (actual.transparentFraction < .72) errors.push('foreground must be >=72% transparent');
    if (actual.topTransparentFraction < .99) errors.push('foreground top80% must be >=99% transparent');
  }
  return errors;
}

async function verifyRegionArt(areas) {
  const manifests = areas.map(area => {
    if (!AREAS.includes(area)) throw new Error(`Unknown area: ${area}`);
    const folder = path.join(ROOT, 'assets', 'maps', `${area}-layers`);
    const filename = path.join(folder, 'layers.json');
    try { return { area, folder, manifest: validateManifest(JSON.parse(fs.readFileSync(filename, 'utf8')), area) }; }
    catch (error) { throw new Error(`${filename}: ${error.message}`); }
  });
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    const results = [], failures = [];
    for (const { area, folder, manifest } of manifests) for (const entry of manifest.assets) {
      const label = `${area}/${entry.file}`;
      try {
        const actual = await inspectImage(page, path.join(folder, entry.file));
        const errors = imageErrors(entry, actual);
        const percent = n => `${(n * 100).toFixed(2)}%`;
        console.log(`${errors.length ? 'FAIL' : 'PASS'} ${label} ${actual.width}x${actual.height} ${actual.bytes}B`
          + ` transparent=${percent(actual.transparentFraction)} opaque=${percent(actual.opaqueFraction)}`
          + ` baseline=${percent(actual.baselineOpaqueFraction)} top80-clear=${percent(actual.topTransparentFraction)}`);
        results.push({ area, file: entry.file, ...actual, errors });
        failures.push(...errors.map(error => `${label}: ${error}`));
      } catch (error) { failures.push(`${label}: ${error.message}`); }
    }
    if (failures.length) throw new Error(failures.join('\n'));
    console.log(`Verified ${results.length} PNGs; ${results.reduce((n, result) => n + result.bytes, 0)} bytes. Visual review is also required.`);
    return results;
  } finally { await browser?.close(); }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || ![...AREAS, 'all'].includes(args[0])) {
    console.error('Usage: node scripts/verify-region-art.cjs snow|city|chaos|all'); process.exitCode = 1;
  } else {
    verifyRegionArt(args[0] === 'all' ? AREAS : [args[0]]).catch(error => {
      console.error(error.message); process.exitCode = 1;
    });
  }
}

module.exports = { validateManifest, inspectImage, imageErrors, verifyRegionArt };
