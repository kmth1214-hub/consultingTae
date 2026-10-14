const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const html = fs.readFileSync('cookie-roguelike-mockup.html', 'utf8').replace(/\r\n/g, '\n');
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (match[1].trim()) new vm.Script(match[1]);
console.log('Inline scripts OK');
const before = execFileSync('git', ['show', 'HEAD:cookie-roguelike-mockup.html'], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
for (const name of ['cameraTransformFor', 'getWorldPointFromPointer', 'getStoneCenter', 'drawTrajectoryPreview', 'aimPointFromPointer', 'animateProjectile', 'onArenaPointerUp']) {
  const pattern = new RegExp('(?:async )?function ' + name + '\\([^]*?\\n    }');
  const previous = before.match(pattern)?.[0];
  if (!previous || previous !== html.match(pattern)?.[0]) throw Error('Protected coordinate function changed: ' + name);
}
console.log('Camera coordinate formula and aiming functions unchanged');
