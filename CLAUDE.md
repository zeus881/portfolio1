# Sanjay Kumar — Interactive 3D Portfolio

Single-page developer portfolio. No framework, no bundler, no npm dependencies, no build step.

## Workflow
- Work one build phase at a time. After each phase: report what was built and how it was checked, commit, and wait for "continue".
- Run `node --check <file>.js` on every JavaScript file after editing it.
- Serve with `node local-server.js` → http://localhost:5173
- Verify in a real (headless) browser where possible; never claim to have seen the page without doing so.

## Stack
- HTML5, one page: `index.html`
- Tailwind CSS via CDN (`https://cdn.tailwindcss.com`), config inline in `index.html`
- Three.js r128 via CDN (`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`)
- GLSL shaders inline in `bg-3d.js`
- Plain JavaScript (ES2020)
- Google Fonts: Orbitron (headings), Inter (body); Devicon via CDN
- Contact form: FormSubmit AJAX (`https://formsubmit.co/ajax/sanjaykumarr99009@gmail.com`), mailto fallback
- Node.js only for `local-server.js` (built-in `http`, `fs`, `path`)

## Files
| File | Purpose |
|---|---|
| `index.html` | Page structure, head/SEO, Tailwind config |
| `styles.css` | Custom CSS: tokens, glass cards, cursor, animations |
| `data.js` | ALL text content (owner, skills, projects, experience, education) |
| `main.js` | UI behaviour; renders `data.js` into the page |
| `bg-3d.js` | Full-screen particle background |
| `hero-3d.js` | Hero wireframe quadcopter scene |
| `local-server.js` | Static server on port 5173 |
| `README.md` | Run, deploy, customise |

## Design
- Dark futuristic theme. Background `#050816`. Accents: electric cyan `#00D4FF`, neon purple `#8B5CF6`, cyan `#06B6D4`, soft white `#F8FAFC`.
- Glassmorphism cards: translucent panel, thin light border, backdrop blur, soft glow on hover.
- Generous spacing, large headings, one accent colour per section.
- Section order: Home, About, Skills, Projects, Experience, Education, Contact. Smooth scroll.
- Projects: filters (All, Drones, Backend, AI, Web); featured cards span 2 columns on desktop; 3D tilt toward cursor; click opens modal (long description, features, GitHub button if a link exists).
- Background: fixed full-screen WebGL `THREE.Points` + ShaderMaterial (noise + sine + slow orbit via time uniform, additive blending, round points), reacts to mouse/touch. Particles: mobile or no WebGL 1,200; desktop 2,500; high-end GPU 4,000. Pixel ratio ≤ 2. Wait for THREE (100 ms × 40 retries), else CSS gradient fallback. Pause when tab hidden, handle resize, dispose on teardown, single static frame under `prefers-reduced-motion`.
- Hero: wireframe quadcopter (body, 4 arms, 4 spinning rotors), slow rotation, tilts with mouse.
- Interactions: custom cursor (dot + ring, desktop pointers only), scroll progress bar, sticky nav with active highlight, mobile hamburger, Download Resume button, IntersectionObserver reveals, counters count once, back-to-top after 400 px, modal closes on Esc / close button / outside click with focus trap.
- Contact form: required fields + email format, inline errors, spinner, success message, mailto fallback on failure.

## Rules
- All text content lives in `data.js`; `main.js` renders it. Never hard-code content in two places. Do not invent content.
- Never show a phone number.
- No API keys or secrets anywhere.
- No console errors or warnings. Known, accepted exception: the Tailwind Play CDN's own "should not be used in production" warning (no-build setup).
- Semantic HTML, alt text, visible focus states, keyboard access to nav, filters, cards and modal; body text contrast ≥ 4.5:1.
- Responsive 360 px to 4K; no horizontal scroll at any width.
- SEO: title "Sanjay Kumar | Backend Engineer & UAV Systems", meta description, Open Graph tags, inline SVG favicon.
- Comment the main blocks of every file.
- If something is unclear or contradictory, ask before guessing.
