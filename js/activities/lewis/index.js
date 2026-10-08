// Activity 1 — Lewis Structure Builder (Easy, Medium, Hard + mixed timed challenge).
// Flow and scoring live here; geometry and answer checking are in rules.js; the drag board is in board.js.
import { settings } from '../../store.js';
import { guardLogos, toast } from '../../ui.js';
import {
  buildAtom, buildCovalent, buildIonic, evaluate, pointsFor, subscript, chargeText, uniqueIons, CHARGE_CHOICES,
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
  let run = null; // { level, items, idx, score, results, stage:'main'|'challenge', seconds, endAt }

  function resolve(ref) {
    if (ref.startsWith('atom:')) return { type: 'atom', ref, element: ref.slice(5) };
    const mol = data.molecules[ref.slice(4)];
    return { type: mol.kind === 'ionic' ? 'ionic' : 'molecule', ref, mol };
  }

  function startLevel(level) {
    stopTimer();
    const cfg = data.levels[level];
    run = { level, cfg, items: cfg.items.map(resolve), idx: 0, score: 0, results: [], stage: 'main', max: cfg.items.length * 10 };
    buildShell();
    showItem();
  }

  function startChallenge() {
    const c = run.cfg.challenge;
    run.stage = 'challenge';
    run.items = shuffle(c.items).slice(0, c.count ?? c.items.length).map(resolve);
    run.idx = 0;
    run.results = [];
    run.max += run.items.length * 10;
    run.seconds = c.seconds;
    run.endAt = Date.now() + c.seconds * 1000;
    buildShell();
    ui.timer.hidden = false;
    timer = setInterval(tick, 200);
    tick();
    showItem();
  }

  function tick() {
    const left = Math.max(0, (run.endAt - Date.now()) / 1000);
    ui.timerLabel.textContent = t('lewis.time', { s: Math.ceil(left) });
    ui.timerBar.style.transform = `scaleX(${left / run.seconds})`;
    ui.timer.classList.toggle('is-low', left < 30);
    if (left <= 0) { toast(t('lewis.timeup')); finish(true); }
  }

  // ------------------------------------------------------------------ screen skeleton
  let ui = {};
  function buildShell() {
    board?.destroy(); board = null;
    host.innerHTML = '';
    const root = el('section', 'lw');
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
      root, boardHost: q('.lw-board-host'), formula: q('.lw-formula'), task: q('.lw-task'),
      question: q('.lw-question'), qText: q('.lw-question p'), choices: q('.lw-choices'),
      feedback: q('.lw-feedback'), reveal: q('.lw-reveal'), actions: q('.lw-actions'),
      bubble: q('.drnam-says__text'), progress: q('.lw-progress'), score: q('.lw-score b'), note: q('.lw-note'),
      timer: q('.lw-timer'), timerBar: q('.lw-timer__bar i'), timerLabel: q('.lw-timer__label'),
    };
    q('.lw-title span').textContent = run.stage === 'challenge' ? t('lewis.challenge.title') : t('activity.lewis.title');
    q('.lw-title .tag').textContent = t(`level.${run.level}`);
    q('.lw-score span').textContent = t('lewis.score');
    ui.timer.hidden = run.stage !== 'challenge';
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
      else if (i === run.idx) li.classList.add('is-current');
      ui.progress.appendChild(li);
    });
    ui.score.textContent = String(run.score);
  }

  // ------------------------------------------------------------------ one item
  let item = null, model = null, wrong = 0, phase = 'build', ionQueue = [];

  function buildModel(it) {
    if (it.type === 'atom') return buildAtom(it.element, data.elements);
    return it.type === 'ionic' ? buildIonic(it.mol, data.elements) : buildCovalent(it.mol, data.elements);
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

  function showItem() {
    if (!alive) return;
    item = run.items[run.idx];
    wrong = 0;
    ionQueue = [];
    board?.destroy();
    model = buildModel(item);
    renderProgress();
    ui.reveal.hidden = true; ui.reveal.innerHTML = '';
    ui.question.hidden = true;
    setFeedback('', '');
    const countFirst = run.cfg.countQuestion && run.stage === 'main' && item.type === 'molecule';
    phase = countFirst ? 'count' : 'build';

    document.body.dataset.ptHighlight = [...new Set(model.atoms.map(a => a.el))].join(',');
    const sym = item.type === 'atom' ? item.element : null;
    ui.formula.textContent = item.type === 'atom' ? sym : subscript(item.mol.formula);
    ui.task.textContent = t(`lewis.task.${item.type === 'atom' ? 'atom' : item.type}`, {
      name: nameOf(item), sym, formula: item.mol ? subscript(item.mol.formula) : '',
    });
    const multi = item.mol?.bonds?.some(b => b.order > 1);
    say(t(item.type === 'atom' ? 'lewis.tip.atom' : item.type === 'ionic' ? 'lewis.tip.ionic' : multi ? 'lewis.tip.multiple' : 'lewis.tip.molecule'));

    board = createBoard(ui.boardHost, model, {
      sound, locked: countFirst,
      onChange: () => { ui.boardHost.dataset.state = ''; updateLeft(); },
    });

    ui.actions.innerHTML = '';
    if (phase === 'count') askCount();
    else buildActions();
    updateLeft();

    if (ctx.lecturer) showAnswer(true);
  }

  function updateLeft() {
    if (!ui.actions) return;
    const n = board.left();
    ui.leftLabel && (ui.leftLabel.textContent = model.kind === 'ionic' ? '' : t('lewis.left', { n }));
  }

  function buildActions() {
    ui.actions.innerHTML = '';
    ui.leftLabel = el('span', 'lw-left');
    ui.actions.append(
      button(t('lewis.check'), onCheck, 'btn-start btn-start--small'),
      button(t('lewis.reset'), () => { board.reset(); setFeedback('', ''); }),
    );
    if (run.stage === 'challenge') ui.actions.append(button(t('lewis.skip'), () => complete(false, true)));
    if (wrong >= 2 && run.stage === 'main') ui.actions.append(button(t('lewis.show'), () => complete(false, true)));
    ui.actions.append(ui.leftLabel);
    updateLeft();
  }

  // --- Medium: count total valence electrons first
  function askCount() {
    const total = model.tokens;
    const sum = model.atoms.map(a => `${a.el} (${a.valence})`).join(' + ') + ` = ${total}`;
    ui.question.hidden = false;
    ui.qText.textContent = t('lewis.count.q', { formula: subscript(item.mol.formula) });
    ui.choices.innerHTML = '';
    shuffle([total - 2, total, total + 2, total + 4].filter(n => n > 0)).forEach(n => {
      const b = button(String(n), () => {
        if (n === total) {
          ui.question.hidden = true;
          phase = 'build';
          board.unlock();
          setFeedback('', '', t('lewis.count.ok', { n: total }));
          buildActions();
        } else {
          wrong++;
          sound.wrong();
          setFeedback('bad', t('lewis.bad'), t('lewis.count.sum', { sum }));
        }
      });
      ui.choices.appendChild(b);
    });
  }

  // --- Check the build
  function onCheck() {
    if (phase !== 'build') return;
    const r = evaluate(model, board.filled(), board.sources());
    if (!r.ok) {
      wrong++;
      board.setState('bad');
      sound.wrong();
      const key = { 'atom-many': 'lewis.hint.atom.many', 'atom-few': 'lewis.hint.atom.few', many: 'lewis.hint.many', few: 'lewis.hint.few', unpaired: 'lewis.hint.unpaired', source: 'lewis.hint.source', 'ion-left': 'lewis.hint.ion' }[r.code];
      setFeedback('bad', t('lewis.bad'), t(key, r));
      if (wrong === 2) buildActions();
      return;
    }
    if (item.type === 'ionic' && run.cfg.chargeStep && run.stage === 'main') {
      board.setState('ok');
      board.showIons(model.ions);
      sound.correct();
      setFeedback('ok', t('lewis.ok'));
      askCharges();
    } else {
      if (item.type === 'ionic') board.showIons(model.ions);
      complete(true, false);
    }
  }

  // --- Hard: give each ion its charge
  function askCharges() {
    phase = 'charge';
    ionQueue = uniqueIons(model);
    ui.actions.innerHTML = '';
    nextCharge();
  }
  function nextCharge() {
    const ion = ionQueue[0];
    if (!ion) { ui.question.hidden = true; complete(true, false); return; }
    ui.question.hidden = false;
    ui.qText.textContent = t('lewis.task.charge', { sym: ion.el });
    ui.choices.innerHTML = '';
    CHARGE_CHOICES.forEach(c => {
      ui.choices.appendChild(button(`${ion.el}${chargeText(c)}`, () => {
        if (c === ion.charge) { ionQueue.shift(); setFeedback('ok', t('lewis.ok')); nextCharge(); return; }
        wrong++;
        sound.wrong();
        const n = Math.abs(ion.charge);
        setFeedback('bad', t('lewis.bad'), t(ion.charge > 0 ? 'lewis.hint.charge.metal' : 'lewis.hint.charge.non', { sym: ion.el, n }));
      }));
    });
  }

  // --- Item finished (correct, or answer shown / skipped)
  function complete(correct, shown) {
    if (phase === 'done') return;
    phase = 'done';
    ui.question.hidden = true;
    const skipped = shown && run.stage === 'challenge';
    const pts = correct ? pointsFor(wrong) : 0;
    run.score += pts;
    run.results[run.idx] = { pts, shown: !correct };
    renderProgress();
    if (correct) {
      board.setState('ok');
      sound.correct();
      setFeedback('ok', t('lewis.ok'), `+${pts}`);
    } else {
      board.reveal();
      sound.select();
      setFeedback('', '', skipped ? '' : t('lewis.reveal.shown'));
    }
    if (!skipped) showAnswer(false);
    const last = run.idx === run.items.length - 1;
    ui.actions.innerHTML = '';
    ui.actions.append(button(last ? t('lewis.finish') : t('lewis.next'), () => {
      if (last) return endStage();
      run.idx++; showItem();
    }, 'btn-start btn-start--small'));
    if (skipped && !last) { run.idx++; showItem(); }
    else if (skipped) endStage();
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
  function endStage() {
    if (run.stage === 'main' && run.cfg.challenge) return challengeIntro();
    finish(false);
  }

  function challengeIntro() {
    board?.destroy(); board = null;
    const c = run.cfg.challenge;
    host.innerHTML = '';
    const card = el('section', 'lw-center glass');
    card.append(el('h2', '', t('lewis.challenge.title')), el('p', '', t('lewis.challenge.intro', { n: c.count ?? c.items.length, s: c.seconds })));
    const actions = el('div', 'lw-actions');
    actions.append(button(t('lewis.challenge.start'), startChallenge, 'btn-start btn-start--small'));
    card.appendChild(actions);
    host.appendChild(card);
  }

  function finish(timeUp) {
    if (!alive || run.finished) return;
    run.finished = true;
    stopTimer();
    board?.destroy(); board = null;
    let bonus = 0;
    if (run.stage === 'challenge' && !timeUp && run.results.every(r => r?.pts > 0)) bonus = Math.floor(Math.max(0, (run.endAt - Date.now()) / 1000) / 10);
    run.score += bonus;
    const best = { ...(settings.lewisBest || {}) };
    const record = run.score > (best[run.level] || 0);
    if (record) { best[run.level] = run.score; settings.lewisBest = best; }

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
