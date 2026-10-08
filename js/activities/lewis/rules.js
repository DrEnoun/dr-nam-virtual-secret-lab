// Lewis Structure Builder — game logic with no DOM, so it can be tested in Node and reused
// by the 2-player and online modes later. Turns molecule JSON into electron slots and checks answers.
//
// Coordinates are in "units" (1 unit = nucleus radius), y pointing up. The board scales them to pixels.
export const R = 1;            // nucleus radius
export const SITE_DIST = 1.7;  // atom centre → centre of a lone-pair site
export const PAIR_HALF = 0.3;  // half the gap between the two electrons of a pair
export const AXIAL = 0.8;      // space one bonding pair takes along a bond
const CLEARANCE = 25;          // a lone-pair site this close to a bond (degrees) is replaced by the bond
const PAD = 2.7;               // empty margin around atoms
const CARDINAL = [0, 90, 180, 270];

const rad = d => (d * Math.PI) / 180;
const dir = a => ({ x: Math.cos(rad(a)), y: Math.sin(rad(a)) });
const norm = a => Math.round(((a % 360) + 360) % 360);
const angDiff = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
/** 2 → "²⁺", -1 → "⁻" */
export const chargeText = c => `${Math.abs(c) > 1 ? String(Math.abs(c)).replace(/\d/g, d => SUP[d]) : ''}${c > 0 ? '⁺' : '⁻'}`;
/** "H2O" → "H₂O" */
export const subscript = f => f.replace(/\d/g, d => SUB[d]);
/** Points for one item: full marks first try, fewer after mistakes, none if the answer was shown. */
export const pointsFor = wrong => [10, 7, 4][wrong] ?? 2;

function atomOf(id, el, E, x = 0, y = 0) {
  const e = E[el];
  if (!e) throw new Error(`Unknown element ${el}`);
  return { id, el, x, y, valence: e.valence, target: e.shell, metal: !!e.metal };
}

function sitesFor(elDef, bondAngles) {
  if (elDef.sites === 'opposite') return bondAngles.length === 1 ? [norm(bondAngles[0] + 180)] : [90];
  return CARDINAL.filter(a => bondAngles.every(b => angDiff(a, b) > CLEARANCE));
}

function siteSlots(atom, angle, extra = {}) {
  const d = dir(angle);
  const p = { x: -d.y, y: d.x };
  return [-1, 1].map((s, i) => ({
    id: `${atom.id}:${angle}:${i}`, type: 'lone', owners: [atom.id], group: `${atom.id}:${angle}`, angle,
    x: atom.x + d.x * SITE_DIST + p.x * PAIR_HALF * s,
    y: atom.y + d.y * SITE_DIST + p.y * PAIR_HALF * s,
    ...extra,
  }));
}

function boundsOf(atoms) {
  const xs = atoms.map(a => a.x), ys = atoms.map(a => a.y);
  return { minX: Math.min(...xs) - PAD, maxX: Math.max(...xs) + PAD, minY: Math.min(...ys) - PAD, maxY: Math.max(...ys) + PAD };
}

/** One atom on its own: a ring of slots (8, or 2 for H). Place as many electrons as it has valence electrons. */
export function buildAtom(el, E) {
  const atom = atomOf('a', el, E);
  const sites = sitesFor(E[el], []);
  const slots = sites.flatMap(a => siteSlots(atom, a));
  // Convention: one electron on each side first, then pair up.
  const order = [...slots.filter(s => s.id.endsWith(':0')), ...slots.filter(s => s.id.endsWith(':1'))];
  return {
    kind: 'atom', atoms: [atom], bonds: [], slots, tokens: atom.target,
    answer: order.slice(0, atom.valence).map(s => s.id), bounds: boundsOf([atom]),
  };
}

