// DR NAM’s CHEMQUEST — World 6: Ion Diner (Diner Dash prototype).
// Content lives in data/diner.json; rules in diner-logic.js; the avatar in avatar.js.
import { sound } from '../../js/sound.js';
import {
  buildOrders, buildTray, checkServe, ionHTML, netCharge, orderName, revealAnswer, starsFor, tipFor, chargeStr,
} from './diner-logic.js';
import { pxCanvas, crisp, shapes } from './pxart.js';
import { monsterSprite } from './monsters.js';
import { createMemory } from './memory.js';
import { worldStates, starKey } from './progress.js';
import { createOverworld } from './overworld.js';
import { drawBadge, BADGE_W, BADGE_H, BADGE_SS } from './badges.js';
import { doodles } from '../../js/doodles.js';
import { OPTIONS, STYLE_LABEL, DEFAULT_AVATAR, drawAvatar, randomAvatar, WIDTH } from './avatar.js';

const $ = id => document.getElementById(id);
const KEY = 'drnam-quest:v1';
const LOGO = '../brand/logos/chemistry-with-dr-nam-logo.jpg';

// ---------- Saved progress (localStorage may be blocked, so every access is guarded) ----------
const defaults = () => ({ world: 1, coins: 0, xp: 0, stars: {}, avatar: { ...DEFAULT_AVATAR }, theme: 'night', mute: false });
let save = defaults();
try { save = { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* use defaults */ }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };
for (const k of Object.keys(save.stars)) if (/^\d+$/.test(k)) { save.stars['6.' + k] = Math.max(save.stars['6.' + k] || 0, save.stars[k]); delete save.stars[k]; }
sound.enabled = !save.mute;

try { await Promise.all([document.fonts.load('800 17px "League Spartan"'), document.fonts.load('400 12px Questrial')]); } catch (e) { /* fall back to system fonts */ }
const data = await (await fetch('data/diner.json')).json();
const memData = await (await fetch('data/memory.json')).json();
const worldData = await (await fetch('data/worlds.json')).json();
const worlds = worldData.worlds;
const ionById = Object.fromEntries(data.ions.map(i => [i.id, i]));

// ---------- Screens, theme and sound ----------
const screens = ['menu', 'shifts', 'memory', 'avatar', 'game'];
function show(name) {
  if (name !== 'menu') overworld.stop();
  screens.forEach(s => { $('screen-' + s).hidden = s !== name; });
  window.scrollTo(0, 0);
}
function applyTheme() {
  document.documentElement.dataset.theme = save.theme;
  $('btn-theme-menu').textContent = save.theme === 'day' ? 'Night mode' : 'Day mode';
}
function applySound() {
  const label = sound.enabled ? 'Sound on' : 'Muted';
  $('btn-sound').textContent = label; $('btn-sound-menu').textContent = label; $('mem-sound').textContent = label;
}
const toggleSound = () => { sound.enabled = !sound.enabled; save.mute = !sound.enabled; persist(); applySound(); sound.unlock(); sound.select(); };
$('btn-sound').onclick = $('btn-sound-menu').onclick = $('mem-sound').onclick = toggleSound;
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

// ---------- Overworld (home screen) ----------
function drawPortrait(canvas, opts) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  drawAvatar(c, opts, 0, 0, canvas.width / WIDTH);
}
const starString = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const states = () => worldStates(worlds, save.stars);
let selected = save.world;

const overworld = createOverworld({
  canvas: $('map-canvas'), pinsEl: $('map-pins'), worlds, map: worldData.map,
  getState: states, getAvatar: () => save.avatar,
  onMonster: m => { sound.unlock(); sound.select(); says($('menu-says'), { text: m.fact, status: `Meet ${m.name}!` }); },
  onSelect: (id, arrived) => {
    selected = id;
    if (arrived) { save.world = id; persist(); }
    sound.pop(); renderWorldCard();
  },
});
overworld.init();

