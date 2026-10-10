// Dr. NAM Virtual Secret Lab — app start-up, landing page and screen switching.
import { settings } from './store.js';
import { setLanguage, t, apply } from './i18n.js';
import { sound } from './sound.js';
import { GestureEngine } from './gestures/engine.js';
import { activities, byId } from './activities/registry.js';
import { doodles } from './doodles.js';
import { openTutorial } from './tutorial.js';
import { openPeriodicTable } from './periodic.js';
import { toast, pressFlash, guardLogos } from './ui.js';

const $ = sel => document.querySelector(sel);
const engine = new GestureEngine();
if (new URLSearchParams(location.search).has('debug')) window.__engine = engine; // for testing
let activityCleanup = null;
let tipTimer = null;

// ---------------------------------------------------------------- start-up
async function init() {
  sound.enabled = settings.sound;
  applyTheme();
  guardLogos();
  scatterDoodles();
  renderActivities();
  await setLanguage(settings.language);
  refreshTexts();
  syncSelections();
  wireLanding();
  wireToolbar();
  engine.setMode(settings.players === 'duo' ? 'duo' : 'single');
  startTips();
  registerServiceWorker();

  // Any first interaction unlocks audio (browsers require this).
  addEventListener('pointerdown', () => sound.unlock(), { once: true });

  // Camera was on last time? Try again (the browser remembers permission).
  if (settings.cameraWanted) engine.start();

  // Hand-selected buttons get a pressed flash, like a mouse click.
  document.addEventListener('player-select', e => pressFlash(e.target));

  // Lecturer mode: Shift + L (hidden from students)
  addEventListener('keydown', e => {
    if (e.shiftKey && e.key.toLowerCase() === 'l') {
      settings.lecturer = !settings.lecturer;
      $('#lecturer-badge').hidden = !settings.lecturer;
    }
  });
  $('#lecturer-badge').hidden = !settings.lecturer;

  addEventListener('hashchange', route);
  route();
}

// ---------------------------------------------------------------- landing page
function renderActivities() {
  const grid = $('#activity-grid');
  grid.innerHTML = '';
  for (const a of activities) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sticker act-card';
    b.dataset.target = '';
    b.dataset.activity = a.id;
    b.dataset.status = a.status;
    b.setAttribute('role', 'radio');
    b.innerHTML = `
      <span class="act-card__icon">${doodles[a.doodle] || ''}</span>
      <span class="act-card__topic" data-i18n="topic.${a.topic}"></span>
      <span class="act-card__title" data-i18n="activity.${a.id}.title"></span>
      <span class="act-card__desc" data-i18n="activity.${a.id}.desc"></span>
      ${a.status !== 'ready' ? '<span class="act-card__status"></span>' : ''}`;
    grid.appendChild(b);
  }
}

function refreshTexts() {
  apply(document);
  document.querySelectorAll('.act-card').forEach(card => {
    const a = byId(card.dataset.activity);
    const tag = card.querySelector('.act-card__status');
    if (tag) tag.textContent = a.phase ? t('status.phase', { n: a.phase }) : t('status.soon');
  });
  updateToolbarTexts();
  showTip();
  document.title = t('app.title');
}

function syncSelections() {
  const duoRow = $('#duo-mode-setting');
  if (duoRow) duoRow.hidden = settings.players !== 'duo';
  document.querySelectorAll('[data-setting]').forEach(group => {
    const key = group.dataset.setting;
    group.querySelectorAll('[data-value]').forEach(btn =>
      btn.setAttribute('aria-checked', String(settings[key] === btn.dataset.value)));
  });
  document.querySelectorAll('.act-card').forEach(card =>
    card.setAttribute('aria-checked', String(settings.activity === card.dataset.activity)));
}

function wireLanding() {
  document.querySelectorAll('[data-setting]').forEach(group => {
    group.addEventListener('click', async e => {
      const btn = e.target.closest('[data-value]');
      if (!btn) return;
      const key = group.dataset.setting;
      const value = btn.dataset.value;
      if (key === 'players' && value === 'battle') {
        sound.wrong();
        toast(t('battle.soon'));
        return;
      }
      sound.select();
      settings[key] = value;
      syncSelections();
      if (key === 'language') { await setLanguage(value); refreshTexts(); }
      if (key === 'players') engine.setMode(value);
    });
  });

  $('#activity-grid').addEventListener('click', e => {
    const card = e.target.closest('.act-card');
    if (!card) return;
    const a = byId(card.dataset.activity);
    if (a.status === 'locked') {
      sound.wrong();
      toast(`${t(`activity.${a.id}.title`)}: ${t('status.soon')}`);
      return;
    }
    sound.select();
    settings.activity = a.id;
    syncSelections();
  });

  $('#btn-start').addEventListener('click', () => {
    sound.correct();
    location.hash = `#/play/${settings.activity}`;
  });

  $('#btn-howto').addEventListener('click', () => {
    sound.select();
    openTutorial({ onClose: () => { settings.tutorialDone = true; } });
  });
}

