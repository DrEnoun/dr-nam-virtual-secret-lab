// The Lewis board: atoms, electron slots and draggable electrons (mouse, touch or pinch via drag.js).
import { makeDraggable } from '../../drag.js';
import { R, SITE_DIST, PAIR_HALF, chargeText } from './rules.js';

const NS = 'http://www.w3.org/2000/svg';
const div = (cls, parent) => {
  const el = document.createElement('div');
  el.className = cls;
  parent?.appendChild(el);
  return el;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * createBoard(host, model, { sound, onChange, locked })
 * Returns { filled(), left(), reset(), reveal(), unlock(), setState(s), showIons(ions), destroy() }.
 * The board knows nothing about scoring — index.js calls evaluate() from rules.js on filled().
 */
export function createBoard(host, model, { sound, onChange, locked = false } = {}) {
  host.innerHTML = '';
  host.classList.add('lw-board');
  host.dataset.state = '';
  const ionic = model.kind === 'ionic';
  const slotEls = new Map();
  const atomEls = new Map();
  const occupant = new Map(); // target slot id → token
  const tokens = [];
  const stops = [];
  const ionEls = [];
  let u = 40, e = 28, W = 0, H = 0, X = x => x, Y = y => y, trayH = 0, ionList = null;
  let tray = null;

  for (const a of model.atoms) {
    const el = div('lw-atom', host);
    el.textContent = a.el;
    el.dataset.el = a.el;
    atomEls.set(a.id, el);
  }
  for (const s of model.slots) {
    const el = div('lw-slot', host);
    if (s.prefilled) el.classList.add('lw-slot--static');
    if (s.home) el.classList.add('lw-slot--home');
    if (s.type === 'bond') el.classList.add('lw-slot--bond');
    slotEls.set(s.id, el);
  }
  const isTarget = s => !s.prefilled && !s.home;
  const slotById = new Map(model.slots.map(s => [s.id, s]));
  if (!ionic) {
    tray = div('lw-tray', host);
    tray.innerHTML = '<span class="lw-tray__label" aria-hidden="true">e⁻</span>';
  }

  const centre = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const setPos = (el, cx, cy, size) => { el.style.left = `${cx - size / 2}px`; el.style.top = `${cy - size / 2}px`; };

  function homePos(tok) {
    if (ionic) { const s = slotById.get(tok.homeSlot); return { x: X(s.x), y: Y(s.y) }; }
    const n = tokens.length;
    const gap = Math.min(e * 1.5, (W * 0.84) / Math.max(n, 1));
    return { x: W / 2 + (tok.index - (n - 1) / 2) * gap, y: H - trayH / 2 };
  }
  function settle(tok) {
    const p = tok.slot ? { x: X(slotById.get(tok.slot).x), y: Y(slotById.get(tok.slot).y) } : homePos(tok);
    setPos(tok.el, p.x, p.y, e);
  }

  function layout() {
    W = host.clientWidth; H = host.clientHeight;
    if (!W || !H) return;
    trayH = ionic ? 0 : Math.max(64, H * 0.17);
    const areaH = H - trayH, b = model.bounds;
    u = Math.min((W * 0.97) / (b.maxX - b.minX), (areaH * 0.97) / (b.maxY - b.minY), 84);
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    X = x => W / 2 + (x - cx) * u;
    Y = y => areaH / 2 - (y - cy) * u;
    const n = tokens.length || 1;
    const gap = ionic ? 99 : Math.min(u * 0.8, (W * 0.84) / n);
    e = clamp(Math.min(u * 0.5, gap * 0.9), 20, 46);
    host.style.setProperty('--e', `${e}px`);
    for (const a of model.atoms) {
      const el = atomEls.get(a.id), d = 2 * R * u;
      el.style.width = el.style.height = `${d}px`;
      el.style.fontSize = `${u * 0.95}px`;
      setPos(el, X(a.x), Y(a.y), d);
    }
    for (const s of model.slots) setPos(slotEls.get(s.id), X(s.x), Y(s.y), e);
    if (tray) { tray.style.height = `${trayH}px`; }
    tokens.forEach(settle);
    ionEls.forEach(place => place());
  }

  const snapRange = () => Math.max(e * 1.3, u * 0.75);
  function nearestFree(tok) {
    const c = centre(tok.el);
    let best = null, bd = snapRange();
    for (const s of model.slots) {
      if (!isTarget(s) || occupant.has(s.id)) continue;
      const sc = centre(slotEls.get(s.id));
      const d = Math.hypot(sc.x - c.x, sc.y - c.y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  function highlight(slot) {
    slotEls.forEach((el, id) => el.classList.toggle('is-near', !!slot && id === slot.id));
  }
  function free(tok) {
    if (!tok.slot) return;
    occupant.delete(tok.slot);
    slotEls.get(tok.slot).classList.remove('is-filled');
    tok.slot = null;
  }
  function put(tok, slot) {
    occupant.set(slot.id, tok);
    tok.slot = slot.id;
    slotEls.get(slot.id).classList.add('is-filled');
    settle(tok);
  }

  function spawn() {
    if (tokens.length) return;
    const count = ionic ? model.tokens.length : model.tokens;
    for (let i = 0; i < count; i++) {
      const el = div('electron lw-electron', host);
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'electron');
      el.textContent = '';
      const tok = { el, index: i, slot: null, homeSlot: ionic ? model.tokens[i].home : null };
      tokens.push(tok);
      stops.push(makeDraggable(el, {
        grabRadius: 8,
        onMove: () => {
          if (tok.slot) { free(tok); onChange?.(); }
          highlight(nearestFree(tok));
        },
        onDrop: () => {
          highlight(null);
          const slot = nearestFree(tok);
          if (slot) { put(tok, slot); sound?.pop(); } else { settle(tok); sound?.tick(); }
          onChange?.();
        },
      }));
    }
    layout();
  }

  function reset() {
    tokens.forEach(t => { free(t); settle(t); });
    host.dataset.state = '';
    onChange?.();
  }

  const ro = new ResizeObserver(layout);
  ro.observe(host);
  layout();
  if (!locked) spawn();

  return {
    model,
    filled: () => new Set(occupant.keys()),
    left: () => tokens.length - occupant.size,
    reset,
    unlock: spawn,
    setState(s) { host.dataset.state = s || ''; },
    reveal() {
      spawn();
      tokens.forEach(free);
      model.answer.forEach((id, i) => put(tokens[i], slotById.get(id)));
      onChange?.();
    },
    /** Draw [ ] brackets and charges around each ion. */
    showIons(ions) {
      ionList = ions;
      ions.forEach(ion => {
        const a = model.atoms.find(x => x.id === ion.atomId);
        const box = div('lw-ion', host);
        const label = div('lw-ion__charge', box);
        label.textContent = chargeText(ion.charge);
        const place = () => {
          const d = 2 * (SITE_DIST + 0.55) * u;
          box.style.width = box.style.height = `${d}px`;
          box.style.left = `${X(a.x) - d / 2}px`;
          box.style.top = `${Y(a.y) - d / 2}px`;
        };
        ionEls.push(place);
        place();
      });
    },
    destroy() {
      ro.disconnect();
      stops.forEach(s => s());
      host.innerHTML = '';
      host.classList.remove('lw-board');
    },
  };
}

/** Static Lewis structure as SVG: bonds as lines, lone pairs as dots, ions in brackets. */
export function lewisSvg(model, ions = null) {
  const S = 36, b = model.bounds;
  const w = (b.maxX - b.minX) * S, h = (b.maxY - b.minY) * S;
  const X = x => (x - b.minX) * S, Y = y => (b.maxY - y) * S;
  const answer = new Set(model.answer);
  const parts = [];
  for (const bd of model.bonds) {
    const A = model.atoms.find(a => a.id === bd.a), B = model.atoms.find(a => a.id === bd.b);
    const ang = (bd.angle * Math.PI) / 180, d = { x: Math.cos(ang), y: Math.sin(ang) }, p = { x: -d.y, y: d.x };
    for (let k = 0; k < bd.order; k++) {
      const off = (k - (bd.order - 1) / 2) * PAIR_HALF * 2;
      const x1 = A.x + d.x * 0.95 + p.x * off, y1 = A.y + d.y * 0.95 + p.y * off;
      const x2 = B.x - d.x * 0.95 + p.x * off, y2 = B.y - d.y * 0.95 + p.y * off;
      parts.push(`<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`);
    }
  }
  for (const s of model.slots) {
    const dot = (model.kind === 'ionic' ? (s.prefilled || (s.type === 'lone' && !s.home && answer.has(s.id))) : s.type === 'lone' && answer.has(s.id));
    if (dot) parts.push(`<circle cx="${X(s.x)}" cy="${Y(s.y)}" r="4.5" fill="currentColor"/>`);
  }
  for (const a of model.atoms) {
    parts.push(`<text x="${X(a.x)}" y="${Y(a.y)}" text-anchor="middle" dominant-baseline="central" class="lw-svg-sym">${a.el}</text>`);
  }
  if (ions) {
    for (const ion of ions) {
      const a = model.atoms.find(x => x.id === ion.atomId), r = (SITE_DIST + 0.55) * S, cx = X(a.x), cy = Y(a.y), t = 0.45 * S;
      parts.push(`<path d="M${cx - r + t} ${cy - r}H${cx - r}V${cy + r}H${cx - r + t}M${cx + r - t} ${cy - r}H${cx + r}V${cy + r}H${cx + r - t}" fill="none" stroke="currentColor" stroke-width="4"/>`);
      parts.push(`<text x="${cx + r + 6}" y="${cy - r + 10}" class="lw-svg-charge">${chargeText(ion.charge)}</text>`);
    }
  }
  return `<svg class="lw-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Lewis structure" xmlns="${NS}">${parts.join('')}</svg>`;
}
