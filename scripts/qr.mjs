/*
 * scripts/qr.mjs
 * Writes qr.svg: a QR code of the public site URL from data.js. Node built-ins only.
 * `node scripts/qr.mjs` (optionally `node scripts/qr.mjs https://example.com/`)
 *
 * Byte mode, error correction level M, versions 1–10 (URLs up to 213 bytes).
 * Follows the structure of Project Nayuki's QR Code generator (MIT): function patterns,
 * Reed–Solomon ECC, block interleaving, zigzag placement, all eight masks scored by the
 * standard penalty rules. Before writing, the code is decoded again (format bits, unmasking,
 * de-interleaving, Reed–Solomon check, payload) to make sure it round-trips.
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = createRequire(import.meta.url)(join(ROOT, 'data.js'));

/* ===== Tables for error correction level M, versions 1–10 ===== */
const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const FORMAT_ECL_M = 0; // format bits for level M

const getBit = (x, i) => ((x >>> i) & 1) !== 0;

/** Total codeword bits available in a version (data + ECC), after function patterns. */
function rawDataModules(ver) {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}
const dataCodewords = (ver) => Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ver] * NUM_BLOCKS[ver];

function alignmentPositions(ver) {
  if (ver === 1) return [];
  const size = ver * 4 + 17;
  const numAlign = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

/* ===== Reed–Solomon over GF(2^8), polynomial 0x11D ===== */
function gfMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}
function rsDivisor(degree) {
  const result = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}
function rsRemainder(data, divisor) {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ result.shift();
    result.push(0);
    divisor.forEach((coef, i) => (result[i] ^= gfMultiply(coef, factor)));
  }
  return result;
}

/* ===== Encoding ===== */
function encodeData(bytes) {
  let ver = 1;
  for (; ver <= 10; ver++) {
    const countBits = ver <= 9 ? 8 : 16;
    if (4 + countBits + bytes.length * 8 <= dataCodewords(ver) * 8) break;
  }
  if (ver > 10) throw new Error('URL too long for this generator (versions 1–10)');
  const bits = [];
  const push = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  push(0x4, 4); // byte mode
  push(bytes.length, ver <= 9 ? 8 : 16);
  bytes.forEach((b) => push(b, 8));
  const capacity = dataCodewords(ver) * 8;
  push(0, Math.min(4, capacity - bits.length)); // terminator
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) codewords.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  return { ver, codewords };
}

/** Split into blocks, add ECC, interleave. */
function addEccAndInterleave(data, ver) {
  const numBlocks = NUM_BLOCKS[ver];
  const eccLen = ECC_PER_BLOCK[ver];
  const rawCodewords = Math.floor(rawDataModules(ver) / 8);
  const numShort = numBlocks - (rawCodewords % numBlocks);
  const shortLen = Math.floor(rawCodewords / numBlocks);
  const divisor = rsDivisor(eccLen);
  const blocks = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, divisor);
    if (i < numShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const result = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortLen - eccLen || j >= numShort) result.push(block[i]);
    });
  }
  return result;
}

/* ===== Matrix ===== */
function functionPatterns(ver) {
  const size = ver * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, dark) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const finder = (x, y) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) set(xx, yy, dist !== 2 && dist !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  const align = alignmentPositions(ver);
  const last = align.length - 1;
  align.forEach((ay, i) =>
    align.forEach((ax, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    })
  );
  drawFormatBits(modules, isFunction, 0); // reserve the format areas
  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, getBit(bits, i));
      set(b, a, getBit(bits, i));
    }
  }
  return { size, modules, isFunction };
}

function formatBits(mask) {
  const data = (FORMAT_ECL_M << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

/** Both copies of the format bits, plus the always-dark module. */
function drawFormatBits(modules, isFunction, mask) {
  const size = modules.length;
  const bits = formatBits(mask);
  const set = (x, y, dark) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };
  for (let i = 0; i <= 5; i++) set(8, i, getBit(bits, i));
  set(8, 7, getBit(bits, 6));
  set(8, 8, getBit(bits, 7));
  set(7, 8, getBit(bits, 8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, getBit(bits, i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, getBit(bits, i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, getBit(bits, i));
  set(8, size - 8, true);
}

/** Zigzag order of data module coordinates. */
function zigzag(size, isFunction) {
  const coords = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x]) coords.push([x, y]);
      }
    }
  }
  return coords;
}

const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function applyMask(modules, isFunction, mask) {
  const size = modules.length;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!isFunction[y][x] && MASKS[mask](x, y)) modules[y][x] = !modules[y][x];
}

/** Standard penalty: runs of 5+, 2×2 blocks, finder-like patterns, dark/light balance. */
function penalty(modules) {
  const size = modules.length;
  let score = 0;
  const lines = [];
  for (let i = 0; i < size; i++) {
    lines.push(modules[i]);
    lines.push(modules.map((row) => row[i]));
  }
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && line[i] === line[i - 1]) run++;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    const s = line.map((d) => (d ? 1 : 0)).join('');
    for (const pattern of ['10111010000', '00001011101']) {
      for (let at = s.indexOf(pattern); at >= 0; at = s.indexOf(pattern, at + 1)) score += 40;
    }
  }
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
    }
  }
  const dark = modules.reduce((n, row) => n + row.filter(Boolean).length, 0);
  const total = size * size;
  score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return score;
}

