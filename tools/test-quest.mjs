// ChemQuest checks: every Diner Dash order has the right name and formula, the serve checker
// gives the right verdicts, and every avatar sprite row is the same width.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formulaOf, checkServe, buildOrders, orderPool, buildTray, orderName, starsFor, tipFor } from '../quest/js/diner-logic.js';
import { worldProgress, worldStates, walkPath, starKey } from '../quest/js/progress.js';
import { EMBLEMS } from '../quest/js/badges.js';
import { newGame, flip, clearPending, pickSets, starsForHearts } from '../quest/js/memory-logic.js';
import { SHAPES } from '../quest/js/shapes.js';
import { MONSTERS, GEOMETRY, ATOM, MOODS } from '../quest/js/monsters.js';
import { OPTIONS, DEFAULT_AVATAR, randomAvatar, WIDTH, HEIGHT } from '../quest/js/avatar.js';

const d = JSON.parse(readFileSync('quest/data/diner.json', 'utf8'));
const byId = Object.fromEntries(d.ions.map(i => [i.id, i]));

// Independent answer key (written out by hand, not computed): name -> formula
const KEY = {
  'sodium chloride': 'NaCl', 'potassium bromide': 'KBr', 'lithium fluoride': 'LiF', 'magnesium oxide': 'MgO',
  'calcium sulfide': 'CaS', 'silver chloride': 'AgCl',
  'magnesium chloride': 'MgCl2', 'calcium bromide': 'CaBr2', 'sodium oxide': 'Na2O', 'potassium sulfide': 'K2S',
  'aluminium chloride': 'AlCl3', 'aluminium oxide': 'Al2O3', 'lithium sulfide': 'Li2S', 'calcium fluoride': 'CaF2',
  'sodium hydroxide': 'NaOH', 'potassium nitrate': 'KNO3', 'calcium carbonate': 'CaCO3', 'sodium sulfate': 'Na2SO4',
  'magnesium nitrate': 'Mg(NO3)2', 'calcium hydroxide': 'Ca(OH)2', 'aluminium hydroxide': 'Al(OH)3',
  'ammonium sulfate': '(NH4)2SO4', 'ammonium chloride': 'NH4Cl', 'calcium phosphate': 'Ca3(PO4)2',
  'aluminium sulfate': 'Al2(SO4)3', 'sodium phosphate': 'Na3PO4', 'potassium carbonate': 'K2CO3',
  'magnesium hydroxide': 'Mg(OH)2',
};
// British spellings required by the brief
const NAMES = new Set(d.ions.map(i => i.name));
['aluminium', 'sulfate', 'sulfide'].forEach(n => assert.ok(NAMES.has(n), `${n} missing`));
['aluminum', 'sulphate', 'sulphide'].forEach(n => assert.ok(!NAMES.has(n), `use British spelling, not ${n}`));

// Ions: ids unique, id = symbol + charge, sign matches the id
const ids = new Set();
for (const i of d.ions) {
  assert.ok(!ids.has(i.id), `duplicate ion ${i.id}`); ids.add(i.id);
  const mag = Math.abs(i.charge);
  assert.equal(i.id, `${i.sym}${mag > 1 ? mag : ''}${i.charge > 0 ? '+' : '-'}`, `${i.id}: id does not match symbol and charge`);
  assert.ok(i.charge !== 0 && mag <= 3);
  assert.equal(!!i.poly, /[A-Z][a-z]?\d|[A-Z]{2}/.test(i.sym), `${i.id}: poly flag`);
}

