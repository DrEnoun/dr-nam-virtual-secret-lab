# Dr. NAM Virtual Secret Lab

Gesture-controlled chemistry games for **PHD115 Fundamental of Chemistry** (Diploma in Pharmacy, UiTM Cawangan Pulau Pinang).
Students aim with a finger, "shoot" to select, and pinch to grab — or simply use a mouse or touch screen.

The full plan is in [BRIEF.md](BRIEF.md). **This version is Phase 2**: Phase 1 (branding, landing page, BM/English, gesture engine, mouse fallback, offline) plus **Activity 1 — Lewis Structure Builder** at Easy, Medium and Hard. Activities 2 and 3 arrive in Phases 3–4.

---

## Play it

| Where | How |
|---|---|
| **Online (GitHub Pages)** | Open the site link. The first visit saves the game for offline use. |
| **Install as an app** | In Chrome or Edge, click the install icon in the address bar (or menu → *Install*). It then opens like an app and works offline. |
| **Classroom laptop, no internet** | Unzip the folder, then double-click **start-windows.bat** (Windows) or **start-mac.command** (Mac). Keep the black window open while you play. |

> Opening `index.html` directly will not work — browsers only allow the webcam on a proper web address or `localhost`. Use one of the options above.

**No camera? No problem.** Everything works with a mouse, a touch screen (tablet, phone, touch laptop) or a pen. Tap buttons; in the Lewis activity either *drag* an electron into a slot, or *tap* an electron and then *tap* a slot (tap a placed electron to take it back). The camera is optional.

**Camera tips:** good lighting, one hand in front of the camera, about an arm's length away. Turn the camera on with the **Turn on camera** button. The video never leaves the device.

**Gestures**
- **Aim:** point your index finger — the lime crosshair follows it.
- **Shoot (select):** finger gun — index out, thumb up, then drop your thumb onto your finger.
- **Grab / drop:** pinch thumb and index finger to grab; open your hand to drop. A quick pinch also selects.
- **2 Players:** the player on the left of the room is Player 1 (lime), the right is Player 2 (teal).

**Hidden lecturer mode:** press **Shift + L**. In the Lewis Structure Builder it shows the correct Lewis structure beside every question.

---

## Activity 1 — Lewis Structure Builder

Drag electrons from the tray into the slots (mouse, touch, or pinch-and-open-hand). Shoot **Check** to get feedback; every item ends with the correct Lewis structure and a "Why?" from Dr. NAM.

| Level | What students do |
|---|---|
| **Easy** | Fill the valence electrons of H, C, N, O, F, Na, Mg, Cl; then build H₂, Cl₂, HCl with single bonds. |
| **Medium** | Count total valence electrons first, then build H₂O, NH₃, CH₄ (lone pairs) and O₂, N₂, CO₂ (double/triple bonds). |
| **Hard** | Ionic bonding: move electrons from the metal to the non-metal (NaCl, MgO, MgCl₂), then pick each ion's charge and see the brackets. Finish with a **4-minute mixed timed challenge**. |

Scoring: 10 points for a first-try answer, 7 after one mistake, 4 after two, 2 after more; 0 if the answer is shown (offered after two mistakes). The best score per level is remembered on the device. In 2-player mode the activity runs on one board for now (take turns); split-screen Race/Co-op comes in Phase 5.

---

## Put it on GitHub Pages (one time)

1. Create a repository on GitHub and upload everything in this folder (including the hidden `.nojekyll` file).
2. In the repository: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**.
3. After a minute, the link appears at the top of that page. Share it with students.

## Add your logos

Put these files in `brand/logos/` (same names):
`chemistry-with-dr-nam-logo.jpg` (badge), `uitm-logo-full.png` (UiTM, top-left) and `uitm-di-hatiku-motto.png` (top-right).
Until then, the game shows labelled placeholders.

## Change the wording (BM / English)

All text is in `lang/ms.json` and `lang/en.json`. Edit the words on the right of each line, keep the quotes and commas. Chemistry terms are listed for checking in `lang/glossary.md`.

---

## For developers (and future Claude sessions)

No build step: plain HTML, CSS and JavaScript modules. Serve the folder with any static server (`python3 -m http.server 8080`).

| Path | What |
|---|---|
| `index.html`, `css/app.css` | Landing page and Playful-style components |
| `css/tokens.css` | Brand tokens, **generated** from `brand-kit/dr-nam-tokens.json` → `node tools/make-tokens-css.mjs` |
| `js/gestures/classify.js` | Pure hand-pose logic (finger gun, pinch, tap) — tested by `node tools/test-classify.mjs` |
| `js/gestures/engine.js` | Webcam + MediaPipe Hands, crosshairs, 1–2 players; fires `player-select` + `click()` on `[data-target]` elements, and `gesture-grab/move/release` on `document` |
| `js/drag.js` | One drag helper for mouse, touch and pinch |
| `js/activities/registry.js` | **List of activities.** Add an entry here to add an activity |
| `js/activities/lewis/` | Lewis Structure Builder: `rules.js` (pure logic, no DOM), `board.js` (drag board + SVG answer), `index.js` (flow, scoring, timer) |
| `css/lewis.css` | Styles for the Lewis activity (loaded by the activity itself) |
| `data/lewis/` | **Molecule data (JSON):** `elements.json`, `molecules.json`, `levels.json` |
| `js/i18n.js`, `lang/` | Translations |
| `sw.js` | Offline cache, **generated** → `node tools/build-sw.mjs` (run after adding or changing files) |
| `vendor/` | MediaPipe Hands (Apache-2.0) and Three.js (MIT), bundled for offline use |
| `brand/fonts/` | League Spartan and Questrial (SIL Open Font License) |

### Add a new activity

1. Create `js/activities/<id>/index.js` exporting `default function mount(container, ctx)` that returns a cleanup function.
   `ctx` gives `{ level, players, language, lecturer, t, sound, engine }`.
2. In `registry.js`, set the entry's `status: 'ready'` and `load: () => import('./<id>/index.js')`.
3. Add `activity.<id>.title` and `activity.<id>.desc` to both language files.
4. Make every clickable thing a `<button data-target>` so it works with gestures and the mouse.
5. Run `node tools/build-sw.mjs`.

**Language:** every new visit opens in English; students switch to Bahasa Malaysia with the Language buttons (kept while the tab stays open, not remembered for the next visit).

Molecule data should live in JSON files (see BRIEF.md §10), not in code.

### Add a molecule to the Lewis Structure Builder

1. Add an entry to `data/lewis/molecules.json` (copy a similar one).
   - **Covalent:** `atoms` (`id`, `el`, and `lone` = the angles where its lone pairs go) and `bonds` (`a`, `b`, `order`, `angle` = direction from `a` to `b`: 0 right, 90 up, 180 left, 270 down). Atoms are positioned automatically.
   - **Ionic:** `atoms` with `x`, `y` positions (metal in the middle for MgCl₂). The metal's valence electrons must equal the electrons the non-metals need.
   - Give `name`, `why` (and optional `pharmacy`) in both `en` and `ms`.
2. If it uses a new element, add it to `data/lewis/elements.json`.
3. Add `"mol:<id>"` to a level in `data/lewis/levels.json`.
4. Run `npm test` — it builds every item, checks the answer is accepted, that any missing or extra electron is rejected, and that BM/English text exists. Then `node tools/build-sw.mjs`.
