# Dr. NAM Virtual Secret Lab

Gesture-controlled chemistry games by **Chemistry with Dr. NAM**, for general use.
Students aim with a finger, "shoot" to select, and pinch to grab — or simply use a mouse or touch screen.

The full plan is in [BRIEF.md](BRIEF.md). **This version** has Phase 1 (branding, landing page, BM/English, gesture engine, mouse fallback, offline, study mode), the activities below (each at Easy, Medium and Hard) and Phase 5 two-player mode:
- **Chemical Bonding:** **Molecule Shooter** (one answer per challenge, with hints and explanations; logs answers in study mode), **Atom Blaster** (fast arcade round: shoot all the right bubbles) and **Lewis Structure Builder**. Shape & Polarity Lab and Intermolecular Forces Arena come next.
- **STEM Tour** (enrichment, not tested in the class study): **Hybridization Lab** and **Crystal Lattice Builder**; organic chemistry later.

Online Class Battle arrives in Phase 6.

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

**Periodic table:** the **Periodic table** button in the top bar opens a full 118-element table on any screen (works offline, BM/English). Tap an element for its group, period, atomic mass and valence electrons; tap a group-type chip to highlight a family. Inside the Lewis activity it rings the atoms of the current question. Data: `data/periodic.json`. Two buttons save the table as a printable A4 poster with the Dr. NAM badge, in the current language: **PNG** (picture) or **PDF** (print). It is made on the device (`js/periodic-export.js`), so it works offline.

**Hidden lecturer mode:** press **Shift + L**. In the Lewis Structure Builder it shows the correct Lewis structure beside every question; in Molecule Shooter it stars the correct target. It also shows the **Study tools** (see *Study mode* below).

---

## Activity 1 — Lewis Structure Builder

Drag electrons from the tray into the slots (mouse, touch, or pinch-and-open-hand). Shoot **Check** to get feedback; every item ends with the correct Lewis structure and a "Why?" from Dr. NAM.

| Level | What students do |
|---|---|
| **Easy** | Fill the valence electrons of H, C, N, O, F, Na, Mg, Cl; then build H₂, Cl₂, HCl with single bonds. |
| **Medium** (14 items) | Count total valence electrons first, then build H₂O, NH₃, CH₄, HF, F₂, H₂S, PH₃ (lone pairs) and O₂, N₂, CO₂, HCN, C₂H₄, C₂H₂, CH₂O (double/triple bonds). |
| **Hard** (8 items, 10-minute timer, then a 5-minute challenge) | Ionic bonding with no guide marks. For each compound students **choose the atoms** from tiles that include distractors (the formula is hidden), **move the electrons** with no marked slots and with grey **decoy electrons** that belong to no atom, give each ion's **charge**, then choose the **formula**. Then a **mixed challenge**: 8 items drawn at random from a pool of 27 atoms, covalent molecules and ionic compounds, all without guide marks and with decoy electrons. |

Each atom's electrons have their own colour (and carry the element letter), the atom's ring matches, and every shared pair must be built from one electron of each atom, so students see where the sharing comes from. The final structure is drawn in the same colours.

**Moving around:** every level has Back / Next buttons and clickable question numbers, so students can leave a question and come back. Each question keeps its own progress (placed electrons, chosen atoms, the step it was on); finished questions show their answer. The Hard level and the challenge are timed.

Scoring: 10 points for a first-try answer, 7 after one mistake, 4 after two, 2 after more; 0 if the answer is shown (offered after two mistakes). The best score per level is remembered on the device. In 2-player mode the activity runs on one board for now (take turns); split-screen Race/Co-op comes in Phase 5.

---

---

## Activity 2 — Hybridization Lab

Students learn that hybridization follows from **counting electron groups**. Every item walks through the same steps (you can go Back and Next at any time):

