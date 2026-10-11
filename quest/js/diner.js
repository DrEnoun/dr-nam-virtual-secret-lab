// DR NAM’s CHEMQUEST — World 6: Ion Diner (Diner Dash prototype).
// Content lives in data/diner.json; rules in diner-logic.js; the avatar in avatar.js.
import { sound } from '../../js/sound.js';
import {
  buildOrders, buildTray, checkServe, ionHTML, netCharge, orderName, revealAnswer, starsFor, tipFor, chargeStr,
} from './diner-logic.js';
import { OPTIONS, STYLE_LABEL, DEFAULT_AVATAR, drawAvatar, randomAvatar } from './avatar.js';

const $ = id => document.getElementById(id);
const KEY = 'drnam-quest:v1';
const LOGO = '../brand/logos/chemistry-with-dr-nam-logo.jpg';

// ---------- Saved progress (localStorage may be blocked, so every access is guarded) ----------
const defaults = () => ({ coins: 0, xp: 0, stars: {}, avatar: { ...DEFAULT_AVATAR }, theme: 'night', mute: false });
let save = defaults();
try { save = { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* use defaults */ }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };
sound.enabled = !save.mute;

const data = await (await fetch('data/diner.json')).json();
const ionById = Object.fromEntries(data.ions.map(i => [i.id, i]));

// ---------- Screens, theme and sound ----------
const screens = ['menu', 'avatar', 'game'];
function show(name) {
  screens.forEach(s => { $('screen-' + s).hidden = s !== name; });
  window.scrollTo(0, 0);
}
function applyTheme() {
  document.documentElement.dataset.theme = save.theme;
  $('btn-theme-menu').textContent = save.theme === 'day' ? 'Night mode' : 'Day mode';
}
function applySound() {
  const label = sound.enabled ? 'Sound on' : 'Muted';
  $('btn-sound').textContent = label; $('btn-sound-menu').textContent = label;
}
const toggleSound = () => { sound.enabled = !sound.enabled; save.mute = !sound.enabled; persist(); applySound(); sound.unlock(); sound.select(); };
$('btn-sound').onclick = $('btn-sound-menu').onclick = toggleSound;
$('btn-theme-menu').onclick = () => { save.theme = save.theme === 'day' ? 'night' : 'day'; persist(); applyTheme(); };

// ---------- Dr. NAM Says bubble (uses her real badge, never a drawn likeness) ----------
function says(el, { text, state = '', status = '', fact = '' }) {
  el.innerHTML = '';
  const av = document.createElement('div'); av.className = 'says__avatar';
  const img = document.createElement('img'); img.src = LOGO; img.alt = ''; av.append(img);
  const b = document.createElement('div'); b.className = 'says__bubble'; b.dataset.state = state;
  const name = document.createElement('p'); name.className = 'says__name'; name.textContent = 'Dr. NAM says';
  const t = document.createElement('p'); t.className = 'says__text';
  if (status) { const s = document.createElement('span'); s.className = 'says__status'; s.textContent = status + ' '; t.append(s); }
  t.append(document.createTextNode(text));
  b.append(name, t);
  if (fact) { const f = document.createElement('p'); f.className = 'says__fact'; f.textContent = fact; b.append(f); }
  el.append(av, b);
}

// ---------- Menu ----------
function drawPortrait(canvas, opts, scale) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  drawAvatar(c, opts, 0, 0, scale);
}
const starString = n => '★'.repeat(n) + '☆'.repeat(3 - n);

function renderMenu() {
  drawPortrait($('menu-avatar'), save.avatar, 4);
  $('menu-coins').textContent = save.coins; $('menu-xp').textContent = save.xp;
  const list = $('level-list'); list.innerHTML = '';
  for (const lv of data.levels) {
    const unlocked = lv.id === 1 || (save.stars[lv.id - 1] || 0) > 0;
    const b = document.createElement('button');
    b.className = 'sticker level-card'; b.type = 'button'; b.disabled = !unlocked;
    const stars = save.stars[lv.id] || 0;
    b.innerHTML = `<span class="level-card__num">${unlocked ? lv.id : '🔒'}</span>
      <span class="level-card__title">${lv.title}</span>
      <span class="level-card__sub">${unlocked ? lv.subtitle : 'Clear the previous shift to unlock'}</span>
      <span class="level-card__stars" aria-label="${stars} of 3 stars">${starString(stars)}</span>`;
    if (unlocked) b.onclick = () => { sound.unlock(); sound.select(); startLevel(lv.id); };
    list.append(b);
  }
  says($('menu-says'), { text: 'Welcome to the Ion Diner! Why do ionic compounds have zero net charge? Serve a few customers and find out.' });
  applyTheme(); applySound();
}

