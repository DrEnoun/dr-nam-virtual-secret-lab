# Chemistry Gesture Game — Project Brief

Build a browser-based chemistry learning game for general use (any student or learner of introductory chemistry). It must run on a laptop with a webcam, with no login, and work offline except for the online multiplayer mode. Build it in phases (see Build Plan at the end) and design it so new activities can be added later.

---

## 1. Technology

- Plain HTML/JavaScript (or Vite + JS), deployable as a static site on GitHub Pages.
- Hand tracking with MediaPipe Hands, running in the browser.
- 3D views with Three.js.
- Always include a mouse/touch fallback so every activity works without a camera.
- Camera video stays on the device and is never uploaded. Show a short notice saying so.

## 1A. Offline Mode

Single-player and 2-player same-screen modes must work without internet. Only Class Battle (online) needs a connection.

- **Bundle everything locally:** include MediaPipe Hands (JS, WASM and model files), Three.js, fonts, sounds, images and molecule data in the repository. No CDN or external downloads at runtime.
- **Installable PWA:** add a web app manifest and service worker that caches all game files on first visit, so students can open the link once with internet, install it, and then play offline on that device. Show a small "Ready to play offline" message when caching is complete.
- **Offline classroom copy:** provide a downloadable ZIP of the game plus a simple one-click way to run it from a local server on the lecturer's laptop (e.g. a small `start-windows.bat` and `start-mac.command` script). Explain in the README that camera access needs a local server (localhost), so opening `index.html` directly will not enable the webcam.
- Class Battle mode should detect when there is no internet and show a clear message, while all other modes keep working.
- Test offline by disabling the network in the browser after the first load.

## 1B. Branding — "Chemistry with Dr. NAM"

The game uses Dr. NAM's own design system ("Dr. NAM Science Decks"), in its **Playful style** (the cartoon side of the brand, meant for games and activities). Full rules are in `brand-kit/dr-nam-brand-guide.md`; exact values in `brand-kit/dr-nam-tokens.json`. Turn the tokens into CSS variables and use them everywhere — never invent colours or fonts.

**Files in `brand-kit/`** (bundle them locally for offline use):
- `fonts/` — League Spartan 400/700/800 (titles) and Questrial 400 (text), as .woff2.
- `logos/chemistry-with-dr-nam-logo.jpg` — her personal badge (cartoon portrait + wordmark).
- `logos/uitm-cawangan-pulau-pinang-lockup.png`, `logos/uitm-di-hatiku-motto.png`, `logos/uitm-logo-full.png` — UiTM logos.
If a logo file is missing, leave a clearly labelled placeholder slot; never draw or approximate a logo or her likeness.

**Themes**
- On screen: **Night — teal & navy** (default). Ground `#060d1b`, text `#e3eef8`, teal cards `#0d7f74`, aqua accent titles `#5eead4`.
- Add a **Day — sky blue** toggle for bright classrooms (ground `#f0f6ff`, text `#3b365f`). Same token names, different values.

**Electric-lime accent `#d4ff3a`** (day `#c8f53d`; text on lime `#0a1628`) — used often but small: the cursor crosshair, selected buttons, scores and numbering, progress bars, title rule, focus rings, the "shot" flash. Never large backgrounds or body text.

**Type:** titles in League Spartan ExtraBold, big and tight; everything else in Questrial. Body text at least 22px; large enough for a projector.

**Playful style elements**
- **Sticker buttons and cards:** white fill, 3px dark outline `#231f20`, hard offset shadow (lime at night, ink by day), tilted ±2–3°, straighten and pop when the crosshair hovers. Shooting a button presses its shadow in.
- **Dr. NAM guide character:** a "Dr. NAM Says" speech bubble with her logo badge in a round white disc gives tips, hints and the "Why?" explanations. Friendly, short voice: "Did you know?", "Try this", "Pharmacy link".
- **Doodles:** simple outline doodles (flask, atom, molecule, capsule, test tube, sparkle) float gently in the background.
- **Glow:** only one glowing element per screen (the current target or key result), teal glow `#2dd4bf`.
- Atoms and electrons can use the illustration accents: bright teal `#2dd4bf` and coral `#fc7a7a` (decorative only, never text).

**Feedback (colour is never the only signal):** correct = lime ring + "✓ Betul / Correct"; wrong = coral ring + "✗ Cuba lagi / Try again", plus the one-line hint.

**Logos placement:** landing page shows the Chemistry with Dr. NAM badge prominently, with the UiTM campus lockup top-left and "di hatiku" motto top-right. In the Night theme, every logo sits on a small white plate or disc. Never recolour, stretch or crop logos. Inside activities, show only a small Dr. NAM badge in a corner.

**Motion:** hover lift and gentle floating as in the brand guide; switch off floating and wobble when the device asks for reduced motion. Never animate text.

**Game name:** "Dr. NAM Virtual Secret Lab" (same name in BM and English), with the tagline "Bringing everyday life into simple science, explained."

## 2. Gestures

