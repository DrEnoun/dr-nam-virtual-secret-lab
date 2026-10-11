# DR NAM’s CHEMQUEST — Diner Dash prototype (World 6: Ion Diner)

Open `quest/index.html` through any static server (for example `npm run serve`, then visit `/quest/`).

- **Edit content only:** `data/diner.json` holds the ions and the three shifts (orders, customers per shift, patience, decoys, tips, "Pharmacy link" facts). Formulae are worked out from the ion charges, never typed in.
- **Rules:** `js/diner-logic.js`. **Avatar:** `js/avatar.js` (text-row sprite, no image files). **Game screen:** `js/diner.js`.
- **Check the chemistry after any edit:** `node tools/test-quest.mjs` (also part of `npm test`).
- Progress (coins, XP, stars, avatar, theme, sound) is saved in `localStorage` under `drnam-quest:v1`.
- Dr. NAM appears only as her official badge in the "Dr. NAM says" bubble; the avatar is a generic student-scientist.

## Adding more shifts (Ion Diner)

Everything is in `data/diner.json`; no game code changes.

1. Add an entry to `levels` with the next `id` (title, subtitle, `customers`, `patience` in seconds, `decoys`, `showCharge`, `tip`, and its `orders`: `{ "cation": "Fe3+", "anion": "O2-", "fact": "optional Pharmacy link" }`). Ions come from the `ions` list above it; add new ions there first (id = symbol + charge, e.g. `Cu2+`).
2. A boss shift has no `orders`; give it `"boss": true` and `"mixFrom": [1, 2, 3]` to draw from those shifts.
3. Add the new id to `levelIds` for World 6 in `data/worlds.json` and update its `callout` (for example "5 shifts"). The world badge is earned when every listed shift is cleared.
4. Run `node tools/test-quest.mjs`. It checks every formula against an independent answer key (`KEY` in the test), so add the new compounds there too.

## World 1 — Lab Meadow (memory match)

Content is in `data/memory.json`; rules are in `js/memory-logic.js`; shape pictograms in `js/shapes.js`.

- A **set** is the cards that belong together: 2 (name + formula, or formula + shape) or 3 (the boss: name + formula + shape). `group` is the number of cards per set, `pick` is how many sets are dealt each game, and `time` (seconds) makes a level timed.
- Formulae are written like `SO4^2-` (digits become subscripts, the part after `^` is the charge). Shape cards need a `shape` from `js/shapes.js` (`linear`, `bent`, `trigonal planar`, `trigonal pyramidal`, `tetrahedral`) and its `angle`.
- Sets with the same `uniq` key are never dealt together, so two molecules with the same shape cannot be mixed up.
- Hearts: a mismatch costs a heart only when every card flipped had already been seen, so exploring is free. Every set has a `fact` shown in the Dr. NAM bubble.
- `node tools/test-quest.mjs` checks every name, formula, shape and angle against an independent answer key.
