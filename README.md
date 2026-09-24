# Xike Yang — Personal Website

https://xkkkkkkkkkkkkkk.github.io/Personal_website/

A small, dependency-free personal academic homepage (HTML + CSS + vanilla JS).
No frameworks, no build step, no dependencies to install.

Since V3 the Contact panel has a feedback form. There is no server of our own: the
browser posts straight to a hosted Supabase table over its REST API with plain
`fetch`, and the site itself is published on GitHub Pages. See
[the feedback form](#the-feedback-form-v3) and [`docs/V3.md`](docs/V3.md).

## Structure

```
personal-website/
├── index.html        # single page: a 7-panel scroll deck (hero + 6 sections)
├── css/
│   ├── style.css     # design system + components + responsive (V1)
│   ├── cube.css      # top-left docked 3D cube (V2)
│   └── deck.css      # sticky pin + cross-fading panels (V2)
├── js/
│   ├── main.js       # mobile menu, gallery, lightbox
│   ├── animation.js  # scroll progress -> cube rotation + panel cross-fade (V2)
│   ├── feedback.js   # Contact feedback form -> Supabase REST (V3)
│   └── confetti.js   # celebration burst when a message is saved (V3)
├── assets/
│   ├── favicon.svg   # isometric cube icon (matches the V2 cube)
│   └── gallery/      # 21 processed photos (photo-01.jpg … photo-21.jpg)
├── docs/
│   ├── V1.md         # V1 iteration log
│   ├── V3.md         # V3 iteration log + GitHub Pages / Supabase setup
│   └── supabase-feedback.sql   # feedback table + RLS policy
├── .nojekyll         # ship files as-is on GitHub Pages (V3)
└── README.md
```

## Run locally

Open `index.html` directly, or serve the folder:

```bash
# any static server works, e.g.
npx serve .
# or
python -m http.server 8000
```

## The scroll deck (V2)

The whole page is one tall scroll region. A sticky pin holds the cube docked to the
**top-left of the content column** while the `.panel` sections cross-fade one after
another, and the cube rotates so that each section lands on its own face:

| Panel | Nav link     | Cube face          |
| ----- | ------------ | ------------------ |
| 0     | — (hero)     | *hidden*           |
| 1     | About        | FRONT `01`         |
| 2     | Research     | RIGHT `02`         |
| 3     | Experience   | BACK `03`          |
| 4     | Projects     | LEFT `04`         |
| 5     | Learning     | TOP `05`           |
| 6     | Contact      | BOTTOM `06`        |

- Panel 0 is the hero: **Xike Yang** and the intro appear immediately at the top of the
  page (no scrolling required) and **no cube is shown**.
- As you scroll into "01 About" the cube fades in and grows slightly, then stays docked
  in the corner for the rest of the page. The section heading sits to its right and the
  panel content flows below it, so one panel ≈ one screen.
- The deck starts on the first panel and ends on the last one; the two edge panels stay
  fully visible past their centre (see the `opacityOf` bounds in `js/animation.js`).
- The corner slot scales with the viewport (it is sized in `vmin`/`vh`), so the cube
  grows and shrinks with page zoom and window resizing.

### How it works

- `css/cube.css` builds the 3D scene and holds the shared V2 geometry tokens
  (`--cube-size`, `--corner-top`, `--page-pad`, `--cube-gap`). `.cube-stage` provides
  `perspective`, `.cube` uses `transform-style: preserve-3d`, and six `.cube-face`
  elements are placed on the cube's sides with `rotateX/rotateY + translateZ`.
- `css/deck.css` makes `.deck` `N × 120vh` tall and pins `.deck-pin` with
  `position: sticky`, and positions `.panel-head` / `.panel-body` around the docked cube.
- `js/animation.js` reads overall scroll progress `0 → 1` and interpolates between
  face-on rotation "stops", easing the rendered transform with `requestAnimationFrame`.
  The same progress cross-fades the panels, reveals the cube (`cubeReveal`) and
  highlights the matching nav link.
- The cube is decorative: it is `pointer-events: none` and `aria-hidden`, so it never
  blocks navigation or the Contact links.

### Change the face content

Each face shows only its index. Edit the six `.cube-face` blocks in `index.html`
(`.face-front` … `.face-bottom`); the section title lives in each panel's heading.

### Change the rotation / cross-fade

Edit the `STOPS` array in `js/animation.js` (one `[rotateX, rotateY]` pair per panel,
in panel order):

```js
var STOPS = [
  [0, 0],       // 0 hero       -> front (cube hidden)
  [0, 0],       // 1 about      -> front (01)
  [0, -90],     // 2 research   -> right (02)
  [0, -180],    // 3 experience -> back (03)
  [0, -270],    // 4 projects   -> left (04)
  [-90, -360],  // 5 learning   -> top (05)
  [90, -360]    // 6 contact    -> bottom (06)
];
```

- `EASE` (0–1) controls smoothness; lower = smoother/slower to catch up.
- `FADE_HOLD` controls how long a panel stays fully opaque before it fades.
- `CUBE_MIN` (0–1) is the cube's scale at the start of its reveal (hero → About);
  `1` means it fades in at full size.
- The panel count is driven by `--panel-count` on `<main class="deck">` (currently `7`).

### Photography block (About panel)

The 21 photos in `assets/gallery/` are arranged by the `COLLAGE` / `FILMSTRIP` arrays in
`js/main.js` (each page is a list of rows, each row a list of photo numbers). The layout
follows the viewport:

- **≥ 1024px** — `COLLAGE`: two rows per page, so the photos read as a large square-ish
  grid (4 pages). The About panel splits into text (left) and photography (right).
- **< 1024px** — `FILMSTRIP`: one row per page (5 pages). The collage would be too tall on
  a phone and would push About past one screen, so the filmstrip keeps the panel fitting.

`matchMedia` swaps the two live, without a reload. Rows always fill the full width and each
photo keeps its own aspect ratio (never cropped or stretched); the frame is sized to the
tallest page, and any leftover space is filled with the accent colour.

### Hero portrait slot

The hero reserves a circular placeholder (`.hero-avatar`, labelled `Photo`). To use a real
portrait, replace the `<span>Photo</span>` in `index.html` with an `<img>` — it is cropped
to the circle automatically (`object-fit: cover`). The slot is sized in `vmin`, so it scales
with the viewport.

### Disable the animation

- Remove (or comment out) `<script src="js/animation.js" defer></script>` in `index.html`,
  or remove the `<link rel="stylesheet" href="css/deck.css" />` and
  `css/cube.css` lines to drop the deck entirely.
- Users who set the OS "reduce motion" preference automatically get a static cube and
  instant (non-animated) panel switching via `@media (prefers-reduced-motion: reduce)`.
- Without JavaScript, `css/deck.css` unpins the deck into a normal document flow so all
  content stays readable.

## The feedback form (V3)

The Contact panel ends with a small form (Name / Email optional, Message required).
There is no backend of our own — `js/feedback.js` POSTs the values as JSON straight to a
hosted **Supabase** table using `fetch`, so there is no SDK to install and no build step.

```
browser  --POST /rest/v1/feedback-->  Supabase (Postgres)
```

### Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run `docs/supabase-feedback.sql` in its SQL editor (creates the table + RLS policy).
3. Project Settings → API, then paste the **Project URL** and the **`anon` public** key
   into `SUPABASE_URL` / `SUPABASE_ANON_KEY` at the top of `js/feedback.js`.

Both values are meant to be public. The table grants `INSERT` only to the `anon` role and
has no `SELECT` policy, so the public key cannot read anyone's feedback. **Never put the
`service_role` key in the front end.** To read submissions, use the Supabase Table Editor
or:

```sql
select created_at, name, email, message from public.feedback order by created_at desc;
```

### Behaviour

- **Not configured yet** — the form does not break: it opens the visitor's mail client
  with the message pre-addressed to the fallback email in `js/feedback.js`.
- **Validation** — message required, message ≤ `MAX_MESSAGE` (2000) characters, and email
  must look like an email if one was given. All checked client-side before any request.
- **Spam** — a visually hidden `#fb-website` honeypot input: if a bot fills it in, the form
  shows success but sends nothing.
- **Celebration** — a genuinely saved message fires a short confetti burst
  (`js/confetti.js`) from the submit button. It is drawn on a throwaway `<canvas>` that
  removes itself once the last piece lands, and it is skipped entirely for visitors who set
  the OS "reduce motion" preference. It is only ever a bonus: if the file is missing, the
  success message still appears.
- **Failure** — a non-2xx response or a network error shows a "could not send" message
  (with the fallback address) and re-enables the button.
- `docs/supabase-feedback.sql` also adds a `created_at desc` index for reading the table.

### Publish on GitHub Pages

The site is plain static files, so Pages can serve the repo root directly:

1. Repo **Settings → Pages**.
2. Source: *Deploy from a branch*; branch `main`, folder `/ (root)`.
3. The URL appears as `https://<user>.github.io/<repo>/`.

The `.nojekyll` file in the root stops GitHub from running Jekyll over the files.
Full step-by-step notes (in Chinese) are in [`docs/V3.md`](docs/V3.md).

## Credits / Inspiration

- Scroll-driven 3D cube: inspired by **"Six Faces / Walking The Cow"** by x-k-k-k-k-k
  (CodePen: https://codepen.io/x-k-k-k-k-k/pen/KwWMXbJ). Reimplemented from the
  underlying technique (scroll progress + CSS 3D transforms); no original assets copied.
