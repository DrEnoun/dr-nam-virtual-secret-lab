// Pixel badge shields for the badge shelf. Pure drawing on a 2D context: no DOM access at import time.
export const BADGE_W = 22, BADGE_H = 26;

// Each emblem is a small bitmap ('#' = pixel). Keys match "emblem" in data/worlds.json.
export const EMBLEMS = {
  cards: ['####...', '#..#...', '#.#####', '###...#', '..#...#', '..#...#', '..#####'],
  orbit: ['..###..', '.#...#.', '#..#..#', '#.###.#', '#..#..#', '.#...#.', '..###..'],
  grid:  ['#######', '#.#.#.#', '#######', '#.#.#.#', '#######', '#.#.#.#', '#######'],
  arrow: ['...#...', '..###..', '.#.#.#.', '...#...', '...#...', '...#...', '...#...'],
  bond:  ['.##...##.', '#..###..#', '.##...##.'],
  plus:  ['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...'],
};

const INK = '#231f20';

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c).map(v => v.toString(16).padStart(2, '0')).join('');
}

// Shield outline: wide at the top, tapering to a point.
const halfWidth = y => (y < 17 ? 9.5 : Math.max(0, 9.5 - (y - 16) * 1.05));

export function drawBadge(ctx, emblem, accent, earned) {
  const rim = earned ? accent : '#7d8b99', body = earned ? shade(accent, 0.45) : '#3a4654', glow = earned ? shade(accent, 0.7) : '#4b5866';
  ctx.clearRect(0, 0, BADGE_W, BADGE_H);
  const cx = BADGE_W / 2;
  for (let y = 1; y < BADGE_H - 1; y++) {
    const hw = halfWidth(y - 1);
    if (hw <= 0) continue;
    const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
    ctx.fillStyle = INK; ctx.fillRect(x0 - 1, y, x1 - x0 + 2, 1);
    ctx.fillStyle = rim; ctx.fillRect(x0, y, x1 - x0, 1);
    if (hw > 2 && y > 2) { ctx.fillStyle = y < 8 ? glow : body; ctx.fillRect(x0 + 2, y, Math.max(0, x1 - x0 - 4), 1); }
  }
  const bits = EMBLEMS[emblem] || EMBLEMS.plus;
  const ox = Math.round(cx - bits[0].length / 2), oy = Math.round(11 - bits.length / 2);
  ctx.fillStyle = earned ? '#ffffff' : '#9aa7b4';
  bits.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') ctx.fillRect(ox + i, oy + j, 1, 1); }));
}
