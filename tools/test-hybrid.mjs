// Checks the Hybridization Lab data and logic. Run: node tools/test-hybrid.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  groupsOf, hybridOf, leftoverP, shapeOf, piBondsAround, countTargets, evaluateCount, evaluateMix, evaluatePi, explainLabel, markedAtoms, neighbours, atomOf,
} from '../js/activities/hybrid/rules.js';

const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const M = read('data/hybrid/molecules.json'), L = read('data/hybrid/levels.json');
const en = read('lang/en.json'), ms = read('lang/ms.json');

// What the textbook says for every molecule in the levels
const expected = {
  CH4: [4, 'sp3', 0], C2H4: [3, 'sp2', 1], C2H2: [2, 'sp', 2], NH3: [4, 'sp3', 0], H2O: [4, 'sp3', 0],
  BF3: [3, 'sp2', 1], BeCl2: [2, 'sp', 2], CO2: [2, 'sp', 2], HCN: [2, 'sp', 2],
};
const shapes = { CH4: 'tetrahedral', C2H4: 'trigonal planar', C2H2: 'linear', NH3: 'trigonal pyramidal', H2O: 'bent', BF3: 'trigonal planar', BeCl2: 'linear', CO2: 'linear', HCN: 'linear' };
for (const [id, [g, h, p]] of Object.entries(expected)) {
  const m = M[id], c = m.central;
  assert.equal(groupsOf(m, c), g, `${id} groups`);
  assert.equal(hybridOf(m, c), h, `${id} hybrid`);
  assert.equal(leftoverP(m, c), p, `${id} leftover p`);
  assert.equal(shapeOf(m, c).name.en, shapes[id], `${id} shape`);
  assert.ok(shapeOf(m, c).name.ms, `${id} shape in BM`);
  // 3D data: every atom has coordinates, central atom has lp3d when it has lone pairs
  for (const a of m.atoms) assert.equal(a.xyz?.length, 3, `${id}.${a.id} needs xyz`);
  if (atomOf(m, c).lp) assert.equal(m.lp3d.length, atomOf(m, c).lp, `${id} lp3d`);
  assert.ok(m.name.en && m.name.ms && m.note.en && m.note.ms, `${id} text in both languages`);
}
// Levels refer to real molecules
for (const [lvl, cfg] of Object.entries(L)) {
  if (lvl.startsWith('_')) continue;
  for (const ref of cfg.items) assert.ok(M[ref.split(':')[1]], `${lvl}: unknown ${ref}`);
}
// The counting step: right answer accepted, each typical mistake named
for (const [id] of Object.entries(expected)) {
  const m = M[id], c = m.central, T = countTargets(m, c);
  const right = new Set();
  for (const { bond } of neighbours(m, c)) right.add(T.find(t => t.kind === 'line' && t.bond === bond).id);
  T.filter(t => t.kind === 'lp' || t.kind === 'h').forEach(t => right.add(t.id));
  assert.equal(evaluateCount(m, c, right).ok, true, `${id}: right count rejected`);
  assert.equal(right.size, groupsOf(m, c), `${id}: picked ${right.size}`);
  const lp = T.find(t => t.kind === 'lp');
  if (lp) { const less = new Set(right); less.delete(lp.id); assert.equal(evaluateCount(m, c, less).code, 'missed-lp', `${id} lp`); }
  const decoy = T.find(t => t.kind === 'decoy');
  if (decoy) assert.equal(evaluateCount(m, c, new Set([...right, decoy.id])).code, 'decoy', `${id} decoy`);
  const multi = T.find(t => t.kind === 'line' && t.bond.order > 1 && t.index === 1);
  if (multi) assert.equal(evaluateCount(m, c, new Set([...right, multi.id])).code, 'double', `${id} double bond counted twice`);
  assert.equal(evaluateCount(m, c, new Set()).ok, false);
  // σ/π labelling
  const labels = new Map();
  for (const { bond } of neighbours(m, c)) for (let i = 0; i < bond.order; i++) labels.set(`${bond.a}-${bond.b}#${i}`, i === 0 ? 'sigma' : 'pi');
  assert.equal(evaluatePi(m, c, labels).ok, true, `${id} σ/π`);
  assert.equal(piBondsAround(m, c) > 0, (expected[id][2] > 0 && ['C2H4', 'C2H2', 'CO2', 'HCN'].includes(id)), `${id} π bonds`);
}
// The mixer
assert.deepEqual(evaluateMix(4, 1, 3), { ok: true, hybrid: 'sp3' });
assert.deepEqual(evaluateMix(3, 1, 2), { ok: true, hybrid: 'sp2' });
assert.deepEqual(evaluateMix(2, 1, 1), { ok: true, hybrid: 'sp' });
assert.equal(evaluateMix(3, 1, 3).code, 'many-p');
assert.equal(evaluateMix(4, 1, 2).code, 'few-p');
assert.equal(evaluateMix(2, 0, 1).code, 'no-s');
assert.equal(evaluateMix(4, 1, 3, 1).code, 'd');
// Hard: drug molecules — marked atoms and their expected labels
const hardExpect = { paracetamol: ['sp2', 'sp2', 'sp2', 'sp2', 'sp3'], aspirin: ['sp2', 'sp2', 'sp2', 'sp2', 'sp3'] };
for (const [id, labels] of Object.entries(hardExpect)) {
  const m = M[id];
  assert.deepEqual(markedAtoms(m).map(a => hybridOf(m, a.id)), labels, `${id} marked atoms`);
  assert.ok(m.name.en && m.name.ms && m.note.en && m.note.ms);
  for (const a of m.atoms) assert.equal(a.xy?.length, 2, `${id}.${a.id} xy`);
  // every bond refers to real atoms; no two atoms drawn on top of each other
  m.bonds.forEach(b => { atomOf(m, b.a); assert.ok(atomOf(m, b.a) && atomOf(m, b.b)); });
  for (let i = 0; i < m.atoms.length; i++) for (let j = i + 1; j < m.atoms.length; j++) assert.ok(Math.hypot(m.atoms[i].xy[0] - m.atoms[j].xy[0], m.atoms[i].xy[1] - m.atoms[j].xy[1]) > 0.5, `${id}: atoms overlap`);
}
const para = M.paracetamol;
const cme = markedAtoms(para).find(a => a.id === 'cme');
assert.equal(explainLabel(para, cme.id, 'sp2').miss, 'h', 'methyl: forgot the hydrogens');
const oco = markedAtoms(para).find(a => a.id === 'oco');
assert.equal(explainLabel(para, oco.id, 'sp').miss, 'lp', 'carbonyl O: forgot a lone pair');
assert.equal(explainLabel(para, oco.id, 'sp3').miss, 'multiple', 'carbonyl O: double bond counted twice');
// Same hybrid/lang keys in both language files
const keys = o => Object.keys(o).filter(k => k.startsWith('hybrid.')).sort();
assert.deepEqual(keys(en), keys(ms), 'hybrid.* keys differ between en.json and ms.json');
console.log('Hybridization data OK');
