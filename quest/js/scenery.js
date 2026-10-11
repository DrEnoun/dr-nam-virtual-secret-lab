// Scenery sprites for the overworld: trees, houses, temples, castles, crystals, a diner... Each is drawn at 2x, then crisped
// into hard pixels with an outline. A sprite can carry "anchors" (smoke points, window lights, glyph orbs) for animation.
import { pxCanvas, crisp, lightPass, shapes, shade, tint, mix } from './pxart.js';

export const A = 3;           // art pixels per map unit
const OUT = '#10202e';

export function make(w, h, fn, outline = OUT) {
  const cv = pxCanvas(w * A, h * A), c = cv.getContext('2d');
  c.scale(A, A);
  const anchors = fn(c, shapes(c)) || {};
  lightPass(c, w, h);
  crisp(cv, outline, 110, 2);
  cv.anchors = anchors; cv.lw = w; cv.lh = h;
  return cv;
}
const lin = (c, x0, y0, x1, y1, ...stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const lines = (c, col, lw, pts) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); pts.forEach(([x0, y0, x1, y1]) => { c.moveTo(x0, y0); c.lineTo(x1, y1); }); c.stroke(); };

// ---------- plants ----------
export const TREES = {
  green:   ['#2c8a45', '#3fae5a', '#76d98d'],
  teal:    ['#1f8a6a', '#34b58a', '#7be6bd'],
  blossom: ['#d9548f', '#f07fb0', '#ffc2dc'],
  autumn:  ['#c8641e', '#f09a2e', '#ffd070'],
  lime:    ['#5aa820', '#86d338', '#c4f56c'],
};
export const roundTree = (pal = TREES.green) => make(32, 38, (c, { R, E }) => {
  R(14, 25, 4.4, 12, 1.6, '#6b4226'); R(16.4, 25, 2, 12, 1, '#4f301a', false);
  E(16, 20, 14, 11, pal[0]); E(9, 21, 8.4, 7.4, pal[1]); E(23, 21, 8.4, 7.4, pal[1]); E(16, 13.4, 11, 9.4, pal[1]);
  E(12.4, 10, 5.4, 4.4, pal[2], false); E(21, 15, 3.4, 2.6, pal[2], false); E(8, 19, 2.6, 2, pal[2], false);
});
export const pine = (snow = false) => make(26, 38, (c, { R, P }) => {
  R(11.4, 29, 3.4, 8, 1.2, '#6b4226');
  const g = snow ? ['#2a7a57', '#3a9a6c', '#4db783'] : ['#2a8a46', '#3aa857', '#58c874'];
  P([[13, 12], [2, 31], [24, 31]], g[0]); P([[13, 6.6], [4, 22], [22, 22]], g[1]); P([[13, 1.2], [6, 14], [20, 14]], g[2]);
  P([[13, 1.2], [6, 14], [13, 14]], 'rgba(255,255,255,.16)', false);
  if (snow) { P([[13, 1.2], [9.4, 7.6], [13, 6.2], [16.6, 7.6]], '#f4fbff', false); P([[13, 6.6], [8, 15], [13, 13.4], [18, 15]], '#f4fbff', false); P([[13, 12], [6, 24], [13, 21.4], [20, 24]], '#f4fbff', false); }
});
export const palm = () => make(36, 40, (c, { E }) => {
  c.lineCap = 'round'; c.strokeStyle = '#5a3a1c'; c.lineWidth = 5; c.beginPath(); c.moveTo(16, 38); c.quadraticCurveTo(21, 24, 18, 11); c.stroke();
  c.strokeStyle = '#8a5a2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(16, 38); c.quadraticCurveTo(21, 24, 18, 11); c.stroke();
  c.strokeStyle = '#5a3a1c'; c.lineWidth = 0.8; for (let y = 16; y < 36; y += 4) { c.beginPath(); c.moveTo(15.4 + (y - 16) * 0.05, y); c.lineTo(20 - (y - 16) * 0.05, y - 1.4); c.stroke(); }
  [[-2.9, '#2a8a46'], [-2.2, '#3aa857'], [-1.3, '#58c874'], [-0.5, '#3aa857'], [0.3, '#2a8a46'], [-3.5, '#3aa857'], [0.9, '#3aa857']].forEach(([a, col]) => E(18 + Math.cos(a) * 7.4, 11 + Math.sin(a) * 3.6 + 1.4, 8.4, 2.6, col, true, a * 0.78));
  E(17, 12.6, 2.4, 2.4, '#6b4226'); E(20, 14, 1.6, 1.6, '#8a5a2b');
});
export const bush = (pal = ['#2f9a4c', '#4fc06b']) => make(22, 12, (c, { E }) => { E(7, 7.6, 6.4, 4.4, pal[0]); E(15, 8, 6, 4, pal[0]); E(11, 5.6, 6, 4.2, pal[1]); E(9, 4.4, 2, 1.2, tint(pal[1], 0.4), false); });
export const rocks = (col = '#7a8798') => make(26, 14, (c, { E, P }) => {
  P([[1, 13], [4, 5], [10, 3], [15, 7], [16, 13]], col); P([[10, 3], [15, 7], [16, 13], [10, 13]], shade(col, 0.2)); P([[4, 5], [10, 3], [8, 7]], tint(col, 0.25), false);
  P([[14, 13], [16, 8], [21, 6], [25, 13]], shade(col, 0.1));
});
export const fence = () => make(34, 12, (c, { R }) => {
  R(0, 4, 34, 2, 0.8, '#d9b27c'); R(0, 8, 34, 2, 0.8, '#d9b27c');
  for (let x = 1; x < 34; x += 8) R(x, 1, 3, 11, 0.8, '#e6c08a');
});

