// Activity 2 — Hybridization Lab (Easy: carbon, Medium: beyond carbon, Hard: drug molecules).
// Flow: count electron groups → mix s and p orbitals → label σ/π bonds → explore the 3D shape.
// Logic is in rules.js; the 2D structure, orbital mixer and 3D viewer are separate modules.
import { settings } from '../../store.js';
import { guardLogos } from '../../ui.js';
import { pointsFor } from '../lewis/rules.js';
import {
  groupsOf, hybridOf, hybridText, leftoverP, shapeOf, piBondsAround, evaluateCount, evaluateMix, evaluatePi, explainLabel,
  markedAtoms, neighbours, atomOf, SUMMARY, HYBRID_BY_GROUPS,
} from './rules.js';
import { createDiagram } from './diagram.js';
import { createMixer } from './mixer.js';
import { createViewer } from './viewer3d.js';

const LEVELS = ['easy', 'medium', 'hard'];
let dataPromise;
const loadData = () => (dataPromise ??= Promise.all(['molecules', 'levels'].map(n =>
  fetch(`data/hybrid/${n}.json`).then(r => { if (!r.ok) throw new Error(n); return r.json(); })))
  .then(([molecules, levels]) => ({ molecules, levels })));

function loadCss() {
  for (const [id, href] of [['lewis-css', 'css/lewis.css'], ['hybrid-css', 'css/hybrid.css']]) {
    if (document.getElementById(id)) continue;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet'; link.href = href;
    document.head.appendChild(link);
  }
}
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const sub = f => f.replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);