let orders = 0;
for (const lv of d.levels) {
  const pool = orderPool(lv, d.levels);
  assert.ok(pool.length >= lv.customers, `level ${lv.id}: needs at least ${lv.customers} orders`);
  assert.ok(lv.decoys + 2 <= d.ions.length);
  const seen = new Set(), cats = {};
  if (lv.mixFrom) lv.mixFrom.forEach(id => assert.ok(d.levels.some(l => l.id === id && !l.mixFrom), `level ${lv.id}: mixFrom ${id} must be an ordinary shift`));
  for (const o of pool) {
    const cat = byId[o.cation], an = byId[o.anion];
    assert.ok(cat && an, `level ${lv.id}: unknown ion in ${JSON.stringify(o)}`);
    assert.ok(cat.charge > 0 && an.charge < 0, `${cat.id}/${an.id}: cation must be + and anion −`);
    const name = orderName(cat, an), f = formulaOf(cat, an);
    assert.ok(!seen.has(name), `level ${lv.id}: ${name} listed twice`); seen.add(name);
    if (lv.boss) { cats.simple ||= f.nc === 1 && f.na === 1 && !cat.poly && !an.poly; cats.unequal ||= (f.nc !== 1 || f.na !== 1) && !cat.poly && !an.poly; cats.poly ||= cat.poly || an.poly; }
    assert.equal(f.text, KEY[name], `${name}: expected ${KEY[name]}, got ${f.text}`);
    assert.equal(f.nc * cat.charge + f.na * an.charge, 0, `${name}: charges do not cancel`);
    // level shape: 1 = all 1:1 monatomic, 2 = unequal monatomic, 3 = at least one polyatomic ion
    if (lv.id === 1) assert.ok(f.nc === 1 && f.na === 1 && !cat.poly && !an.poly, `${name}: level 1 must be simple 1:1`);
    if (lv.id === 2) assert.ok((f.nc !== 1 || f.na !== 1) && !cat.poly && !an.poly, `${name}: level 2 must be unequal monatomic`);
    if (lv.id === 3) assert.ok(cat.poly || an.poly, `${name}: level 3 must include a polyatomic ion`);
    orders++;
  }
  if (lv.boss) assert.ok(cats.simple && cats.unequal && cats.poly, `boss shift ${lv.id} must mix all three kinds of order`);
  // Every order can be served correctly, and tricks are caught
  for (const o of buildOrders(lv, d.ions, Math.random, d.levels)) {
    const f = formulaOf(o.cat, o.an);
    const good = { [o.cat.id]: f.nc, [o.an.id]: f.na };
    assert.equal(checkServe(o, good).ok, true);
    const tray = buildTray(o, d.ions, lv.decoys);
    assert.equal(tray.length, lv.decoys + 2); assert.equal(new Set(tray.map(i => i.id)).size, tray.length);
    assert.ok(tray.includes(o.cat) && tray.includes(o.an));
    assert.equal(checkServe(o, { [o.cat.id]: f.nc + 1, [o.an.id]: f.na }).kind, 'unbalanced');
    assert.equal(checkServe(o, { [o.cat.id]: f.nc * 2, [o.an.id]: f.na * 2 }).kind, 'not-simplest');
    assert.equal(checkServe(o, { [o.cat.id]: f.nc }).kind, 'wrong-ions');
    assert.equal(checkServe(o, { ...good, [d.ions.find(i => i.id !== o.cat.id && i.id !== o.an.id).id]: 1 }).kind, 'wrong-ions');
    assert.equal(checkServe(o, {}).kind, 'empty');
  }
}

// Worked example from the brief: aluminium oxide = 2 Al3+ : 3 O2-
const alO = { cat: byId['Al3+'], an: byId['O2-'] };
assert.deepEqual(formulaOf(alO.cat, alO.an), { nc: 2, na: 3, text: 'Al2O3' });
assert.equal(checkServe(alO, { 'Al3+': 1, 'O2-': 1 }).kind, 'unbalanced');
assert.equal(checkServe(alO, { 'Al3+': 4, 'O2-': 6 }).kind, 'not-simplest');
assert.match(checkServe(alO, { 'Al3+': 2, 'O2-': 3 }).message, /Al₂O₃/);

assert.deepEqual([1, 2, 3, 0].map(starsFor), [1, 2, 3, 1]);
assert.ok(tipFor(1) > tipFor(0) && tipFor(0) >= 5);

