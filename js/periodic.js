// Periodic table reference: opens from the toolbar on any screen. Data is in data/periodic.json (works offline).
// Elements named in document.body.dataset.ptHighlight (comma list, set by an activity) get a ring.
import { t, lang } from './i18n.js';
import { sound } from './sound.js';
import { toast, guardLogos } from './ui.js';
import { downloadPoster } from './periodic-export.js';

const CATS = ['alkali', 'alkaline', 'transition', 'post', 'metalloid', 'nonmetal', 'halogen', 'noble', 'lanthanide', 'actinide'];
let data = null;
let open = null;

const load = () => (data ??= fetch('data/periodic.json').then(r => r.json()).then(j => j.elements));
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const pick = o => o?.[lang() === 'ms' ? 'ms' : 'en'] ?? o?.en ?? '';

export async function openPeriodicTable() {
  if (open) return;
  const elements = await load();
  const mark = new Set((document.body.dataset.ptHighlight || '').split(',').filter(Boolean));
  const root = el('div', 'overlay pt-overlay');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'pt-title');
  const box = el('div', 'pt glass');
  root.appendChild(box);

  const head = el('div', 'pt-head');
  const title = el('h2', 'pt-title', t('pt.title'));
  title.id = 'pt-title';
  const close = el('button', 'sticker pt-close', t('pt.close'));
  close.type = 'button'; close.dataset.target = '';
  const badge = el('div', 'pt-badge');
  badge.innerHTML = '<img src="brand/logos/chemistry-with-dr-nam-logo.jpg" alt="Chemistry with Dr. NAM" data-logo="Chemistry with Dr. NAM badge">';
  const actions = el('div', 'pt-actions');
  const dl = kind => {
    const b = el('button', 'sticker pt-dl', t(`pt.download.${kind}`));
    b.type = 'button'; b.dataset.target = '';
    b.addEventListener('click', async () => {
      sound.select(); b.disabled = true; toast(t('pt.preparing'), 2500);
      try { await downloadPoster(elements, kind); toast(t('pt.downloaded'), 2500); } catch (err) { console.warn(err); } finally { b.disabled = false; }
    });
    return b;
  };
  actions.append(dl('png'), dl('pdf'), close);
  head.append(badge, title, actions);

  const legend = el('div', 'pt-legend');
  const detail = el('div', 'pt-detail sticker-static');
  const grid = el('div', 'pt-grid');
  const wrap = el('div', 'pt-scroll');
  wrap.appendChild(grid);

  let filter = null;
  const cells = new Map();
  const select = e => {
    cells.forEach((c, z) => c.classList.toggle('is-selected', z === e.z));
    detail.innerHTML = '';
    const big = el('div', `pt-big pt-cat-${e.cat}`);
    big.append(el('span', 'pt-big__z', String(e.z)), el('span', 'pt-big__sym', e.sym));
    const info = el('div', 'pt-info');
    info.appendChild(el('h3', '', pick(e.name)));
    const line = (k, v) => { const p = el('p'); p.append(el('b', '', `${t(k)}: `), document.createTextNode(v)); info.appendChild(p); };
    line('pt.category', t(`pt.cat.${e.cat}`));
    line('pt.mass', e.mass);
    line('pt.group', e.group ? String(e.group) : '—');
    line('pt.period', e.row <= 7 ? String(e.row) : (e.row === 9 ? '6' : '7'));
    const v = el('p');
    v.append(el('b', '', `${t('pt.valence')}: `), document.createTextNode(e.valence != null ? String(e.valence) : t('pt.valence.varies')));
    if (e.valence != null) {
      const dots = el('span', 'pt-dots');
      dots.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < e.valence; i++) dots.appendChild(el('i'));
      v.appendChild(dots);
    }
    info.appendChild(v);
    detail.append(big, info);
  };

  for (const e of elements) {
    const b = el('button', `pt-cell pt-cat-${e.cat}`);
    b.type = 'button'; b.dataset.target = '';
    b.style.gridRow = e.row; b.style.gridColumn = e.col;
    if (mark.has(e.sym)) b.classList.add('is-marked');
    b.setAttribute('aria-label', `${e.z} ${pick(e.name)}`);
    b.append(el('span', 'pt-z', String(e.z)), el('span', 'pt-sym', e.sym));
    b.addEventListener('click', () => { sound.select(); select(e); });
    grid.appendChild(b);
    cells.set(e.z, b);
  }
  // Placeholders where the lanthanides and actinides belong in the main table
  [[6, '57–71'], [7, '89–103']].forEach(([row, label]) => {
    const p = el('span', 'pt-ph', label);
    p.style.gridRow = row; p.style.gridColumn = 3;
    grid.appendChild(p);
  });

  const applyFilter = () => {
    cells.forEach((c, z) => c.classList.toggle('is-dim', !!filter && elements[z - 1].cat !== filter));
    legend.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === filter)));
  };
  for (const c of CATS) {
    const b = el('button', `pt-chip pt-cat-${c}`, t(`pt.cat.${c}`));
    b.type = 'button'; b.dataset.target = ''; b.dataset.cat = c; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => { sound.select(); filter = filter === c ? null : c; applyFilter(); });
    legend.appendChild(b);
  }

  box.append(head, legend, wrap);
  // Wide screens: the detail card sits in the empty space above the transition metals.
  (matchMedia('(min-width: 861px) and (min-aspect-ratio: 1/1)').matches ? grid : box).appendChild(detail);
  legend.after(el('p', 'pt-tip', t('pt.tip')));
  document.body.appendChild(root);
  guardLogos(root);
  const first = (mark.size && elements.find(e => mark.has(e.sym))) || elements[0];
  select(first);

  const finish = () => { root.remove(); open = null; document.removeEventListener('keydown', onKey); };
  const onKey = ev => { if (ev.key === 'Escape') finish(); };
  document.addEventListener('keydown', onKey);
  close.addEventListener('click', () => { sound.select(); finish(); });
  open = { finish };
  close.focus();
}

export function closePeriodicTable() { open?.finish(); }
