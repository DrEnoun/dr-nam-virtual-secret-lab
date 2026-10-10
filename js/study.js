// Study logging for the PHD115 research study.
// Turned on by the lecturer (lecturer mode → "Study mode"). When on, students type their
// student ID before playing, and the game records anonymous-by-design events (no video,
// no names) on THIS device only. The lecturer exports them as CSV after each session.
//
// Activities record events through the `log` function in their context:
//   ctx.log('attempt', { item: 'NH3', answer: 'sp2', correct: 0, errorType: 'lone_pair_missed' })
//   ctx.log('hint',    { item: 'NH3' })
//   ctx.log('level_complete', { durationMs: 41200 })
import { settings } from './store.js';

const KEY = 'drnam-study-log:v1';
export const COLUMNS = ['timestamp', 'studentId', 'sessionId', 'activity', 'level', 'event', 'item',
  'answer', 'correct', 'errorType', 'hintUsed', 'durationMs', 'input', 'players'];

let memory = null; // fallback when storage is blocked
let session = null; // { id, activity, level, players, started }

function readAll() {
  if (memory) return memory;
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return (memory = []); }
}
function writeAll(rows) {
  try { localStorage.setItem(KEY, JSON.stringify(rows)); memory = null; }
  catch { memory = rows; }
}

export const study = {
  get enabled() { return !!settings.studyMode; },
  set enabled(v) { settings.studyMode = !!v; },
  get studentId() { return settings.studentId || ''; },
  set studentId(v) { settings.studentId = (v || '').trim().toUpperCase(); },
  inputFn: () => 'mouse',

  /** Validate what a student typed: letters and digits only, 6–14 characters. */
  validId(v) { return /^[A-Za-z0-9]{6,14}$/.test((v || '').trim()); },

  count() { return readAll().length; },

  log(event, data = {}) {
    if (!this.enabled || !this.studentId) return;
    const row = {
      timestamp: new Date().toISOString(),
      studentId: this.studentId,
      sessionId: session?.id ?? '',
      activity: session?.activity ?? data.activity ?? '',
      level: session?.level ?? data.level ?? '',
      event,
      item: '', answer: '', correct: '', errorType: '', hintUsed: '', durationMs: '',
      input: this.inputFn(),
      players: session?.players ?? '',
      ...data,
    };
    const rows = readAll();
    rows.push(row);
    writeAll(rows);
  },

  startSession({ activity, level, players }) {
    this.endSession();
    if (!this.enabled || !this.studentId) return;
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
    session = { id: `${this.studentId}-${stamp}`, activity, level, players: players === 'duo' ? 2 : 1, started: performance.now() };
    this.log('session_start');
  },

  endSession() {
    if (!session) return;
    this.log('session_end', { durationMs: Math.round(performance.now() - session.started) });
    session = null;
  },

  csv() {
    const esc = v => {
      const s = v === undefined || v === null ? '' : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = readAll();
    return [COLUMNS.join(','), ...rows.map(r => COLUMNS.map(c => esc(r[c])).join(','))].join('\r\n');
  },

  download() {
    const blob = new Blob(['﻿' + this.csv()], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    a.href = URL.createObjectURL(blob);
    a.download = `secret-lab-log-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  },

  clear() { writeAll([]); },
};
