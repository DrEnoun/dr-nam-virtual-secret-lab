// The Lewis board: atoms, electron slots and draggable electrons (mouse, touch or pinch via drag.js).
import { makeDraggable } from '../../drag.js';
import { R, SITE_DIST, PAIR_HALF, chargeText, answerOwners } from './rules.js';

// One colour per atom (by position in the molecule) so students can see whose electron is whose.
// fill = on the dark/light board, ink = darker version for the white answer panel.
export const ATOM_COLOURS = [
  { fill: '#d4ff3a', ink: '#5f8f00' },
  { fill: '#2dd4bf', ink: '#0b8577' },
  { fill: '#fc7a7a', ink: '#d14040' },
  { fill: '#ffb938', ink: '#b06f00' },
  { fill: '#9db4ff', ink: '#4a62c9' },
];
export const colourOf = (model, atomId) => ATOM_COLOURS[Math.max(0, model.atoms.findIndex(a => a.id === atomId)) % ATOM_COLOURS.length];

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
export function createBoard(host, model, { sound, onChange, locked = false, hidden = false, spares = 0 } = {}) {
  host.innerHTML = '';
  host.classList.add('lw-board');
  host.classList.toggle('lw-board--hidden', hidden);
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
  let selected = null; // token picked by a tap, waiting for a slot

  for (const a of model.atoms) {
    const el = div('lw-atom', host);
    el.textContent = a.el;
    el.dataset.el = a.el;
    if (model.atoms.length > 1) el.style.setProperty('--ring', colourOf(model, a.id).fill);
    atomEls.set(a.id, el);
  }
  for (const s of model.slots) {
    const el = div('lw-slot', host);
    if (s.prefilled) { el.classList.add('lw-slot--static'); el.style.background = colourOf(model, s.owners[0]).fill; }
    if (s.home) el.classList.add('lw-slot--home');
    if (s.type === 'bond') el.classList.add('lw-slot--bond');
    slotEls.set(s.id, el);
  }
  const isTarget = s => !s.prefilled && !s.home;
  const slotById = new Map(model.slots.map(s => [s.id, s]));
  const hasTray = !ionic || spares > 0;
  if (hasTray) {
    tray = div('lw-tray', host);
    tray.innerHTML = '<span class="lw-tray__label" aria-hidden="true">e⁻</span>';
  }

  const centre = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const setPos = (el, cx, cy, size) => { el.style.left = `${cx - size / 2}px`; el.style.top = `${cy - size / 2}px`; };

  function homePos(tok) {
    if (tok.homeSlot) { const s = slotById.get(tok.homeSlot); return { x: X(s.x), y: Y(s.y) }; }
    const list = tokens.filter(t => !t.homeSlot);
    const n = list.length, k = list.indexOf(tok);
    const breaks = list.filter((t, i) => i && t.owner !== list[i - 1].owner).length;
    const gap = Math.min(e * 1.5, (W * 0.84) / Math.max(n + breaks * 0.8, 1));
    const before = list.slice(0, k).filter((t, i) => i && t.owner !== list[i - 1].owner).length + (k && tok.owner !== list[k - 1].owner ? 1 : 0);
    const x = (k + before * 0.8) * gap - ((n - 1 + breaks * 0.8) * gap) / 2;
    return { x: W / 2 + x, y: H - trayH / 2 };
  }
  function settle(tok) {
    const p = tok.slot ? { x: X(slotById.get(tok.slot).x), y: Y(slotById.get(tok.slot).y) } : homePos(tok);
    setPos(tok.el, p.x, p.y, e);
  }

  function layout() {
    W = host.clientWidth; H = host.clientHeight;
    if (!W || !H) return;
    trayH = hasTray ? Math.max(64, H * 0.17) : 0;
    const areaH = H - trayH, b = model.bounds;
    u = Math.min((W * 0.97) / (b.maxX - b.minX), (areaH * 0.97) / (b.maxY - b.minY), 84);
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    X = x => W / 2 + (x - cx) * u;
    Y = y => areaH / 2 - (y - cy) * u;
    const n = (tokens.filter(t => !t.homeSlot).length || 1) + 4;
    const gap = hasTray ? Math.min(u * 0.8, (W * 0.84) / n) : 99;
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
  const atomPx = a => ({ x: X(a.x), y: Y(a.y) });
  /** Nearest empty target slot to a screen point. Hidden boards are forgiving: dropping anywhere around an atom's shell counts. */
  function nearestFreeAt(c) {
    const free = model.slots.filter(s => isTarget(s) && !occupant.has(s.id));
    const dist = s => { const sc = centre(slotEls.get(s.id)); return Math.hypot(sc.x - c.x, sc.y - c.y); };
    const best = list => list.reduce((b, s) => (!b || dist(s) < dist(b) ? s : b), null);
    if (hidden && model.kind !== 'covalent') {
      const br = host.getBoundingClientRect();
      const zoneAtoms = model.kind === 'ionic' ? model.atoms.filter(a => !a.metal) : model.atoms;
      const hit = zoneAtoms.filter(a => { const p = atomPx(a); return Math.hypot(br.left + p.x - c.x, br.top + p.y - c.y) < (SITE_DIST + 1.5) * u; })
        .sort((p, q) => Math.hypot(br.left + atomPx(p).x - c.x, br.top + atomPx(p).y - c.y) - Math.hypot(br.left + atomPx(q).x - c.x, br.top + atomPx(q).y - c.y))[0];
      return hit ? best(free.filter(s => s.owners[0] === hit.id)) : null;
    }
    const range = hidden ? Math.max(e * 1.7, u * 1.25) : snapRange();
    const s = best(free);
    return s && dist(s) < range ? s : null;
  }
  const nearestFree = tok => nearestFreeAt(centre(tok.el));
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

  function select(tok) {
    if (selected) selected.el.classList.remove('is-selected');
    selected = tok;
    tok?.el.classList.add('is-selected');
    host.classList.toggle('has-selection', !!tok);
  }

  function spawn() {
    if (tokens.length) return;
    const owners = (ionic ? model.tokens.map(t => t.metal)
      : model.kind === 'covalent' ? model.atoms.flatMap(a => Array(a.valence).fill(a.id))
      : Array(model.tokens).fill(model.atoms[0].id)).concat(Array(spares).fill('spare'));
    for (let i = 0; i < owners.length; i++) {
      const el = div('electron lw-electron', host);
      const atom = model.atoms.find(a => a.id === owners[i]);
      el.setAttribute('role', 'button');
      if (atom) {
        el.setAttribute('aria-label', `electron from ${atom.el}`);
        el.textContent = atom.el;
        el.style.setProperty('--c', colourOf(model, atom.id).fill);
      } else { // a spare (decoy) electron that belongs to no atom
        el.setAttribute('aria-label', 'spare electron');
        el.textContent = 'e⁻';
        el.classList.add('lw-electron--spare');
      }
      const tok = { el, index: i, owner: owners[i], slot: null, homeSlot: ionic && model.tokens[i] ? model.tokens[i].home : null, down: null };
      tokens.push(tok);
      el.addEventListener('pointerdown', () => { tok.down = centre(el); });
      stops.push(makeDraggable(el, {
        grabRadius: 8,
        onMove: () => {
          if (tok.slot) { free(tok); tok.wasPlaced = true; onChange?.(); }
          highlight(nearestFree(tok));
        },
        onDrop: () => {
          highlight(null);
          const c = centre(el);
          if (tok.down && Math.hypot(c.x - tok.down.x, c.y - tok.down.y) < 8) {
            // A tap, not a drag: pick this electron up (tap a slot next), or put it back in the tray.
            tok.down = null;
            settle(tok);
            select(selected === tok || tok.wasPlaced ? null : tok);
            tok.wasPlaced = false;
            sound?.tick();
            onChange?.();
            return;
          }
          select(null);
          const slot = nearestFree(tok);
          if (slot) { put(tok, slot); sound?.pop(); } else { settle(tok); sound?.tick(); }
          onChange?.();
        },
      }));
    }
    layout();
  }

  function reset() {
    select(null);
    tokens.forEach(t => { free(t); settle(t); });
    host.dataset.state = '';
    onChange?.();
  }

  // Tap a slot to drop the picked-up electron into it.
  for (const s of model.slots) {
    if (!isTarget(s)) continue;
    slotEls.get(s.id).addEventListener('click', () => {
      if (!selected || occupant.has(s.id)) return;
      const tok = selected;
      select(null);
      free(tok);
      put(tok, s);
      sound?.pop();
      onChange?.();
    });
  }

  if (hidden) {
    host.addEventListener('click', ev => {
      if (!selected || ev.target.closest('.lw-electron')) return;
      const slot = nearestFreeAt({ x: ev.clientX, y: ev.clientY });
      if (!slot) return;
      const tok = selected;
      select(null); free(tok); put(tok, slot); sound?.pop(); onChange?.();
    });
  }

  const ro = new ResizeObserver(layout);
  ro.observe(host);
  layout();
  if (!locked) spawn();

  return {
    model,
    /** Where each electron sits (slot id or null), so a question can be left and resumed. */
    snapshot: () => tokens.map(t => t.slot),
    restore(snap) {
      spawn();
      select(null);
      tokens.forEach(free);
      (snap || []).forEach((id, i) => { if (id && tokens[i]) put(tokens[i], slotById.get(id)); });
      onChange?.();
    },
    filled: () => new Set(occupant.keys()),
    /** slot id → atom id the electron in it came from */
    sources: () => new Map([...occupant].map(([id, t]) => [id, t.owner])),
    left: () => tokens.length - occupant.size,
    reset,
    unlock: spawn,
    setState(s) { host.dataset.state = s || ''; },
    reveal() {
      spawn();
      select(null);
      tokens.forEach(free);
      const pools = new Map();
      tokens.forEach(t => { if (!pools.has(t.owner)) pools.set(t.owner, []); pools.get(t.owner).push(t); });
      if (ionic || model.kind === 'covalent') answerOwners(model).forEach(o => put(pools.get(o.owner).pop(), slotById.get(o.slot)));
      else model.answer.forEach((id, i) => put(tokens[i], slotById.get(id)));
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
  const giver = new Map(answerOwners(model).map(o => [o.slot, o.owner]));
  for (const bd of model.bonds) {
    const A = model.atoms.find(a => a.id === bd.a), B = model.atoms.find(a => a.id === bd.b);
    const ang = (bd.angle * Math.PI) / 180, d = { x: Math.cos(ang), y: Math.sin(ang) }, p = { x: -d.y, y: d.x };
    for (let k = 0; k < bd.order; k++) {
      const off = (k - (bd.order - 1) / 2) * PAIR_HALF * 2;
      const x1 = A.x + d.x * 0.95 + p.x * off, y1 = A.y + d.y * 0.95 + p.y * off;
      const x2 = B.x - d.x * 0.95 + p.x * off, y2 = B.y - d.y * 0.95 + p.y * off;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const line = (ax, ay, bx, by, c) => `<line x1="${X(ax)}" y1="${Y(ay)}" x2="${X(bx)}" y2="${Y(by)}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
      parts.push(line(x1, y1, mx, my, colourOf(model, bd.a).ink) + line(mx, my, x2, y2, colourOf(model, bd.b).ink));
    }
  }
  for (const s of model.slots) {
    const dot = (model.kind === 'ionic' ? (s.prefilled || (s.type === 'lone' && !s.home && answer.has(s.id))) : s.type === 'lone' && answer.has(s.id));
    if (dot) parts.push(`<circle cx="${X(s.x)}" cy="${Y(s.y)}" r="5.5" fill="${colourOf(model, s.prefilled ? s.owners[0] : giver.get(s.id) ?? s.owners[0]).ink}"/>`);
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
