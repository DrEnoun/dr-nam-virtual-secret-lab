// Overworld map (16-bit look): six shaded islands joined by rope bridges, glossy numbered pins, and the player's avatar
// walking the path. Shapes are drawn smooth, then "crisped" into hard pixels with outlines (see pxart.js).
import { drawAvatar } from './avatar.js';
import { walkPath } from './progress.js';
import { pxCanvas, crisp, greyscale, shapes, shade, tint, mix } from './pxart.js';

const S = 2;                         // backing-store pixels per logical pixel
const RX = 46, RY = 20, CLIFF = 14;  // island half-width, half-height, cliff depth
const IW = 120, IH = 108, CX = 60, CY = 52;   // island sprite size and where its centre sits
const OUT = '#0a2236';

const PAL = {
  meadow:  { top: '#4fb35a', hi: '#7fdc78', sh: '#37904a', edge: '#a6ec8d', cliff: '#8a6a45' },
  ruins:   { top: '#e3c27a', hi: '#f6dfa4', sh: '#c79d57', edge: '#fff0c4', cliff: '#b8864a' },
  falls:   { top: '#3f9f5a', hi: '#72cf86', sh: '#2c7a48', edge: '#9de8a8', cliff: '#6d7684' },
  peaks:   { top: '#8798ab', hi: '#b4c3d3', sh: '#667789', edge: '#d9e4ef', cliff: '#4f5c6e' },
  glacier: { top: '#d3f1ff', hi: '#ffffff', sh: '#a5d3ec', edge: '#ffffff', cliff: '#7fb7e0' },
  diner:   { top: '#2fb3a8', hi: '#6ae6d8', sh: '#1d8a85', edge: '#a8fff2', cliff: '#0d5c63' },
};

const hash = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------- small sprites (each is outlined on its own so buildings read against the ground) ----------
const spr = (w, h, fn) => { const cv = pxCanvas(w, h), c = cv.getContext('2d'); fn(c, shapes(c)); return crisp(cv, '#14202e'); };