- **Aim:** the index fingertip controls an on-screen crosshair cursor.
- **Select ("finger-gun shot"):** hand in a finger-gun shape (index pointing, thumb up). Dropping the thumb onto the index finger = "shoot" = click. Add a small shot animation and sound, plus a short cooldown to prevent double selects.
- **Grab and drop:** pinch thumb + index = grab; open hand = release.
- **Rotate 3D views:** grab and move the hand.
- Show a 3-screen gesture tutorial the first time, with a skip button.

## 3. Landing Page

- Title, short welcome, and choices selectable by shooting:
  1. **Language:** Bahasa Malaysia / English
  2. **Level:** Easy / Medium / Hard
  3. **Activity:** chosen from topic groups (see section 5)
  4. **Players:** Single player / 2 players (same screen) / Class battle (online) — see section 4A
- Large target buttons that highlight when the crosshair is over them.
- Remember the last choices. Allow returning to the landing page at any time.

## 4. Language

- All on-screen text, hints and feedback in both BM and English, stored in translation files (e.g. `lang/ms.json`, `lang/en.json`) so the lecturer can edit wording without touching code.
- Use standard Malaysian chemistry terms (e.g. elektron valens, ikatan kovalen, ikatan ion, struktur Lewis, penghibridan, kekisi hablur, sel unit).
- Keep a glossary file listing every BM term so the lecturer can check it.

## 4A. Multiplayer

Design every activity so it can run in single-player and multiplayer modes, using the same questions and scoring.

### Mode 1 — 2 Players, Same Screen (local)
- Two students stand in front of one webcam/projector. Track 2 hands (MediaPipe `maxNumHands: 2`); assign the hand on the left of the camera image to Player 1 and the right to Player 2.
- Split screen: each player has their own half, cursor colour and score.
- Modes: **Race** (same question, first correct answer scores) and **Co-op** (players share one molecule; one adds electrons, the other checks octets or bonds).
- Mouse fallback: Player 1 uses mouse, Player 2 uses keyboard, or turn-based on one device.
- No internet or server needed.

### Mode 2 — Class Battle (online)
- The lecturer opens "Host" on the projector and gets a short room code and QR code.
- Students join on their own laptop or phone by entering the code and a nickname (no login, no personal data).
- Each student plays on their own device (gesture or touch); the host screen shows a live leaderboard and question timer, Kahoot-style.
- Team option: students are put into teams and team scores are combined.
- Lecturer controls: start, pause, next question, end game, show answer.
- Needs a real-time backend. Use a free option that works with a static site (e.g. Firebase Realtime Database or Supabase Realtime). Keep the backend small, and document setup steps in the README. Store only nickname, room code and score; delete rooms after the session.
- Camera video is never sent; only answers and scores.

Build Mode 1 before Mode 2. Keep the game logic separate from input and networking so both modes reuse the same activity code.

## 5. Topic Groups on the Landing Page

- **Chemical Bonding:** Activity 1 (Lewis Structure Builder), Activity 2 (Hybridization Lab), optional extra bonding activities
- **Solid State:** Activity 3 (Crystal Lattice Builder)
- **Organic Chemistry:** future
- **Pharmacy Applications:** future

Recommended learning order: Lewis Structures → Hybridization → Crystal Lattice.

---

## 6. Activity 1 — Lewis Structure Builder

Show each atom's symbol with its valence shell as a ring of slots (8, or 2 for H). Students grab electrons from a tray and drop them into the slots.

- **Easy:** fill valence electrons for single atoms (H, C, N, O, F, Na, Mg, Cl), then simple molecules with single bonds (H2, Cl2, HCl).
- **Medium:** covalent molecules with lone pairs (H2O, NH3, CH4) and multiple bonds (O2, N2, CO2).
- **Hard:** ionic (electrovalent) bonding. Transfer electrons from a metal to a non-metal to form ions (NaCl, MgO, MgCl2), and show charges and brackets. Finish with a mixed timed challenge.

Feedback: correct / too many or too few electrons / octet not satisfied, with a one-line hint. Show the correct Lewis structure at the end of each item.

## 7. Activity 2 — Hybridization Lab

**Goal:** students learn that hybridization follows from counting electron groups, and that π bonds keep p orbitals unhybridized. Hybridization is a model that explains observed molecular shapes; the shape comes first.

Flow for each item:
1. Show a Lewis structure (reuse Activity 1 molecules).
2. **Count groups:** students shoot each bond and lone pair around the highlighted central atom. Double and triple bonds count once. A counter shows the total.
3. **Mix orbitals:** students grab one s and the right number of p orbitals and drop them into an "orbital mixer". The animation shows them blend into hybrid lobes (sp3 = 4, sp2 = 3, sp = 2).
4. Leftover p orbitals glow, then overlap side by side to form the π bond(s). Label σ and π bonds.
5. Rotate the 3D molecule to see its shape and bond angle.

