// Overworld map: six organic islands (meadow, ruins, falls, peaks, glacier, diner) joined by rope bridges, with glossy
// numbered pins and the player's avatar. Drawn at 2x then crisped into hard pixels, with animated water, waterfalls,
// smoke, lit windows, an orbiting atom, snow, neon and boats.
import { drawAvatar } from './avatar.js';
import { walkPath } from './progress.js';
import { pxCanvas, crisp, lightPass, greyscale, shapes, shade, tint, mix } from './pxart.js';
import * as SC from './scenery.js';

const A = SC.A;                         // art pixels per map unit
const IW = 164, IH = 140, CX = 82, CY = 66, RX = 60, RY = 27, CLIFF = 22;   // island sprite box and shape
const OUT = '#0a2236';

const PAL = {
  meadow:  { top: '#58bd5f', hi: '#86e07c', sh: '#3a9650', edge: '#b6f59a', cliff: '#8a6a45', cliff2: '#5c4228' },
  ruins:   { top: '#e6c681', hi: '#f8e2ac', sh: '#c99f58', edge: '#fff3cc', cliff: '#b8864a', cliff2: '#7d5a2e' },
  falls:   { top: '#46a85f', hi: '#7ad88c', sh: '#2f8250', edge: '#a8f0b2', cliff: '#6d7684', cliff2: '#454d5c' },
  peaks:   { top: '#8b9caf', hi: '#b8c7d7', sh: '#697a8d', edge: '#dce7f1', cliff: '#566378', cliff2: '#363f50' },
  glacier: { top: '#d6f3ff', hi: '#ffffff', sh: '#a5d3ec', edge: '#ffffff', cliff: '#86bde6', cliff2: '#4f86b0' },
  diner:   { top: '#33b9ad', hi: '#6ee9db', sh: '#1f8e88', edge: '#aaffef', cliff: '#10666c', cliff2: '#0a4048' },
};

const hash = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const wobble = (th, seed) => 1 + 0.12 * Math.sin(2 * th + seed * 1.7) + 0.09 * Math.sin(3 * th + seed * 2.3) + 0.05 * Math.sin(5 * th + seed * 0.9);
const lin = (c, x0, y0, x1, y1, ...stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };

// Scenery per island: [sprite, dx, dy] from the island centre, bottom-centre anchored. Painted back to front.
const SCENERY = {
  meadow: [['roundTree', -50, 2], ['pine', -40, 10], ['blossom', -27, -4], ['cottage', 34, 2], ['bushB', -30, 14], ['fence', 46, 15], ['limeTree', 54, 12], ['bushB', 12, 19], ['rocks', -4, 21], ['blossom', -56, 15]],
  ruins:  [['palm', -50, 4], ['palm', -39, 12], ['palm', -54, 15], ['ziggurat', 30, 4], ['pillar', -22, 12], ['autumn', 4, 19], ['rocks', 54, 18]],
  falls:  [['tealTree', -50, 4], ['pine', -40, 12], ['wall', 32, 5], ['tealTree', 54, 13], ['bushB', -28, 17], ['rocks', 8, 21], ['blossom', -58, 16]],
  peaks:  [['mtn', -34, 6], ['mtnS', -14, 16], ['castle', 36, 4], ['pine', -54, 14], ['rocks', 54, 16]],
  glacier:[['crystal', -36, 6], ['snowPine', -52, 12], ['crystalS', -14, 18], ['iceHall', 33, 4], ['snowPine', 55, 13], ['snowPine', -46, 17]],
  diner:  [['pylonP', -46, 8], ['pylonM', -34, 15], ['diner', 33, 3], ['lamp', -12, 20], ['lamp', 58, 14], ['crystalS', 8, 22]],
};
const MAKE = {
  roundTree: () => SC.roundTree(), blossom: () => SC.roundTree(SC.TREES.blossom), tealTree: () => SC.roundTree(SC.TREES.teal), limeTree: () => SC.roundTree(SC.TREES.lime), autumn: () => SC.roundTree(SC.TREES.autumn), bushB: () => SC.bush(['#2f9a8a', '#52d1b8']), pine: () => SC.pine(false), snowPine: () => SC.pine(true), palm: SC.palm, bush: () => SC.bush(), rocks: () => SC.rocks(),
  fence: SC.fence, cottage: SC.cottage, ziggurat: SC.ziggurat, pillar: SC.pillar, wall: SC.tableWall, castle: SC.castle,
  mtn: () => SC.mountain(64, 54), mtnS: () => SC.mountain(40, 34), crystal: SC.crystal, crystalS: () => SC.crystalS(), iceHall: SC.iceHall,
  diner: SC.diner, lamp: SC.lamp, pylonP: () => SC.pylon('+'), pylonM: () => SC.pylon('−'),
};
const cache = {};
const sprite = k => (cache[k] ??= MAKE[k]());

