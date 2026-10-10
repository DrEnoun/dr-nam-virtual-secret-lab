// Checks every Molecule Shooter question pack in data/shooter/: run  node tools/test-shooter.mjs
import { readdirSync, readFileSync } from 'node:fs';
const dir = new URL('../data/shooter/', import.meta.url);
let bad = 0;
const fail = (f, id, msg) => { bad++; console.error(`✗ ${f} ${id}: ${msg}`); };
const both = v => typeof v === 'object' && v.en && v.ms;
for (const f of readdirSync(dir).filter(n => n.endsWith('.json'))) {
  const pack = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  const ids = new Set();
  for (const lv of ['easy', 'medium', 'hard']) {
    const cfg = pack.levels?.[lv];
    if (!cfg) { fail(f, lv, 'missing level settings'); continue; }
    const n = pack.items.filter(i => i.level === lv).length;
    if (n < cfg.rounds) fail(f, lv, `only ${n} items for ${cfg.rounds} rounds`);
  }
  for (const it of pack.items) {
    if (ids.has(it.id)) fail(f, it.id, 'duplicate id'); ids.add(it.id);
    const cfg = pack.levels[it.level];
    if (!cfg) { fail(f, it.id, `unknown level ${it.level}`); continue; }
    if (it.options.length !== cfg.targets) fail(f, it.id, `${it.options.length} options, level needs ${cfg.targets}`);
    if (it.options.filter(o => o.ok).length !== 1) fail(f, it.id, 'needs exactly one correct option');
    for (const k of ['prompt', 'why', 'hint']) if (!both(it[k])) fail(f, it.id, `${k} needs en and ms`);
    for (const o of it.options) {
      if (typeof o.t === 'object' && !both(o.t)) fail(f, it.id, 'option text needs en and ms');
      if (!o.ok && !o.err) fail(f, it.id, `wrong option ${JSON.stringify(o.t)} has no err code`);
    }
    const labels = it.options.map(o => JSON.stringify(o.t));
    if (new Set(labels).size !== labels.length) fail(f, it.id, 'duplicate option');
  }
  console.log(`${f}: ${pack.items.length} items checked`);
}
if (bad) { console.error(`${bad} problem(s)`); process.exit(1); }
console.log('Molecule Shooter packs OK');
