// Activity 3 — Crystal Lattice Builder.
// Easy: build a simple cubic cell, repeat it, identify a lattice. Medium: BCC and FCC with particles per cell and coordination number.
// Hard: build NaCl, match structures to properties ("make a material"), short quiz.
import { settings } from '../../store.js';
import { guardLogos } from '../../ui.js';
import { makeDraggable } from '../../drag.js';
import {
  sitesFor, LATTICES, expectedOccupancy, evaluateBuild, particlesPerCell, coordination, shareFormula, pointsFor, latticeKeys,
} from './rules.js';
import { createScene } from './scene.js';

const LEVELS = ['easy', 'medium', 'hard'];
let dataPromise;
const loadData = () => (dataPromise ??= Promise.all(['cells', 'materials', 'levels'].map(n =>
  fetch(`data/crystal/${n}.json`).then(r => { if (!r.ok) throw new Error(n); return r.json(); })))
  .then(([cells, materials, levels]) => ({ cells, materials, levels })));

function loadCss() {
  for (const [id, href] of [['lewis-css', 'css/lewis.css'], ['crystal-css', 'css/crystal.css']]) {
    if (document.getElementById(id)) continue;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet'; link.href = href;
    document.head.appendChild(link);
  }
}
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const SUBS = '₀₁₂₃₄₅₆₇₈₉';

