// Atom Blaster data checks: enough good/bad targets, BM prompts, no label that is both right and wrong.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const d = JSON.parse(readFileSync('data/blaster/levels.json', 'utf8'));
for (const lv of ['easy', 'medium', 'hard']) {
  const c = d[lv];
  assert.ok(c.rounds.length >= 5, `${lv}: rounds`);
  c.rounds.forEach((r, i) => {
    const id = `${lv} round ${i + 1}`;
    assert.ok(r.prompt.en && r.prompt.ms, `${id}: EN and BM prompt`);
    assert.ok(r.good.length >= c.quota, `${id}: needs at least ${c.quota} right answers`);
    assert.ok(r.bad.length >= 4, `${id}: needs decoys`);
    assert.equal(new Set([...r.good, ...r.bad]).size, r.good.length + r.bad.length, `${id}: a target is listed twice (or both right and wrong)`);
  });
}
console.log('Atom Blaster data OK');
