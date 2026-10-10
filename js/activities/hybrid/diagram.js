// 2D structure of a molecule with tap/shoot targets (HTML buttons over an SVG drawing, so hands, mouse and touch all work).
import { atomOf, neighbours, countTargets } from './rules.js';

const NS = 'http://www.w3.org/2000/svg';
const div = (cls, parent) => { const e = document.createElement('div'); e.className = cls; parent?.appendChild(e); return e; };
const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

/** Choose lone-pair angles that stay away from the bonds and from each other (greedy; data can override with lpAngles). */
function lonePairAngles(mol, atom) {
  if (atom.lpAngles) return atom.lpAngles;
  const taken = neighbours(mol, atom.id).map(({ other }) => (Math.atan2(other.xy[1] - atom.xy[1], other.xy[0] - atom.xy[0]) * 180) / Math.PI);
  const out = [];
  for (let i = 0; i < (atom.lp || 0); i++) {
    let best = 0, bd = -1;
    for (let a = 0; a < 360; a += 15) {
      const d = Math.min(...[...taken, ...out].map(t => Math.abs((((a - t) % 360) + 540) % 360 - 180)), 180);
      if (d > bd) { bd = d; best = a; }
    }
    out.push(best);
  }
  return out;
}

/**
 * createDiagram(host, mol, { mode, central, onChange })
 * modes: 'count' (shoot bond lines and lone pairs), 'pi' (label each line σ or π), 'label' (Hard: pick a marked atom), 'static'.
 */
