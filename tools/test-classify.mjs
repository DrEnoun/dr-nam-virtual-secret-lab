// Unit test for the gesture logic using synthetic hands. Run: node tools/test-classify.mjs
import assert from 'node:assert/strict';
import { features, HandStateMachine, toScreen } from '../js/gestures/classify.js';

// Build a simple right hand in image coords (y grows downward). Palm size ~0.12.
function hand({ thumb = 'up', pinch = false, curled = true } = {}) {
  const p = (x, y, z = 0) => ({ x, y, z });
  const lm = new Array(21).fill(null);
  lm[0] = p(0.50, 0.80);                       // wrist
  // index: MCP 5, PIP 6, DIP 7, tip 8 — pointing up
  lm[5] = p(0.47, 0.69); lm[6] = p(0.47, 0.63); lm[7] = p(0.47, 0.59); lm[8] = p(0.47, 0.55);
  // middle 9..12, ring 13..16, pinky 17..20
  const finger = (base, x) => {
    lm[base] = p(x, 0.68);                     // MCP
    lm[base + 1] = p(x, 0.62);                 // PIP
    if (curled) { lm[base + 2] = p(x, 0.66); lm[base + 3] = p(x, 0.71); }
    else { lm[base + 2] = p(x, 0.58); lm[base + 3] = p(x, 0.54); }
  };
  finger(9, 0.50); finger(13, 0.53); finger(17, 0.56);
  // thumb 1..4
  lm[1] = p(0.45, 0.77); lm[2] = p(0.42, 0.74); lm[3] = p(0.40, 0.70);
  if (pinch) lm[4] = p(0.468, 0.556);           // touching index tip
  else if (thumb === 'up') lm[4] = p(0.36, 0.62); // away from index base
  else lm[4] = p(0.455, 0.675);                 // resting on index base
  return lm;
}

const up = features(hand({ thumb: 'up' }));
const down = features(hand({ thumb: 'down' }));
const open = features(hand({ thumb: 'up', curled: false }));
const pinch = features(hand({ pinch: true }));
console.log({ up, down, open, pinch });

assert.ok(up.gunShape, 'gun shape detected');
assert.ok(!open.gunShape, 'open hand is not a gun');
assert.ok(up.thumbToIndexBase > 0.62, 'thumb up measured');
assert.ok(down.thumbToIndexBase < 0.42, 'thumb down measured');
assert.ok(pinch.pinch < 0.30, 'pinch measured');
assert.ok(up.pinch > 0.48, 'not pinching when cocked');

// Shoot sequence: cock, hold, drop
let sm = new HandStateMachine();
assert.deepEqual(sm.update(up, 0), []);
assert.deepEqual(sm.update(up, 100), []);
assert.deepEqual(sm.update(down, 150), ['shoot']);
// No double shot while thumb stays down
assert.deepEqual(sm.update(down, 200), []);
// Re-cock within cooldown → no shot
sm.update(up, 250); sm.update(up, 340);
assert.deepEqual(sm.update(down, 380), [], 'cooldown blocks');
// After cooldown → shot
sm.update(up, 700); sm.update(up, 800);
assert.deepEqual(sm.update(down, 850), ['shoot']);

// Open hand dropping thumb does not shoot
sm = new HandStateMachine();
sm.update(open, 0); sm.update(open, 100);
assert.deepEqual(sm.update(features(hand({ thumb: 'down', curled: false })), 150), []);

// Pinch → grab, quick release → release + tap
sm = new HandStateMachine();
assert.deepEqual(sm.update(pinch, 0), ['grab']);
assert.deepEqual(sm.update(up, 200), ['release', 'tap']);
// Long pinch → release only
sm = new HandStateMachine();
sm.update(pinch, 0);
assert.deepEqual(sm.update(up, 1000), ['release']);

// Screen mapping is mirrored and clamped
const s = toScreen({ x: 0.12, y: 0.10 }, 1000, 500);
assert.equal(Math.round(s.x), 1000);
assert.equal(Math.round(s.y), 0);

console.log('All gesture tests passed');