const pine = () => spr(20, 28, (c, { R, P }) => {
  R(8.5, 22, 3, 5, 1, '#6b4226');
  P([[10, 12], [2.5, 24], [17.5, 24]], '#2f8f46'); P([[10, 7], [4, 17], [16, 17]], '#3fae5a'); P([[10, 1.5], [5.5, 11], [14.5, 11]], '#5cc873');
  P([[10, 1.5], [5.5, 11], [10, 11]], 'rgba(255,255,255,.18)', false);
});
const palm = () => spr(30, 34, (c, { E }) => {
  c.strokeStyle = '#6b4226'; c.lineWidth = 4.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(14, 32); c.quadraticCurveTo(18, 20, 15, 9); c.stroke();
  c.strokeStyle = '#8a5a2b'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(14, 32); c.quadraticCurveTo(18, 20, 15, 9); c.stroke();
  [[-2.7, '#2f8f46'], [-2.0, '#3fae5a'], [-0.7, '#2f8f46'], [-3.6, '#3fae5a'], [0.4, '#3fae5a']].forEach(([a, col]) => {
    E(15 + Math.cos(a) * 6.5, 9 + Math.sin(a) * 3.4 + 1, 7.5, 2.4, col, true, a * 0.8);
  });
  E(15, 10, 2, 2, '#6b4226');
});
const bush = () => spr(18, 10, (c, { E }) => { E(6, 6, 5.5, 3.6, '#3fae5a'); E(12, 6.4, 5, 3.4, '#2f8f46'); E(7, 4.6, 2, 1.1, '#7fdc78', false); });
const hut = () => spr(40, 36, (c, { R, P, E }) => {
  R(6, 17, 28, 17, 1.5, '#e0b97f'); R(25, 17, 9, 17, 1.5, '#c99d62');
  R(27, 4, 4.4, 9, 1, '#8f8f9a');
  P([[2, 18.5], [20, 3], [38, 18.5]], '#c0504d'); P([[20, 3], [38, 18.5], [30, 18.5]], '#9f3d3b'); P([[2, 18.5], [9, 18.5], [20, 5.5]], '#dd7673', false);
  R(10, 24, 7.5, 10, 3.2, '#6b4226'); E(15.5, 29, 0.8, 0.8, '#d4ff3a', false);
  R(21, 22, 8, 7, 1.5, '#5eead4'); c.strokeStyle = '#14202e'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(25, 22); c.lineTo(25, 29); c.moveTo(21, 25.5); c.lineTo(29, 25.5); c.stroke();
});
const temple = () => spr(48, 42, (c, { R, P }) => {
  R(2, 34, 44, 6, 1, '#d6b06a'); R(5, 29, 38, 6, 1, '#e8c984');
  [8, 17.5, 27, 36.5].forEach(x => { R(x, 13, 4.4, 17, 1, '#f4dca0'); R(x + 2.6, 13, 1.8, 17, 0.5, '#d1ab62', false); });
  R(5, 8, 38, 6, 1.5, '#c9a05a'); P([[9, 8.4], [24, 0.6], [39, 8.4]], '#b8864a');
  R(19.5, 19, 9, 11, 4.4, '#2b1d0e'); R(22.5, 23, 3, 3, 1.4, '#d4ff3a', false);
});
const tileSign = () => spr(34, 30, (c, { R }) => {
  R(15.5, 14, 3, 15, 1, '#6b4226');
  R(2, 1.5, 30, 18, 3.5, '#0d1d33', '#d4ff3a');
  ['#e8a33d', '#2dd4bf', '#a78bfa', '#7bd05a', '#fc7a7a', '#8fd3ff'].forEach((col, i) => R(5 + (i % 3) * 9, 4.5 + Math.floor(i / 3) * 7, 7, 6, 1.4, col));
});
const mountain = (w = 36, h = 30) => spr(w, h, (c, { P }) => {
  P([[1, h - 1], [w * 0.42, 3], [w - 1, h - 1]], '#8394a8'); P([[w * 0.42, 3], [w - 1, h - 1], [w * 0.62, h - 1]], '#5d6c82');
  P([[w * 0.42, 3], [w * 0.27, 13], [w * 0.4, 10.5], [w * 0.5, 14], [w * 0.6, 9]], '#f6fbff');
});
const castle = () => spr(36, 44, (c, { R, P }) => {
  R(5, 18, 26, 25, 1, '#6c7d94'); R(22, 18, 9, 25, 1, '#56667c');
  [[1, 9], [26, 9]].forEach(([x, y]) => { R(x, y, 9, 34, 1, '#7b8ca3'); for (let i = 0; i < 3; i++) R(x + i * 3.4, y - 3.4, 2.2, 3.6, 0.4, '#7b8ca3'); });
  R(14, 29, 8, 14, 4, '#14202e'); R(3.6, 17, 3.6, 5, 1, '#d4ff3a', false); R(28.8, 17, 3.6, 5, 1, '#d4ff3a', false);
  R(17.4, 0, 1.4, 9, 0.5, '#3a2a14', false); P([[18.8, 0.6], [26, 3], [18.8, 5.6]], '#d4ff3a');
});
const shard = (h, base, light) => spr(18, h + 2, (c, { P }) => {
  P([[1, h + 1], [9, 1], [17, h + 1]], base); P([[9, 1], [17, h + 1], [10.5, h + 1]], shade(base, 0.2)); P([[9, 1], [1, h + 1], [6.5, h + 1]], light, false);
});
const iceHall = () => spr(42, 36, (c, { E, R }) => {
  c.beginPath(); c.ellipse(21, 32, 19, 28, 0, Math.PI, 0); c.closePath(); c.fillStyle = '#a6dcf5'; c.fill(); c.strokeStyle = '#4f93bd'; c.lineWidth = 0.9; c.stroke();
  c.beginPath(); c.ellipse(21, 32, 19, 28, 0, Math.PI * 1.05, Math.PI * 1.55); c.lineTo(21, 32); c.fillStyle = 'rgba(255,255,255,.4)'; c.fill();
  R(2, 31, 38, 4, 1, '#d6f3ff'); R(15, 17, 12, 15, 6, '#1b4068'); E(21, 26, 1.1, 1.1, '#5eead4', false);
});
const diner = () => spr(48, 50, (c, { R, P, E }) => {
  R(4, 22, 40, 26, 1.5, '#eef6ff'); R(36, 22, 8, 26, 1.5, '#c9d8e8'); R(4, 43, 40, 5, 1, '#9db4cc');
  for (let i = 0; i < 7; i++) P([[2 + i * 6.3, 24], [2 + (i + 1) * 6.3, 24], [4 + (i + 1) * 5.9, 14], [4 + i * 5.9, 14]], i % 2 ? '#fdfefe' : '#d4ff3a', '#6f7f00');
  R(8, 28, 16, 12, 2, '#5eead4', '#0d5c63'); P([[10, 39], [16, 29.5], [19, 29.5], [13, 39]], 'rgba(255,255,255,.5)', false);
  R(28, 28, 10, 20, 2, '#3a2a14'); E(35, 38, 0.9, 0.9, '#d4ff3a', false); R(30.4, 31, 5.2, 6, 1, '#7fe3ff', false);
  R(7, 0.8, 34, 11.5, 3, '#0d1d33', '#d4ff3a'); c.fillStyle = '#d4ff3a'; c.font = '800 10px "League Spartan", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('DINER', 24, 7.2);
});
const crystals = () => spr(26, 24, (c, { P }) => {
  P([[2, 23], [7, 6], [12, 23]], '#5eead4'); P([[7, 6], [12, 23], [8.6, 23]], '#2fb3a8'); P([[11, 23], [17, 11], [24, 23]], '#bff7ef'); P([[17, 11], [24, 23], [19, 23]], '#7fe3ff');
});

