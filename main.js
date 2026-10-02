/*
 * main.js
 * Enhances the markup that scripts/build.mjs wrote into index.html (content already works without it).
 * ES2017 at most, classic script, feature-detected for older phones (iOS Safari 13+).
 *
 * Blocks:
 *  1. Setup and helpers
 *  2. Navigation: header height, mobile sheet, anchor offsets, scroll UI
 *  3. Hero and sections: boot screen, typed roles, India time, reveals, counters, footer year
 *  4. Pointer effects: custom cursor, project card tilt
 *  5. Boot
 */
(function () {
  'use strict';

  /* =====================================================================
   * 1. Setup and helpers
   * ===================================================================== */
  var DATA = window.PORTFOLIO_DATA;
  if (!DATA) return;
  window.__portfolioReady = true; // keeps the pre-paint "motion" class (see index.html)

  var owner = DATA.owner;
  var ui = DATA.ui;
  var root = document.documentElement;

  function $(sel, scope) {
    return (scope || document).querySelector(sel);
  }
  function $$(sel, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(sel));
  }
  /** matchMedia change listener that also works on Safari < 14. */
  function onMediaChange(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var hasIO = 'IntersectionObserver' in window;
  var motionOn = function () {
    return root.classList.contains('motion') && !reduceMotion.matches;
  };

  /* =====================================================================
   * 2. Navigation
   * ===================================================================== */

  /** Header height → --header-h, used for section offsets. */
  var headerHeight = 64;
  function syncHeaderHeight() {
    var bar = $('#site-header');
    var update = function () {
      headerHeight = Math.ceil(bar.getBoundingClientRect().height - ($('#mobile-sheet').hidden ? 0 : $('#mobile-sheet').offsetHeight));
      root.style.setProperty('--header-h', headerHeight + 'px');
    };
    update();
    if ('ResizeObserver' in window) new ResizeObserver(update).observe($('.nav-bar'));
    else window.addEventListener('resize', update);
  }

  /** Mobile sheet: toggle, close after a choice, Esc, and when growing to desktop. */
  function initMobileSheet() {
    var toggle = $('#nav-toggle');
    var sheet = $('#mobile-sheet');
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? ui.menuClose : ui.menuOpen);
      sheet.hidden = !open;
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    sheet.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !sheet.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
    onMediaChange(window.matchMedia('(min-width: 1024px)'), function (e) {
      if (e.matches) setOpen(false);
    });
    return setOpen;
  }

  /** Scroll to an element below the fixed header (older Safari ignores scroll-padding-top). */
  function scrollToElement(target, focus) {
    var top = target.getBoundingClientRect().top + window.pageYOffset - (target.id === 'home' ? 0 : headerHeight);
    var smooth = !reduceMotion.matches && 'scrollBehavior' in root.style;
    if (smooth) window.scrollTo({ top: top, behavior: 'smooth' });
    else window.scrollTo(0, top);
    if (focus) {
      var heading = target.matches('h1, h2') ? target : $('h1, h2', target) || target;
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      try {
        heading.focus({ preventScroll: true });
      } catch (err) {
        heading.focus();
      }
    }
  }

  /** In-page anchor links: offset for the header, keep the address bar hash, move focus. */
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var id = link.getAttribute('href').slice(1);
      var target = id ? document.getElementById(id) : null;
      if (!target || id.indexOf('project-') === 0) return;
      e.preventDefault();
      if (history.pushState) history.pushState(null, '', '#' + id);
      scrollToElement(target, id !== 'main');
      if (id === 'main') target.focus();
    });
  }

  /** Scroll progress bar, active nav link and the timeline line, in one rAF-throttled handler. */
  function initScrollUI() {
    var bar = $('#scroll-progress');
    var ids = ui.sections.map(function (s) {
      return s.id;
    });
    var sections = ids.map(function (id) {
      return document.getElementById(id);
    });
    var links = $$('.nav-link[href^="#"]');
    var timeline = $('.timeline');
    var timelineLine = $('.timeline-progress');
    var activeId = '';
    var ticking = false;

    var update = function () {
      ticking = false;
      var max = root.scrollHeight - window.innerHeight;
      var y = window.pageYOffset;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';

      // Timeline draws itself up to 60 % of the viewport height
      if (motionOn()) {
        var r = timeline.getBoundingClientRect();
        var p = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - r.top) / r.height));
        timelineLine.style.transform = 'scaleY(' + p.toFixed(3) + ')';
      }

      // Active section: the last one whose top passed 35 % of the viewport; the last section wins at the bottom
      var current = ids[0];
      sections.forEach(function (s, i) {
        if (s.getBoundingClientRect().top <= window.innerHeight * 0.35) current = ids[i];
      });
      if (y >= max - 2) current = ids[ids.length - 1];
      if (current !== activeId) {
        activeId = current;
        links.forEach(function (link) {
          var on = link.getAttribute('href') === '#' + current;
          link.classList.toggle('is-active', on);
          if (on) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
    };
    var onScroll = function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* =====================================================================
   * 3. Hero and sections
   * ===================================================================== */

  /** Boot screen: CSS fades it by 600 ms; remove the node afterwards. */
  function initBootScreen() {
    var boot = $('#boot');
    if (!boot) return;
    var remove = function () {
      if (boot.parentNode) boot.parentNode.removeChild(boot);
    };
    if (root.classList.contains('no-boot')) return remove();
    boot.addEventListener('animationend', remove);
    setTimeout(remove, 700);
  }

  /** Live time in India in the status strip, refreshed on each minute boundary. */
  function initLocalTime() {
    var node = $('#local-time');
    var format;
    try {
      format = new Intl.DateTimeFormat('en-GB', { timeZone: owner.timeZone, hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (err) {
      return; // very old engines: keep the static zone label
    }
    var tick = function () {
      node.textContent = format.format(new Date()) + ' ' + owner.timeZoneLabel;
      setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    };
    tick();
  }

  /** Typed role line. The full list stays available to screen readers; typing pauses off-screen. */
  function initTypedRoles() {
    var node = $('#typed-role');
    var roles = owner.roles;
    var full = document.createElement('span');
    full.className = 'sr-only';
    full.textContent = roles.join(' | ');
    node.parentNode.insertBefore(full, node);
    node.setAttribute('aria-hidden', 'true');
    if (!motionOn()) return; // keep the static full list

    var roleIndex = 0;
    var charIndex = roles[0].length;
    var deleting = true;
    var timer = 0;
    var running = false;
    var onScreen = true;
    node.textContent = roles[0];

    var step = function () {
      var delay;
      if (deleting) {
        charIndex--;
        delay = 35;
        if (charIndex === 0) {
          deleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
          delay = 350;
        }
      } else {
        charIndex++;
        delay = 70;
        if (charIndex === roles[roleIndex].length) {
          deleting = true;
          delay = 1800;
        }
      }
      node.textContent = roles[roleIndex].slice(0, charIndex);
      timer = setTimeout(step, delay);
    };
    var update = function () {
      var shouldRun = onScreen && !document.hidden;
      if (shouldRun && !running) {
        running = true;
        timer = setTimeout(step, 1800);
      } else if (!shouldRun && running) {
        running = false;
        clearTimeout(timer);
      }
    };
    // Observe the whole line: the typed span collapses to zero width between words
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      update();
    }).observe(node.parentNode);
    document.addEventListener('visibilitychange', update);
  }

  /** Reveal sections as they enter the viewport (only when html.motion is set). */
  function initReveals() {
    var items = $$('.reveal');
    if (!motionOn()) {
      root.classList.remove('motion');
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
    );
    items.forEach(function (n) {
      io.observe(n);
    });
  }

  /** Counters count up once; without motion the final values (already in the HTML) stay. */
  function initCounters() {
    if (!motionOn()) return;
    var counters = $$('.counter');
    counters.forEach(function (n) {
      n.textContent = '0';
    });
    var animate = function (node) {
      var target = Number(node.getAttribute('data-target'));
      var start = performance.now();
      var frame = function (now) {
        var p = Math.min(1, (now - start) / 1400);
        node.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) window.requestAnimationFrame(frame);
      };
      window.requestAnimationFrame(frame);
    };
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animate(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach(function (n) {
      io.observe(n);
    });
  }

  function initFooterYear() {
    $('#footer-year').textContent = String(new Date().getFullYear());
  }

  /* =====================================================================
   * 4. Pointer effects (fine pointers only)
   * ===================================================================== */

  /** Custom cursor: dot plus trailing ring. */
  function initCursor() {
    if (!finePointer.matches || reduceMotion.matches) return;
    var dot = document.createElement('div');
    var ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    root.classList.add('has-cursor');

    var mx = 0;
    var my = 0;
    var rx = 0;
    var ry = 0;
    var frame = 0;
    var shown = false;
    var follow = function () {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0) translate(-50%,-50%)';
      frame = Math.abs(mx - rx) + Math.abs(my - ry) > 0.2 ? window.requestAnimationFrame(follow) : 0; // stop when caught up
    };
    window.addEventListener(
      'pointermove',
      function (e) {
        if (e.pointerType !== 'mouse') return;
        mx = e.clientX;
        my = e.clientY;
        dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
        if (!shown) {
          shown = true;
          rx = mx;
          ry = my;
          root.classList.add('cursor-visible');
        }
        if (!frame) frame = window.requestAnimationFrame(follow);
      },
      { passive: true }
    );
    var interactive = 'a, button, input, textarea, label, summary, .project-card, .hero-canvas';
    document.addEventListener('pointerover', function (e) {
      ring.classList.toggle('is-hover', !!e.target.closest(interactive));
    });
    root.addEventListener('mouseleave', function () {
      root.classList.remove('cursor-visible');
    });
    root.addEventListener('mouseenter', function () {
      if (shown) root.classList.add('cursor-visible');
    });
  }

  /** Project cards tilt toward the cursor with a moving light (mouse only; touch just taps). */
  function initCardTilt() {
    if (!finePointer.matches || reduceMotion.matches) return;
    var MAX = 6;
    $$('.project-card').forEach(function (card) {
      var frame = 0;
      card.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(function () {
          card.style.transform = 'perspective(1000px) rotateX(' + (-y * MAX).toFixed(2) + 'deg) rotateY(' + (x * MAX).toFixed(2) + 'deg)';
          card.style.setProperty('--light-x', ((x + 0.5) * 100).toFixed(1) + '%');
          card.style.setProperty('--light-y', ((y + 0.5) * 100).toFixed(1) + '%');
          card.classList.add('is-tilting');
        });
      });
      card.addEventListener('pointerleave', function () {
        window.cancelAnimationFrame(frame);
        card.style.transform = '';
        card.classList.remove('is-tilting');
      });
    });
  }

  /* =====================================================================
   * 5. Boot
   * ===================================================================== */
  if (!hasIO) root.classList.remove('motion');
  initBootScreen();
  syncHeaderHeight();
  initMobileSheet();
  initAnchors();
  initScrollUI();
  initLocalTime();
  initTypedRoles();
  initReveals();
  initCounters();
  initFooterYear();
  initCursor();
  initCardTilt();
})();
