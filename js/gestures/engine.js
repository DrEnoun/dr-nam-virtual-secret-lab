// Gesture engine: webcam + MediaPipe Hands (bundled locally, works offline).
// Turns hands into on-screen crosshairs and dispatches the same clicks a mouse would.
//
// Events it fires:
//   on a [data-target] element:  'player-select' {player}  and then a normal click()
//   on document:                 'gesture-grab' | 'gesture-move' | 'gesture-release'  {player, x, y}
//                                'gesture-status' {status, hands}
import { features, HandStateMachine, toScreen } from './classify.js';
import { sound } from '../sound.js';

const VENDOR = 'vendor/mediapipe-hands/';
const SMOOTH = 0.38;          // 0..1, higher = snappier cursor
const CLICK_LOOKBACK_MS = 90; // shoot where you were aiming just before the thumb dropped
const LOST_MS = 350;

class Player {
  constructor(id, layer) {
    this.id = id;
    this.sm = new HandStateMachine();
    this.x = innerWidth / 2;
    this.y = innerHeight / 2;
    this.history = [];
    this.seenAt = 0;
    this.visible = false;
    this.hovered = null;
    this.el = document.createElement('div');
    this.el.className = `crosshair crosshair--p${id}`;
    this.el.setAttribute('aria-hidden', 'true');
    this.el.innerHTML = `<span class="crosshair__ring"></span><span class="crosshair__dot"></span><span class="crosshair__tag">P${id}</span>`;
    layer.appendChild(this.el);
  }
}

export class GestureEngine {
  constructor() {
    this.status = 'off'; // off | loading | ready | denied | error
    this.mode = 'single'; // single | duo
    this.handsSeen = 0;
    this.busy = false;
    this.layer = document.getElementById('cursor-layer');
    this.players = [new Player(1, this.layer), new Player(2, this.layer)];
    this.video = document.getElementById('cam-video');
    this.preview = document.getElementById('cam-preview');
    this.ctx = this.preview?.getContext('2d');
    this._loop = this._loop.bind(this);
  }

  setMode(mode) {
    this.mode = mode === 'duo' ? 'duo' : 'single';
    this.layer.dataset.mode = this.mode;
    this.hands?.setOptions({ maxNumHands: this.mode === 'duo' ? 2 : 1 });
  }

  _setStatus(status) {
    this.status = status;
    document.dispatchEvent(new CustomEvent('gesture-status', { detail: { status, hands: this.handsSeen } }));
  }

