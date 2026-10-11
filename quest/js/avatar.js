// Avatar: a 32 × 44 pixel-art student-scientist, drawn from shapes and then "crisped" into hard pixels with an outline.
// It is a generic character, not a portrait of Dr. NAM (her real badge is used for her instead).
import { pxCanvas, crisp, shapes, shade, tint } from './pxart.js';

export const WIDTH = 32;
export const HEIGHT = 44;
const SS = 3;                       // the sprite is painted at 3x so it matches the finer map art

export const OPTIONS = {
  skin: ['#f9d5b5', '#e8b08a', '#c68642', '#8d5524'],
  hairStyle: ['short', 'bun', 'tudung'],
  hair: ['#231f20', '#6b4226', '#138076', '#1b4068'],
  coat: ['#eef6ff', '#99c2ea', '#2fb3a8', '#d4ff3a'],
};
export const STYLE_LABEL = { short: 'Short', bun: 'Bun', tudung: 'Tudung' };
export const DEFAULT_AVATAR = { skin: 0, hairStyle: 'short', hair: 0, coat: 0, goggles: true };

const INK = '#231f20', LIME = '#d4ff3a', TEAL = '#0d7f74', AQUA = '#5eead4', MOUTH = '#7a2e2e', TROUSERS = '#2a4f7a', SHOE = '#2b3440';

