Bold, alive science decks and course materials for pharmacy and chemistry: deep navy and teal by default (with a sky-blue day theme), electric-lime accents, glowing glass panels, clay-style 3D shapes that gently float, and slides that respond to the pointer.

**When to use:** only when Dr. Ainun asks for this design system by name. It is not the default for her work — guest lectures and external talks may need a different look.

## Content fundamentals

- **Voice:** clear academic English, written for students and conference audiences. Explain, then cite. Third person or inclusive "we"; no slang, no emoji.
- **Titles:** short Title Case phrases ("Natural Products: A Pillar of Pharmaceutical Research", "From Nature to Computation"). One-word section openers may go ALL CAPS (`CONTENTS`, `MEDICINE`).
- **Subtitles** explain the title in one line: "Defining the Scope of Scientific Inquiry".
- **Lists:** numbered `01.`–`04.` for agendas and topic navigation; bullets with a bold lead-in for points ("**Variability in Quality:** The chemical composition…").
- **Sources:** every borrowed figure gets a `caption` line: "Source: https://doi.org/…".
- **Presenter line:** name in caps under the title, campus line beneath: "NUR 'AINUN MOKHTAR / UiTM Bertam Campus, Pulau Pinang, Malaysia".

## Colour

- **Ground:** the signature gradient, left to right, `surface-000` → `sky-400` (`linear-gradient(90deg, var(--surface-000), var(--sky-400))`). Plain `surface-050` is the flat alternative.
- **Slide ground (layouts):** `surface-050` with soft radial pools of `sky-400` (top-right) and `cobalt-600` (bottom-right), plus a faint `slate-400` dot grid fading in from the left.
- **Text:** `ink` for everything by default. `indigo-500` for display titles on light grounds; `title-accent` for accent titles and eyebrows on cards and glass (works in both themes). White only on `indigo-500`, `navy-600`, `cobalt-600` or `royal-700`.
- **Cards:** `sky-300` for title cards and contents pills; `sky-200` for outlined research cards; `indigo-500` for solid "Idea" cards; `periwinkle-300` for inactive side-nav topics.
- **Bold slides:** split the slide with a wavy `cobalt-600` block against `surface-100`. Use at most one block colour per slide.
- **Accents:** `coral-400` and `bright-blue-400` belong to illustrations only (molecules, DNA, icons in white discs) — never text, never the only way to signal meaning.
- **UiTM inks** (`uitm-purple`, `uitm-navy`, `uitm-gold`) exist only inside the logo files. Don't build UI from them.

## Contrast accent — electric lime

`spark-400` is the high-contrast colour that gives the decks their energy (the look of modern AI/tech event sites: deep grounds, one electric accent). Use it **often, in small doses** — on every slide, but never as a large area.

- **Always lime:** the short rule above every slide title (56–64 × 6px pill, `shadow-spark`); list and card numbering (lime discs with `on-spark`, or lime numerals); buttons/CTAs; progress bars; the "you are here" dot; focus rings.
- **One hero per slide:** a highlighter behind 1–3 key words of the title (`spark-400` + `on-spark`), or the hero KeyStat tile — that element alone takes `shadow-spark`.
- **How it reads:** as a fill, always with `on-spark`. As text, `spark-400` at night only (and 24px+ on teal fills); by day use `spark-ink`.
- **Never:** body text, backgrounds or blocks larger than a tile, behind logos, or next to `coral-400`.

## Night theme (default) and Day theme

**Night — teal & navy** is the default: near-black navy grounds, teal cards and blocks, aqua accents, teal glow. **Day — sky blue** is the original light look from your templates, for bright rooms and printed handouts. Every token name stays the same — switch the theme, not the tokens. Night details:

- **Ground:** `surface-050` is deep navy; the signature gradient runs navy (`surface-000`) → dark teal (`sky-400`).
- **Text:** `ink` is pale ice on every dark ground. Use `title-accent` (aqua) for accent titles and eyebrows; avoid `indigo-500` as text in this theme except 24px+.
- **Solid cards and the active pill** are dark teal (`indigo-400` → `indigo-500` → `navy-600`) with white text.
- **Blocks:** `cobalt-600` becomes deep teal-blue with `on-block` text.
- **Lime pops hardest here:** on navy, `spark-400` also works as text for key numbers and highlights.
- **Glow** turns teal (`shadow-glow`); shadows deepen to near-black so cards still lift off the navy.
- **Logos:** the UiTM PNGs sit on white, so in this theme place them on a small white plate with `radius-sm`, or use the light theme for slides that carry logos.
- Use one theme per deck; don't alternate light and dark slides.