// ---------- island body: organic outline, cliff face, surface, river and waterfall ----------
function islandBody(c, w) {
  const p = PAL[w.biome], { E, P } = shapes(c), seed = w.id * 1.9, N = 120;
  const top = [];
  for (let i = 0; i < N; i++) { const th = (i / N) * Math.PI * 2, r = wobble(th, seed); top.push([CX + Math.cos(th) * RX * r, CY + Math.sin(th) * RY * r]); }
  const front = top.filter((_, i) => i <= N / 2);                        // lower (front) half of the outline
  const shifted = d => front.map(([x, y]) => [x, y + d]);
  // cliff
  c.beginPath(); front.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); shifted(CLIFF).reverse().forEach(([x, y]) => c.lineTo(x, y)); c.closePath();
  c.fillStyle = lin(c, CX - RX, 0, CX + RX, 0, [0, tint(p.cliff, 0.12)], [0.55, p.cliff], [1, p.cliff2]); c.fill();
  c.save(); c.clip();
  c.strokeStyle = 'rgba(0,0,0,.24)'; c.lineWidth = 1.2;
  for (let k = 1; k <= 3; k++) { c.beginPath(); shifted((CLIFF * k) / 3.6).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
  c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 0.9;
  for (let k = 0; k < 14; k++) { const [x, y] = front[Math.floor(hash(k, w.id) * (front.length - 2)) + 1]; c.beginPath(); c.moveTo(x, y + 2); c.lineTo(x + (hash(k, 7) - .5) * 4, y + 5 + hash(k, 8) * (CLIFF - 8)); c.stroke(); }
  c.fillStyle = 'rgba(0,0,0,.24)'; c.fillRect(0, CY + RY + CLIFF - 6, IW, 12);
  c.restore();
  // surface
  P(top, p.top, false);
  c.save(); c.beginPath(); top.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
  E(CX - 12, CY - 7, RX * 0.8, RY * 0.66, p.hi, false); E(CX - 18, CY - 11, RX * 0.46, RY * 0.38, tint(p.hi, 0.3), false);
  c.strokeStyle = p.sh; c.lineWidth = 7; c.beginPath(); front.forEach(([x, y], i) => (i ? c.lineTo(x, y - 1) : c.moveTo(x, y - 1))); c.stroke();
  texture(c, w, p);
  c.restore();
  c.strokeStyle = p.edge; c.lineWidth = 1.6; c.beginPath(); top.filter((_, i) => i >= N / 2).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  if (w.biome === 'meadow' || w.biome === 'falls') { c.strokeStyle = '#4fb56a'; c.lineWidth = 1.5; for (let k = 0; k < 16; k++) { const [x, y] = front[2 + Math.floor(hash(k, 33 + w.id) * (front.length - 4))]; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 2 + hash(k, 4) * 6); c.stroke(); } }
  return { front };
}

