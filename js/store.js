// Remembers the player's last choices on this device (safe if storage is blocked).
const KEY = 'drnam-chem-games:v1';

const defaults = {
  language: 'en', // English first on every new visit (see below)
  level: 'easy',
  players: 'single',
  activity: 'lewis',
  theme: 'night',
  sound: true,
  tutorialDone: false,
  cameraWanted: false,
  offlineNotified: false,
};

function read() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...defaults }; }
}

// Language: every new visit starts in English. A choice made during a visit survives reloads
// in the same tab (sessionStorage) but is not remembered for the next visit.
const state = read();
try { state.language = sessionStorage.getItem(KEY + ':lang') || 'en'; } catch { state.language = 'en'; }

export const settings = new Proxy(state, {
  set(obj, prop, value) {
    obj[prop] = value;
    if (prop === 'language') { try { sessionStorage.setItem(KEY + ':lang', value); } catch { /* ignore */ } }
    try { const { language, ...saved } = obj; localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* storage blocked: keep in memory */ }
    return true;
  },
});
