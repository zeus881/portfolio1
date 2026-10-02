/*
 * scripts/make-images.mjs
 * Renders the app icons and the 1200×630 share image from small HTML templates with a local
 * Chrome/Chromium (DevTools protocol over Node's built-in WebSocket; Node 22+). Run it only when
 * the name, roles or colours change: `node scripts/make-images.mjs`
 *
 * Outputs: icons/icon-192.png, icons/icon-512.png, icons/icon-maskable-512.png,
 *          icons/apple-touch-icon.png (180), og-image.jpg (1200×630, JPEG, under 100 KB)
 * Set CHROME=/path/to/chrome if Chrome is not in a standard location.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = createRequire(import.meta.url)(join(ROOT, 'data.js'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ===== Chrome ===== */
function findChrome() {
  const candidates = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('Chrome not found; set CHROME=/path/to/chrome');
  return found;
}

async function openChrome() {
  const port = 9400 + Math.floor(Math.random() * 400);
  const profile = mkdtempSync(join(tmpdir(), 'sk-images-'));
  const proc = spawn(findChrome(), ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--allow-file-access-from-files', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let page;
  for (let i = 0; i < 50 && !page; i++) {
    try {
      page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
    } catch {
      await sleep(200);
    }
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg.result);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  return {
    send,
    close() {
      ws.close();
      proc.kill();
      setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500);
    },
  };
}

/* ===== Templates (use the self-hosted fonts) ===== */
const fontUrl = (file) => pathToFileURL(join(ROOT, 'fonts', file)).href;
const BASE_CSS = `
  @font-face { font-family: 'Orbitron'; font-weight: 600 700; src: url('${fontUrl('orbitron-latin.woff2')}') format('woff2'); }
  @font-face { font-family: 'Inter'; font-weight: 400 600; src: url('${fontUrl('inter-latin.woff2')}') format('woff2'); }
  @font-face { font-family: 'JetBrains Mono'; font-weight: 500; src: url('${fontUrl('jetbrains-mono-latin.woff2')}') format('woff2'); }
  html, body { margin: 0; background: #050816; overflow: hidden; }
`;

/** Square "SK" mark with HUD corner brackets. `safe` shrinks the artwork for maskable icons. */
function iconHtml(size, safe = 1) {
  const s = size * safe;
  const off = (size - s) / 2;
  const arm = s * 0.2;
  const line = Math.max(2, s * 0.035);
  const inset = s * 0.12;
  return `<!doctype html><html><head><style>${BASE_CSS}
    .mark { position: absolute; left: ${off}px; top: ${off}px; width: ${s}px; height: ${s}px; }
    .c { position: absolute; width: ${arm}px; height: ${arm}px; border: 0 solid #00d4ff; }
    .tl { left: ${inset}px; top: ${inset}px; border-width: ${line}px 0 0 ${line}px; }
    .tr { right: ${inset}px; top: ${inset}px; border-width: ${line}px ${line}px 0 0; }
    .bl { left: ${inset}px; bottom: ${inset}px; border-width: 0 0 ${line}px ${line}px; }
    .br { right: ${inset}px; bottom: ${inset}px; border-width: 0 ${line}px ${line}px 0; }
    .t { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center;
         font-family: 'Orbitron'; font-weight: 700; font-size: ${s * 0.36}px; letter-spacing: ${s * 0.02}px; color: #e6edf7; }
    .glow { position: absolute; left: 0; top: 0; width: ${size}px; height: ${size}px;
            background: radial-gradient(circle at 50% 60%, rgba(0,212,255,0.22), transparent 60%); }
  </style></head><body style="width:${size}px;height:${size}px">
    <div class="glow"></div>
    <div class="mark"><span class="c tl"></span><span class="c tr"></span><span class="c bl"></span><span class="c br"></span>
    <div class="t">${esc(DATA.owner.initials)}</div></div>
  </body></html>`;
}

