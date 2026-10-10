// Checks the two-player rules. Run: node tools/test-duo.mjs
import assert from 'node:assert/strict';
import { createRace, raceItem, raceNext, raceResult, coopRoles, coopAllows, zoneOf } from '../js/duo-logic.js';

// RACE: the first correct answer scores, the slower player does not
{
  const r = createRace(3);
  assert.deepEqual(raceItem(r, 2, { index: 0, correct: true, pts: 10, shown: false }), { action: 'advance', delay: 2600, won: true, player: 2 });
  assert.deepEqual(r.scores, [0, 10]);
  assert.equal(raceItem(r, 1, { index: 0, correct: true, pts: 10, shown: false }).action, 'wait', 'second correct answer scores nothing');
  assert.deepEqual(r.scores, [0, 10]);
  assert.equal(raceNext(r).done, false);
  assert.equal(r.idx, 1); assert.equal(r.winner, null);
  // an answer for an old question is ignored
  assert.equal(raceItem(r, 1, { index: 0, correct: true, pts: 10, shown: false }).action, 'none');
  // fewer points after mistakes
  assert.equal(raceItem(r, 1, { index: 1, correct: true, pts: 4, shown: false }).won, true);
  assert.deepEqual(r.scores, [4, 10]);
  raceNext(r);
  // nobody solves it: both revealed the answer → move on without a winner
  assert.equal(raceItem(r, 1, { index: 2, correct: false, pts: 0, shown: true }).action, 'wait');
  assert.deepEqual(raceItem(r, 2, { index: 2, correct: false, pts: 0, shown: true }), { action: 'advance', delay: 2200, won: false });
  assert.deepEqual(r.scores, [4, 10]);
  assert.equal(raceNext(r).done, true);
  assert.deepEqual(raceResult(r), { winner: 2, scores: [4, 10] });
}
// A player cannot finish the same question twice
{
  const r = createRace(1);
  raceItem(r, 1, { index: 0, correct: false, pts: 0, shown: true });
  assert.equal(raceItem(r, 1, { index: 0, correct: true, pts: 10, shown: false }).action, 'none');
}
// Draw
{
  const r = createRace(2);
  raceItem(r, 1, { index: 0, correct: true, pts: 7, shown: false }); raceNext(r);
  raceItem(r, 2, { index: 1, correct: true, pts: 7, shown: false });
  assert.equal(raceResult(r).winner, 0);
}
// CO-OP: roles swap every question; the Builder builds, the Checker checks
assert.deepEqual(coopRoles(0), { 1: 'builder', 2: 'checker' });
assert.deepEqual(coopRoles(1), { 1: 'checker', 2: 'builder' });
assert.deepEqual(coopRoles(2), coopRoles(0));
assert.equal(coopAllows('builder', 'grab', 'stage'), true);
assert.equal(coopAllows('checker', 'grab', 'stage'), false);
assert.equal(coopAllows('builder', 'select', 'stage'), true);
assert.equal(coopAllows('checker', 'select', 'stage'), false);
assert.equal(coopAllows('checker', 'select', 'side'), true);
assert.equal(coopAllows('builder', 'select', 'side'), false);
assert.equal(coopAllows('builder', 'select', 'other'), true, 'toolbar buttons are for everyone');
assert.equal(coopAllows('checker', 'select', 'other'), true);
assert.equal(zoneOf(null), 'other');
console.log('Two-player rules OK');
// every duo.* key exists in both languages
import { readFileSync } from 'node:fs';
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => typeof v === 'object' ? flat(v, p + k + '.') : [p + k]);
const en = new Set(flat(JSON.parse(readFileSync('lang/en.json', 'utf8'))).filter(k => k.startsWith('duo.')));
const ms = new Set(flat(JSON.parse(readFileSync('lang/ms.json', 'utf8'))).filter(k => k.startsWith('duo.')));
assert.ok(en.size > 5, 'duo keys present');
assert.deepEqual([...en].sort(), [...ms].sort(), 'duo.* keys match in EN and BM');
console.log('Two-player wording OK');