// ---------- buildings ----------
export const cottage = () => make(52, 50, (c, { R, P, E }) => {
  R(7, 22, 38, 26, 2, '#e6c08a'); R(33, 22, 12, 26, 2, '#c99d62');
  lines(c, 'rgba(120,76,34,.35)', 0.8, [4, 8, 12, 16, 20].map(d => [8, 24 + d, 44, 24 + d]));
  R(36, 6, 7, 13, 1.2, '#8f8f9a'); R(35, 4.6, 9, 3, 1, '#a9a9b6');
  P([[2, 24], [26, 4], [50, 24]], '#c0504d'); P([[26, 4], [50, 24], [37, 24]], '#9f3d3b'); P([[2, 24], [10, 24], [26, 7]], '#e2827e', false);
  lines(c, 'rgba(70,20,20,.35)', 0.8, [[8, 20, 44, 20], [14, 15, 38, 15], [19, 10, 33, 10]]);
  R(11, 31, 10, 17, 5, '#5a3a1c'); E(18.6, 40, 0.9, 0.9, '#d4ff3a', false);
  R(26, 29, 10, 9, 1.5, '#ffe08a'); lines(c, '#8a5a2b', 0.9, [[31, 29, 31, 38], [26, 33.5, 36, 33.5]]);
  R(25, 38, 12, 3.4, 1, '#6b4226'); [[27, 5], [31, 3.8], [35, 5]].forEach(([x, y], i) => E(x, 37.4 + y * 0 - 0.2, 1.4, 1.4, ['#fc7a7a', '#ffffff', '#fc7a7a'][i], false));
  return { smoke: [39.5, 4], windows: [[26, 29, 10, 9]] };
});
export const boat = () => make(44, 36, (c, { R, P }) => {
  P([[2, 22], [42, 22], [35, 33], [9, 33]], '#8a5a2b'); P([[2, 22], [42, 22], [41, 25], [3, 25]], '#d4ff3a'); P([[9, 33], [35, 33], [36, 31], [8, 31]], '#5a3a1c', false);
  R(21, 3, 2.2, 20, 0.6, '#5a3a1c'); P([[23.4, 4], [23.4, 20], [39, 20]], '#f4f9fd'); P([[21, 7], [21, 20], [9, 20]], '#dbe8f3'); P([[22, 3], [30, 5], [22, 7]], '#d4ff3a');
});
export const ziggurat = () => make(70, 62, (c, { R, P, E }) => {
  R(3, 46, 64, 14, 2, '#d9b36d'); R(10, 35, 50, 12, 2, '#e4c07f'); R(17, 24, 36, 12, 2, '#d9b36d'); R(25, 13, 20, 12, 2, '#e4c07f');
  [[3, 46, 64], [10, 35, 50], [17, 24, 36], [25, 13, 20]].forEach(([x, y, w]) => { lines(c, 'rgba(110,70,20,.3)', 0.8, [[x + 2, y + 6, x + w - 2, y + 6]]); for (let k = x + 6; k < x + w - 4; k += 9) lines(c, 'rgba(110,70,20,.25)', 0.8, [[k, y + 1, k, y + 6]]); });
  P([[29, 60], [41, 60], [38, 36], [32, 36]], '#b8864a'); for (let y = 40; y < 60; y += 4) lines(c, 'rgba(60,35,10,.4)', 0.9, [[30 - (y - 40) * 0.04, y, 40, y]]);
  R(1, 38, 6, 22, 2, '#efd59a'); R(63, 38, 6, 22, 2, '#efd59a'); R(0, 34, 8, 5, 1.4, '#c9a05a'); R(62, 34, 8, 5, 1.4, '#c9a05a');
  R(30, 15, 10, 9, 4.5, '#10202e'); E(35, 11, 4, 4, '#5eead4', '#0d5c63'); E(35, 11, 1.6, 1.6, '#ffffff', false);
  return { orb: [35, 11] };
});
export const tableWall = () => make(64, 48, (c, { R }) => {
  R(2, 14, 60, 32, 3, '#6e7a8f'); R(0, 6, 64, 9, 3, '#8794a8'); R(0, 12, 8, 34, 2, '#8794a8'); R(56, 12, 8, 34, 2, '#8794a8');
  const cols = ['#e8a33d', '#2dd4bf', '#a78bfa', '#7bd05a', '#fc7a7a', '#8fd3ff'];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) R(9 + i * 8, 18 + j * 9, 6.6, 7.4, 1.6, cols[(i + j * 2) % 6]);
  for (let i = 0; i < 5; i++) R(4 + i * 12, 0.6, 7, 6.4, 1.2, '#a2aebf', false);
  R(28, 1, 8, 5, 1.4, '#d4ff3a', false);
});
export const castle = () => make(66, 74, (c, { R, P }) => {
  R(18, 30, 30, 42, 2, '#7686a0'); R(38, 30, 10, 42, 2, '#62718b');
  [[2, 22, 20, '#8b9bb3'], [44, 22, 20, '#8b9bb3']].forEach(([x, y, w, col], i) => { R(x, y, w, 50, 2, col); R(x + w - 6, y, 6, 50, 1.4, shade(col, 0.16), false); P([[x - 2, y + 1], [x + w / 2, y - 20], [x + w + 2, y + 1]], '#7c4dbd'); P([[x + w / 2, y - 20], [x + w + 2, y + 1], [x + w * 0.62, y + 1]], '#5e3a96'); R(x + w / 2 - 0.7, y - 28, 1.4, 9, 0.5, '#3a2a14', false); P([[x + w / 2 + 0.7, y - 28], [x + w / 2 + 8, y - 25.4], [x + w / 2 + 0.7, y - 23]], '#d4ff3a', false); });
  for (let i = 0; i < 4; i++) R(18 + i * 8, 26, 5, 5, 0.8, '#7686a0', false);
  R(27, 52, 12, 20, 6, '#10202e'); lines(c, '#3a4a64', 0.9, [[33, 46, 33, 72]]);
  const wins = [[8, 32, 5, 8], [51, 32, 5, 8], [30, 38, 6, 8], [8, 48, 5, 8], [51, 48, 5, 8]];
  wins.forEach(([x, y, w, h]) => R(x, y, w, h, 2.4, '#ffe08a', '#8a6a1a'));
  return { windows: wins };
});
export const mountain = (w = 60, h = 52, snow = true) => make(w, h, (c, { P }) => {
  P([[1, h - 1], [w * 0.28, h * 0.4], [w * 0.5, 2], [w * 0.74, h * 0.34], [w - 1, h - 1]], '#8394a8');
  P([[w * 0.5, 2], [w * 0.74, h * 0.34], [w - 1, h - 1], [w * 0.58, h - 1], [w * 0.56, h * 0.4]], '#5d6c82');
  P([[w * 0.28, h * 0.4], [w * 0.5, 2], [w * 0.44, h * 0.5], [w * 0.36, h * 0.62]], 'rgba(255,255,255,.14)', false);
  if (snow) P([[w * 0.5, 2], [w * 0.4, h * 0.26], [w * 0.46, h * 0.22], [w * 0.52, h * 0.3], [w * 0.58, h * 0.2], [w * 0.64, h * 0.27]], '#f6fbff', '#9db4cc');
  lines(c, 'rgba(30,40,60,.3)', 0.9, [[w * 0.5, h * 0.3, w * 0.46, h * 0.66], [w * 0.56, h * 0.4, w * 0.62, h * 0.8]]);
});
export const crystal = () => make(60, 62, (c, { P, E }) => {
  const shard = (x, base, top, w, col, dark, lite) => { P([[x - w, base], [x - w * 0.55, top + 8], [x, top], [x + w * 0.6, top + 10], [x + w, base]], col); P([[x, top], [x + w * 0.6, top + 10], [x + w, base], [x + w * 0.1, base]], dark); P([[x, top], [x - w * 0.55, top + 8], [x - w, base], [x - w * 0.4, base]], lite, false); };
  shard(18, 60, 14, 9, '#8fe3f5', '#4fb6d6', '#d6faff'); shard(31, 60, 2, 10, '#a6ecfb', '#52bfdc', '#e8fdff'); shard(45, 60, 20, 8, '#8fe3f5', '#4fb6d6', '#d6faff'); shard(8, 60, 36, 6, '#73d2ec', '#3f9fc0', '#c4f4ff');
  E(31, 30, 2, 5, 'rgba(255,255,255,.7)', false);
  return { glow: [31, 30] };
});
export const crystalS = (col = ['#bff7ef', '#7fe3ff']) => make(22, 24, (c, { P }) => {
  P([[2, 23], [8, 5], [14, 23]], col[0]); P([[8, 5], [14, 23], [10, 23]], col[1]); P([[12, 23], [17, 12], [21, 23]], col[1]);
});
export const iceHall = () => make(64, 46, (c, { E, R, P }) => {
  c.beginPath(); c.ellipse(32, 40, 30, 36, 0, Math.PI, 0); c.closePath(); c.fillStyle = lin(c, 0, 4, 0, 40, [0, '#e8fbff'], [1, '#a6dcf5']); c.fill(); c.strokeStyle = '#4f93bd'; c.lineWidth = 0.9; c.stroke();
  lines(c, 'rgba(79,147,189,.4)', 0.8, [[10, 28, 54, 28], [16, 18, 48, 18], [24, 10, 40, 10], [20, 28, 22, 40], [32, 18, 32, 28], [44, 28, 42, 40]]);
  R(24, 22, 16, 19, 8, '#10202e'); R(26.4, 25, 11.2, 16, 5.6, '#2e7fb8', false); E(32, 33, 2.4, 2.4, '#8ff5ff', false);
  for (let x = 6; x < 58; x += 7) P([[x, 40], [x + 3, 40], [x + 1.5, 40 + 3 + (x % 3)]], '#e8fbff', false);
  return { glow: [32, 33] };
});
export const diner = () => make(80, 70, (c, { R, P, E }) => {
  R(6, 28, 68, 40, 2.5, '#eef6ff'); R(60, 28, 14, 40, 2.5, '#c9d8e8'); R(6, 60, 68, 8, 1.4, '#9db4cc');
  R(2, 20, 76, 8, 2, '#0d1d33');
  for (let i = 0; i < 10; i++) P([[2 + i * 7.6, 30], [2 + (i + 1) * 7.6, 30], [4 + (i + 1) * 7.2, 20.6], [4 + i * 7.2, 20.6]], i % 2 ? '#fdfefe' : '#d4ff3a', '#6f7f00');
  R(12, 36, 36, 20, 3, '#ffd98a', '#8a6a1a'); P([[14, 55], [26, 37.6], [31, 37.6], [19, 55]], 'rgba(255,255,255,.35)', false);
  R(15, 48, 30, 3.4, 1, '#8a5a2b'); [[20, 44], [30, 44], [40, 44]].forEach(([x, y]) => { E(x, y, 3, 3, '#fc7a7a'); R(x - 0.6, y + 2.6, 1.2, 5, 0.4, '#5a3a1c', false); });
  R(54, 38, 14, 28, 2.4, '#3a2a14'); R(56, 40, 10, 13, 1.6, '#7fe3ff', false); E(65, 55, 1, 1, '#d4ff3a', false);
  R(14, 1, 52, 15, 4, '#0d1d33', '#d4ff3a'); c.fillStyle = '#d4ff3a'; c.font = '800 10.5px "League Spartan", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ION DINER', 40, 9);
  R(56, 14, 5, 7, 1, '#8f8f9a');
  R(50, 66, 24, 4, 1, '#b5c5d6');
  return { neon: [14, 1, 52, 15], windows: [[12, 36, 36, 20]], steam: [58.5, 14] };
});
export const lamp = () => make(12, 36, (c, { R, E }) => { R(5, 8, 2.4, 27, 0.8, '#3a4a64'); E(6.2, 6, 4.6, 4.6, '#fff6b8', '#8a6a1a'); R(2.4, 1, 7.6, 2.4, 1, '#3a4a64'); return { glow: [6.2, 6] }; });
export const pylon = (cols = ['#2fe0cc', '#17a79a', '#9ffbf1']) => make(22, 40, (c, { P }) => {
  P([[3, 39], [6, 12], [11, 2], [16, 12], [19, 39]], cols[0]); P([[11, 2], [16, 12], [19, 39], [12, 39]], cols[1]); P([[11, 2], [6, 12], [3, 39], [7, 39]], cols[2], false);
  P([[11.4, 15], [12.8, 20.6], [18, 22], [12.8, 23.4], [11.4, 29], [10, 23.4], [4.8, 22], [10, 20.6]], '#ffffff', false);   // sparkle
  return { glow: [11, 22] };
});
export const pillar = () => make(14, 30, (c, { R }) => { R(2, 6, 10, 23, 1.5, '#efd59a'); R(8, 6, 4, 23, 1, '#d1ab62', false); R(0, 3, 14, 4, 1.2, '#d9b36d'); R(1, 25, 12, 4, 1.2, '#c9a05a'); lines(c, 'rgba(110,70,20,.35)', 0.8, [[3, 14, 7, 12]]); });
export const sign = () => make(24, 22, (c, { R, E }) => { R(10.6, 9, 2.8, 12, 0.8, '#6b4226'); R(1, 1, 22, 11, 3, '#0d1d33', '#d4ff3a'); E(8, 6.6, 2.6, 2.6, '#5eead4', false); E(16, 6.6, 2.6, 2.6, '#fc7a7a', false); });
