/*
 * sw.js
 * Offline support and repeat-visit speed.
 *  - install:  cache the app shell
 *  - activate: delete caches from older releases
 *  - fetch:    network-first for the page (index.html), cache-first for other local files;
 *              non-GET requests (the contact form POST) and other origins are never touched
 * Release a new version: bump CACHE_VERSION, so visitors get the new files.
 */
'use strict';

const CACHE_VERSION = 'v3.0.0';
const CACHE_NAME = 'sk-portfolio-' + CACHE_VERSION;

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './diagrams.js',
  './main.js',
  './palette.js',
  './fonts/inter-latin.woff2',
  './fonts/orbitron-latin.woff2',
  './fonts/jetbrains-mono-latin.woff2',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './404.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.indexOf('sk-portfolio-') === 0 && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

/** Store a copy of successful same-origin responses. */
function remember(request, response) {
  if (response && response.ok && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return; // the form POST goes straight to the network
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isPage = request.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname);
  if (isPage) {
    // Network first, so a new release shows up immediately; cached page when offline
    event.respondWith(
      fetch(request)
        .then((response) => remember(request, response))
        .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match('./')))
    );
    return;
  }

  // Cache first for fonts, scripts, styles, images, the resume and the 3D files
  event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((response) => remember(request, response))));
});
