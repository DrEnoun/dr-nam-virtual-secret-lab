// Activity 1 — Lewis Structure Builder (Easy, Medium, Hard + mixed timed challenge).
// Flow and scoring live here; geometry and answer checking are in rules.js; the drag board is in board.js.
import { settings } from '../../store.js';
import { guardLogos, toast } from '../../ui.js';
import {
  buildAtom, buildCovalent, buildIonic, evaluate, pointsFor, subscript, chargeText, uniqueIons, CHARGE_CHOICES,
  atomCounts, formulaChoices,
} from './rules.js';
import { createBoard, lewisSvg } from './board.js';

const LEVELS = ['easy', 'medium', 'hard'];
let dataPromise;
const loadData = () => (dataPromise ??= Promise.all(['elements', 'molecules', 'levels'].map(n =>
  fetch(`data/lewis/${n}.json`).then(r => { if (!r.ok) throw new Error(n); return r.json(); })))
  .then(([elements, molecules, levels]) => ({ elements, molecules, levels })));

function loadCss() {
  if (document.getElementById('lewis-css')) return;
  const link = document.createElement('link');
  link.id = 'lewis-css';
  link.rel = 'stylesheet';
  link.href = 'css/lewis.css';
  document.head.appendChild(link);
}

const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

export default function mount(host, ctx) {
  const { t, sound } = ctx;
  const lang = ctx.language === 'ms' ? 'ms' : 'en';
  const pick = o => o?.[lang] ?? o?.en ?? '';
  let alive = true;
  let board = null;
  let timer = null;
  let data = null;

  const stopTimer = () => { clearInterval(timer); timer = null; };
  loadCss();
  host.innerHTML = '<p class="lw-loading">…</p>';
  loadData().then(d => { if (alive) { data = d; startLevel(LEVELS.includes(ctx.level) ? ctx.level : 'easy'); } })
    .catch(() => { host.innerHTML = ''; host.appendChild(el('p', 'lw-loading', t('lewis.error'))); });

  // ------------------------------------------------------------------ run state
  // run.states[i] keeps each question's progress so students can leave it and come back:
  //   { phase: 'count'|'pick'|'build'|'charge'|'formula'|'done', wrong, snap, pick, tiles, ionQueue, result }
  let run = null;

  function resolve(ref) {
    if (ref.startsWith('atom:')) return { type: 'atom', ref, element: ref.slice(5) };
    const mol = data.molecules[ref.slice(4)];
    return { type: mol.kind === 'ionic' ? 'ionic' : 'molecule', ref, mol };
  }
  const stageCfg = () => (run.stage === 'challenge' ? run.cfg.challenge : run.cfg);
  const opts = () => {
    const c = stageCfg(), main = run.stage === 'main';
    return { hidden: !!c.hidden, spares: c.spares ?? 0, thinking: main && !!run.cfg.thinking, countQ: main && !!run.cfg.countQuestion, chargeStep: main && !!run.cfg.chargeStep };
  };

  function startLevel(level) {
    stopTimer();
    run = { level, cfg: data.levels[level], score: 0, max: 0, finished: false };
    beginStage('main');
    ctx.duo?.ready?.({ goto: i => show(i), count: () => run.items.length });
  }

  function beginStage(stage) {
    stopTimer();
    run.stage = stage;
    const c = stageCfg();
    run.items = stage === 'main' ? c.items.map(resolve) : shuffle(c.items).slice(0, c.count ?? c.items.length).map(resolve);
    run.idx = 0;
    run.results = [];
    run.states = [];
    run.max += run.items.length * 10;
    run.seconds = ctx.duo ? 0 : (c.seconds ?? 0); // two-player games are untimed
    run.endAt = run.seconds ? Date.now() + run.seconds * 1000 : 0;
    buildShell();
    if (run.seconds) { timer = setInterval(tick, 200); tick(); }
    render();
  }

  function tick() {
    const left = Math.max(0, (run.endAt - Date.now()) / 1000);
    ui.timerLabel.textContent = t('lewis.time', { s: Math.ceil(left) });
    ui.timerBar.style.transform = `scaleX(${left / run.seconds})`;
    ui.timer.classList.toggle('is-low', left < Math.min(30, run.seconds / 4));
    if (left <= 0) { toast(t('lewis.timeup')); endStage(true); }
  }

  // ------------------------------------------------------------------ screen skeleton
  let ui = {};
  function buildShell() {
    board?.destroy(); board = null;
    host.innerHTML = '';
    const root = el('section', `lw${ctx.duo ? ` is-duo is-${ctx.duo.mode}` : ''}`);
    root.innerHTML = `
      <header class="lw-top">
        <div class="lw-badge"><img src="brand/logos/chemistry-with-dr-nam-logo.jpg" alt="Chemistry with Dr. NAM" data-logo="Chemistry with Dr. NAM badge"></div>
        <h2 class="lw-title"><span></span><span class="tag"></span></h2>
        <ol class="lw-progress" aria-label="progress"></ol>
        <div class="lw-score"><span></span><b>0</b></div>
        <div class="lw-timer" hidden><span class="lw-timer__bar"><i></i></span><span class="lw-timer__label"></span></div>
      </header>
      <div class="lw-main">
        <div class="lw-boardwrap"><div class="lw-board-host" style="position:absolute;inset:0"></div></div>
        <aside class="lw-side">
          <div class="lw-nav"></div>
          <div class="lw-card sticker-static lw-task-card"><div class="lw-formula"></div><p class="lw-task"></p></div>
          <div class="lw-card sticker-static lw-question" hidden><p></p><div class="lw-choices"></div></div>
          <div class="lw-feedback glass" aria-live="polite" data-kind=""></div>
          <div class="lw-actions"></div>
          <div class="lw-reveal" hidden></div>
          <div class="lw-bubble">
            <div class="drnam-says__avatar"><img src="brand/logos/chemistry-with-dr-nam-logo.jpg" alt="" data-logo="Dr. NAM"></div>
            <div class="drnam-says__bubble sticker-static"><p class="drnam-says__name">${t('drnam.says')}</p><p class="drnam-says__text"></p></div>
          </div>
          <p class="lw-note" hidden></p>
        </aside>
      </div>`;
    host.appendChild(root);
    guardLogos(root);
    const q = s => root.querySelector(s);
    ui = {
      root, boardHost: q('.lw-board-host'), formula: q('.lw-formula'), task: q('.lw-task'), nav: q('.lw-nav'),
      question: q('.lw-question'), qText: q('.lw-question p'), choices: q('.lw-choices'),
      feedback: q('.lw-feedback'), reveal: q('.lw-reveal'), actions: q('.lw-actions'),
      bubble: q('.drnam-says__text'), progress: q('.lw-progress'), score: q('.lw-score b'), note: q('.lw-note'),
      timer: q('.lw-timer'), timerBar: q('.lw-timer__bar i'), timerLabel: q('.lw-timer__label'),
    };
    q('.lw-title span').textContent = run.stage === 'challenge' ? t('lewis.challenge.title') : t('activity.lewis.title');
    q('.lw-title .tag').textContent = t(`level.${run.level}`);
    q('.lw-score span').textContent = t('lewis.score');
    ui.timer.hidden = !run.seconds;
    ui.note.hidden = false;
    ui.note.textContent = t('lewis.colorhint') + ' ' + t('lewis.touchhint') + (ctx.players === 'duo' ? ' ' + t('lewis.duo') : '');
    renderProgress();
  }

  function renderProgress() {
    ui.progress.innerHTML = '';
    run.items.forEach((_, i) => {
      const li = el('li', '', String(i + 1));
      const r = run.results[i];
      if (r) { li.classList.add('is-done'); if (r.shown) li.classList.add('is-shown'); }
      if (i === run.idx) li.classList.add('is-current');
      li.dataset.target = '';
      li.setAttribute('role', 'button');
      li.tabIndex = 0;
      li.setAttribute('aria-label', t('lewis.item', { n: i + 1, total: run.items.length }));
      li.addEventListener('click', () => { if (i !== run.idx) { sound.select(); show(i); } });
      li.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') li.click(); });
      ui.progress.appendChild(li);
    });
    ui.score.textContent = String(run.score);
    ui.nav.innerHTML = '';
    const last = run.idx === run.items.length - 1;
    const back = button(`‹ ${t('lewis.back')}`, goBack);
    back.disabled = run.idx === 0;
    ui.nav.append(back, el('span', 'lw-nav__pos', t('lewis.item', { n: run.idx + 1, total: run.items.length })), button(last ? t('lewis.finish') : `${t('lewis.next')} ›`, goNext));
  }

  // ------------------------------------------------------------------ one item
  let item = null, model = null, st = null;

  function buildModel(it) {
    const hidden = opts().hidden;
    if (it.type === 'atom') return buildAtom(it.element, data.elements);
    return it.type === 'ionic' ? buildIonic(it.mol, data.elements, { decoys: hidden }) : buildCovalent(it.mol, data.elements);
  }
  const nameOf = it => it.type === 'atom' ? pick(data.elements[it.element].name) : pick(it.mol.name);

  function setFeedback(kind, head, body = '') {
    ui.feedback.dataset.kind = kind;
    ui.feedback.innerHTML = '';
    if (head) ui.feedback.appendChild(el('span', 'lw-feedback__head', head));
    if (body) ui.feedback.appendChild(el('span', '', body));
  }
  const say = text => { ui.bubble.textContent = text; };

  function button(label, onClick, cls = 'sticker') {
    const b = el('button', cls, label);
    b.type = 'button';
    b.dataset.target = '';
    b.addEventListener('click', () => { sound.select(); onClick(); });
    return b;
  }

  /** Remember where the electrons are before leaving a question. */
  function save() {
    if (board && st && ['build', 'charge', 'formula'].includes(st.phase)) st.snap = board.snapshot();
  }
  function show(i) {
    if (!alive || i < 0 || i >= run.items.length) return;
    save();
    run.idx = i;
    render();
  }
  const goBack = () => show(run.idx - 1);
  function goNext() {
    if (run.idx < run.items.length - 1) show(run.idx + 1);
    else { save(); endStage(false); }
  }

  function initialPhase(it) {
    const o = opts();
    if (it.type === 'ionic' && o.thinking) return 'pick';
    if (o.countQ && it.type === 'molecule') return 'count';
    return 'build';
  }

  function render() {
    if (!alive) return;
    item = run.items[run.idx];
    ctx.duo?.onShow?.(run.idx);
    st = run.states[run.idx] ??= { phase: initialPhase(item), wrong: 0, snap: null, pick: {}, tiles: null, ionQueue: null, result: null, model: buildModel(item) };
    model = st.model;
    board?.destroy(); board = null;
    renderProgress();
    ui.reveal.hidden = true; ui.reveal.innerHTML = '';
    ui.question.hidden = true;
    ui.actions.innerHTML = '';
    setFeedback('', '');
    const o = opts();
    document.body.dataset.ptHighlight = o.hidden ? '' : [...new Set(model.atoms.map(a => a.el))].join(',');

    const think = item.type === 'ionic' && o.thinking;
    const showFormula = !think || st.phase === 'done';
    ui.formula.textContent = item.type === 'atom' ? item.element : (showFormula ? subscript(item.mol.formula) : '?');
    ui.task.textContent = taskText(o);
    const multi = item.mol?.bonds?.some(b => b.order > 1);
    say(t(item.type === 'atom' ? 'lewis.tip.atom' : item.type === 'ionic' ? 'lewis.tip.ionic' : multi ? 'lewis.tip.multiple' : 'lewis.tip.molecule'));

    if (st.phase === 'pick') { renderPick(); return; }

    board = createBoard(ui.boardHost, model, {
      sound, hidden: o.hidden, spares: o.spares, locked: st.phase === 'count',
      onChange: () => { ui.boardHost.dataset.state = ''; updateLeft(); },
    });
    if (st.snap) board.restore(st.snap);

    if (st.phase === 'done') return renderDone();
    if (st.phase === 'count') askCount();
    else if (st.phase === 'charge') { board.showIons(model.ions); board.setState('ok'); ui.actions.innerHTML = ''; nextCharge(); }
    else if (st.phase === 'formula') { board.showIons(model.ions); board.setState('ok'); askFormula(); }
    else buildActions();
    updateLeft();
    if (ctx.lecturer) showAnswer(true);
  }

  function taskText(o) {
    const sym = item.type === 'atom' ? item.element : null;
    const f = item.mol ? subscript(item.mol.formula) : '';
    const vars = { name: nameOf(item), sym, formula: f };
    if (item.type === 'atom') return t('lewis.task.atom', vars) + (o.hidden ? ' ' + t('lewis.task.hidden') : '');
    if (item.type === 'ionic') {
      if (o.thinking) return st.phase === 'pick' ? t('lewis.task.pick', vars) : st.phase === 'formula' ? t('lewis.task.formula', vars) : st.phase === 'charge' ? t('lewis.task.charge.all') : st.phase === 'done' ? t('lewis.task.ionic', vars) : t('lewis.task.ionic.think', vars);
      return t(o.hidden ? 'lewis.task.ionic.free' : 'lewis.task.ionic', vars);
    }
    return t('lewis.task.molecule', vars) + (o.hidden ? ' ' + t('lewis.task.hidden') : '');
  }

  function updateLeft() {
    if (!ui.leftLabel || !board) return;
    ui.leftLabel.textContent = (opts().hidden || model.kind === 'ionic') ? '' : t('lewis.left', { n: board.left() });
  }

  function buildActions() {
    ui.actions.innerHTML = '';
    ui.leftLabel = el('span', 'lw-left');
    ui.actions.append(
      button(t('lewis.check'), onCheck, 'btn-start btn-start--small'),
      button(t('lewis.reset'), () => { board.reset(); setFeedback('', ''); }),
    );
    if (run.stage === 'challenge') ui.actions.append(button(t('lewis.skip'), () => complete(false, true)));
    if (st.wrong >= 2 && run.stage === 'main') ui.actions.append(button(t('lewis.show'), () => complete(false, true)));
    ui.actions.append(ui.leftLabel);
    updateLeft();
  }

  // --- Hard: choose the atoms (with distractors) before building anything
  function renderPick() {
    const need = atomCounts(item.mol);
    st.tiles ??= shuffle([...Object.keys(need), ...shuffle(Object.keys(data.elements).filter(e => !need[e] && !e.startsWith('_'))).slice(0, 3)]);
    ui.boardHost.innerHTML = '';
    ui.boardHost.classList.remove('lw-board', 'lw-board--hidden');
    const wrap = el('div', 'lw-pick');
    const bench = el('div', 'lw-pick__bench');
    const tiles = el('div', 'lw-pick__tiles');
    wrap.append(el('h3', '', t('lewis.pick.tiles')), tiles, el('h3', '', t('lewis.pick.bench')), bench);
    ui.boardHost.appendChild(wrap);
    const draw = () => {
      bench.innerHTML = '';
      const chosen = Object.entries(st.pick).filter(([, n]) => n > 0);
      if (!chosen.length) bench.appendChild(el('span', 'lw-pick__empty', t('lewis.pick.empty')));
      for (const [sym, n] of chosen) {
        const chip = button(`${sym} × ${n}  −`, () => { st.pick[sym]--; draw(); }, 'sticker lw-chip');
        chip.setAttribute('aria-label', `${sym} × ${n}, remove one`);
        bench.appendChild(chip);
      }
    };
    st.tiles.forEach(sym => {
      const b = button('', () => { st.pick[sym] = Math.min(6, (st.pick[sym] || 0) + 1); draw(); }, 'sticker lw-tile');
      b.append(el('b', '', sym), el('small', '', pick(data.elements[sym].name)));
      tiles.appendChild(b);
    });
    draw();
    ui.actions.innerHTML = '';
    ui.actions.append(
      button(t('lewis.pick.check'), onPick, 'btn-start btn-start--small'),
      button(t('lewis.pick.clear'), () => { st.pick = {}; draw(); setFeedback('', ''); }),
    );
    if (st.wrong >= 3) ui.actions.append(button(t('lewis.show'), () => { st.phase = 'build'; complete(false, true); }));
    say(t('lewis.tip.pick'));
  }

  function renderPickKeepFeedback() {
    if (!ui.actions.querySelector('.lw-show')) { const b = button(t('lewis.show'), () => { st.phase = 'build'; complete(false, true); }); b.classList.add('lw-show'); ui.actions.appendChild(b); }
  }

  function onPick() {
    const need = atomCounts(item.mol);
    const got = Object.fromEntries(Object.entries(st.pick).filter(([, n]) => n > 0));
    const name = nameOf(item);
    const fail = (key, vars) => { st.wrong++; sound.wrong(); setFeedback('bad', t('lewis.bad'), t(key, vars)); if (st.wrong === 3) renderPickKeepFeedback(); };
    const extra = Object.keys(got).find(e => !need[e]);
    if (extra) return fail('lewis.hint.pick.wrong', { sym: extra, name });
    const missing = Object.keys(need).find(e => !got[e]);
    if (missing) return fail('lewis.hint.pick.missing', { name });
    if (Object.keys(need).some(e => got[e] !== need[e])) {
      const els = Object.keys(need), metal = els.find(e => data.elements[e].metal), non = els.find(e => e !== metal);
      return fail('lewis.hint.pick.count', { metal, mv: data.elements[metal].valence, nonmetal: non, need: data.elements[non].shell - data.elements[non].valence });
    }
    sound.correct();
    st.phase = 'build';
    render();
    setFeedback('ok', t('lewis.ok'), t('lewis.pick.ok'));
  }

  // --- Medium: count total valence electrons first
  function askCount() {
    const total = model.tokens;
    const sum = model.atoms.map(a => `${a.el} (${a.valence})`).join(' + ') + ` = ${total}`;
    ui.question.hidden = false;
    ui.qText.textContent = t('lewis.count.q', { formula: subscript(item.mol.formula) });
    ui.choices.innerHTML = '';
    shuffle([total - 2, total, total + 2, total + 4].filter(n => n > 0)).forEach(n => {
      ui.choices.appendChild(button(String(n), () => {
        if (n === total) {
          ui.question.hidden = true;
          st.phase = 'build';
          board.unlock();
          setFeedback('', '', t('lewis.count.ok', { n: total }));
          buildActions();
        } else {
          st.wrong++;
          sound.wrong();
          setFeedback('bad', t('lewis.bad'), t('lewis.count.sum', { sum }));
        }
      }));
    });
  }

  // --- Check the build
  function onCheck() {
    if (st.phase !== 'build') return;
    const r = evaluate(model, board.filled(), board.sources());
    if (!r.ok) {
      st.wrong++;
      board.setState('bad');
      sound.wrong();
      const key = { 'atom-many': 'lewis.hint.atom.many', 'atom-few': 'lewis.hint.atom.few', many: 'lewis.hint.many', few: 'lewis.hint.few', unpaired: 'lewis.hint.unpaired', source: 'lewis.hint.source', spare: 'lewis.hint.spare', 'ion-many': 'lewis.hint.ion.many', 'ion-left': 'lewis.hint.ion' }[r.code];
      setFeedback('bad', t('lewis.bad'), t(key, r));
      if (st.wrong === 2) buildActions();
      return;
    }
    if (item.type === 'ionic' && (opts().chargeStep || opts().thinking)) {
      board.setState('ok');
      board.showIons(model.ions);
      sound.correct();
      setFeedback('ok', t('lewis.ok'));
      st.phase = 'charge';
      st.ionQueue = uniqueIons(model).map(i => i.el);
      ui.task.textContent = taskText(opts());
      ui.actions.innerHTML = '';
      nextCharge();
    } else {
      if (item.type === 'ionic') board.showIons(model.ions);
      complete(true, false);
    }
  }

  // --- Hard: give each ion its charge, then choose the formula
  function nextCharge() {
    const sym = st.ionQueue[0];
    if (!sym) { ui.question.hidden = true; if (opts().thinking) { st.phase = 'formula'; ui.task.textContent = taskText(opts()); askFormula(); } else complete(true, false); return; }
    const ion = model.ions.find(i => i.el === sym);
    ui.question.hidden = false;
    ui.qText.textContent = t('lewis.task.charge', { sym });
    ui.choices.innerHTML = '';
    CHARGE_CHOICES.forEach(c => {
      ui.choices.appendChild(button(`${sym}${chargeText(c)}`, () => {
        if (c === ion.charge) { st.ionQueue.shift(); setFeedback('ok', t('lewis.ok')); nextCharge(); return; }
        st.wrong++;
        sound.wrong();
        const n = Math.abs(ion.charge);
        setFeedback('bad', t('lewis.bad'), t(ion.charge > 0 ? 'lewis.hint.charge.metal' : 'lewis.hint.charge.non', { sym, n }));
      }));
    });
  }

  function askFormula() {
    ui.question.hidden = false;
    ui.qText.textContent = t('lewis.task.formula', { name: nameOf(item) });
    ui.choices.innerHTML = '';
    st.formulas ??= formulaChoices(item.mol, data.elements);
    st.formulas.forEach(f => {
      ui.choices.appendChild(button(subscript(f.formula), () => {
        if (f.correct) { ui.question.hidden = true; complete(true, false); return; }
        st.wrong++;
        sound.wrong();
        setFeedback('bad', t('lewis.bad'), t('lewis.hint.formula'));
      }, 'sticker lw-formula-choice'));
    });
  }

  // --- Item finished (correct, or answer shown / skipped)
  function complete(correct, shown) {
    if (st.phase === 'done') return;
    const skippedInChallenge = shown && run.stage === 'challenge';
    st.phase = 'done';
    st.result = { pts: correct ? pointsFor(st.wrong) : 0, shown: !correct, skipped: skippedInChallenge };
    run.score += st.result.pts;
    run.results[run.idx] = st.result;
    st.snap = null;
    renderProgress();
    const idx = run.idx;
    ctx.duo?.itemDone?.({ index: idx, correct, pts: st.result.pts, shown: !correct });
    if (skippedInChallenge && idx < run.items.length - 1) { show(idx + 1); return; }
    renderDone(correct);
  }

  function renderDone(justCorrect) {
    const r = st.result;
    if (!board) {
      board = createBoard(ui.boardHost, model, { sound, hidden: opts().hidden, spares: opts().spares });
    }
    ui.question.hidden = true;
    ui.formula.textContent = item.type === 'atom' ? item.element : subscript(item.mol.formula);
    ui.task.textContent = taskText(opts());
    ui.actions.innerHTML = '';
    if (!r.shown) {
      if (item.type === 'ionic') board.showIons(model.ions);
      board.reveal();
      board.setState('ok');
      if (justCorrect) sound.correct();
      setFeedback('ok', t('lewis.ok'), `+${r.pts}`);
    } else {
      board.reveal();
      if (item.type === 'ionic') board.showIons(model.ions);
      setFeedback('', '', r.skipped ? t('lewis.skipped') : t('lewis.reveal.shown'));
    }
    showAnswer(false);
    const last = run.idx === run.items.length - 1;
    ui.actions.append(button(last ? t('lewis.finish') : t('lewis.next'), goNext, 'btn-start btn-start--small js-next'));
  }

  function showAnswer(lecturerOnly) {
    const ions = item.type === 'ionic' ? model.ions : null;
    const why = item.type === 'atom'
      ? t('lewis.atom.why', { sym: item.element, n: model.atoms[0].valence, target: model.atoms[0].target })
      : pick(item.mol.why);
    ui.reveal.hidden = false;
    ui.reveal.innerHTML = '';
    ui.reveal.appendChild(el('h3', '', lecturerOnly ? t('lewis.reveal.lecturer') : t('lewis.reveal.title')));
    ui.reveal.insertAdjacentHTML('beforeend', lewisSvg(model, ions));
    ui.reveal.appendChild(el('small', '', t(ions ? 'lewis.legend.ion' : 'lewis.legend.bond')));
    if (!lecturerOnly) {
      say(`${t('lewis.why')} ${why}${item.mol?.pharmacy ? ' ' + pick(item.mol.pharmacy) : ''}`);
    }
  }

  // ------------------------------------------------------------------ end of a stage / level
  function endStage(timeUp) {
    stopTimer();
    if (ctx.duo) { if (ctx.duo.mode === 'coop') finish(false); return; } // the two-player screen runs the challenge-free level and its own results
    if (run.stage === 'main' && run.cfg.challenge) return challengeIntro(timeUp);
    finish(timeUp);
  }

  function challengeIntro(timeUp) {
    board?.destroy(); board = null;
    const c = run.cfg.challenge;
    host.innerHTML = '';
    const card = el('section', 'lw-center glass');
    card.append(el('h2', '', t('lewis.challenge.title')));
    if (timeUp) card.appendChild(el('p', '', t('lewis.timeup')));
    card.appendChild(el('p', '', t('lewis.challenge.intro', { n: c.count ?? c.items.length, s: c.seconds })));
    const actions = el('div', 'lw-actions');
    actions.append(button(t('lewis.challenge.start'), () => beginStage('challenge'), 'btn-start btn-start--small'));
    card.appendChild(actions);
    host.appendChild(card);
  }

  function finish(timeUp) {
    if (!alive || run.finished) return;
    run.finished = true;
    stopTimer();
    board?.destroy(); board = null;
    let bonus = 0;
    if (run.stage === 'challenge' && !timeUp && run.items.every((_, i) => run.results[i]?.pts > 0)) bonus = Math.floor(Math.max(0, (run.endAt - Date.now()) / 1000) / 10);
    run.score += bonus;
    const best = { ...(settings.lewisBest || {}) };
    const record = run.score > (best[run.level] || 0);
    if (record) { best[run.level] = run.score; settings.lewisBest = best; }
    ctx.report?.({ level: run.level, score: run.score });

    host.innerHTML = '';
    const card = el('section', 'lw-center glass');
    card.append(
      el('h2', '', timeUp ? t('lewis.timeup') : t('lewis.done.title')),
      el('div', 'lw-bignum', String(run.score)),
      el('p', '', t('lewis.done.score', { score: run.score, max: run.max + (run.stage === 'challenge' ? Math.floor(run.seconds / 10) : 0) })),
    );
    if (bonus) card.appendChild(el('p', '', t('lewis.bonus', { n: bonus })));
    card.appendChild(el('p', '', record ? t('lewis.done.record') : t('lewis.best', { n: best[run.level] || 0 })));
    const actions = el('div', 'lw-actions');
    actions.append(button(t('lewis.done.again'), () => startLevel(run.level), 'btn-start btn-start--small'));
    const next = LEVELS[LEVELS.indexOf(run.level) + 1];
    if (next) actions.append(button(t('lewis.done.next'), () => { settings.level = next; startLevel(next); }));
    actions.append(button(t('lewis.done.menu'), () => { location.hash = ''; }));
    card.appendChild(actions);
    host.appendChild(card);
    sound.correct();
  }

  return () => { alive = false; stopTimer(); board?.destroy(); host.innerHTML = ''; delete document.body.dataset.ptHighlight; };
}
