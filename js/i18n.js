// BM / English text. All wording lives in lang/*.json so it can be edited without code.
const cache = {};
let current = 'en';
let dict = {};
let fallback = {};

async function fetchLang(code) {
  if (!cache[code]) cache[code] = fetch(`lang/${code}.json`).then(r => r.json());
  return cache[code];
}

export async function setLanguage(code) {
  fallback = await fetchLang('en');
  dict = code === 'en' ? fallback : await fetchLang(code);
  current = code;
  document.documentElement.lang = code === 'ms' ? 'ms' : 'en';
  apply(document);
}

export const lang = () => current;

export function t(key, vars = {}) {
  let s = dict[key] ?? fallback[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/** Fill every [data-i18n] element; [data-i18n-aria] sets aria-label. */
export function apply(root) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
}
