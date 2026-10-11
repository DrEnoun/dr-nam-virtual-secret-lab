// Small toolkit for the 16-bit look: draw smooth shapes, then "crisp" them into hard-edged pixel art with a 1px outline.
export const pxCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

const toRgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => { const x = toRgb(a), y = toRgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
export const shade = (hex, amount = 0.2) => mix(hex, '#000000', amount);
export const tint = (hex, amount = 0.25) => mix(hex, '#ffffff', amount);

// Removes anti-aliasing (alpha is on or off) and adds a 1px outline round the silhouette.
export function crisp(canvas, outline = '#231f20', alphaCut = 110) {
  const ctx = canvas.getContext('2d'), { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { solid[i] = d[i * 4 + 3] >= alphaCut ? 1 : 0; d[i * 4 + 3] = solid[i] ? 255 : 0; }
  if (outline) {
    const [r, g, b] = toRgb(outline);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (solid[i]) continue;
      if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) {
        d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Desaturates and dims a drawn sprite (locked worlds look greyed out).
export function greyscale(canvas, dim = 0.82) {
  const ctx = canvas.getContext('2d'), img = ctx.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) * dim + 14;
    d[i] = y * 0.97 + 2; d[i + 1] = y; d[i + 2] = y * 1.04 + 2;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Shape helpers: fill, then stroke with a darker tone of the same colour for a cel-shaded edge.
export function shapes(c) {
  const edge = (fill, line) => { if (line !== false) { c.strokeStyle = typeof line === 'string' ? line : shade(fill.startsWith('#') ? fill : '#808080', 0.38); c.lineWidth = 0.9; c.stroke(); } };
  return {
    E(x, y, rx, ry, fill, line = true, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); edge(fill, line); },
    R(x, y, w, h, r, fill, line = true) { c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill(); edge(fill, line); },
    P(pts, fill, line = true) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = fill; c.fill(); edge(fill, line); },
  };
}
