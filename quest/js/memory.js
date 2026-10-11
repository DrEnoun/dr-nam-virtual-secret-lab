// World 1 — Lab Meadow: memory match. Flip cards to pair (or triple) names, formulae and shapes.
// Rules live in memory-logic.js and content in data/memory.json; this file is the screen.
import { newGame, flip, clearPending, starsForHearts, KIND_LABEL } from './memory-logic.js';
import { shapeSVG } from './shapes.js';
import { chargedHTML } from './diner-logic.js';
import { monsterSprite } from './monsters.js';
import { doodles } from '../../js/doodles.js';

const MASCOTS = ['water', 'nacl', 'ch4'];

export function createMemory({ $, levels, says, sound, onFinish, onExit }) {
  const grid = $('mem-grid'), mascotCv = $('mem-mascots'), mctx = mascotCv.getContext('2d');
  let g = null, level = null, timeLeft = 0, react = null, t = 0, raf = 0, last = 0, running = false;

  const frontHTML = c => {
    const label = `<span class="mem-card__kind">${KIND_LABEL[c.kind]}</span>`;
    if (c.kind === 'formula') return `${label}<b class="mem-card__main mem-card__formula">${chargedHTML(c.text)}</b>`;
    if (c.kind === 'shape') return `${label}${shapeSVG(c.shape)}<b class="mem-card__shape">${c.text}</b><small>${c.angle}</small>`;
    return `${label}<b class="mem-card__main">${c.text}</b>`;
  };
  const plain = c => (c.kind === 'formula' ? c.text.replace('^', ' charge ') : c.text);

  function renderHearts() {
    $('mem-hearts').innerHTML = [0, 1, 2].map(i => `<span class="${i < g.hearts ? '' : 'gone'}">${i < g.hearts ? '♥' : '♡'}</span>`).join('');
    $('mem-hearts').setAttribute('aria-label', `${g.hearts} of 3 hearts`);
  }
  function renderStatus() {
    $('mem-meta').textContent = `${level.boss ? 'Boss' : 'Level ' + level.id}: ${level.title} · Matched ${g.matches} of ${g.total}`;
    $('mem-coins').textContent = g.coins;
  }
  const el = uid => grid.querySelector(`[data-uid="${uid}"]`);
  const setOpen = (uid, open) => { const b = el(uid); b.dataset.open = String(open); const c = g.byUid[uid]; b.setAttribute('aria-label', open ? `${KIND_LABEL[c.kind].toLowerCase()} card: ${plain(c)}` : `Card ${uid + 1}, face down`); };

  function start(levelId) {
    level = levels.find(l => l.id === levelId);
    g = newGame(level); timeLeft = level.time || 0; react = null;
    grid.innerHTML = ''; grid.style.setProperty('--cols', g.cards.length > 10 ? 3 : 3);
    g.cards.forEach(c => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mem-card'; b.dataset.uid = c.uid; b.dataset.kind = c.kind; b.dataset.open = 'false';
      b.setAttribute('aria-label', `Card ${c.uid + 1}, face down`);
      b.innerHTML = `<span class="mem-card__inner"><span class="mem-card__face mem-card__back">${doodles.flask}<i>${c.uid + 1}</i></span><span class="mem-card__face mem-card__front">${frontHTML(c)}</span></span>`;
      b.onclick = () => tap(c.uid);
      grid.append(b);
    });
    $('mem-goal').textContent = level.goal || level.subtitle;
    $('mem-timer').hidden = !level.time;
    renderHearts(); renderStatus(); tick();
    says($('mem-says'), { text: level.tip });
    if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  function tap(uid) {
    if (!g) return;
    const res = flip(g, uid);
    if (res.type === 'ignore') return;
    sound.unlock(); sound.select(); setOpen(uid, true);
    if (res.type === 'match') {
      sound.correct(); react = { mood: 'cheer', until: t + 1.6 };
      setTimeout(() => res.cards.forEach(c => { el(c.uid).dataset.matched = 'true'; }), 350);
      says($('mem-says'), { text: res.set.fact, state: 'correct', status: `✓ Match! +${res.coins} coins.` });
      renderStatus();
      if (res.won) setTimeout(() => finish(true), 1100);
    } else if (res.type === 'mismatch') {
      res.cards.forEach(c => { el(c.uid).dataset.miss = 'true'; });
      if (res.careless) { sound.wrong(); react = { mood: 'sad', until: t + 1.8 }; renderHearts(); } else { sound.pop(); }
      says($('mem-says'), {
        text: res.facts.join(' '), state: res.careless ? 'wrong' : '',
        status: res.careless ? '✗ You had already seen these. −1 heart.' : 'Not a match, but now you know where they are!',
      });
      setTimeout(() => {
        res.cards.forEach(c => { setOpen(c.uid, false); delete el(c.uid).dataset.miss; });
        clearPending(g);
        if (res.over) finish(false, 'hearts');
      }, 1500);
    }
  }

  function finish(win, why) {
    if (!g) return;
    g.over = true; react = { mood: win ? 'cheer' : 'sad', until: t + 600 };
    const kind = g.group === 3 ? 'triples' : 'pairs';
    onFinish({
      win, hearts: g.hearts, coins: g.coins, xp: g.xp, levelId: level.id,
      title: win ? 'Level complete!' : why === 'time' ? 'Time’s up!' : 'Out of hearts',
      summary: win ? `You matched all ${g.total} ${kind} and earned ${g.coins} coins and ${g.xp} XP.`
        : `${why === 'time' ? 'The clock ran out' : 'You ran out of hearts'} after ${g.matches} of ${g.total} ${kind}. Try again: exploring new cards is free, so remember where you have seen each one.`,
    });
  }

  function tick() {
    if (!level || !level.time) return;
    const frac = Math.max(0, timeLeft / level.time), bar = $('mem-timer');
    bar.firstElementChild.style.transform = `scaleX(${frac})`; bar.dataset.low = String(frac < 0.25);
    bar.setAttribute('aria-valuenow', Math.round(frac * 100));
  }

  // mascots watch the game and react
  function drawMascots() {
    mctx.setTransform(3, 0, 0, 3, 0, 0); mctx.clearRect(0, 0, 320, 64); mctx.imageSmoothingEnabled = true;
    const rx = react && react.until > t ? react : null, low = g && level && level.time && !g.over && timeLeft / level.time < 0.25;
    const mood = rx ? rx.mood : low ? 'shock' : 'happy';
    MASCOTS.forEach((id, i) => {
      const x = 62 + i * 98, ph = i * 2;
      let dx = 0, dy = Math.sin(t * 2.2 + ph) * 1.6, sy = 1;
      if (mood === 'cheer') dy = -Math.abs(Math.sin(t * 7 + ph)) * 9; else if (mood === 'sad') { dx = Math.sin(t * 3 + ph) * 1.2; sy = 0.92; dy = 1; } else if (mood === 'shock') dx = (Math.floor(t * 22) % 2 ? 1 : -1) * 1.3;
      mctx.save(); mctx.translate(x + dx, 52 + dy); mctx.scale(1, sy); const sp = monsterSprite(id, mood); mctx.drawImage(sp, -24, -40, 48, 40); mctx.restore();
      if (mood === 'cheer') for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2.1 + ph, px = x + Math.cos(a) * 26, py = 24 + Math.sin(a) * 10; mctx.fillStyle = k % 2 ? '#ffffff' : '#d4ff3a'; mctx.fillRect(px - 2, py, 5, 1.6); mctx.fillRect(px - 0.8, py - 2, 1.6, 5); }
    });
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
    if (g && !g.over && level.time) {
      timeLeft -= dt; tick();
      if (timeLeft <= 0) { timeLeft = 0; tick(); finish(false, 'time'); }
    }
    drawMascots();
    raf = requestAnimationFrame(frame);
  }

  $('mem-quit').onclick = () => { stop(); onExit(); };
  function stop() { running = false; cancelAnimationFrame(raf); if (g) g.over = true; }
  return { start, stop };
}
