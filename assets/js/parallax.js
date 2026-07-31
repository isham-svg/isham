/* =============================================================================
   Parallax scrolling — vanilla port of the Osmo React component's effect.
   Mirrors the original useEffect: a scrubbed GSAP timeline translates each
   [data-parallax-layer] at its own rate while [data-parallax-layers] crosses
   the viewport, with Lenis driving smooth scroll through the GSAP ticker.

   Depends on globals loaded via CDN in the page (same versions the rest of the
   site uses): gsap@3.13.0, ScrollTrigger, lenis@1.1.20 (UMD global `Lenis`).
   Defer-loaded, so the libraries are present by the time this runs. ========== */
(function () {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsap.registerPlugin(ScrollTrigger);

  var root = document.querySelector('.parallax');
  if (!root) return;

  var triggerElement = root.querySelector('[data-parallax-layers]');

  if (triggerElement && !reduce) {
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerElement,
        start: '0% 0%',
        end: '100% 0%',
        scrub: 0
      }
    });

    var layers = [
      { layer: '1', yPercent: 70 },
      { layer: '2', yPercent: 55 },
      { layer: '3', yPercent: 40 },
      { layer: '4', yPercent: 10 }
    ];

    layers.forEach(function (layerObj, idx) {
      tl.to(
        triggerElement.querySelectorAll('[data-parallax-layer="' + layerObj.layer + '"]'),
        { yPercent: layerObj.yPercent, ease: 'none' },
        idx === 0 ? undefined : '<'
      );
    });
  }

  // Lenis smooth scroll — only if not already running on the page (the main site
  // script starts its own Lenis; this guard prevents a second instance fighting
  // it when both happen to load).
  if (window.Lenis && !window.__lenisActive && !reduce) {
    var lenis = new Lenis();
    window.__lenisActive = true;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
})();
