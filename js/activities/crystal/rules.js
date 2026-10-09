// Crystal Lattice Builder — logic with no DOM (testable in Node; reusable by multiplayer later).
// Particle positions live on a 3×3×3 grid of a cube (0, ½, 1 along each axis). Counts such as
// "particles per unit cell" and "coordination number" are COMPUTED from the positions, never typed in.

const SHARE = { corner: 1 / 8, edge: 1 / 4, face: 1 / 2, body: 1 };
const NAMES = ['corner', 'edge', 'face', 'body']; // index = how many coordinates sit at ½

/** Every grid site of the cube: id "i,j,k" (each 0..2), position in cell units (0..1), and its kind. */
export function allSites() {
  const out = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) {
    const mids = [i, j, k].filter(v => v === 1).length;
    out.push({ id: `${i},${j},${k}`, ijk: [i, j, k], pos: [i / 2, j / 2, k / 2], kind: NAMES[mids] });
  }
  return out;
}

/** Sites a student can choose from at each stage: 'corners' (Easy), 'cubic' (corners, faces, centre — Medium), 'all' (NaCl). */
export function sitesFor(mode) {
  const kinds = { corners: ['corner'], cubic: ['corner', 'face', 'body'], all: NAMES }[mode];
  return allSites().filter(s => kinds.includes(s.kind));
}

/** The right answer for each lattice: which kinds of site hold a particle. NaCl also needs the ion type. */
export const LATTICES = {
  sc: { kinds: ['corner'], mode: 'corners' },
  bcc: { kinds: ['corner', 'body'], mode: 'cubic' },
  fcc: { kinds: ['corner', 'face'], mode: 'cubic' },
  nacl: { kinds: ['corner', 'edge', 'face', 'body'], mode: 'all' },
};
/** NaCl: Cl⁻ where the grid indices add to an even number (corners, faces), Na⁺ where odd (edge centres, body centre). */
export const ionAt = ijk => (ijk.reduce((a, b) => a + b, 0) % 2 === 0 ? 'cl' : 'na');

/** The correct occupancy for a lattice: Map(siteId → particle type). */
export function expectedOccupancy(type) {
  const L = LATTICES[type], m = new Map();
  for (const s of allSites()) if (L.kinds.includes(s.kind)) m.set(s.id, type === 'nacl' ? ionAt(s.ijk) : 'p');
  return m;
}

/**
 * Check a student's cell. `placed` = Map(siteId → type). Returns { ok } or { ok:false, code, kind, n, ion }.
 * Codes: 'extra' (particles on sites that should be empty), 'missing' (a kind of site left empty), 'wrong-ion' (NaCl).
 */
export function evaluateBuild(type, placed) {
  const want = expectedOccupancy(type), sites = new Map(allSites().map(s => [s.id, s]));
  const extra = [...placed.keys()].filter(id => !want.has(id));
  if (extra.length) return { ok: false, code: 'extra', kind: sites.get(extra[0]).kind, n: extra.length };
  const wrong = [...placed].filter(([id, t]) => want.get(id) !== t);
  if (wrong.length) return { ok: false, code: 'wrong-ion', ion: want.get(wrong[0][0]), n: wrong.length };
  const missing = [...want.keys()].filter(id => !placed.has(id));
  if (missing.length) return { ok: false, code: 'missing', kind: sites.get(missing[0]).kind, n: missing.length };
  return { ok: true };
}

/** Particles that belong to ONE unit cell: corners are shared by 8 cells, edges by 4, faces by 2, the centre by none. */
export function particlesPerCell(occ) {
  const sites = new Map(allSites().map(s => [s.id, s]));
  const total = {};
  for (const [id, t] of occ) total[t] = (total[t] || 0) + SHARE[sites.get(id).kind];
  return total;
}

/** Positions of an n×n×n block of unit cells, with shared particles counted once. Returns [{ pos:[x,y,z], type }]. */
export function tile(occ, n) {
  const sites = new Map(allSites().map(s => [s.id, s])), seen = new Map();
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) for (let c = 0; c < n; c++) {
    for (const [id, t] of occ) {
      const p = sites.get(id).pos, q = [p[0] + a, p[1] + b, p[2] + c];
      seen.set(q.map(v => Math.round(v * 2)).join(','), { pos: q, type: t });
    }
  }
  return [...seen.values()];
}

/** Coordination number: how many nearest neighbours touch a particle, found from the positions (3×3×3 block, middle particle). */
export function coordination(occ, of = null) {
  const pts = tile(occ, 3).map(p => ({ ...p, pos: p.pos.map(v => v - 1) })); // shift so the middle cell is the central one
  const centre = pts.filter(p => p.pos.every(v => v >= 0 && v <= 1 && Math.abs(v * 2 - Math.round(v * 2)) < 1e-9))
    .find(p => (of ? p.type === of : true) && p.pos.every(v => v === 0)) || pts.find(p => p.pos.every(v => v === 0));
  const d = pts.filter(p => p !== centre).map(p => Math.hypot(...p.pos.map((v, i) => v - centre.pos[i])));
  const min = Math.min(...d);
  return d.filter(x => Math.abs(x - min) < 1e-6).length;
}

/** Name of the lattice a set of kinds describes, for the "which lattice is this?" question. */
export const latticeKeys = ['sc', 'bcc', 'fcc'];

/** Points awarded: 10 for a first-try answer, then 7, 4, 2 (same scale as the other activities). */
export const pointsFor = wrong => [10, 7, 4][wrong] ?? 2;

/** The 4 option values for a numeric question, always containing the right answer. */
export function numberOptions(right, pool) {
  const o = pool.filter(v => v !== right).slice(0, 3).concat(right);
  return o.sort((a, b) => a - b);
}

/** "8 × ⅛ + 6 × ½ = 4": how the particles per cell add up (single-particle lattices). */
export function shareFormula(occ) {
  const sites = new Map(allSites().map(x => [x.id, x]));
  const count = {};
  for (const id of occ.keys()) { const k = sites.get(id).kind; count[k] = (count[k] || 0) + 1; }
  const frac = { corner: '⅛', edge: '¼', face: '½', body: '1' };
  const parts = ['corner', 'edge', 'face', 'body'].filter(k => count[k]).map(k => `${count[k]} × ${frac[k]}`);
  const total = Object.values(particlesPerCell(occ)).reduce((a, b) => a + b, 0);
  return `${parts.join(' + ')} = ${total}`;
}