export default function mount(host, ctx) {
  const { t, sound } = ctx;
  const lang = ctx.language === 'ms' ? 'ms' : 'en';
  const pick = o => o?.[lang] ?? o?.en ?? '';
  let alive = true, data = null, run = null, ui = {}, st = null, item = null, scene = null, stopDrag = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  loadCss();
  host.innerHTML = '<p class="lw-loading">…</p>';
  loadData().then(d => { if (alive) { data = d; startLevel(LEVELS.includes(ctx.level) ? ctx.level : 'easy'); } })
    .catch(() => { host.innerHTML = ''; host.appendChild(el('p', 'lw-loading', t('crystal.error'))); });

  // ---------------------------------------------------------------- run
  function startLevel(level) {
    run = { level, score: 0, finished: false, idx: 0, results: [], states: [], items: data.levels[level].items.map(r => { const [kind, id] = r.split(':'); return { kind, id }; }) };
    buildShell();
    render();
  }

  function buildShell() {
    teardown();
    host.innerHTML = '';
    const root = el('section', 'lw cr');
    root.innerHTML = `
      <header class="lw-top">
        <div class="lw-badge"><img src="brand/logos/chemistry-with-dr-nam-logo.jpg" alt="Chemistry with Dr. NAM" data-logo="Chemistry with Dr. NAM badge"></div>
        <h2 class="lw-title"><span></span><span class="tag"></span></h2>
        <ol class="lw-progress" aria-label="progress"></ol>
        <div class="lw-score"><span></span><b>0</b></div>
      </header>
      <div class="lw-main">
        <div class="lw-boardwrap"><div class="cr-stage"><div class="cr-scene-host"></div><div class="cr-overlay"></div></div></div>
        <aside class="lw-side">
          <div class="lw-nav"></div>
          <div class="lw-card sticker-static lw-task-card"><div class="lw-formula"></div><p class="lw-task"></p></div>
          <div class="lw-card sticker-static lw-question" hidden><p></p><div class="lw-choices"></div></div>
          <div class="lw-feedback glass" aria-live="polite" data-kind=""></div>
          <div class="lw-actions"></div>
          <div class="cr-props" hidden></div>
          <div class="lw-reveal cr-info" hidden></div>
          <div class="lw-bubble">
            <div class="drnam-says__avatar"><img src="brand/logos/chemistry-with-dr-nam-logo.jpg" alt="" data-logo="Dr. NAM"></div>
            <div class="drnam-says__bubble sticker-static"><p class="drnam-says__name">${t('drnam.says')}</p><p class="drnam-says__text"></p></div>
          </div>
          <p class="lw-note"></p>
        </aside>
      </div>`;
    host.appendChild(root);
    guardLogos(root);
    const q = s => root.querySelector(s);
    ui = {
      root, stage: q('.cr-stage'), sceneHost: q('.cr-scene-host'), overlay: q('.cr-overlay'), formula: q('.lw-formula'), task: q('.lw-task'), nav: q('.lw-nav'),
      question: q('.lw-question'), qText: q('.lw-question p'), choices: q('.lw-choices'), feedback: q('.lw-feedback'), actions: q('.lw-actions'),
      props: q('.cr-props'), info: q('.cr-info'), bubble: q('.drnam-says__text'), progress: q('.lw-progress'), score: q('.lw-score b'), note: q('.lw-note'),
    };
    q('.lw-title span').textContent = t('activity.crystal.title');
    q('.lw-title .tag').textContent = t(`level.${run.level}`);
    q('.lw-score span').textContent = t('lewis.score');
    ui.note.textContent = t('crystal.touchhint') + (ctx.players === 'duo' ? ' ' + t('lewis.duo') : '');
  }

  function button(label, onClick, cls = 'sticker') {
    const b = el('button', cls, label);
    b.type = 'button'; b.dataset.target = '';
    b.addEventListener('click', () => { sound.select(); onClick(); });
    return b;
  }
  const setFeedback = (kind, head, body = '') => {
    ui.feedback.dataset.kind = kind; ui.feedback.innerHTML = '';
    if (head) ui.feedback.appendChild(el('span', 'lw-feedback__head', head));
    if (body) ui.feedback.appendChild(el('span', '', body));
  };
  const say = text => { ui.bubble.textContent = text; };

  function renderHeader() {
    ui.progress.innerHTML = '';
    run.items.forEach((_, i) => {
      const li = el('li', '', String(i + 1));
      const r = run.results[i];
      if (r) { li.classList.add('is-done'); if (r.shown) li.classList.add('is-shown'); }
      if (i === run.idx) li.classList.add('is-current');
      li.dataset.target = ''; li.setAttribute('role', 'button'); li.tabIndex = 0;
      li.addEventListener('click', () => { if (i !== run.idx) { sound.select(); show(i); } });
      li.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') li.click(); });
      ui.progress.appendChild(li);
    });
    ui.score.textContent = String(run.score);
    ui.nav.innerHTML = '';
    const last = run.idx === run.items.length - 1;
    const back = button(`‹ ${t('lewis.back')}`, () => show(run.idx - 1));
    back.disabled = run.idx === 0;
    ui.nav.append(back, el('span', 'lw-nav__pos', t('lewis.item', { n: run.idx + 1, total: run.items.length })), button(last ? t('lewis.finish') : `${t('lewis.next')} ›`, goNext));
  }

  function teardown() {
    stopDrag.forEach(s => s()); stopDrag = [];
    scene?.destroy(); scene = null;
  }
  const show = i => { if (alive && i >= 0 && i < run.items.length) { run.idx = i; render(); } };
  const goNext = () => (run.idx < run.items.length - 1 ? show(run.idx + 1) : finish());

  // ---------------------------------------------------------------- one item
  const latticeName = key => pick(data.cells[key].name);
  const abbr = key => data.cells[key].abbr;

  function render() {
    if (!alive) return;
    item = run.items[run.idx];
    st = run.states[run.idx] ??= initialState(item);
    teardown();
    renderHeader();
    ui.actions.innerHTML = ''; ui.overlay.innerHTML = ''; ui.props.hidden = true; ui.props.innerHTML = '';
    ui.info.hidden = true; ui.info.innerHTML = ''; ui.question.hidden = true;
    setFeedback('', '');
    document.body.dataset.ptHighlight = '';
    scene = createScene(ui.sceneHost, { reducedMotion: reduced, onSite: id => placeAt(id) });
    if (!scene) { ui.sceneHost.innerHTML = `<p class="cr-nogl">${t('crystal.error3d')}</p>`; ui.task.textContent = t('crystal.error3d'); return; }
    ({ build: phaseBuild, ask: phaseAsk, identify: phaseIdentify, match: phaseMatch, quiz: phaseQuiz, done: phaseDone })[st.phase]();
  }
  function initialState(it) {
    const base = { wrong: 0, result: null };
    if (it.kind === 'build') return { ...base, phase: 'build', placed: new Map(), active: it.id === 'nacl' ? 'na' : 'p', q: 0 };
    if (it.kind === 'identify') return { ...base, phase: 'identify', latt: latticeKeys[Math.floor(Math.random() * latticeKeys.length)] };
    if (it.kind === 'match') return { ...base, phase: 'match', assigned: new Map(), tab: 'nacl' };
    return { ...base, phase: 'quiz', q: 0, order: null };
  }
  const occOf = () => (item.kind === 'build' ? (st.phase === 'done' && st.result?.shown ? expectedOccupancy(item.id) : st.placed) : expectedOccupancy(st.latt));

  // --- build: place particles on the marked sites
  function phaseBuild() {
    const type = item.id, L = LATTICES[type], isIon = type === 'nacl';
    ui.formula.textContent = abbr(type);
    ui.task.textContent = t(isIon ? 'crystal.task.nacl' : 'crystal.task.build', { name: latticeName(type), abbr: abbr(type) });
    say(t(isIon ? 'crystal.tip.nacl' : 'crystal.tip.build'));
    scene.setSites(sitesFor(L.mode));
    scene.setParticles(st.placed);
    // the tray: pick an ion (NaCl), or drag the particle onto a ring
    const tray = el('div', 'cr-tray');
    const counter = el('div', 'cr-counter');
    const upd = () => { counter.textContent = t('crystal.placed', { n: st.placed.size }); };
    upd();
    const types = isIon ? [['na', 'Na⁺'], ['cl', 'Cl⁻']] : [['p', '●']];
    types.forEach(([ty, label], i) => {
      const tok = el('button', `cr-token cr-token--${ty}`, label);
      tok.type = 'button'; tok.dataset.target = ''; tok.style.left = `${i * 78}px`;
      tok.setAttribute('aria-pressed', String(st.active === ty));
      tok.setAttribute('aria-label', isIon ? label : 'particle');
      tok.addEventListener('click', () => { st.active = ty; tray.querySelectorAll('.cr-token').forEach(b => b.setAttribute('aria-pressed', String(b === tok))); sound.select(); });
      tray.appendChild(tok);
      stopDrag.push(makeDraggable(tok, {
        grabRadius: 10,
        onDrop: (x, y) => {
          tok.style.left = `${i * 78}px`; tok.style.top = '';
          const id = scene?.nearestMarker(x, y);
          if (id) { st.active = ty; tray.querySelectorAll('.cr-token').forEach(b => b.setAttribute('aria-pressed', String(b === tok))); put(id, ty); }
        },
      }));
    });
    tray.style.width = `${types.length * 78}px`;
    ui.overlay.append(counter, tray);
    st.upd = upd;
    ui.actions.append(button(t('crystal.check'), onBuild, 'btn-start btn-start--small'), button(t('crystal.clear'), () => { st.placed.clear(); scene.setParticles(st.placed); upd(); setFeedback('', ''); }));
    if (st.wrong >= 2) ui.actions.append(button(t('lewis.show'), () => complete(false)));
  }
  function put(id, type) {
    if (st.placed.get(id) === type) st.placed.delete(id); else st.placed.set(id, type);
    scene.setParticles(st.placed); st.upd?.(); sound.pop(); ui.feedback.dataset.kind = '';
  }
  const placeAt = id => { if (st.phase === 'build') put(id, st.active); };

  function onBuild() {
    const r = evaluateBuild(item.id, st.placed);
    if (r.ok) {
      sound.correct();
      if (data.levels[run.level].ask) { st.phase = 'ask'; st.q = 0; render(); setFeedback('ok', t('lewis.ok'), t('crystal.built.ok', { name: latticeName(item.id) })); return; }
      complete(true); return;
    }
    st.wrong++; sound.wrong();
    const kind = r.kind ? t(`crystal.kind.${r.kind}`) : '';
    const key = { missing: 'crystal.hint.missing', extra: 'crystal.hint.extra', 'wrong-ion': 'crystal.hint.wrong-ion' }[r.code];
    const rule = st.wrong >= 2 ? ` ${pick(data.cells[item.id].note)}` : '';
    setFeedback('bad', t('lewis.bad'), t(key, { ...r, kind, name: latticeName(item.id), ion: r.ion === 'na' ? 'Na⁺' : 'Cl⁻' }) + rule);
    if (st.wrong === 2) ui.actions.append(button(t('lewis.show'), () => complete(false)));
  }

  // --- medium: particles per cell, then coordination number
  function phaseAsk() {
    const type = item.id, occ = st.placed;
    ui.formula.textContent = abbr(type);
    ui.task.textContent = t('crystal.task.ask', { name: latticeName(type) });
    say(t('crystal.tip.ask'));
    scene.setSites([]); scene.setParticles(occ);
    const ppc = Object.values(particlesPerCell(occ)).reduce((a, b) => a + b, 0), cn = coordination(occ);
    const qs = [
      { text: t('crystal.q.ppc', { abbr: abbr(type) }), right: ppc, pool: [1, 2, 4, 8, 6], hint: t('crystal.hint.ppc'), ok: t('crystal.ok.ppc', { n: ppc, calc: shareFormula(occ) }) },
      { text: t('crystal.q.cn'), right: cn, pool: [4, 6, 8, 12, 2], hint: t('crystal.hint.cn'), ok: t('crystal.ok.cn', { n: cn }), after: () => scene.showNeighbours(occ) },
    ];
    const q = qs[st.q];
    ui.question.hidden = false; ui.qText.textContent = q.text; ui.choices.innerHTML = '';
    const opts = [...new Set(q.pool.filter(v => v !== q.right))].slice(0, 3).concat(q.right).sort((a, b) => a - b);
    opts.forEach(v => ui.choices.appendChild(button(String(v), () => {
      if (v === q.right) {
        sound.correct(); q.after?.();
        if (st.q === 0) { st.q = 1; phaseAskNext(q.ok); } else { setFeedback('ok', t('lewis.ok'), q.ok); complete(true); }
      } else { st.wrong++; sound.wrong(); setFeedback('bad', t('lewis.bad'), q.hint); }
    })));
    if (st.q === 1) ui.overlay.appendChild(neighbourButton(occ));
  }
  function phaseAskNext(okText) { render(); setFeedback('ok', t('lewis.ok'), okText); }
  function neighbourButton(occ) { return button(t('crystal.view.neighbours'), () => scene.showNeighbours(occ), 'sticker cr-float'); }

  // --- easy: which lattice is this?
  function phaseIdentify() {
    ui.formula.textContent = '?';
    ui.task.textContent = t('crystal.task.identify');
    say(t('crystal.tip.identify'));
    scene.setSites([]); scene.setParticles(expectedOccupancy(st.latt));
    ui.question.hidden = false; ui.qText.textContent = t('crystal.q.identify'); ui.choices.innerHTML = '';
    shuffle(latticeKeys).forEach(k => ui.choices.appendChild(button(`${latticeName(k)} (${abbr(k)})`, () => {
      if (k === st.latt) { sound.correct(); complete(true); return; }
      st.wrong++; sound.wrong(); setFeedback('bad', t('lewis.bad'), t('crystal.hint.identify'));
    })));
  }

  // --- hard: make a material (match structures to properties)
  function phaseMatch() {
    const M = data.materials;
    ui.formula.textContent = '⬡';
    ui.task.textContent = t('crystal.task.match');
    say(t('crystal.tip.match'));
    scene.showStructure(st.tab);
    const tabs = el('div', 'cr-tabs');
    M.structures.forEach(s => {
      const b = el('button', 'sticker cr-tab', pick(s.name)); b.type = 'button'; b.dataset.target = '';
      b.setAttribute('aria-pressed', String(st.tab === s.id));
      const done = [...st.assigned.values()].includes(s.id);
      if (done) b.dataset.done = '1';
      b.addEventListener('click', () => { st.tab = s.id; sound.select(); render(); });
      const sub = el('small', '', pick(s.bonding)); b.appendChild(sub);
      tabs.appendChild(b);
    });
    ui.overlay.appendChild(tabs);
    ui.props.hidden = false;
    ui.props.appendChild(el('h3', '', t('crystal.props.title', { name: pick(M.structures.find(s => s.id === st.tab).name) })));
    st.propOrder ??= shuffle(M.properties.map(p => p.id));
    st.propOrder.map(id => M.properties.find(p => p.id === id)).forEach(p => {
      const owner = st.assigned.get(p.id);
      const b = el('button', 'sticker cr-prop', pick(p.text)); b.type = 'button'; b.dataset.target = '';
      b.setAttribute('aria-pressed', String(owner === st.tab));
      if (owner && owner !== st.tab) b.dataset.taken = pick(M.structures.find(s => s.id === owner).name);
      b.addEventListener('click', () => {
        if (st.assigned.get(p.id) === st.tab) st.assigned.delete(p.id);
        else { for (const [k, v] of st.assigned) if (v === st.tab) st.assigned.delete(k); st.assigned.set(p.id, st.tab); }
        sound.select(); ui.feedback.dataset.kind = ''; render();
      });
      ui.props.appendChild(b);
    });
    ui.actions.append(button(t('crystal.match.check'), onMatch, 'btn-start btn-start--small'), button(t('crystal.clear'), () => { st.assigned.clear(); render(); }));
    if (st.wrong >= 2) ui.actions.append(button(t('lewis.show'), () => complete(false)));
  }
  function onMatch() {
    const M = data.materials;
    if (st.assigned.size < M.structures.length) { st.wrong++; sound.wrong(); setFeedback('bad', t('lewis.bad'), t('crystal.hint.match.missing')); return; }
    const bad = M.structures.filter(s => { const pid = [...st.assigned].find(([, v]) => v === s.id)?.[0]; return M.properties.find(p => p.id === pid)?.for !== s.id; });
    if (!bad.length) { sound.correct(); complete(true); return; }
    st.wrong++; sound.wrong();
    const first = bad[0], pid = [...st.assigned].find(([, v]) => v === first.id)[0], prop = M.properties.find(p => p.id === pid);
    const why = prop.for === null ? pick(prop.why) : t('crystal.hint.match.wrong', { name: pick(first.name), bonding: pick(first.bonding) });
    setFeedback('bad', t('lewis.bad'), `${bad.length} ✗ — ${why}`);
    if (st.wrong === 2) ui.actions.append(button(t('lewis.show'), () => complete(false)));
  }

  // --- hard: short quiz
  function phaseQuiz() {
    const M = data.materials;
    ui.formula.textContent = '?';
    ui.task.textContent = t('crystal.task.quiz');
    say(t('crystal.tip.quiz'));
    scene.showStructure('nacl');
    st.order ??= M.quiz.map((_, i) => i);
    const qi = st.order[st.q], q = M.quiz[qi];
    ui.question.hidden = false;
    ui.qText.textContent = `${t('crystal.quiz.progress', { n: st.q + 1, total: M.quiz.length })} — ${pick(q.q)}`;
    ui.choices.innerHTML = ''; ui.choices.classList.add('cr-choices--tall');
    shuffle(q.options.map((o, i) => ({ o, i }))).forEach(({ o, i }) => ui.choices.appendChild(button(pick(o), () => {
      if (i === q.answer) {
        sound.correct();
        if (st.q + 1 < M.quiz.length) { st.q++; render(); setFeedback('ok', t('lewis.ok')); } else { complete(true); }
      } else { st.wrong++; sound.wrong(); setFeedback('bad', t('lewis.bad'), pick(q.hint)); }
    }, 'sticker cr-choice')));
  }

  // --- done: explore the finished lattice
  function complete(correct) {
    if (st.phase === 'done') return;
    st.phase = 'done';
    st.result = { pts: correct ? pointsFor(st.wrong) : 0, shown: !correct };
    run.score += st.result.pts; run.results[run.idx] = st.result;
    render();
    if (correct) sound.correct();
  }

  function phaseDone() {
    const r = st.result, M = data.materials;
    ui.actions.innerHTML = '';
    if (r.shown) setFeedback('', '', t('lewis.reveal.shown')); else setFeedback('ok', t('lewis.ok'), `+${r.pts}`);
    const last = run.idx === run.items.length - 1;
    ui.actions.append(button(last ? t('lewis.finish') : t('lewis.next'), goNext, 'btn-start btn-start--small'));
    ui.info.hidden = false;
    ui.info.appendChild(el('h3', '', t('crystal.info.title')));
    if (item.kind === 'match' || item.kind === 'quiz') {
      ui.formula.textContent = '⬡';
      ui.task.textContent = t(item.kind === 'match' ? 'crystal.task.match.done' : 'crystal.task.quiz.done');
      scene.showStructure(item.kind === 'match' ? st.tab : 'nacl');
      if (item.kind === 'match') {
        const ul = el('ul', 'hy-info__list');
        M.structures.forEach(s => { const li = el('li'); li.append(el('b', '', `${pick(s.name)} — ${pick(s.bonding)}. `), document.createTextNode(pick(s.why))); ul.appendChild(li); });
        ui.info.appendChild(ul);
        const tabs = el('div', 'cr-tabs');
        M.structures.forEach(s => { const b = el('button', 'sticker cr-tab', pick(s.name)); b.type = 'button'; b.dataset.target = ''; b.setAttribute('aria-pressed', String(st.tab === s.id)); b.addEventListener('click', () => { st.tab = s.id; sound.select(); scene.showStructure(s.id); tabs.querySelectorAll('.cr-tab').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }); tabs.appendChild(b); });
        ui.overlay.appendChild(tabs);
      } else ui.info.appendChild(el('p', 'hy-info__text', t('crystal.quiz.done.note')));
      return;
    }
    const type = item.kind === 'build' ? item.id : st.latt, occ = occOf();
    const ppc = particlesPerCell(occ), cn = coordination(occ, type === 'nacl' ? 'na' : null);
    ui.formula.textContent = abbr(type);
    ui.task.textContent = t('crystal.task.done', { name: latticeName(type), abbr: abbr(type) });
    scene.setSites([]); scene.setParticles(occ);
    const ppcText = type === 'nacl' ? `${ppc.na} Na⁺ + ${ppc.cl} Cl⁻` : `${ppc.p}`;
    ui.info.appendChild(el('p', 'hy-info__text', pick(data.cells[type].note)));
    const ul = el('ul', 'hy-info__list');
    ul.appendChild(el('li', '', `${t('crystal.facts.ppc')}: ${ppcText}${type === 'nacl' ? '' : ` (${shareFormula(occ)})`}`));
    ul.appendChild(el('li', '', `${t('crystal.facts.cn')}: ${type === 'nacl' ? '6 : 6' : cn}`));
    ul.appendChild(el('li', '', `${t('crystal.facts.example')}: ${pick(data.cells[type].example)}`));
    ui.info.appendChild(ul);
    const bar = el('div', 'cr-toggles');
    const btn = (label, fn) => { const b = el('button', 'sticker', label); b.type = 'button'; b.dataset.target = ''; b.addEventListener('click', () => { sound.select(); fn(); }); bar.appendChild(b); };
    btn(t('crystal.view.one'), () => { scene.clearLattice(); });
    [2, 3].forEach(n => btn(t('crystal.view.n', { n }), () => { const total = scene.repeat(occ, n); setFeedback('ok', t('crystal.repeat.title'), t('crystal.repeat.note', { n: total })); }));
    btn(t('crystal.view.neighbours'), () => scene.showNeighbours(occ, type === 'nacl' ? 'na' : null));
    ui.overlay.appendChild(bar);
    say(item.kind === 'build' && item.id === 'nacl' ? t('crystal.tip.nacl') : t('crystal.tip.done'));
  }

  // ---------------------------------------------------------------- end of level
  function finish() {
    if (!alive || run.finished) return;
    run.finished = true; teardown();
    const max = run.items.length * 10;
    const best = { ...(settings.crystalBest || {}) };
    const record = run.score > (best[run.level] || 0);
    if (record) { best[run.level] = run.score; settings.crystalBest = best; }
    host.innerHTML = '';
    const card = el('section', 'lw-center glass');
    card.append(el('h2', '', t('lewis.done.title')), el('div', 'lw-bignum', String(run.score)), el('p', '', t('lewis.done.score', { score: run.score, max })));
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

  return () => { alive = false; teardown(); host.innerHTML = ''; delete document.body.dataset.ptHighlight; };
}
