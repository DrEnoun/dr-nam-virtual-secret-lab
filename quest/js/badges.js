// Pixel badge shields for the badge shelf (16-bit look). Drawn in a canvas and crisped into hard pixels.
// No DOM access at import time, so this file can be imported in Node tests.
import { crisp, shade, tint } from './pxart.js';

export const BADGE_W = 44, BADGE_H = 52, BADGE_SS = 3;   // drawn at 3x for the finer look

// Each emblem is a small bitmap ('#' = pixel). Keys match "emblem" in data/worlds.json.
export const EMBLEMS = {
  cards: ['####...', '#..#...', '#.#####', '###...#', '..#...#', '..#...#', '..#####'],
  orbit: ['..###..', '.#...#.', '#..#..#', '#.###.#', '#..#..#', '.#...#.', '..###..'],
  grid:  ['#######', '#.#.#.#', '#######', '#.#.#.#', '#######', '#.#.#.#', '#######'],
  arrow: ['...#...', '..###..', '.#.#.#.', '...#...', '...#...', '...#...', '...#...'],
  bond:  ['.##...##.', '#..###..#', '.##...##.'],
  flask: ['..#####..', '...#.#...', '...#.#...', '..#...#..', '.#.....#.', '#..###..#', '#########'],
  plus:  ['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...'],
};

export function drawBadge(canvas, emblem, accent, earned) {
  const c = canvas.getContext('2d');
  c.setTransform(canvas.width / BADGE_W, 0, 0, canvas.height / BADGE_H, 0, 0);
  c.clearRect(0, 0, BADGE_W, BADGE_H);
  const rim = earned ? accent : '#8794a2', body = earned ? shade(accent, 0.5) : '#3a4654', glow = earned ? shade(accent, 0.28) : '#566473';
  const shield = (inset) => {
    c.beginPath();
    c.moveTo(4 + inset, 8 + inset); c.quadraticCurveTo(22, 2 + inset, 40 - inset, 8 + inset);
    c.lineTo(40 - inset, 28); c.bezierCurveTo(40 - inset, 40, 28, 46, 22, 50 - inset * 1.6);
    c.bezierCurveTo(16, 46, 4 + inset, 40, 4 + inset, 28); c.closePath();
  };
  shield(0); c.fillStyle = rim; c.fill();
  shield(3.4); const g = c.createLinearGradient(0, 8, 0, 48); g.addColorStop(0, glow); g.addColorStop(1, body); c.fillStyle = g; c.fill();
  c.save(); shield(3.4); c.clip();
  c.fillStyle = 'rgba(255,255,255,.14)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(30, 0); c.lineTo(8, 50); c.lineTo(0, 50); c.fill();
  c.restore();
  // laurel leaves and rivets
  c.fillStyle = earned ? tint(accent, 0.25) : '#6c7885';
  [[8, 44, -0.9], [36, 44, 0.9]].forEach(([x, y, a]) => { c.beginPath(); c.ellipse(x, y - 8, 2.2, 6, a, 0, Math.PI * 2); c.fill(); });
  c.fillStyle = earned ? '#ffffff' : '#a9b4c0'; [[10, 11], [34, 11]].forEach(([x, y]) => c.fillRect(x, y, 2, 2));
  // emblem
  const bits = EMBLEMS[emblem] || EMBLEMS.plus, px = 3;
  const ox = Math.round(22 - bits[0].length * px / 2), oy = Math.round(24 - bits.length * px / 2);
  c.fillStyle = 'rgba(0,0,0,.35)';
  bits.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') c.fillRect(ox + i * px + 1, oy + j * px + 1, px, px); }));
  c.fillStyle = earned ? '#ffffff' : '#a9b4c0';
  bits.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') c.fillRect(ox + i * px, oy + j * px, px, px); }));
  crisp(canvas, '#14202e', 110, 2);
}
