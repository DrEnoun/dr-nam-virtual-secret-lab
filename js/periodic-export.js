// Builds a printable A4-landscape poster of the periodic table on a canvas, then saves it as PNG or PDF.
// Everything happens on the device (works offline). Colours are the Dr. NAM Day-theme tokens so it prints well.
import { t, lang } from './i18n.js';

const W = 3508, H = 2480; // A4 landscape at 300 dpi
const INK = '#3b365f', INK_DEEP = '#222366', STICKER = '#231f20', PAPER = '#ffffff', SKY = '#f0f6ff';
const CAT = {
  alkali: ['#fc7a7a', STICKER], alkaline: ['#febe10', STICKER], transition: ['#99c2ea', STICKER], post: ['#98abd2', STICKER],
  metalloid: ['#2fb3a8', STICKER], nonmetal: ['#c8f53d', STICKER], halogen: ['#6599ff', STICKER], noble: ['#90267f', '#fff'],
  lanthanide: ['#626ea9', '#fff'], actinide: ['#1170b8', '#fff'],
};
const CATS = Object.keys(CAT);
const pick = o => o?.[lang() === 'ms' ? 'ms' : 'en'] ?? o?.en ?? '';

const loadImage = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

export async function renderPoster(elements) {
  await Promise.all([document.fonts.load('800 60px "League Spartan"'), document.fonts.load('400 30px Questrial'), document.fonts.load('700 30px "League Spartan"')]);
  const logo = await loadImage('brand/logos/chemistry-with-dr-nam-logo.jpg');
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const D = '"League Spartan", system-ui, sans-serif', B = 'Questrial, system-ui, sans-serif';

  c.fillStyle = SKY; c.fillRect(0, 0, W, H);
  c.fillStyle = PAPER; roundRect(c, 60, 60, W - 120, H - 120, 70); c.fill();
  c.lineWidth = 8; c.strokeStyle = STICKER; c.stroke();

  // Header: logo disc, title, tagline
  const lx = 190, ly = 200, lr = 190;
  c.save(); c.beginPath(); c.arc(lx + lr, ly + lr, lr, 0, Math.PI * 2); c.closePath();
  c.fillStyle = '#fff'; c.fill(); c.lineWidth = 8; c.strokeStyle = STICKER; c.stroke(); c.clip();
  if (logo) c.drawImage(logo, lx, ly, lr * 2, lr * 2);
  c.restore();
  c.fillStyle = INK_DEEP; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  c.font = `800 190px ${D}`; c.fillText(t('pt.title'), 660, 330);
  c.fillStyle = '#c8f53d'; c.fillRect(660, 365, 420, 24); // lime title rule
  c.fillStyle = INK; c.font = `400 56px ${B}`; c.fillText(t('app.tagline'), 660, 480);
  c.font = `400 46px ${B}`; c.fillText(t('app.brand'), 660, 545);

  // Legend (font shrinks so all ten chips fit on one row)
  const ly2 = 650, maxRow = W - 380;
  let fs = 42;
  const widths = () => CATS.map(k => { c.font = `700 ${fs}px ${D}`; return c.measureText(t(`pt.cat.${k}`)).width + fs * 1.6; });
  while (widths().reduce((a, w) => a + w + 14, 0) > maxRow && fs > 24) fs--;
  let x = 190;
  c.font = `700 ${fs}px ${D}`;
  CATS.forEach((k, i) => {
    const w = widths()[i];
    c.fillStyle = CAT[k][0]; roundRect(c, x, ly2, w, 74, 37); c.fill(); c.lineWidth = 4; c.strokeStyle = STICKER; c.stroke();
    c.fillStyle = CAT[k][1]; c.textAlign = 'center'; c.fillText(t(`pt.cat.${k}`), x + w / 2, ly2 + 37 + fs * 0.35);
    x += w + 14;
  });
  c.textAlign = 'left';

  // Grid: 18 columns, 7 rows + gap + 2 f-block rows
  const cell = 150, gap = 8, step = cell + gap;
  const gx = (W - (18 * step - gap)) / 2 + 40, gy = 800;
  const yOf = r => (r <= 7 ? gy + (r - 1) * step : gy + 7 * step + cell * 0.4 + (r - 9) * step);
  const xOf = col => gx + (col - 1) * step;

  // Group numbers above, period numbers left
  c.fillStyle = INK; c.font = `700 40px ${D}`; c.textAlign = 'center';
  for (let g = 1; g <= 18; g++) c.fillText(String(g), xOf(g) + cell / 2, gy - 22);
  c.textAlign = 'right';
  for (let p = 1; p <= 7; p++) c.fillText(String(p), xOf(1) - 24, yOf(p) + cell / 2 + 14);
  c.font = `400 34px ${B}`; c.textAlign = 'right';
  c.fillText(t('pt.group'), xOf(1) - 24, gy - 22);
  c.save(); c.translate(xOf(1) - 86, yOf(4) + cell / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.fillText(t('pt.period'), 0, 0); c.restore();

  for (const e of elements) {
    const [bg, fg] = CAT[e.cat], cx = xOf(e.col), cy = yOf(e.row);
    c.fillStyle = bg; roundRect(c, cx, cy, cell, cell, 14); c.fill(); c.lineWidth = 4; c.strokeStyle = STICKER; c.stroke();
    c.fillStyle = fg; c.textAlign = 'left'; c.font = `700 30px ${B}`; c.fillText(String(e.z), cx + 10, cy + 34);
    c.textAlign = 'center'; c.font = `800 64px ${D}`; c.fillText(e.sym, cx + cell / 2, cy + 90);
    const name = pick(e.name).replace(/ \(.*\)/, '');
    let size = 25; c.font = `400 ${size}px ${B}`;
    while (c.measureText(name).width > cell - 12 && size > 15) { size--; c.font = `400 ${size}px ${B}`; }
    c.fillText(name, cx + cell / 2, cy + 120);
    c.font = `400 22px ${B}`; c.fillText(e.mass, cx + cell / 2, cy + 144);
  }
  // Placeholders for the f-block
  c.setLineDash([14, 10]); c.lineWidth = 4; c.strokeStyle = INK; c.fillStyle = INK; c.textAlign = 'center'; c.font = `400 28px ${B}`;
  [[6, '57–71'], [7, '89–103']].forEach(([r, lab]) => { roundRect(c, xOf(3), yOf(r), cell, cell, 14); c.stroke(); c.fillText(lab, xOf(3) + cell / 2, yOf(r) + cell / 2 + 10); });
  c.setLineDash([]);

  // "How to read" key in the empty block above the transition metals
  const kx = xOf(3), ky = yOf(1), kw = 10 * step - gap, kh = 3 * step - gap;
  c.fillStyle = SKY; roundRect(c, kx, ky, kw, kh, 30); c.fill(); c.lineWidth = 5; c.strokeStyle = STICKER; c.stroke();
  const ex = elements.find(e => e.sym === 'Cl'), [ebg, efg] = CAT[ex.cat];
  const bx = kx + 40, by = ky + 50, bs = 280;
  c.fillStyle = ebg; roundRect(c, bx, by, bs, bs, 24); c.fill(); c.lineWidth = 6; c.strokeStyle = STICKER; c.stroke();
  c.fillStyle = efg; c.textAlign = 'left'; c.font = `700 52px ${B}`; c.fillText(String(ex.z), bx + 18, by + 62);
  c.textAlign = 'center'; c.font = `800 150px ${D}`; c.fillText(ex.sym, bx + bs / 2, by + 180);
  c.font = `400 44px ${B}`; c.fillText(pick(ex.name), bx + bs / 2, by + 232); c.font = `400 36px ${B}`; c.fillText(ex.mass, bx + bs / 2, by + 268);
  c.fillStyle = INK_DEEP; c.textAlign = 'left'; c.font = `800 64px ${D}`; c.fillText(t('pt.poster.key'), bx + bs + 60, by + 70);
  c.fillStyle = INK; c.font = `400 42px ${B}`;
  let ty = by + 135;
  for (const line of [t('pt.poster.key.z'), t('pt.poster.key.sym'), t('pt.poster.key.mass')]) ty = wrap(c, line, bx + bs + 60, ty, kw - bs - 130, 50) + 40;
  // Footer
  c.fillStyle = INK; c.textAlign = 'center'; c.font = `400 38px ${B}`;
  c.fillText(t('pt.tip'), W / 2, H - 150);
  c.fillText(`${t('app.title')}  ·  ${t('app.brand')}`, W / 2, H - 98);

  return cv;
}

function wrap(c, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (c.measureText(test).width > maxW && line) { c.fillText(line, x, yy); line = w; yy += lh; } else line = test;
  }
  if (line) c.fillText(line, x, yy);
  return yy;
}

