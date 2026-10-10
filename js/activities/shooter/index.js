// Molecule Shooter — Dr. NAM gives a challenge ("Shoot the polar molecule") and molecules float
// across the screen. Students aim with a finger and "shoot" (finger gun), or click with a mouse.
//
// Questions live in data/shooter/<pack>.json (bilingual), so new topics are added without code.
// Learning events go to ctx.log (study mode): item_start, attempt, hint, level_complete.
import { settings } from '../../store.js';

const LEVELS = ['easy', 'medium', 'hard'];
const packs = {};
function loadPack(id) {
  if (!packs[id]) {
    packs[id] = fetch(`data/shooter/${id}.json`).then(r => {
      if (!r.ok) throw new Error(`Question pack "${id}" not found`);
      return r.json();
    });
  }
  return packs[id];
}

// "NH₃" → "NH3", "Ca²⁺" → "Ca2+" (plain text for the study CSV)
const SUB = '₀₁₂₃₄₅₆₇₈₉', SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function ascii(s) {
  return String(s).replace(/./gu, ch => {
    let i = SUB.indexOf(ch); if (i >= 0) return String(i);
    i = SUP.indexOf(ch); if (i >= 0) return String(i);
    return { '⁺': '+', '⁻': '-', '−': '-', '–': '-', '≡': '#', '°': 'deg' }[ch] ?? ch;
  });
}