/** Covalent molecule: bonding pairs sit between atoms (shared by both), lone pairs around single atoms. */
export function buildCovalent(def, E) {
  const atoms = new Map(def.atoms.map(a => [a.id, { ...atomOf(a.id, a.el, E), x: null, y: null, bondAngles: [] }]));
  for (const b of def.bonds) {
    atoms.get(b.a).bondAngles.push(norm(b.angle));
    atoms.get(b.b).bondAngles.push(norm(b.angle + 180));
  }
  const first = atoms.get(def.atoms[0].id);
  first.x = first.y = 0;
  const queue = [first];
  while (queue.length) {
    const cur = queue.shift();
    for (const b of def.bonds) {
      const away = b.a === cur.id ? [b.b, b.angle] : b.b === cur.id ? [b.a, b.angle + 180] : null;
      if (!away) continue;
      const next = atoms.get(away[0]);
      if (next.x !== null) continue;
      const len = 2 * R + AXIAL * b.order + 0.3;
      const d = dir(away[1]);
      next.x = cur.x + d.x * len;
      next.y = cur.y + d.y * len;
      queue.push(next);
    }
  }
  for (const a of atoms.values()) if (a.x === null) throw new Error(`Atom ${a.id} is not connected`);

  const slots = [], answer = [];
  def.bonds.forEach((b, bi) => {
    const A = atoms.get(b.a), B = atoms.get(b.b);
    const d = dir(b.angle), p = { x: -d.y, y: d.x };
    for (let k = 0; k < b.order; k++) {
      const off = (k - (b.order - 1) / 2) * AXIAL;
      [-1, 1].forEach((s, i) => {
        const slot = {
          id: `b${bi}:${k}:${i}`, type: 'bond', owners: [b.a, b.b], group: `b${bi}:${k}`,
          x: (A.x + B.x) / 2 + d.x * off + p.x * PAIR_HALF * s,
          y: (A.y + B.y) / 2 + d.y * off + p.y * PAIR_HALF * s,
        };
        slots.push(slot);
        answer.push(slot.id);
      });
    }
  });
  for (const ad of def.atoms) {
    const a = atoms.get(ad.id);
    const sites = sitesFor(E[a.el], a.bondAngles);
    for (const l of ad.lone || []) if (!sites.includes(norm(l))) throw new Error(`${ad.id}: no lone-pair site at ${l}°`);
    for (const ang of sites) {
      const ss = siteSlots(a, ang);
      slots.push(...ss);
      if ((ad.lone || []).map(norm).includes(ang)) answer.push(...ss.map(s => s.id));
    }
  }
  const list = [...atoms.values()];
  return {
    kind: 'covalent', atoms: list, bonds: def.bonds, slots, answer,
    tokens: list.reduce((n, a) => n + a.valence, 0), bounds: boundsOf(list),
  };
}

/** Ionic compound: electrons move from the metal's shell into the empty slots of the non-metal(s). */
export function buildIonic(def, E) {
  const atoms = def.atoms.map(a => atomOf(a.id, a.el, E, a.x, a.y));
  const metals = atoms.filter(a => a.metal), nons = atoms.filter(a => !a.metal);
  const slots = [], needs = [];
  for (const nm of nons) {
    const near = metals.reduce((best, m) => (!best || Math.hypot(m.x - nm.x, m.y - nm.y) < Math.hypot(best.x - nm.x, best.y - nm.y) ? m : best), null);
    const facing = Math.atan2(near.y - nm.y, near.x - nm.x) * 180 / Math.PI;
    const byAngle = Object.fromEntries(CARDINAL.map(a => [a, siteSlots(nm, a)]));
    // Fill every site once, then pair up starting from the sides facing away from the metal,
    // so the gap ends up on the side where the electron arrives.
    const far = [...CARDINAL].sort((a, b) => angDiff(b, facing) - angDiff(a, facing));
    const seq = [...CARDINAL.map(a => byAngle[a][0]), ...far.map(a => byAngle[a][1])];
    seq.forEach((s, i) => {
      if (i < nm.valence) s.prefilled = true; else needs.push({ nm, slot: s });
      slots.push(s);
    });
  }
  const tokens = [];
  metals.forEach(m => { for (let i = 0; i < m.valence; i++) tokens.push({ metal: m }); });
  if (tokens.length !== needs.length) throw new Error('Electrons given and electrons needed do not match');
  const free = [...needs];
  const used = new Set();
  tokens.forEach((tok, i) => {
    free.sort((p, q) => Math.hypot(p.slot.x - tok.metal.x, p.slot.y - tok.metal.y) - Math.hypot(q.slot.x - tok.metal.x, q.slot.y - tok.metal.y));
    const need = free.shift();
    const m = tok.metal;
    const ang = CARDINAL.reduce((best, a) => (angDiff(a, Math.atan2(need.nm.y - m.y, need.nm.x - m.x) * 180 / Math.PI) < angDiff(best, Math.atan2(need.nm.y - m.y, need.nm.x - m.x) * 180 / Math.PI) ? a : best), 0);
    let home = siteSlots(m, ang).find(s => !used.has(s.id)) || CARDINAL.flatMap(a => siteSlots(m, a)).find(s => !used.has(s.id));
    used.add(home.id);
    home = { ...home, home: true };
    slots.push(home);
    tokens[i] = { id: `t${i}`, metal: m.id, home: home.id, answer: need.slot.id };
  });
  const ions = atoms.map(a => ({ atomId: a.id, el: a.el, charge: a.metal ? a.valence : -(a.target - a.valence) }));
  return { kind: 'ionic', atoms, bonds: [], slots, tokens, answer: tokens.map(t => t.answer), ions, bounds: boundsOf(atoms) };
}