1. **Count the groups** around the highlighted central atom: shoot every bond line and every lone pair. A double or triple bond counts once (shooting both lines is flagged). Other atoms' lone pairs are decoys.
2. **Mix the orbitals:** drag (or tap) the right s and p orbitals into the **orbital mixer** (d orbitals are decoys), press **Mix!** and watch them blend into 2, 3 or 4 hybrid lobes. Leftover p orbitals glow.
3. **Label σ and π:** tap each bond line to mark it σ or π; the leftover p orbitals make the π bonds.
4. **See it in 3D:** rotate the molecule by dragging or grabbing with your hand; switch hybrid lobes, π orbitals and the bond angle on and off.

| Level | Items |
|---|---|
| **Easy** | CH₄, C₂H₄, C₂H₂: carbon only, compare sp³, sp² and sp. |
| **Medium** | NH₃, H₂O, BF₃, BeCl₂, CO₂, HCN: lone pairs count as groups; BF₃ and BeCl₂ show empty p orbitals. |
| **Hard** | Drug molecules (paracetamol, aspirin): shoot each numbered atom and label it sp, sp² or sp³. A wrong answer shows that atom's group count and names what was missed (a lone pair, a hydrogen, or a multiple bond counted twice). |

The **summary table** (groups → hybridization → shape and angle) is always on screen, a **Why?** button gives the three reasons, and the Hard level ends with the model's limits (e.g. S in H₂S, about 92°). Lecturer mode (Shift + L) shows each answer. Groups, hybridization, shape and angle are all worked out from the molecule data, never typed in.

---

## Activity 3 — Crystal Lattice Builder

Students build unit cells in 3D by placing particles on the rings of a cube (tap or shoot a ring, or drag the particle from the tray). Rotate the cube by dragging or by grabbing with your hand. Then **repeat the cell** (1, 2×2×2 or 3×3×3) to see a lattice fill space, or **show neighbours** to see which particles touch.

| Level | What students do |
|---|---|
| **Easy** | Build a **simple cubic** cell (8 corner rings), repeat it in 3D, then identify a lattice (SC, BCC or FCC) from its picture. |
| **Medium** | Build **body-centred** and **face-centred** cubic cells from all 15 rings (corners, faces and centre), then work out **particles per unit cell** and the **coordination number**. |
| **Hard** | Build **NaCl** from Na⁺ and Cl⁻ ions on all 27 rings, then **make a material** (match NaCl, diamond, graphite and a metal to their properties; one property is a decoy), then a **5-question quiz**. |

Particles per cell (corner ⅛, edge ¼, face ½, centre 1) and the coordination number are **computed from the positions**, never typed in, so adding a lattice cannot give a wrong answer. Wording is in `data/crystal/*.json` and `lang/*.json`.

## Activity 4 — Atom Blaster (shooting game)

A target-practice game. Each round shows a prompt such as "Shoot the ionic compounds" and bubbles drift around the arena. **Shoot the right ones** (finger gun, mouse click or tap) before the timer ends; decoys cost points. Streaks give bonus points, and fast rounds earn a speed bonus. After every round the right answers are shown so students learn from misses.

| Level | What students do |
|---|---|
| **Easy** | Noble gases, metals, Group 1, ionic vs covalent. |
| **Medium** | Double and triple bonds, 8 valence electrons, sp³ centres, lone pairs. |
| **Hard** | sp² and sp, incomplete and expanded octets, 24 valence electrons. Faster bubbles, 3 lives, bigger penalty. |

In **2 Players** mode both players shoot the same bubbles (Player 2 uses the keyboard without a camera) and each keeps a score. Rounds live in `data/blaster/levels.json` (prompt in English and BM, a list of right targets and a list of decoys).

## Two-player mode (same screen)

On the landing page choose **2 Players**, then a mode. Works in all three activities.

- **Race** — the screen splits in two. Both players get the **same question**; the first correct answer scores, then both move on together. Highest score wins.
- **Co-op** — one shared molecule or cell. One player **builds**, the other **checks**; roles swap every question.

**Controls (no camera needed):** Player 1 uses the mouse or touch. Player 2 uses the keyboard: arrow keys move, Space shoots, Enter grabs and drops. With the camera on, the left hand is Player 1 and the right hand is Player 2, each kept to their own half. Timers and the Challenge round are off in 2-player mode. Works offline.