const shuffle = a => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default function mount(host, ctx) {
  const { t, sound } = ctx;
  const log = ctx.log || (() => {});
  const L = ctx.language === 'en' ? 'en' : 'ms';
  const tx = v => (typeof v === 'string' ? v : v?.[L] ?? v?.en ?? '');
  const duo = ctx.players === 'duo';
  const level = LEVELS.includes(ctx.level) ? ctx.level : 'easy';
  const packId = ctx.pack || 'ic';

  let alive = true;
  let raf = 0;
  const timers = new Set();
  if (duo) ctx.engine?.startKeyboard?.(2); // Player 2 can also aim with the keyboard
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); };

  host.innerHTML = `
    <section class="shooter" data-level="${level}">
      <header class="shooter__hud glass">
        <div class="shooter__avatar"><img src="brand/logos/chemistry-with-dr-nam-logo.jpg" alt="" data-logo="Dr. NAM"></div>
        <div class="shooter__ask">
          <p class="shooter__eyebrow"><span class="tag" id="sh-level"></span> <span id="sh-round"></span></p>
          <h2 class="shooter__prompt" id="sh-prompt"></h2>
          <p class="shooter__hint" id="sh-hint" hidden></p>
          <div class="shooter__timer" id="sh-timer" hidden><span></span></div>
        </div>
        <div class="shooter__stats" id="sh-stats"></div>
      </header>
      <div class="shooter__arena" id="sh-arena"></div>
      <div class="shooter__feedback glass" id="sh-feedback" hidden role="status"></div>
      <div class="shooter__cover" id="sh-cover"></div>
    </section>`;

  const $ = s => host.querySelector(s);
  const arena = $('#sh-arena');
  const root = $('.shooter');
  host.querySelectorAll('img[data-logo]').forEach(img =>
    img.addEventListener('error', () => { img.closest('.shooter__avatar')?.classList.add('is-empty'); img.remove(); }, { once: true }));

  // ------------------------------------------------------------------ state
  let pack, cfg, items = [];
  let round = -1;
  let state = 'intro'; // intro | play | review | done
  let targets = [];
  let roundStart = 0, levelStart = 0;
  let wrongThisRound = new Set();   // players who missed this round
  let hintShown = false;
  const lockUntil = { 1: 0, 2: 0 };
  const score = { 1: 0, 2: 0 };
  let streak = 0, bestStreak = 0, firstTry = 0;
  const missed = [];
  let pendingPlayer = null;

  // ------------------------------------------------------------------ start
  loadPack(packId).then(p => {
    if (!alive) return;
    pack = p;
    cfg = p.levels[level];
    const pool = p.items.filter(i => i.level === level);
    items = shuffle(pool).slice(0, Math.min(cfg.rounds, pool.length));
    $('#sh-level').textContent = t(`level.${level}`);
    renderStats();
    showIntro();
  }).catch(err => {
    console.error(err);
    $('#sh-cover').innerHTML = `<div class="shooter__card glass"><h2>${esc(t('shooter.loadError'))}</h2></div>`;
  });

  function showIntro() {
    state = 'intro';
    const cover = $('#sh-cover');
    cover.hidden = false;
    cover.innerHTML = `
      <div class="shooter__card glass">
        <span class="tag">${esc(tx(pack.title))}</span>
        <h2>${esc(t('activity.shooter.title'))}</h2>
        <ol class="shooter__how">
          <li>${esc(t('shooter.how.1'))}</li>
          <li>${esc(t('shooter.how.2'))}</li>
          <li>${esc(t(cfg.seconds ? 'shooter.how.3timed' : 'shooter.how.3', { s: cfg.seconds }))}</li>
          ${duo ? `<li>${esc(t('shooter.how.duo'))}</li>` : ''}
        </ol>
        <button class="btn-start btn-start--small" data-target type="button" id="sh-go">${esc(t('shooter.go'))}</button>
      </div>`;
    cover.querySelector('#sh-go').addEventListener('click', () => {
      sound.select();
      cover.hidden = true;
      cover.innerHTML = '';
      levelStart = performance.now();
      nextRound();
    });
  }

  // ------------------------------------------------------------------ rounds
  function nextRound() {
    round++;
    if (round >= items.length) return finish();
    const item = items[round];
    state = 'play';
    wrongThisRound = new Set();
    hintShown = false;
    $('#sh-feedback').hidden = true;
    $('#sh-hint').hidden = true;
    $('#sh-round').textContent = t('shooter.round', { n: round + 1, total: items.length });
    $('#sh-prompt').textContent = tx(item.prompt);
    $('#sh-timer').hidden = !cfg.seconds;
    spawnTargets(item);
    roundStart = performance.now();
    log('item_start', { item: item.id });
    cancelAnimationFrame(raf);
    last = 0;
    raf = requestAnimationFrame(tick);
  }

  function spawnTargets(item) {
    arena.innerHTML = '';
    targets = [];
    const W = arena.clientWidth, H = arena.clientHeight;
    const scale = Math.max(0.6, Math.min(1.5, W / 1200));
    const speed = cfg.speed * scale;
    const placed = [];
    shuffle(item.options).forEach((opt, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'shooter__target';
      el.dataset.target = '';
      el.dataset.i = i;
      const label = tx(opt.t);
      el.innerHTML = `<span class="shooter__label">${esc(label)}</span><span class="shooter__star" aria-hidden="true">★</span>`;
      if (label.length > 10 || /\s/.test(label)) el.classList.add('is-wordy');
      if (opt.ok) el.dataset.answer = '';
      arena.appendChild(el);
      const w = el.offsetWidth, h = el.offsetHeight;
      // find a free spot
      let x = 0, y = 0;
      for (let tries = 0; tries < 60; tries++) {
        x = Math.random() * Math.max(1, W - w);
        y = Math.random() * Math.max(1, H - h);
        if (placed.every(p => Math.abs(p.x - x) > (p.w + w) / 2 + 12 || Math.abs(p.y - y) > (p.h + h) / 2 + 12)) break;
      }
      const a = Math.random() * Math.PI * 2;
      const tgt = { el, opt, label, x, y, w, h, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dead: false };
      placed.push(tgt);
      targets.push(tgt);
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.addEventListener('click', () => onShot(tgt));
    });
  }

  arena.addEventListener('player-select', e => { pendingPlayer = e.detail?.player ?? null; }, true);

  // ------------------------------------------------------------------ motion loop
  let last = 0;
  function tick(now) {
    if (!alive) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    root.classList.toggle('is-lecturer', !!settings.lecturer);
    if (state === 'play') {
      const W = arena.clientWidth, H = arena.clientHeight;
      for (const g of targets) {
        if (g.dead) continue;
        g.x += g.vx * dt; g.y += g.vy * dt;
        if (g.x < 0) { g.x = 0; g.vx = Math.abs(g.vx); }
        if (g.y < 0) { g.y = 0; g.vy = Math.abs(g.vy); }
        if (g.x > W - g.w) { g.x = Math.max(0, W - g.w); g.vx = -Math.abs(g.vx); }
        if (g.y > H - g.h) { g.y = Math.max(0, H - g.h); g.vy = -Math.abs(g.vy); }
      }
      // gentle bounce between targets so labels stay readable
      for (let i = 0; i < targets.length; i++) for (let j = i + 1; j < targets.length; j++) {
        const a = targets[i], b = targets[j];
        if (a.dead || b.dead) continue;
        const dx = (b.x + b.w / 2) - (a.x + a.w / 2), dy = (b.y + b.h / 2) - (a.y + a.h / 2);
        const ox = (a.w + b.w) / 2 + 8 - Math.abs(dx), oy = (a.h + b.h) / 2 + 8 - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (ox < oy) { const s = Math.sign(dx) || 1; a.x -= s * ox / 2; b.x += s * ox / 2; [a.vx, b.vx] = [b.vx, a.vx]; }
          else { const s = Math.sign(dy) || 1; a.y -= s * oy / 2; b.y += s * oy / 2; [a.vy, b.vy] = [b.vy, a.vy]; }
        }
      }
      for (const g of targets) g.el.style.transform = `translate(${g.x}px, ${g.y}px)`;

      if (cfg.seconds) {
        const left = cfg.seconds - (now - roundStart) / 1000;
        const bar = $('#sh-timer');
        bar.firstElementChild.style.transform = `scaleX(${Math.max(0, left / cfg.seconds)})`;
        bar.classList.toggle('is-low', left < 5);
        if (left <= 0) timeUp();
      }
    }
    raf = requestAnimationFrame(tick);
  }

  // ------------------------------------------------------------------ shooting
  function onShot(g) {
    const player = duo ? (pendingPlayer ?? 1) : 1;
    pendingPlayer = null;
    if (state !== 'play' || g.dead) return;
    const now = performance.now();
    if (now < lockUntil[player]) return;
    const item = items[round];

    if (g.opt.ok) {
      const first = !wrongThisRound.has(player);
      const bonus = first && cfg.seconds ? Math.round(50 * Math.max(0, 1 - (now - roundStart) / 1000 / cfg.seconds)) : 0;
      const pts = (first ? 100 : 50) + bonus;
      score[player] += pts;
      const clean = wrongThisRound.size === 0;
      if (clean) { firstTry++; streak++; bestStreak = Math.max(bestStreak, streak); } else streak = 0;
      if (!clean) missed.push(item);
      log('attempt', { item: item.id, answer: ascii(g.label), correct: 1, errorType: '', durationMs: Math.round(now - roundStart) });
      sound.correct();
      g.el.classList.add('is-hit');
      burst(g);
      endRound({ kind: 'correct', player, pts, item });
    } else {
      g.dead = true;
      g.el.classList.add('is-wrong');
      g.el.setAttribute('aria-disabled', 'true');
      wrongThisRound.add(player);
      streak = 0;
      if (duo) { lockUntil[player] = now + 1200; flashLock(player); }
      log('attempt', { item: item.id, answer: ascii(g.label), correct: 0, errorType: g.opt.err || 'wrong', durationMs: Math.round(now - roundStart) });
      sound.wrong();
      if (!hintShown && item.hint) {
        hintShown = true;
        const h = $('#sh-hint');
        h.textContent = `💡 ${tx(item.hint)}`;
        h.hidden = false;
        log('hint', { item: item.id, hintUsed: 1 });
      }
    }
    renderStats();
  }

  function timeUp() {
    if (state !== 'play') return;
    const item = items[round];
    streak = 0;
    missed.push(item);
    log('attempt', { item: item.id, answer: '', correct: 0, errorType: 'timeout', durationMs: cfg.seconds * 1000 });
    sound.wrong();
    targets.find(g => g.opt.ok)?.el.classList.add('is-answer');
    endRound({ kind: 'timeout', item });
  }

  function endRound({ kind, player, pts, item }) {
    state = 'review';
    targets.forEach(g => { if (!g.opt.ok) g.el.classList.add('is-faded'); g.el.setAttribute('aria-disabled', 'true'); });
    const answer = tx(item.options.find(o => o.ok).t);
    const title = kind === 'timeout' ? t('shooter.timeUp')
      : duo ? t('shooter.playerGot', { p: player, pts }) : `${t('shooter.correct')} +${pts}`;
    const fb = $('#sh-feedback');
    fb.dataset.kind = kind;
    fb.innerHTML = `
      <div class="shooter__fbtext">
        <p class="shooter__fbtitle">${esc(title)}</p>
        <p class="shooter__fbanswer">${esc(t('shooter.answer'))} <strong>${esc(answer)}</strong></p>
        <p class="shooter__fbwhy">${esc(tx(item.why))}</p>
      </div>
      <button class="btn-start btn-start--small" data-target type="button" id="sh-next">${esc(t(round + 1 >= items.length ? 'shooter.results' : 'shooter.next'))}</button>`;
    fb.hidden = false;
    renderStats();
    // let the hit animation play before the button can be shot
    const btn = fb.querySelector('#sh-next');
    btn.setAttribute('aria-disabled', 'true');
    later(() => btn.removeAttribute('aria-disabled'), 600);
    btn.addEventListener('click', () => {
      if (btn.getAttribute('aria-disabled') === 'true') return;
      sound.select();
      nextRound();
    });
  }

  function finish() {
    state = 'done';
    cancelAnimationFrame(raf);
    arena.innerHTML = '';
    $('#sh-feedback').hidden = true;
    $('#sh-hint').hidden = true;
    $('#sh-timer').hidden = true;
    const n = items.length;
    const pct = n ? firstTry / n : 0;
    const stars = pct >= 0.8 ? 3 : pct >= 0.5 ? 2 : pct > 0 ? 1 : 0;
    const durationMs = Math.round(performance.now() - levelStart);
    log('level_complete', { durationMs, item: `${packId}:${level}`, answer: `score=${score[1]}${duo ? `;p2=${score[2]}` : ''};firstTry=${firstTry}/${n}` });
    $('#sh-prompt').textContent = t('shooter.done');
    $('#sh-round').textContent = '';

    const next = LEVELS[LEVELS.indexOf(level) + 1];
    const winner = duo ? (score[1] === score[2] ? t('shooter.draw') : t('shooter.winner', { p: score[1] > score[2] ? 1 : 2 })) : '';
    const review = missed.length
      ? `<h3>${esc(t('shooter.review'))}</h3><ul class="shooter__review">${missed.map(i =>
          `<li><span>${esc(tx(i.prompt))}</span><strong>${esc(tx(i.options.find(o => o.ok).t))}</strong></li>`).join('')}</ul>`
      : `<p class="shooter__perfect">${esc(t('shooter.perfect'))}</p>`;
    const cover = $('#sh-cover');
    cover.hidden = false;
    cover.innerHTML = `
      <div class="shooter__card shooter__card--results glass">
        <div class="shooter__stars" aria-label="${stars}/3">${'★'.repeat(stars)}<span>${'★'.repeat(3 - stars)}</span></div>
        <h2>${esc(duo ? winner : t('shooter.score', { n: score[1] }))}</h2>
        <p class="shooter__summary">${esc(duo
          ? `P1 ${score[1]} · P2 ${score[2]}`
          : t('shooter.summary', { first: firstTry, total: n, streak: bestStreak }))}</p>
        ${review}
        <div class="shooter__actions">
          <button class="sticker" data-target type="button" id="sh-again">${esc(t('shooter.again'))}</button>
          ${next ? `<button class="btn-start btn-start--small" data-target type="button" id="sh-up">${esc(t('shooter.nextLevel', { level: t(`level.${next}`) }))}</button>` : ''}
          <button class="sticker" data-target type="button" id="sh-home">${esc(t('toolbar.home'))}</button>
        </div>
      </div>`;
    sound[stars >= 2 ? 'correct' : 'pop']();
    const restart = lv => document.dispatchEvent(new CustomEvent('activity-restart', { detail: { level: lv } }));
    cover.querySelector('#sh-again').addEventListener('click', () => restart(level));
    cover.querySelector('#sh-up')?.addEventListener('click', () => restart(next));
    cover.querySelector('#sh-home').addEventListener('click', () => { location.hash = ''; });
  }

  // ------------------------------------------------------------------ little helpers
  function renderStats() {
    const box = $('#sh-stats');
    if (duo) {
      box.innerHTML = `
        <div class="shooter__stat shooter__stat--p1" data-p="1"><small>P1</small><b>${score[1]}</b></div>
        <div class="shooter__stat shooter__stat--p2" data-p="2"><small>P2</small><b>${score[2]}</b></div>`;
    } else {
      box.innerHTML = `
        <div class="shooter__stat"><small>${esc(t('shooter.points'))}</small><b>${score[1]}</b></div>
        <div class="shooter__stat"><small>${esc(t('shooter.streak'))}</small><b>${streak}${streak >= 3 ? '🔥' : ''}</b></div>`;
    }
  }

  function flashLock(p) {
    const el = host.querySelector(`.shooter__stat[data-p="${p}"]`);
    el?.classList.add('is-locked');
    later(() => host.querySelector(`.shooter__stat[data-p="${p}"]`)?.classList.remove('is-locked'), 1200);
  }

  function burst(g) {
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      s.className = 'shooter__spark';
      const a = (i / 10) * Math.PI * 2;
      s.style.left = `${g.x + g.w / 2}px`;
      s.style.top = `${g.y + g.h / 2}px`;
      s.style.setProperty('--dx', `${Math.cos(a) * 90}px`);
      s.style.setProperty('--dy', `${Math.sin(a) * 90}px`);
      arena.appendChild(s);
      later(() => s.remove(), 700);
    }
  }

  const onKey = e => {
    if (e.key === 'Enter' && state === 'review') $('#sh-next')?.click();
  };
  addEventListener('keydown', onKey);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    removeEventListener('keydown', onKey);
    if (duo) ctx.engine?.stopKeyboard?.();
    host.innerHTML = '';
  };
}
