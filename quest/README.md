# Chemistry Quest — Diner Dash prototype (World 6: Ion Diner)

Open `quest/index.html` through any static server (for example `npm run serve`, then visit `/quest/`).

- **Edit content only:** `data/diner.json` holds the ions and the three shifts (orders, customers per shift, patience, decoys, tips, "Pharmacy link" facts). Formulae are worked out from the ion charges, never typed in.
- **Rules:** `js/diner-logic.js`. **Avatar:** `js/avatar.js` (text-row sprite, no image files). **Game screen:** `js/diner.js`.
- **Check the chemistry after any edit:** `node tools/test-quest.mjs` (also part of `npm test`).
- Progress (coins, XP, stars, avatar, theme, sound) is saved in `localStorage` under `drnam-quest:v1`.
- Dr. NAM appears only as her official badge in the "Dr. NAM says" bubble; the avatar is a generic student-scientist.
