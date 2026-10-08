// Tiny synthesized sounds (no audio files needed, works offline).
let ctx = null;
let enabled = true;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, to = freq, dur = 0.12, type = 'sine', vol = 0.15, delay = 0 }) {
  if (!enabled) return;
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sound = {
  get enabled() { return enabled; },
  set enabled(v) { enabled = !!v; },
  unlock() { ac(); },
  shot() { tone({ freq: 900, to: 180, dur: 0.14, type: 'square', vol: 0.07 }); },
  tick() { tone({ freq: 1400, dur: 0.03, type: 'sine', vol: 0.03 }); },
  select() { tone({ freq: 520, to: 780, dur: 0.1, type: 'triangle', vol: 0.12 }); },
  pop() { tone({ freq: 300, to: 600, dur: 0.08, type: 'sine', vol: 0.12 }); },
  correct() {
    tone({ freq: 660, dur: 0.1, type: 'triangle', vol: 0.12 });
    tone({ freq: 990, dur: 0.16, type: 'triangle', vol: 0.12, delay: 0.1 });
  },
  wrong() { tone({ freq: 220, to: 140, dur: 0.22, type: 'sawtooth', vol: 0.06 }); },
};
