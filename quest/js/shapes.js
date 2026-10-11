// Pictograms of molecular shapes for the memory cards: a central atom (A) with outer atoms (X) placed at the
// real bond angles, and lone pairs shown as pairs of dots. Returned as SVG strings. Pure: no DOM needed.
export const SHAPES = {
  linear:               { angle: '180°',   atoms: [[14, 36], [82, 36]], centre: [48, 36], lone: [] },
  bent:                 { angle: '104.5°', atoms: [[27.4, 38], [68.6, 38]], centre: [48, 22], lone: [[40, 8], [56, 8]] },
  'trigonal planar':    { angle: '120°',   atoms: [[48, 7], [23.8, 50], [72.2, 50]], centre: [48, 36], lone: [] },
  'trigonal pyramidal': { angle: '≈107°',  atoms: [[22, 46], [74, 46], [48, 60]], centre: [48, 22], lone: [[48, 7]] },
  tetrahedral:          { angle: '109.5°', atoms: [[48, 6], [19, 48], [77, 48], [48, 62]], centre: [48, 32], lone: [] },
};

let uid = 0;
export function shapeSVG(shape) {
  const s = SHAPES[shape];
  if (!s) return '';
  const id = `sg${uid++}`, [cx, cy] = s.centre;
  const atom = (x, y, r, a, b) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id}${a})" stroke="${b}" stroke-width="1.3"/>`;
  const bonds = s.atoms.map(([x, y]) => `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#14202e" stroke-width="6.4" stroke-linecap="round"/><line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#e8f0f8" stroke-width="3.6" stroke-linecap="round"/>`).join('');
  const lone = s.lone.map(([x, y]) => `<circle cx="${x - 2.6}" cy="${y}" r="1.9" fill="#1b2733"/><circle cx="${x + 2.6}" cy="${y}" r="1.9" fill="#1b2733"/>`).join('');
  return `<svg viewBox="0 0 96 72" role="img" aria-label="${shape} shape" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${id}x" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffd0d0"/><stop offset=".5" stop-color="#ff6262"/><stop offset="1" stop-color="#9c2d2d"/></radialGradient>
      <radialGradient id="${id}a" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#cfdcff"/><stop offset=".5" stop-color="#5f86ff"/><stop offset="1" stop-color="#2a3f9c"/></radialGradient>
    </defs>${bonds}${lone}${s.atoms.map(([x, y]) => atom(x, y, 7.6, 'x', '#6a1d1d')).join('')}${atom(cx, cy, 9.6, 'a', '#1c2a6a')}</svg>`;
}