const SPRITES = {};
const getSprite = (k, make) => (SPRITES[k] ??= make());

// ---------- island body ----------
function drawIsland(c, w) {
  const p = PAL[w.biome], { E, R } = shapes(c);
  c.save();
  // cliff face
  c.beginPath(); c.moveTo(CX - RX, CY); c.lineTo(CX - RX, CY + CLIFF); c.ellipse(CX, CY + CLIFF, RX, RY, 0, Math.PI, 0, true); c.lineTo(CX + RX, CY); c.closePath();
  c.fillStyle = p.cliff; c.fill(); c.clip();
  const g = c.createLinearGradient(CX - RX, 0, CX + RX, 0); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.38)');
  c.fillStyle = g; c.fillRect(0, 0, IW, IH);
  c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 1.2;
  for (let k = 1; k <= 3; k++) { c.beginPath(); c.ellipse(CX, CY + CLIFF * (k / 3.4), RX, RY, 0, 0.05 * Math.PI, 0.95 * Math.PI); c.stroke(); }
  for (let i = 0; i < 12; i++) { const x = CX - RX + 6 + hash(i, w.id) * (RX * 2 - 12), y0 = CY + 6 + hash(i, 9) * 14; c.beginPath(); c.moveTo(x, y0); c.lineTo(x + (hash(i, 4) - .5) * 3, y0 + 5 + hash(i, 5) * 6); c.stroke(); }
  c.restore();
  // top surface
  E(CX, CY, RX, RY, p.top, false);
  c.save(); c.beginPath(); c.ellipse(CX, CY, RX, RY, 0, 0, Math.PI * 2); c.clip();
  E(CX - 10, CY - 5, RX * 0.78, RY * 0.62, p.hi, false); E(CX - 14, CY - 8, RX * 0.46, RY * 0.36, tint(p.hi, 0.3), false);
  c.strokeStyle = p.sh; c.lineWidth = 6; c.beginPath(); c.ellipse(CX, CY - 1, RX - 1, RY - 1, 0, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
  c.fillStyle = p.sh;
  for (let i = 0; i < 16; i++) { const a = hash(i, w.id) * Math.PI * 2, r = 0.25 + hash(i, 2) * 0.65; c.fillRect(Math.round(CX + Math.cos(a) * RX * r), Math.round(CY + Math.sin(a) * RY * r), 2, 1); }
  c.restore();
  c.strokeStyle = p.edge; c.lineWidth = 1.6; c.beginPath(); c.ellipse(CX, CY, RX - 0.4, RY - 0.4, 0, Math.PI * 1.02, Math.PI * 1.98); c.stroke();
}

