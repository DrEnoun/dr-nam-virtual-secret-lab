// Hybridization Lab — logic with no DOM (testable in Node, reusable by multiplayer later).
// Groups, hybridization and shape are worked out from the molecule data, never typed in.

export const HYBRID_BY_GROUPS = { 2: 'sp', 3: 'sp2', 4: 'sp3' };
const SUP = { sp: 'sp', sp2: 'sp²', sp3: 'sp³' };
export const hybridText = h => SUP[h] ?? h;

/** Shape and bond angle from (electron groups, lone pairs). Keys are `${groups}-${lonePairs}`. */
export const SHAPES = {
  '4-0': { name: { en: 'tetrahedral', ms: 'tetrahedron' }, angle: '109.5°' },
  '4-1': { name: { en: 'trigonal pyramidal', ms: 'piramid trigon' }, angle: '≈107°' },
  '4-2': { name: { en: 'bent', ms: 'bengkok' }, angle: '≈104.5°' },
  '3-0': { name: { en: 'trigonal planar', ms: 'satah trigon' }, angle: '120°' },
  '2-0': { name: { en: 'linear', ms: 'linear' }, angle: '180°' },
};
/** The summary table shown at every item (electron groups → hybridization → shape and angle). */
export const SUMMARY = [
  { groups: 4, hybrid: 'sp3', shape: { en: 'tetrahedral (109.5°)', ms: 'tetrahedron (109.5°)' } },
  { groups: 3, hybrid: 'sp2', shape: { en: 'trigonal planar (120°)', ms: 'satah trigon (120°)' } },
  { groups: 2, hybrid: 'sp', shape: { en: 'linear (180°)', ms: 'linear (180°)' } },
];

export const atomOf = (mol, id) => mol.atoms.find(a => a.id === id);
export const neighbours = (mol, id) => mol.bonds.filter(b => b.a === id || b.b === id).map(b => ({ bond: b, other: atomOf(mol, b.a === id ? b.b : b.a) }));

/** Electron groups on an atom: every bonded atom once (double/triple bonds count once), every hidden H, every lone pair. */
export function groupsOf(mol, id) {
  const a = atomOf(mol, id);
  return neighbours(mol, id).length + (a.h || 0) + (a.lp || 0);
}
export const hybridOf = (mol, id) => HYBRID_BY_GROUPS[groupsOf(mol, id)];
/** p orbitals left out of the mix (they form the π bonds): 3 minus the p orbitals that were mixed. */
export const leftoverP = (mol, id) => 4 - groupsOf(mol, id);
export const shapeOf = (mol, id) => SHAPES[`${groupsOf(mol, id)}-${atomOf(mol, id).lp || 0}`];
export const piBondsAround = (mol, id) => neighbours(mol, id).reduce((n, x) => n + x.bond.order - 1, 0);

/**
 * Targets around the central atom for the counting step. One target per bond LINE (a double bond has two),
 * one per lone pair on the central atom, and decoys: lone pairs on the other atoms.
 * Returns [{ id, kind:'line'|'lp'|'decoy', bond?, index?, atom }].
 */
export function countTargets(mol, id) {
  const out = [];
  neighbours(mol, id).forEach(({ bond }) => { for (let i = 0; i < bond.order; i++) out.push({ id: `${bond.a}-${bond.b}#${i}`, kind: 'line', bond, index: i, atom: id }); });
  const c = atomOf(mol, id);
  const hn = c.h || 0;
  for (let i = 0; i < hn; i++) out.push({ id: `${id}:h${i}`, kind: 'h', atom: id });
  for (let i = 0; i < (c.lp || 0); i++) out.push({ id: `${id}:lp${i}`, kind: 'lp', atom: id, index: i });
  for (const a of mol.atoms) if (a.id !== id) for (let i = 0; i < (a.lp || 0); i++) out.push({ id: `${a.id}:lp${i}`, kind: 'decoy', atom: a.id, index: i });
  return out;
}

/**
 * Check the counting step. `picked` = Set of target ids. Returns { ok } or { ok:false, code, ...hint values }.
 * Codes: 'decoy' (a lone pair of another atom), 'double' (a multiple bond counted more than once),
 * 'missed-lp', 'missed-bond', 'missed-h'.
 */
