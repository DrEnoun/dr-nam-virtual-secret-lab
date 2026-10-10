// Two players on one screen — the rules, with no DOM (testable in Node, reusable by the online mode later).
//
// RACE:  both players get the same question; the first CORRECT answer scores that question's points.
// CO-OP: one team, one molecule. One player is the Builder (moves electrons, taps rings, shoots bonds),
//        the other is the Checker (presses Check, answers questions, moves on). Roles swap every question.

export const ADVANCE_AFTER_WIN_MS = 2600;
export const ADVANCE_AFTER_NONE_MS = 2200;

/** A Race of `total` questions. Players are 1 and 2. */
export function createRace(total) {
  return { total, idx: 0, scores: [0, 0], winner: null, finished: [false, false] };
}

/**
 * A player finished the current question. `info` = { index, correct, pts, shown }.
 * Returns { action: 'none' | 'wait' | 'advance', delay?, won? }.
 */
export function raceItem(state, player, info) {
  if (info.index !== state.idx) return { action: 'none' };
  const i = player - 1;
  if (state.finished[i]) return { action: 'none' };
  state.finished[i] = true;
  if (state.winner === null && info.correct) {
    state.winner = player;
    state.scores[i] += info.pts;
    return { action: 'advance', delay: ADVANCE_AFTER_WIN_MS, won: true, player };
  }
  if (state.winner !== null) return { action: 'wait' };      // too late: the other player already scored
  if (state.finished[0] && state.finished[1]) return { action: 'advance', delay: ADVANCE_AFTER_NONE_MS, won: false };
  return { action: 'wait' };
}

/** Move to the next question. Returns { done } (true after the last question). */
export function raceNext(state) {
  state.idx++;
  state.winner = null;
  state.finished = [false, false];
  return { done: state.idx >= state.total };
}

/** Final result: winner is 1, 2, or 0 for a draw. */
export function raceResult(state) {
  const [a, b] = state.scores;
  return { winner: a === b ? 0 : a > b ? 1 : 2, scores: [a, b] };
}

/** Roles for question `i` (0-based): they swap every question. */
export function coopRoles(i) {
  return i % 2 === 0 ? { 1: 'builder', 2: 'checker' } : { 1: 'checker', 2: 'builder' };
}

/** Which part of the screen an element belongs to: the 'stage' (the thing being built), the 'side' (buttons and questions), or 'other'. */
export function zoneOf(el) {
  if (!el?.closest) return 'other';
  if (el.closest('.lw-boardwrap')) return 'stage';
  if (el.closest('.lw-side, .lw-progress')) return 'side';
  return 'other';
}

/** May a player with this role do this? kind: 'grab' | 'select'. zone: from zoneOf(). */
export function coopAllows(role, kind, zone) {
  if (kind === 'grab') return role === 'builder';
  if (zone === 'stage') return role === 'builder';
  if (zone === 'side') return role === 'checker';
  return true;
}