// ---------- Avatar creator ----------
let draft = null;
function renderAvatarEditor() {
  drawPortrait($('avatar-preview'), draft, 8);
  const host = $('avatar-options'); host.innerHTML = '';
  const group = (title, items) => {
    const g = document.createElement('div'); g.className = 'opt-group';
    g.innerHTML = `<h3>${title}</h3>`;
    const row = document.createElement('div'); row.className = 'opt-row'; row.setAttribute('role', 'radiogroup'); row.setAttribute('aria-label', title);
    items.forEach(it => row.append(it)); g.append(row); host.append(g);
  };
  const swatch = (key, i, colour, label) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'swatch'; b.style.background = colour;
    b.setAttribute('role', 'radio'); b.setAttribute('aria-label', label); b.setAttribute('aria-checked', String(draft[key] === i));
    b.onclick = () => { draft[key] = i; sound.pop(); renderAvatarEditor(); };
    return b;
  };
  const chip = (label, on, set) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'opt-chip'; b.textContent = label;
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(on));
    b.onclick = () => { set(); sound.pop(); renderAvatarEditor(); };
    return b;
  };
  group('Skin tone', OPTIONS.skin.map((c, i) => swatch('skin', i, c, `Skin tone ${i + 1}`)));
  group('Hair style', OPTIONS.hairStyle.map(s => chip(STYLE_LABEL[s], draft.hairStyle === s, () => { draft.hairStyle = s; })));
  group('Hair or tudung colour', OPTIONS.hair.map((c, i) => swatch('hair', i, c, `Colour ${i + 1}`)));
  group('Lab coat', OPTIONS.coat.map((c, i) => swatch('coat', i, c, `Lab coat colour ${i + 1}`)));
  group('Safety goggles', [chip('On', draft.goggles, () => { draft.goggles = true; }), chip('Off', !draft.goggles, () => { draft.goggles = false; })]);
}
$('btn-avatar').onclick = () => { draft = { ...save.avatar }; renderAvatarEditor(); show('avatar'); };
$('avatar-random').onclick = () => { draft = randomAvatar(Math.random, { goggles: draft.goggles }); sound.pop(); renderAvatarEditor(); };
$('avatar-done').onclick = () => { save.avatar = draft; persist(); sound.correct(); renderMenu(); show('menu'); };

// ---------- Game state ----------
const scene = $('scene'), sctx = scene.getContext('2d');
let g = null; // current run
const PAL = { wall: '#0f5f6c', wall2: '#12495a', ink: '#231f20', aqua: '#5eead4', pale: '#b9f3ea', lime: '#d4ff3a', counter: '#eef6ff', navy: '#0d1d33', navy2: '#1b4068', coral: '#fc7a7a' };

function startLevel(id) {
  const level = data.levels.find(l => l.id === id);
  g = {
    level, orders: buildOrders(level, data.ions), idx: 0, hearts: 3, coins: 0, xp: 0, served: 0,
    counts: {}, patience: level.patience, busy: false, over: false,
    cust: null, particles: [], flash: 0, t: 0,
  };
  $('level-name').textContent = `Shift ${level.id}: ${level.title}`;
  $('cust-total').textContent = level.customers;
  $('result').hidden = true;
  show('game');
  applySound();
  says($('says'), { text: level.tip });
  renderHearts(); renderCoins();
  nextCustomer();
}

function renderHearts() {
  const el = $('hearts');
  el.innerHTML = [0, 1, 2].map(i => `<span class="${i < g.hearts ? '' : 'gone'}">${i < g.hearts ? '♥' : '♡'}</span>`).join('');
  el.setAttribute('aria-label', `${g.hearts} of 3 hearts`);
}
const renderCoins = () => { $('coins').textContent = save.coins + g.coins; };

function nextCustomer() {
  if (g.idx >= g.orders.length) return finish(true);
  const order = g.orders[g.idx];
  g.order = order; g.counts = {}; g.patience = g.level.patience; g.busy = false;
  g.cust = { opts: randomAvatar(Math.random), x: -36, mood: 'wait' };
  $('cust-n').textContent = g.idx + 1;
  $('order-name').textContent = orderName(order.cat, order.an);
  renderTray(); renderCounter(); renderPatience();
}

function renderTray() {
  const tray = $('tray'); tray.innerHTML = '';
  for (const ion of buildTray(g.order, data.ions, g.level.decoys)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tile';
    b.setAttribute('aria-label', `Add ${ion.name} ion, charge ${Math.abs(ion.charge)} ${ion.charge > 0 ? 'plus' : 'minus'}`);
    b.innerHTML = `<span class="tile__sym">${ionHTML(ion)}</span><small>${ion.name}</small>`;
    b.onclick = () => addIon(ion.id);
    tray.append(b);
  }
}

