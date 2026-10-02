# Sanjay Kumar — Interactive 3D Portfolio

A "mission control" portfolio for full stack and UAV/drone software roles, built to open on any phone.

- **Content first:** all text is in the HTML the server sends, written from `data.js` by a build script.
- **3D second:** a swarm-like particle field and a wireframe drone load after first paint, only on devices that can afford them.
- **No third parties:** no framework, CSS framework or CDN. Three.js and the fonts are served from this folder.
  The only network request the page makes is the contact form POST.
- **Offline:** installable, and works offline after the first visit.

## Run locally

Requires Node.js 18 or later; `scripts/make-images.mjs` needs Node 22 or later.

```bash
node scripts/build.mjs   # write markup, manifest, robots.txt, sitemap.xml and 404.html from data.js
node tests/smoke.mjs     # content, policy, syntax, offline and weight-budget checks
node local-server.js     # http://localhost:5173 (gzip like the real hosts; PORT=8080 to change the port)
```

You can also open `index.html` straight from disk (`file://`). Everything shows, but there's no service worker, and the contact form falls back to opening the visitor's email app.

**Development tip:** the service worker also runs on `localhost`. If a change doesn't appear, hard-reload, or tick DevTools → Application → Service workers → *Update on reload*.

## Files

| File | Purpose |
|---|---|
| `data.js` | **All content** and site settings: URL, title, owner, skills, projects with diagrams, experience, labels |
| `index.html` | Page shell. The build fills the `build:head` and `build:body` markers; edit `data.js` instead of that markup |
| `styles.css` | Hand-written design system, safe on iOS Safari 13+ |
| `main.js` | Enhances the static markup: nav, motion, 3D gating and loading, filters, modal, deep links, form |
| `palette.js` | Search and commands (Ctrl/Cmd+K, `/`, or the search button) |
| `diagrams.js` | SVG architecture diagrams. Runs in Node (card previews at build time) and in the browser (modal) |
| `bg-3d.js`, `hero-3d.js` | Particle field and hero drone (Three.js r128 + GLSL) |
| `vendor/three.min.js` | Three.js r128, served locally |
| `fonts/` | Inter, Orbitron and JetBrains Mono, Latin woff2 |
| `icons/`, `og-image.jpg` | App icons and the 1200×630 share image (from `scripts/make-images.mjs`) |
| `manifest.webmanifest`, `sw.js`, `404.html` | Install metadata, offline cache, not-found page |
| `qr.svg` | QR code of the public URL (from `scripts/qr.mjs`) |
| `scripts/` | `build.mjs`, `icons.mjs` (inline SVG icons), `make-images.mjs`, `qr.mjs` |
| `tests/smoke.mjs` | The checks listed above |
| `local-server.js` | Development server |
| `Sanjay_Kumar_Resume.pdf` | Resume behind the download buttons. **Add this file before publishing.** |

## Publish on GitHub Pages

The site address will be `https://zeus881.github.io/portfolio/` (this URL is set in `data.js` → `site.url`).

1. **Create the repository** at https://github.com/new:
   - Owner `zeus881`, name `portfolio`, **Public**
   - Leave "Add a README", ".gitignore" and "license" **unticked**
   - Click **Create repository**
2. **Push** from this folder:
   ```bash
   git remote add origin https://github.com/zeus881/portfolio.git
   git branch -M main
   git push -u origin main
   ```
   If you have the GitHub CLI and are logged in, `gh repo create zeus881/portfolio --public --source . --remote origin --push` does steps 1 and 2 in one command.
3. **Turn on Pages:** in the repository open **Settings → Pages** (left sidebar, under "Code and automation"). Under **Build and deployment → Source** choose **GitHub Actions**. No branch needs choosing.
4. **Watch the deploy:** open the **Actions** tab. The "Deploy to GitHub Pages" workflow runs on every push to `main`: it builds, runs the checks, then publishes. When it turns green, the URL appears in the run summary and under **Settings → Pages**. The first deploy takes 1–2 minutes.

If the workflow failed before Pages was enabled, open the run and click **Re-run all jobs** after step 3.

## Publish on Netlify instead (or as well)

- **Drag and drop:** run `node scripts/build.mjs`, then drop the folder onto https://app.netlify.com/drop.
- **From Git:** **Add new site → Import an existing project**, pick the repository, set **Build command** to `node scripts/build.mjs` and **Publish directory** to `.`.

**If Netlify becomes the main address,** set `site.url` in `data.js` to the Netlify URL, then run `node scripts/build.mjs` and `node scripts/qr.mjs`.

## Connect a custom domain

1. At your DNS provider, add records for your domain:
   - **Apex domain** (`example.com`): four `A` records to 185.199.108.153, 185.199.109.153, 185.199.110.153 and 185.199.111.153.
   - **Subdomain** (`www.example.com`): a `CNAME` to `zeus881.github.io`.
