// Diner Dash rules: pure functions (no DOM) so the chemistry can be tested in Node.
export const MINUS = '−';

export const gcd = (a, b) => (b ? gcd(b, a % b) : a);
export const chargeStr = n => (n > 0 ? `+${n}` : `${MINUS}${Math.abs(n)}`);
export const orderName = (cat, an) => `${cat.name} ${an.name}`;
export const pretty = s => s.replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
export const capitalise = s => s.charAt(0).toUpperCase() + s.slice(1);

// Smallest whole-number ratio that balances the charges, e.g. Al3+ + O2- -> 2 Al, 3 O -> "Al2O3".
export function formulaOf(cat, an) {
  const g = gcd(cat.charge, Math.abs(an.charge));
  const nc = Math.abs(an.charge) / g;
  const na = cat.charge / g;
  const part = (ion, n) => (n === 1 ? ion.sym : ion.poly ? `(${ion.sym})${n}` : `${ion.sym}${n}`);
  return { nc, na, text: part(cat, nc) + part(an, na) };
}

const sub = s => s.replace(/\d+/g, m => `<sub>${m}</sub>`);
export const formulaHTML = text => sub(text);
// Formula text with an optional charge after ^, e.g. "SO4^2-" -> SO<sub>4</sub><sup>2−</sup>.
export const chargedHTML = text => { const [f, ch] = text.split('^'); return sub(f) + (ch ? `<sup>${ch.replace('-', MINUS)}</sup>` : ''); };
export const ionHTML = ion => {
  const n = Math.abs(ion.charge);
  return `${sub(ion.sym)}<sup>${n > 1 ? n : ''}${ion.charge > 0 ? '+' : MINUS}</sup>`;
};

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A boss shift has no orders of its own: it mixes the pools of the shifts listed in `mixFrom`.
export function orderPool(level, levels = []) {
  if (!level.mixFrom) return level.orders;
  const seen = new Set(), pool = [];
  for (const id of level.mixFrom) {
    for (const o of levels.find(l => l.id === id)?.orders || []) {
      const key = `${o.cation}|${o.anion}`;
      if (!seen.has(key)) { seen.add(key); pool.push(o); }
    }
  }
  return pool;
}

export function buildOrders(level, ions, rng = Math.random, levels = []) {
  const byId = Object.fromEntries(ions.map(i => [i.id, i]));
  return shuffle(orderPool(level, levels), rng).slice(0, level.customers).map(o => ({
    cat: byId[o.cation], an: byId[o.anion], fact: o.fact || null,
  }));
}

// The tray holds the two right ions plus decoys, alternating positive and negative decoys.
export function buildTray(order, ions, decoys, rng = Math.random) {
  const rest = shuffle(ions.filter(i => i.id !== order.cat.id && i.id !== order.an.id), rng);
  const pos = rest.filter(i => i.charge > 0), neg = rest.filter(i => i.charge < 0);
  const picked = [];
  while (picked.length < decoys && (pos.length || neg.length)) {
    const next = picked.length % 2 === 0 ? (neg.length ? neg : pos) : (pos.length ? pos : neg);
    picked.push(next.shift());
  }
  return shuffle([order.cat, order.an, ...picked], rng);
}

export const starsFor = heartsLeft => Math.min(3, Math.max(1, heartsLeft));
export const tipFor = patienceFraction => 5 + Math.round(Math.max(0, Math.min(1, patienceFraction)) * 10);

export function netCharge(counts, ionById) {
  let pos = 0, neg = 0;
  for (const [id, n] of Object.entries(counts)) {
    const c = ionById[id].charge * n;
    if (c > 0) pos += c; else neg += c;
  }
  return { pos, neg, net: pos + neg };
}

// counts: { ionId: number }. Returns { ok, kind, message } for the Dr. NAM Says bubble.
export function checkServe(order, counts) {
  const { cat, an } = order;
  const { nc, na, text } = formulaOf(cat, an);
  const used = Object.keys(counts).filter(id => counts[id] > 0);
  if (!used.length) {
    return { ok: false, kind: 'empty', message: 'The counter is empty. Tap ions in the tray to add them.' };
  }
  const stray = used.filter(id => id !== cat.id && id !== an.id);
  const missing = [cat, an].filter(i => !counts[i.id]);
  if (stray.length || missing.length) {
    return {
      ok: false, kind: 'wrong-ions',
      message: `${capitalise(orderName(cat, an))} is made from ${cat.name} and ${an.name} ions only. Check which ions are on your counter.`,
    };
  }
  const a = counts[cat.id], b = counts[an.id];
  const pos = a * cat.charge, neg = b * an.charge, net = pos + neg;
  const sum = `${a} × (${chargeStr(cat.charge)}) + ${b} × (${chargeStr(an.charge)}) = ${chargeStr(pos)} ${neg < 0 ? MINUS : '+'} ${Math.abs(neg)} = ${net === 0 ? '0' : chargeStr(net)}`;
  if (net !== 0) {
    return {
      ok: false, kind: 'unbalanced',
      message: `${sum}. An ionic compound must have zero net charge, so ${net > 0 ? 'add more negative ions' : 'add more positive ions'}.`,
    };
  }
  if (a !== nc || b !== na) {
    const g = gcd(a, b);
    return {
      ok: false, kind: 'not-simplest',
      message: `The charges balance, but formulae use the simplest whole-number ratio. Divide ${a}:${b} by ${g}.`,
    };
  }
  return {
    ok: true, kind: 'correct', formula: text,
    message: `${capitalise(orderName(cat, an))} is ${pretty(text)}: ${nc} × (${chargeStr(cat.charge)}) + ${na} × (${chargeStr(an.charge)}) = 0.`,
  };
}

// Shown when a customer's patience runs out, so the player still learns the answer.
export function revealAnswer(order) {
  const { cat, an } = order;
  const { nc, na, text } = formulaOf(cat, an);
  return `${capitalise(orderName(cat, an))} is ${pretty(text)}: ${nc} ${pretty(cat.sym)} and ${na} ${pretty(an.sym)} (${nc} × ${chargeStr(cat.charge)} + ${na} × ${chargeStr(an.charge)} = 0).`;
}