function makeQr(text) {
  const bytes = [...Buffer.from(text, 'utf8')];
  const { ver, codewords } = encodeData(bytes);
  const all = addEccAndInterleave(codewords, ver);
  const { size, modules, isFunction } = functionPatterns(ver);
  zigzag(size, isFunction).forEach(([x, y], i) => {
    modules[y][x] = i < all.length * 8 ? getBit(all[i >>> 3], 7 - (i & 7)) : false;
  });
  let best = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(modules, isFunction, mask);
    drawFormatBits(modules, isFunction, mask);
    const s = penalty(modules);
    if (s < bestScore) {
      bestScore = s;
      best = mask;
    }
    applyMask(modules, isFunction, mask); // undo
  }
  applyMask(modules, isFunction, best);
  drawFormatBits(modules, isFunction, best);
  return { ver, size, modules, mask: best };
}

/* ===== Self-check: decode what was drawn ===== */
function decode(qr) {
  const { ver, size } = qr;
  const modules = qr.modules.map((row) => row.slice());
  let raw = 0;
  for (let i = 0; i <= 5; i++) raw |= (modules[i][8] ? 1 : 0) << i;
  raw |= (modules[7][8] ? 1 : 0) << 6;
  raw |= (modules[8][8] ? 1 : 0) << 7;
  raw |= (modules[8][7] ? 1 : 0) << 8;
  for (let i = 9; i < 15; i++) raw |= (modules[8][14 - i] ? 1 : 0) << i;
  const mask = [0, 1, 2, 3, 4, 5, 6, 7].find((m) => formatBits(m) === raw);
  if (mask === undefined) throw new Error('format bits unreadable');
  const { isFunction } = functionPatterns(ver);
  applyMask(modules, isFunction, mask);
  const bitsAll = zigzag(size, isFunction).map(([x, y]) => (modules[y][x] ? 1 : 0));
  const rawCodewords = Math.floor(rawDataModules(ver) / 8);
  const stream = [];
  for (let i = 0; i < rawCodewords; i++) stream.push(parseInt(bitsAll.slice(i * 8, i * 8 + 8).join(''), 2));
  // De-interleave and verify every block's Reed–Solomon remainder
  const numBlocks = NUM_BLOCKS[ver];
  const eccLen = ECC_PER_BLOCK[ver];
  const numShort = numBlocks - (rawCodewords % numBlocks);
  const shortLen = Math.floor(rawCodewords / numBlocks);
  const blocks = Array.from({ length: numBlocks }, () => []);
  let k = 0;
  for (let i = 0; i < shortLen + 1; i++) {
    for (let j = 0; j < numBlocks; j++) {
      if (i === shortLen - eccLen && j < numShort) continue; // short blocks have no codeword here
      if (k < stream.length) blocks[j].push(stream[k++]);
    }
  }
  const divisor = rsDivisor(eccLen);
  const data = [];
  blocks.forEach((block) => {
    const dat = block.slice(0, block.length - eccLen);
    const ecc = block.slice(block.length - eccLen);
    if (rsRemainder(dat, divisor).join() !== ecc.join()) throw new Error('Reed–Solomon check failed');
    data.push(...dat);
  });
  const bits = data.map((b) => b.toString(2).padStart(8, '0')).join('');
  if (bits.slice(0, 4) !== '0100') throw new Error('not byte mode');
  const countLen = ver <= 9 ? 8 : 16;
  const count = parseInt(bits.slice(4, 4 + countLen), 2);
  const out = [];
  for (let i = 0; i < count; i++) out.push(parseInt(bits.slice(4 + countLen + i * 8, 12 + countLen + i * 8), 2));
  return { text: Buffer.from(out).toString('utf8'), mask };
}

/* ===== SVG ===== */
function toSvg(qr, text) {
  const quiet = 4;
  const dim = qr.size + quiet * 2;
  let path = '';
  qr.modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    })
  );
  const label = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim * 8}" height="${dim * 8}" shape-rendering="crispEdges" role="img" aria-labelledby="qr-title"><title id="qr-title">QR code for ${label}</title><rect width="${dim}" height="${dim}" fill="#ffffff"/><path d="${path}" fill="#050816"/></svg>\n`;
}

const url = process.argv[2] || DATA.site.url;
const qr = makeQr(url);
const check = decode(qr);
if (check.text !== url) throw new Error(`Self-check failed: decoded "${check.text}"`);
writeFileSync(join(ROOT, 'qr.svg'), toSvg(qr, url));
console.log(`wrote qr.svg for ${url} (version ${qr.ver}, ${qr.size}×${qr.size}, mask ${qr.mask}); self-check decoded the same URL`);
