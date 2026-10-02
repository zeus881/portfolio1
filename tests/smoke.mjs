/*
 * tests/smoke.mjs
 * Content smoke test. Node built-ins only: `node tests/smoke.mjs`
 *
 * Loads data.js in a sandbox and checks counts, slugs, links, empty strings and diagrams,
 * then scans every text file in the project for phone-number patterns.
 * Exits with code 1 if any check fails.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];

/* ===== Helpers ===== */
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
}

function loadData() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(ROOT, 'data.js'), 'utf8'), sandbox, { filename: 'data.js' });
  return sandbox.window.PORTFOLIO_DATA;
}

/** Visit every string in a nested object, with its path. */
function walkStrings(value, path, visit) {
  if (typeof value === 'string') visit(value, path);
  else if (Array.isArray(value)) value.forEach((v, i) => walkStrings(v, `${path}[${i}]`, visit));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walkStrings(v, `${path}.${k}`, visit);
  }
}

/** All project files that are text (skips .git, node_modules and binary assets). */
function textFiles(dir) {
  const SKIP_DIRS = new Set(['.git', 'node_modules']);
  const BINARY = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.zip']);
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) out.push(...textFiles(full));
    } else if (!BINARY.has(extname(name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

/* ===== Checks on data.js ===== */
const data = loadData();
check('data.js defines window.PORTFOLIO_DATA', !!data);

if (data) {
  const projects = data.projects || [];
  const featured = projects.filter((p) => p.featured);
  const eduItems = data.education.degrees.length + data.education.certifications.length;

  check('9 projects', projects.length === 9, `found ${projects.length}`);
  check('3 featured projects', featured.length === 3, `found ${featured.length}`);
  check('3 roles', data.experience.length === 3, `found ${data.experience.length}`);
  check('10 skill groups', data.skills.length === 10, `found ${data.skills.length}`);
  check('4 education items', eduItems === 4, `found ${eduItems}`);
  check('4 counters', data.counters.length === 4, `found ${data.counters.length}`);
  check('3 "what I do" cards', data.whatIDo.length === 3, `found ${data.whatIDo.length}`);

  // Slugs
  const slugs = projects.map((p) => p.slug);
  const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  check('unique project slugs', dupes.length === 0, dupes.join(', '));
  const badSlugs = slugs.filter((s) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s || ''));
  check('slugs are lowercase kebab-case', badSlugs.length === 0, badSlugs.join(', '));

  // Categories
  const filters = new Set(data.projectFilters);
  const badCats = projects.filter((p) => !filters.has(p.category) || p.category === 'All').map((p) => p.slug);
  check('every project category is a filter', badCats.length === 0, badCats.join(', '));

  // Links: every URL-like value must be https
  const links = [data.owner.github, data.owner.linkedin, ...projects.map((p) => p.link).filter((l) => l !== null)];
  const badLinks = links.filter((l) => typeof l !== 'string' || !l.startsWith('https://'));
  check(`every link starts with https:// (${links.length} links)`, badLinks.length === 0, badLinks.join(', '));
  const insecure = [];
  walkStrings(data, 'data', (s, path) => {
    if (/^http:\/\//i.test(s)) insecure.push(path);
  });
  check('no http:// strings anywhere in data', insecure.length === 0, insecure.join(', '));
  check('owner email looks valid', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.owner.email));

  // No empty strings
  const empty = [];
  walkStrings(data, 'data', (s, path) => {
    if (!s.trim()) empty.push(path);
  });
  check('no empty strings', empty.length === 0, empty.slice(0, 5).join(', '));

  // Featured projects carry a valid diagram
  for (const p of featured) {
    const d = p.diagram;
    if (!d) {
      check(`diagram for ${p.slug}`, false, 'missing');
      continue;
    }
    const ids = new Set([...d.nodes.map((n) => n.id), ...d.groups.map((g) => g.id)]);
    const badEdges = d.edges.filter((e) => !ids.has(e.from) || !ids.has(e.to)).map((e) => `${e.from}->${e.to}`);
    const badMembers = d.groups.flatMap((g) => g.members.filter((m) => !d.nodes.some((n) => n.id === m)));
    const offGrid = d.nodes.filter((n) => n.col < 0 || n.col >= d.cols || n.row < 0 || n.row >= d.rows).map((n) => n.id);
    check(
      `diagram for ${p.slug} is consistent (${d.nodes.length} nodes, ${d.edges.length} edges)`,
      !badEdges.length && !badMembers.length && !offGrid.length,
      [...badEdges, ...badMembers, ...offGrid].join(', ')
    );
  }

  // One current role, newest first
  check('exactly one current role', data.experience.filter((x) => x.current).length === 1);
}

/* ===== Crawler-facing copies stay in sync with data.js ===== */
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
let ld = null;
try {
  ld = ldMatch ? JSON.parse(ldMatch[1]) : null;
} catch {
  ld = null;
}
check('index.html has valid JSON-LD', !!ld);
if (ld && data) {
  const same =
    ld['@type'] === 'Person' &&
    ld.name === data.owner.name &&
    ld.jobTitle === data.owner.roles[0] &&
    ld.email === `mailto:${data.owner.email}` &&
    ld.sameAs.includes(data.owner.github) &&
    ld.sameAs.includes(data.owner.linkedin);
  check('JSON-LD matches data.js (name, jobTitle, email, sameAs)', same);
  const city = data.owner.location.split(',')[0].trim();
  check('JSON-LD city matches owner.location', ld.address && ld.address.addressLocality === city, `${ld.address && ld.address.addressLocality} vs ${city}`);
}
const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
const ogUrl = (html.match(/<meta property="og:url" content="([^"]+)"/) || [])[1];
const robots = existsSync(join(ROOT, 'robots.txt')) ? readFileSync(join(ROOT, 'robots.txt'), 'utf8') : '';
const sitemap = existsSync(join(ROOT, 'sitemap.xml')) ? readFileSync(join(ROOT, 'sitemap.xml'), 'utf8') : '';
const siteUrls = [canonical, ogUrl, ld && ld.url, (sitemap.match(/<loc>([^<]+)<\/loc>/) || [])[1], (robots.match(/Sitemap:\s*(\S+)\/sitemap\.xml/) || [])[1] + '/'];
check(
  'site URL identical in canonical, og:url, JSON-LD, sitemap.xml and robots.txt',
  !!canonical && canonical.startsWith('https://') && siteUrls.every((u) => u === canonical),
  siteUrls.join(' | ')
);

/* ===== Phone-number scan across project files ===== */
const PHONE_PATTERNS = [
  /\+\s?\d{1,3}[\s-]?\(?\d{2,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}/, // international format with country code
  /(?<![\w.#-])[6-9]\d{9}(?![\w.])/, // Indian 10-digit mobile
  /(?<![\w.#-])\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?![\w.])/, // 3-3-4 digit groups
];
const hits = [];
for (const file of textFiles(ROOT)) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    // Skip integrity hashes, where long digit runs are expected
    const text = line.replace(/sha(256|384|512)-[A-Za-z0-9+/=]+/g, '');
    if (PHONE_PATTERNS.some((re) => re.test(text))) hits.push(`${relative(ROOT, file)}:${i + 1}`);
  });
}
check('no phone number pattern in project files', hits.length === 0, hits.join(', '));

/* ===== Report ===== */
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail && !r.ok ? `  →  ${r.detail}` : ''}`);
}
if (data && !existsSync(join(ROOT, data.owner.resume))) {
  console.log(`WARN  resume file not found: ${data.owner.resume}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