export function evaluateCount(mol, id, picked) {
  const targets = countTargets(mol, id), by = new Map(targets.map(t => [t.id, t]));
  const chosen = [...picked].map(k => by.get(k)).filter(Boolean);
  const decoy = chosen.find(t => t.kind === 'decoy');
  if (decoy) return { ok: false, code: 'decoy', sym: atomOf(mol, decoy.atom).el };
  for (const { bond } of neighbours(mol, id)) {
    const n = chosen.filter(t => t.kind === 'line' && t.bond === bond).length;
    if (n > 1) return { ok: false, code: 'double', order: bond.order, count: n, a: atomOf(mol, bond.a).el, b: atomOf(mol, bond.b).el };
  }
  const c = atomOf(mol, id);
  const lpGot = chosen.filter(t => t.kind === 'lp').length;
  if (lpGot < (c.lp || 0)) return { ok: false, code: 'missed-lp', sym: c.el, n: (c.lp || 0) - lpGot };
  const hGot = chosen.filter(t => t.kind === 'h').length;
  if (hGot < (c.h || 0)) return { ok: false, code: 'missed-h', sym: c.el };
  for (const { bond, other } of neighbours(mol, id)) {
    if (!chosen.some(t => t.kind === 'line' && t.bond === bond)) return { ok: false, code: 'missed-bond', sym: c.el, other: other.el };
  }
  return { ok: true, groups: groupsOf(mol, id) };
}

/** Check the orbital mixer: exactly one s and (groups − 1) p orbitals; d orbitals do not take part in this model. */
export function evaluateMix(groups, s, p, d = 0) {
  if (d > 0) return { ok: false, code: 'd' };
  if (s !== 1) return { ok: false, code: s === 0 ? 'no-s' : 'many-s' };
  const need = groups - 1;
  if (p < need) return { ok: false, code: 'few-p', need, got: p, groups };
  if (p > need) return { ok: false, code: 'many-p', need, got: p, groups };
  return { ok: true, hybrid: HYBRID_BY_GROUPS[groups] };
}

/** Labels for the σ/π step: each bond of order n must be 1 σ + (n−1) π. `labels` maps line id → 'sigma'|'pi'|undefined. */
export function evaluatePi(mol, id, labels) {
  for (const { bond, other } of neighbours(mol, id)) {
    const lines = Array.from({ length: bond.order }, (_, i) => labels.get(`${bond.a}-${bond.b}#${i}`));
    if (lines.includes(undefined)) return { ok: false, code: 'unlabelled' };
    const sigma = lines.filter(l => l === 'sigma').length;
    if (sigma !== 1) return { ok: false, code: 'sigma-count', a: atomOf(mol, id).el, b: other.el, order: bond.order };
  }
  return { ok: true };
}

/** Explain a wrong label in the Hard level: what the atom really has, and which kind of group was missed or over-counted. */
export function explainLabel(mol, id, label) {
  const a = atomOf(mol, id), real = groupsOf(mol, id), said = Object.entries(HYBRID_BY_GROUPS).find(([, h]) => h === label)?.[0] * 1;
  const nb = neighbours(mol, id);
  const parts = [];
  if (nb.length) parts.push(`${nb.length} bonded atom${nb.length > 1 ? 's' : ''}`);
  if (a.h) parts.push(`${a.h} H`);
  if (a.lp) parts.push(`${a.lp} lone pair${a.lp > 1 ? 's' : ''}`);
  let miss = null;
  if (said < real) miss = a.lp ? 'lp' : a.h ? 'h' : 'bond';
  else if (said > real) miss = nb.some(x => x.bond.order > 1) ? 'multiple' : 'extra';
  return { sym: a.el, real, hybrid: HYBRID_BY_GROUPS[real], parts: parts.join(' + '), miss };
}

/** Marked atoms for the Hard level, in number order. */
export const markedAtoms = mol => mol.atoms.filter(a => a.mark).sort((p, q) => p.mark - q.mark);
