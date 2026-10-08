// Turns brand-kit/dr-nam-tokens.json into css/tokens.css.
// Night theme is the default (:root); Day theme applies with [data-theme="day"].
// Run: node tools/make-tokens-css.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const src = JSON.parse(readFileSync(new URL('../brand-kit/dr-nam-tokens.json', import.meta.url)));

const themes = { night: 'dark', day: 'light' };
const flat = []; // {name, value(string|{dark,light})}
for (const fam of ['color', 'spacing', 'radius', 'shadow', 'border', 'effect', 'interaction']) {
  for (const t of src[fam]?.tokens ?? []) flat.push(t);
}
const byName = Object.fromEntries(flat.map(t => [t.name, t]));

function valueFor(token, themeId, depth = 0) {
  let v = token.value;
  if (typeof v === 'object') v = v[themeId] ?? v.dark ?? Object.values(v)[0];
  const alias = typeof v === 'string' && v.match(/^\{(.+)\}$/);
  if (alias && depth < 5) return valueFor(byName[alias[1]], themeId, depth + 1);
  return v;
}

function block(themeId) {
  return flat.map(t => `  --${t.name}: ${valueFor(t, themeId)};`).join('\n');
}

const fonts = src.type.fonts.map(f => `@font-face {
  font-family: "${f.family}";
  src: url("../brand/fonts/${f.file.split('/').pop()}") format("woff2");
  font-weight: ${f.weight};
  font-style: normal;
  font-display: swap;
}`).join('\n');

const css = `/* GENERATED from brand-kit/dr-nam-tokens.json by tools/make-tokens-css.mjs — do not edit by hand. */
${fonts}

:root {
  --font-display: ${src.type.families.display};
  --font-body: ${src.type.families.body};
  color-scheme: dark;
${block(themes.night)}
}

:root[data-theme="day"] {
  color-scheme: light;
${block(themes.day)}
}
`;
writeFileSync(new URL('../css/tokens.css', import.meta.url), css);
console.log('css/tokens.css written,', flat.length, 'tokens');