const blobOf = (cv, type, q) => new Promise(res => cv.toBlob(res, type, q));
function save(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

/** One-page A4 landscape PDF holding the poster as a JPEG (no library needed). */
export function pdfFromJpeg(jpeg, wpx, hpx) {
  const enc = new TextEncoder();
  const chunks = [], offsets = [];
  let len = 0;
  const push = d => { const b = typeof d === 'string' ? enc.encode(d) : d; chunks.push(b); len += b.length; };
  const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n`); push(body); push('\nendobj\n'); };
  push('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>');
  const content = 'q 842 0 0 595 0 0 cm /Im0 Do Q';
  obj(4, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  offsets[5] = len;
  push(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${wpx} /Height ${hpx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  push(jpeg); push('\nendstream\nendobj\n');
  const xref = len;
  push(`xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map(n => String(offsets[n]).padStart(10, '0') + ' 00000 n \n').join('')}`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(len); let p = 0;
  for (const b of chunks) { out.set(b, p); p += b.length; }
  return out;
}

export async function downloadPoster(elements, kind) {
  const cv = await renderPoster(elements);
  const base = `dr-nam-periodic-table-${lang() === 'ms' ? 'bm' : 'en'}`;
  if (kind === 'png') return save(await blobOf(cv, 'image/png'), `${base}.png`);
  const jpeg = new Uint8Array(await (await blobOf(cv, 'image/jpeg', 0.93)).arrayBuffer());
  save(new Blob([pdfFromJpeg(jpeg, cv.width, cv.height)], { type: 'application/pdf' }), `${base}.pdf`);
}
