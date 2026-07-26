/**
 * Generates functions/lib/rating-engine.js — a CommonJS copy of the ESM
 * src/core/rating-engine.js.
 *
 * The Cloud Functions package only uploads the functions/ directory, so it
 * cannot require ../src/, and functions/ is CommonJS while the root package is
 * ESM. Vendoring keeps one source of truth instead of a hand-maintained fork.
 *
 * Runs automatically from firebase.json predeploy. Run manually with:
 *   node scripts/vendor-rating-engine.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'src/core/rating-engine.js');
const OUT = resolve(root, 'functions/lib/rating-engine.js');

const source = readFileSync(SRC, 'utf8');

const names = [...source.matchAll(/^export\s+(?:const|function)\s+([A-Za-z0-9_$]+)/gm)].map(m => m[1]);
if (names.length === 0) {
    throw new Error(`No named exports found in ${SRC} — refusing to write an empty module`);
}

const body = source
    .replace(/^export\s+default\s+.*;?$/gm, '')
    .replace(/^export\s+(const|function)\s/gm, '$1 ');

const banner = `/* GENERATED FILE — do not edit.
 * Source: src/core/rating-engine.js
 * Regenerate: node scripts/vendor-rating-engine.js
 */\n\n`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${banner}${body}\nmodule.exports = { ${names.join(', ')} };\n`);

console.log(`Vendored ${names.length} exports → functions/lib/rating-engine.js`);
