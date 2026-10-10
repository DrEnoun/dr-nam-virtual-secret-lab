// Checks the Crystal Lattice Builder data and logic. Run: node tools/test-crystal.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  shareFormula, allSites, sitesFor, LATTICES, expectedOccupancy, evaluateBuild, particlesPerCell, tile, coordination, ionAt, pointsFor,
} from '../js/activities/crystal/rules.js';

const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const cells = read('data/crystal/cells.json'), mats = read('data/crystal/materials.json'), levels = read('data/crystal/levels.json');
const en = read('lang/en.json'), ms = read('lang/ms.json');

// Grid and candidate sites
assert.equal(allSites().length, 27);
assert.equal(sitesFor('corners').length, 8);
assert.equal(sitesFor('cubic').length, 15);
assert.equal(sitesFor('all').length, 27);

// The textbook numbers come out of the positions
const textbook = { sc: [1, 6, 8], bcc: [2, 8, 9], fcc: [4, 12, 14] };
for (const [t, [ppc, cn, n]] of Object.entries(textbook)) {
  const occ = expectedOccupancy(t);
  assert.equal(occ.size, n, `${t} sites`);
  assert.equal(particlesPerCell(occ).p, ppc, `${t} particles per cell`);
  assert.equal(coordination(occ), cn, `${t} coordination number`);
  assert.deepEqual(evaluateBuild(t, occ), { ok: true });
  assert.ok(cells[t].name.en && cells[t].name.ms && cells[t].note.en && cells[t].note.ms, `${t} text in both languages`);
}
// NaCl: 14 Cl⁻ (corners + faces), 13 Na⁺ (edges + centre); 4 of each per cell; 6:6 coordination
const nacl = expectedOccupancy('nacl');
assert.equal([...nacl.values()].filter(v => v === 'cl').length, 14);
assert.equal([...nacl.values()].filter(v => v === 'na').length, 13);
assert.deepEqual(particlesPerCell(nacl), { cl: 4, na: 4 });
assert.equal(coordination(nacl, 'na'), 6);
assert.equal(coordination(nacl, 'cl'), 6);
assert.equal(ionAt([1, 1, 1]), 'na');
assert.equal(ionAt([0, 0, 0]), 'cl');

// Typical mistakes get named
const sc = expectedOccupancy('sc');
const missing = new Map(sc); missing.delete('0,0,0');
assert.deepEqual(evaluateBuild('sc', missing), { ok: false, code: 'missing', kind: 'corner', n: 1 });
assert.equal(evaluateBuild('sc', new Map([...sc, ['1,1,1', 'p']])).code, 'extra');
assert.equal(evaluateBuild('sc', new Map([...sc, ['1,1,1', 'p']])).kind, 'body');
const bcc = expectedOccupancy('bcc'); const faceInBcc = new Map(bcc); faceInBcc.set('1,1,0', 'p');
assert.equal(evaluateBuild('bcc', faceInBcc).kind, 'face');
const fcc = expectedOccupancy('fcc'); const fccLess = new Map(fcc); fccLess.delete('1,1,0');
assert.equal(evaluateBuild('fcc', fccLess).kind, 'face');
const swapped = new Map(nacl); swapped.set('1,0,0', 'cl');
assert.equal(evaluateBuild('nacl', swapped).code, 'wrong-ion');
assert.equal(evaluateBuild('nacl', new Map()).code, 'missing');

// Repeating the cell: shared particles are counted once
assert.equal(tile(sc, 2).length, 27);  // 3×3×3 corners
assert.equal(tile(sc, 3).length, 64);  // 4×4×4
assert.equal(tile(bcc, 2).length, 27 + 8);
assert.equal(tile(fcc, 2).length, 27 + 36); // 27 corners + faces: 3 directions × 12 face-centre positions = 36
assert.equal(shareFormula(sc), '8 × ⅛ = 1');
assert.equal(shareFormula(bcc), '8 × ⅛ + 1 × 1 = 2');
assert.equal(shareFormula(expectedOccupancy('fcc')), '8 × ⅛ + 6 × ½ = 4');
assert.equal(pointsFor(0), 10); assert.equal(pointsFor(1), 7); assert.equal(pointsFor(5), 2);

// Levels, materials and quiz
for (const [lvl, cfg] of Object.entries(levels)) {
  if (lvl.startsWith('_')) continue;
  for (const it of cfg.items) {
    const [kind, id] = it.split(':');
    assert.ok(['build', 'identify', 'match', 'quiz'].includes(kind), `${lvl}: ${it}`);
    if (kind === 'build') assert.ok(LATTICES[id], `${lvl}: unknown lattice ${id}`);
  }
}
const ids = mats.structures.map(s => s.id);
for (const s of mats.structures) { assert.ok(s.name.en && s.name.ms && s.bonding.en && s.bonding.ms && s.why.en && s.why.ms, `${s.id} text`); }
for (const p of mats.properties) { assert.ok(p.text.en && p.text.ms); assert.ok(p.for === null || ids.includes(p.for)); }
assert.equal(mats.properties.filter(p => p.for).length, mats.structures.length, 'one property per structure');
assert.ok(mats.properties.some(p => p.for === null), 'there is a decoy property');
for (const q of mats.quiz) { assert.equal(q.options.length, 4); assert.ok(q.answer >= 0 && q.answer < 4); for (const o of q.options) assert.ok(o.en && o.ms); assert.ok(q.q.en && q.q.ms && q.hint.en && q.hint.ms); }
assert.ok(mats.quiz.length >= 5, 'short quiz has at least 5 questions');

const keys = o => Object.keys(o).filter(k => k.startsWith('crystal.')).sort();
assert.deepEqual(keys(en), keys(ms), 'crystal.* keys differ between en.json and ms.json');
console.log('Crystal lattice data OK');
