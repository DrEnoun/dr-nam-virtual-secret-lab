// Remembers the player's last choices on this device (safe if storage is blocked).
const KEY = 'drnam-chem-games:v1';

const defaults = {
  language: 'ms',
  level: 'easy',
  players: 'single',
  activity: 'shooter',
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

const state = read();

export const settings = new Proxy(state, {
  set(obj, prop, value) {
    obj[prop] = value;
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch { /* storage blocked: keep in memory */ }
    return true;
  },
});
