const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

for (const name of ['distant', 'midground', 'foreground']) {
  const png = fs.readFileSync('assets/maps/forest-layers/' + name + '.png');
  if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw Error(name + ': invalid PNG');
  if (png.readUInt32BE(16) !== 1536 || png.readUInt32BE(20) !== 1024) throw Error(name + ': unexpected dimensions');
  if (name !== 'distant' && ![4, 6].includes(png[25])) throw Error(name + ': alpha channel missing');
  console.log(name, png.readUInt32BE(16), png.readUInt32BE(20), 'color type', png[25]);
}

const html = fs.readFileSync('cookie-roguelike-mockup.html', 'utf8').replace(/\r\n/g, '\n');
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
  if (match[1].trim()) new vm.Script(match[1]);
}
console.log('Inline scripts OK');

// This T01-specific check is run before its commit; T02 intentionally changes camera functions.
const before = execFileSync('git', ['show', 'HEAD:cookie-roguelike-mockup.html'], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
for (const name of ['cameraTransformFor', 'stopCameraAnimation', 'focusCameraOn', 'playRoundIntro', 'getWorldPointFromPointer', 'getStoneCenter', 'drawTrajectoryPreview', 'animateProjectile', 'setArenaArea']) {
  const pattern = new RegExp('(?:async )?function ' + name + '\\([^]*?\\n    }');
  const oldFunction = before.match(pattern)?.[0];
  const newFunction = html.match(pattern)?.[0];
  if (!oldFunction || oldFunction !== newFunction) throw Error('Protected T01 function changed: ' + name);
}
console.log('Protected camera/aim/area functions unchanged');
