// Friendly molecule monsters that roam the overworld. Each is built to the real geometry of the molecule
// (water is bent at 104.5°, CO₂ is linear...) and tapping one tells you about its shape and bonding.
import { make } from './scenery.js';
import { shade, tint } from './pxart.js';

// Rounded "cartoon CPK" colours and relative sizes (map units).
export const ATOM = {
  H:  { col: '#f4f9ff', r: 5.4 }, O:  { col: '#ff6262', r: 8.6 }, C:  { col: '#6f7a8c', r: 8.6 },
  N:  { col: '#5f86ff', r: 9 },   Na: { col: '#b06bff', r: 7.2 }, Cl: { col: '#43d96b', r: 10 },
};
// Bond angles (degrees) used to place the atoms, so the drawing agrees with the chemistry.
export const GEOMETRY = { water: 104.5, co2: 180, nh3: 107, ch4: 109.5 };

export const MONSTERS = [
  { id: 'water', name: 'H₂O',  fact: 'I’m water, H₂O! My shape is bent, about 104.5°, because the oxygen has two lone pairs pushing the bonds together.' },
  { id: 'co2',   name: 'CO₂',  fact: 'I’m CO₂: linear, 180°. My two C=O bonds are polar, but they point opposite ways and cancel, so the whole molecule is nonpolar.' },
  { id: 'nh3',   name: 'NH₃',  fact: 'I’m ammonia, NH₃: trigonal pyramidal, about 107°. The lone pair on nitrogen squeezes my three N–H bonds together.' },
  { id: 'ch4',   name: 'CH₄',  fact: 'I’m methane, CH₄: tetrahedral, 109.5°. Four bonds and no lone pairs, so I’m perfectly symmetrical and nonpolar.' },
  { id: 'o2',    name: 'O₂',   fact: 'We’re oxygen, O₂: two oxygen atoms sharing two pairs of electrons, a double bond (O=O).' },
  { id: 'nacl',  name: 'NaCl', fact: 'We’re sodium chloride! Sodium gives an electron to chlorine, and the oppositely charged ions stick together: an ionic bond.' },
];