/**
 * Check a build. `filled` is the Set of slot ids that hold an electron (covalent/atom) or that received a
 * transferred electron (ionic). `source` (optional) maps each filled slot id to the atom its electron came from;
 * when given, every shared pair must hold one electron from each of the two atoms. Returns { ok } or { ok:false, code, ...values for the hint }.
 */
export function evaluate(model, filled, source = null) {
  if (model.kind === 'atom') {
    const a = model.atoms[0], n = filled.size;
    if (n === a.valence) return { ok: true };
    return { ok: false, code: n > a.valence ? 'atom-many' : 'atom-few', sym: a.el, n: a.valence, got: n };
  }
  if (model.kind === 'ionic') {
    const left = model.tokens.length - filled.size;
    return left === 0 ? { ok: true } : { ok: false, code: 'ion-left', n: left };
  }
  const count = new Map(model.atoms.map(a => [a.id, 0]));
  const groups = new Map();
  for (const s of model.slots) {
    if (!filled.has(s.id)) continue;
    s.owners.forEach(o => count.set(o, count.get(o) + 1));
    groups.set(s.group, (groups.get(s.group) || 0) + 1);
  }
  for (const a of model.atoms) if (count.get(a.id) > a.target) return { ok: false, code: 'many', sym: a.el, got: count.get(a.id), target: a.target };
  if ([...groups.values()].some(n => n === 1)) return { ok: false, code: 'unpaired' };
  for (const a of model.atoms) if (count.get(a.id) < a.target) return { ok: false, code: 'few', sym: a.el, got: count.get(a.id), target: a.target };
  if (source) {
    const pairs = new Map();
    for (const s of model.slots) if (s.type === 'bond' && filled.has(s.id)) pairs.set(s.group, [...(pairs.get(s.group) || []), source.get(s.id)]);
    for (const [group, from] of pairs) {
      if (from[0] === from[1]) {
        const bond = model.slots.find(s => s.group === group);
        const [a, b] = bond.owners.map(id => model.atoms.find(x => x.id === id).el);
        return { ok: false, code: 'source', a, b };
      }
    }
  }
  if (filled.size !== model.tokens) return { ok: false, code: 'few', sym: model.atoms[0].el, got: filled.size, target: model.tokens };
  return { ok: true };
}

/** Charge choices offered in the ion-charge step. */
export const CHARGE_CHOICES = [1, 2, 3, -1, -2, -3];

/** Distinct ions (one per element) in the order they should be asked. */
export function uniqueIons(model) {
  const seen = new Set();
  return model.ions.filter(i => (seen.has(i.el) ? false : seen.add(i.el))).sort((a, b) => b.charge - a.charge);
}

/**
 * Which atom each answer electron comes from: a shared pair has one electron from each atom,
 * a lone pair belongs to its atom. Returns [{ slot, owner }] in answer order (covalent and atom models).
 */
export function answerOwners(model) {
  if (model.kind === 'ionic') return model.tokens.map(t => ({ slot: t.answer, owner: t.metal }));
  const bySlot = new Map(model.slots.map(s => [s.id, s]));
  return model.answer.map(id => {
    const s = bySlot.get(id);
    return { slot: id, owner: s.type === 'bond' ? s.owners[Number(id.slice(-1))] : s.owners[0] };
  });
}