2. On GitHub, open **Settings → Pages → Custom domain**, enter the domain, **Save**, and once the certificate is ready tick **Enforce HTTPS**.
3. Set `site.url` in `data.js` to `https://your-domain/`, then run:
   ```bash
   node scripts/build.mjs && node scripts/qr.mjs && node scripts/make-images.mjs
   ```
   This updates the canonical URL, sitemap, robots.txt, share tags, 404 link, QR code and share image.

## Release a new version

1. Edit the content in `data.js`, or the code.
2. Run `node scripts/build.mjs` and `node tests/smoke.mjs`.
3. **Bump `CACHE_VERSION` in `sw.js`** (for example `v3.0.0` → `v3.0.1`), so returning visitors drop the old cached files.
4. Commit and push to `main`; the workflow deploys it.

## Customise

### Project data

- Edit `projects` in `data.js`.
- `slug` must be unique and kebab-case; it is also the deep link `#project-<slug>`.
- `category` must be one of `projectFilters`. The filter counts update automatically.
- `featured: true` spans two columns on desktop and needs a `diagram`.
- `features: []` and `link: null` are allowed.

### Add a project

```js
{
  slug: 'my-project',
  title: 'My Project',
  category: 'Web',
  featured: false,
  description: 'One or two sentences.',
  features: ['Shown in the project details'],
  tags: ['JavaScript', 'Three.js'],
  link: 'https://github.com/zeus881/my-project', // or null
},
```

Then run `node scripts/build.mjs && node tests/smoke.mjs`, and bump `CACHE_VERSION`.

For a **featured** project, add a `diagram`: nodes on a `col`/`row` grid, `edges` with `both: true` for two-way arrows, and optional `groups` that draw a frame. Copy one of the three existing diagrams as a starting point. `kind` is one of `client | service | bus | store | external`.

### Colours

- **Page:** edit the tokens at the top of `styles.css` (`--bg`, `--text`, `--muted`, `--cyan`, `--purple`, `--teal`, `--success`, `--danger`). For the colours used inside `rgba()`, also update the matching `--*-rgb` channel variables.
- **3D scenes:** `CONFIG.colors` in `bg-3d.js` and `hero-3d.js`.
- **Accent per section:** the `data-accent` values written by `scripts/build.mjs` (`cyan`, `purple`, `teal`).
- **Images:** regenerate the icons and share image with `node scripts/make-images.mjs`.

### Formations (`bg-3d.js`)

- **Which formation each section shows:** `CONFIG.sectionFormation` (`nebula`, `sphere`, `grid`, `vflight`, `helix`, `ring`).
- **Motion per formation:** `CONFIG.fx` (`spin`, `ripple`, `pulse`, `drift`).
- **Shapes:** `buildFormations()`. Each `make(name, seed, center, fill)` returns `[x, y, z]` for particle `i`. To add a formation, add a `make(...)` call, an entry in `CONFIG.fx`, and map a section to it.
- **Transition time:** `CONFIG.morphSeconds` (1.4 s).

### Particle counts and when 3D runs

| `bg-3d.js` → `CONFIG` | Default | Used for |
|---|---|---|
| `counts.ultra` | 600 | Small or weak phones: short screen side under 375 px, 4 or fewer cores, or under 4 GB memory |
| `counts.low` | 1200 | Other phones and narrow screens |
| `counts.medium` | 2500 | Standard desktops |
| `counts.high` | 4000 | High-end GPUs (RTX, Radeon RX/Pro, Apple M-series, recent GTX, Intel Arc) |
| `maxPixelRatio` / `maxPixelRatioPhone` | 2 / 1.5 | Pixel ratio caps |
| `adaptive.minFps`, `adaptive.seconds` | 30, 3 | Under 30 FPS for 3 s: particles halve once and pointer repulsion stops |

**When 3D runs** (decided in `main.js` → `deviceAllows3D()`):
- WebGL must exist.
- Data saver must be off.
- `navigator.deviceMemory` must be at least 3, and the connection must not be 2G or slow-2G. Browsers without these APIs are allowed.
- The visitor's 3D on/off choice is saved in `localStorage` and wins on later visits.

**Debugging in DevTools:** `<html data-bg3d="tier:count">` shows the chosen tier, and `data-bg-formation` shows the current formation.

## Checks and budgets

`node tests/smoke.mjs` fails the deploy if any of these break:
- **Content counts:** 9 projects (3 featured), 3 roles, 10 skill groups, 4 education items.
- **Data rules:** unique slugs, `https://` links only, no empty strings, consistent diagrams.
- **Privacy and requests:** no phone numbers anywhere; no third-party URLs in page files.
- **Build freshness:** generated files must match `data.js`.
- **Syntax:** ES2017 in browser scripts.
- **Offline:** the service-worker app shell exists.
- **Weight budget:** core files under 180 KB, fonts under 150 KB, everything the page can load under 900 KB, images under 100 KB.
