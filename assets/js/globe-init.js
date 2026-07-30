/* =============================================================================
   Shared globe initialiser (cobe, vendored locally).
   Initialises every [data-globe] canvas on the page it's included on. Lazily
   creates the WebGL globe only when the canvas nears the viewport, so it costs
   nothing until it's needed. Auto-spins; drags to rotate where the canvas is
   interactive; honours reduced motion; degrades silently if WebGL/the module
   is unavailable. Each canvas may set data-opacity for its resting opacity.
   ========================================================================== */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvases = Array.prototype.slice.call(document.querySelectorAll('[data-globe]'));
  if (!canvases.length) return;

  var cobePromise = null;
  function loadCobe() {
    if (!cobePromise) {
      // Resolves relative to this module (assets/js/), i.e. assets/js/cobe.js.
      cobePromise = import('./cobe.js').then(function (m) { return m['default']; }).catch(function () { return null; });
    }
    return cobePromise;
  }

  var MARKERS = [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777],   size: 0.10 },
    { location: [23.8103, 90.4125],  size: 0.05 },
    { location: [30.0444, 31.2357],  size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333],size: 0.10 },
    { location: [19.4326, -99.1332], size: 0.10 },
    { location: [40.7128, -74.006],  size: 0.10 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784],  size: 0.06 }
  ];

  function build(canvas, createGlobe) {
    var phi = 0, width = 0, pointer = null, movement = 0, r = 0;
    var interactive = getComputedStyle(canvas).pointerEvents !== 'none';

    var onResize = function () { width = canvas.offsetWidth; };
    window.addEventListener('resize', onResize);
    onResize();

    try {
      createGlobe(canvas, {
        devicePixelRatio: 2,
        width: width * 2,
        height: width * 2,
        phi: 0,
        theta: 0.3,
        dark: 0,
        diffuse: 0.4,
        mapSamples: 16000,
        mapBrightness: 1.2,
        baseColor: [1, 1, 1],
        markerColor: [192 / 255, 57 / 255, 43 / 255],   // Site Your Story accent
        glowColor: [1, 1, 1],
        markers: MARKERS,
        onRender: function (state) {
          if (pointer === null) phi += 0.005;
          state.phi = phi + r;
          state.width = width * 2;
          state.height = width * 2;
        }
      });

      var rest = canvas.getAttribute('data-opacity') || '1';
      setTimeout(function () { canvas.style.opacity = rest; }, 0);

      if (interactive) {
        canvas.addEventListener('pointerdown', function (e) { pointer = e.clientX - movement; canvas.style.cursor = 'grabbing'; });
        var release = function () { pointer = null; canvas.style.cursor = 'grab'; };
        canvas.addEventListener('pointerup', release);
        canvas.addEventListener('pointerout', release);
        canvas.addEventListener('mousemove', function (e) { if (pointer !== null) { movement = e.clientX - pointer; r = movement / 200; } });
        canvas.addEventListener('touchmove', function (e) { if (pointer !== null && e.touches[0]) { movement = e.touches[0].clientX - pointer; r = movement / 200; } }, { passive: true });
      }
    } catch (e) { /* WebGL unavailable — leave the composition as-is */ }
  }

  function watch(canvas) {
    if (!('IntersectionObserver' in window)) {
      loadCobe().then(function (cg) { if (cg) build(canvas, cg); });
      return;
    }
    var started = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !started) {
          started = true; io.disconnect();
          loadCobe().then(function (cg) { if (cg) build(canvas, cg); });
        }
      });
    }, { rootMargin: '300px 0px' });
    io.observe(canvas);
  }

  canvases.forEach(watch);
})();
