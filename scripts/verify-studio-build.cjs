const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'dist');
if (!fs.existsSync(root)) throw new Error('Missing dist output. Run npm.cmd run build before checking studio exclusion.');
const files = [];
function visit(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, item.name);
    if (item.isDirectory()) visit(full);
    else files.push(full);
  }
}
visit(root);
const code = files.filter(file => /\.(?:js|css|html)$/.test(file));
const markers = ['regional-map-studio-v1', 'MapStudio.jsx', 'mapStudio.css', 'map-studio-camera', '__gameTest'];
const violations = [];
for (const file of code) {
  const text = fs.readFileSync(file, 'utf8');
  for (const marker of markers) if (text.includes(marker) || path.basename(file).includes(marker)) violations.push(`${path.relative(root, file)} contains ${marker}`);
}
if (violations.length) {
  console.error('Production output contains development-only map studio artifacts:');
  for (const issue of violations) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Verified ${code.length} production HTML/JS/CSS files; no studio UI, CSS, camera module or test fixture emitted.`);
}
