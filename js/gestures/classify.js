// Pure hand-pose logic (no DOM) so it can be unit-tested in Node.
// Input: 21 MediaPipe hand landmarks {x, y, z}, normalized to the camera image.
// Landmark ids: 0 wrist · 4 thumb tip · 5/6/8 index MCP/PIP/tip ·
// 9 middle MCP · 10/12 middle PIP/tip · 14/16 ring PIP/tip · 18/20 pinky PIP/tip.

export const TUNING = {
  // Finger gun
  thumbDownBelow: 0.42,   // thumb tip close to the index base (÷ palm size) = thumb dropped
  thumbUpAbove: 0.62,     // thumb tip away from the index base = cocked
  cockHoldMs: 70,         // thumb must be up this long before a shot counts
  curledRatio: 1.08,      // fingertip no farther from wrist than its PIP × this = curled
  minCurled: 2,           // of middle/ring/pinky, how many must be curled for a "gun"
  // Pinch (grab)
  pinchBelow: 0.30,       // thumb tip to index tip (÷ palm size)
  releaseAbove: 0.48,
  tapMaxMs: 380,          // a short pinch-and-release also counts as a select
  // Shared
  cooldownMs: 450,
};

const dist = (a, b, aspect) =>
  Math.hypot((a.x - b.x) * aspect, a.y - b.y, (a.z - b.z) * aspect);

/** Measure the pose of one hand. aspect = video width / height. */
export function features(lm, aspect = 4 / 3, T = TUNING) {
  const d = (i, j) => dist(lm[i], lm[j], aspect);
  const palm = Math.max(d(0, 9), 1e-6);
  const curled = (tip, pip) => d(0, tip) <= d(0, pip) * T.curledRatio;
  const curledCount = [curled(12, 10), curled(16, 14), curled(20, 18)].filter(Boolean).length;
  const thumbToIndexBase = Math.min(d(4, 5), d(4, 6)) / palm;
  const pinch = d(4, 8) / palm;
  return {
    palm,
    curledCount,
    gunShape: curledCount >= T.minCurled,
    thumbToIndexBase,
    pinch,
  };
}

/**
 * Tracks one hand over time and turns poses into events.
 * update() returns an array of event names: 'shoot', 'grab', 'release', 'tap'.
 */
export class HandStateMachine {
  constructor(T = TUNING) {
    this.T = T;
    this.thumb = 'unknown';   // 'up' | 'down' | 'unknown'
    this.thumbUpSince = 0;
    this.cocked = false;
    this.grabbing = false;
    this.grabStart = 0;
    this.lastSelect = -Infinity;
  }

  update(f, now) {
    const T = this.T;
    const events = [];

    // ---- Pinch: grab / release / tap ----
    if (!this.grabbing && f.pinch < T.pinchBelow) {
      this.grabbing = true;
      this.grabStart = now;
      events.push('grab');
    } else if (this.grabbing && f.pinch > T.releaseAbove) {
      this.grabbing = false;
      events.push('release');
      if (now - this.grabStart <= T.tapMaxMs && now - this.lastSelect > T.cooldownMs) {
        this.lastSelect = now;
        events.push('tap');
      }
    }

    // ---- Finger gun: cock (thumb up) then fire (thumb down) ----
    const r = f.thumbToIndexBase;
    if (r > T.thumbUpAbove) {
      if (this.thumb !== 'up') { this.thumb = 'up'; this.thumbUpSince = now; }
      if (f.gunShape && now - this.thumbUpSince >= T.cockHoldMs) this.cocked = true;
    } else if (r < T.thumbDownBelow) {
      if (this.thumb === 'up' && this.cocked && f.gunShape && !this.grabbing &&
          now - this.lastSelect > T.cooldownMs) {
        this.lastSelect = now;
        events.push('shoot');
      }
      this.thumb = 'down';
      this.cocked = false;
    }
    if (!f.gunShape && this.thumb !== 'up') this.cocked = false;

    return events;
  }

  reset() {
    const wasGrabbing = this.grabbing;
    this.thumb = 'unknown';
    this.cocked = false;
    this.grabbing = false;
    return wasGrabbing ? ['release'] : [];
  }
}

/** Map a fingertip (mirrored) into screen coordinates, using an inner "comfort zone". */
export function toScreen(tip, width, height, zone = { x0: 0.12, x1: 0.88, y0: 0.10, y1: 0.80 }) {
  const mx = 1 - tip.x; // mirror so moving right moves the cursor right
  const nx = (mx - zone.x0) / (zone.x1 - zone.x0);
  const ny = (tip.y - zone.y0) / (zone.y1 - zone.y0);
  const clamp = v => Math.min(1, Math.max(0, v));
  return { x: clamp(nx) * width, y: clamp(ny) * height };
}