function paint(c, o, customer, mood) {
  const { E, R, P } = shapes(c);
  const skin = OPTIONS.skin[o.skin] ?? OPTIONS.skin[0], skinSh = shade(skin, 0.16);
  const hair = OPTIONS.hair[o.hair] ?? OPTIONS.hair[0], hairHi = tint(hair, 0.22), hairSh = shade(hair, 0.3);
  const coat = OPTIONS.coat[o.coat] ?? OPTIONS.coat[0], coatSh = shade(coat, 0.16), coatHi = tint(coat, 0.5);
  const tudung = o.hairStyle === 'tudung';
  c.translate(0, 4);                              // headroom for the bun

  // legs and shoes
  R(10.5, 29, 4.6, 8, 1.6, TROUSERS); R(16.9, 29, 4.6, 8, 1.6, TROUSERS);
  E(12.6, 37.4, 3.5, 1.7, SHOE); E(19.4, 37.4, 3.5, 1.7, SHOE);
  // arms and hands
  R(5, 19.5, 4.8, 11, 2.3, coat); R(22.2, 19.5, 4.8, 11, 2.3, coatSh);
  E(7.4, 31.4, 2.3, 2.3, skin); E(24.6, 31.4, 2.3, 2.3, skin);
  // neck, coat, collar, tie
  R(13.6, 16, 4.8, 4.5, 1.4, skinSh);
  R(8, 18.5, 16, 14.5, 3.2, coat); R(19.6, 19.2, 4.4, 13.4, 2, coatSh); R(8.4, 31, 15.2, 2, 1, coatSh);
  P([[16, 18.8], [11.6, 18.8], [15.3, 26]], coatHi); P([[16, 18.8], [20.4, 18.8], [16.7, 26]], coatSh);
  if (!customer) { R(15, 20.5, 2, 5.5, 0.8, LIME); E(16, 20.6, 1.5, 1, LIME); }
  R(10.2, 27.5, 3.6, 3.2, 0.8, coatSh, false);   // pocket
  // head
  const eyeY = tudung ? 12.6 : 11.4;
  if (tudung) {
    P([[6, 15], [26, 15], [28.4, 23.5], [16, 25], [3.6, 23.5]], hair);               // draped scarf
    E(16, 11, 10.6, 10.8, hair); E(11, 5.6, 3, 1.3, hairHi, false);
    E(16, 12.4, 7.7, 8.4, hairSh, false);
    E(16.3, 12.5, 6.9, 7.7, skinSh, false); E(15.8, 12.1, 6.6, 7.4, skin, false);
  } else {
    E(7.9, 10.8, 1.7, 2.1, skin); E(24.1, 10.8, 1.7, 2.1, skin);
    E(16, 10, 8.3, 8.2, skinSh); E(15.4, 9.6, 7.8, 7.8, skin, false);
    if (o.hairStyle === 'bun') { E(16, 1.4, 3.6, 3.4, hair); E(14.8, 0.5, 1.2, 0.9, hairHi, false); }
    c.beginPath(); c.ellipse(16, 9.6, 8.7, 8.5, 0, Math.PI, Math.PI * 2);
    [[24.4, 11.4], [23, 8.4], [20.6, 10.4], [18.6, 7.8], [15.6, 10.2], [12.8, 7.8], [10.6, 10], [9, 8.8], [7.6, 11.4]].forEach(([x, y]) => c.lineTo(x, y));
    c.closePath(); c.fillStyle = hair; c.fill(); c.strokeStyle = hairSh; c.lineWidth = 0.9; c.stroke();
    E(12.2, 4.4, 3.2, 1.2, hairHi, false);
  }
  // face
  E(10.9, eyeY + 3.2, 1.7, 1.05, 'rgba(252,122,122,.7)', false); E(21.1, eyeY + 3.2, 1.7, 1.05, 'rgba(252,122,122,.7)', false);
  c.strokeStyle = MOUTH; c.fillStyle = MOUTH; c.lineWidth = 1.1; c.lineCap = 'round';
  if (mood === 'happy') { c.beginPath(); c.arc(16, eyeY + 3.6, 2.4, 0, Math.PI); c.closePath(); c.fill(); }
  else if (mood === 'angry') {
    c.beginPath(); c.arc(16, eyeY + 6.2, 1.9, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    c.strokeStyle = INK; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(10.2, eyeY - 3.1); c.lineTo(14.2, eyeY - 1.9); c.moveTo(21.8, eyeY - 3.1); c.lineTo(17.8, eyeY - 1.9); c.stroke();
  } else { c.beginPath(); c.arc(16, eyeY + 3.5, 1.9, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }
  // safety goggles
  if (o.goggles && !customer) {
    R(7.2, eyeY - 0.9, 17.6, 1.8, 0.9, TEAL, false);
    for (const x of [12.6, 19.4]) {
      c.beginPath(); c.arc(x, eyeY, 3.7, 0, Math.PI * 2); c.fillStyle = 'rgba(94,234,212,.3)'; c.fill();
      c.strokeStyle = TEAL; c.lineWidth = 1.5; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 0.9; c.beginPath(); c.arc(x, eyeY, 2.4, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
    }
  }
  E(12.6, eyeY, 1.3, 1.75, INK, false); E(19.4, eyeY, 1.3, 1.75, INK, false);
  E(12.2, eyeY - 0.7, 0.5, 0.55, '#fff', false); E(19, eyeY - 0.7, 0.5, 0.55, '#fff', false);
}

const cache = new Map();
export function avatarCanvas(opts = DEFAULT_AVATAR, { customer = false, mood = 'wait' } = {}) {
  const o = { ...DEFAULT_AVATAR, ...opts };
  const key = JSON.stringify([o, customer, mood]);
  let cv = cache.get(key);
  if (!cv) { cv = pxCanvas(WIDTH * SS, HEIGHT * SS); const c = cv.getContext('2d'); c.scale(SS, SS); paint(c, o, customer, mood); crisp(cv, INK, 110, 2); cache.set(key, cv); }
  return cv;
}

export function drawAvatar(ctx, opts, x, y, scale = 1, extra = {}) {
  const was = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(avatarCanvas(opts, extra), x, y, WIDTH * scale, HEIGHT * scale);
  ctx.imageSmoothingEnabled = was;
}

export function randomAvatar(rng = Math.random, { goggles = false } = {}) {
  const pick = n => Math.floor(rng() * n);
  return {
    skin: pick(OPTIONS.skin.length), hairStyle: OPTIONS.hairStyle[pick(OPTIONS.hairStyle.length)],
    hair: pick(OPTIONS.hair.length), coat: pick(OPTIONS.coat.length), goggles,
  };
}