## Type

- **Display — League Spartan ExtraBold (800):** `display` (120px) and `title` (72px) are heavy and tight (negative tracking, leading 0.95–1.0); `heading` and `card-title` in Bold. Go big: one short title per slide, set large.
- **Text — Questrial:** `subtitle`, `body`, `caption`. In Canva or PowerPoint, Glacial Indifference is the equivalent body face; both are in the font stack.
- Sizes are set for a 1920×1080 slide. Keep body at `body` (22px) or larger; never shrink text to fit — split the slide.
- Left-align body copy. Centre only titles, pill labels and short card text.

## Shape, space and depth

- **Radii:** generous. `radius-lg` on title cards and the main content panel, `radius-md` on cards, `radius-pill` on topic pills, tags and number badges. No square corners.
- **Spacing:** `space-8` slide margin, `space-6` between title and content, `space-3` between cards, `space-4` inside cards.
- **Dividers:** a `stroke-rule` vertical line in `indigo-500` between two text columns.

## Depth, glow and 3D

The decks should feel alive: things float above the ground, solid shapes look like soft clay, and one element per slide glows.

- **Light comes from the top-left.** Highlights sit on top edges, shade on bottom edges, shadows fall down and slightly right.
- **Everything raised gets a shadow.** Small things (badges, tags, side-nav pills) take `shadow-contact`; cards and panels take `shadow-lift`; big title cards and contents pills take `shadow-float`. Text, logos and the slide ground never take a shadow.
- **Solid shapes are 3D clay.** Fill top-to-bottom (or diagonally) from a slightly lighter tint to the base colour, and add `shadow-bevel` (dark fills) or `shadow-bevel-soft` (light fills) for the bright top rim and shaded bottom.
- **Glow marks the focus — once per slide.** Use `shadow-glow` on a GlowPanel, the active topic pill or a key result. Two glowing things cancel each other out.
- **Glass:** `glass-fill` + `backdrop-filter: blur(var(--blur-glass))` + a `glass-edge` rim, over the gradient, a soft photo or 3D shapes.
- **Cut-outs** (3D capsules, molecules, PNG illustrations) take `filter-lift`; a focus icon may take `filter-glow`.
- **Spheres:** number badges and decorative orbs use a radial fill with the highlight at the top-left (`surface-000` → base colour → `royal-700`).
- **Outlined cards** (Nature style) stay flat but may take a hard 8px offset shadow in `indigo-500` for a sticker edge — no blur.
- **In PowerPoint/Canva:** shadow = blur 24–48pt, distance 12–24pt, 20–25% transparency, colour `ink` (black at 55–60% transparency in the dark theme); glow = outer glow `#6599FF` (dark theme `#2DD4BF`), 18–24pt, ~50% transparency; bevel = "Soft round" or an inner shadow from the bottom.
- Keep text crisp: never blur or glow body text, and keep text contrast at 4.5:1 on the lightest part of a gradient fill.


## Motion and interaction

For decks shown on screen, web versions and kiosks. Exports (PDF/PowerPoint) simply show the resting state.

- **Hover lift:** cards, tiles, pills and buttons rise by `hover-lift` over `duration-hover` with `ease-out`; their shadow steps up to `shadow-lift`.
- **3D tilt:** Idea cards, KeyStat tiles and glass panels tilt toward the pointer, at most `hover-tilt` (perspective 900px).
- **Subtle hovering:** decorative 3D capsules and orbs bob up and down by `float-distance` every `duration-float`, staggered. Never animate text.
- **Interactive structure:** agenda pills switch the active topic; takeaways expand on click; numbers count up on results slides. Every interactive item works with the keyboard (Tab, Enter/Space) and shows a 3px `spark-400` focus ring.
- **Reduced motion:** when the viewer asks for less motion, floating, tilting and count-ups switch off.
- **In PowerPoint:** use Morph between slides, a slow "Float In" for capsules, and keep everything else still.

## Slide layouts

Five ready layouts show the system in use (see the Slide layouts components): **SlideCover**, **SlideContents** (interactive agenda), **SlideContent** (side nav + glass panel + tilting cards), **SlideStats** (count-up numbers), **SlideConclusion** (expandable takeaways + thank-you). Build every deck from these; keep the lime title rule, the logo plates and the 56px side margins (on a 960px slide).

