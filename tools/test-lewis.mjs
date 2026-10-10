// Checks the Lewis data files and logic. Run: node tools/test-lewis.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildAtom, buildCovalent, buildIonic, evaluate, uniqueIons, answerOwners, atomCounts, formulaChoices } from '../js/activities/lewis/rules.js';

const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const E = read('data/lewis/elements.json');
const M = read('data/lewis/molecules.json');
const L = read('data/lewis/levels.json');
const en = read('lang/en.json'), ms = read('lang/ms.json');

const build = ref => {
  if (ref.startsWith('atom:')) return buildAtom(ref.slice(5), E);
  const m = M[ref.slice(4)];
  assert.ok(m, `unknown molecule ${ref}`);
  return m.kind === 'ionic' ? buildIonic(m, E) : buildCovalent(m, E);
};

// Every item in every level builds, and its answer is accepted.
const refs = new Set();
for (const [lvl, cfg] of Object.entries(L)) {
  if (lvl.startsWith('_')) continue;
  [...cfg.items, ...(cfg.challenge?.items || [])].forEach(r => refs.add(r));
}
for (const ref of refs) {
  const model = build(ref);
  const ans = new Set(model.answer);
  assert.equal(ans.size, model.answer.length, `${ref}: duplicate answer slots`);
  assert.deepEqual(evaluate(model, ans), { ok: true }, `${ref}: correct answer rejected`);
  assert.equal(model.answer.length, model.kind === 'atom' ? model.atoms[0].valence : (model.kind === 'ionic' ? model.tokens.length : model.tokens), `${ref}: electron count`);
  if (model.kind !== 'ionic') {
    // Removing any one electron must fail, and adding to an empty slot must fail.
    for (const id of model.answer) {
      const less = new Set(ans); less.delete(id);
      assert.equal(evaluate(model, less).ok, false, `${ref}: missing ${id} accepted`);
    }
    for (const s of model.slots.filter(s => !ans.has(s.id))) {
      const more = new Set(ans); more.add(s.id);
      assert.equal(evaluate(model, more).ok, false, `${ref}: extra ${s.id} accepted`);
    }
  }
  // Each atom supplies exactly its valence electrons to the answer (so the colours add up).
  if (model.kind !== 'atom') {
    const give = {};
    answerOwners(model).forEach(o => { give[o.owner] = (give[o.owner] || 0) + 1; });
    for (const a of model.atoms.filter(a => model.kind === 'covalent' || a.metal)) assert.equal(give[a.id], a.valence, `${ref}: ${a.id} supplies ${give[a.id]} electrons, valence ${a.valence}`);
  }
  console.log('ok', ref);
}

// Names and explanations exist in both languages.
for (const [id, m] of Object.entries(M)) {
  if (id.startsWith('_')) continue;
  for (const k of ['name', 'why']) assert.ok(m[k]?.en && m[k]?.ms, `${id}.${k} needs en + ms`);
  if (m.pharmacy) assert.ok(m.pharmacy.en && m.pharmacy.ms, `${id}.pharmacy needs en + ms`);
}
for (const [id, e] of Object.entries(E)) if (!id.startsWith('_')) assert.ok(e.name.en && e.name.ms, `${id} name`);

// Same lewis.* keys in both language files.
const keys = o => Object.keys(o).filter(k => k.startsWith('lewis.')).sort();
assert.deepEqual(keys(en), keys(ms), 'lewis.* keys differ between en.json and ms.json');

// Specific chemistry checks
assert.deepEqual(uniqueIons(build('mol:MgCl2')).map(i => [i.el, i.charge]), [['Mg', 2], ['Cl', -1]]);
const co2 = build('mol:CO2');
assert.equal(evaluate(co2, new Set(co2.answer.filter(id => id.startsWith('b')))).code, 'few');
const h2 = build('mol:H2');
assert.equal(evaluate(h2, new Set([h2.answer[0]])).code, 'unpaired');
assert.equal(evaluate(buildAtom('Na', E), new Set(['a:0:0', 'a:90:0'])).code, 'atom-many');
// Sharing: a bond pair filled by two electrons from the same atom is rejected; one from each is accepted.
{
  const hcl = build('mol:HCl');
  const own = new Map(answerOwners(hcl).map(o => [o.slot, o.owner]));
  assert.deepEqual(evaluate(hcl, new Set(hcl.answer), own), { ok: true });
  const bonds = hcl.answer.filter(id => id.startsWith('b'));
  const bad = new Map(own); bonds.forEach(id => bad.set(id, 'b')); // both electrons from Cl
  assert.equal(evaluate(hcl, new Set(hcl.answer), bad).code, 'source');
}
// Hard mode: decoy slots let students overfill an atom; spare electrons are rejected; formula choices are sound.
{
  for (const [id, m] of Object.entries(M).filter(([id, m]) => !id.startsWith('_') && m.kind === 'ionic')) {
    const model = buildIonic(m, E, { decoys: true });
    const ans = new Set(model.answer);
    assert.deepEqual(evaluate(model, ans), { ok: true }, `${id}: decoy model rejects the right answer`);
    const over = model.slots.find(s => s.type === 'over');
    assert.equal(evaluate(model, new Set([...ans, over.id])).code, 'ion-many', `${id}: overfilling accepted`);
    const src = new Map(model.answer.map(sl => [sl, 'x']));
    src.set(model.answer[0], 'spare');
    assert.equal(evaluate(model, ans, src).code, 'spare', `${id}: spare electron accepted`);
    const ch = formulaChoices(m, E);
    assert.equal(ch.length, 4, `${id}: four formula choices`);
    assert.equal(new Set(ch.map(c => c.formula)).size, 4, `${id}: duplicate formula choices`);
    assert.equal(ch.filter(c => c.correct).length, 1);
    assert.equal(ch.find(c => c.correct).formula, m.formula, `${id}: right choice is the data formula`);
  }
  assert.deepEqual(atomCounts(M.AlCl3), { Cl: 3, Al: 1 });
  const hard = L.hard;
  assert.ok(hard.hidden && hard.thinking && hard.seconds > 0, 'hard level settings');
}
console.log('All Lewis checks passed');