function renderWorldCard() {
  const w = worlds.find(x => x.id === selected), st = states()[selected - 1];
  const card = $('world-card');
  const play = w.playable && st.unlocked;
  const status = !st.unlocked ? `Locked. Clear World ${w.id - 1} to open it.` : w.playable ? `${st.got} of ${st.total} shifts cleared` : 'Still being built: coming soon!';
  card.innerHTML = `<p class="world-card__eyebrow">World ${w.id} · ${w.gameplay}</p>
    <h2>${w.name}</h2><p class="world-card__meta">${w.topic}</p>
    <p class="world-card__meta">${status}</p>
    ${w.playable ? `<p class="world-card__stars" aria-label="${st.starSum} of ${st.total * 3} stars">${'★'.repeat(st.starSum)}${'☆'.repeat(st.total * 3 - st.starSum)}</p>` : ''}
    <button class="btn-start" id="btn-play" type="button" ${play ? '' : 'disabled'}>${play ? 'Play' : st.unlocked ? 'Coming soon' : 'Locked'}</button>`;
  if (play) $('btn-play').onclick = () => { sound.unlock(); sound.select(); renderShifts(w.id); show('shifts'); };
  says($('menu-says'), { text: w.tip });
}

function renderTopics() {
  const st = states();
  $('topic-grid').innerHTML = worlds.map(w => `<div class="topic-card" style="--accent:${w.accent}" data-locked="${!st[w.id - 1].unlocked}">
      ${doodles[w.icon] || ''}<b>${w.gameplay}</b><small>${w.topic}</small></div>`).join('');
}

function renderBadges() {
  const st = states(), shelf = $('badge-shelf'); shelf.innerHTML = '';
  for (const w of worlds) {
    const earned = st[w.id - 1].earned;
    const d = document.createElement('div'); d.className = 'badge'; d.dataset.earned = String(earned);
    const cv = document.createElement('canvas'); cv.width = BADGE_W * BADGE_SS; cv.height = BADGE_H * BADGE_SS;
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', `${w.badge} badge, ${earned ? 'earned' : 'not yet earned'}`);
    drawBadge(cv, w.emblem, w.accent, earned);
    d.append(cv, document.createTextNode(w.badge));
    const sm = document.createElement('small'); sm.textContent = earned ? '✓ Earned' : `World ${w.id}`; d.append(sm);
    shelf.append(d);
  }
}

function renderMenu() {
  drawPortrait($('menu-avatar'), save.avatar);
  $('menu-coins').textContent = save.coins; $('menu-xp').textContent = save.xp;
  overworld.setCurrent(save.world); selected = save.world;
  renderWorldCard(); renderTopics(); renderBadges();
  overworld.start();
  applyTheme(); applySound();
}

// ---------- Level picker (any playable world) ----------
const levelsOf = worldId => (worldId === 6 ? data.levels : memData.levels);
const unitOf = worldId => (worldId === 6 ? 'shift' : 'level');
function renderShifts(worldId) {
  const world = worlds.find(w => w.id === worldId), levels = levelsOf(worldId), unit = unitOf(worldId);
  $('shifts-title').innerHTML = `<span class="lime-rule" aria-hidden="true"></span>${world.name}`;
  $('shifts-sub').textContent = world.blurb;
  const list = $('level-list'); list.innerHTML = '';
  levels.forEach((lv, i) => {
    const star = id => save.stars[starKey(worldId, id)] || 0;
    const unlocked = i === 0 || star(levels[i - 1].id) > 0, stars = star(lv.id);
    const b = document.createElement('button');
    b.className = 'sticker level-card'; b.type = 'button'; b.disabled = !unlocked;
    b.innerHTML = `<span class="level-card__num">${unlocked ? (lv.boss ? 'B' : lv.id) : '🔒'}</span>
      <span class="level-card__title">${lv.title}</span>
      <span class="level-card__sub">${unlocked ? lv.subtitle : `Clear the previous ${unit} to unlock`}</span>
      <span class="level-card__stars" aria-label="${stars} of 3 stars">${starString(stars)}</span>`;
    if (unlocked) b.onclick = () => { sound.unlock(); sound.select(); startWorldLevel(worldId, lv.id); };
    list.append(b);
  });
  says($('shifts-says'), { text: levels[0].tip });
}

function startWorldLevel(worldId, levelId) {
  overworld.stop();
  if (worldId === 6) startLevel(levelId);
  else { $('result').hidden = true; memory.start(levelId); show('memory'); applySound(); }
}

$('btn-shifts-back').onclick = () => { sound.pop(); renderMenu(); show('menu'); };