function texture(c, w, p) {
  const spot = (n, fn) => { for (let i = 0; i < n; i++) { const a = hash(i, w.id * 7) * 6.283, r = 0.15 + hash(i, w.id * 5 + 1) * 0.8, x = CX + Math.cos(a) * RX * r, y = CY + Math.sin(a) * RY * r; if (Math.abs(x - CX) < 18 && y < CY + 10) continue; fn(x, y, i); } };
  if (w.biome === 'meadow') { spot(36, (x, y, i) => { c.fillStyle = ['#ffffff', '#ffe27a', '#ff9bb0', '#bde0ff'][i % 4]; c.fillRect(x, y, 1.6, 1.6); }); spot(10, (x, y) => { c.fillStyle = 'rgba(40,120,60,.35)'; c.beginPath(); c.ellipse(x, y, 5, 2, 0, 0, 7); c.fill(); }); c.fillStyle = '#6fd4f0'; c.beginPath(); c.ellipse(CX - 22, CY + 10, 11, 4.6, 0, 0, 7); c.fill(); c.fillStyle = '#c9f4ff'; c.fillRect(CX - 28, CY + 8.4, 5, 1.2); }
  if (w.biome === 'ruins') { c.strokeStyle = 'rgba(160,110,40,.35)'; c.lineWidth = 1; spot(14, (x, y) => { c.beginPath(); c.arc(x, y, 6, 3.6, 5.8); c.stroke(); }); c.fillStyle = '#5ee0d0'; c.beginPath(); c.ellipse(CX - 14, CY + 15, 10, 3.6, 0, 0, 7); c.fill(); }
  if (w.biome === 'falls') { spot(14, (x, y) => { c.fillStyle = 'rgba(20,100,60,.35)'; c.beginPath(); c.ellipse(x, y, 6, 2.4, 0, 0, 7); c.fill(); }); }
  if (w.biome === 'peaks') { c.strokeStyle = 'rgba(40,52,70,.35)'; c.lineWidth = 0.9; spot(14, (x, y) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 5, y + 2); c.lineTo(x + 7, y + 6); c.stroke(); }); spot(8, (x, y) => { c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(x, y, 5, 2, 0, 0, 7); c.fill(); }); }
  if (w.biome === 'glacier') { c.strokeStyle = 'rgba(79,134,176,.45)'; c.lineWidth = 0.9; spot(12, (x, y) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 7, y - 2); c.lineTo(x + 9, y + 3); c.stroke(); }); c.fillStyle = '#9fe0ff'; c.beginPath(); c.ellipse(CX - 16, CY + 14, 11, 4, 0, 0, 7); c.fill(); }
  if (w.biome === 'diner') { c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 0.8; for (let x = CX - RX; x < CX + RX; x += 9) { c.beginPath(); c.moveTo(x, CY - RY); c.lineTo(x + 4, CY + RY); c.stroke(); } for (let y = CY - RY; y < CY + RY; y += 7) { c.beginPath(); c.moveTo(CX - RX, y); c.lineTo(CX + RX, y + 2); c.stroke(); } }
}

const islandCache = {};
function islandArt(w, locked) {
  const key = w.id + (locked ? 'x' : '');
  if (islandCache[key]) return islandCache[key];
  const cv = pxCanvas(IW * A, IH * A), c = cv.getContext('2d');
  c.scale(A, A); c.imageSmoothingEnabled = false;
  const { front } = islandBody(c, w), effects = [];
  const ox = w.pin[0] - CX, oy = w.pin[1] - CY;
  // river and waterfall(s) spilling off the front edge
  const falls = w.biome === 'falls' ? [0.3, 0.52] : w.biome === 'meadow' ? [0.24] : [];
  falls.forEach(f => {
    const [fx, fy] = front[Math.floor(front.length * f)];
    c.strokeStyle = '#4fc3ea'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(fx - 26 + f * 30, fy - 22); c.quadraticCurveTo(fx - 8, fy - 10, fx, fy); c.stroke();
    c.strokeStyle = '#a7ecff'; c.lineWidth = 3; c.beginPath(); c.moveTo(fx - 26 + f * 30, fy - 22); c.quadraticCurveTo(fx - 8, fy - 10, fx, fy); c.stroke();
    const h = CLIFF + 7; c.fillStyle = lin(c, 0, fy, 0, fy + h, [0, '#f2fdff'], [1, '#6fd0f2']); c.beginPath(); c.roundRect(fx - 5.5, fy - 1, 11, h, 3); c.fill();
    c.strokeStyle = '#2d86b0'; c.lineWidth = 0.9; c.stroke();
    effects.push({ type: 'fall', x: ox + fx - 5.5, y: oy + fy, w: 11, h });
  });
  for (const [name, dx, dy] of SCENERY[w.biome]) {
    const s = sprite(name);
    c.fillStyle = 'rgba(8,40,36,.28)'; c.beginPath(); c.ellipse(CX + dx + 1, CY + dy - 0.5, s.lw * 0.42, Math.max(2.4, s.lw * 0.1), 0, 0, 7); c.fill();
    c.drawImage(s, CX + dx - s.lw / 2, CY + dy - s.lh, s.lw, s.lh);
    const sx = CX + dx - s.lw / 2 + ox, sy = CY + dy - s.lh + oy, an = s.anchors || {};
    if (an.smoke) effects.push({ type: 'smoke', x: sx + an.smoke[0], y: sy + an.smoke[1] });
    if (an.steam) effects.push({ type: 'smoke', x: sx + an.steam[0], y: sy + an.steam[1] });
    (an.windows || []).forEach(([x, y, ww, hh]) => effects.push({ type: 'window', x: sx + x, y: sy + y, w: ww, h: hh }));
    if (an.orb) effects.push({ type: 'orb', x: sx + an.orb[0], y: sy + an.orb[1] });
    if (an.neon) effects.push({ type: 'neon', x: sx + an.neon[0], y: sy + an.neon[1], w: an.neon[2], h: an.neon[3] });
    if (an.glow) effects.push({ type: 'glow', x: sx + an.glow[0], y: sy + an.glow[1], c: w.biome === 'glacier' ? '143,245,255' : w.biome === 'diner' && name !== 'lamp' ? '94,234,212' : '255,240,170' });
  }
  if (w.biome === 'glacier') effects.push({ type: 'snow', x: ox + CX - RX, y: oy + CY - 54, w: RX * 2, h: 90 });
  lightPass(c, IW, IH, 0.2, 0.3);
  crisp(cv, OUT, 110, 2);
  if (locked) greyscale(cv, 0.92, 0.36);
  return (islandCache[key] = { cv, effects: locked ? [] : effects });
}