function renderCounter() {
  const slots = $('counter-slots'); slots.innerHTML = '';
  const ids = Object.keys(g.counts).filter(id => g.counts[id] > 0);
  if (!ids.length) slots.innerHTML = '<p class="counter__empty">Empty: tap ions below.</p>';
  for (const id of ids) {
    const ion = ionById[id];
    const b = document.createElement('button'); b.type = 'button'; b.className = 'slot';
    b.setAttribute('aria-label', `${g.counts[id]} ${ion.name} ion on the counter. Tap to remove one.`);
    b.innerHTML = `${ionHTML(ion)}<span>×${g.counts[id]}</span>`;
    b.onclick = () => removeIon(id);
    slots.append(b);
  }
  const ch = $('counter-charge');
  if (g.level.showCharge && ids.length) {
    const { pos, neg, net } = netCharge(g.counts, ionById);
    ch.innerHTML = `Positive <b>${chargeStr(pos)}</b> · Negative <b>${chargeStr(neg)}</b> · Net <b>${net === 0 ? '0 ✓' : chargeStr(net)}</b>`;
  } else ch.textContent = '';
}

function renderPatience() {
  const frac = Math.max(0, g.patience / g.level.patience);
  const bar = $('patience');
  bar.firstElementChild.style.transform = `scaleX(${frac})`;
  bar.setAttribute('aria-valuenow', Math.round(frac * 100));
  bar.dataset.low = String(frac < 0.25);
  if (g.cust && !g.busy) g.cust.mood = frac < 0.25 ? 'angry' : 'wait';
}

const addIon = id => {
  if (g.busy || g.over) return;
  g.counts[id] = Math.min(9, (g.counts[id] || 0) + 1); sound.select(); renderCounter();
};
const removeIon = id => {
  if (g.busy || g.over) return;
  g.counts[id] = Math.max(0, (g.counts[id] || 0) - 1); sound.pop(); renderCounter();
};
$('btn-clear').onclick = () => { if (!g.busy && !g.over) { g.counts = {}; sound.pop(); renderCounter(); } };

function loseHeart() {
  g.hearts--; g.flash = 0.35; renderHearts();
}

$('btn-serve').onclick = () => {
  if (!g || g.busy || g.over) return;
  sound.unlock();
  const res = checkServe(g.order, g.counts);
  if (res.ok) {
    const tip = tipFor(g.patience / g.level.patience);
    g.coins += tip; g.xp += 10; g.served++;
    g.cust.mood = 'happy'; g.busy = true;
    for (let i = 0; i < 5; i++) g.particles.push({ x: 40 + i * 6, y: 44, vy: -26 - i * 4, life: 1 });
    sound.correct(); renderCoins();
    says($('says'), { text: res.message, state: 'correct', status: `✓ Correct! +${tip} coins.`, fact: g.order.fact || '' });
    g.idx++;
    setTimeout(() => { if (g && !g.over) nextCustomer(); }, 1400);
  } else if (res.kind === 'empty') {
    says($('says'), { text: res.message });
  } else {
    sound.wrong(); loseHeart();
    says($('says'), { text: res.message, state: 'wrong', status: '✗ Try again.' });
    if (g.hearts <= 0) { g.busy = true; setTimeout(() => finish(false), 1800); }
  }
};

function timeUp() {
  g.busy = true; g.cust.mood = 'angry';
  sound.wrong(); loseHeart();
  says($('says'), { text: revealAnswer(g.order), state: 'wrong', status: '✗ Time’s up!' });
  g.idx++;
  setTimeout(() => {
    if (!g || g.over) return;
    if (g.hearts <= 0) finish(false); else nextCustomer();
  }, 2400);
}

function finish(win) {
  g.over = true;
  save.coins += g.coins; save.xp += g.xp;
  const stars = win ? starsFor(g.hearts) : 0;
  if (win) save.stars[g.level.id] = Math.max(save.stars[g.level.id] || 0, stars);
  persist();
  $('result-title').textContent = win ? 'Shift complete!' : 'The diner closed early';
  $('result-stars').innerHTML = [0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}">${i < stars ? '★' : '☆'}</span>`).join('');
  $('result-stars').setAttribute('aria-label', `${stars} of 3 stars`);
  $('result-text').textContent = win
    ? `You served ${g.served} customers and earned ${g.coins} coins and ${g.xp} XP.`
    : `You ran out of hearts after serving ${g.served}. Try again: remember that the total + charge must equal the total − charge.`;
  const next = data.levels.find(l => l.id === g.level.id + 1);
  $('result-next').hidden = !(win && next);
  $('result').hidden = false;
  win ? sound.correct() : sound.wrong();
  $('result-next').focus();
}
$('result-retry').onclick = () => startLevel(g.level.id);
$('result-next').onclick = () => startLevel(g.level.id + 1);
$('result-menu').onclick = $('btn-quit').onclick = () => { if (g) g.over = true; $('result').hidden = true; renderMenu(); show('menu'); };