  async start() {
    if (this.status === 'ready' || this.status === 'loading') return;
    this._setStatus('loading');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
    } catch (err) {
      this._setStatus(err?.name === 'NotAllowedError' ? 'denied' : 'error');
      return;
    }
    try {
      this.video.srcObject = this.stream;
      await this.video.play();
      await loadScript(VENDOR + 'hands.js');
      // eslint-disable-next-line no-undef
      this.hands = new Hands({ locateFile: f => VENDOR + f });
      this.hands.setOptions({
        maxNumHands: this.mode === 'duo' ? 2 : 1,
        modelComplexity: 0,          // lite model: fast on classroom laptops
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });
      this.hands.onResults(r => this._onResults(r));
      await this.hands.initialize();
      this.running = true;
      this._setStatus('ready');
      requestAnimationFrame(this._loop);
    } catch (err) {
      console.error('Hand tracking failed to start', err);
      this.stop();
      this._setStatus('error');
    }
  }

  stop() {
    this.running = false;
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    for (const p of this.players) this._hide(p);
    if (this.status !== 'denied' && this.status !== 'error') this._setStatus('off');
  }

  async _loop() {
    if (!this.running) return;
    if (!this.busy && this.video.readyState >= 2) {
      this.busy = true;
      try { await this.hands.send({ image: this.video }); } catch (e) { console.warn(e); }
      this.busy = false;
    }
    requestAnimationFrame(this._loop);
  }

  _onResults(results) {
    const now = performance.now();
    const W = innerWidth, H = innerHeight;
    const aspect = (this.video.videoWidth || 4) / (this.video.videoHeight || 3);
    const hands = (results.multiHandLandmarks || []).map(lm => ({
      lm,
      screen: toScreen(lm[8], W, H),
      wristX: 1 - lm[0].x,
    }));

    if (hands.length !== this.handsSeen) {
      this.handsSeen = hands.length;
      document.dispatchEvent(new CustomEvent('gesture-status', { detail: { status: this.status, hands: this.handsSeen } }));
    }
    this._drawPreview(results);

    // Assign hands to players
    const assigned = new Map();
    if (this.mode === 'duo') {
      for (const h of hands) {
        const pid = h.wristX < 0.5 ? 1 : 2; // left half of the room = Player 1
        if (!assigned.has(pid)) assigned.set(pid, h);
      }
    } else if (hands.length) {
      assigned.set(1, hands[0]);
    }

    for (const p of this.players) {
      const h = assigned.get(p.id);
      if (!h) {
        if (p.visible && now - p.seenAt > LOST_MS) {
          for (const ev of p.sm.reset()) this._emit(p, ev, now);
          this._hide(p);
        }
        continue;
      }
      p.seenAt = now;
      if (!p.visible) { p.x = h.screen.x; p.y = h.screen.y; this._show(p); }
      p.x += (h.screen.x - p.x) * SMOOTH;
      p.y += (h.screen.y - p.y) * SMOOTH;
      p.history.push({ t: now, x: p.x, y: p.y });
      while (p.history.length && now - p.history[0].t > 400) p.history.shift();
      this._moveCursor(p);

      const f = features(h.lm, aspect);
      p.el.classList.toggle('is-cocked', p.sm.cocked);
      p.el.classList.toggle('is-grabbing', p.sm.grabbing);
      for (const ev of p.sm.update(f, now)) this._emit(p, ev, now);
      if (p.sm.grabbing) this._doc('gesture-move', p);
    }
  }

  _emit(p, ev, now) {
    if (ev === 'shoot' || ev === 'tap') {
      const past = p.history.find(s => now - s.t <= CLICK_LOOKBACK_MS) || { x: p.x, y: p.y };
      this._fire(p, past.x, past.y, ev === 'shoot');
    } else if (ev === 'grab') {
      this._doc('gesture-grab', p);
    } else if (ev === 'release') {
      this._doc('gesture-release', p);
    }
  }

  _doc(name, p) {
    document.dispatchEvent(new CustomEvent(name, { detail: { player: p.id, x: p.x, y: p.y } }));
  }

  _fire(p, x, y, isShot) {
    if (isShot) {
      p.el.classList.remove('is-firing');
      void p.el.offsetWidth; // restart animation
      p.el.classList.add('is-firing');
      sound.shot();
    }
    const target = targetAt(x, y);
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    target.dispatchEvent(new CustomEvent('player-select', { bubbles: true, detail: { player: p.id } }));
    target.click();
  }

  _moveCursor(p) {
    p.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    const target = targetAt(p.x, p.y);
    if (target !== p.hovered) {
      p.hovered?.classList.remove('is-aimed', `is-aimed-p${p.id}`);
      p.hovered = target;
      target?.classList.add('is-aimed', `is-aimed-p${p.id}`);
      if (target) sound.tick();
    }
  }

  _show(p) { p.visible = true; p.el.classList.add('is-visible'); }

  _hide(p) {
    p.visible = false;
    p.el.classList.remove('is-visible', 'is-cocked', 'is-grabbing');
    p.hovered?.classList.remove('is-aimed', `is-aimed-p${p.id}`);
    p.hovered = null;
  }

  _drawPreview(results) {
    if (!this.ctx || this.preview.hidden) return;
    const { width: w, height: h } = this.preview;
    const c = this.ctx;
    c.save();
    c.clearRect(0, 0, w, h);
    c.translate(w, 0);
    c.scale(-1, 1); // mirror, like a mirror
    c.drawImage(results.image, 0, 0, w, h);
    const css = getComputedStyle(document.documentElement);
    const colours = [css.getPropertyValue('--spark-400').trim(), css.getPropertyValue('--coral-400').trim()];
    (results.multiHandLandmarks || []).forEach((lm, i) => {
      c.fillStyle = colours[i % 2] || '#d4ff3a';
      for (const pt of lm) {
        c.beginPath();
        c.arc(pt.x * w, pt.y * h, 2.4, 0, Math.PI * 2);
        c.fill();
      }
    });
    c.restore();
  }
}

function targetAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el?.closest('[data-target]') || null;
}

const loaded = new Map();
function loadScript(src) {
  if (!loaded.has(src)) {
    loaded.set(src, new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    }));
  }
  return loaded.get(src);
}
