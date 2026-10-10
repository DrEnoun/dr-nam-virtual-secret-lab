# Dr. NAM Virtual Secret Lab

Gesture-controlled chemistry games for **PHD115 Fundamental of Chemistry** (Diploma in Pharmacy, UiTM Cawangan Pulau Pinang).
Students aim with a finger, "shoot" to select, and pinch to grab — or simply use a mouse or touch screen.

The full plan is in [BRIEF.md](BRIEF.md). **This version** has Phase 1 (branding, landing page, BM/English, levels, player modes, gesture engine with tutorial, mouse fallback, offline support) plus the first playable activity, **Molecule Shooter** (IC1 & IC2 review, 1 or 2 players). The Lewis Builder, Shape & Polarity Lab and Intermolecular Forces Arena arrive in Phases 2–4. Hybridization, crystal lattice and organic chemistry sit in the **STEM Tour** group (enrichment, not tested).

---

## Play it

| Where | How |
|---|---|
| **Online (GitHub Pages)** | Open the site link. The first visit saves the game for offline use. |
| **Install as an app** | In Chrome or Edge, click the install icon in the address bar (or menu → *Install*). It then opens like an app and works offline. |
| **Classroom laptop, no internet** | Unzip the folder, then double-click **start-windows.bat** (Windows) or **start-mac.command** (Mac). Keep the black window open while you play. |

> Opening `index.html` directly will not work — browsers only allow the webcam on a proper web address or `localhost`. Use one of the options above.

**Camera tips:** good lighting, one hand in front of the camera, about an arm's length away. Turn the camera on with the **Turn on camera** button. The video never leaves the device.

**Gestures**
- **Aim:** point your index finger — the lime crosshair follows it.
- **Shoot (select):** finger gun — index out, thumb up, then drop your thumb onto your finger.
- **Grab / drop:** pinch thumb and index finger to grab; open your hand to drop. A quick pinch also selects.
- **2 Players:** the player on the left of the room is Player 1 (lime), the right is Player 2 (teal).

**Hidden lecturer mode:** press **Shift + L**. In Molecule Shooter it puts a star on the correct target; it also shows the study tools.

---

## Put it on GitHub Pages (one time)

1. Create a repository on GitHub and upload everything in this folder (including the hidden `.nojekyll` file).
2. In the repository: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**.
3. After a minute, the link appears at the top of that page. Share it with students.

## Add your logos

Put these four files in `brand/logos/` (same names):
`chemistry-with-dr-nam-logo.jpg`, `uitm-cawangan-pulau-pinang-lockup.png`, `uitm-di-hatiku-motto.png`, `uitm-logo-full.png`.
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
| `js/activities/registry.js` | **List of activities** and topic groups (PHD115 Bonding, STEM Tour, Pharmacy). Add an entry here to add an activity |
| `js/activities/shooter/`, `data/shooter/` | Molecule Shooter and its question packs |
| `js/i18n.js`, `lang/` | Translations |
| `sw.js` | Offline cache, **generated** → `node tools/build-sw.mjs` (run after adding or changing files) |
| `vendor/` | MediaPipe Hands (Apache-2.0) and Three.js (MIT), bundled for offline use |
| `brand/fonts/` | League Spartan and Questrial (SIL Open Font License) |

### Study mode (research data)

Lecturer mode (Shift + L) shows **Study tools**: turn **Study mode** on, and students are asked for their student ID before they play. Each session, input change and activity event is saved on that laptop only (no video). After class, press **Export study data** to download a CSV, then **Clear study data** on shared laptops. **Next student** clears the ID between students on one laptop. Columns match the *Game logs* sheet of the study codebook.

Activities must record learning events through `ctx.log(event, data)`:

| event | when | data fields |
|---|---|---|
| `item_start` | a new molecule or task appears | `item` (e.g. `NH3`) |
| `attempt` | the student submits an answer | `item`, `answer`, `correct` (1/0), `errorType` (e.g. `lone_pair_missed`, `double_bond_counted_twice`, `octet_not_met`) |
| `hint` | the hint or "Why?" button is used | `item`, `hintUsed: 1` |
| `level_complete` | a level is finished | `durationMs` |

`session_start`, `session_end` and `input_change` are logged automatically.

### Molecule Shooter question packs

Questions are in `data/shooter/ic.json` — edit wording there (both `en` and `ms`). Each item has a `level`, a `prompt`, `options` (exactly one with `"ok": true`; wrong ones carry an `err` code for the study log), a `why` explanation and a `hint`. The number of options must equal the level's `targets` (Easy 3, Medium 4, Hard 5).

To add a topic (e.g. Solutions), copy `ic.json` to `data/shooter/sol.json`, write the items, then add a registry entry with `load: shooter('sol')` and its two language keys. Run `node tools/build-sw.mjs` afterwards.

### Add a new activity

1. Create `js/activities/<id>/index.js` exporting `default function mount(container, ctx)` that returns a cleanup function.
   `ctx` gives `{ level, players, language, lecturer, t, sound, engine, log }`.
2. In `registry.js`, set the entry's `status: 'ready'` and `load: () => import('./<id>/index.js')`.
3. Add `activity.<id>.title` and `activity.<id>.desc` to both language files.
4. Make every clickable thing a `<button data-target>` so it works with gestures and the mouse.
5. Run `node tools/build-sw.mjs`.

Molecule data should live in JSON files (see BRIEF.md §10), not in code.
