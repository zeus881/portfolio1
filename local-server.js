/*
 * local-server.js
 * Tiny static file server for local development.
 * Usage: node local-server.js  →  http://localhost:5173
 * Uses only Node built-ins (http, fs, path). Not intended for production.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 5173;
const ROOT = path.resolve(__dirname);

/* ---------- MIME types ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

/* ---------- Helpers ---------- */
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

/** Resolve a URL path to a file inside ROOT, or return null if it escapes ROOT. */
function resolveSafe(urlPath) {
  const target = path.resolve(ROOT, '.' + path.sep + urlPath);
  const rel = path.relative(ROOT, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return target;
}

/* ---------- Request handler ---------- */
const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, '405 Method Not Allowed');
  }

  // Decode the path; reject malformed encodings and null bytes.
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, '400 Bad Request');
  }
  if (urlPath.includes('\0')) return send(res, 400, '400 Bad Request');

  // Raw-path traversal check: the URL parser normalises "/../", so inspect the original too.
  const rawPath = req.url.split('?')[0];
  let rawDecoded = rawPath;
  try { rawDecoded = decodeURIComponent(rawPath); } catch { /* handled above */ }
  if (rawDecoded.split(/[\\/]/).includes('..')) return send(res, 403, '403 Forbidden');

  if (urlPath.endsWith('/')) urlPath += 'index.html';

  const filePath = resolveSafe(urlPath);
  if (!filePath) return send(res, 403, '403 Forbidden');

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, '404 Not Found');

    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
});

/* ---------- Start ---------- */
server.listen(PORT, () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT}`);
});
