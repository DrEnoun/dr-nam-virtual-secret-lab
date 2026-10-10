// Two players, one screen. RACE: the same questions in a left and a right half, first correct answer scores.
// CO-OP: one shared screen; one player builds, the other checks, and the roles swap every question.
// The rules live in duo-logic.js; this file builds the screen and wires the input (hands, mouse, touch, keyboard).
import { t } from './i18n.js';
import { sound } from './sound.js';
import { createRace, raceItem, raceNext, raceResult, coopRoles, coopAllows, zoneOf } from './duo-logic.js';

function loadCss() {
  for (const [id, href] of [['lewis-css', 'css/lewis.css'], ['duo-css', 'css/duo.css']]) {
    if (document.getElementById(id)) continue;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet'; link.href = href;
    document.head.appendChild(link);
  }
}
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

/** Mounts a two-player game. Returns one cleanup that always stops the current game (even after Play again). */
export default function mountDuo(host, mod, ctx) {
  let stop = null;
  const run = () => { stop?.(); stop = build(host, mod, ctx, run); };
  run();
  return () => stop?.();
}

function build(host, mod, ctx, onRestart) {
  loadCss();
  const mode = ctx.duoMode === 'coop' ? 'coop' : 'race';
  const engine = ctx.engine;
  const seed = Math.floor(Math.random() * 1e6);
  const cleanups = [];
  let timer = 0, alive = true, race = null;
  const apis = [null, null];

  host.innerHTML = '';
  const root = el('section', `duo duo--${mode}`);
  host.appendChild(root);

  // ---- the bar: scores (Race) or roles (Co-op), and how to play without a camera
  const bar = el('header', 'duo-bar');
  const pBox = n => { const b = el('div', `duo-p duo-p--${n}`); b.append(el('span', 'duo-p__name', t(`player.${n}`)), el('b', 'duo-p__score', mode === 'race' ? '0' : '')); return b; };
  const p1 = pBox(1), p2 = pBox(2);
  const mid = el('div', 'duo-mid');
  const modeLabel = el('span', 'duo-mode', t(mode === 'race' ? 'duo.race' : 'duo.coop'));
  const qLabel = el('span', 'duo-q');
  mid.append(modeLabel, qLabel);
  bar.append(p1, mid, p2);
  const help = el('p', 'duo-help', t('duo.help.kb'));
  root.append(bar, help);

  const make = n => {
    const half = el('div', `duo-half duo-half--${n}`);
    const h = el('div', 'duo-host');
    const lock = el('div', 'duo-lock'); lock.hidden = true;
    half.append(h, lock);
    return { half, h, lock };
  };

  const setScore = () => { p1.querySelector('.duo-p__score').textContent = String(race.scores[0]); p2.querySelector('.duo-p__score').textContent = String(race.scores[1]); };
  const bump = n => { const b = (n === 1 ? p1 : p2).querySelector('.duo-p__score'); b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); };

  function mountActivity(container, extra) {
    const duo = { mode, seed, ...extra };
    const cleanup = mod.default(container, { ...ctx, players: 'duo', duo });
    cleanups.push(cleanup);
  }

  // ================================================================ RACE
  if (mode === 'race') {
    const a = make(1), b = make(2), halves = el('div', 'duo-halves');
    halves.append(a.half, b.half);
    root.appendChild(halves);
    const locks = [a.lock, b.lock];
    engine.setSplit(true);

    const onReady = n => api => {
      apis[n - 1] = api;
      if (apis[0] && apis[1] && !race) {
        race = createRace(Math.min(apis[0].count(), apis[1].count()));
        setScore(); qLabel.textContent = t('duo.question', { n: 1, total: race.total });
      }
    };
    const unlockAll = () => locks.forEach(l => { l.hidden = true; l.innerHTML = ''; });
    const lockHalf = (n, text) => { const l = locks[n - 1]; l.hidden = false; l.innerHTML = ''; l.appendChild(el('p', 'duo-lock__msg', text)); };

    const advance = () => {
      if (!alive) return;
      unlockAll();
      const r = raceNext(race);
      if (r.done) return showResults();
      apis.forEach(x => x.goto(race.idx));
      qLabel.textContent = t('duo.question', { n: race.idx + 1, total: race.total });
    };
    const onItem = (n, info) => {
      if (!race) return;
      const r = raceItem(race, n, info);
      if (r.action === 'none') return;
      if (r.won) {
        sound.correct(); setScore(); bump(n);
        lockHalf(3 - n, t('duo.first', { n }));
      }
      if (r.action === 'advance') { clearTimeout(timer); timer = setTimeout(advance, r.delay); }
    };
    mountActivity(a.h, { player: 1, ready: onReady(1), itemDone: i => onItem(1, i) });
    mountActivity(b.h, { player: 2, ready: onReady(2), itemDone: i => onItem(2, i) });

    function showResults() {
      const res = raceResult(race);
      const card = el('div', 'duo-results');
      const inner = el('div', 'duo-results__card glass');
      inner.append(
        el('h2', '', res.winner ? t('duo.wins', { n: res.winner }) : t('duo.draw')),
        el('p', 'duo-results__scores', `${t('player.1')}: ${res.scores[0]}   ·   ${t('player.2')}: ${res.scores[1]}`),
      );
      const row = el('div', 'lw-actions');
      const btn = (label, fn, cls = 'sticker') => { const x = el('button', cls, label); x.type = 'button'; x.dataset.target = ''; x.addEventListener('click', () => { sound.select(); fn(); }); return x; };
      row.append(btn(t('lewis.done.again'), () => onRestart(), 'btn-start btn-start--small'), btn(t('lewis.done.menu'), () => { location.hash = ''; }));
      inner.appendChild(row); card.appendChild(inner); root.appendChild(card);
      sound.correct();
    }
  }

  // ================================================================ CO-OP
  if (mode === 'coop') {
    const c = el('div', 'duo-coop');
    const h = el('div', 'duo-host');
    c.appendChild(h); root.appendChild(c);
    engine.setSplit(false);
    const roleText = r => t(`duo.role.${r}`);
    const roleTag = (box, r) => { box.dataset.role = r; let s = box.querySelector('.duo-p__role'); if (!s) { s = el('span', 'duo-p__role'); box.appendChild(s); } s.textContent = roleText(r); };
    let roles = coopRoles(0), lastIdx = -1;
    engine.guard = (pid, kind, target) => coopAllows(roles[pid], kind, zoneOf(target));
    const apply = idx => {
      if (idx === lastIdx) return;
      lastIdx = idx; roles = coopRoles(idx);
      roleTag(p1, roles[1]); roleTag(p2, roles[2]);
      root.dataset.builder = roles[1] === 'builder' ? '1' : '2';
      qLabel.textContent = idx ? t('duo.swap') : t('duo.coop.start');
    };
    apply(0);
    mountActivity(h, { player: 0, ready: api => { apis[0] = api; }, itemDone: () => { sound.pop(); }, onShow: apply });
    help.textContent = `${t('duo.coop.help')} ${t('duo.help.kb')}`;
  }

  // ---- Player 2 without a camera: keyboard cursor. Player 1 uses the mouse or touch, or a hand.
  engine.startKeyboard(2);

  function cleanup() {
    alive = false; clearTimeout(timer);
    cleanups.forEach(c => c?.());
    engine.stopKeyboard(); engine.setSplit(false); engine.guard = null;
    host.innerHTML = '';
  }
  return cleanup;
}