/** 1200×630 share card in the mission-control style; text comes from data.js. */
function ogHtml() {
  const { owner, site } = DATA;
  const host = site.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  let dots = '';
  for (let i = 0; i < 140; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 12345.6789) % 1;
    const r = 1 + (i % 3);
    const c = ['#00d4ff', '#8b5cf6', '#06b6d4', '#e6edf7'][i % 4];
    dots += `<i style="left:${(Math.abs(x) * 1200).toFixed(0)}px;top:${(Math.abs(y) * 630).toFixed(0)}px;width:${r}px;height:${r}px;background:${c}"></i>`;
  }
  return `<!doctype html><html><head><style>${BASE_CSS}
    body { width: 1200px; height: 630px; position: relative; color: #e6edf7;
      background: radial-gradient(ellipse 60% 70% at 85% 30%, rgba(0,212,255,0.16), transparent 60%),
                  radial-gradient(ellipse 60% 60% at 10% 0%, rgba(139,92,246,0.2), transparent 60%), #050816; }
    i { position: absolute; border-radius: 50%; opacity: 0.55; }
    .frame { position: absolute; left: 48px; top: 48px; right: 48px; bottom: 48px; }
    .c { position: absolute; width: 40px; height: 40px; border: 0 solid #00d4ff; }
    .tl { left: 0; top: 0; border-width: 3px 0 0 3px; } .br { right: 0; bottom: 0; border-width: 0 3px 3px 0; }
    .copy { position: absolute; left: 96px; top: 118px; right: 96px; }
    .label { font-family: 'JetBrains Mono'; font-weight: 500; font-size: 22px; letter-spacing: 0.08em; color: #00d4ff; text-transform: uppercase; }
    h1 { margin: 22px 0 0; font-family: 'Orbitron'; font-weight: 700; font-size: 92px; line-height: 1.05; }
    .roles { margin-top: 26px; font-family: 'Inter'; font-weight: 500; font-size: 32px; line-height: 1.4; color: #e6edf7; max-width: 900px; }
    .meta { position: absolute; left: 96px; bottom: 96px; font-family: 'JetBrains Mono'; font-size: 22px; color: #8a96ad; letter-spacing: 0.04em; }
    .dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #34d399; margin-right: 12px; box-shadow: 0 0 12px #34d399; }
  </style></head><body>${dots}
    <div class="frame"><span class="c tl"></span><span class="c br"></span></div>
    <div class="copy">
      <div class="label">// ${esc(owner.roles[0])} &amp; ${esc(owner.roles[2])}</div>
      <h1>${esc(owner.name)}</h1>
      <div class="roles">${owner.roles.map(esc).join(' &nbsp;|&nbsp; ')}</div>
    </div>
    <div class="meta"><span class="dot"></span>${esc(owner.location)} &nbsp;/&nbsp; ${esc(host)}</div>
  </body></html>`;
}

/* ===== Render ===== */
async function shoot(browser, html, width, height, format, file) {
  const tmp = join(tmpdir(), `sk-image-${Date.now()}.html`);
  writeFileSync(tmp, html);
  await browser.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await browser.send('Page.navigate', { url: pathToFileURL(tmp).href });
  await sleep(1200); // fonts
  const params = format === 'jpeg' ? { format, quality: 82 } : { format };
  const shot = await browser.send('Page.captureScreenshot', { ...params, clip: { x: 0, y: 0, width, height, scale: 1 } });
  writeFileSync(join(ROOT, file), Buffer.from(shot.data, 'base64'));
  rmSync(tmp, { force: true });
  console.log(`wrote ${file} (${Buffer.from(shot.data, 'base64').length} bytes)`);
}

mkdirSync(join(ROOT, 'icons'), { recursive: true });
const browser = await openChrome();
await browser.send('Page.enable');
try {
  await shoot(browser, iconHtml(192), 192, 192, 'png', 'icons/icon-192.png');
  await shoot(browser, iconHtml(512), 512, 512, 'png', 'icons/icon-512.png');
  await shoot(browser, iconHtml(512, 0.72), 512, 512, 'png', 'icons/icon-maskable-512.png');
  await shoot(browser, iconHtml(180), 180, 180, 'png', 'icons/apple-touch-icon.png');
  await shoot(browser, ogHtml(), 1200, 630, 'jpeg', 'og-image.jpg');
} finally {
  browser.close();
}