// Where each building and tree goes: [sprite, x offset, y offset] with the sprite's bottom-centre as the anchor.
const SCENERY = {
  meadow:  [['pine', -34, 8], ['pine', -26, 14], ['bush', -12, 15], ['hut', 28, 5], ['pine', 38, 12]],
  ruins:   [['palm', -34, 10], ['palm', -22, 15], ['temple', 28, 6]],
  falls:   [['pine', -34, 8], ['pine', -26, 14], ['sign', 28, 5], ['bush', 36, 14]],
  peaks:   [['mtnL', -30, 9], ['mtnS', -14, 15], ['castle', 28, 7]],
  glacier: [['shardL', -32, 10], ['shardS', -20, 15], ['ice', 28, 7]],
  diner:   [['crys', -30, 12], ['crysS', -18, 17], ['diner', 27, 8]],
};
const MAKE = {
  pine, palm, bush, hut, temple, sign: tileSign, castle, ice: iceHall, diner, crys: crystals, crysS: () => spr(14, 14, (c, { P }) => { P([[1, 13], [6, 2], [12, 13]], '#bff7ef'); P([[6, 2], [12, 13], [8.4, 13]], '#7fe3ff'); }),
  mtnL: () => mountain(38, 32), mtnS: () => mountain(24, 20),
  shardL: () => shard(24, '#bfefff', '#e8fbff'), shardS: () => shard(14, '#9fd8f5', '#d6f3ff'),
};

const islandCache = {};
function islandSprite(w, locked) {
  const key = w.id + (locked ? 'x' : '');
  if (islandCache[key]) return islandCache[key];
  const cv = pxCanvas(IW, IH), c = cv.getContext('2d');
  drawIsland(c, w);
  if (w.biome === 'falls') {   // waterfall off the front edge
    const g = c.createLinearGradient(0, CY + 10, 0, CY + CLIFF + RY * 0.95); g.addColorStop(0, '#e8fbff'); g.addColorStop(1, '#7fd8f5');
    c.fillStyle = g; c.beginPath(); c.roundRect(CX + 4, CY + 11, 9, CLIFF + RY * 0.82 - 5, 3); c.fill();
    c.fillStyle = 'rgba(255,255,255,.75)'; [CX + 6, CX + 10].forEach(x => c.fillRect(x, CY + 14, 1.4, 18));
  }
  for (const [name, dx, dy] of SCENERY[w.biome]) {
    const s = getSprite(name, MAKE[name]);
    c.drawImage(s, Math.round(CX + dx - s.width / 2), Math.round(CY + dy - s.height));
  }
  crisp(cv, OUT);
  if (locked) greyscale(cv);
  return (islandCache[key] = cv);
}

