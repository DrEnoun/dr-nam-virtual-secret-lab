// Pixel avatar: a 16 × 20 chibi lab-coat character built from text rows, so it needs no image files.
// It is a generic student-scientist, not a portrait of Dr. NAM (her real badge is used for her instead).
// Keys: O outline · S skin · H hair/scarf · C coat · c coat shade · L lime tie · G goggle frame
//       g goggle lens · M mouth · P trousers · . empty

const EYES = '...OSOSSSSOSO...';

const HAIR = {
  short: [
    '......OOOO......',
    '....OOHHHHOO....',
    '...OHHHHHHHHO...',
    '...OHHHHHHHHO...',
    '...OHSSSSSSHO...',
    '...OSSSSSSSSO...',
  ],
  bun: [
    '......OHHO......',
    '.....OHHHHO.....',
    '...OOHHHHHHOO...',
    '...OHHHHHHHHO...',
    '...OHSSSSSSHO...',
    '...OSSSSSSSSO...',
  ],
  tudung: [
    '.....OOOOOO.....',
    '....OHHHHHHO....',
    '...OHHHHHHHHO...',
    '...OHHSSSSHHO...',
    '...OHSSSSSSHO...',
    '...OHSSSSSSHO...',
  ],
};

const FACE_TUDUNG = ['...OHOSSSSOHO...', '...OHSSSSSSHO...', '....OHSMMSHO....', '....OHHHHHHO....'];
const FACE_PLAIN  = [EYES, '...OSSSSSSSSO...', '....OSSMMSSO....', '.....OOOOOO.....'];

const GOGGLES = ['..OGGGGGGGGGGO..', '..OGgOGGGGOgGO..', '..OGGGGGGGGGGO..'];

const BODY = [
  '...OOCCLLCCOO...',
  '..OCCCCLLCCCCO..',
  '..OCcCCLLCCcCO..',
  '.OSOCCCCLLCCCOSO',
  '.OSOcCCCCCCcOSO.',
  '..OOCCCCCCCCOO..',
  '....OCCCCCCO....',
  '....OPPOOPPO....',
  '....OPPO.OPPO...',
  '...OOPPO.OPPOO..',
];

export const WIDTH = 16;
export const HEIGHT = 20;

export const OPTIONS = {
  skin: ['#f9d5b5', '#e8b08a', '#c68642', '#8d5524'],
  hairStyle: ['short', 'bun', 'tudung'],
  hair: ['#231f20', '#6b4226', '#138076', '#1b4068'],
  coat: ['#eef6ff', '#99c2ea', '#2fb3a8', '#d4ff3a'],
};
export const STYLE_LABEL = { short: 'Short', bun: 'Bun', tudung: 'Tudung' };
export const DEFAULT_AVATAR = { skin: 0, hairStyle: 'short', hair: 0, coat: 0, goggles: true };

const OUTLINE = '#231f20', LIME = '#d4ff3a', TEAL = '#0d7f74', AQUA = '#5eead4', MOUTH = '#7a2e2e', TROUSERS = '#1b4068';

export function shade(hex, amount = 0.18) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.round(c * (1 - amount));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
}

export function avatarRows(opts) {
  const style = HAIR[opts.hairStyle] ? opts.hairStyle : 'short';
  const face = style === 'tudung' ? FACE_TUDUNG : FACE_PLAIN;
  // rows 0-5 hair and forehead, 6-8 eyes, cheeks and mouth, 9 chin
  const rows = [...HAIR[style], ...face];
  if (opts.goggles) rows.splice(5, 3, ...GOGGLES);
  return [...rows, ...BODY];
}

// Returns HEIGHT rows × WIDTH cells, each a CSS colour or null. `customer` swaps the lime tie for the shirt colour.
export function avatarPixels(opts = DEFAULT_AVATAR, { customer = false } = {}) {
  const o = { ...DEFAULT_AVATAR, ...opts };
  const coat = OPTIONS.coat[o.coat] ?? OPTIONS.coat[0];
  const palette = {
    O: OUTLINE, S: OPTIONS.skin[o.skin] ?? OPTIONS.skin[0], H: OPTIONS.hair[o.hair] ?? OPTIONS.hair[0],
    C: coat, c: shade(coat), L: customer ? coat : LIME, G: TEAL, g: AQUA, M: MOUTH, P: TROUSERS,
  };
  return avatarRows(o).map(r => [...r].map(ch => palette[ch] ?? null));
}

export function drawAvatar(ctx, opts, x, y, scale = 2, extra = {}) {
  const pix = avatarPixels(opts, extra);
  for (let j = 0; j < pix.length; j++) {
    for (let i = 0; i < WIDTH; i++) {
      const c = pix[j][i];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x + i * scale, y + j * scale, scale, scale);
    }
  }
}

export function randomAvatar(rng = Math.random, { goggles = false } = {}) {
  const pick = n => Math.floor(rng() * n);
  return {
    skin: pick(OPTIONS.skin.length), hairStyle: OPTIONS.hairStyle[pick(OPTIONS.hairStyle.length)],
    hair: pick(OPTIONS.hair.length), coat: pick(OPTIONS.coat.length), goggles,
  };
}
