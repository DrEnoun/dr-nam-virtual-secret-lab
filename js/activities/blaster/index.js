// Activity 5 — Atom Blaster (shooting game).
// Each round shows a prompt ("Shoot the ionic compounds"); bubbles drift around the arena. Shoot the right ones
// (finger gun, mouse click or tap) before time runs out. Decoys cost points (and lives on Hard).
// 2 Players: both shoot the same bubbles and each keeps a score.
import { settings } from '../../store.js';
import { guardLogos } from '../../ui.js';

const LEVELS = ['easy', 'medium', 'hard'];
let dataPromise;
const loadData = () => (dataPromise ??= fetch('data/blaster/levels.json').then(r => { if (!r.ok) throw new Error('levels'); return r.json(); }));

function loadCss() {
  for (const [id, href] of [['lewis-css', 'css/lewis.css'], ['blaster-css', 'css/blaster.css']]) {
    if (document.getElementById(id)) continue;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet'; link.href = href;
    document.head.appendChild(link);
  }
}
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rand = (a, b) => a + Math.random() * (b - a);

export default function mount(host, ctx) {
  const { t, sound, engine } = ctx;
  const lang = ctx.language === 'ms' ? 'ms' : 'en';
  const duo = ctx.players === 'duo';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let alive = true, data = null, cfg = null, run = null, ui = {}, raf = 0, last = 0, bubbles = [], arena = { w: 600, h: 400 }, pendingPlayer = 0, ro = null;

  loadCss();
  host.innerHTML = '<p class="lw-loading">…</p>';
  if (duo) engine?.startKeyboard?.(2);
  loadData().then(d => { if (alive) { data = d; startLevel(LEVELS.includes(ctx.level) ? ctx.level : 'easy'); } })
    .catch(() => { host.innerHTML = ''; host.appendChild(el('p', 'lw-loading', t('blaster.error'))); });

  // ---------------------------------------------------------------- run
  function startLevel(level) {
    cfg = data[level];
    run = {
      level, round: 0, finished: false, shots: 0, hits: 0,
      scores: { 1: 0, 2: 0 }, streak: { 1: 0, 2: 0 }, lives: duo ? 0 : cfg.lives,
    };
    buildShell();
    startRound();
  }

  function buildShell() {
    stopLoop();
    host.innerHTML = '';
    const root = el('section', `lw bl${duo ? ' bl--duo' : ''}`);
    root.innerHTML = `
      <header class="lw-top">
        <div class="lw-badge"><img src="brand/logos/chemistry-with-dr-nam-logo.jpg" alt="Chemistry with Dr. NAM" data-logo="Chemistry with Dr. NAM badge"></div>
        <h2 class="lw-title"><span>${t('activity.blaster.title')}</span><span class="tag">${t('level.' + run.level)}</span></h2>
        <ol class="lw-progress" aria-label="progress"></ol>
        <div class="bl-lives" aria-live="polite"></div>
        <div class="bl-scores"></div>
        <div class="lw-timer"><span class="lw-timer__num"></span><div class="lw-timer__bar"><i></i></div></div>
      </header>
      <div class="bl-prompt glass"><p class="bl-prompt__text"></p><div class="bl-quota" aria-hidden="true"></div></div>
      <div class="bl-arena" tabindex="-1"><div class="bl-layer"></div><div class="bl-overlay" hidden></div></div>`;
    host.appendChild(root);
    guardLogos(root);
    const q = s => root.querySelector(s);
    ui = {
      root, progress: q('.lw-progress'), lives: q('.bl-lives'), scores: q('.bl-scores'), timerNum: q('.lw-timer__num'), timerBar: q('.lw-timer__bar i'),
      prompt: q('.bl-prompt__text'), quota: q('.bl-quota'), arena: q('.bl-arena'), layer: q('.bl-layer'), overlay: q('.bl-overlay'),
    };
    for (let i = 0; i < cfg.rounds.length; i++) ui.progress.appendChild(el('li', '', String(i + 1)));
    ro?.disconnect();
    ro = new ResizeObserver(measure); ro.observe(ui.arena);
    renderScores(); renderLives();
  }

  function measure() { const r = ui.arena.getBoundingClientRect(); arena = { w: r.width, h: r.height }; }

  // ---------------------------------------------------------------- rounds
  function startRound() {
    const r = cfg.rounds[run.round];
    run.cur = {
      r, need: Math.min(cfg.quota, r.good.length), got: 0, left: cfg.seconds, over: false,
      pool: shuffle(r.good), seen: new Set(), missed: [],
    };
    ui.overlay.hidden = true; ui.overlay.innerHTML = '';
    ui.layer.innerHTML = ''; bubbles = [];
    ui.prompt.textContent = r.prompt[lang] ?? r.prompt.en;
    [...ui.progress.children].forEach((li, i) => { li.className = i === run.round ? 'is-current' : i < run.round ? 'is-done' : ''; });
    renderQuota();
    measure();
    while (bubbles.length < cfg.onScreen) spawn();
    last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }

  const onScreenLabels = () => new Set(bubbles.map(b => b.label));
  function spawn() {
    const c = run.cur, shown = onScreenLabels();
    const goodsOn = bubbles.filter(b => b.good).length;
    const goodsLeft = c.pool.filter(x => !shown.has(x));
    const needMore = c.need - c.got > goodsOn;
    let good = needMore && goodsLeft.length && (goodsOn < 2 || Math.random() < 0.4);
    let label;
    if (good) label = goodsLeft[0];
    else {
      const bads = c.r.bad.filter(x => !shown.has(x));
      if (!bads.length) { if (!goodsLeft.length) return; good = true; label = goodsLeft[0]; } else label = bads[Math.floor(Math.random() * bads.length)];
    }
    if (good) c.pool = c.pool.filter(x => x !== label).concat(label); // a missed good one can come back later
    const size = cfg.size, sp = cfg.speed * (reduced ? 0.4 : 1), ang = rand(0, Math.PI * 2);
    const b = el('button', 'bl-bubble', label);
    b.type = 'button'; b.dataset.target = ''; b.style.setProperty('--s', size + 'px');
    b.setAttribute('aria-label', label);
    if (label.length > 4) b.classList.add('is-long');
    const o = { el: b, label, good, x: rand(size, Math.max(size + 1, arena.w - size)), y: rand(size, Math.max(size + 1, arena.h - size)), vx: Math.cos(ang) * sp * rand(.7, 1.3), vy: Math.sin(ang) * sp * rand(.7, 1.3), size, dead: false };
    b.addEventListener('player-select', e => { pendingPlayer = e.detail?.player || 1; });
    b.addEventListener('click', () => hit(o));
    place(o);
    ui.layer.appendChild(b); bubbles.push(o);
  }
  const place = o => { o.el.style.transform = `translate(${o.x - o.size / 2}px, ${o.y - o.size / 2}px)`; };

  function tick(now) {
    if (!alive || run.finished) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const c = run.cur;
    if (!c.over) {
      for (const o of bubbles) {
        if (o.dead) continue;
        o.x += o.vx * dt; o.y += o.vy * dt;
        const m = o.size / 2;
        if (o.x < m) { o.x = m; o.vx = Math.abs(o.vx); } else if (o.x > arena.w - m) { o.x = arena.w - m; o.vx = -Math.abs(o.vx); }
        if (o.y < m) { o.y = m; o.vy = Math.abs(o.vy); } else if (o.y > arena.h - m) { o.y = arena.h - m; o.vy = -Math.abs(o.vy); }
        place(o);
      }
      c.left -= dt;
      renderTimer();
      if (c.left <= 0) return endRound(false);
    }
    raf = requestAnimationFrame(tick);
  }
  const stopLoop = () => cancelAnimationFrame(raf);

  // ---------------------------------------------------------------- shooting
  function hit(o) {
    const c = run?.cur;
    const p = duo ? (pendingPlayer || 1) : 1; pendingPlayer = 0;
    if (!c || c.over || o.dead || run.finished) return;
    o.dead = true;
    run.shots++;
    o.el.classList.add(o.good ? 'is-good' : 'is-bad');
    o.el.disabled = true;
    setTimeout(() => o.el.remove(), 380);
    bubbles = bubbles.filter(b => b !== o);
    if (o.good) {
      run.hits++; c.got++; c.seen.add(o.label); run.streak[p]++;
      run.scores[p] += 10 + Math.min(10, (run.streak[p] - 1) * 2);
      sound.correct();
      float(o, '+' + (10 + Math.min(10, (run.streak[p] - 1) * 2)), 'good', p);
      c.pool = c.pool.filter(x => x !== o.label);
      renderQuota();
      if (c.got >= c.need) return endRound(true);
    } else {
      run.streak[p] = 0;
      const lost = Math.min(run.scores[p], cfg.penalty);
      run.scores[p] -= lost;
      sound.wrong();
      float(o, '−' + cfg.penalty, 'bad', p);
      ui.arena.classList.add('is-hurt'); setTimeout(() => ui.arena.classList.remove('is-hurt'), 250);
      if (run.lives) { run.lives--; renderLives(); if (run.lives <= 0) { renderScores(); return endRound(false, true); } }
    }
    renderScores();
    spawn();
  }

  function float(o, text, kind, p) {
    const f = el('span', `bl-float is-${kind}${duo ? ' p' + p : ''}`, text);
    f.style.transform = `translate(${o.x}px, ${o.y - o.size / 2}px)`;
    ui.layer.appendChild(f); setTimeout(() => f.remove(), 800);
  }

  // ---------------------------------------------------------------- end of round
  function endRound(done, dead = false) {
    const c = run.cur;
    if (c.over) return;
    c.over = true;
    let bonus = 0;
    if (done) { bonus = Math.ceil(c.left / 2); run.scores[1] += duo ? 0 : bonus; }
    renderScores();
    const answers = c.r.good;
    const box = ui.overlay;
    box.hidden = false; box.innerHTML = '';
    const card = el('div', 'bl-card sticker-static');
    card.append(
      el('h3', '', dead ? t('blaster.out') : done ? t('blaster.round.done') : t('blaster.timeup')),
      el('p', 'bl-card__q', c.r.prompt[lang] ?? c.r.prompt.en),
    );
    if (done && !duo && bonus) card.appendChild(el('p', '', t('blaster.bonus', { n: bonus })));
    const list = el('div', 'bl-answers');
    for (const a of answers) list.appendChild(el('span', `bl-chip${c.seen.has(a) ? ' is-got' : ''}`, a));
    card.append(el('p', 'bl-card__label', t('blaster.answers')), list);
    const last = run.round >= cfg.rounds.length - 1 || dead;
    const b = el('button', 'btn-start btn-start--small', last ? t('blaster.finish') : t('blaster.next') + ' ›');
    b.type = 'button'; b.dataset.target = '';
    b.addEventListener('click', () => { sound.select(); if (last) finish(); else { run.round++; startRound(); } });
    card.appendChild(b);
    box.appendChild(card);
    if (done) sound.correct();
  }

  function finish() {
    if (!alive || run.finished) return;
    run.finished = true; stopLoop();
    const key = 'blasterBest';
    const best = { ...(settings[key] || {}) };
    const top = Math.max(run.scores[1], duo ? run.scores[2] : 0);
    const record = !duo && top > (best[run.level] || 0);
    if (record) { best[run.level] = top; settings[key] = best; }
    if (!duo) ctx.report?.({ level: run.level, score: run.scores[1] });
    host.innerHTML = '';
    const card = el('section', 'lw-center glass');
    card.appendChild(el('h2', '', t('blaster.done.title')));
    if (duo) {
      const [a, b] = [run.scores[1], run.scores[2]];
      card.append(
        el('div', 'bl-duo-res', `${t('blaster.p1')} ${a}  ·  ${b} ${t('blaster.p2')}`),
        el('p', '', a === b ? t('blaster.tie') : t('blaster.wins', { p: a > b ? t('blaster.p1') : t('blaster.p2') })),
      );
    } else {
      card.append(el('div', 'lw-bignum', String(run.scores[1])), el('p', '', record ? t('lewis.done.record') : t('lewis.best', { n: best[run.level] || 0 })));
    }
    const acc = run.shots ? Math.round(100 * run.hits / run.shots) : 0;
    card.appendChild(el('p', '', t('blaster.accuracy', { n: acc, hits: run.hits, shots: run.shots })));
    const actions = el('div', 'lw-actions');
    const mk = (label, fn, cls = '') => { const b = el('button', cls, label); b.type = 'button'; b.dataset.target = ''; b.addEventListener('click', () => { sound.select(); fn(); }); return b; };
    actions.append(mk(t('lewis.done.again'), () => startLevel(run.level), 'btn-start btn-start--small'));
    const next = LEVELS[LEVELS.indexOf(run.level) + 1];
    if (next) actions.append(mk(t('lewis.done.next'), () => { settings.level = next; startLevel(next); }, 'sticker'));
    actions.append(mk(t('lewis.done.menu'), () => { location.hash = ''; }, 'sticker'));
    card.appendChild(actions);
    host.appendChild(card);
    sound.correct();
  }

  // ---------------------------------------------------------------- HUD
  function renderScores() {
    ui.scores.innerHTML = '';
    for (const p of duo ? [1, 2] : [1]) {
      const s = el('div', `bl-score p${p}`);
      s.append(el('span', '', duo ? t('blaster.p' + p) : t('blaster.score')), el('b', '', String(run.scores[p])));
      ui.scores.appendChild(s);
    }
  }
  function renderLives() { ui.lives.textContent = run.lives ? '♥'.repeat(run.lives) + '♡'.repeat(Math.max(0, cfg.lives - run.lives)) : ''; ui.lives.hidden = !run.lives; }
  function renderQuota() {
    const c = run.cur; ui.quota.innerHTML = '';
    for (let i = 0; i < c.need; i++) ui.quota.appendChild(el('i', i < c.got ? 'is-on' : ''));
  }
  function renderTimer() {
    const c = run.cur, f = Math.max(0, c.left / cfg.seconds);
    ui.timerBar.style.transform = `scaleX(${f})`;
    ui.timerNum.textContent = Math.ceil(c.left) + 's';
    ui.timerNum.parentElement.classList.toggle('is-low', c.left < 8);
  }

  return () => { alive = false; stopLoop(); ro?.disconnect(); if (duo) engine?.stopKeyboard?.(); host.innerHTML = ''; };
}