// ---------------------------------------------------------------- toolbar
function wireToolbar() {
  $('#btn-camera').addEventListener('click', () => {
    sound.unlock();
    if (engine.status === 'ready') {
      engine.stop();
      settings.cameraWanted = false;
    } else {
      settings.cameraWanted = true;
      engine.start();
    }
  });
  $('#btn-theme').addEventListener('click', () => {
    settings.theme = settings.theme === 'day' ? 'night' : 'day';
    applyTheme();
    updateToolbarTexts();
  });
  $('#btn-sound').addEventListener('click', () => {
    settings.sound = !settings.sound;
    sound.enabled = settings.sound;
    sound.select();
    updateToolbarTexts();
  });
  $('#btn-home').addEventListener('click', () => { location.hash = ''; });
  $('#btn-pt').addEventListener('click', () => { sound.select(); openPeriodicTable(); });

  document.addEventListener('gesture-status', e => {
    const { status, hands } = e.detail;
    $('#btn-camera').dataset.status = status;
    $('#cam').hidden = status !== 'ready';
    updateToolbarTexts();
    if (status === 'ready' && !settings.tutorialDone && !hands && $('#tutorial').hidden) {
      openTutorial({ onClose: () => { settings.tutorialDone = true; } });
    }
    if (status === 'denied') toast(t('toolbar.camera.denied'));
    if (status === 'error') toast(t('toolbar.camera.error'));
  });
}

function updateToolbarTexts() {
  const s = engine.status;
  const label = $('#camera-label');
  label.textContent =
    s === 'ready' ? (engine.handsSeen ? t('toolbar.camera.hands', { n: engine.handsSeen }) : t('toolbar.camera.nohand')) :
    s === 'loading' ? t('toolbar.camera.loading') :
    s === 'denied' ? t('toolbar.camera.denied') :
    s === 'error' ? t('toolbar.camera.error') : t('toolbar.camera.off');
  $('#btn-theme').textContent = settings.theme === 'day' ? `☀ ${t('toolbar.theme.day')}` : `☾ ${t('toolbar.theme.night')}`;
  $('#btn-sound').textContent = settings.sound ? `♪ ${t('toolbar.sound.on')}` : `✕ ${t('toolbar.sound.off')}`;
}

function applyTheme() {
  const day = settings.theme === 'day';
  document.documentElement.dataset.theme = day ? 'day' : 'night';
  document.querySelector('meta[name="theme-color"]').content = day ? '#f0f6ff' : '#060d1b';
}

// ---------------------------------------------------------------- Dr. NAM tips
function showTip() {
  const n = (showTip.i = ((showTip.i ?? -1) + 1) % 5) + 1;
  $('#drnam-tip').textContent = t(`drnam.tip.${n}`);
}
function startTips() {
  clearInterval(tipTimer);
  tipTimer = setInterval(showTip, 9000);
}

// ---------------------------------------------------------------- screens
async function route() {
  const m = location.hash.match(/^#\/play\/([\w-]+)/);
  activityCleanup?.();
  activityCleanup = null;
  const landing = $('#screen-landing');
  const screen = $('#screen-activity');
  const host = $('#activity-host');

  if (!m) {
    landing.hidden = false;
    screen.hidden = true;
    $('#btn-home').hidden = true;
    host.innerHTML = '';
    return;
  }
  const a = byId(m[1]);
  landing.hidden = true;
  screen.hidden = false;
  $('#btn-home').hidden = false;

  const context = {
    level: settings.level,
    players: settings.players,
    language: settings.language,
    lecturer: !!settings.lecturer,
    t,
    sound,
    engine,
  };

  if (a?.status === 'ready' && a.load) {
    const mod = await a.load();
    if (settings.players === 'duo' && a.duo) {
      const duo = await import('./duo.js');
      activityCleanup = duo.default(host, mod, { ...context, duoMode: settings.duoMode }) || null;
      return;
    }
    activityCleanup = mod.default(host, context) || null;
    return;
  }

  // Placeholder until the activity's phase is built
  host.innerHTML = `
    <section class="placeholder glass">
      <div class="placeholder__icon">${doodles[a?.doodle || 'flask']}</div>
      <span class="tag">${t('placeholder.title')}</span>
      <h2>${t(`activity.${a?.id || 'lewis'}.title`)}</h2>
      <p>${t('placeholder.body', {
        n: a?.phase ?? '—',
        level: t(`level.${settings.level}`),
        players: t(`players.${settings.players}`),
      })}</p>
      <button class="btn-start btn-start--small" data-target type="button" id="btn-back">${t('placeholder.back')}</button>
    </section>`;
  host.querySelector('#btn-back').addEventListener('click', () => { location.hash = ''; });
}

// ---------------------------------------------------------------- background doodles
function scatterDoodles() {
  const box = $('#bg-doodles');
  const spots = [[6, 72, 'atom'], [44, 6, 'sparkle'], [93, 42, 'molecule'], [58, 88, 'capsule'],
                 [30, 92, 'testtube'], [97, 86, 'flask'], [2, 30, 'sparkle']];
  spots.forEach(([x, y, k], i) => {
    const d = document.createElement('div');
    d.className = 'doodle';
    d.style.left = `${x}%`;
    d.style.top = `${y}%`;
    d.style.setProperty('--r', `${(i % 2 ? 1 : -1) * (6 + i * 3)}deg`);
    d.style.animationDelay = `${-i * 0.9}s`;
    d.innerHTML = doodles[k];
    box.appendChild(d);
  });
}

// ---------------------------------------------------------------- offline (PWA)
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'precached' && !settings.offlineNotified) {
      settings.offlineNotified = true;
      toast(t('offline.ready'), 4500);
    }
  });
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) toast(t('offline.updated'), 6000);
      });
    });
  }).catch(err => console.warn('Service worker not registered', err));
}

init();
