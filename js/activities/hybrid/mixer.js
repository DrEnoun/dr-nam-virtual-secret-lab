// The orbital mixer: drag (or tap) s and p orbitals into the mixer, then watch them blend into hybrid lobes.
import { makeDraggable } from '../../drag.js';

const NS = 'http://www.w3.org/2000/svg';
const div = (cls, parent) => { const e = document.createElement('div'); e.className = cls; parent?.appendChild(e); return e; };
const ORBITALS = [
  { kind: 's', name: 's' }, { kind: 'p', name: 'pₓ', rot: 0 }, { kind: 'p', name: 'p_y', rot: 90 }, { kind: 'p', name: 'p_z', rot: 45 },
  { kind: 'd', name: 'd' }, { kind: 'd', name: 'd' },
];

function orbitalSvg(o) {
  if (o.kind === 's') return `<svg viewBox="-30 -30 60 60"><circle r="20" class="hy-orb__s"/></svg>`;
  if (o.kind === 'd') return `<svg viewBox="-30 -30 60 60" class="hy-orb__d"><ellipse rx="7" ry="22" transform="rotate(45)"/><ellipse rx="7" ry="22" transform="rotate(-45)"/></svg>`;
  return `<svg viewBox="-30 -30 60 60"><g transform="rotate(${o.rot})" class="hy-orb__p"><ellipse cx="-12" rx="12" ry="7"/><ellipse cx="12" rx="12" ry="7"/></g></svg>`;
}

/** Lobe directions (degrees) used to draw the hybrid orbitals in 2D; sp³ has a shorter lobe pointing at the viewer. */
export function lobePlan(groups) {
  if (groups === 2) return [{ a: 0, l: 1 }, { a: 180, l: 1 }];
  if (groups === 3) return [{ a: 90, l: 1 }, { a: 210, l: 1 }, { a: 330, l: 1 }];
  return [{ a: 90, l: 1 }, { a: 210, l: 1 }, { a: 330, l: 1 }, { a: 270, l: 0.55, front: true }];
}

