// Overworld map: six pixel-art islands joined by bridges, numbered pins, and the player's avatar walking the path.
// Everything is drawn in code on a small logical canvas (map.width × map.height) and scaled up crisply.
import { drawAvatar } from './avatar.js';
import { walkPath } from './progress.js';

const S = 3;                       // backing-store pixels per logical pixel
const RX = 24, RY = 11, CLIFF = 6; // island half-width, half-height, cliff depth
const PAL = {
  meadow:  { top: '#4fb35a', hi: '#69c96a', edge: '#8be07f', cliff: '#7a5a3a' },
  ruins:   { top: '#e3c27a', hi: '#efd59a', edge: '#f6e4b8', cliff: '#b8864a' },
  falls:   { top: '#3f9f5a', hi: '#58b873', edge: '#7fd592', cliff: '#6b6f7a' },
  peaks:   { top: '#8494a6', hi: '#9fb0c2', edge: '#c3d1df', cliff: '#4c5868' },
  glacier: { top: '#d6f3ff', hi: '#eefaff', edge: '#ffffff', cliff: '#7fb7e0' },
  diner:   { top: '#2fb3a8', hi: '#4fcfc2', edge: '#5eead4', cliff: '#0d5c63' },
};
const INK = '#231f20', FOAM = '#e8fbff', WATER = '#0b4f6c', WATER_HI = '#1478a0', SPARK = '#7fe3ff';