// ----- drawing helpers (c is a 2D context scaled in map units) -----
function sphere(c, x, y, r, col) {
  const g = c.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.1, x, y, r * 1.05);
  g.addColorStop(0, tint(col, 0.65)); g.addColorStop(0.45, col); g.addColorStop(1, shade(col, 0.42));
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = g; c.fill();
  c.strokeStyle = shade(col, 0.6); c.lineWidth = 0.9; c.stroke();
}
function bond(c, x0, y0, x1, y1, n = 1) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  for (let i = 0; i < n; i++) {
    const o = n === 1 ? 0 : (i - (n - 1) / 2) * 3.4;
    c.lineCap = 'round';
    c.strokeStyle = '#1b2733'; c.lineWidth = 3.6; c.beginPath(); c.moveTo(x0 + nx * o, y0 + ny * o); c.lineTo(x1 + nx * o, y1 + ny * o); c.stroke();
    c.strokeStyle = '#e8f0f8'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + nx * o, y0 + ny * o); c.lineTo(x1 + nx * o, y1 + ny * o); c.stroke();
  }
}
function face(c, x, y, r, smile = 1) {
  const ex = r * 0.4, ey = y - r * 0.12, er = r * 0.3;
  [-1, 1].forEach(s => {
    c.beginPath(); c.arc(x + s * ex, ey, er, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = '#1b2733'; c.lineWidth = 0.8; c.stroke();
    c.beginPath(); c.arc(x + s * ex + 0.5, ey + 0.4, er * 0.55, 0, Math.PI * 2); c.fillStyle = '#1b2733'; c.fill();
    c.beginPath(); c.arc(x + s * ex + 1, ey - 0.4, er * 0.2, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.fill();
    c.beginPath(); c.ellipse(x + s * (ex + r * 0.34), y + r * 0.3, r * 0.2, r * 0.12, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(255,120,150,.6)'; c.fill();
  });
  c.strokeStyle = '#4a1d2a'; c.lineWidth = 1.1; c.lineCap = 'round';
  c.beginPath(); c.arc(x, y + r * 0.18, r * 0.3, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
}
const polar = (cx, cy, len, deg) => [cx + len * Math.sin((deg * Math.PI) / 180), cy + len * Math.cos((deg * Math.PI) / 180)];   // 0° = straight down

const BUILD = {
  water(c) {
    const [ox, oy] = [24, 16], L = 14, half = GEOMETRY.water / 2;
    const hs = [polar(ox, oy, L, -half), polar(ox, oy, L, half)];
    hs.forEach(([x, y]) => bond(c, ox, oy, x, y)); hs.forEach(([x, y]) => sphere(c, x, y, ATOM.H.r, ATOM.H.col));
    sphere(c, ox, oy, ATOM.O.r + 1, ATOM.O.col); face(c, ox, oy, ATOM.O.r + 1);
  },
  co2(c) {
    const [cx, cy] = [24, 20], L = 17;
    [-1, 1].forEach(s => { bond(c, cx, cy, cx + s * L, cy, 2); sphere(c, cx + s * L, cy, ATOM.O.r - 0.6, ATOM.O.col); });
    sphere(c, cx, cy, ATOM.C.r + 1, ATOM.C.col); face(c, cx, cy, ATOM.C.r + 1);
  },
  nh3(c) {
    const [nx, ny] = [24, 14], L = 15, half = GEOMETRY.nh3 / 2;
    const back = [polar(nx, ny, L, -half), polar(nx, ny, L, half)], front = [nx, ny + L * 0.95];
    back.forEach(([x, y]) => { bond(c, nx, ny, x, y); sphere(c, x, y, ATOM.H.r, ATOM.H.col); });
    sphere(c, nx, ny, ATOM.N.r + 1, ATOM.N.col); face(c, nx, ny, ATOM.N.r + 1);
    bond(c, nx, ny + 6, front[0], front[1]); sphere(c, front[0], front[1], ATOM.H.r, ATOM.H.col);
  },
  ch4(c) {
    const [cx, cy] = [24, 20], L = 15;
    const hs = [[cx, cy - L], [cx - L * 0.95, cy + L * 0.45], [cx + L * 0.95, cy + L * 0.45]];
    hs.forEach(([x, y]) => { bond(c, cx, cy, x, y); sphere(c, x, y, ATOM.H.r, ATOM.H.col); });
    sphere(c, cx, cy, ATOM.C.r + 1.4, ATOM.C.col); face(c, cx, cy, ATOM.C.r + 1.4);
    bond(c, cx, cy + 5, cx, cy + L * 0.9); sphere(c, cx, cy + L * 0.9, ATOM.H.r, ATOM.H.col);
  },
  o2(c) {
    const y = 19;
    bond(c, 14, y, 34, y, 2);
    [14, 34].forEach(x => { sphere(c, x, y, ATOM.O.r, ATOM.O.col); face(c, x, y, ATOM.O.r); });
  },
  nacl(c) {
    const y = 19;
    c.strokeStyle = '#ffe27a'; c.lineWidth = 2.4; c.lineJoin = 'round'; c.beginPath(); c.moveTo(20, y - 3); c.lineTo(25, y + 3); c.lineTo(28, y - 3); c.lineTo(32, y + 2); c.stroke();
    sphere(c, 13, y, ATOM.Na.r, ATOM.Na.col); face(c, 13, y, ATOM.Na.r);
    sphere(c, 35, y, ATOM.Cl.r, ATOM.Cl.col); face(c, 35, y, ATOM.Cl.r);
  },
};

const cache = {};
export function monsterSprite(id) { return (cache[id] ??= make(48, 40, c => { BUILD[id](c); })); }