## Put it on GitHub Pages (one time)

1. Create a repository on GitHub and upload everything in this folder (including the hidden `.nojekyll` file).
2. In the repository: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**.
3. After a minute, the link appears at the top of that page. Share it with students.

## Add your logos

Put these files in `brand/logos/` (same names):
`chemistry-with-dr-nam-logo.jpg` (badge), `uitm-logo-full.png` (UiTM, top-left) and `uitm-di-hatiku-motto.png` (UiTM motto, top-right).
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
| `js/activities/registry.js` | **List of activities** and topic groups (Chemical Bonding, STEM Tour, Pharmacy). Add an entry here to add an activity |
| `js/activities/lewis/` | Lewis Structure Builder: `rules.js` (pure logic, no DOM), `board.js` (drag board + SVG answer), `index.js` (flow, scoring, timer) |
| `css/lewis.css` | Styles for the Lewis activity (loaded by the activity itself) |
| `js/periodic.js`, `data/periodic.json` | Periodic table overlay and its data (edit BM names here) |
| `js/activities/hybrid/`, `css/hybrid.css` | Hybridization Lab: `rules.js` (logic), `diagram.js` (2D structure), `mixer.js` (orbital mixer), `viewer3d.js` (Three.js), `index.js` (flow, scoring) |
| `data/hybrid/` | **Molecule data (JSON):** `molecules.json` (2D and 3D coordinates, lone pairs), `levels.json` |
| `js/activities/crystal/`, `css/crystal.css` | Crystal Lattice Builder: `rules.js` (logic), `scene.js` (Three.js scene and ring markers), `index.js` (flow, scoring) |
| `data/crystal/` | `cells.json` (lattice names and notes), `materials.json` (structures, properties, quiz), `levels.json` |
| `data/lewis/` | **Molecule data (JSON):** `elements.json`, `molecules.json`, `levels.json` |
| `js/activities/blaster/`, `css/blaster.css`, `data/blaster/` | Atom Blaster shooting game (`levels.json` holds the rounds), tested by `node tools/test-blaster.mjs` |
| `js/duo.js`, `js/duo-logic.js`, `css/duo.css` | Two-player mode: `duo-logic.js` (pure Race scoring and Co-op roles, tested by `node tools/test-duo.mjs`), `duo.js` (split screen, keyboard Player 2). Activities expose `ctx.duo` hooks |
| `js/activities/shooter/`, `data/shooter/` | Molecule Shooter and its question packs (JSON) |
| `js/study.js` | Study mode logging (lecturer tools → CSV) |
| `js/i18n.js`, `lang/` | Translations |
| `sw.js` | Offline cache, **generated** → `node tools/build-sw.mjs` (run after adding or changing files) |
| `vendor/` | MediaPipe Hands (Apache-2.0) and Three.js (MIT), bundled for offline use |
| `brand/fonts/` | League Spartan and Questrial (SIL Open Font License) |

### Study mode (research data)

Lecturer mode (Shift + L) shows **Study tools**: turn **Study mode** on, and students are asked for their student ID before they play. Each session, input change and activity event is saved on that laptop only (no video). After class, press **Export study data** to download a CSV, then **Clear study data** on shared laptops. **Next student** clears the ID between students on one laptop. Columns match the *Game logs* sheet of the study codebook. Right now **Molecule Shooter** records every answer; the other activities record sessions only until they call `ctx.log`.

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

### Add a molecule to the Hybridization Lab

1. Add it to `data/hybrid/molecules.json`: `atoms` (`id`, `el`, `xy` for the 2D drawing, `xyz` for the 3D view, `lp` lone pairs, `h` hidden hydrogens for skeletal drawings), `bonds` (`a`, `b`, `order`) and `central` (the atom to analyse). For a central atom with lone pairs add `lp3d` (their directions). For a Hard drug molecule, give atoms a `mark` number.
2. Add `"mol:<id>"` (or `"drug:<id>"` for Hard) to a level in `data/hybrid/levels.json`.
3. Run `npm test`: it checks groups, hybridization, shape, the counting and mixing logic, and that BM and English text exist.
