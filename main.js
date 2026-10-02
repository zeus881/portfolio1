/*
 * main.js
 * Enhances the markup that scripts/build.mjs wrote into index.html (content already works without it).
 * ES2017 at most, classic script, feature-detected for older phones (iOS Safari 13+).
 *
 * Blocks:
 *  1. Setup and helpers
 *  2. Navigation: header height, mobile sheet, anchor offsets, scroll UI
 *  3. Hero and sections: boot screen, typed roles, India time, reveals, counters, footer year
 *  4. 3D: gating (WebGL, saveData, deviceMemory, 2G), lazy loading after first paint, on/off toggle
 *  5. Pointer effects: custom cursor, project card tilt
 *  6. Projects: filters, modal (cloned from the card markup + full diagram), deep links, back button
 *  7. Contact: toast, copy email, resume download, form (validation, honeypot, FormSubmit, mailto fallback)
 *  8. Boot (also exposes window.Portfolio for palette.js)
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
   * 4. 3D: gating, lazy loading after first paint, on/off toggle
   * ===================================================================== */
  var FX_KEY = 'sk-portfolio-3d';
  var fx = { webgl: false, enabled: false, loading: null };

  function readStored(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null; // storage blocked (private mode, old browsers)
    }
  }
  function writeStored(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      /* the choice then lasts for this visit only */
    }
  }

  function webglAvailable() {
    try {
      var canvas = document.createElement('canvas');
      var gl = window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      if (gl && gl.getExtension('WEBGL_lose_context')) gl.getExtension('WEBGL_lose_context').loseContext();
      return !!gl;
    } catch (err) {
      return false;
    }
  }

  /** Data saver off, at least 3 GB memory, not 2G. Missing APIs count as allowed. */
  function deviceAllows3D() {
    var c = navigator.connection;
    if (c && c.saveData) return false;
    if (c && /(^|-)2g$/.test(c.effectiveType || '')) return false;
    if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 3) return false;
    return true;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error(src));
      };
      document.body.appendChild(s);
    });
  }

  /** Three.js first, then the two scenes; never throws to the page. */
  function load3D() {
    if (!fx.loading) {
      fx.loading = loadScript('./vendor/three.min.js')
        .then(function () {
          return loadScript('./bg-3d.js');
        })
        .then(function () {
          return loadScript('./hero-3d.js');
        })
        .catch(function () {
          root.setAttribute('data-bg3d', 'unavailable:0'); // the CSS gradient stays
        });
    }
    return fx.loading;
  }

  /** After the first paint and once the page is idle. */
  function afterFirstPaint(fn) {
    var run = function () {
      window.requestAnimationFrame(function () {
        if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 2000 });
        else setTimeout(fn, 200);
      });
    };
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run);
  }

  function renderFxButton() {
    var button = $('#toggle-3d');
    button.setAttribute('aria-pressed', String(fx.enabled));
    button.textContent = fx.enabled ? ui.toggle3dOn : ui.toggle3dOff;
    if (!fx.webgl) {
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('title', ui.toggle3dUnavailable);
    }
  }

  function setFx(enabled) {
    if (!fx.webgl) return;
    fx.enabled = enabled;
    root.setAttribute('data-fx', enabled ? 'on' : 'off');
    writeStored(FX_KEY, enabled ? 'on' : 'off');
    renderFxButton();
    var notify = function () {
      var event;
      try {
        event = new CustomEvent('fx3d:change', { detail: { enabled: enabled } });
      } catch (err) {
        event = document.createEvent('CustomEvent');
        event.initCustomEvent('fx3d:change', false, false, { enabled: enabled });
      }
      window.dispatchEvent(event);
    };
    if (enabled) load3D().then(notify);
    else notify();
  }
  function toggleFx() {
    setFx(!fx.enabled);
  }

  function init3D() {
    fx.webgl = webglAvailable();
    var stored = readStored(FX_KEY);
    fx.enabled = fx.webgl && (stored ? stored === 'on' : deviceAllows3D());
    root.setAttribute('data-fx', fx.enabled ? 'on' : 'off');
    renderFxButton();
    $('#toggle-3d').addEventListener('click', toggleFx);
    if (fx.enabled) afterFirstPaint(load3D);
  }

  /* =====================================================================
   * 5. Pointer effects (fine pointers only)
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
   * 6. Projects: filters, modal, deep links
   * ===================================================================== */
  function fmt(tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, function (_, k) {
      return k in vars ? vars[k] : '';
    });
  }

  /** Filters with a FLIP layout transition where the Web Animations API exists. */
  function initProjectFilters() {
    var grid = $('#project-grid');
    var items = $$('.project-item', grid);
    var buttons = $$('.filter-btn');
    var status = $('#project-status');
    var canAnimate = typeof Element.prototype.animate === 'function';

    var apply = function (filter) {
      var before = items
        .filter(function (i) {
          return !i.hidden;
        })
        .map(function (i) {
          return { item: i, rect: i.getBoundingClientRect() };
        });
      grid.setAttribute('data-filter', filter);
      var shown = 0;
      items.forEach(function (item) {
        var match = filter === 'All' || item.getAttribute('data-category') === filter;
        item.hidden = !match;
        if (match) {
          shown++;
          item.classList.add('is-visible'); // filtered-in cards skip the scroll reveal
        }
      });
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === filter));
      });
      status.textContent = fmt(ui.projects.status, { n: shown, total: items.length });

      if (!canAnimate || !motionOn()) return;
      items.forEach(function (item) {
        if (item.hidden) return;
        var after = item.getBoundingClientRect();
        var first = null;
        before.forEach(function (b) {
          if (b.item === item) first = b.rect;
        });
        var opts = { duration: 500, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
        if (first) {
          var dx = first.left - after.left;
          var dy = first.top - after.top;
          if (dx || dy) item.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], opts);
        } else {
          item.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], opts);
        }
      });
    };
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        apply(b.getAttribute('data-filter'));
      });
    });
  }

  /** Keep Tab and Shift+Tab inside `container`. */
  function trapFocus(e, container) {
    if (e.key !== 'Tab') return;
    var focusables = $$('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]', container).filter(function (n) {
      return n.offsetParent !== null;
    });
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /** Hide the page from assistive tech while an overlay is open. */
  function setPageHidden(hidden) {
    ['#site-header', '#main', '.site-footer'].forEach(function (sel) {
      var node = $(sel);
      if (hidden) {
        node.setAttribute('aria-hidden', 'true');
        if ('inert' in node) node.inert = true;
      } else {
        node.removeAttribute('aria-hidden');
        if ('inert' in node) node.inert = false;
      }
    });
    root.classList.toggle('overlay-open', hidden);
  }

  var HASH_PREFIX = '#project-';
  var modal = { open: false, slug: '', trigger: null, pushed: false, prevHash: '' };

  /** Modal content is cloned from the pre-rendered card, plus the full diagram drawn here. */
  function fillModal(item, project) {
    var P = ui.projects;
    var panel = $('#modal-content');
    var card = $('.project-card', item);
    var section = function (label, child) {
      var wrap = document.createElement('div');
      wrap.className = 'modal-section';
      var h = document.createElement('h3');
      h.className = 'mono-label';
      h.textContent = label;
      wrap.appendChild(h);
      wrap.appendChild(child);
      return wrap;
    };
    panel.innerHTML = '';

    panel.appendChild($('.card-badges', card).cloneNode(true));

    var title = document.createElement('h2');
    title.id = 'modal-title';
    title.className = 'modal-title';
    title.textContent = project.title;
    panel.appendChild(title);
    var text = document.createElement('p');
    text.className = 'modal-text';
    text.textContent = project.description;
    panel.appendChild(text);

    var features = $('.card-details-body .modal-features', card);
    if (features) panel.appendChild(section(P.features, features.cloneNode(true)));

    if (project.diagram && window.Diagrams) {
      var holder = document.createElement('div');
      var scroller = document.createElement('div');
      scroller.className = 'diagram-full';
      scroller.setAttribute('tabindex', '0'); // scrollable region reachable by keyboard
      scroller.setAttribute('role', 'region');
      scroller.setAttribute('aria-label', fmt(P.diagramLabel, { title: project.title }));
      scroller.innerHTML = window.Diagrams.render(project.diagram, { title: fmt(P.diagramLabel, { title: project.title }), idPrefix: 'modal-' + project.slug });
      var hint = document.createElement('p');
      hint.className = 'diagram-hint';
      hint.textContent = P.diagramScroll;
      holder.appendChild(scroller);
      holder.appendChild(hint);
      panel.appendChild(section(P.architecture, holder));
    }

    panel.appendChild(section(P.stack, $('.tag-list', card).cloneNode(true)));
    var github = $('.card-details-body .modal-actions', card);
    if (github) panel.appendChild(github.cloneNode(true));
    $('#modal-panel').scrollTop = 0;
  }

  /**
   * Open a project. A history entry is pushed, so the phone back button closes the modal;
   * opening from a #project- address that is already in the history reuses that entry.
   */
  function openProject(slug, opts) {
    var options = opts || {};
    var item = document.getElementById('project-' + slug);
    var project = DATA.projects.filter(function (p) {
      return p.slug === slug;
    })[0];
    if (!item || !project) return;
    if (modal.open) closeProject(true);
    if (!options.fromHash) {
      modal.prevHash = location.hash;
      if (history.pushState) history.pushState({ project: slug }, '', HASH_PREFIX + slug);
    }
    modal.pushed = !!history.pushState;
    modal.open = true;
    modal.slug = slug;
    modal.trigger = options.trigger || $('.card-open', item);
    fillModal(item, project);
    $('#project-modal').hidden = false;
    setPageHidden(true);
    $('#project-modal .modal-close').focus();
  }

  /** Close the modal; `fromHistory` means the address already changed (back button). */
  function closeProject(fromHistory) {
    if (!modal.open) return;
    modal.open = false;
    $('#project-modal').hidden = true;
    setPageHidden(false);
    if (!fromHistory && location.hash.indexOf(HASH_PREFIX) === 0) {
      if (modal.pushed) history.back();
      else if (history.replaceState) history.replaceState(null, '', modal.prevHash || location.pathname + location.search);
    }
    if (modal.trigger) modal.trigger.focus();
    modal.trigger = null;
  }

  function initProjectModal() {
    var overlay = $('#project-modal');
    overlay.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) closeProject(false);
    });
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeProject(false);
      } else trapFocus(e, $('#modal-panel'));
    });

    // Tap or click anywhere on a card; the "View details" button is the keyboard control
    $('#project-grid').addEventListener('click', function (e) {
      var card = e.target.closest('.project-card');
      if (!card || e.target.closest('a, summary')) return;
      var item = card.parentNode;
      openProject(item.getAttribute('data-slug'), { trigger: $('.card-open', item) });
    });

    // Address changes: back/forward buttons, typed hashes, links to #project-<slug>
    var syncWithHash = function () {
      var hash = location.hash;
      if (hash.indexOf(HASH_PREFIX) === 0) {
        var slug = decodeURIComponent(hash.slice(HASH_PREFIX.length));
        if (!modal.open || modal.slug !== slug) openProject(slug, { fromHash: true });
      } else if (modal.open) {
        closeProject(true);
      }
    };
    window.addEventListener('popstate', syncWithHash);
    window.addEventListener('hashchange', syncWithHash);

    // Deep link on load: put the plain page underneath, so "back" closes the modal and stays on the site
    if (location.hash.indexOf(HASH_PREFIX) === 0 && history.pushState) {
      var hash = location.hash;
      history.replaceState(null, '', location.pathname + location.search);
      history.pushState({ project: hash.slice(HASH_PREFIX.length) }, '', hash);
      modal.prevHash = '';
      syncWithHash();
    }
  }

  /* =====================================================================
   * 7. Contact: toast, copy email, resume download, form
   * ===================================================================== */
  var toastTimer = 0;
  /** Short confirmation, announced politely. */
  function toast(text) {
    var node = $('#toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'toast';
      node.className = 'toast';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      document.body.appendChild(node);
    }
    node.textContent = text;
    node.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.classList.remove('is-visible');
    }, 2200);
  }

  /** Clipboard API where allowed, hidden textarea + execCommand otherwise. */
  function copyText(text) {
    var fallback = function () {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.className = 'sr-only';
      document.body.appendChild(area);
      area.select();
      area.setSelectionRange(0, text.length); // iOS
      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (err) {
        ok = false;
      }
      document.body.removeChild(area);
      return ok;
    };
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () {
          return true;
        },
        function () {
          return fallback();
        }
      );
    }
    return Promise.resolve(fallback());
  }

  function copyEmail() {
    var C = ui.contact;
    var button = $('#copy-email');
    var label = $('.copy-label', button);
    return copyText(owner.email).then(function (ok) {
      button.classList.toggle('is-copied', ok);
      label.textContent = ok ? C.copied : C.copyEmail;
      toast(ok ? C.copied + ': ' + owner.email : C.copyFailed);
      setTimeout(function () {
        button.classList.remove('is-copied');
        label.textContent = C.copyEmail;
      }, 2000);
      return ok;
    });
  }

  /** Resume download through a temporary link (also works from file://). */
  function downloadResume() {
    var a = document.createElement('a');
    a.href = owner.resume;
    a.setAttribute('download', '');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function openMailto(url) {
    var a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /** Validation with inline messages, honeypot, FormSubmit AJAX, mailto fallback on any failure. */
  function initContactForm() {
    var form = $('#contact-form');
    var submit = $('#cf-submit');
    var spinner = $('.spinner', submit);
    var label = $('.btn-label', submit);
    var status = $('#form-status');
    var C = ui.contact;
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var names = ['name', 'email', 'subject', 'message'];
    var attempted = false;
    form.noValidate = true; // inline messages replace the browser bubbles

    var field = function (name) {
      return form.elements[name];
    };
    var errorFor = function (name) {
      var value = field(name).value.trim();
      if (!value) return fmt(C.errors.required, { field: C.fields[name] });
      if (name === 'email' && !EMAIL_RE.test(value)) return C.errors.email;
      return '';
    };
    var showError = function (name, message) {
      $('#cf-' + name + '-err').textContent = message;
      if (message) field(name).setAttribute('aria-invalid', 'true');
      else field(name).removeAttribute('aria-invalid');
    };
    var validate = function () {
      var firstInvalid = null;
      names.forEach(function (name) {
        var message = errorFor(name);
        showError(name, message);
        if (message && !firstInvalid) firstInvalid = field(name);
      });
      return firstInvalid;
    };
    var setStatus = function (kind, text, link) {
      status.className = 'form-status' + (kind ? ' is-' + kind : '');
      status.textContent = text;
      if (link) {
        status.appendChild(document.createTextNode(' '));
        status.appendChild(link);
      }
    };
    var setSending = function (sending) {
      submit.disabled = sending;
      spinner.hidden = !sending;
      label.textContent = sending ? C.sending : C.submit;
    };
    var mailtoUrl = function (d) {
      return 'mailto:' + owner.email + '?subject=' + encodeURIComponent(d.subject) + '&body=' + encodeURIComponent(d.message + '\n\n' + d.name + ' <' + d.email + '>');
    };

    form.addEventListener('input', function (e) {
      if (attempted && names.indexOf(e.target.name) >= 0) showError(e.target.name, errorFor(e.target.name));
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      attempted = true;
      setStatus('', '');
      var firstInvalid = validate();
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      if (form.elements._honey.value) return; // a bot filled the honeypot: ignore silently

      var data = {};
      names.forEach(function (n) {
        data[n] = field(n).value.trim();
      });
      setSending(true);
      var controller = 'AbortController' in window ? new AbortController() : null;
      var timeout = setTimeout(function () {
        if (controller) controller.abort();
      }, 10000);
      fetch(DATA.site.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          _replyto: data.email,
          _subject: data.subject,
          message: data.message,
          _template: 'table',
          _captcha: 'false',
        }),
        signal: controller ? controller.signal : undefined,
      })
        .then(function (res) {
          return res.json().then(
            function (json) {
              return { ok: res.ok, json: json };
            },
            function () {
              return { ok: res.ok, json: {} };
            }
          );
        })
        .then(function (r) {
          if (!r.ok || String(r.json.success) !== 'true') throw new Error('not sent');
          setStatus('success', C.success);
          form.reset();
          attempted = false;
        })
        .catch(function () {
          var url = mailtoUrl(data);
          var link = document.createElement('a');
          link.href = url;
          link.textContent = C.failureLink;
          setStatus('error', C.failure, link);
          openMailto(url);
        })
        .then(function () {
          clearTimeout(timeout);
          setSending(false);
        });
    });
  }

  /* =====================================================================
   * 8. Boot
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
  init3D();
  initProjectFilters();
  initProjectModal();
  $('#copy-email').addEventListener('click', copyEmail);
  initContactForm();

  // Offline support on HTTPS (and localhost for testing); the page works the same without it
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {
        /* unsupported or blocked: nothing to do */
      });
    });
  }

  // Public API for palette.js
  window.Portfolio = {
    goToSection: function (id) {
      var target = document.getElementById(id);
      if (!target) return;
      if (history.pushState) history.pushState(null, '', '#' + id);
      scrollToElement(target, true);
    },
    openProject: function (slug) {
      openProject(slug);
    },
    downloadResume: downloadResume,
    copyEmail: copyEmail,
    toggleFx: toggleFx,
    openGitHub: function () {
      window.open(owner.github, '_blank', 'noopener');
    },
    trapFocus: trapFocus,
    setPageHidden: setPageHidden,
  };
})();
