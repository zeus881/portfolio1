/*
 * tests/smoke.mjs
 * Content and policy smoke test. Node built-ins only: `node tests/smoke.mjs`
 *
 *  1. data.js     counts, slugs, categories, https links, no empty strings, diagrams, one current role
 *  2. Policy      no phone numbers in project files; no third-party resource URLs in index.html,
 *                 styles.css or any site .js file (only the listed profile/project links,
 *                 the FormSubmit endpoint, the site's own URL and XML/schema namespaces)
 *  3. Build       index.html, manifest, robots.txt, sitemap.xml and 404.html match `node scripts/build.mjs`
 *  4. Syntax      browser scripts stay within ES2017
 * Exits with code 1 if any check fails.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const results = [];

/* ===== Helpers ===== */
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
}

function walkStrings(value, path, visit) {
  if (typeof value === 'string') visit(value, path);
  else if (Array.isArray(value)) value.forEach((v, i) => walkStrings(v, `${path}[${i}]`, visit));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walkStrings(v, `${path}.${k}`, visit);
  }
}

/** Project files, skipping .git, node_modules, vendor (third-party) and binary assets. */
function projectFiles(dir, { text = true } = {}) {
  const SKIP_DIRS = new Set(['.git', 'node_modules', 'vendor']);
  const BINARY = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.zip']);
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) out.push(...projectFiles(full, { text }));
    } else if (!text || !BINARY.has(extname(name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

const read = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf8') : '');

/* ===== 1. data.js ===== */
const data = require(join(ROOT, 'data.js'));
check('data.js exports the content in Node', !!(data && data.owner));

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

const slugs = projects.map((p) => p.slug);
const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
check('unique project slugs', dupes.length === 0, dupes.join(', '));
const badSlugs = slugs.filter((s) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s || ''));
check('slugs are lowercase kebab-case', badSlugs.length === 0, badSlugs.join(', '));
const filters = new Set(data.projectFilters);
const badCats = projects.filter((p) => !filters.has(p.category) || p.category === 'All').map((p) => p.slug);
check('every project category is a filter', badCats.length === 0, badCats.join(', '));

const links = [data.owner.github, data.owner.linkedin, data.site.url, data.site.formEndpoint, ...projects.map((p) => p.link).filter((l) => l !== null)];
const badLinks = links.filter((l) => typeof l !== 'string' || !l.startsWith('https://'));
check(`every link starts with https:// (${links.length} links)`, badLinks.length === 0, badLinks.join(', '));
const insecure = [];
walkStrings(data, 'data', (s, path) => /http:\/\//i.test(s) && insecure.push(path));
check('no http:// strings in data', insecure.length === 0, insecure.join(', '));
check('owner email looks valid', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.owner.email));
check('site URL ends with a slash', data.site.url.endsWith('/'));

const empty = [];
walkStrings(data, 'data', (s, path) => !s.trim() && empty.push(path));
check('no empty strings', empty.length === 0, empty.slice(0, 5).join(', '));

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
check('exactly one current role', data.experience.filter((x) => x.current).length === 1);

/* ===== 2. Policy ===== */
const PHONE_PATTERNS = [
  /\+\s?\d{1,3}[\s-]?\(?\d{2,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}/, // international format with country code
  /(?<![\w.#-])[6-9]\d{9}(?![\w.])/, // Indian 10-digit mobile
  /(?<![\w.#-])\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?![\w.])/, // 3-3-4 digit groups
];
const phoneHits = [];
for (const file of projectFiles(ROOT)) {
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((line, i) => {
      const text = line.replace(/sha(256|384|512)-[A-Za-z0-9+/=]+/g, '');
      if (PHONE_PATTERNS.some((re) => re.test(text))) phoneHits.push(`${relative(ROOT, file)}:${i + 1}`);
    });
}
check('no phone number pattern in project files', phoneHits.length === 0, phoneHits.join(', '));

const ALLOWED_URLS = [
  ...links,
  'http://www.w3.org/2000/svg', // SVG namespace, not a request
  'https://schema.org', // JSON-LD vocabulary, not a request
];
// Scripts the page loads (local-server.js is a development tool and is not part of the site)
const siteJs = readdirSync(ROOT).filter((f) => f.endsWith('.js') && f !== 'local-server.js');
const urlHits = [];
for (const rel of ['index.html', 'styles.css', ...siteJs]) {
  const text = read(rel);
  for (const m of text.matchAll(/https?:\/\/[^\s'"`)<>\\]+/g)) {
    if (!ALLOWED_URLS.some((ok) => m[0].startsWith(ok))) urlHits.push(`${rel}: ${m[0]}`);
  }
}
check('no third-party URLs in index.html, styles.css or site .js files', urlHits.length === 0, urlHits.slice(0, 6).join(' | '));

/* ===== 3. Build output is up to date ===== */
const buildPath = join(ROOT, 'scripts', 'build.mjs');
if (existsSync(buildPath)) {
  const build = await import(pathToFileURL(buildPath).href);
  const outputs = build.renderAll(read('index.html'));
  for (const [rel, expected] of Object.entries(outputs)) {
    check(`${rel} is up to date (run node scripts/build.mjs)`, read(rel) === expected);
  }
}

/* ===== 4. ES2017 syntax in browser scripts ===== */
const ES2017_FILES = ['data.js'];
const ES_RULES = [
  [/\?\.[A-Za-z_$[(]/, 'optional chaining ?.'],
  [/\?\?/, 'nullish coalescing ??'],
  [/catch\s*\{/, 'optional catch binding'],
  [/\{\s*\.\.\.[A-Za-z_$]/, 'object spread { ...x'],
  [/,\s*\.\.\.[A-Za-z_$][\w.]*\s*\}/, 'object spread , ...x }'],
];
for (const rel of ES2017_FILES) {
  const code = read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const found = ES_RULES.filter(([re]) => re.test(code)).map(([, name]) => name);
  check(`${rel} stays within ES2017`, found.length === 0, found.join(', '));
}

/* ===== Report ===== */
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail && !r.ok ? `  →  ${r.detail}` : ''}`);
}
if (!existsSync(join(ROOT, data.owner.resume))) console.log(`WARN  resume file not found: ${data.owner.resume}`);
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