// ---------- Scene (canvas, 160 × 96 logical pixels) ----------
const R = (x, y, w, h, c) => { sctx.fillStyle = c; sctx.fillRect(Math.round(x), Math.round(y), w, h); };

function drawScene(t) {
  R(0, 0, 160, 96, PAL.wall);
  R(0, 44, 160, 16, PAL.wall2);
  R(0, 44, 160, 1, PAL.ink);
  // window
  R(8, 8, 38, 28, PAL.ink); R(10, 10, 34, 24, PAL.pale); R(26, 10, 2, 24, PAL.ink); R(10, 21, 34, 2, PAL.ink);
  // menu board with a lime flask
  R(110, 8, 42, 30, PAL.ink); R(112, 10, 38, 26, PAL.navy);
  R(128, 14, 6, 8, PAL.lime); R(125, 22, 12, 8, PAL.lime); R(122, 26, 18, 4, PAL.lime);
  R(116, 14, 6, 2, PAL.aqua); R(116, 19, 5, 2, PAL.aqua); R(116, 24, 6, 2, PAL.aqua);
  // hanging lamp
  R(79, 0, 2, 10, PAL.ink); R(72, 10, 16, 6, PAL.lime); R(72, 16, 16, 1, PAL.ink);
  // floor checker
  for (let y = 76; y < 96; y += 8) for (let x = 0; x < 160; x += 8) R(x, y, 8, 8, ((x + y) / 8) % 2 ? PAL.navy : PAL.navy2);

  // people (drawn before the counter so it hides their legs)
  const bob = Math.floor(t * 2) % 2;
  if (g && g.cust) {
    const c = g.cust, shake = c.mood === 'angry' && !g.busy ? (Math.floor(t * 18) % 2 ? 1 : -1) : 0;
    const hop = c.mood === 'happy' ? -Math.abs(Math.round(Math.sin(t * 10) * 3)) : bob;
    drawAvatar(sctx, c.opts, Math.round(c.x) + shake, 32 + hop, 2, { customer: true });
    if (c.mood === 'angry') { R(c.x + 9 + shake, 41 + hop, 4, 2, PAL.coral); R(c.x + 19 + shake, 41 + hop, 4, 2, PAL.coral); }
    if (c.mood === 'happy') { R(c.x + 4, 28 + hop, 2, 2, PAL.lime); R(c.x + 27, 30 + hop, 2, 2, PAL.lime); R(c.x + 15, 24 + hop, 2, 2, PAL.lime); }
  }
  drawAvatar(sctx, save.avatar, 104, 32 + (bob ? 0 : -1), 2);

  // counter
  R(0, 58, 160, 4, PAL.counter); R(0, 62, 160, 2, PAL.lime); R(0, 64, 160, 12, PAL.wall2);
  R(0, 58, 160, 1, PAL.ink); R(0, 76, 160, 2, PAL.ink); R(0, 64, 160, 1, PAL.ink);
  R(70, 54, 20, 4, PAL.counter); R(70, 57, 20, 1, PAL.ink);   // plate

  // coin particles
  if (g) for (const p of g.particles) {
    R(p.x, p.y, 6, 6, PAL.ink); R(p.x + 1, p.y + 1, 4, 4, PAL.lime); R(p.x + 2, p.y + 2, 1, 2, PAL.ink);
  }
  if (g && g.flash > 0) { sctx.globalAlpha = Math.min(0.35, g.flash); R(0, 0, 160, 96, PAL.coral); sctx.globalAlpha = 1; }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (g && !$('screen-game').hidden) {
    g.t += dt;
    if (g.cust) g.cust.x += (18 - g.cust.x) * Math.min(1, dt * 8);
    if (!g.busy && !g.over) {
      g.patience -= dt; renderPatience();
      if (g.patience <= 0) timeUp();
    }
    for (const p of g.particles) { p.y += p.vy * dt; p.life -= dt; }
    g.particles = g.particles.filter(p => p.life > 0);
    if (g.flash > 0) g.flash -= dt;
    drawScene(g.t);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

renderMenu();
show('menu');