## Study Hub (course materials)

The same identity carries every course's learning materials. Each topic has the same five components, in the same order: **Lecture Notes · Pre-lecture · Quiz & Games · Tutorial · Post-lecture**.

- **StudyHubHeader** opens every topic page (course code, big lime topic number, title, tabs for the five components).
- **ActivityCard** for pre-/post-lecture self-instructional activities with a self-check; **QuizCard** for instant-feedback questions; **AnswerKey** for worked solutions (blurred on screen until revealed); **TopicProgress** for the student's progress.
- **PrintableWorksheet** for anything printed (tutorials, SIM, handouts). It always uses the Day theme, has no glow or motion, and keeps lime to small number discs and tags so it reads in greyscale.
- **Screen vs print:** on screen use the Night theme with hover and motion; anything students print or receive as PDF uses the Day theme.
- **Feedback:** correct = lime ring + "✓ Correct", wrong = coral ring + "✗ Your answer". The words always appear, so colour is never the only signal.
- **Chemistry text:** proper sub/superscripts (H₂O, mol⁻¹), units on every answer, correct significant figures, and given data (Aᵣ values, constants) stated in the instructions.

## Playful style — Chemistry with Dr. NAM

The cartoon side of the brand, for outreach, school visits, social posts and Study Hub games and activities. Same colours, fonts and lime accent — drawn like a cartoon.

- **When:** outreach, public talks, Study Hub games/activities, social media. **Not** for conference talks, research presentations or exam papers (use the standard style).
- **Stickers:** `sticker-fill` + `stroke-doodle` outline in `sticker-ink` + hard `shadow-sticker` (ink by day, lime at night), tilted ±2–3°, straighten and pop on hover (StickerCard).
- **Doodles:** the six DoodleIcons (`assets/Doodles/`); on navy, put them on a sticker disc. They float or wobble gently (`wiggle-angle`).
- **Your persona:** the DrNamSays bubble and SlidePlayful keep a round slot for your own "Dr. NAM" cartoon — upload your character image; the system does not draw your likeness.
- **Highlight:** the key word sits on a tilted, outlined lime sticker instead of a flat highlighter.
- **Buttons:** chunky lime pill, ink outline, hard 4px shadow that presses in on click.
- **Voice:** friendly, short and curious — questions as titles ("Why do we count atoms in moles?"), "Did you know?", "Try this", "Pharmacy link". Still accurate, with units.
- **Mixing:** one style per deck. A lecture deck in the standard style may open or close with one playful slide, or use DrNamSays for tips.

## Imagery and iconography

- Three illustration styles appear in the sources: **3D clay** (capsules, tablets, plus signs), **flat character** illustrations (scientists in lab coats), and **hand-drawn outline doodles** (DNA, molecules, microscope) in `coral-400`/`bright-blue-400`. Use one style per deck.
- Doodles: the Playful style's own outline icons live in `assets/Doodles/` (originals made for this system).
- Icons: solid single-colour glyphs in `coral-400` centred in a white disc (Nature deck). No emoji.
- Photos: soft, high-key clinical shots (plant + lab coat); fade them into `royal-700` when text sits on top.
- The illustrations are Canva library elements and are **not** included here — pull them from Canva when building a deck.

## Logos

Two identities, always shown together on teaching material: **UiTM** (the institution) and **Chemistry with Dr. NAM** (you).

- `assets/Logos/chemistry-with-dr-nam-logo.jpg` — your personal brand badge (cartoon portrait + wordmark). Use it as a circle on a white disc (`object-fit: contain`): next to your name on title slides, in the Study Hub header, on worksheets (top-right), and as the persona in DrNamSays and SlidePlayful. Its navy and green (`drnam-navy`, `drnam-green`) stay inside the logo; the system's accent is still lime.
- `assets/Logos/uitm-logo-full.png` — full UiTM crest + wordmark (transparent PNG, grey text). Use on white or a white plate; the grey wordmark disappears on navy.
- `assets/Logos/uitm-cawangan-pulau-pinang-lockup.png` — campus lockup; top-left on every content slide and worksheet, about 200px wide on a 1920px slide.
- `assets/Logos/uitm-di-hatiku-motto.png` — top-right on slides, same height as the lockup.
- At night, every logo sits on a small white plate (`radius-sm`) or white disc with `shadow-contact`. Never recolour, stretch, crop the badge's wordmark, or place a logo directly on `cobalt-600`, `indigo-500` or the navy ground.
