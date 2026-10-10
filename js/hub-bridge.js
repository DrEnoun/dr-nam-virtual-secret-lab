// Study Hub bridge.
// The Virtual Lab (drenoun.github.io/dr-nam-virtual-secret-lab/) and the PHD115 Study Hub
// (drenoun.github.io/phd115-nam/) share one web address, so they share this browser's storage.
// If the student has signed in to the Study Hub on this device, the Lab:
//   1. adds its time and results to the Study Hub's own send queue ("nam:queue"); the Study Hub
//      sends that queue to Dr. NAM's Google Sheet whenever one of its pages is open (every 2 minutes,
//      and when a page is closed), exactly like its own activities;
//   2. keeps a summary ("phd115:lab:<activity>") that the Study Hub home page shows on the topic cards.
// Guests and people who never signed in to the Study Hub are not recorded. Nothing is sent from here.
const IDK = 'nam:id';
const QK = 'nam:queue';
const SUM = id => `phd115:lab:${id}`;
const IDLE_MS = 120000; // same as the Study Hub: stop counting after 2 minutes without any input

const get = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Same rules as the Study Hub's tracker: replace an event with the same key, keep at most 400. */
function enqueue(ev) {
  const q = get(QK) || [];
  const i = ev.k ? q.findIndex(x => x.k === ev.k) : -1;
  if (i >= 0) q[i] = ev; else q.push(ev);
  while (q.length > 400) q.shift();
  put(QK, q);
}

export const hub = {
  /** The signed-in Study Hub student on this device, or null (not signed in, or a guest). */
  student() {
    const id = get(IDK);
    return id && id.ok && id.matric ? id : null;
  },

  /** Summary the Study Hub shows: best score per level for one Lab activity. */
  summary(activity) { return get(SUM(activity)); },

  /** A finished level: keep the best per level, and queue it for the Study Hub. */
  result(activity, { level, score, total }) {
    if (!this.student() || !activity || !Number.isFinite(score)) return false;
    const s = get(SUM(activity)) || { levels: {}, plays: 0 };
    s.plays = (s.plays || 0) + 1;
    s.levels = s.levels || {};
    s.levels[level] = Math.max(s.levels[level] || 0, score);
    s.best = Math.max(0, ...Object.values(s.levels));
    s.last = { level, score, total: total ?? null, t: Date.now() };
    put(SUM(activity), s);
    // Same event shape as the Study Hub's own progress events (type "prog")
    enqueue({
      k: `prog:${SUM(activity)}`, type: 'prog', page: `lab/${activity}`, t: Date.now(),
      best: s.best, done: true, answered: s.plays,
      data: JSON.stringify({ levels: s.levels, last: s.last }).slice(0, 6000),
    });
    return true;
  },

  /** Active time on one Lab activity, counted like the Study Hub counts time on its pages. */
  startTimer(activity) {
    const vid = rid(), start = Date.now();
    let active = 0, last = Date.now(), sent = -1;
    const poke = () => { last = Date.now(); };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    events.forEach(e => addEventListener(e, poke, { passive: true, capture: true }));
    ['gesture-move', 'gesture-grab', 'player-select'].forEach(e => document.addEventListener(e, poke));
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - last < IDLE_MS) active += 5;
    }, 5000);
    const save = () => {
      if (!this.student() || active === 0 || active === sent) return;
      sent = active;
      enqueue({ k: `time:${vid}`, type: 'time', page: `lab/${activity}`, vid, sec: active, start, t: Date.now() });
    };
    const flushTick = setInterval(save, 60000);
    const onHide = () => { if (document.visibilityState === 'hidden') save(); };
    document.addEventListener('visibilitychange', onHide);
    addEventListener('pagehide', save);
    if (this.student()) enqueue({ k: `view:${vid}`, type: 'view', page: `lab/${activity}`, vid, t: Date.now(), ref: document.referrer ? '1' : '' });
    return () => {
      save();
      clearInterval(tick); clearInterval(flushTick);
      events.forEach(e => removeEventListener(e, poke, { capture: true }));
      ['gesture-move', 'gesture-grab', 'player-select'].forEach(e => document.removeEventListener(e, poke));
      document.removeEventListener('visibilitychange', onHide);
      removeEventListener('pagehide', save);
    };
  },
};
