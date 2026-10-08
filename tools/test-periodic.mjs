// Checks data/periodic.json. Run: node tools/test-periodic.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { elements } = JSON.parse(readFileSync(new URL('../data/periodic.json', import.meta.url), 'utf8'));
assert.equal(elements.length, 118);
elements.forEach((e, i) => assert.equal(e.z, i + 1));
assert.equal(new Set(elements.map(e => e.sym)).size, 118, 'duplicate symbols');
assert.equal(new Set(elements.map(e => `${e.row},${e.col}`)).size, 118, 'two elements share a grid cell');
for (const e of elements) assert.ok(e.name.en && e.name.ms && e.mass, `${e.sym} needs names and mass`);
const by = Object.fromEntries(elements.map(e => [e.sym, e]));
// Elements used by the Lewis activity must agree with its own data
const lewis = JSON.parse(readFileSync(new URL('../data/lewis/elements.json', import.meta.url), 'utf8'));
for (const [sym, l] of Object.entries(lewis)) {
  if (sym.startsWith('_')) continue;
  assert.equal(by[sym].z, l.z, `${sym} atomic number`);
  assert.equal(by[sym].valence, l.valence, `${sym} valence electrons`);
}
console.log('Periodic table data OK');