// Avatar options: every list non-empty, sensible defaults, sprite size matches the layout the scene and map expect
assert.equal(WIDTH, 32); assert.equal(HEIGHT, 44);
for (const k of ['skin', 'hairStyle', 'hair', 'coat']) assert.ok(OPTIONS[k].length >= 3, `${k}: needs at least 3 choices`);
assert.ok(OPTIONS.hairStyle.includes('tudung'));
[...OPTIONS.skin, ...OPTIONS.hair, ...OPTIONS.coat].forEach(c => assert.match(c, /^#[0-9a-f]{6}$/i));
assert.ok(DEFAULT_AVATAR.skin < OPTIONS.skin.length && DEFAULT_AVATAR.hair < OPTIONS.hair.length && DEFAULT_AVATAR.coat < OPTIONS.coat.length);
for (let i = 0; i < 50; i++) {
  const a = randomAvatar();
  assert.ok(a.skin < OPTIONS.skin.length && a.hair < OPTIONS.hair.length && a.coat < OPTIONS.coat.length && OPTIONS.hairStyle.includes(a.hairStyle));
}

// Overworld: six worlds in order, pins on the map, unique badges, sensible unlock rules
const wd = JSON.parse(readFileSync('quest/data/worlds.json', 'utf8'));
const W = wd.worlds;
const mem = JSON.parse(readFileSync('quest/data/memory.json', 'utf8'));
assert.deepEqual(W.map(w => w.id), [1, 2, 3, 4, 5, 6]);
assert.equal(new Set(W.map(w => w.badge)).size, 6, 'badge names must be unique');
assert.equal(new Set(W.map(w => w.accent)).size, 6, 'world colours must be unique');
for (const w of W) {
  assert.ok(EMBLEMS[w.emblem], `world ${w.id}: unknown emblem ${w.emblem}`);
  assert.ok(w.pin[0] > 56 && w.pin[0] < wd.map.width - 56 && w.pin[1] > 60 && w.pin[1] < wd.map.height - 40, `world ${w.id}: pin too close to the map edge`);
  assert.ok(w.tip && w.topic && w.gameplay && w.callout);
  if (w.playable) { assert.ok(w.blurb); w.levelIds.forEach(id => assert.ok((w.id === 6 ? d.levels : mem.levels).some(l => l.id === id), `world ${w.id}: unknown level ${id}`)); }
  else assert.ok(!w.levelIds, `world ${w.id}: unbuilt worlds have no levels yet`);
}
for (let i = 1; i < W.length; i++) assert.ok(W[i].pin[1] < W[i - 1].pin[1], 'worlds climb the map from bottom to top');
// Fresh save: World 1 open, World 6 open as a preview, the rest locked
assert.deepEqual(worldStates(W, {}).map(s => s.unlocked), [true, false, false, false, false, true]);
assert.equal(starKey(6, 2), '6.2');
assert.equal(worldStates(W, {}).filter(s => s.earned).length, 0);
// Clearing every Ion Diner shift earns the World 6 badge; one shift is not enough
assert.equal(worldProgress(W[5], { '6.1': 3, '6.2': 2 }).cleared, false);
assert.equal(worldProgress(W[5], { '6.1': 3, '6.2': 2, '6.3': 1 }).cleared, false, 'the boss shift must be cleared too');
const done = worldProgress(W[5], { '6.1': 3, '6.2': 2, '6.3': 1, '6.4': 2 });
assert.deepEqual([done.cleared, done.starSum, done.got, done.total], [true, 8, 4, 4]);
assert.equal(worldStates(W, { '6.1': 3, '6.2': 2, '6.3': 1, '6.4': 2 })[5].earned, true);
// World 1's levels do not collide with Ion Diner's stars
assert.equal(worldProgress(W[0], { '6.1': 3, '6.2': 3, '6.3': 3, '6.4': 3 }).got, 0);
assert.equal(worldStates(W, { '1.1': 3, '1.2': 3, '1.3': 3, '1.4': 1 })[1].unlocked, true, 'clearing World 1 opens World 2');
// A world opens when the one before it is cleared
const fake = [{ id: 1, levelIds: [1] }, { id: 2, levelIds: [2] }, { id: 3, levelIds: [3] }];
assert.deepEqual(worldStates(fake, {}).map(s => s.unlocked), [true, false, false]);
assert.deepEqual(worldStates(fake, { '1.1': 1 }).map(s => s.unlocked), [true, true, false]);
assert.deepEqual(walkPath(1, 4), [1, 2, 3, 4]);
assert.deepEqual(walkPath(6, 5), [6, 5]);

// Molecule monsters: each one is a real molecule with a correct, British-spelt fact; geometry matches the chemistry
assert.equal(new Set(MONSTERS.map(m => m.id)).size, MONSTERS.length);
for (const m of MONSTERS) { assert.ok(m.name && m.fact.length > 40, `${m.id}: needs a name and a fact`); assert.ok(!/color|center|polariz/i.test(m.fact), `${m.id}: use British spelling`); }
assert.deepEqual(GEOMETRY, { water: 104.5, co2: 180, nh3: 107, ch4: 109.5 });
assert.match(MONSTERS.find(m => m.id === 'water').fact, /104\.5/); assert.match(MONSTERS.find(m => m.id === 'co2').fact, /180/);
assert.match(MONSTERS.find(m => m.id === 'nh3').fact, /107/); assert.match(MONSTERS.find(m => m.id === 'ch4').fact, /109\.5/);
for (const a of ['H', 'O', 'C', 'N', 'Na', 'Cl']) assert.ok(ATOM[a].r > 0 && /^#[0-9a-f]{6}$/i.test(ATOM[a].col));
assert.deepEqual(MOODS, ['happy', 'cheer', 'sad', 'shock']);
assert.ok(ATOM.Cl.r > ATOM.Na.r, 'Cl⁻ is larger than Na⁺');

// ---------- World 1 memory match: every card is checked against an independent answer key ----------
const NAME_FORMULA = {
  sulfate: 'SO4^2-', nitrate: 'NO3^-', carbonate: 'CO3^2-', phosphate: 'PO4^3-', hydroxide: 'OH^-', ammonium: 'NH4^+', chloride: 'Cl^-', oxide: 'O^2-', sulfide: 'S^2-',
  'sodium chloride': 'NaCl', 'magnesium oxide': 'MgO', 'calcium carbonate': 'CaCO3', 'aluminium oxide': 'Al2O3', 'magnesium chloride': 'MgCl2',
  'calcium hydroxide': 'Ca(OH)2', 'sodium sulfate': 'Na2SO4', 'ammonium chloride': 'NH4Cl',
  water: 'H2O', 'carbon dioxide': 'CO2', ammonia: 'NH3', methane: 'CH4', 'boron trifluoride': 'BF3',
};
const FORMULA_SHAPE = { H2O: 'bent', CO2: 'linear', NH3: 'trigonal pyramidal', CH4: 'tetrahedral', BF3: 'trigonal planar' };
const SHAPE_ANGLE = { bent: '104.5°', linear: '180°', 'trigonal pyramidal': '≈107°', tetrahedral: '109.5°', 'trigonal planar': '120°' };
assert.deepEqual(mem.levels.map(l => l.id), [1, 2, 3, 4]);
for (const lv of mem.levels) {
  assert.ok(lv.tip && lv.title && lv.subtitle);
  assert.ok(lv.group === 2 || lv.group === 3);
  assert.equal(lv.boss === true, lv.id === 4, 'only the last level is the boss');
  if (lv.boss) assert.ok(lv.time >= 60, 'the boss is timed');
  const uniq = new Set(lv.sets.map(x => x.uniq));
  assert.ok(uniq.size >= lv.pick, `level ${lv.id}: needs ${lv.pick} sets with different uniq keys`);
  assert.equal(new Set(lv.sets.map(x => x.id)).size, lv.sets.length, `level ${lv.id}: duplicate set id`);
  for (const set of lv.sets) {
    assert.equal(set.cards.length, lv.group, `${lv.id}/${set.id}: ${lv.group} cards per set`);
    assert.equal(new Set(set.cards.map(c => c.kind)).size, lv.group, `${set.id}: one card of each kind`);
    assert.ok(set.fact.length > 30 && !/sulphate|sulphide|color|center/i.test(set.fact), `${set.id}: fact`);
    const by = Object.fromEntries(set.cards.map(c => [c.kind, c]));
    if (by.name && by.formula) assert.equal(by.formula.text, NAME_FORMULA[by.name.text], `${set.id}: ${by.name.text} should be ${NAME_FORMULA[by.name.text]}`);
    if (by.formula && by.shape) {
      assert.equal(by.shape.shape, FORMULA_SHAPE[by.formula.text], `${set.id}: ${by.formula.text} should be ${FORMULA_SHAPE[by.formula.text]}`);
      assert.equal(by.shape.angle, SHAPE_ANGLE[by.shape.shape]);
      assert.equal(set.uniq, by.shape.shape, `${set.id}: shape sets must use the shape as their uniq key`);
      assert.ok(SHAPES[by.shape.shape], `${set.id}: no pictogram for ${by.shape.shape}`);
    }
    if (by.name && !by.formula) assert.fail(`${set.id}: a name card needs its formula`);
  }
}
assert.equal(SHAPES.bent.angle, '104.5°'); assert.equal(SHAPES.tetrahedral.angle, '109.5°');
// bond angle in the pictogram matches the real angle: the two outer atoms of "bent" are 104.5° apart
{ const [a, b] = SHAPES.bent.atoms, [cx, cy] = SHAPES.bent.centre, ang = Math.abs(Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx)) * 180 / Math.PI; assert.ok(Math.abs(ang - 104.5) < 1, `bent pictogram angle ${ang}`); }
// pickSets never deals two sets with the same uniq key
const seeded = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
for (let i = 1; i <= 60; i++) for (const lv of mem.levels) { const sets = pickSets(lv, seeded(i)); assert.equal(sets.length, lv.pick); assert.equal(new Set(sets.map(x => x.uniq)).size, sets.length); }
{ // rules: exploring is free, remembering is not
  const lv = mem.levels[0], g = newGame(lv, seeded(7));
  assert.equal(g.cards.length, lv.pick * 2); assert.equal(new Set(g.cards.map(c => c.uid)).size, g.cards.length);
  const find = (setId, not) => g.cards.filter(c => c.setId === setId && c.uid !== not)[0];
  const [A, B] = g.sets;
  const a1 = find(A.id), b1 = find(B.id);
  assert.equal(flip(g, a1.uid).type, 'open'); assert.equal(flip(g, a1.uid).type, 'ignore', 'cannot flip an open card twice');
  let r = flip(g, b1.uid); assert.equal(r.type, 'mismatch'); assert.equal(r.careless, false, 'first look costs nothing'); assert.equal(g.hearts, 3); assert.equal(r.facts.length, 2);
  assert.equal(flip(g, find(A.id, a1.uid).uid).type, 'ignore', 'locked while the mismatch is showing');
  clearPending(g);
  flip(g, a1.uid); r = flip(g, b1.uid); assert.equal(r.careless, true, 'both already seen'); assert.equal(g.hearts, 2); clearPending(g);
  flip(g, a1.uid); r = flip(g, find(A.id, a1.uid).uid); assert.equal(r.type, 'match'); assert.equal(g.matches, 1); assert.equal(g.streak, 1); assert.ok(r.coins >= 8);
  assert.equal(flip(g, a1.uid).type, 'ignore', 'matched cards stay');
  // perfect play wins with the hearts that are left
  for (const s of g.sets.slice(1)) { const [x, y] = g.cards.filter(c => c.setId === s.id); flip(g, x.uid); r = flip(g, y.uid); assert.equal(r.type, 'match'); }
  assert.equal(g.won, true); assert.equal(g.over, true); assert.equal(g.total, lv.pick);
  assert.equal(starsForHearts(g.hearts), 2);
}
{ // three hearts gone ends the level
  const g = newGame(mem.levels[0], seeded(3)), [A, B] = g.sets, a = g.cards.find(c => c.setId === A.id), b = g.cards.find(c => c.setId === B.id);
  flip(g, a.uid); flip(g, b.uid); clearPending(g);
  for (let i = 0; i < 3; i++) { flip(g, a.uid); flip(g, b.uid); if (!g.over) clearPending(g); }
  assert.equal(g.hearts, 0); assert.equal(g.over, true); assert.equal(g.won, false);
}
{ // boss: three cards per molecule; a wrong second card ends the attempt at once
  const g = newGame(mem.levels[3], seeded(11)), [A, B] = g.sets;
  assert.equal(g.cards.length, 12); assert.equal(g.group, 3);
  const ca = g.cards.filter(c => c.setId === A.id), cb = g.cards.find(c => c.setId === B.id);
  assert.equal(flip(g, ca[0].uid).type, 'open'); assert.equal(flip(g, ca[1].uid).type, 'open');
  const r = flip(g, ca[2].uid); assert.equal(r.type, 'match'); assert.equal(r.cards.length, 3); assert.equal(g.matches, 1);
  flip(g, cb.uid); const bad = flip(g, g.cards.find(c => c.setId !== B.id && !g.matched.has(c.uid)).uid); assert.equal(bad.type, 'mismatch'); assert.equal(bad.cards.length, 2);
}

console.log(`ChemQuest data OK (${orders} orders, ${d.ions.length} ions)`);