// ---------- pins ----------
const pinCache = {};
function pinSprite(w, st) {
  const key = `${w.id}-${st.unlocked}-${st.earned}`;
  if (pinCache[key]) return pinCache[key];
  const cv = pxCanvas(40, 50), c = cv.getContext('2d'), { P } = shapes(c);
  const col = st.unlocked ? w.accent : '#8a97a5';
  c.fillStyle = col; c.beginPath(); c.arc(20, 17, 15, 0, Math.PI * 2); c.fill();
  P([[8.5, 26], [20, 47], [31.5, 26]], col, false);
  const hi = c.createRadialGradient(14, 10, 1, 20, 17, 17); hi.addColorStop(0, 'rgba(255,255,255,.65)'); hi.addColorStop(.55, 'rgba(255,255,255,0)'); hi.addColorStop(1, 'rgba(0,0,0,.22)');
  c.fillStyle = hi; c.beginPath(); c.arc(20, 17, 15, 0, Math.PI * 2); c.fill();
  c.fillStyle = st.unlocked ? mix(col, '#ffffff', 0.78) : '#c9d2dc'; c.beginPath(); c.arc(20, 17, 9.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = st.unlocked ? '#14202e' : '#4a5663'; c.font = '800 17px "League Spartan", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(w.id), 20, 18.4);
  if (st.earned) P([[34, 3], [35.6, 7], [40, 7.2], [36.6, 9.8], [37.8, 14], [34, 11.6], [30.2, 14], [31.4, 9.8], [28, 7.2], [32.4, 7]], '#d4ff3a', '#6f7f00');
  crisp(cv, '#14202e');
  return (pinCache[key] = cv);
}

export function createOverworld({ canvas, pinsEl, worlds, map, getState, getAvatar, onSelect }) {
  const ctx = canvas.getContext('2d');
  canvas.width = map.width * S; canvas.height = map.height * S;
  canvas.style.aspectRatio = `${map.width} / ${map.height}`;
  const layer = pxCanvas(map.width, map.height), lctx = layer.getContext('2d');
  const byId = Object.fromEntries(worlds.map(w => [w.id, w]));
  let cur = 1, walk = null, hero = { x: 0, y: 0 };
  const heroSpot = w => ({ x: w.pin[0] - 30, y: w.pin[1] + 12 });   // feet position, left of the pin

  // water backdrop (static)
  const water = pxCanvas(map.width, map.height), wc = water.getContext('2d');
  const wg = wc.createLinearGradient(0, 0, 0, map.height); wg.addColorStop(0, '#10728f'); wg.addColorStop(.5, '#0b5577'); wg.addColorStop(1, '#093350');
  wc.fillStyle = wg; wc.fillRect(0, 0, map.width, map.height);
  const vg = wc.createRadialGradient(map.width / 2, map.height / 2, map.height * 0.25, map.width / 2, map.height / 2, map.height * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,12,28,.4)');
  wc.fillStyle = vg; wc.fillRect(0, 0, map.width, map.height);

  const pts = (a, b) => [[a.pin[0], a.pin[1] + 12], [b.pin[0], b.pin[1] + 12]];

  function drawLayer() {
    lctx.clearRect(0, 0, map.width, map.height);
    const states = getState();
    // rope bridges
    for (let i = 0; i < worlds.length - 1; i++) {
      const [p, q] = pts(worlds[i], worlds[i + 1]), ang = Math.atan2(q[1] - p[1], q[0] - p[0]), len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      lctx.save(); lctx.translate(p[0], p[1]); lctx.rotate(ang);
      const open = states[i].unlocked && states[i + 1].unlocked;
      lctx.strokeStyle = '#14202e'; lctx.lineWidth = 4; lctx.beginPath(); lctx.moveTo(0, -7); lctx.lineTo(len, -7); lctx.moveTo(0, 7); lctx.lineTo(len, 7); lctx.stroke();
      lctx.strokeStyle = open ? '#d4ff3a' : '#6b4a2a'; lctx.lineWidth = 2; lctx.beginPath(); lctx.moveTo(0, -7); lctx.lineTo(len, -7); lctx.moveTo(0, 7); lctx.lineTo(len, 7); lctx.stroke();
      for (let t = 6; t < len - 4; t += 6.5) { lctx.fillStyle = (t / 6.5) % 2 ? '#b07a43' : '#c28c52'; lctx.strokeStyle = '#4a2f17'; lctx.lineWidth = 1; lctx.fillRect(t, -7, 5, 14); lctx.strokeRect(t, -7, 5, 14); }
      lctx.restore();
    }
    // islands, back to front
    [...worlds].sort((a, b) => a.pin[1] - b.pin[1]).forEach(w => {
      lctx.drawImage(islandSprite(w, !states[w.id - 1].unlocked), w.pin[0] - CX, w.pin[1] - CY);
    });
  }

  // ----- DOM: callouts and tap targets over the canvas -----
  function buildPins() {
    pinsEl.innerHTML = '';
    for (const w of worlds) {
      const wrap = document.createElement('div'); wrap.className = 'map-pin'; wrap.dataset.world = w.id;
      wrap.style.left = (w.pin[0] / map.width * 100) + '%'; wrap.style.top = ((w.pin[1] - 40) / map.height * 100) + '%';
      wrap.style.setProperty('--accent', w.accent);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'map-pin__btn';
      b.innerHTML = `<span class="map-pin__call"><b>WORLD ${w.id}</b><span>${w.name}</span><small>${w.callout}</small></span>`;
      b.onclick = () => select(w.id);
      wrap.append(b); pinsEl.append(wrap);
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

  const sparks = Array.from({ length: 46 }, (_, i) => [hash(i, 1) * map.width, hash(i, 2) * map.height, hash(i, 3)]);
  const clouds = [[10, 30, 46], [180, 250, 38], [60, 430, 34]];

  function draw(t) {
    ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(water, 0, 0);
    // gentle wave lines
    ctx.strokeStyle = 'rgba(160,230,255,.13)'; ctx.lineWidth = 1.4;
    for (let y = 14; y < map.height; y += 26) {
      ctx.beginPath();
      for (let x = 0; x <= map.width; x += 8) { const yy = y + Math.sin(x * 0.07 + t * 1.2 + y) * 2; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
      ctx.stroke();
    }
    for (const [x, y, ph] of sparks) { if (Math.floor(t * 1.4 + ph * 6) % 3 === 0) { ctx.fillStyle = '#9ceaff'; ctx.fillRect(Math.round(x), Math.round(y), 3, 1); } }
    // foam rings round each island
    const states = getState(), pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
    for (const w of worlds) {
      ctx.strokeStyle = `rgba(232,251,255,${0.28 + 0.2 * pulse})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(w.pin[0], w.pin[1] + CLIFF + 2, RX + 5 + pulse * 2, RY + 4 + pulse, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(2,14,32,.28)'; ctx.beginPath(); ctx.ellipse(w.pin[0] + 5, w.pin[1] + CLIFF + 10, RX + 2, RY * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.drawImage(layer, 0, 0);
    const bob = Math.round(Math.sin(t * 4) * 2);
    for (const w of worlds) {
      const st = states[w.id - 1], s = pinSprite(w, st);
      ctx.drawImage(s, w.pin[0] - 20, w.pin[1] - 38 - (st.unlocked && w.id === cur && !walk ? Math.abs(bob) : 0));
    }
    // hero: soft shadow, then the avatar (bobs while walking)
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(Math.round(hero.x), Math.round(hero.y) + 1, 11, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    drawAvatar(ctx, getAvatar(), hero.x - 16, hero.y - 41 - (walk ? Math.abs(Math.round(Math.sin(t * 14) * 2)) : 0), 1);
    // drifting clouds (decorative)
    ctx.fillStyle = 'rgba(232,251,255,.14)';
    for (const [x, y, w] of clouds) { const cx = ((x + t * 3) % (map.width + 80)) - 40; ctx.beginPath(); ctx.ellipse(cx, y, w / 2, 6, 0, 0, 7); ctx.ellipse(cx + 8, y - 5, w / 3, 5, 0, 0, 7); ctx.fill(); }
  }

  let raf = 0, last = 0, acc = 0, running = false;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
    update(dt);
    if (acc >= 1 / 24 || walk) { draw(now / 1000); acc = 0; }
    raf = requestAnimationFrame(frame);
  }

  return {
    start() {
      hero = { ...heroSpot(byId[cur]) };
      drawLayer(); refreshLabels();
      if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      draw(0);
    },
    stop() { running = false; cancelAnimationFrame(raf); },
    rebuild() { drawLayer(); refreshLabels(); draw(performance.now() / 1000); },
    setCurrent(id) { cur = id; hero = { ...heroSpot(byId[id]) }; walk = null; refreshLabels(); },
    init() { buildPins(); },
    get current() { return cur; },
  };
}
