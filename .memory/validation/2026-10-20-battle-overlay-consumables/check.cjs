const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('cookie-roguelike-mockup.html', 'utf8');
const arenaMatch = html.match(/<section class="arena" id="arena"[\s\S]*?<div class="arena-caption"/);
assert.ok(arenaMatch, 'battle arena markup exists');
const arena = arenaMatch[0];
assert.match(arena, /id="inventoryOverlay" class="card arena-overlay inventory"/);
assert.match(arena, /id="weaponCard" class="card arena-overlay weapon-card"/);
assert.equal((html.match(/id="inventoryOverlay"/g) || []).length, 1, 'inventory is not duplicated');
assert.equal((html.match(/id="weaponCard"/g) || []).length, 1, 'weapon card is not duplicated');
assert.doesNotMatch(html, /class="combat-hud"|class="aim-controls"/, 'lower HUD cards are removed');
assert.match(arena, /id="angleValue" class="angle-readout"/);

for (let key = 1; key <= 4; key += 1) {
  assert.match(arena, new RegExp(`aria-label="${key}번 키"`), `item key ${key} is shown`);
  assert.match(arena, new RegExp(`onclick="useItem\\(${key}\\)"`), `item ${key} retains its Use button`);
}
assert.equal((arena.match(/class="item-slot" data-consumable=/g) || []).length, 4, 'all consumable rows remain');
assert.match(html, /\['1','2','3','4'\][\s\S]{0,80}useItem\(Number\(e\.key\)\)/, 'keyboard shortcuts remain connected');

const elements = html.match(/function getAimElements\(\)\s*\{[\s\S]*?\n    \}/)?.[0] || '';
const reset = html.match(/function resetAimAfterShot\(\)\s*\{[\s\S]*?\n    \}/)?.[0] || '';
const cancel = html.match(/function cancelAim\(reason\)\s*\{[\s\S]*?\n    \}/)?.[0] || '';
const pointerUp = html.match(/async function onArenaPointerUp\(event\)\s*\{[\s\S]*?\n    \}/)?.[0] || '';
assert.match(elements, /weaponCard:document\.getElementById\('weaponCard'\)/);
assert.match(pointerUp, /aimState\.phase = 'launching'[\s\S]*?weaponCard\.hidden = true[\s\S]*?await animateProjectile[\s\S]*?resetAimAfterShot\(\)/);
assert.match(reset, /weaponCard\.hidden = false/);
assert.match(cancel, /weaponCard\.hidden = false/);
assert.match(html, /\.arena-overlay\[hidden\]\s*\{\s*display:none;\s*\}/);
assert.match(html, /@media \(max-width:520px\)[\s\S]*?\.inventory \{ left:9px;width:47%/);

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
assert.ok(scripts.length > 0, 'inline script exists');
new Function(scripts.at(-1));

console.log('Battle overlay markup, shortcuts, launch lifecycle, responsive rules, and inline JavaScript syntax passed.');