// ---------- pins ----------
const pinCache = {};
function pinSprite(w, st) {
  const key = `${w.id}-${st.unlocked}-${st.earned}`;
  if (pinCache[key]) return pinCache[key];
  const cv = pxCanvas(44 * A, 54 * A), c = cv.getContext('2d'), { P } = shapes(c);
  c.scale(A, A);
  const col = st.unlocked ? w.accent : '#8a97a5';
  c.fillStyle = col; c.beginPath(); c.arc(22, 19, 16.5, 0, Math.PI * 2); c.fill();
  P([[9.6, 29], [22, 51], [34.4, 29]], col, false);
  const hi = c.createRadialGradient(15, 11, 1, 22, 19, 19); hi.addColorStop(0, 'rgba(255,255,255,.7)'); hi.addColorStop(.55, 'rgba(255,255,255,0)'); hi.addColorStop(1, 'rgba(0,0,0,.25)');
  c.fillStyle = hi; c.beginPath(); c.arc(22, 19, 16.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = st.unlocked ? mix(col, '#ffffff', 0.8) : '#c9d2dc'; c.beginPath(); c.arc(22, 19, 10.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = st.unlocked ? '#14202e' : '#4a5663'; c.font = '800 19px "League Spartan", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(w.id), 22, 20.4);
  if (!st.unlocked) { c.fillStyle = '#eef3f8'; c.beginPath(); c.roundRect(32, 3, 11, 9, 2); c.fill(); c.strokeStyle = '#eef3f8'; c.lineWidth = 1.8; c.beginPath(); c.arc(37.5, 2.6, 3.2, Math.PI, 0); c.stroke(); }
  if (st.earned) P([[38, 3], [39.8, 7.6], [44, 7.8], [40.6, 10.6], [41.8, 15], [38, 12.4], [34.2, 15], [35.4, 10.6], [32, 7.8], [36.2, 7.6]], '#d4ff3a', '#6f7f00');
  crisp(cv, '#14202e', 110, 2);
  return (pinCache[key] = cv);
}

export function createOverworld({ canvas, pinsEl, worlds, map, getState, getAvatar, onSelect }) {
  const ctx = canvas.getContext('2d');
  const W = map.width * A, H = map.height * A;
  canvas.width = W; canvas.height = H;
  canvas.style.aspectRatio = `${map.width} / ${map.height}`;
  const layer = pxCanvas(W, H), lctx = layer.getContext('2d');
  const byId = Object.fromEntries(worlds.map(w => [w.id, w]));
  let cur = 1, walk = null, hero = { x: 0, y: 0 }, effects = [];
  const heroSpot = w => ({ x: w.pin[0] - 46, y: w.pin[1] + 16 });          // feet position, left of the pin

  // ----- static backdrop: deep water, turquoise shallows round each island, cloud banks at the edges -----
  const water = pxCanvas(W, H), wc = water.getContext('2d'); wc.scale(A, A);
  wc.fillStyle = lin(wc, 0, 0, 0, map.height, [0, '#2a7fc4'], [0.18, '#1a8fc0'], [0.42, '#0f86ad'], [0.7, '#0a5a8c'], [1, '#07305d']); wc.fillRect(0, 0, map.width, map.height);
  const haze = (x, y, r, rgba) => { const g = wc.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba); g.addColorStop(1, rgba.replace(/[\d.]+\)$/, '0)')); wc.fillStyle = g; wc.fillRect(x - r, y - r, r * 2, r * 2); };
  haze(30, 40, 170, 'rgba(150,100,255,.30)'); haze(270, 20, 150, 'rgba(255,170,110,.22)'); haze(250, 380, 150, 'rgba(60,220,200,.22)'); haze(30, 520, 160, 'rgba(60,160,255,.24)');
  for (let i = 0; i < 70; i++) { const x = hash(i, 11) * map.width, y = hash(i, 12) * map.height, r = 10 + hash(i, 13) * 26; haze(x, y, r, `rgba(150,255,240,${0.05 + hash(i, 14) * 0.07})`); }
  for (let i = 0; i < 4; i++) { const x = 20 + i * 80; wc.fillStyle = lin(wc, x, 0, x + 70, 300, [0, 'rgba(255,255,255,.10)'], [1, 'rgba(255,255,255,0)']); wc.beginPath(); wc.moveTo(x, 0); wc.lineTo(x + 26, 0); wc.lineTo(x + 100, map.height * 0.62); wc.lineTo(x + 62, map.height * 0.62); wc.fill(); }
  worlds.forEach(w => { const g = wc.createRadialGradient(w.pin[0], w.pin[1] + 18, 20, w.pin[0], w.pin[1] + 18, 112); g.addColorStop(0, 'rgba(70,240,214,.62)'); g.addColorStop(.55, 'rgba(60,225,205,.22)'); g.addColorStop(1, 'rgba(45,212,191,0)'); wc.fillStyle = g; wc.fillRect(w.pin[0] - 120, w.pin[1] - 110, 240, 260); });
  const puff = (x, y, s, tone) => { [[0, 0, 22, 12], [-18, 5, 16, 9], [18, 5, 16, 9], [-6, -6, 14, 9], [8, -5, 12, 8]].forEach(([dx, dy, rx, ry]) => { wc.fillStyle = tone; wc.beginPath(); wc.ellipse(x + dx * s, y + dy * s, rx * s, ry * s, 0, 0, 7); wc.fill(); }); };
  [[8, 70, 1.5], [284, 160, 1.3], [4, 360, 1.2], [286, 410, 1.5], [10, 630, 1.4], [270, 672, 1.6], [150, 682, 1.3]].forEach(([x, y, s]) => { puff(x, y + 4, s, '#2b2a7a'); puff(x, y, s, '#4a4fb0'); puff(x - 3, y - 4 * s, s * 0.7, '#8a8fe6'); puff(x - 5, y - 6 * s, s * 0.4, '#ffc8e0'); });
  const vg = wc.createRadialGradient(map.width / 2, map.height / 2, map.height * 0.3, map.width / 2, map.height / 2, map.height * 0.78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(4,10,50,.4)'); wc.fillStyle = vg; wc.fillRect(0, 0, map.width, map.height);

  // ----- static layer: rope bridges, then islands back to front -----
  const rimDist = (ux, uy) => 1 / Math.sqrt((ux / RX) ** 2 + (uy / RY) ** 2);
  function bridge(c, a, b, open) {
    const dx = b.pin[0] - a.pin[0], dy = b.pin[1] - a.pin[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const d1 = rimDist(ux, uy) - 8, p = { x: a.pin[0] + ux * d1, y: a.pin[1] + uy * d1 + 6 }, q = { x: b.pin[0] - ux * d1, y: b.pin[1] - uy * d1 + 6 };
    const nx = -uy, ny = ux, sag = 9, at = (t, side = 0) => ({ x: p.x + (q.x - p.x) * t + nx * 7 * side, y: p.y + (q.y - p.y) * t + ny * 7 * side + Math.sin(Math.PI * t) * sag });
    for (const side of [-1, 1]) {
      c.strokeStyle = '#14202e'; c.lineWidth = 3.4; c.beginPath(); for (let i = 0; i <= 20; i++) { const s = at(i / 20, side); i ? c.lineTo(s.x, s.y - 6) : c.moveTo(s.x, s.y - 6); } c.stroke();
      c.strokeStyle = open ? '#d4ff3a' : '#8a6238'; c.lineWidth = 1.8; c.beginPath(); for (let i = 0; i <= 20; i++) { const s = at(i / 20, side); i ? c.lineTo(s.x, s.y - 6) : c.moveTo(s.x, s.y - 6); } c.stroke();
    }
    const n = Math.floor((len - 2 * d1) / 4.4);
    for (let i = 1; i < n; i++) {
      const t = i / n, s = at(t), s2 = at(Math.min(1, t + 0.01)), ang = Math.atan2(s2.y - s.y, s2.x - s.x);
      c.save(); c.translate(s.x, s.y); c.rotate(ang); c.fillStyle = i % 2 ? '#b07a43' : '#c8925a'; c.strokeStyle = '#4a2f17'; c.lineWidth = 0.9; c.fillRect(-1.8, -7.6, 3.6, 15.2); c.strokeRect(-1.8, -7.6, 3.6, 15.2); c.restore();
    }
    for (const t of [0, 1]) for (const side of [-1, 1]) { const s = at(t, side); c.fillStyle = '#6b4226'; c.strokeStyle = '#14202e'; c.lineWidth = 0.9; c.fillRect(s.x - 1.6, s.y - 10, 3.2, 12); c.strokeRect(s.x - 1.6, s.y - 10, 3.2, 12); c.fillStyle = open ? '#d4ff3a' : '#c8925a'; c.fillRect(s.x - 2, s.y - 11.4, 4, 2); }
  }
  function drawLayer() {
    const states = getState();
    lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, W, H); lctx.scale(A, A);
    for (let i = 0; i < worlds.length - 1; i++) bridge(lctx, worlds[i], worlds[i + 1], states[i].unlocked && states[i + 1].unlocked);
    effects = [];
    [...worlds].sort((a, b) => a.pin[1] - b.pin[1]).forEach(w => {
      const art = islandArt(w, !states[w.id - 1].unlocked);
      lctx.imageSmoothingEnabled = false; lctx.drawImage(art.cv, w.pin[0] - CX, w.pin[1] - CY, IW, IH);
      effects.push(...art.effects);
    });
  }

  // ----- DOM: callouts and tap targets over the canvas -----
  function buildPins() {
    pinsEl.innerHTML = '';
    for (const w of worlds) {
      const wrap = document.createElement('div'); wrap.className = 'map-pin'; wrap.dataset.world = w.id;
      wrap.style.left = (w.pin[0] / map.width * 100) + '%'; wrap.style.top = ((w.pin[1] - 46 - (w.calloutLift || 0)) / map.height * 100) + '%';
      wrap.style.setProperty('--accent', w.accent);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'map-pin__btn';
      b.innerHTML = `<span class="map-pin__call"><b>WORLD ${w.id}</b><span>${w.name}</span><small>${w.callout}</small></span>`;
      b.onclick = () => select(w.id);
      wrap.append(b); pinsEl.append(wrap);
      if (w.calloutLift) {   // a thin stem links a raised callout to its pin
        const stem = document.createElement('span'); stem.className = 'map-pin__stem';
        stem.style.cssText = `left:${w.pin[0] / map.width * 100}%;top:${(w.pin[1] - 46 - w.calloutLift) / map.height * 100}%;height:${w.calloutLift / map.height * 100}%;--accent:${w.accent}`;
        pinsEl.append(stem);
      }
    }
    refreshLabels();
  }
  function refreshLabels() {
    const states = getState();
    for (const w of worlds) {
      const st = states[w.id - 1], b = pinsEl.querySelector(`[data-world="${w.id}"] button`);
      b.dataset.locked = String(!st.unlocked); b.dataset.current = String(w.id === cur);
      b.setAttribute('aria-label', `World ${w.id}, ${w.name}. ${st.unlocked ? (st.earned ? 'Cleared.' : w.callout + '.') : 'Locked.'}`);
    }
  }
  function select(id) {
    if (walk) return;
    if (!getState()[id - 1].unlocked) { onSelect(id, false); return; }   // locked: show its card, don't travel
    if (id === cur) { onSelect(id, true); return; }
    walk = { pts: walkPath(cur, id).map(i => heroSpot(byId[i])), seg: 0, t: 0, id };
  }
  function update(dt) {
    if (!walk) return;
    const a = walk.pts[walk.seg], b = walk.pts[walk.seg + 1];
    if (!b) { cur = walk.id; hero = { ...heroSpot(byId[cur]) }; walk = null; refreshLabels(); onSelect(cur, true); return; }
    walk.t += dt * 150 / Math.hypot(b.x - a.x, b.y - a.y);
    if (walk.t >= 1) { walk.seg++; walk.t = 0; hero = { ...b }; return; }
    hero = { x: a.x + (b.x - a.x) * walk.t, y: a.y + (b.y - a.y) * walk.t };
  }

  // ----- per-frame animation -----
  const sparks = Array.from({ length: 60 }, (_, i) => [hash(i, 1) * map.width, hash(i, 2) * map.height, hash(i, 3)]);
  const boats = [{ x: 252, y: 588, ph: 0 }, { x: 246, y: 404, ph: 2 }, { x: 40, y: 294, ph: 4 }];
  const birds = [[0.0, 120, 0.7], [0.4, 450, 0.5], [0.7, 280, 0.6]];
  const glowAt = (x, y, r, rgb, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };

  function fx(t) {
    for (const e of effects) {
      if (e.type === 'fall') {
        ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 4; i++) ctx.fillRect(e.x + 1.6 + i * 2.6, e.y + ((t * 34 + i * 7) % e.h), 1.1, 5);
        ctx.fillStyle = `rgba(235,252,255,${0.45 + 0.2 * Math.sin(t * 5)})`; ctx.beginPath(); ctx.ellipse(e.x + e.w / 2, e.y + e.h, 9, 3, 0, 0, 7); ctx.fill();
      } else if (e.type === 'smoke') {
        for (let i = 0; i < 4; i++) { const ph = (t * 0.45 + i / 4) % 1; ctx.fillStyle = `rgba(238,246,255,${0.6 * (1 - ph)})`; ctx.beginPath(); ctx.arc(e.x + Math.sin(ph * 7 + i) * 2 + ph * 6, e.y - ph * 20, 1.6 + ph * 3.2, 0, 7); ctx.fill(); }
      } else if (e.type === 'window') {
        glowAt(e.x + e.w / 2, e.y + e.h / 2, 12, '255,214,120', 0.22 + 0.1 * Math.sin(t * 3 + e.x));
      } else if (e.type === 'orb') {
        const oy = e.y - 22; glowAt(e.x, e.y, 14, '94,234,212', 0.4 + 0.2 * Math.sin(t * 3));
        ctx.lineWidth = 0.9; [0, 1.047, 2.094].forEach((rot, i) => { ctx.strokeStyle = 'rgba(94,234,212,.85)'; ctx.beginPath(); ctx.ellipse(e.x, oy, 17, 5.6, rot, 0, 7); ctx.stroke(); const a = t * 2.2 + i * 2.1; const ex = Math.cos(a) * 17, ey = Math.sin(a) * 5.6; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(e.x + ex * Math.cos(rot) - ey * Math.sin(rot), oy + ex * Math.sin(rot) + ey * Math.cos(rot), 1.7, 0, 7); ctx.fill(); });
        ctx.fillStyle = '#d4ff3a'; ctx.beginPath(); ctx.arc(e.x, oy, 2.4, 0, 7); ctx.fill();
      } else if (e.type === 'neon') {
        const flick = Math.sin(t * 2.3) > 0.94 ? 0.08 : 0.3 + 0.1 * Math.sin(t * 9); glowAt(e.x + e.w / 2, e.y + e.h / 2, 38, '212,255,58', flick);
      } else if (e.type === 'glow') {
        glowAt(e.x, e.y, 20, e.c, 0.38 + 0.2 * Math.sin(t * 2.4 + e.x));
      } else if (e.type === 'snow') {
        ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 26; i++) { const x = e.x + ((hash(i, 5) * e.w + Math.sin(t + i) * 4 + e.w) % e.w), y = e.y + ((hash(i, 6) * e.h + t * (10 + hash(i, 7) * 8)) % e.h); ctx.fillRect(x, y, 1.4, 1.4); }
      }
    }
  }

  function draw(t) {
    ctx.setTransform(A, 0, 0, A, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(water, 0, 0, map.width, map.height);
    ctx.strokeStyle = 'rgba(160,230,255,.11)'; ctx.lineWidth = 1.4;
    for (let y = 12; y < map.height; y += 24) { ctx.beginPath(); for (let x = 0; x <= map.width; x += 8) { const yy = y + Math.sin(x * 0.07 + t * 1.2 + y) * 2; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); }
    for (const [x, y, ph] of sparks) if (Math.floor(t * 1.4 + ph * 6) % 3 === 0) { ctx.fillStyle = '#9ceaff'; ctx.fillRect(x, y, 3, 1); }
    const states = getState(), pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
    for (const w of worlds) {      // foam ring + soft shadow on the water
      ctx.fillStyle = 'rgba(2,14,32,.3)'; ctx.beginPath(); ctx.ellipse(w.pin[0] + 5, w.pin[1] + RY + CLIFF - 4, RX + 2, RY * 0.8, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(232,251,255,${0.3 + 0.2 * pulse})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(w.pin[0], w.pin[1] + CLIFF + 2, RX + 6 + pulse * 2, RY + 5 + pulse, 0, 0, 7); ctx.stroke();
    }
    boats.forEach(b => { const s = SC_BOAT(); ctx.drawImage(s, Math.round(b.x - 22), Math.round(b.y - 30 + Math.sin(t * 1.4 + b.ph) * 2), s.lw, s.lh); });
    ctx.drawImage(layer, 0, 0, map.width, map.height);
    fx(t);
    const bob = Math.round(Math.sin(t * 4) * 2);
    for (const w of worlds) {
      const st = states[w.id - 1], s = pinSprite(w, st);
      ctx.drawImage(s, w.pin[0] - 22, w.pin[1] - 42 - (st.unlocked && w.id === cur && !walk ? Math.abs(bob) : 0), 44, 54);
    }
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(Math.round(hero.x), Math.round(hero.y) + 1, 11, 3.2, 0, 0, 7); ctx.fill();
    drawAvatar(ctx, getAvatar(), hero.x - 16, hero.y - 41 - (walk ? Math.abs(Math.round(Math.sin(t * 14) * 2)) : 0), 1);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    birds.forEach(([x0, y, sp], i) => { const x = ((x0 * map.width + t * 14 * sp) % (map.width + 30)) - 15, f = Math.sin(t * 7 + i) * 2; ctx.beginPath(); ctx.moveTo(x - 4, y + f); ctx.lineTo(x, y + 2); ctx.lineTo(x + 4, y + f); ctx.stroke(); });
  }
  let boatSprite = null; const SC_BOAT = () => (boatSprite ??= SC.boat());

  let raf = 0, last = 0, acc = 0, running = false;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
    update(dt);
    if (acc >= 1 / 24 || walk) { draw(now / 1000); acc = 0; }
    raf = requestAnimationFrame(frame);
  }
  return {
    start() { hero = { ...heroSpot(byId[cur]) }; drawLayer(); refreshLabels(); if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } draw(0); },
    stop() { running = false; cancelAnimationFrame(raf); },
    rebuild() { drawLayer(); refreshLabels(); draw(performance.now() / 1000); },
    setCurrent(id) { cur = id; hero = { ...heroSpot(byId[id]) }; walk = null; refreshLabels(); },
    init() { buildPins(); },
    get current() { return cur; },
  };
}
