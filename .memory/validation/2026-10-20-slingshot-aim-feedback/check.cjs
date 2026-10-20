const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('cookie-roguelike-mockup.html', 'utf8');
const pointerDown = html.match(/function onArenaPointerDown\(event\)\s*\{[\s\S]*?\n    \}/)?.[0] || '';
const powerDown = html.match(/function onPowerKeyDown\(event\)\s*\{[\s\S]*?\n    \}/)?.[0] || '';
const powerUp = html.match(/function onPowerKeyUp\(event\)\s*\{[\s\S]*?\n    \}/)?.[0] || '';
const pointerUp = html.match(/async function onArenaPointerUp\(event\)\s*\{[\s\S]*?\n    \}/)?.[0] || '';
const draw = html.match(/function updateSlingshotDraw\(angleDeg,powerPercent\)\s*\{[\s\S]*?\n    \}/)?.[0] || '';
const aimState = html.match(/function updateAimState\(\)\s*\{[\s\S]*?\n    \}/)?.[0] || '';
const preview = html.match(/function drawTrajectoryPreview\(\)\s*\{[\s\S]*?\n    \}/)?.[0] || '';

assert.match(pointerDown, /getBoundingClientRect\(\)/, 'aim starts only within launcher bounds');
assert.match(pointerDown, /enemyGroup\.offsetLeft \+ enemyGroup\.offsetWidth \/ 2/, 'default aim target is centered on enemies');
assert.match(pointerDown, /focusAimCamera\(true,1\.5\)/, 'launcher is focused at close zoom when grabbed');
assert.match(powerDown, /zoomAimCameraOut\(1400\)/, 'camera eases toward fit view during charge');
assert.match(powerUp, /stopCameraAnimation\(\)[\s\S]*?aimState\.isPowerLocked = true/, 'camera freezes when power is locked');
assert.doesNotMatch(pointerUp, /focusAimCamera\(/, 'launch does not snap focus back to launcher');
assert.match(pointerUp, /restoreAimCamera\(false\)/, 'camera returns to wide view after shot');

assert.match(draw, /\(powerPercent - POWER_MIN_PERCENT\) \/ \(POWER_MAX_PERCENT - POWER_MIN_PERCENT\)/, 'tension is normalized from power');
assert.match(draw, /pullDistance = 18 \* tension/);
assert.match(draw, /Math\.cos\(angle\) \* pullDistance/);
assert.match(draw, /Math\.sin\(angle\) \* pullDistance/);
assert.match(draw, /bandLeft\.style\.strokeWidth/);
assert.match(aimState, /updateSlingshotDraw\(aimState\.angleDeg,aimState\.powerPercent\)/);

assert.match(preview, /var previewFraction = 0\.30/);
assert.match(html, /\.trajectory-preview path \{[^}]*stroke:rgba\(255,231,157,\.62\)[^}]*stroke-width:4/);
assert.match(html, /#arena\[data-area="forest"\]\[data-forest-ready="true"\] \.trajectory-preview \{ z-index:6/);
assert.match(html, /\.forest-foreground \{ z-index:5/);
assert.match(html, /prefers-reduced-motion:\s*reduce/);

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
assert.ok(scripts.length > 0, 'inline script exists');
new Function(scripts.at(-1));

console.log('Slingshot trigger, camera timing, draw tension, trajectory visibility, and inline JavaScript syntax passed.');
