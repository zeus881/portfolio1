# Sanjay Kumar — Interactive 3D Portfolio

A "mission control" portfolio for full stack and UAV/drone software roles.

The page has:
- a particle swarm in the background that changes formation for each section
- a wireframe drone in the hero
- architecture diagrams for the featured projects
- a command palette (Ctrl+K)

It is plain HTML, CSS and JavaScript: no framework, bundler or npm dependencies, and no build step.

## Run locally

```bash
node local-server.js          # http://localhost:5173
node tests/smoke.mjs          # content checks
```

Set the `PORT` environment variable to use a different port.

You can also open `index.html` straight from disk (`file://`), and everything works except the contact form. From a file it cannot reach FormSubmit, so it opens a pre-filled email instead.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell, SEO and social meta, JSON-LD, Tailwind config with the design tokens, script order |
| `styles.css` | Design system: tokens, glass cards, HUD brackets, sections, diagrams, modal, palette, motion |
| `data.js` | **All content**: owner, counters, skills, projects (with diagrams), experience, education, palette actions, UI text |
| `main.js` | Renders `data.js`; navigation, 3D toggle, motion, filters, project modal, deep links, contact form |
| `bg-3d.js` | Morphing particle field (Three.js r128 + GLSL) |
| `hero-3d.js` | Hero drone scene |
| `diagrams.js` | SVG architecture diagrams drawn from `data.js` |
| `palette.js` | Command palette |
| `local-server.js` | Development server (Node built-ins only) |
| `tests/smoke.mjs` | Content checks: counts, slugs, links, empty strings, diagrams, SEO sync, phone-number scan |
| `.github/workflows/pages.yml` | Runs the checks, then deploys to GitHub Pages on every push to `main` |
| `robots.txt`, `sitemap.xml` | Crawler files |
| `Sanjay_Kumar_Resume.pdf` | Resume behind the download buttons. **Add this file before deploying.** |

## Deploy

### GitHub Pages (automatic)

1. Push this folder to a GitHub repository, with `main` as the default branch.
2. In the repository, open **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
3. Every push to `main` runs `node --check` on each script and the smoke test, then publishes the site. A failing check stops the deploy.
   The address is shown in the workflow run and under **Settings → Pages**.

### Netlify

- **Drag and drop:** at https://app.netlify.com, open **Sites** and drop the folder onto the deploy area.
- **From Git:** choose **Add new site → Import an existing project**. Leave the build command empty and set the publish directory to `.`.

### Site URL

The public address appears in five places, and the smoke test fails if they differ:

- `index.html`: the canonical link, `og:url` and the JSON-LD `url`
- `sitemap.xml`
- `robots.txt`

It is currently set to `https://sanjaykumarpotfolio.netlify.app/`, the address printed on the resume. Change all five together if you deploy somewhere else.

### Contact form

The form posts to `https://formsubmit.co/ajax/sanjaykumarr99009@gmail.com`.

- **Activation:** the first real submission makes FormSubmit email an activation link to that address. Messages are not delivered until it is clicked; until then the page falls back to a mailto draft.
- **Fallback:** any failure (network error, a timeout after 10 s, or `success: "false"` from FormSubmit) opens a pre-filled email and tells the visitor.
- **Bots:** submissions that fill the hidden `_honey` field are ignored.

## Customise

### Add or change a project

Edit `projects` in `data.js`, then run `node tests/smoke.mjs`.

```js
{
  slug: 'my-project',               // unique, kebab-case; deep link #project-my-project
  title: 'My Project',
  category: 'Web',                  // one of projectFilters (Drones, Backend, AI, Web)
  featured: false,                  // true = spans two columns, needs a diagram
  description: 'One or two sentences.',
  features: ['Shown as a list in the modal'],  // [] for none
  tags: ['JavaScript', 'Three.js'],
  link: 'https://github.com/zeus881/my-project', // or null to hide the GitHub button
  diagram: {                        // featured projects only
    cols: 3, rows: 1,
    nodes: [
      { id: 'ui', label: 'Browser', kind: 'client', col: 0, row: 0 },
      { id: 'api', label: 'API', sub: 'FastAPI', kind: 'service', col: 1, row: 0 },
      { id: 'db', label: 'Database', kind: 'store', col: 2, row: 0 },
    ],
    groups: [],                     // { id, label, members: [node ids] } draws a frame
    edges: [{ from: 'ui', to: 'api', both: true }, { from: 'api', to: 'db' }],
  },
},
```

