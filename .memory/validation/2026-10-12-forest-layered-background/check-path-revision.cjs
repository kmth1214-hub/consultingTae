const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const png = fs.readFileSync('assets/maps/forest-layers/path.png');
if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw Error('Invalid path PNG');
if (png.readUInt32BE(16) !== 1536 || png.readUInt32BE(20) !== 1024 || png[25] !== 6) throw Error('Path canvas/alpha mismatch');
console.log('Path PNG: 1536x1024 RGBA');
const html = fs.readFileSync('cookie-roguelike-mockup.html', 'utf8').replace(/\r\n/g, '\n');
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (match[1].trim()) new vm.Script(match[1]);
console.log('Inline scripts OK');
// Run this revision-specific check before its commit; it preserves actual aiming contracts.
const before = execFileSync('git', ['show', 'HEAD:cookie-roguelike-mockup.html'], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
for (const name of ['getWorldPointFromPointer', 'getStoneCenter', 'drawTrajectoryPreview', 'aimPointFromPointer', 'animateProjectile', 'onArenaPointerUp']) {
  const pattern = new RegExp('(?:async )?function ' + name + '\\([^]*?\\n    }');
  if (!html.match(pattern) || before.match(pattern)?.[0] !== html.match(pattern)[0]) throw Error('Aiming contract changed: ' + name);
}
console.log('Aiming contracts preserved');
