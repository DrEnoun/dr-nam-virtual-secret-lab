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
