// Memory-match rules: pure functions (no DOM) so they can be tested in Node.
// A "set" is a group of cards that belong together (2 for a pair, 3 for the boss's name + formula + shape).

export const COINS_PER_MATCH = 8;
export const KIND_LABEL = { name: 'NAME', formula: 'FORMULA', shape: 'SHAPE' };

function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Sets that share a `uniq` key (for example two molecules with the same shape) are never dealt together,
// because their shape cards could not be told apart.
export function pickSets(level, rng = Math.random) {
  const used = new Set(), picked = [];
  for (const s of shuffle(level.sets, rng)) {
    if (picked.length === level.pick) break;
    if (used.has(s.uniq)) continue;
    used.add(s.uniq); picked.push(s);
  }
  return picked;
}

export function newGame(level, rng = Math.random) {
  const sets = pickSets(level, rng);
  const cards = shuffle(sets.flatMap(s => s.cards.map(c => ({ ...c, setId: s.id }))), rng).map((c, i) => ({ ...c, uid: i }));
  return {
    level, group: level.group, cards, sets, byUid: Object.fromEntries(cards.map(c => [c.uid, c])), setById: Object.fromEntries(sets.map(s => [s.id, s])),
    open: [], seen: new Set(), matched: new Set(), hearts: 3, matches: 0, total: sets.length, streak: 0, locked: false, over: false, won: false, coins: 0, xp: 0,
  };
}

// Flip one card. Returns { type: 'ignore' | 'open' | 'match' | 'mismatch', ... }.
// A mismatch costs a heart only when every flipped card had already been seen (the player should have remembered).
export function flip(g, uid) {
  const card = g.byUid[uid];
  if (!card || g.locked || g.over || g.matched.has(uid) || g.open.includes(uid)) return { type: 'ignore' };
  g.open.push(uid);
  const open = g.open.map(u => g.byUid[u]);
  if (open.some(c => c.setId !== card.setId)) {
    const careless = open.every(c => g.seen.has(c.uid));
    open.forEach(c => g.seen.add(c.uid));
    g.locked = true; g.streak = 0;
    if (careless) g.hearts -= 1;
    if (g.hearts <= 0) { g.over = true; g.won = false; }
    const facts = [...new Set(open.map(c => c.setId))].map(id => g.setById[id].fact);
    return { type: 'mismatch', cards: open, careless, hearts: g.hearts, facts, over: g.over };
  }
  if (open.length < g.group) return { type: 'open', card };
  g.open = []; open.forEach(c => g.matched.add(c.uid));
  g.matches += 1; g.streak += 1;
  const coins = COINS_PER_MATCH + Math.min(g.streak - 1, 4) * 2, xp = 10;
  g.coins += coins; g.xp += xp;
  if (g.matches === g.total) { g.over = true; g.won = true; }
  return { type: 'match', cards: open, set: g.setById[card.setId], streak: g.streak, coins, xp, won: g.won };
}

// After a mismatch has been shown, turn the cards back over.
export function clearPending(g) { g.open = []; g.locked = false; }

export const starsForHearts = hearts => Math.min(3, Math.max(1, hearts));