export function createMixer(host, { sound, onChange } = {}) {
  host.innerHTML = '';
  host.classList.add('hy-mixer');
  const zone = div('hy-mixer__zone', host);
  zone.innerHTML = '<span class="hy-mixer__label"></span>';
  const tray = div('hy-mixer__tray', host);
  const result = document.createElementNS(NS, 'svg');
  result.setAttribute('class', 'hy-mixer__result');
  host.appendChild(result);
  const tokens = [];
  const stops = [];
  let W = 0, H = 0, zr = 100, zc = { x: 0, y: 0 }, locked = false;

  ORBITALS.forEach((o, i) => {
    const el = div(`hy-orb hy-orb--${o.kind}`, host);
    el.innerHTML = orbitalSvg(o) + `<b>${o.name}</b>`;
    el.dataset.target = ''; el.setAttribute('role', 'button'); el.tabIndex = 0;
    el.setAttribute('aria-label', `${o.name} orbital`);
    const tok = { el, o, i, inZone: false, down: null };
    tokens.push(tok);
    el.addEventListener('pointerdown', () => { const r = el.getBoundingClientRect(); tok.down = { x: r.left, y: r.top }; });
    stops.push(makeDraggable(el, {
      grabRadius: 10,
      onMove: () => { if (!locked) zone.classList.toggle('is-over', overZone(el)); },
      onDrop: () => {
        zone.classList.remove('is-over');
        if (locked) { place(); return; }
        const r = el.getBoundingClientRect();
        const tap = tok.down && Math.hypot(r.left - tok.down.x, r.top - tok.down.y) < 8;
        tok.inZone = tap ? !tok.inZone : overZone(el);
        tok.down = null;
        sound?.pop(); place(); onChange?.();
      },
    }));
  });

  function overZone(el) {
    const r = el.getBoundingClientRect(), z = zone.getBoundingClientRect();
    return Math.hypot(r.left + r.width / 2 - (z.left + z.width / 2), r.top + r.height / 2 - (z.top + z.height / 2)) < z.width / 2;
  }

  function place() {
    const inZ = tokens.filter(t => t.inZone), out = tokens.filter(t => !t.inZone);
    const size = tokens[0].el.offsetWidth || 64;
    inZ.forEach((t, k) => {
      const ang = (k / Math.max(inZ.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const rad = inZ.length === 1 ? 0 : zr * 0.52;
      t.el.style.left = `${zc.x + Math.cos(ang) * rad - size / 2}px`;
      t.el.style.top = `${zc.y + Math.sin(ang) * rad - size / 2}px`;
      t.el.classList.add('in-zone');
    });
    const gap = Math.min(size * 1.25, (W * 0.94) / tokens.length);
    out.forEach((t, k) => {
      t.el.style.left = `${W / 2 + (k - (out.length - 1) / 2) * gap - size / 2}px`;
      t.el.style.top = `${H - size - 14}px`;
      t.el.classList.remove('in-zone');
    });
    zone.querySelector('.hy-mixer__label').textContent = inZ.length ? '' : zone.dataset.hint || '';
  }

  function layout() {
    W = host.clientWidth; H = host.clientHeight;
    if (!W || !H) return;
    const size = Math.max(52, Math.min(78, W / 9));
    host.style.setProperty('--orb', `${size}px`);
    zr = Math.min(W * 0.3, (H - size * 2.2) / 2.05);
    zc = { x: W / 2, y: zr + 12 };
    Object.assign(zone.style, { width: `${zr * 2}px`, height: `${zr * 2}px`, left: `${zc.x - zr}px`, top: `${zc.y - zr}px` });
    tray.style.height = `${size + 28}px`;
    result.setAttribute('viewBox', `0 0 ${W} ${H}`);
    result.style.width = `${W}px`; result.style.height = `${H}px`;
    place();
  }
  const ro = new ResizeObserver(layout);
  ro.observe(host);
  layout();

  const count = k => tokens.filter(t => t.inZone && t.o.kind === k).length;
  return {
    counts: () => ({ s: count('s'), p: count('p'), d: count('d') }),
    setHint(text) { zone.dataset.hint = text; place(); },
    snapshot: () => tokens.map(t => t.inZone),
    restore(arr) { tokens.forEach((t, i) => { t.inZone = !!arr?.[i]; }); place(); },
    reset() { tokens.forEach(t => { t.inZone = false; }); result.innerHTML = ''; host.classList.remove('is-mixed'); locked = false; place(); onChange?.(); },
    lock() { locked = true; },
    /** Blend the orbitals in the zone into `groups` hybrid lobes, and make the leftover p orbitals glow. */
    mix(groups, name) {
      locked = true;
      host.classList.add('is-mixed');
      const inZ = tokens.filter(t => t.inZone);
      inZ.forEach(t => { t.el.style.left = `${zc.x - t.el.offsetWidth / 2}px`; t.el.style.top = `${zc.y - t.el.offsetHeight / 2}px`; t.el.classList.add('is-blending'); });
      result.innerHTML = '';
      const R = zr * 0.8;
      lobePlan(groups).forEach((l, i) => {
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('transform', `translate(${zc.x} ${zc.y}) rotate(${-l.a})`);
        g.setAttribute('class', `hy-lobe${l.front ? ' is-front' : ''}`);
        g.style.animationDelay = `${0.45 + i * 0.12}s`;
        const len = R * l.l;
        g.innerHTML = `<path d="M0 0 C ${len * 0.25} ${-len * 0.3}, ${len * 0.8} ${-len * 0.28}, ${len} 0 C ${len * 0.8} ${len * 0.28}, ${len * 0.25} ${len * 0.3}, 0 0 Z"/>`;
        result.appendChild(g);
      });
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', zc.x); t.setAttribute('y', zc.y + zr + 36); t.setAttribute('text-anchor', 'middle'); t.setAttribute('class', 'hy-mixer__name');
      t.textContent = `${groups} × ${name}`;
      result.appendChild(t);
      tokens.filter(x => !x.inZone && x.o.kind === 'p').forEach(x => x.el.classList.add('is-glowing'));
    },
    destroy() { ro.disconnect(); stops.forEach(s => s()); host.innerHTML = ''; host.classList.remove('hy-mixer', 'is-mixed'); },
  };
}