Levels:
- **Easy:** CH4, C2H4, C2H2 (carbon only; compare the three).
- **Medium:** NH3, H2O, BF3, BeCl2, CO2, HCN (beyond carbon; lone pairs count as groups).
- **Hard:** drug molecules (e.g. paracetamol, aspirin). Students shoot each marked atom and label it sp, sp2 or sp3.

Feedback rules:
- Wrong answer: show the group count and name the missed group (often a lone pair, or a double bond counted as two).
- Always show the summary table:

| Electron groups | Hybridization | Shape (angle) |
|---|---|---|
| 4 | sp3 | tetrahedral (109.5°) |
| 3 | sp2 | trigonal planar (120°) |
| 2 | sp | linear (180°) |

- A "Why?" button explaining three points: forming more bonds makes the atom more stable; electron groups spread apart to reduce repulsion; π bonds need unmixed p orbitals, so each π bond leaves one p orbital out of the mix.
- Note for Hard level: heavier atoms (e.g. S in H2S, about 92°) show little hybridization; the model works best for C, N, O and B.

## 8. Activity 3 — Crystal Lattice Builder

Students rotate the 3D view by grabbing and moving their hand.

- **Easy:** build a simple cubic unit cell by placing particles at the corners, then repeat it in 3D to see a lattice fill space.
- **Medium:** build body-centred and face-centred cubic unit cells. Show coordination number and particles per unit cell.
- **Hard:** build NaCl from Na+ and Cl- ions (linked to Activity 1), then "make a material": match structures to properties, e.g. NaCl (ionic, brittle, high melting point), diamond vs graphite (covalent network), a metal (metallic lattice, conducts, malleable). End with a short quiz.

## 9. Optional Extra Bonding Activities (later phase)

- **Electron Configuration Filler:** drag electrons into orbital boxes (Aufbau, Hund's rule, Pauli).
- **Bond Type Shooter:** shoot flying molecules into ionic / covalent / metallic bins.
- **Shape Builder (VSEPR):** pull bonds and lone pairs apart into 3D shapes and see bond angles.
- **Electronegativity Tug-of-War:** pull shared electrons toward the more electronegative atom; decide polarity.
- **Ionic Formula Matcher:** combine ion tiles until charges balance.
- **Intermolecular Forces Arena:** form H-bonds, dipole–dipole and London forces; predict boiling point and solubility.

---

## 10. Future Expansion (design for this now; do not build yet)

### Architecture
- Each activity is a self-contained module registered in one list, so new activities appear on the landing page automatically.
- Store molecules as data files (JSON with atoms, bonds, lone pairs, 3D coordinates, or SMILES), not hard-coded, so new molecules can be added without code changes.
- Allow extra drug properties in molecule data (e.g. pKa, solubility, H-bond donors/acceptors, salt form) so pharmacy activities can reuse the same molecules.
- Keep shared components reusable: gesture engine, 3D molecule viewer, electron drag-and-drop, scoring, BM/EN translation, feedback panel.
- Write a README explaining how to add a new activity and a new molecule.

### Organic Chemistry module ideas
- Functional Group Shooter (on real drug molecules)
- Chirality with your hands (mirror images, chiral carbons; ibuprofen, thalidomide)
- Isomer Builder (C4H10, C2H6O)
- Conformation Spinner (ethane, cyclohexane chair)
- Benzene and Resonance (extends sp2 / π ideas)
- Curly Arrow Mechanisms

### Pharmacy Applications module ideas
- Salt Former (why many drugs are sold as salts; solubility)
- Absorption Journey (ionization in stomach vs intestine; membrane crossing)
- Drug–Receptor Docking (H-bond, ionic, hydrophobic contacts)
- Rule of 5 Checker (oral drug-likeness)
- Tablet Maker (polymorphs, amorphous forms, dissolution, shelf life)
- Stability Lab (aspirin ester hydrolysis; storage)
- Interaction Alert (tetracycline + calcium/milk)

Each pharmacy activity ends with a short "Why this matters in pharmacy" card in BM and English.

---

## 11. General Requirements

- Follow the Dr. NAM branding in section 1B; large text readable on a classroom projector.
- Score and progress per level.
- "Lecturer mode" that shows answers.

## 12. Build Plan

1. **Phase 1:** Dr. NAM branding setup (fonts, tokens as CSS variables, logos, sticker components), landing page, language and level selection, gesture engine with tutorial, mouse fallback, and offline setup (bundled libraries, PWA caching, offline classroom copy).
2. **Phase 2:** Activity 1 (Lewis Structure Builder), Easy level end to end, then Medium and Hard.
3. **Phase 3:** Activity 2 (Hybridization Lab), all levels.
4. **Phase 4:** Activity 3 (Crystal Lattice Builder), all levels.
5. **Phase 5:** Multiplayer Mode 1 (2 players, same screen) for all three activities.
6. **Phase 6:** Multiplayer Mode 2 (online class battle with room code and live leaderboard).
7. **Phase 7 (optional):** extra bonding activities from section 9.

Even in Phases 1–4, structure the code so multiplayer can be added without rewriting the activities.

Test each phase in the browser before moving on. Organic and Pharmacy modules are for later sessions.
