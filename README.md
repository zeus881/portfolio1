# Sanjay Kumar — Interactive 3D Portfolio

A single-page developer portfolio with a GPU particle background and a wireframe drone in the hero.
Plain HTML, CSS and JavaScript: no framework, no bundler, no npm dependencies, no build step.

## Run locally

Requires Node.js (any current version) for the small static server.

```bash
node local-server.js
```

Open http://localhost:5173. Set the `PORT` environment variable to use a different port.

Opening `index.html` straight from disk also works. Use the server anyway when testing the contact form and the resume download.

## Files

| File | What it does |
|---|---|
| `index.html` | Page structure, meta and Open Graph tags, Tailwind config, script order |
| `styles.css` | Colour tokens, glass cards, layout, animations, cursor, modal |
| `data.js` | **All text content**: owner, counters, skills, projects, experience, education, UI labels |
| `main.js` | Renders `data.js` into the page; navigation, reveals, counters, cursor, filters, modal, contact form |
| `bg-3d.js` | Full-screen particle background (Three.js r128 + GLSL) |
| `hero-3d.js` | Wireframe quadcopter in the hero |
| `local-server.js` | Development server (Node built-ins only) |
| `Sanjay_Kumar_Resume.pdf` | Resume behind the "Download Resume" buttons (add it to the root folder) |

## Deploy

The site is static, so any static host works. Make sure `Sanjay_Kumar_Resume.pdf` is in the root folder before deploying.

### GitHub Pages

1. Create a repository, for example `portfolio`, and push this folder:
   ```bash
   git remote add origin https://github.com/zeus881/portfolio.git
   git push -u origin main
   ```
2. On GitHub, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
3. After about a minute the site is live at `https://zeus881.github.io/portfolio/`.
   All paths are relative, so it works from a sub-path.

### Netlify

**Drag and drop:** sign in at https://app.netlify.com, open **Sites**, and drop this folder onto the deploy area.

**From Git:** **Add new site → Import an existing project**, pick the repository, leave **Build command** empty and set **Publish directory** to `.`, then **Deploy**.

## Contact form

The form posts JSON to `https://formsubmit.co/ajax/<owner.email>` (the address comes from `data.js`).

- **First submission:** FormSubmit emails the owner an activation link. Messages are not delivered until that link is clicked, and until then the page falls back to opening the visitor's email app.
- **Any failure** (network error, timeout after 10 s, or FormSubmit answering `success: "false"`) opens a `mailto:` draft with the message filled in, and shows a link to open it again.
- A hidden `_honey` field catches simple bots.

## Customise

### Content

Edit `data.js` only; `main.js` renders everything from it.

- **Projects:** add an object to `projects`.
  - `category` must be one of `projectFilters` (`Drones`, `Backend`, `AI`, `Web`). To add a category, add it to `projectFilters` too.
  - `featured: true` makes the card span two columns on desktop (in the "All" view).
  - `features` is the bullet list in the modal; leave it as `[]` for none.
  - `link: null` hides the GitHub button.
- **Skills:** each item takes an optional `icon`, which is a [Devicon](https://devicon.dev) class such as `devicon-docker-plain`. Leave it out when Devicon has no icon for that skill.
- **Counters:** `value` counts up; `prefix` and `suffix` stay fixed (for example `<` and ` ms`).
- **Section titles, nav labels, button and form text:** `ui`.

The page `<title>`, meta description and Open Graph tags are in `index.html`, because crawlers read them before any script runs.

### Colours

Colours are defined in three places, so keep them in sync:

1. `styles.css` → `:root` tokens (`--bg`, `--electric`, `--neon`, `--aqua`, `--soft`, `--muted`)
2. `index.html` → `tailwind.config.theme.extend.colors`
3. `bg-3d.js` → `CONFIG.colors` (particle palette and weights) and `hero-3d.js` → `CONFIG.colors`

Each section's accent comes from its `data-accent` attribute in `index.html` (`electric`, `neon` or `aqua`).
Neon purple `#8B5CF6` is below 4.5:1 contrast for small text on the glass cards, so purple text uses `#A78BFA` instead.

### Particle background (`bg-3d.js` → `CONFIG`)

| Setting | Default | Meaning |
|---|---|---|
| `counts.low` | 1200 | Mobile / touch / narrower than 768 px |
| `counts.medium` | 2500 | Standard desktop |
| `counts.high` | 4000 | High-end GPU (RTX, Radeon RX/Pro, Apple M-series, recent GTX, Intel Arc) |
| `pointSize` | 7 | Base particle size |
| `rotationSpeed` | 0.018 | Orbital rotation, radians per second |
| `mouse.strength` | 3.2 | Positive pushes particles away from the cursor, negative pulls them in |
| `mouse.radius` | 7 | Cursor influence radius (world units) |
| `maxPixelRatio` | 2 | Cap on device pixel ratio |

The chosen tier is written to `<html data-bg3d="quality:count">`, so you can check it in DevTools.
Without WebGL, or if Three.js fails to load within 4 s, the CSS gradient background stays and the page works normally.

### Hero drone (`hero-3d.js` → `CONFIG`)

`spinSpeed`, `rotorSpeed`, `maxTilt` and `armLength` control the slow rotation, rotor spin, mouse tilt and size.

## Behaviour notes

- **Reduced motion:** with `prefers-reduced-motion`, the background renders one static frame. The drone, typed line, reveals, counters, custom cursor and card tilt are all turned off, and final values are shown.
- **Off-screen work:** the background pauses while the tab is hidden. The drone and the typed line also pause while the hero is off-screen.
- **Custom cursor and card tilt:** only on devices with a fine pointer and hover (mouse or trackpad).

## Known limitations

- **Tailwind warning:** the Tailwind Play CDN prints one console warning, "cdn.tailwindcss.com should not be used in production". That is the price of the no-build setup. To remove it, generate a static stylesheet with the [Tailwind standalone CLI](https://tailwindcss.com/blog/standalone-cli) and replace the CDN script with a `<link>`.
- **JavaScript required:** the content is rendered by JavaScript from `data.js`, so it does not appear without JavaScript.