const memory = createMemory({
  $, levels: memData.levels, says, sound,
  onFinish: r => showResult({ worldId: 1, ...r }),
  onExit: () => { renderMenu(); show('menu'); },
});

// ---------- Avatar creator ----------
let draft = null;
function renderAvatarEditor() {
  drawPortrait($('avatar-preview'), draft);
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
$('btn-avatar').onclick = () => {
  overworld.stop(); draft = { ...save.avatar }; renderAvatarEditor(); show('avatar'); };
$('avatar-random').onclick = () => { draft = randomAvatar(Math.random, { goggles: draft.goggles }); sound.pop(); renderAvatarEditor(); };
$('avatar-done').onclick = () => { save.avatar = draft; persist(); sound.correct(); renderMenu(); show('menu'); };

// ---------- Game state ----------
const scene = $('scene'), sctx = scene.getContext('2d');
let g = null; // current run

function startLevel(id) {
  const level = data.levels.find(l => l.id === id);
  g = {
    level, orders: buildOrders(level, data.ions, Math.random, data.levels), idx: 0, hearts: 3, coins: 0, xp: 0, served: 0,
    counts: {}, patience: level.patience, busy: false, over: false,
    cust: null, particles: [], flash: 0, t: 0, react: null,
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
  g.cust = { opts: randomAvatar(Math.random), x: -80, mood: 'wait' };
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

const react = (mood, secs) => { if (g) g.react = { mood, until: g.t + secs }; };

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
    for (let i = 0; i < 5; i++) g.particles.push({ x: 60 + i * 12, y: 96, vy: -50 - i * 8, life: 1 });
    react('cheer', 1.7); sound.correct(); renderCoins();
    says($('says'), { text: res.message, state: 'correct', status: `✓ Correct! +${tip} coins.`, fact: g.order.fact || '' });
    g.idx++;
    setTimeout(() => { if (g && !g.over) nextCustomer(); }, 1400);
  } else if (res.kind === 'empty') {
    says($('says'), { text: res.message });
  } else {
    react('sad', 2); sound.wrong(); loseHeart();
    says($('says'), { text: res.message, state: 'wrong', status: '✗ Try again.' });
    if (g.hearts <= 0) { g.busy = true; setTimeout(() => finish(false), 1800); }
  }
};

function timeUp() {
  g.busy = true; g.cust.mood = 'angry'; react('shock', 2.2);
  sound.wrong(); loseHeart();
  says($('says'), { text: revealAnswer(g.order), state: 'wrong', status: '✗ Time’s up!' });
  g.idx++;
  setTimeout(() => {
    if (!g || g.over) return;
    if (g.hearts <= 0) finish(false); else nextCustomer();
  }, 2400);
}

function finish(win) {
  g.over = true; g.won = win; react(win ? 'cheer' : 'sad', 600);
  showResult({
    worldId: 6, levelId: g.level.id, win, hearts: g.hearts, coins: g.coins, xp: g.xp,
    title: win ? 'Shift complete!' : 'The diner closed early',
    summary: win ? `You served ${g.served} customers and earned ${g.coins} coins and ${g.xp} XP.`
      : `You ran out of hearts after serving ${g.served}. Try again: remember that the total + charge must equal the total − charge.`,
  });
}

// Shared by both games: save coins, XP and stars, then show the result card.
let lastRun = null;
function showResult(r) {
  save.coins += r.coins; save.xp += r.xp;
  const stars = r.win ? starsFor(r.hearts) : 0, key = starKey(r.worldId, r.levelId);
  if (r.win) save.stars[key] = Math.max(save.stars[key] || 0, stars);
  persist();
  lastRun = { worldId: r.worldId, levelId: r.levelId, won: r.win };
  $('result-title').textContent = r.title;
  $('result-stars').innerHTML = [0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}">${i < stars ? '★' : '☆'}</span>`).join('');
  $('result-stars').setAttribute('aria-label', `${stars} of 3 stars`);
  $('result-text').textContent = r.summary;
  $('result-next').hidden = !(r.win && levelsOf(r.worldId).some(l => l.id === r.levelId + 1));
  $('result').hidden = false;
  r.win ? sound.correct() : sound.wrong();
  $('result-next').hidden ? $('result-retry').focus() : $('result-next').focus();
}
$('result-retry').onclick = () => startWorldLevel(lastRun.worldId, lastRun.levelId);
$('result-next').onclick = () => startWorldLevel(lastRun.worldId, lastRun.levelId + 1);
$('result-menu').onclick = () => { const won = !!(lastRun && lastRun.won); $('result').hidden = true; memory.stop(); renderMenu(); show('menu'); if (won) overworld.celebrate(); };
$('btn-quit').onclick = () => { if (g) g.over = true; $('result').hidden = true; renderMenu(); show('menu'); };

// ---------- Scene (canvas, 320 × 192 logical pixels) ----------
const COUNTER_TOP = 122, CUSTOMER_X = 44, PLAYER_X = 214, SA = 3;   // SA = backing pixels per scene unit (320 × 192 units)

// Draws a formula with proper subscripts, e.g. chem(c, 'Al2O3', ...) -> Al₂O₃ (digits sit lower and smaller).
function chem(c, text, cx, y, size, colour) {
  const small = Math.round(size * 0.68);
  const parts = [...text].map(ch => ({ ch, sub: /\d/.test(ch) }));
  c.textBaseline = 'alphabetic'; c.fillStyle = colour; c.textAlign = 'left';
  const width = parts.reduce((w, p) => { c.font = `400 ${p.sub ? small : size}px Questrial, sans-serif`; return w + c.measureText(p.ch).width; }, 0);
  let x = cx - width / 2;
  for (const p of parts) { c.font = `400 ${p.sub ? small : size}px Questrial, sans-serif`; c.fillText(p.ch, x, y + (p.sub ? size * 0.3 : 0)); x += c.measureText(p.ch).width; }
}

function buildSceneArt() {
  const bg = pxCanvas(320 * SA, 192 * SA), c = bg.getContext('2d'), { R, E, P } = shapes(c);
  c.scale(SA, SA);
  // wall, wainscot and rail
  let g = c.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, '#13808e'); g.addColorStop(1, '#0d5c6e'); c.fillStyle = g; c.fillRect(0, 0, 320, 130);
  c.fillStyle = '#12495a'; c.fillRect(0, 92, 320, 40); c.fillStyle = '#5eead4'; c.fillRect(0, 90, 320, 3);
  c.fillStyle = 'rgba(0,0,0,.2)'; for (let x = 10; x < 320; x += 22) c.fillRect(x, 96, 2, 36);
  // window with sky, clouds and sun beams
  R(12, 12, 96, 68, 5, '#0d1d33', false);
  g = c.createLinearGradient(0, 18, 0, 74); g.addColorStop(0, '#7fdcf5'); g.addColorStop(1, '#e8fbff'); c.fillStyle = g; c.fillRect(17, 17, 86, 58);
  c.fillStyle = 'rgba(255,255,255,.9)'; [[40, 34, 11, 5], [52, 31, 9, 5], [82, 48, 10, 4], [72, 46, 7, 3.4]].forEach(([x, y, rx, ry]) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); });
  c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.moveTo(22, 17); c.lineTo(46, 17); c.lineTo(28, 75); c.lineTo(17, 75); c.fill();
  c.fillStyle = '#0d1d33'; c.fillRect(58, 17, 4, 58); c.fillRect(17, 44, 86, 4);
  R(8, 78, 104, 7, 2.5, '#eef6ff'); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(8, 83, 104, 2);
  // menu board with chalk formulae
  R(204, 8, 106, 56, 5, '#8a5a2b', '#3a2a14'); R(209, 13, 96, 46, 3, '#0d1d33', false);
  c.fillStyle = '#d4ff3a'; c.font = '800 11px "League Spartan", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText('TODAY’S IONS', 257, 27);
  c.fillStyle = '#d4ff3a'; c.fillRect(226, 31, 62, 2);
  chem(c, 'NaCl', 235, 46, 11, '#bff7ef'); chem(c, 'MgO', 279, 46, 11, '#bff7ef'); chem(c, 'Al2O3', 257, 57, 11, '#bff7ef');
  // pendant lamps
  [130, 170].forEach((x, i) => {
    c.fillStyle = '#14202e'; c.fillRect(x, 0, 2, 26);
    const glow = c.createRadialGradient(x + 1, 36, 2, x + 1, 36, 38); glow.addColorStop(0, 'rgba(255,248,190,.34)'); glow.addColorStop(1, 'rgba(255,248,190,0)'); c.fillStyle = glow; c.fillRect(x - 40, 0, 82, 80);
    c.beginPath(); c.ellipse(x + 1, 36, 15, 11, 0, Math.PI, 0); c.closePath(); c.fillStyle = i === 1 ? '#eef6ff' : '#d4ff3a'; c.fill(); c.strokeStyle = '#14202e'; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = '#fff6b8'; c.beginPath(); c.ellipse(x + 1, 37, 7, 2.4, 0, 0, 7); c.fill();
  });
  // floor: three rows of checker tiles
  [[132, 14, 22], [146, 18, 28], [164, 28, 36]].forEach(([y, h, w], row) => {
    for (let x = -((row * 11) % w); x < 320; x += w) { c.fillStyle = (Math.floor((x + 40) / w) + row) % 2 ? '#0d1d33' : '#1b4068'; c.fillRect(x, y, w, h); }
  });
  c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(0, 132, 320, 8);
  crisp(bg, null);

  // counter (drawn in front of the people so it hides their legs)
  const fg = pxCanvas(320 * SA, 192 * SA), f = fg.getContext('2d'), { R: FR, E: FE } = shapes(f);
  f.scale(SA, SA);
  f.fillStyle = '#eef6ff'; f.fillRect(0, COUNTER_TOP, 320, 10); f.fillStyle = '#ffffff'; f.fillRect(0, COUNTER_TOP, 320, 2); f.fillStyle = '#9db4cc'; f.fillRect(0, COUNTER_TOP + 8, 320, 2);
  f.fillStyle = '#d4ff3a'; f.fillRect(0, COUNTER_TOP + 10, 320, 4);
  f.fillStyle = '#12495a'; f.fillRect(0, COUNTER_TOP + 14, 320, 34);
  f.fillStyle = 'rgba(0,0,0,.22)'; for (let x = 0; x < 320; x += 16) f.fillRect(x, COUNTER_TOP + 14, 2, 34);
  f.fillStyle = 'rgba(255,255,255,.16)'; f.fillRect(0, COUNTER_TOP + 14, 320, 3);
  f.fillStyle = '#c9d8e8'; f.fillRect(0, COUNTER_TOP + 30, 320, 3);
  f.fillStyle = '#0d1d33'; f.fillRect(0, COUNTER_TOP + 46, 320, 8);
  FE(160, COUNTER_TOP + 3, 22, 4.4, '#ffffff'); FE(160, COUNTER_TOP + 2, 17, 2.6, '#e1ecf7', false);
  crisp(fg, null);
  return { bg, fg };
}
const sceneArt = buildSceneArt();