Notes on diagrams:
- `kind` sets the box style: `client`, `service`, `bus`, `store` or `external`.
- Long labels wrap onto two lines automatically.
- An edge can start or end at a group id.

To add a filter category, add it to `projectFilters`. The filter buttons and their counts update automatically.

Other content lives in the matching keys of `data.js`:
- `skills` (each item takes an optional Devicon class)
- `experience` (`current: true` shows the NOW marker)
- `education`, `counters`, `whatIDo`
- `ui` for every label and message

### Colours

The tokens are defined in two places; keep them in sync:

1. `styles.css` → `:root` (`--bg`, `--text`, `--muted`, `--cyan`, `--purple`, `--teal`, `--success`, `--danger`, …)
2. `index.html` → `tailwind.config.theme.extend.colors`

The particle palette is `CONFIG.colors` in `bg-3d.js`, and the drone colours are `CONFIG.colors` in `hero-3d.js`.

Each section's accent comes from its `data-accent` attribute in `index.html` (`cyan`, `purple` or `teal`).
Purple text uses `#A78BFA`, because `#8B5CF6` is below 4.5:1 contrast on the glass cards.

### Formations (`bg-3d.js`)

- `CONFIG.sectionFormation` maps section ids to formations: `nebula`, `sphere`, `grid`, `vflight`, `helix`, `ring`.
- `CONFIG.fx` sets each formation's spin, ripple, pulse and idle drift.
- Shapes are built in `buildFormations()`. Each formation is a function that returns `[x, y, z]` for particle `i`, so adding one means:
  1. add a `make('name', seed, center, fill)` call
  2. add an entry to `CONFIG.fx`
  3. map a section to it
- `CONFIG.morphSeconds` sets the transition time (1.4 s).

### Particle counts and performance

| Setting (`bg-3d.js` → `CONFIG`) | Default | Meaning |
|---|---|---|
| `counts.low` | 1200 | Touch devices or narrower than 768 px |
| `counts.medium` | 2500 | Standard desktop |
| `counts.high` | 4000 | High-end GPU (RTX, Radeon RX/Pro, Apple M-series, recent GTX, Intel Arc) |
| `adaptive.minFps` / `adaptive.seconds` | 30 / 3 | Below 30 FPS for 3 s: particles halve once and mouse repulsion turns off |
| `pointSize`, `mouse.radius`, `mouse.strength` | 6.5, 6, 2.6 | Look and cursor push |
| `maxPixelRatio` | 2 | Pixel ratio cap |

The chosen tier shows in DevTools as `<html data-bg3d="tier:count">`, and the current formation as `data-bg-formation`.

## Behaviour

- **3D toggle:** the "3D on/off" button in the nav (or "Toggle 3D" in the palette) stops both scenes and shows the gradient background. The choice is saved in `localStorage`.
- **Reduced motion:** with `prefers-reduced-motion`, each scene draws one static frame. There is no morphing, typing, reveals, counter animation, cursor or card tilt.
- **Performance:**
  - The hero scene starts only when the hero is first visible and stops when it scrolls away.
  - Both scenes pause in hidden tabs.
  - Space for the hero canvas is reserved, so nothing shifts when it loads.
- **Keyboard:**
  - Ctrl+K / Cmd+K or `/` opens the palette.
  - The project modal and the palette keep focus inside while open and return it when they close.
- **Deep links:** `#project-<slug>` opens that project's modal; closing it restores the previous address.

## Known limitations

- **Tailwind warning:** the Tailwind Play CDN logs one console warning, "should not be used in production". It is the cost of having no build step. To remove it, generate a stylesheet with the Tailwind standalone CLI and replace the CDN script with a `<link>`.
- **JavaScript required:** the content is rendered from `data.js`, so it does not appear without JavaScript. The crawler-facing title, description, Open Graph tags and JSON-LD are static in `index.html`.