export function createDiagram(host, mol, { mode = 'static', central = null, onChange = null } = {}) {
  host.innerHTML = '';
  host.classList.add('hy-diagram');
  const skeletal = !!mol.drug;
  const S = skeletal ? 1 : 1.75; // small molecules are drawn with longer bonds so every line is easy to hit
  const P = a => [a.xy[0] * S, a.xy[1] * S];
  const wrap = div('hy-diagram__inner', host);
  const svg = svgEl('svg', { class: 'hy-diagram__lines' });
  wrap.appendChild(svg);
  const layer = div('hy-diagram__layer', wrap);
  const picked = new Set();
  const labels = new Map(); // pi mode: line id → 'sigma' | 'pi'
  const els = new Map();    // target id → element
  const atomEls = new Map();
  let u = 80, X = x => x, Y = y => y, W = 0, H = 0;

  const xs = mol.atoms.map(a => P(a)[0]), ys = mol.atoms.map(a => P(a)[1]);
  const pad = skeletal ? 0.9 : 1.15;
  const bx = [Math.min(...xs) - pad, Math.max(...xs) + pad], by = [Math.min(...ys) - pad, Math.max(...ys) + pad];

  const atomR = () => (skeletal ? 0.2 * u : 0.34 * u);
  const lineGap = () => Math.max(0.2 * u, 20);

  // --- atoms
  for (const a of mol.atoms) {
    const labelled = !skeletal || a.el !== 'C' || a.mark || a.id === central;
    const el = div(`hy-atom${a.id === central ? ' is-central' : ''}${labelled ? '' : ' is-bare'}${a.mark ? ' is-marked' : ''}`, layer);
    if (labelled) el.textContent = skeletal && a.h && a.el !== 'C' ? `${a.el}H${a.h > 1 ? a.h : ''}` : (skeletal && a.h && a.el === 'C' && !a.mark ? a.el : a.el);
    if (skeletal && a.el === 'C' && a.h === 3 && a.mark) el.textContent = 'CH₃';
    el.dataset.atom = a.id;
    atomEls.set(a.id, el);
    if (a.mark) {
      el.dataset.target = ''; el.setAttribute('role', 'button'); el.tabIndex = 0;
      el.setAttribute('aria-label', `atom ${a.mark}`);
      const n = div('hy-atom__num', el); n.textContent = String(a.mark);
      const badge = div('hy-atom__label', el);
      el.addEventListener('click', () => { if (mode === 'label') onChange?.({ atom: a.id }); });
    }
  }

  function layout() {
    W = host.clientWidth; H = host.clientHeight;
    if (!W || !H) return;
    u = Math.min((W * 0.96) / (bx[1] - bx[0]), (H * 0.96) / (by[1] - by[0]), 120);
    X = x => W / 2 + (x - (bx[0] + bx[1]) / 2) * u;
    Y = y => H / 2 - (y - (by[0] + by[1]) / 2) * u;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = '';
    layer.querySelectorAll('.hy-line, .hy-lp, .hy-chip').forEach(n => n.remove());
    els.clear();
    const r = atomR();
    for (const a of mol.atoms) {
      const el = atomEls.get(a.id);
      const d = el.classList.contains('is-bare') ? 0.01 : (skeletal ? (a.mark ? 0.9 : 0.62) * 0.9 * u * 0.62 : 2 * r);
      const size = el.classList.contains('is-bare') ? 6 : (skeletal ? Math.max(a.mark ? 50 : 28, d) : d);
      el.style.width = el.style.height = `${size}px`;
      el.style.left = `${X(P(a)[0]) - size / 2}px`; el.style.top = `${Y(P(a)[1]) - size / 2}px`;
      el.style.fontSize = `${Math.max(14, size * (skeletal ? 0.5 : 0.55))}px`;
    }
    // bonds
    const gap = lineGap();
    for (const b of mol.bonds) {
      const A = atomOf(mol, b.a), B = atomOf(mol, b.b);
      const ax = X(P(A)[0]), ay = Y(P(A)[1]), bx2 = X(P(B)[0]), by2 = Y(P(B)[1]);
      const len = Math.hypot(bx2 - ax, by2 - ay), ux = (bx2 - ax) / len, uy = (by2 - ay) / len, px = -uy, py = ux;
      const cut = el => (atomEls.get(el.id).classList.contains('is-bare') ? 0 : (skeletal ? 15 : r * 1.02));
      for (let i = 0; i < b.order; i++) {
        const off = (i - (b.order - 1) / 2) * gap;
        const x1 = ax + ux * cut(A) + px * off, y1 = ay + uy * cut(A) + py * off;
        const x2 = bx2 - ux * cut(B) + px * off, y2 = by2 - uy * cut(B) + py * off;
        const id = `${b.a}-${b.b}#${i}`;
        svg.appendChild(svgEl('line', { x1, y1, x2, y2, class: `hy-bond hy-bond--${id.replace(/[^\w-]/g, '_')}`, 'data-id': id }));
        const involved = central && (b.a === central || b.b === central);
        if ((mode === 'count' && involved) || (mode === 'pi' && involved)) {
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, L = Math.hypot(x2 - x1, y2 - y1);
          if (mode === 'count') {
            const btn = div(`hy-line${picked.has(id) ? ' is-picked' : ''}`, layer);
            btn.dataset.target = ''; btn.setAttribute('role', 'button'); btn.tabIndex = 0;
            btn.setAttribute('aria-label', `bond line ${i + 1} ${A.el}-${B.el}`);
            btn.style.width = `${L}px`; btn.style.height = `${Math.max(gap * 0.95, 18)}px`;
            btn.style.left = `${mx - L / 2}px`; btn.style.top = `${my - Math.max(gap * 0.95, 18) / 2}px`;
            btn.style.transform = `rotate(${(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI}deg)`;
            btn.addEventListener('click', () => toggle(id));
            els.set(id, btn);
          } else {
            const t = b.order === 1 ? 0.5 : b.order === 2 ? [0.32, 0.68][i] : [0.2, 0.5, 0.8][i];
            const chip = div('hy-chip', layer);
            chip.dataset.target = ''; chip.setAttribute('role', 'button'); chip.tabIndex = 0;
            chip.style.left = `${x1 + (x2 - x1) * t - 20}px`; chip.style.top = `${y1 + (y2 - y1) * t - 20}px`;
            chip.addEventListener('click', () => cycle(id));
            paintChip(chip, id);
            els.set(id, chip);
          }
        }
      }
    }
    // lone pairs (central atom: real targets; others: decoys in count mode, plain dots otherwise)
    for (const a of mol.atoms) {
      const angs = lonePairAngles(mol, a);
      for (let i = 0; i < (a.lp || 0); i++) {
        const ang = (angs[i] * Math.PI) / 180, d = (skeletal ? 26 : r + 0.34 * u);
        const cx = X(P(a)[0]) + Math.cos(ang) * d, cy = Y(P(a)[1]) - Math.sin(ang) * d;
        const id = `${a.id}:lp${i}`;
        const interactive = mode === 'count' && (a.id === central || true);
        const lp = div(`hy-lp${interactive ? ' is-target' : ''}${picked.has(id) ? ' is-picked' : ''}${a.id === central ? '' : ' is-other'}`, layer);
        const size = Math.max(0.5 * u, 34);
        lp.style.width = lp.style.height = `${size}px`; lp.style.left = `${cx - size / 2}px`; lp.style.top = `${cy - size / 2}px`;
        const rot = -(angs[i]);
        lp.innerHTML = `<i style="transform:rotate(${rot}deg) translateY(-4px)"></i><i style="transform:rotate(${rot}deg) translateY(4px)"></i>`;
        if (interactive) {
          lp.dataset.target = ''; lp.setAttribute('role', 'button'); lp.tabIndex = 0;
          lp.setAttribute('aria-label', `lone pair on ${a.el}`);
          lp.addEventListener('click', () => toggle(id));
          els.set(id, lp);
        }
      }
    }
  }

  function toggle(id) {
    if (picked.has(id)) picked.delete(id); else picked.add(id);
    els.get(id)?.classList.toggle('is-picked', picked.has(id));
    onChange?.({ picked: new Set(picked) });
  }
  function paintChip(chip, id) {
    const v = labels.get(id);
    chip.textContent = v === 'sigma' ? 'σ' : v === 'pi' ? 'π' : '?';
    chip.dataset.v = v || '';
  }
  function cycle(id) {
    const v = labels.get(id);
    const next = v === undefined ? 'sigma' : v === 'sigma' ? 'pi' : undefined;
    if (next) labels.set(id, next); else labels.delete(id);
    paintChip(els.get(id), id);
    onChange?.({ labels: new Map(labels) });
  }

  const ro = new ResizeObserver(layout);
  ro.observe(host);
  layout();

  return {
    picked: () => new Set(picked),
    labels: () => new Map(labels),
    setPicked(set) { picked.clear(); set?.forEach(k => picked.add(k)); els.forEach((e, id) => e.classList.toggle('is-picked', picked.has(id))); },
    setLabels(map) { labels.clear(); map?.forEach((v, k) => labels.set(k, v)); els.forEach((e, id) => e.classList?.contains('hy-chip') && paintChip(e, id)); },
    reset() { picked.clear(); labels.clear(); layout(); onChange?.({ picked: new Set(), labels: new Map() }); },
    /** Hard level: show a label (sp, sp², sp³) on a marked atom and colour it. */
    setAtomLabel(id, text, state) {
      const el = atomEls.get(id); if (!el) return;
      el.querySelector('.hy-atom__label').textContent = text || '';
      el.dataset.state = state || '';
    },
    selectAtom(id) { atomEls.forEach((e, k) => e.classList.toggle('is-selected', k === id)); },
    flash(ids, kind) { ids.forEach(id => { const n = els.get(id); if (n) { n.classList.add(`is-${kind}`); setTimeout(() => n.classList.remove(`is-${kind}`), 1400); } }); },
    markCentral: on => atomEls.get(central)?.classList.toggle('is-central', on),
    destroy() { ro.disconnect(); host.innerHTML = ''; host.classList.remove('hy-diagram'); },
  };
}