// Two molecule mascots sit on the counter and react to how the shift is going.
const MASCOTS = [{ id: 'water', x: 126, ph: 0 }, { id: 'nacl', x: 194, ph: 2 }];
function drawMascots(t) {
  const rx = g && g.react && g.react.until > g.t ? g.react : null;
  const worried = g && g.cust && !g.busy && !g.over && g.patience / g.level.patience < 0.25;
  const mood = rx ? rx.mood : worried ? 'shock' : 'happy';
  sctx.imageSmoothingEnabled = true;
  for (const m of MASCOTS) {
    const sp = monsterSprite(m.id, mood);
    let dx = 0, dy = Math.sin(t * 2.2 + m.ph) * 1.5, sy = 1;
    if (mood === 'cheer') { dy = -Math.abs(Math.sin(t * 7 + m.ph)) * 11; }
    else if (mood === 'sad') { dx = Math.sin(t * 3 + m.ph) * 1.2; dy = 1; sy = 0.92; }
    else if (mood === 'shock') { dx = (Math.floor(t * 22) % 2 ? 1 : -1) * 1.3; sy = 1.07; }
    sctx.save(); sctx.translate(m.x + 21.6 + dx, COUNTER_TOP + 5 + dy); sctx.scale(0.9, 0.9 * sy); sctx.drawImage(sp, -24, -40, 48, 40); sctx.restore();
    const cx = m.x + 21.6;
    if (mood === 'shock') { sctx.font = '800 15px "League Spartan", sans-serif'; sctx.textAlign = 'center'; sctx.lineWidth = 3; sctx.strokeStyle = '#231f20'; sctx.fillStyle = '#d4ff3a'; sctx.strokeText('!', cx, COUNTER_TOP - 38); sctx.fillText('!', cx, COUNTER_TOP - 38); }
    if (mood === 'cheer') for (let i = 0; i < 3; i++) { const a = t * 3 + i * 2.1 + m.ph, px = cx + Math.cos(a) * 24, py = COUNTER_TOP - 20 + Math.sin(a) * 12 + dy, k = 2 + (Math.floor(t * 8 + i) % 2); sctx.fillStyle = i % 2 ? '#ffffff' : '#d4ff3a'; sctx.fillRect(px - k, py, k * 2 + 1, 1.6); sctx.fillRect(px - 0.8, py - k + 0.8, 1.6, k * 2); }
  }
  sctx.imageSmoothingEnabled = false;
}