export default function mount(host, ctx) {
  const { t, sound } = ctx;
  const lang = ctx.language === 'ms' ? 'ms' : 'en';
  const pick = o => o?.[lang] ?? o?.en ?? '';
  let alive = true, data = null, run = null, ui = {}, st = null, item = null, mol = null;
  let diagram = null, mixer = null, viewer = null;

  loadCss();
  host.innerHTML = '<p class="lw-loading">…</p>';
  loadData().then(d => { if (alive) { data = d; startLevel(LEVELS.includes(ctx.level) ? ctx.level : 'easy'); } })
    .catch(() => { host.innerHTML = ''; host.appendChild(el('p', 'lw-loading', t('hybrid.error'))); });

  // ---------------------------------------------------------------- run
  function startLevel(level) {
    run = {
      level, score: 0, finished: false, idx: 0, results: [], states: [],
      items: data.levels[level].items.map(ref => { const [kind, id] = ref.split(':'); return { kind, id, mol: data.molecules[id] }; }),
    };
    buildShell();
    render();
  }

  function buildShell() {
    teardown();
    host.innerHTML = '';
    const root = el('section', 'lw hy');
    root.innerHTML = `
      <header class="lw-top">
        <div class="lw-badge"><img src="brand/logos/chemistry-with-dr-nam-logo.jpg" alt="Chemistry with Dr. NAM" data-logo="Chemistry with Dr. NAM badge"></div>
        <h2 class="lw-title"><span></span><span class="tag"></span></h2>
        <ol class="lw-progress" aria-label="progress"></ol>
        <div class="lw-score"><span></span><b>0</b></div>
      </header>
      <div class="lw-main">
        <div class="lw-boardwrap"><div class="hy-stage"></div></div>
        <aside class="lw-side">
          <div class="lw-nav"></div>
          <div class="lw-card sticker-static lw-task-card"><div class="lw-formula"></div><p class="lw-task"></p><p class="hy-lecturer" hidden></p></div>
          <div class="lw-feedback glass" aria-live="polite" data-kind=""></div>
          <div class="lw-actions"></div>
          <div class="hy-pick" hidden></div>
          <div class="lw-reveal hy-info" hidden></div>
          <div class="lw-card sticker-static hy-table-card"></div>
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
      root, stage: q('.hy-stage'), formula: q('.lw-formula'), task: q('.lw-task'), lecturer: q('.hy-lecturer'), nav: q('.lw-nav'),
      feedback: q('.lw-feedback'), actions: q('.lw-actions'), picker: q('.hy-pick'), info: q('.hy-info'), table: q('.hy-table-card'),
      bubble: q('.drnam-says__text'), progress: q('.lw-progress'), score: q('.lw-score b'), note: q('.lw-note'),
    };
    q('.lw-title span').textContent = t('activity.hybrid.title');
    q('.lw-title .tag').textContent = t(`level.${run.level}`);
    q('.lw-score span').textContent = t('lewis.score');
    ui.note.textContent = t('lewis.touchhint') + (ctx.players === 'duo' ? ' ' + t('lewis.duo') : '');
  }

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

  function teardown() {
    diagram?.destroy(); mixer?.destroy(); viewer?.destroy();
    diagram = mixer = viewer = null;
  }

  // ---------------------------------------------------------------- one item
  function save() {
    if (!st) return;
    if (st.phase === 'count' && diagram) st.picked = diagram.picked();
    if (st.phase === 'mix' && mixer) st.mixSnap = mixer.snapshot();
    if (st.phase === 'pi' && diagram) st.labels = diagram.labels();
  }
  function show(i) {
    if (!alive || i < 0 || i >= run.items.length) return;
    save(); run.idx = i; render();
  }
  function goNext() {
    if (run.idx < run.items.length - 1) show(run.idx + 1);
    else { save(); finish(); }
  }

  function render() {
    if (!alive) return;
    item = run.items[run.idx];
    mol = item.mol;
    st = run.states[run.idx] ??= {
      phase: item.kind === 'drug' ? 'label' : 'count', wrong: 0, picked: new Set(), mixSnap: null, labels: new Map(), atomLabels: new Map(), result: null,
    };
    teardown();
    renderHeader();
    ui.actions.innerHTML = '';
    ui.picker.hidden = true; ui.picker.innerHTML = '';
    ui.info.hidden = true; ui.info.innerHTML = '';
    ui.stage.className = 'hy-stage';
    ui.stage.innerHTML = '';
    setFeedback('', '');
    renderTable();
    ui.formula.textContent = sub(mol.formula);
    const c = mol.central ? atomOf(mol, mol.central) : null;
    ui.lecturer.hidden = !ctx.lecturer || !c;
    if (ctx.lecturer && c) ui.lecturer.textContent = `${t('lewis.reveal.lecturer')}: ${groupsOf(mol, c.id)} → ${hybridText(hybridOf(mol, c.id))}, ${pick(shapeOf(mol, c.id).name)} (${shapeOf(mol, c.id).angle})`;
    document.body.dataset.ptHighlight = '';
    ({ count: phaseCount, mix: phaseMix, pi: phasePi, label: phaseLabel, done: phaseDone })[st.phase]();
  }

  const names = () => ({ name: pick(mol.name), sym: mol.central ? atomOf(mol, mol.central).el : '' });

  // --- Step 1: count the electron groups
  function phaseCount() {
    const { name, sym } = names();
    ui.task.textContent = t('hybrid.task.count', { name, sym });
    say(t('hybrid.tip.count'));
    ui.stage.innerHTML = '<div class="hy-counter"></div><div class="hy-stage__body"></div>';
    const counter = ui.stage.querySelector('.hy-counter');
    const upd = set => { counter.textContent = t('hybrid.counter', { n: set.size }); };
    diagram = createDiagram(ui.stage.querySelector('.hy-stage__body'), mol, { mode: 'count', central: mol.central, onChange: e => { if (e.picked) { st.picked = e.picked; upd(e.picked); ui.feedback.dataset.kind = ''; } } });
    diagram.setPicked(st.picked); upd(st.picked);
    ui.actions.append(button(t('hybrid.check.count'), onCount, 'btn-start btn-start--small'), button(t('lewis.reset'), () => { diagram.reset(); setFeedback('', ''); }));
    if (st.wrong >= 2) ui.actions.append(button(t('lewis.show'), () => complete(false)));
  }
  function onCount() {
    const r = evaluateCount(mol, mol.central, diagram.picked());
    if (r.ok) {
      sound.correct();
      st.phase = 'mix'; st.groups = r.groups;
      render();
      setFeedback('ok', t('lewis.ok'), t('hybrid.counted.ok', { n: r.groups, sym: names().sym }));
      return;
    }
    st.wrong++; sound.wrong();
    const key = { decoy: 'hybrid.hint.decoy', double: 'hybrid.hint.double', 'missed-lp': 'hybrid.hint.missed.lp', 'missed-bond': 'hybrid.hint.missed.bond', 'missed-h': 'hybrid.hint.missed.h' }[r.code];
    setFeedback('bad', t('lewis.bad'), `${t('hybrid.counted', { n: diagram.picked().size })} ${t(key, r)}`);
    if (st.wrong === 2) ui.actions.append(button(t('lewis.show'), () => complete(false)));
  }

  // --- Step 2: mix the orbitals
  function phaseMix() {
    const { sym } = names(), g = groupsOf(mol, mol.central);
    ui.task.textContent = t('hybrid.task.mix', { sym, n: g });
    say(t('hybrid.tip.mix'));
    mixer = createMixer(ui.stage, { sound, onChange: () => { ui.feedback.dataset.kind = ''; } });
    mixer.setHint(t('hybrid.mixer.hint'));
    if (st.mixSnap) mixer.restore(st.mixSnap);
    if (st.mixed) { mixer.restore(st.mixSnap); mixer.mix(g, hybridText(hybridOf(mol, mol.central))); mixedActions(); return; }
    ui.actions.append(button(t('hybrid.mix'), onMix, 'btn-start btn-start--small'), button(t('lewis.reset'), () => { mixer.reset(); setFeedback('', ''); }));
    if (st.wrong >= 2) ui.actions.append(button(t('lewis.show'), () => complete(false)));
  }
  function onMix() {
    const g = groupsOf(mol, mol.central), c = mixer.counts(), r = evaluateMix(g, c.s, c.p, c.d);
    if (!r.ok) {
      st.wrong++; sound.wrong();
      const key = { 'no-s': 'hybrid.hint.no-s', 'many-s': 'hybrid.hint.no-s', 'few-p': 'hybrid.hint.few-p', 'many-p': 'hybrid.hint.many-p', d: 'hybrid.hint.d' }[r.code];
      setFeedback('bad', t('lewis.bad'), t(key, r));
      if (st.wrong === 2) ui.actions.append(button(t('lewis.show'), () => complete(false)));
      return;
    }
    sound.correct();
    st.mixSnap = mixer.snapshot(); st.mixed = true;
    mixer.mix(g, hybridText(r.hybrid));
    const left = leftoverP(mol, mol.central);
    setFeedback('ok', t('lewis.ok'), `${t('hybrid.mixed.ok', { n: g, p0: g - 1, h: hybridText(r.hybrid) })} ${left ? t('hybrid.mixed.left', { p: left }) : t('hybrid.mixed.none')}`);
    mixedActions();
  }
  function mixedActions() {
    ui.actions.innerHTML = '';
    const left = leftoverP(mol, mol.central);
    ui.actions.append(button(left ? t('hybrid.next.pi') : t('hybrid.next.done'), () => {
      if (left) { st.phase = 'pi'; render(); } else complete(true);
    }, 'btn-start btn-start--small'));
  }

  // --- Step 3: label σ and π bonds
  function phasePi() {
    const { sym } = names(), left = leftoverP(mol, mol.central), pi = piBondsAround(mol, mol.central);
    ui.stage.innerHTML = '<div class="hy-stage__body"></div>';
    const body = ui.stage.querySelector('.hy-stage__body');
    if (!pi) {
      ui.task.textContent = t('hybrid.task.pi.none', { sym, k: left });
      say(t('hybrid.tip.pi.none'));
      diagram = createDiagram(body, mol, { mode: 'static', central: mol.central });
      ui.stage.insertAdjacentHTML('beforeend', `<div class="hy-ps">${Array(left).fill('<span class="hy-ps__p"></span>').join('')}<b>${t('hybrid.empty.p')}</b></div>`);
      ui.actions.append(button(t('hybrid.next.done'), () => complete(true), 'btn-start btn-start--small'));
      return;
    }
    ui.task.textContent = t('hybrid.task.pi', { sym, k: left });
    say(t('hybrid.tip.pi'));
    diagram = createDiagram(body, mol, { mode: 'pi', central: mol.central, onChange: e => { if (e.labels) { st.labels = e.labels; ui.feedback.dataset.kind = ''; } } });
    diagram.setLabels(st.labels);
    ui.actions.append(button(t('hybrid.check.pi'), onPi, 'btn-start btn-start--small'), button(t('lewis.reset'), () => { diagram.reset(); setFeedback('', ''); }));
    if (st.wrong >= 2) ui.actions.append(button(t('lewis.show'), () => complete(false)));
  }
  function onPi() {
    const r = evaluatePi(mol, mol.central, diagram.labels());
    if (r.ok) { sound.correct(); complete(true); return; }
    st.wrong++; sound.wrong();
    setFeedback('bad', t('lewis.bad'), r.code === 'unlabelled' ? t('hybrid.hint.unlabelled') : t('hybrid.hint.sigma', { a: r.a, b: r.b, order: r.order, pi: r.order - 1 }));
    if (st.wrong === 2) ui.actions.append(button(t('lewis.show'), () => complete(false)));
  }

  // --- Hard: label every marked atom
  function phaseLabel() {
    ui.task.textContent = t('hybrid.task.label', { name: pick(mol.name) });
    say(t('hybrid.tip.label'));
    ui.stage.innerHTML = '<div class="hy-stage__body"></div>';
    diagram = createDiagram(ui.stage.querySelector('.hy-stage__body'), mol, { mode: 'label', onChange: e => { if (e.atom) selectAtom(e.atom); } });
    st.atomLabels.forEach((lab, id) => diagram.setAtomLabel(id, hybridText(lab), ''));
    ui.actions.append(button(t('hybrid.check.label'), onLabels, 'btn-start btn-start--small'), button(t('lewis.reset'), () => { st.atomLabels.clear(); markedAtoms(mol).forEach(a => diagram.setAtomLabel(a.id, '', '')); setFeedback('', ''); }));
    if (st.wrong >= 2) ui.actions.append(button(t('lewis.show'), () => complete(false)));
    const first = markedAtoms(mol)[0]; selectAtom(first.id);
  }
  let selected = null;
  function selectAtom(id) {
    selected = id;
    diagram.selectAtom(id);
    const a = atomOf(mol, id);
    ui.picker.hidden = false; ui.picker.innerHTML = '';
    ui.picker.appendChild(el('p', 'hy-pick__q', t('hybrid.pick.q', { n: a.mark, sym: a.el })));
    const row = el('div', 'lw-choices');
    for (const h of ['sp', 'sp2', 'sp3']) {
      const b = button(hybridText(h), () => { st.atomLabels.set(id, h); diagram.setAtomLabel(id, hybridText(h), ''); selectAtom(id); }, 'sticker lw-formula-choice');
      if (st.atomLabels.get(id) === h) b.setAttribute('aria-checked', 'true');
      row.appendChild(b);
    }
    ui.picker.appendChild(row);
  }
  function onLabels() {
    const marks = markedAtoms(mol);
    const missing = marks.filter(a => !st.atomLabels.has(a.id));
    if (missing.length) { st.wrong++; sound.wrong(); setFeedback('bad', t('lewis.bad'), t('hybrid.hint.label.missing', { n: missing.map(a => a.mark).join(', ') })); return; }
    const wrong = marks.filter(a => st.atomLabels.get(a.id) !== hybridOf(mol, a.id));
    marks.forEach(a => diagram.setAtomLabel(a.id, hybridText(st.atomLabels.get(a.id)), wrong.includes(a) ? 'bad' : 'ok'));
    if (!wrong.length) { sound.correct(); complete(true); return; }
    st.wrong++; sound.wrong();
    const lines = wrong.map(a => labelExplain(a));
    setFeedback('bad', t('lewis.bad'), lines.join('\n'));
    if (st.wrong === 2) ui.actions.append(button(t('lewis.show'), () => complete(false)));
  }
  function labelExplain(a) {
    const x = explainLabel(mol, a.id, st.atomLabels.get(a.id));
    const miss = x.miss ? ' ' + t(`hybrid.miss.${x.miss}`) : '';
    return `${a.mark} (${x.sym}): ${x.parts} = ${x.real} → ${hybridText(x.hybrid)}.${miss}`;
  }

  // --- Done: result, summary table, 3D view
  function complete(correct) {
    if (st.phase === 'done') return;
    st.phase = 'done';
    st.result = { pts: correct ? pointsFor(st.wrong) : 0, shown: !correct };
    run.score += st.result.pts;
    run.results[run.idx] = st.result;
    render();
    if (correct) sound.correct();
  }

  function phaseDone() {
    const r = st.result;
    if (item.kind === 'drug') {
      ui.task.textContent = t('hybrid.task.drug.done', { name: pick(mol.name) });
      ui.stage.innerHTML = '<div class="hy-stage__body"></div>';
      diagram = createDiagram(ui.stage.querySelector('.hy-stage__body'), mol, { mode: 'static' });
      markedAtoms(mol).forEach(a => diagram.setAtomLabel(a.id, hybridText(hybridOf(mol, a.id)), 'ok'));
      const info = [pick(mol.note)];
      if (mol.properties) info.push(`pKa ${mol.properties.pKa} · ${pick(mol.properties.use)}`);
      showInfo(markedAtoms(mol).map(a => { const x = explainLabel(mol, a.id, hybridOf(mol, a.id)); return `${a.mark} (${x.sym}): ${x.parts} = ${x.real} → ${hybridText(x.hybrid)}`; }), info.join(' '));
    } else {
      const c = atomOf(mol, mol.central), sh = shapeOf(mol, mol.central);
      ui.task.textContent = t('hybrid.task.done', { name: pick(mol.name), sym: c.el, n: groupsOf(mol, c.id), h: hybridText(hybridOf(mol, c.id)), shape: pick(sh.name), angle: sh.angle });
      ui.stage.innerHTML = '<div class="hy-stage__body"></div><div class="hy-toggles"></div>';
      const body = ui.stage.querySelector('.hy-stage__body');
      viewer = createViewer(body, mol, { reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
      if (viewer) {
        const tg = ui.stage.querySelector('.hy-toggles');
        const toggle = (label, on, fn) => { const b = el('button', 'sticker', label); b.type = 'button'; b.dataset.target = ''; b.setAttribute('aria-pressed', String(on)); b.addEventListener('click', () => { on = !on; b.setAttribute('aria-pressed', String(on)); sound.select(); fn(on); }); tg.appendChild(b); };
        toggle(t('hybrid.view.lobes'), true, viewer.setLobes);
        toggle(t('hybrid.view.pi'), true, viewer.setPi);
        toggle(t('hybrid.view.angle'), false, viewer.setAngle);
        ui.stage.insertAdjacentHTML('beforeend', `<p class="hy-viewer__hint">${t('hybrid.view.hint')}</p>`);
      } else {
        diagram = createDiagram(body, mol, { mode: 'static', central: mol.central });
        ui.stage.insertAdjacentHTML('beforeend', `<p class="hy-viewer__hint">${t('hybrid.view.nowebgl')}</p>`);
      }
      showInfo([], pick(mol.note));
    }
    ui.actions.innerHTML = '';
    if (r.shown) setFeedback('', '', t('lewis.reveal.shown')); else setFeedback('ok', t('lewis.ok'), `+${r.pts}`);
    const last = run.idx === run.items.length - 1;
    ui.actions.append(button(last ? t('lewis.finish') : t('lewis.next'), goNext, 'btn-start btn-start--small'), button(t('lewis.why'), toggleWhy));
    say(pick(mol.note));
    renderTable(true);
  }

  function showInfo(lines, text) {
    ui.info.hidden = false; ui.info.innerHTML = '';
    ui.info.appendChild(el('h3', '', t('hybrid.info.title')));
    ui.info.appendChild(el('p', 'hy-info__text', text));
    if (lines.length) { const ul = el('ul', 'hy-info__list'); lines.forEach(l => ul.appendChild(el('li', '', l))); ui.info.appendChild(ul); }
  }
  function toggleWhy() {
    const open = ui.info.querySelector('.hy-why');
    if (open) { open.remove(); return; }
    const w = el('div', 'hy-why');
    w.appendChild(el('h4', '', t('hybrid.why.title')));
    ['1', '2', '3'].forEach(k => w.appendChild(el('p', '', `${k}. ${t(`hybrid.why.${k}`)}`)));
    if (run.level === 'hard') w.appendChild(el('p', 'hy-why__limit', t('hybrid.limits')));
    ui.info.hidden = false; ui.info.appendChild(w);
  }

  // The summary table is always on screen; the row for this item's answer is highlighted once it is known.
  function renderTable(reveal = false) {
    const g = mol?.central && (reveal || ctx.lecturer) ? groupsOf(mol, mol.central) : null;
    const rows = SUMMARY.map(r => `<tr${r.groups === g ? ' class="is-answer"' : ''}><td>${r.groups}</td><td>${hybridText(r.hybrid)}</td><td>${pick(r.shape)}</td></tr>`).join('');
    ui.table.innerHTML = `<table class="hy-table"><caption>${t('hybrid.table.title')}</caption><thead><tr><th>${t('hybrid.table.groups')}</th><th>${t('hybrid.table.hybrid')}</th><th>${t('hybrid.table.shape')}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // ---------------------------------------------------------------- end of level
  function finish() {
    if (!alive || run.finished) return;
    run.finished = true;
    teardown();
    const max = run.items.length * 10;
    const best = { ...(settings.hybridBest || {}) };
    const record = run.score > (best[run.level] || 0);
    if (record) { best[run.level] = run.score; settings.hybridBest = best; }
    host.innerHTML = '';
    const card = el('section', 'lw-center glass');
    card.append(el('h2', '', t('lewis.done.title')), el('div', 'lw-bignum', String(run.score)), el('p', '', t('lewis.done.score', { score: run.score, max })));
    card.appendChild(el('p', '', record ? t('lewis.done.record') : t('lewis.best', { n: best[run.level] || 0 })));
    if (run.level === 'hard') card.appendChild(el('p', 'hy-limits', t('hybrid.limits')));
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
