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
import { study } from './study.js';
import { hub } from './hub-bridge.js';

const $ = sel => document.querySelector(sel);
const engine = new GestureEngine();
if (new URLSearchParams(location.search).has('debug')) { window.__engine = engine; window.__study = study; } // for testing
let activityCleanup = null;
let hubTimerStop = null; // Study Hub time counter for the open activity
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
    if (e.target.closest?.('input, textarea')) return;
    if (e.shiftKey && e.key.toLowerCase() === 'l') {
      settings.lecturer = !settings.lecturer;
      syncLecturer();
    }
  });
  syncLecturer();
  wireStudy();

  // An activity can restart itself, e.g. "Play again" or "Next level"
  document.addEventListener('activity-restart', e => {
    if (e.detail?.level) { settings.level = e.detail.level; syncSelections(); }
    route();
  });

  // Signed in or out of the Study Hub in another tab
  addEventListener('storage', e => { if (e.key === 'nam:id') syncHub(); });

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

  $('#btn-start').addEventListener('click', async () => {
    if (study.enabled && !study.studentId) {
      const ok = await askStudentId();
      if (!ok) return;
    }
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
  syncStudy();
  $('#btn-theme').textContent = settings.theme === 'day' ? `☀ ${t('toolbar.theme.day')}` : `☾ ${t('toolbar.theme.night')}`;
  $('#btn-sound').textContent = settings.sound ? `♪ ${t('toolbar.sound.on')}` : `✕ ${t('toolbar.sound.off')}`;
}

function applyTheme() {
  const day = settings.theme === 'day';
  document.documentElement.dataset.theme = day ? 'day' : 'night';
  document.querySelector('meta[name="theme-color"]').content = day ? '#f0f6ff' : '#060d1b';
}

// ---------------------------------------------------------------- study mode
function syncLecturer() {
  $('#lecturer-badge').hidden = !settings.lecturer;
  $('#study-tools').hidden = !settings.lecturer;
  syncStudy();
}

// Study Hub status: "counted" when signed in there; a sign-in hint when the student came from the hub
function syncHub() {
  const chip = $('#hub-chip');
  if (!chip) return;
  const me = hub.student();
  const fromHub = /phd115-nam/.test(document.referrer) || new URLSearchParams(location.search).has('hub');
  chip.hidden = !(me || fromHub);
  chip.textContent = me ? t('hub.chip.on', { name: String(me.name || '').split(' ')[0] }) : t('hub.chip.off');
  chip.classList.toggle('is-on', !!me);
}

function syncStudy() {
  syncHub();
  const btn = $('#btn-student');
  btn.hidden = !(study.enabled && study.studentId);
  if (!btn.hidden) btn.textContent = t('study.student', { id: study.studentId });
  $('#btn-study-mode').textContent = study.enabled ? t('study.on') : t('study.off');
  $('#btn-study-export').textContent = t('study.export', { n: study.count() });
}

function wireStudy() {
  study.inputFn = () => (engine.status === 'ready' ? 'camera' : 'mouse');
  $('#btn-study-mode').addEventListener('click', () => {
    study.enabled = !study.enabled;
    if (!study.enabled) study.studentId = '';
    toast(study.enabled ? t('study.modeOn') : t('study.modeOff'));
    syncStudy();
  });
  $('#btn-study-export').addEventListener('click', () => { study.download(); });
  $('#btn-study-clear').addEventListener('click', () => {
    if (!confirm(t('study.clearConfirm'))) return;
    study.clear();
    toast(t('study.cleared'));
    syncStudy();
  });
  const nextStudent = () => {
    study.endSession();
    study.studentId = '';
    location.hash = '';
    syncStudy();
  };
  $('#btn-study-newstudent').addEventListener('click', nextStudent);
  $('#btn-student').addEventListener('click', async () => {
    if (location.hash) return; // change ID only from the landing page
    await askStudentId();
  });
  // Record when the input method changes mid-session
  document.addEventListener('gesture-status', e => {
    if (e.detail.status === 'ready' || e.detail.status === 'off') study.log('input_change');
  });
  addEventListener('pagehide', () => study.endSession());
}

function askStudentId() {
  return new Promise(resolve => {
    const dlg = $('#student-dialog');
    const form = $('#student-form');
    const input = $('#sid-input');
    const err = $('#sid-error');
    input.value = study.studentId || hub.student()?.matric || ''; // prefill from the Study Hub sign-in
    err.hidden = true;
    input.oninput = () => { err.hidden = true; };
    dlg.hidden = false;
    setTimeout(() => input.focus(), 50);
    const done = ok => {
      dlg.hidden = true;
      form.onsubmit = null;
      $('#sid-cancel').onclick = null;
      syncStudy();
      resolve(ok);
    };
    form.onsubmit = e => {
      e.preventDefault();
      if (!study.validId(input.value)) { err.hidden = false; sound.wrong(); input.focus(); return; }
      study.studentId = input.value;
      sound.select();
      done(true);
    };
    $('#sid-cancel').onclick = () => done(false);
  });
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
  hubTimerStop?.();
  hubTimerStop = null;
  study.endSession();
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

  study.startSession({ activity: a?.id ?? m[1], level: settings.level, players: settings.players });
  syncStudy();

  if (a?.status === 'ready') hubTimerStop = hub.startTimer(a.id);

  const context = {
    level: settings.level,
    players: settings.players,
    language: settings.language,
    lecturer: !!settings.lecturer,
    t,
    sound,
    engine,
    // Activities call ctx.log(event, {item, answer, correct, errorType, hintUsed, durationMs})
    log: (event, data) => study.log(event, data),
    // Activities call ctx.report({level, score, total}) when a level ends: counted in the Study Hub
    // for students signed in there (single player only)
    report: data => {
      if (settings.players === 'duo' || !a) return;
      if (hub.result(a.id, { level: settings.level, ...data })) toast(t('hub.counted'));
    },
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