function drawScene(t) {
  sctx.setTransform(SA, 0, 0, SA, 0, 0); sctx.imageSmoothingEnabled = false;
  sctx.drawImage(sceneArt.bg, 0, 0, 320, 192);
  const bob = Math.floor(t * 2) % 2;
  if (g && g.cust) {
    const c = g.cust, shake = c.mood === 'angry' && !g.busy ? (Math.floor(t * 18) % 2 ? 2 : -2) : 0;
    const hop = c.mood === 'happy' ? -Math.abs(Math.round(Math.sin(t * 10) * 5)) : -bob * 2;
    drawAvatar(sctx, c.opts, Math.round(c.x) + shake, COUNTER_TOP - 58 + hop, 2, { customer: true, mood: c.mood });
    if (c.mood === 'happy') {
      sctx.fillStyle = '#d4ff3a';
      [[-6, 8], [66, 14], [30, -4]].forEach(([dx, dy], i) => { const px = Math.round(c.x) + dx, py = COUNTER_TOP - 58 + dy + hop, k = (Math.floor(t * 8) + i) % 2 ? 3 : 2; sctx.fillRect(px - k, py, k * 2 + 1, 2); sctx.fillRect(px, py - k, 2, k * 2 + 1); });
    }
  }
  drawAvatar(sctx, save.avatar, PLAYER_X, COUNTER_TOP - 58 - bob * 2, 2, { mood: g && g.cust && g.cust.mood === 'happy' ? 'happy' : 'wait' });
  drawMascots(t);
  sctx.imageSmoothingEnabled = false; sctx.drawImage(sceneArt.fg, 0, 0, 320, 192);
  if (g && g.cust && g.cust.mood === 'happy') {            // the served compound glows on the plate
    const gl = sctx.createRadialGradient(160, COUNTER_TOP - 6, 1, 160, COUNTER_TOP - 6, 18); gl.addColorStop(0, 'rgba(212,255,58,.9)'); gl.addColorStop(1, 'rgba(212,255,58,0)');
    sctx.fillStyle = gl; sctx.fillRect(138, COUNTER_TOP - 28, 44, 44);
    sctx.fillStyle = '#d4ff3a'; sctx.beginPath(); sctx.arc(160, COUNTER_TOP - 6, 5, 0, 7); sctx.fill(); sctx.strokeStyle = '#231f20'; sctx.lineWidth = 1.5; sctx.stroke();
  }
  if (g) for (const p of g.particles) {                    // coins
    sctx.fillStyle = '#231f20'; sctx.beginPath(); sctx.arc(p.x, p.y, 6.4, 0, 7); sctx.fill();
    sctx.fillStyle = '#d4ff3a'; sctx.beginPath(); sctx.arc(p.x, p.y, 4.8, 0, 7); sctx.fill();
    sctx.fillStyle = '#231f20'; sctx.fillRect(p.x - 0.8, p.y - 2.4, 1.8, 4.8);
  }
  if (g && g.flash > 0) { sctx.globalAlpha = Math.min(0.35, g.flash); sctx.fillStyle = '#fc7a7a'; sctx.fillRect(0, 0, 320, 192); sctx.globalAlpha = 1; }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (g && !$('screen-game').hidden) {
    g.t += dt;
    if (g.cust) g.cust.x += (CUSTOMER_X - g.cust.x) * Math.min(1, dt * 8);
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
