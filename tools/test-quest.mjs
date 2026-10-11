// ChemQuest checks: every Diner Dash order has the right name and formula, the serve checker
// gives the right verdicts, and every avatar sprite row is the same width.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formulaOf, checkServe, buildOrders, buildTray, orderName, starsFor, tipFor } from '../quest/js/diner-logic.js';
import { avatarRows, avatarPixels, OPTIONS, WIDTH, HEIGHT } from '../quest/js/avatar.js';

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
  assert.ok(lv.orders.length >= lv.customers, `level ${lv.id}: needs at least ${lv.customers} orders`);
  assert.ok(lv.decoys + 2 <= d.ions.length);
  const seen = new Set();
  for (const o of lv.orders) {
    const cat = byId[o.cation], an = byId[o.anion];
    assert.ok(cat && an, `level ${lv.id}: unknown ion in ${JSON.stringify(o)}`);
    assert.ok(cat.charge > 0 && an.charge < 0, `${cat.id}/${an.id}: cation must be + and anion −`);
    const name = orderName(cat, an), f = formulaOf(cat, an);
    assert.ok(!seen.has(name), `level ${lv.id}: ${name} listed twice`); seen.add(name);
    assert.equal(f.text, KEY[name], `${name}: expected ${KEY[name]}, got ${f.text}`);
    assert.equal(f.nc * cat.charge + f.na * an.charge, 0, `${name}: charges do not cancel`);
    // level shape: 1 = all 1:1 monatomic, 2 = unequal monatomic, 3 = at least one polyatomic ion
    if (lv.id === 1) assert.ok(f.nc === 1 && f.na === 1 && !cat.poly && !an.poly, `${name}: level 1 must be simple 1:1`);
    if (lv.id === 2) assert.ok((f.nc !== 1 || f.na !== 1) && !cat.poly && !an.poly, `${name}: level 2 must be unequal monatomic`);
    if (lv.id === 3) assert.ok(cat.poly || an.poly, `${name}: level 3 must include a polyatomic ion`);
    orders++;
  }
  // Every order can be served correctly, and tricks are caught
  for (const o of buildOrders(lv, d.ions)) {
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

// Avatar sprites
for (const style of OPTIONS.hairStyle) for (const goggles of [true, false]) {
  const rows = avatarRows({ hairStyle: style, goggles });
  assert.equal(rows.length, HEIGHT, `${style}: ${rows.length} rows`);
  rows.forEach((r, i) => assert.equal(r.length, WIDTH, `${style} goggles=${goggles} row ${i}`));
  const px = avatarPixels({ hairStyle: style, goggles });
  assert.ok(px.flat().every(c => c === null || /^#[0-9a-f]{6}$/.test(c)), `${style}: unknown sprite key`);
}
console.log(`ChemQuest data OK (${orders} orders, ${d.ions.length} ions)`);