const hash = (a, b = 0, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const greyOf = hex => { const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const y = 0.3 * r + 0.59 * g + 0.11 * b; const m = v => Math.round(v * 0.25 + y * 0.75 * 0.8 + 18).toString(16).padStart(2, '0'); return '#' + m(r) + m(g) + m(b); };

export function createOverworld({ canvas, pinsEl, worlds, map, getState, getAvatar, onSelect }) {
  const ctx = canvas.getContext('2d');
  canvas.width = map.width * S; canvas.height = map.height * S;
  canvas.style.aspectRatio = `${map.width} / ${map.height}`;
  const layer = document.createElement('canvas'); layer.width = canvas.width; layer.height = canvas.height;
  const lctx = layer.getContext('2d');
  const byId = Object.fromEntries(worlds.map(w => [w.id, w]));
  let cur = 1, grey = false, walk = null, hero = { x: 0, y: 0 };

  const setCtx = c => { c.setTransform(S, 0, 0, S, 0, 0); c.imageSmoothingEnabled = false; };
  const P = (c, x, y, w, h, hex) => { c.fillStyle = grey ? greyOf(hex) : hex; c.fillRect(Math.round(x), Math.round(y), w, h); };
  const heroSpot = w => ({ x: w.pin[0] - 22, y: w.pin[1] + 6 });

  // ----- island bodies -----
  function island(c, w) {
    const p = PAL[w.biome], [cx, cy] = [w.pin[0], w.pin[1]];
    for (let x = cx - RX; x <= cx + RX; x++) {
      const u = (x - cx) / RX, k = Math.sqrt(Math.max(0, 1 - u * u));
      const jit = Math.round((hash(x, w.id) - 0.5) * 2);
      const yt = Math.round(cy - RY * k + jit), yb = Math.round(cy + RY * k + jit);
      P(c, x, yb, 1, CLIFF + Math.round(hash(x, w.id, 3) * 2), p.cliff);               // cliff
      P(c, x, yb + CLIFF + 2, 1, 1, FOAM);                                              // foam line
      P(c, x, yt, 1, yb - yt, hash(x, yt, w.id) > 0.82 ? p.hi : p.top);                 // surface
      P(c, x, yt, 1, 1, p.edge);                                                        // lit rim
    }
  }

  // ----- decorations (small sprites) -----
  const pine = (c, x, y) => { P(c, x, y, 1, 2, '#6b4226'); P(c, x - 2, y - 2, 5, 2, '#2f8f46'); P(c, x - 1, y - 4, 3, 2, '#3fae5a'); P(c, x, y - 5, 1, 1, '#3fae5a'); };
  const palm = (c, x, y) => { P(c, x, y - 4, 1, 5, '#8a5a2b'); P(c, x - 3, y - 5, 7, 1, '#3fae5a'); P(c, x - 2, y - 6, 5, 1, '#2f8f46'); P(c, x - 4, y - 4, 2, 1, '#2f8f46'); P(c, x + 3, y - 4, 2, 1, '#2f8f46'); };
  const rock = (c, x, y, col = '#6b7a8f') => { P(c, x, y, 4, 2, col); P(c, x + 1, y - 1, 2, 1, col); };

  // Buildings sit on the right half of each island, away from the centre pin and the avatar on the left.
  const DECOR = {
    meadow(c, cx, cy) {
      pine(c, cx - 18, cy + 1); pine(c, cx - 14, cy + 4); pine(c, cx + 11, cy + 5);
      P(c, cx + 9, cy - 9, 12, 6, '#c9a36a'); P(c, cx + 8, cy - 12, 14, 3, '#c0504d'); P(c, cx + 13, cy - 7, 2, 4, '#6b4226'); P(c, cx + 17, cy - 8, 2, 2, '#5eead4');
    },
    ruins(c, cx, cy) {
      palm(c, cx - 19, cy + 2); palm(c, cx - 12, cy + 5);
      P(c, cx + 8, cy - 9, 16, 6, '#c9a05a'); P(c, cx + 10, cy - 13, 12, 4, '#dcb86e'); P(c, cx + 13, cy - 16, 6, 3, '#c9a05a');
      P(c, cx + 9, cy - 9, 2, 6, '#8d6a35'); P(c, cx + 21, cy - 9, 2, 6, '#8d6a35'); P(c, cx + 14, cy - 8, 3, 5, '#3a2a14');
    },
    falls(c, cx, cy, t) {
      pine(c, cx - 18, cy); pine(c, cx - 14, cy + 4);
      const tiles = ['#e8a33d', '#2dd4bf', '#a78bfa', '#7bd05a', '#fc7a7a', '#8fd3ff'];
      for (let i = 0; i < 6; i++) P(c, cx + 9 + (i % 3) * 4, cy - 9 + Math.floor(i / 3) * 4, 3, 3, tiles[i]);
      for (let y = 0; y < 16; y++) P(c, cx + 13, cy + 9 + y, 3, 1, (y + Math.floor(t * 8)) % 3 ? '#9fe7ff' : '#e8fbff');
    },
    peaks(c, cx, cy) {
      const peak = (x, y, h) => { for (let r = 0; r < h; r++) P(c, x - r, y - h + r + 1, 1 + r * 2, 1, r < 2 ? '#f2f7fb' : '#6b7a8f'); };
      peak(cx - 16, cy + 3, 9); peak(cx - 9, cy + 5, 6);
      P(c, cx + 9, cy - 13, 12, 13, '#5d6c82'); for (let i = 0; i < 4; i++) P(c, cx + 9 + i * 4, cy - 15, 2, 2, '#5d6c82');
      P(c, cx + 14, cy - 4, 3, 4, '#1b2a3d'); P(c, cx + 11, cy - 9, 1, 2, '#d4ff3a'); P(c, cx + 18, cy - 9, 1, 2, '#d4ff3a');
    },
    glacier(c, cx, cy) {
      const spike = (x, y, h, col) => { for (let r = 0; r < h; r++) P(c, x - Math.floor((h - r) / 3), y - r, 1 + Math.floor((h - r) / 3) * 2, 1, col); };
      spike(cx - 17, cy + 3, 10, '#bfefff'); spike(cx - 12, cy + 4, 6, '#7fc8f0');
      P(c, cx + 8, cy - 9, 16, 9, '#a6dcf5'); P(c, cx + 10, cy - 12, 12, 3, '#d6f3ff'); P(c, cx + 13, cy - 5, 6, 5, '#1b4068');
    },
    diner(c, cx, cy) {
      P(c, cx + 8, cy - 8, 15, 9, '#eef6ff'); P(c, cx + 13, cy - 5, 3, 6, '#3a2a14'); P(c, cx + 18, cy - 6, 3, 3, '#5eead4');
      for (let i = 0; i < 5; i++) P(c, cx + 7 + i * 3, cy - 11, 3, 3, i % 2 ? '#eef6ff' : '#d4ff3a');
      P(c, cx + 9, cy - 16, 11, 4, '#0d1d33'); P(c, cx + 10, cy - 15, 9, 1, '#d4ff3a'); P(c, cx + 10, cy - 13, 5, 1, '#5eead4');
      rock(c, cx - 19, cy + 2, '#5eead4'); rock(c, cx - 14, cy + 5, '#bff7ef'); P(c, cx - 19, cy - 7, 3, 8, '#7fe3ff'); P(c, cx - 18, cy - 10, 1, 3, '#e8fbff');
    },
  };

  // ----- bridges and the dotted travel path -----
  function line(c, a, b, fn, step = 1) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / step;
    for (let i = 0; i <= n; i++) fn(a[0] + (b[0] - a[0]) * (i / n), a[1] + (b[1] - a[1]) * (i / n), i);
  }
  const bridgePoints = (a, b) => [[a.pin[0], a.pin[1] + 2], [b.pin[0], b.pin[1] + 2]];
  function bridges(c) {
    for (let i = 0; i < worlds.length - 1; i++) {
      const [p, q] = bridgePoints(worlds[i], worlds[i + 1]);
      line(c, p, q, (x, y, k) => { P(c, x - 1, y, 3, 2, k % 4 ? '#9a6b3a' : '#6b4226'); }, 1.5);
    }
  }
  function dots(c, states) {
    for (let i = 0; i < worlds.length - 1; i++) {
      const open = states[i + 1].unlocked && states[i].unlocked, [p, q] = bridgePoints(worlds[i], worlds[i + 1]);
      line(c, p, q, (x, y, k) => { if (k % 5 === 0) { P(c, x, y - 1, 2, 2, open ? '#d4ff3a' : '#c8d2dc'); } }, 1);
    }
  }

  // ----- pins (pixel digits) -----
  const DIGITS = { 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
    4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'], 6: ['.##', '#..', '###', '#.#', '###'] };
  function pin(c, w, st, lift) {
    const x = w.pin[0], y = w.pin[1] - 6 - lift, col = st.unlocked ? w.accent : '#8a97a5';
    const disc = (r, hex) => { for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(r * r - dy * dy)); P(c, x - hw, y + dy, hw * 2 + 1, 1, hex); } };
    disc(7, INK); P(c, x - 1, y + 7, 3, 3, INK); P(c, x, y + 10, 1, 1, INK);
    disc(5, col);
    (DIGITS[w.id] || DIGITS[1]).forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') P(c, x - 1 + i - 0, y - 2 + j, 1, 1, st.unlocked ? INK : '#2b3440'); }));
    if (st.earned) { P(c, x + 5, y - 9, 1, 3, '#d4ff3a'); P(c, x + 4, y - 8, 3, 1, '#d4ff3a'); }
  }

  // ----- static layer: bridges + islands + path (redrawn when progress changes) -----
  function drawLayer() {
    setCtx(lctx); lctx.clearRect(0, 0, map.width, map.height);
    const states = getState();
    grey = false; bridges(lctx);
    [...worlds].sort((a, b) => a.pin[1] - b.pin[1]).forEach(w => {
      const st = states[w.id - 1];
      grey = !st.unlocked; island(lctx, w); DECOR[w.biome](lctx, w.pin[0], w.pin[1], 0);
    });
    grey = false; dots(lctx, states);
  }

  // ----- DOM: callouts + tap targets over the canvas -----
  function buildPins() {
    pinsEl.innerHTML = '';
    for (const w of worlds) {
      const wrap = document.createElement('div'); wrap.className = 'map-pin'; wrap.dataset.world = w.id;
      wrap.style.left = (w.pin[0] / map.width * 100) + '%'; wrap.style.top = ((w.pin[1] - 18) / map.height * 100) + '%';
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
    const pts = walkPath(cur, id).map(i => heroSpot(byId[i]));
    walk = { pts, seg: 0, t: 0, id };
  }

  function update(dt) {
    if (!walk) return;
    const a = walk.pts[walk.seg], b = walk.pts[walk.seg + 1];
    if (!b) { cur = walk.id; hero = { ...heroSpot(byId[cur]) }; walk = null; refreshLabels(); onSelect(cur, true); return; }
    const d = Math.hypot(b.x - a.x, b.y - a.y); walk.t += dt * 90 / d;
    if (walk.t >= 1) { walk.seg++; walk.t = 0; hero = { ...b }; return; }
    hero = { x: a.x + (b.x - a.x) * walk.t, y: a.y + (b.y - a.y) * walk.t };
  }

  const sparks = Array.from({ length: 70 }, (_, i) => [Math.floor(hash(i, 1) * map.width), Math.floor(hash(i, 2) * map.height), hash(i, 3)]);
  const clouds = [[10, 14, 18], [96, 120, 14], [30, 198, 12]];

  function draw(t) {
    setCtx(ctx);
    ctx.fillStyle = WATER; ctx.fillRect(0, 0, map.width, map.height);
    for (const [x, y, ph] of sparks) { const on = (Math.floor(t * 1.5 + ph * 6) % 3) === 0; ctx.fillStyle = on ? SPARK : WATER_HI; ctx.fillRect(x, y, on ? 2 : 3, 1); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(layer, 0, 0); setCtx(ctx);
    const states = getState(), bob = Math.floor(t * 3) % 2;
    grey = false;
    // animate the waterfall by redrawing its strip over the static layer
    const w3 = byId[3]; if (w3) { grey = !states[2].unlocked; DECOR.falls(ctx, w3.pin[0], w3.pin[1], t); }
    grey = false;
    for (const w of worlds) { const st = states[w.id - 1]; pin(ctx, w, st, st.unlocked && w.id === cur ? bob * 2 : 0); }
    // hero
    grey = false;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(Math.round(hero.x) + 2, Math.round(hero.y) + 1, 12, 2);
    drawAvatar(ctx, getAvatar(), Math.round(hero.x), Math.round(hero.y) - 19 - (walk ? Math.floor(t * 8) % 2 : bob), 1);
    // clouds drifting (decorative)
    ctx.fillStyle = 'rgba(232,251,255,.16)';
    for (const [x, y, w] of clouds) { const cx = ((x + t * 2) % (map.width + 40)) - 20; ctx.fillRect(Math.round(cx), y, w, 3); ctx.fillRect(Math.round(cx) + 3, y - 2, w - 6, 2); }
  }

  let raf = 0, last = 0, acc = 0, running = false;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
    update(dt);
    if (acc >= 1 / 20 || walk) { draw(now / 1000); acc = 0; }
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
