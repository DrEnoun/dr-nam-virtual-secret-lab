// 3-step gesture tutorial: Aim → Shoot → Grab & drop. Works with a mouse too.
import { t } from './i18n.js';
import { doodles } from './doodles.js';
import { makeDraggable } from './drag.js';
import { sound } from './sound.js';

const STEPS = ['aim', 'shoot', 'grab'];

export function openTutorial({ onClose } = {}) {
  const overlay = document.getElementById('tutorial');
  const stage = document.getElementById('tut-stage');
  const next = document.getElementById('tut-next');
  const skip = document.getElementById('tut-skip');
  const dots = [...document.querySelectorAll('#tut-dots span')];
  let step = 0;
  let cleanup = () => {};

  const close = () => {
    cleanup();
    overlay.hidden = true;
    next.onclick = skip.onclick = null;
    onClose?.();
  };

  const success = () => {
    sound.correct();
    const s = document.createElement('div');
    s.className = 'success';
    s.textContent = t('tutorial.great');
    stage.appendChild(s);
    next.focus({ preventScroll: true });
  };

  const show = i => {
    cleanup();
    cleanup = () => {};
    step = i;
    stage.innerHTML = '';
    const key = STEPS[i];
    document.getElementById('tut-step').textContent = t('tutorial.step', { n: i + 1 });
    document.getElementById('tut-title').textContent = t(`tutorial.${key}.title`);
    document.getElementById('tut-body').textContent = t(`tutorial.${key}.body`);
    next.textContent = i === STEPS.length - 1 ? t('tutorial.done') : t('tutorial.next');
    dots.forEach((d, j) => d.classList.toggle('on', j <= i));
    cleanup = ({ aim: stepAim, shoot: stepShoot, grab: stepGrab })[key](stage, success) || (() => {});
  };

  next.onclick = () => (step < STEPS.length - 1 ? show(step + 1) : close());
  skip.onclick = close;
  overlay.hidden = false;
  show(0);
}

// Step 1: hold the crosshair on the target until its ring fills (or click it).
function stepAim(stage, success) {
  const b = bubble(stage, 50, 55, 'atom');
  b.insertAdjacentHTML('afterbegin', '<span class="charge" aria-hidden="true"></span>');
  let charge = 0, done = false, last = performance.now(), raf;
  const finish = () => {
    if (done) return;
    done = true;
    b.style.setProperty('--charge', 1);
    b.classList.add('is-done');
    success();
  };
  b.addEventListener('click', finish);
  const tick = now => {
    const dt = (now - last) / 1000; last = now;
    if (!done) {
      charge = b.classList.contains('is-aimed') ? Math.min(1, charge + dt / 1.0) : Math.max(0, charge - dt);
      b.style.setProperty('--charge', charge.toFixed(3));
      if (charge >= 1) finish();
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

// Step 2: shoot three targets that appear one after another.
function stepShoot(stage, success) {
  const spots = [[25, 40], [70, 30], [50, 72]];
  const icons = ['flask', 'molecule', 'capsule'];
  let hits = 0;
  const counter = document.createElement('span');
  counter.className = 'tag';
  counter.style.cssText = 'position:absolute;right:16px;top:16px';
  stage.appendChild(counter);
  const update = () => { counter.textContent = t('tutorial.hits', { n: hits }); };
  const spawn = () => {
    const [x, y] = spots[hits];
    const b = bubble(stage, x, y, icons[hits]);
    b.addEventListener('click', () => {
      if (b.classList.contains('is-hit')) return;
      b.classList.add('is-hit');
      sound.pop();
      hits++; update();
      setTimeout(() => b.remove(), 360);
      if (hits < 3) setTimeout(spawn, 250); else success();
    });
  };
  update(); spawn();
}

// Step 3: pinch the electron, move it into the shell, open the hand to drop.
function stepGrab(stage, success) {
  stage.insertAdjacentHTML('beforeend', `
    <div class="shell" id="tut-shell"><span class="shell__slot"></span><span class="shell__nucleus">H</span></div>
    <div class="electron" id="tut-electron" role="button" aria-label="electron">e⁻</div>`);
  const shell = stage.querySelector('#tut-shell');
  const electron = stage.querySelector('#tut-electron');
  let done = false;
  const overShell = (x, y) => {
    const r = shell.getBoundingClientRect();
    return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) < r.width / 2 + 10;
  };
  return makeDraggable(electron, {
    onMove: (x, y) => shell.classList.toggle('is-over', overShell(x, y)),
    onDrop: (x, y) => {
      shell.classList.remove('is-over');
      if (done) return;
      if (overShell(x, y)) {
        done = true;
        const slot = shell.querySelector('.shell__slot').getBoundingClientRect();
        const sr = stage.getBoundingClientRect();
        electron.style.left = `${slot.left + slot.width / 2 - electron.offsetWidth / 2 - sr.left}px`;
        electron.style.top = `${slot.top + slot.height / 2 - electron.offsetHeight / 2 - sr.top}px`;
        success();
      } else {
        sound.wrong();
      }
    },
  });
}

function bubble(stage, xPct, yPct, icon) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'sticker target-bubble';
  b.dataset.target = '';
  b.style.left = `${xPct}%`;
  b.style.top = `${yPct}%`;
  b.setAttribute('aria-label', 'target');
  b.innerHTML = doodles[icon];
  stage.appendChild(b);
  return b;
}
