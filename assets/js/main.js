/* =============================================================================
   SITE YOUR STORY — Motion & interaction layer
   -----------------------------------------------------------------------------
   Built on GSAP (ScrollTrigger + SplitText) and Lenis.

   The centrepiece is the background film: bg-sys.mp4 is fixed to the viewport,
   never plays on its own, and has its timeline driven by scroll position.
   Scrolling down runs it forward, scrolling back runs it in reverse.

   Every enhancement degrades safely. If the CDNs fail, if JS is off, or if the
   visitor prefers reduced motion, the page still renders in full.

   Contents:
     01. Environment
     02. Smooth scroll
     03. Text splitting
     04. Reveals
     05. Landing screen
     06. Background film (scroll-scrubbed)
     07. Scene transition
     08. Timeline
     09. Progress
     10. Navigation
     11. Cursor & magnetics
     12. Marquee
     13. Counters
     14. Form
     15. Page transitions
     16. Boot
   ========================================================================== */

(function () {
  'use strict';

  /* 01. Environment ------------------------------------------------------ */

  var root = document.documentElement;
  root.classList.remove('no-js');

  var hasGSAP  = typeof window.gsap !== 'undefined';
  var hasST    = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  var hasSplit = hasGSAP && typeof window.SplitText !== 'undefined';
  var hasLenis = typeof window.Lenis !== 'undefined';
  var reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine     = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if (hasST) gsap.registerPlugin(ScrollTrigger);
  if (hasSplit) gsap.registerPlugin(SplitText);

  var lenis = null;

  function safe(name, fn) {
    try { fn(); }
    catch (err) { if (window.console && console.warn) console.warn('[sys] ' + name + ':', err); }
  }

  /* 02. Smooth scroll ---------------------------------------------------- */

  function initSmoothScroll() {
    if (!hasLenis || reduced) return;

    lenis = new Lenis({
      // A heavier, more cinematic glide — every wheel notch eases in and coasts
      // for longer, so the page reads like a controlled camera rather than
      // jumping. Longer duration + a gentler wheel step = weightier scrolling.
      duration: 2.0,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 0.82,
      touchMultiplier: 1.5
    });

    if (hasGSAP) {
      lenis.on('scroll', function () { if (hasST) ScrollTrigger.update(); });
      if (hasST) {
        // Scrolls that bypass Lenis — anchor restore, back-nav, keyboard paging.
        window.addEventListener('scroll', function () { ScrollTrigger.update(); }, { passive: true });
      }
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function initAnchors() {
    $$('a[href^="#"]').forEach(function (a) {
      var id = a.getAttribute('href');
      if (!id || id === '#' || id.length < 2) return;

      a.addEventListener('click', function (e) {
        var target = document.getElementById(id.slice(1));
        if (!target) return;
        e.preventDefault();
        closeMenu();
        if (lenis) lenis.scrollTo(target, { offset: -60, duration: 1.4 });
        else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      });
    });
  }

  /* 03. Text splitting --------------------------------------------------- */

  var splits = [];

  function splitLines(el) {
    if (!hasSplit) return null;

    var split = new SplitText(el, { type: 'lines', linesClass: 'split-line' });

    split.lines.forEach(function (line) {
      var mask = document.createElement('span');
      mask.className = 'line-mask';
      line.parentNode.insertBefore(mask, line);
      mask.appendChild(line);
    });

    splits.push(split);
    return split.lines;
  }

  function initSplitHeadings() {
    $$('[data-split]').forEach(function (el) {
      if (reduced || !hasGSAP) { el.style.opacity = '1'; return; }

      var lines = splitLines(el);
      if (!lines) { el.style.opacity = '1'; return; }

      // A split that produced roughly one line per word measured against the
      // wrong font. Show the heading rather than animate a broken layout.
      if (lines.length > 1 && lines.length >= el.textContent.trim().split(/\s+/).length) {
        splits.pop().revert();
        el.style.opacity = '1';
        return;
      }

      gsap.set(el, { opacity: 1 });
      gsap.set(lines, { yPercent: 110 });

      var tween = gsap.to(lines, {
        yPercent: 0,
        duration: 1.15,
        ease: 'expo.out',
        stagger: 0.09,
        paused: true,
        /*
          GHOSTING FIX.

          Once a line has arrived it must stop being an animated, composited
          thing. A line still carrying a transform inside an overflow:hidden
          mask is the classic source of "ghost" text: the compositor can move
          the promoted line without re-applying the ancestor's clip, so the
          glyphs paint outside their mask and overlap whatever is below.

          Clearing the transform and opening the mask afterwards leaves one
          plain, static text layer with nothing left to mis-composite.
        */
        onComplete: function () {
          gsap.set(lines, { clearProps: 'transform,willChange' });
          lines.forEach(function (line) {
            if (line.parentElement && line.parentElement.classList.contains('line-mask')) {
              line.parentElement.style.overflow = 'visible';
            }
          });
        }
      });

      // Kept so the safety net below can finish anything a trigger missed.
      el._splitTween = tween;

      if (hasST) {
        ScrollTrigger.create({
          trigger: el, start: 'top 90%', once: true,
          onEnter: function () { tween.play(); }
        });
      } else {
        tween.play();
      }
    });
  }

  /* 04. Reveals ---------------------------------------------------------- */

  function initReveals() {
    var items = $$('[data-reveal], .mask');

    if (reduced) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    if (hasST) {
      items.forEach(function (el) {
        var delay = parseFloat(el.getAttribute('data-delay') || '0');
        ScrollTrigger.create({
          trigger: el, start: 'top 92%', once: true,
          onEnter: function () {
            if (delay) el.style.transitionDelay = delay + 's';
            el.classList.add('is-in');
          }
        });
      });
      return;
    }

    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseFloat(el.getAttribute('data-delay') || '0');
        if (delay) el.style.transitionDelay = delay + 's';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { io.observe(el); });
  }

  function initStagger() {
    $$('[data-stagger]').forEach(function (group) {
      var step = parseFloat(group.getAttribute('data-stagger')) || 0.08;
      $$('[data-reveal]', group).forEach(function (child, i) {
        if (!child.hasAttribute('data-delay')) {
          child.setAttribute('data-delay', (i * step).toFixed(3));
        }
      });
    });
  }

  /* 05. Landing screen ---------------------------------------------------- */
  /*
     The footage is shown at full strength — nothing is laid over it, and no
     filter is applied. All motion here is transform-only so it stays on the
     compositor.
  */
  function initLanding() {
    var landing = $('.landing');
    if (!landing) return;

    var video = $('.landing__video', landing);
    var media = $('.landing__media', landing);

    // Scroll-scrubbed hero: playback is driven by scroll position (initHeroScrub),
    // never autoplayed. Skip the autoplay/loop wiring for it, but keep the
    // subtle drift + mouse parallax below.
    var scrub = !!(video && video.hasAttribute('data-scrub'));

    if (video && !scrub) {
      /*
        WATERMARK REMOVAL.

        The supplied clip carries a generator watermark over its opening
        seconds — measured as high spatial detail at x50-83% / y50-67% holding
        from 0s, decaying through 3.9s and back to baseline by 6s. Rather than
        crop or mask it (both cost picture), the hero simply never plays that
        part: it loops the clean tail declared by data-start.

        That means no native loop attribute — looping back to 0 would replay
        the watermark. The wrap is handled here instead.
      */
      var start = parseFloat(video.getAttribute('data-start') || '0') || 0;

      var toStart = function () {
        try { if (Math.abs(video.currentTime - start) > 0.05) video.currentTime = start; } catch (e) {}
      };

      // Native playback speed — the clip plays exactly as authored, as smooth as
      // the original MP4. (Earlier we slowed it to 0.75x for a cinematic feel, but
      // that made the hero feel heavy; native rate is lighter and truer.)
      var nativeRate = function () { try { video.playbackRate = 1; } catch (e) {} };
      nativeRate();

      var play = function () {
        var p = video.play();
        if (p && p.catch) p.catch(function () { video.muted = true; video.play().catch(function () {}); });
      };

      if (start > 0) {
        if (video.readyState >= 1) toStart();
        video.addEventListener('loadedmetadata', toStart, { once: true });

        // Wrap just before the end so the seek lands while a frame is still
        // showing — 'ended' alone blanks briefly on some browsers.
        video.addEventListener('timeupdate', function () {
          if (!video.duration) return;
          if (video.currentTime >= video.duration - 0.12 || video.currentTime < start - 0.15) {
            toStart();
            if (video.paused) play();
          }
        });
        video.addEventListener('ended', function () { toStart(); play(); });
      }

      if (video.readyState >= 2) play();
      video.addEventListener('loadeddata', play, { once: true });
      document.addEventListener('visibilitychange', function () { if (!document.hidden) play(); });
    }

    if (reduced || !hasGSAP || !video) return;

    // Slow floating drift, so the frame breathes even when nobody is moving.
    // Lives on the <video>; the scroll parallax lives on its wrapper, so the
    // two never fight over the same transform.
    // Desktop only. On touch this is a permanent full-screen video re-scale
    // running behind everything else, which is exactly the kind of continuous
    // compositor work that makes scrolling feel heavy on a mid-range phone.
    //
    // fromTo pins the floor at the CSS bleed value. An open-ended tween can
    // yoyo back to a scale where the video box sits flush with its clip, which
    // is what produces a hairline seam at the frame edge.
    if (fine) {
      gsap.fromTo(video,
        { scale: 1.05, xPercent: 0, yPercent: 0 },
        {
          scale: 1.10,
          xPercent: 1.2,
          yPercent: -1.4,
          duration: 14,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true
        }
      );
    }

    // Mouse parallax — desktop pointers only.
    if (fine && media) {
      var xTo = gsap.quickTo(media, 'x', { duration: 1.2, ease: 'power3' });
      var yTo = gsap.quickTo(media, 'y', { duration: 1.2, ease: 'power3' });

      landing.addEventListener('mousemove', function (e) {
        xTo((e.clientX / window.innerWidth - 0.5) * -34);
        yTo((e.clientY / window.innerHeight - 0.5) * -22);
      });
      landing.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
    }
  }

  /* 06. Background film (scroll-scrubbed) --------------------------------- */
  /*
     bg-sys.mp4 never plays. Scroll position sets a target time; the pump below
     applies it.

     The pump keeps at most ONE seek outstanding. Firing a seek per scroll event
     queues them faster than the decoder retires them (measured ~50-110ms each
     on this clip) and the picture falls behind the scroll. Waiting for `seeked`
     before issuing the next one self-throttles to whatever the decoder can
     actually deliver, which is what keeps this at 60fps.
  */
  function initFilm() {
    var film  = $('.film');
    var stage = $('.film__bg');
    if (!film || !stage) return;

    var video = $('video', stage);
    if (!video) return;

    var grade = $('.film__grade');

    // Inner pages have no landing screen to cross-dissolve from, so nothing
    // would ever fade the film up. Show it immediately there.
    if (!$('.landing')) {
      stage.style.opacity = '1';
      if (grade) grade.style.opacity = '1';
    }

    // Reduced motion: hold a single frame — no playback, no drift.
    if (reduced) {
      stage.style.opacity = '1';
      if (grade) grade.style.opacity = '1';
      var holdFrame = function () { try { video.currentTime = (video.duration || 4) * 0.25; } catch (e) {} };
      if (video.readyState >= 1) holdFrame();
      else video.addEventListener('loadedmetadata', holdFrame, { once: true });
      return;
    }

    /*
      The background is a gently-LOOPING ambient film — not scroll-scrubbed.
      The page scrolls normally over it; the only motion is the clip's own
      playback plus a barely-there scale drift (the "breeze"). Both are decode
      and transform work only, so scrolling stays smooth.

      No black bars: object-fit:cover + the scale floor below always overscan
      the 9:16 source into any viewport, so the letterbox never shows.
    */
    // The landing -> film cross-dissolve (initSceneTransition) runs on desktop
    // ONLY, to dodge the iOS bug where animating opacity on a fixed layer that
    // holds a <video> stops it painting. So on touch — and with no ScrollTrigger
    // at all — the film is simply shown here, and the landing fades out over it.
    if (!fine || !hasST) { stage.style.opacity = '1'; if (grade) grade.style.opacity = '1'; }

    video.muted = true;  video.setAttribute('muted', '');
    video.loop  = true;  video.setAttribute('loop', '');
    video.preload = 'auto';
    try { video.load(); } catch (e) {}

    var playBg = function () {
      if (!video.paused) return;
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    };

    // Desktop plays it straight away. Touch defers to the orchestrator in 06b,
    // because mobile Safari decodes only one clip at a time (hero vs. film).
    if (fine) {
      if (video.readyState >= 2) playBg();
      video.addEventListener('loadeddata', playBg, { once: true });
      document.addEventListener('visibilitychange', function () { if (!document.hidden) playBg(); });
    }

    // The breeze: one very slow scale cycle, transform only (GPU-composited),
    // barely perceptible. fromTo keeps the floor above 1.0 so the cover-crop
    // never exposes an edge at the trough of the cycle.
    if (hasGSAP) {
      gsap.fromTo(video,
        { scale: 1.04 },
        { scale: 1.09, duration: 26, ease: 'sine.inOut', repeat: -1, yoyo: true });
    }
  }

  /* 06b. Mobile video orchestration ---------------------------------------- */
  /*
     THE PRIMARY CAUSE OF THE BLACK MOBILE BACKGROUND.

     The homepage holds two <video> elements. Mobile Safari has long restricted
     how many can decode at once — historically exactly one — and Android
     devices apply similar pressure under memory limits. Once the background
     clip was also set to autoplay-loop on touch, the two started competing and
     the second one to ask simply lost. It stayed black.

     Desktop has no such limit and is left completely alone. On touch, exactly
     one clip is ever decoding: the hero while the landing screen is on screen,
     the background clip from the moment it isn't. The handover happens at the
     same point as the visual dissolve, so nothing is perceptible.
  */
  function initMobileVideoOrchestration() {
    if (fine) return;

    var landing = $('.landing');
    var heroV   = $('.landing__video');
    var bgV     = $('.film__bg video');

    if (!bgV) return;

    var play = function (v) {
      if (!v || !v.paused) return;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    };
    var pause = function (v) {
      if (!v || v.paused) return;
      try { v.pause(); } catch (e) {}
    };

    // Inner pages have no hero clip competing for the decoder.
    if (!landing || !heroV) { play(bgV); return; }

    var showBackground = function (on) {
      if (on) { pause(heroV); play(bgV); }
      else    { pause(bgV);   play(heroV); }
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          // Any sliver of the landing on screen means the hero clip is the one
          // that must be running.
          showBackground(!e.isIntersecting);
        });
      }, { threshold: 0.01 }).observe(landing);
    } else {
      var onScroll = function () {
        showBackground((window.scrollY || 0) > window.innerHeight * 0.85);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // Coming back from a background tab, whichever clip should be running is
    // often left paused by the OS.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      var pastLanding = landing.getBoundingClientRect().bottom <= 0;
      showBackground(pastLanding);
    });

    // iOS Low Power Mode refuses autoplay outright until a real gesture. Retry
    // whichever clip is meant to be running on the first one.
    ['touchstart', 'pointerdown'].forEach(function (evt) {
      window.addEventListener(evt, function once() {
        showBackground(landing.getBoundingClientRect().bottom <= 0);
        window.removeEventListener(evt, once);
      }, { passive: true, once: true });
    });
  }

  /* 07. Scene transition --------------------------------------------------- */
  /*
     The landing screen and the film cross-dissolve. The landing lifts and fades
     while its footage pushes in; the background film comes up underneath. One
     scene ends, the next begins — no section peeks up from below beforehand,
     because the landing is exactly one viewport tall.
  */
  function initSceneTransition() {
    var landing = $('.landing');
    var stage   = $('.film__bg');
    if (!landing || !hasST || reduced) return;

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: landing,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.5
      }
    });

    var inner = $('.landing__inner', landing);
    var media = $('.landing__media', landing);
    var grade = $('.film__grade');

    /*
      Two phases on ONE timeline, not two ScrollTriggers. Both would be driving
      the same transform on the same element and the later one would simply win.

      0 -> 30% of the landing's scroll : the content rises into place. It starts
                                         low and slightly held back, so the first
                                         thing on screen is the footage and the
                                         block arrives as you begin to move.
      30% -> 100%                      : the existing exit, unchanged.

      Opacity starts at 0.78 rather than 0 — the headline and CTA stay legible
      at rest. A block that begins invisible reads as a loading fault, and the
      primary action has to be readable before anyone scrolls.
    */
    if (inner) {
      /*
        How far the block starts pushed down is measured, not guessed. A fixed
        offset looks fine on a 900px desktop and shoves the CTA 100px below the
        fold on a 390x844 phone, where the content block nearly fills the
        screen — the primary action must be reachable before anyone scrolls.

        So: never push further than the gap that actually exists beneath the
        block. Function-based values are re-evaluated on every ScrollTrigger
        refresh, so this re-measures on resize and orientation change too.
      */
      var entrancePush = function () {
        var foot = $('.landing__actions', landing) || $('.landing__foot', landing);
        if (!foot) return 0;
        var slack = window.innerHeight - foot.getBoundingClientRect().bottom
                  + (gsap.getProperty(inner, 'y') || 0);
        // Travel the full slack and sub-pixel rounding tips the button 1-2px
        // past the fold; hold a few pixels back.
        //
        // The phone used to be capped tighter than this, because a BLACK
        // headline pushed into the dark lower third of the clip measured
        // 2.58:1. With white type that region is the best backdrop on the
        // screen rather than the worst, so the cap is uniform again.
        return Math.max(0, Math.min(72, Math.round(slack) - 6));
      };

      tl.fromTo(inner,
        { y: entrancePush, opacity: 0.78 },
        { y: 0, opacity: 1, ease: 'none', duration: 0.3 }, 0);
      tl.to(inner, { yPercent: -26, opacity: 0, ease: 'none', duration: 0.7 }, 0.3);
    }
    if (media) tl.to(media, { scale: 1.18, opacity: 0.15, ease: 'none' }, 0);

    /*
      The cross-dissolve is achieved differently on touch devices, and this is
      the second half of the black-background fix.

      Animating `opacity` on a position:fixed layer that contains a <video> is a
      known iOS compositing hazard — Safari promotes it to its own layer and
      then frequently fails to paint the video into it, leaving black. So on
      touch the film simply sits at opacity 1 from the start (CSS handles it)
      and the LANDING fades out over the top of it instead. Visually it is the
      same dissolve; structurally there is one less animated fixed layer, and
      the video layer is never re-composited mid-scroll.
    */
    if (fine) {
      if (stage) tl.fromTo(stage, { opacity: 0 }, { opacity: 1, ease: 'none' }, 0);
      if (grade) tl.fromTo(grade, { opacity: 0 }, { opacity: 1, ease: 'none' }, 0);
    }

    // Each scene arrives with a little depth as it crosses the fold.
    $$('.scene').forEach(function (scene) {
      var inner2 = $('.scene__inner', scene);
      if (!inner2) return;
      gsap.fromTo(inner2,
        { yPercent: 4 },
        {
          yPercent: -4,
          ease: 'none',
          scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: 1 }
        }
      );
    });
  }

  /* 08. Timeline ----------------------------------------------------------- */

  function initTimeline() {
    var tl = $('.timeline');
    if (!tl) return;

    var rail = $('.timeline__rail', tl);
    var steps = $$('.tstep', tl);

    if (reduced || !hasST) {
      if (rail) rail.style.setProperty('--draw', '1');
      steps.forEach(function (s) { s.classList.add('is-lit'); });
      return;
    }

    if (rail) {
      ScrollTrigger.create({
        trigger: tl,
        start: 'top 70%',
        end: 'bottom 70%',
        scrub: 0.5,
        onUpdate: function (self) {
          rail.style.setProperty('--draw', self.progress.toFixed(3));
        }
      });
    }

    steps.forEach(function (step) {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 72%',
        onEnter:     function () { step.classList.add('is-lit'); },
        onLeaveBack: function () { step.classList.remove('is-lit'); }
      });
    });
  }

  /* 09. Progress ----------------------------------------------------------- */

  function initProgress() {
    var bar = $('.progress');
    if (!bar) return;

    if (reduced || !hasST) { bar.style.display = 'none'; return; }

    gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
    });
  }

  /* 10. Navigation --------------------------------------------------------- */

  var menu, burger;

  function closeMenu() {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
    document.body.style.overflow = '';
  }

  function openMenu() {
    menu.classList.add('is-open');
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
  }

  function initNav() {
    var nav = $('.nav');
    menu = $('.menu');
    burger = $('.burger');

    if (burger && menu) {
      burger.addEventListener('click', function () {
        if (menu.classList.contains('is-open')) closeMenu(); else openMenu();
      });
      $$('.menu__list a').forEach(function (a, i) {
        a.style.transitionDelay = (0.14 + i * 0.06) + 's';
        a.addEventListener('click', closeMenu);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
      });
    }

    if (!nav) return;

    var last = 0;
    var onScroll = function (y) {
      if (typeof y !== 'number') y = window.scrollY || root.scrollTop || 0;

      // The bar only takes on a surface once the landing screen is behind us.
      nav.classList.toggle('is-stuck', y > window.innerHeight * 0.65);

      if (!menu || !menu.classList.contains('is-open')) {
        nav.classList.toggle('is-hidden', y > last && y > 300);
      }
      last = y;
    };

    if (lenis) lenis.on('scroll', function (e) { onScroll(e.scroll); });
    window.addEventListener('scroll', function () { onScroll(); }, { passive: true });
    onScroll();
  }

  /* 11. Cursor & magnetics -------------------------------------------------- */

  function initCursor() {
    if (!fine || reduced || !hasGSAP) return;

    var dot = document.createElement('div');
    var ring = document.createElement('div');
    dot.className = 'cursor';
    ring.className = 'cursor cursor--ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var dotX  = gsap.quickTo(dot,  'x', { duration: 0.12, ease: 'power3' });
    var dotY  = gsap.quickTo(dot,  'y', { duration: 0.12, ease: 'power3' });
    var ringX = gsap.quickTo(ring, 'x', { duration: 0.6,  ease: 'power3' });
    var ringY = gsap.quickTo(ring, 'y', { duration: 0.6,  ease: 'power3' });

    window.addEventListener('mousemove', function (e) {
      dotX(e.clientX - 4);   dotY(e.clientY - 4);
      ringX(e.clientX - 19); ringY(e.clientY - 19);
    });

    var targets = 'a, button, input, select, textarea, [data-cursor]';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest(targets)) {
        dot.classList.add('is-hover'); ring.classList.add('is-hover');
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest(targets)) {
        dot.classList.remove('is-hover'); ring.classList.remove('is-hover');
      }
    });
    document.addEventListener('mouseleave', function () { gsap.to([dot, ring], { opacity: 0, duration: 0.2 }); });
    document.addEventListener('mouseenter', function () { gsap.to([dot, ring], { opacity: 1, duration: 0.2 }); });
  }

  function initMagnetic() {
    if (!fine || reduced || !hasGSAP) return;

    $$('[data-magnetic], .btn').forEach(function (el) {
      var strength = parseFloat(el.getAttribute('data-magnetic')) || 0.3;
      var xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'elastic.out(1, 0.5)' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'elastic.out(1, 0.5)' });

      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
    });
  }

  /* 11b. Service carousel ----------------------------------------------------- */
  /*
     A slow, seamless right-to-left marquee of the glass cards, with swipe/drag
     and pause-on-interaction.

     Seamless loop: the card set is cloned once, so the track holds two copies.
     The auto-scroll moves one GPU transform (translate3d) leftward; whenever it
     has travelled the width of a single set it snaps forward by that exact width
     — visually continuous because the cloned copy is already in place.

     Drag/swipe shares the same offset variable, so releasing a drag hands the
     position straight back to the auto-scroll with no jump. Vertical gestures
     are left to the browser (touch-action: pan-y) so the page still scrolls.
  */
  function initServiceCarousel() {
    var vp = $('[data-carousel]');
    if (!vp) return;
    var track = $('.carousel__track', vp);
    if (!track) return;

    var originals = $$('.gcard', track);
    if (!originals.length) return;

    // Clone the set once for the seamless wrap. Clones are inert to a11y/tab.
    originals.forEach(function (c) {
      var clone = c.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('tabindex', '-1');
      track.appendChild(clone);
    });

    // Reduced motion: no auto-scroll. Fall back to a plain swipeable scroller.
    if (reduced) {
      vp.classList.add('carousel--static');
      return;
    }

    var half = 0;                          // width of one card set + its gaps
    var measure = function () {
      half = track.scrollWidth / 2;
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);

    var offset = 0;
    var SPEED = 26;                        // px/sec — slow, premium
    var paused = false;
    var dragging = false;
    var moved = false;
    var last = null;
    var downX = 0, downY = 0, startOffset = 0, axis = null, resumeTimer = null;

    var apply = function () { track.style.transform = 'translate3d(' + offset + 'px,0,0)'; };
    var wrap = function () {
      if (!half) return;
      while (offset <= -half) offset += half;
      while (offset > 0) offset -= half;
    };

    function frame(ts) {
      if (last === null) last = ts;
      var dt = (ts - last) / 1000; last = ts;
      // Guard against a huge dt after a background tab, which would jump the track.
      if (dt > 0.1) dt = 0.1;
      // Self-heal: the first measure can run before the cloned cards (and their
      // webfont) have laid out, leaving half at 0. Re-measure until it's real
      // rather than sitting frozen waiting on a load/fonts event that may have
      // already fired.
      if (half <= 0) measure();
      if (!paused && !dragging && half > 0) {
        offset -= SPEED * dt;
        if (offset <= -half) offset += half;
        apply();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // Pause on hover (desktop pointers only).
    if (fine) {
      vp.addEventListener('mouseenter', function () { paused = true; });
      vp.addEventListener('mouseleave', function () { if (!dragging) paused = false; });
    }

    // Swipe / drag via Pointer Events (covers mouse, touch and pen).
    vp.addEventListener('pointerdown', function (e) {
      dragging = false; moved = false; axis = null;
      downX = e.clientX; downY = e.clientY; startOffset = offset;
    });

    vp.addEventListener('pointermove', function (e) {
      if (axis === null) {
        var dx = Math.abs(e.clientX - downX), dy = Math.abs(e.clientY - downY);
        if (dx < 4 && dy < 4) return;
        axis = dx > dy ? 'x' : 'y';        // vertical -> let the page scroll
        if (axis === 'x') {
          dragging = true; paused = true;
          try { vp.setPointerCapture(e.pointerId); } catch (err) {}
        }
      }
      if (axis === 'x' && dragging) {
        offset = startOffset + (e.clientX - downX);
        moved = true;
        wrap();
        apply();
      }
    });

    var endDrag = function () {
      if (!dragging) { axis = null; return; }
      dragging = false; axis = null;
      // A short settle before the auto-scroll resumes, so a flick feels natural.
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () { if (!vp.matches(':hover')) paused = false; }, 900);
    };
    vp.addEventListener('pointerup', endDrag);
    vp.addEventListener('pointercancel', endDrag);

    // A drag must not fire the card's link. Swallow the click only if we moved.
    track.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);

    // Resume cleanly after a background tab.
    document.addEventListener('visibilitychange', function () { last = null; });
  }

  /* 12. Marquee -------------------------------------------------------------- */

  function initMarquee() {
    $$('.marquee').forEach(function (m) {
      var track = $('.marquee__track', m);
      if (!track || track.dataset.cloned) return;
      var clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.dataset.cloned = 'true';
      m.appendChild(clone);
    });
  }

  /* 13. Counters ------------------------------------------------------------- */

  function initCounters() {
    $$('[data-count]').forEach(function (fig) {
      var end = parseFloat(fig.getAttribute('data-count'));
      var suffix = fig.getAttribute('data-suffix') || '';
      // Real figures like "2.8w" and "0.8s" need a decimal place; rounding
      // would print 3w and 1s, which would be wrong, not just imprecise.
      var dp = parseInt(fig.getAttribute('data-decimals') || '0', 10);
      var fmt = function (v) { return dp ? v.toFixed(dp) : String(Math.round(v)); };

      if (reduced || !hasGSAP) { fig.textContent = fmt(end) + suffix; return; }

      var obj = { v: 0 };
      var tween = gsap.to(obj, {
        v: end, duration: 2, ease: 'expo.out', paused: true,
        onUpdate: function () { fig.textContent = fmt(obj.v) + suffix; }
      });

      if (hasST) {
        ScrollTrigger.create({
          trigger: fig, start: 'top 88%', once: true,
          onEnter: function () { tween.play(); }
        });
      } else {
        tween.play();
      }
    });
  }

  /* 14. Form ----------------------------------------------------------------- */

  function initForm() {
    var form = $('[data-form]');
    if (!form) return;

    var status = $('.form__status', form);

    var setError = function (field, msg) {
      var box = field.closest('.field');
      var slot = $('.field__error', box);
      box.classList.toggle('has-error', !!msg);
      if (slot) slot.textContent = msg || '';
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };

    var validate = function () {
      var ok = true;
      $$('[required]', form).forEach(function (field) {
        var val = (field.value || '').trim();
        if (!val) { setError(field, 'This field is required.'); ok = false; }
        else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
          setError(field, 'Enter a valid email address.'); ok = false;
        } else { setError(field, ''); }
      });
      return ok;
    };

    $$('input, select, textarea', form).forEach(function (field) {
      field.addEventListener('input', function () {
        if (field.closest('.field').classList.contains('has-error')) setError(field, '');
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!validate()) {
        if (status) status.textContent = 'Please check the highlighted fields.';
        var firstBad = $('.has-error input, .has-error select', form);
        if (firstBad) firstBad.focus();
        return;
      }

      var endpoint = form.getAttribute('data-endpoint');

      // No endpoint wired up: hand off to the visitor's mail client rather than
      // pretending the message was delivered. Set data-endpoint on the <form>
      // (Formspree, Netlify Forms, your own handler) to POST instead.
      if (!endpoint) {
        var data = new FormData(form);
        var body = [];
        data.forEach(function (v, k) { body.push(k + ': ' + v); });

        if (status) status.textContent = 'Opening your email app to send this across…';
        window.location.href = 'mailto:clients@siteyourstory.com'
          + '?subject=' + encodeURIComponent('New enquiry from siteyourstory.com')
          + '&body=' + encodeURIComponent(body.join('\n'));
        return;
      }

      if (status) status.textContent = 'Sending…';

      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('Request failed');
          form.reset();
          if (status) status.textContent = 'Thank you — we’ll come back to you within 24 hours.';
        })
        .catch(function () {
          if (status) status.textContent = 'That didn’t send. Please email clients@siteyourstory.com directly.';
        });
    });
  }

  /* 15. Page transitions ------------------------------------------------------ */

  function initTransitions() {
    var curtain = $('.curtain');
    if (!curtain) return;

    // No cover-on-arrival: the old intro wipe read as a harsh flash. The page
    // simply appears (content reveals handle the entrance). The curtain is kept
    // only as a soft LIGHT veil for link navigation below.
    if (reduced) return;

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (!a) return;

      var href = a.getAttribute('href');
      if (!href
        || a.target === '_blank'
        || a.hasAttribute('download')
        || href.charAt(0) === '#'
        || /^(mailto:|tel:|https?:)/i.test(href)
        || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

      e.preventDefault();
      curtain.classList.remove('is-lifting');
      curtain.classList.add('is-covering');
      setTimeout(function () { window.location.href = href; }, 560);
    });

    window.addEventListener('pageshow', function (ev) {
      if (ev.persisted) {
        curtain.classList.remove('is-covering');
        curtain.classList.add('is-lifting');
      }
    });
  }

  /* 11c. Services index — developing photo viewer ----------------------------- */
  /*
     The ten services read as an editorial index. A sticky viewer on the left
     holds one photograph per service; as the active row changes — by hover on a
     desktop pointer, or by scroll position on any device — the matching frame
     cross-fades in and DEVELOPS from grey to full colour (the story, developing).
     No layout depends on JS: without it the first frame simply stays shown and
     every row is a normal link.
  */
  function initServicesIndex() {
    var wrap = $('.services');
    if (!wrap) return;

    var rows = $$('.svcx__row', wrap);
    var imgs = $$('.sviewer__img', wrap);
    var capIdx = $('.sviewer__idx', wrap);
    var capLab = $('.sviewer__lab', wrap);
    if (!rows.length || !imgs.length) return;

    var byKey = {};
    imgs.forEach(function (im) { byKey[im.getAttribute('data-key')] = im; });

    var current = null;
    function activate(row) {
      if (row === current) return;
      current = row;
      rows.forEach(function (r) { r.classList.toggle('is-active', r === row); });
      var target = byKey[row.getAttribute('data-key')];
      imgs.forEach(function (im) { im.classList.toggle('is-active', im === target); });
      if (capIdx) capIdx.textContent = row.getAttribute('data-idx') || '';
      if (capLab) capLab.textContent = row.getAttribute('data-lab') || '';
    }

    // Desktop pointer: hover leads. Keyboard: focus leads. Both devices also get
    // the scroll driver below, so the viewer keeps pace when nobody is hovering.
    rows.forEach(function (row) {
      if (fine) row.addEventListener('mouseenter', function () { activate(row); });
      row.addEventListener('focus', function () { activate(row); });
      // Services are informational — the only primary CTA is "Tell us your story".
      // Swallow the click (capture, before the page-transition handler) so the
      // row reacts and animates but never navigates.
      row.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); }, true);
    });

    if (hasST && !reduced) {
      rows.forEach(function (row) {
        ScrollTrigger.create({
          trigger: row, start: 'top 62%', end: 'bottom 45%',
          onEnter:     function () { activate(row); },
          onEnterBack: function () { activate(row); }
        });
      });
    }
  }

  /* 11d. Process filmstrip — pinned horizontal scroll ------------------------- */
  /*
     The centrepiece. On a wide screen the section pins and the four step frames
     translate horizontally as the page scrolls — one scroll gesture walks the
     whole process, a filmstrip advancing frame by frame. The travel and the end
     distance are read fresh on every refresh so it survives font-load and resize.

     Below 900px, on reduced motion, or without ScrollTrigger, nothing pins: the
     base CSS leaves the frames as a snap-scrolling swipe strip, which is the
     right interaction on a phone anyway.
  */
  function initProcessFilmstrip() {
    var proc = $('.proc');
    if (!proc) return;

    var viewport = $('.proc__viewport', proc);
    var track    = $('.proc__track', proc);
    var pin      = $('.proc__pin', proc);
    var railFill = $('.proc__rail-fill', proc);
    if (!viewport || !track || !pin) return;

    var canPin = hasST && !reduced && window.matchMedia('(min-width: 900px)').matches;
    if (!canPin) return;

    proc.classList.add('is-pinned');

    var distance = function () { return Math.max(0, track.scrollWidth - viewport.clientWidth); };

    gsap.to(track, {
      x: function () { return -distance(); },
      ease: 'none',
      scrollTrigger: {
        trigger: proc,
        start: 'top top',
        end: function () { return '+=' + distance(); },
        pin: pin,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          if (railFill) railFill.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')';
        }
      }
    });
  }

  /* 11e. Built-For gallery — pinned horizontal scroll ------------------------- */
  /*
     Same pinned-horizontal mechanic as the process filmstrip but for the "who
     we build for" rooms. Kept as its own function so the two can diverge; the
     process section is a vertical timeline, this one walks sideways.
  */
  function initHGallery() {
    var gal = $('.hgal');
    if (!gal) return;

    var viewport = $('.hgal__viewport', gal);
    var track    = $('.hgal__track', gal);
    var pin      = $('.hgal__pin', gal);
    var railFill = $('.hgal__rail-fill', gal);
    if (!viewport || !track || !pin) return;

    var canPin = hasST && !reduced && window.matchMedia('(min-width: 900px)').matches;
    if (!canPin) return;

    gal.classList.add('is-pinned');

    // Subtle mouse-depth: cards drift a few px against the cursor, staggered by
    // column, so the strip reads with parallax depth rather than as flat tiles.
    if (fine && hasGSAP) {
      var cards = $$('.ind', gal);
      var setters = cards.map(function (c) {
        return { y: gsap.quickTo(c, 'y', { duration: 0.9, ease: 'power3' }) };
      });
      gal.addEventListener('mousemove', function (e) {
        var r = gal.getBoundingClientRect();
        var my = (e.clientY - r.top) / r.height - 0.5;
        cards.forEach(function (c, i) { setters[i].y(my * (((i % 3) - 1) * -12)); });
      });
      gal.addEventListener('mouseleave', function () { setters.forEach(function (s) { s.y(0); }); });
    }

    var distance = function () { return Math.max(0, track.scrollWidth - viewport.clientWidth); };

    gsap.to(track, {
      x: function () { return -distance(); },
      ease: 'none',
      scrollTrigger: {
        trigger: gal,
        start: 'top top',
        end: function () { return '+=' + distance(); },
        pin: pin,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          if (railFill) railFill.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')';
        }
      }
    });
  }

  /* 11h. Businesses showcase — 3D curved coverflow ---------------------------- */
  /*
     Eight cards arranged on a curved path in 3D. Each frame every card is placed
     from a single float `pos`: sine/cosine put it on an arc (curved travel +
     recede), rotateY tilts it, scale/opacity/blur fall off from centre, so the
     card at the middle is large, sharp and lit while the rest angle away with
     depth blur and soft shadow. `pos` eases toward `target` with a spring lerp,
     so motion accelerates and settles naturally — never a hard slider step.

     Desktop pins the section and maps scroll to `target` (a walk through the
     gallery) plus a mouse-tilt parallax on the whole stage. Touch drags it with
     momentum and snaps to the nearest card. Reduced motion falls back to a plain
     horizontal snap strip (CSS only).
  */
  function initShowcase3d() {
    var sec = $('.show3d');
    if (!sec) return;
    var scroll = $('.show3d__scroll', sec);
    var track = $('.show3d__track', sec);
    var cards = $$('.card3d', sec);
    var dotsWrap = $('.show3d__dots', sec);
    // On phones the scroll-driven coverflow needs a 300vh pin to advance, which
    // reads as a huge empty scroll gap before Services. Below 640px we hand the
    // section to CSS instead: a static, swipeable horizontal row (see the mobile
    // rules in section 51), so it takes only its own height and flows straight
    // into the next section.
    var smallScreen = window.matchMedia('(max-width: 640px)').matches;
    if (!scroll || !track || !cards.length || reduced || smallScreen) return;

    var N = cards.length;
    var anglePer = 360 / N;

    if (dotsWrap) {
      cards.forEach(function (_, i) {
        var d = document.createElement('span');
        d.className = 'show3d__dot' + (i === 0 ? ' is-on' : '');
        dotsWrap.appendChild(d);
      });
    }
    var dots = $$('.show3d__dot', sec);

    // Heading pieces + the cinematic-intro state. `intro.r` scales the ring's
    // radius (cards start collapsed at centre and expand out with depth) and
    // `intro.a` fades the cards in; both are tweened by playIntro(). Without
    // GSAP they start at their finished values so nothing stays hidden.
    var l1      = $('.show3d__l1', sec);
    var l2      = $('.show3d__l2', sec);
    var eyebrow = $('.hgal__eyebrow', sec);
    var intro = { r: 0.0001, a: 0 };
    var introGo = hasGSAP && !reduced;
    var introPlayed = false;
    if (!introGo) { intro.r = 1; intro.a = 1; }
    else {
      // Hide the heading up front so it can rise/slide in rather than flash.
      if (eyebrow) gsap.set(eyebrow, { opacity: 0 });
      if (l1) gsap.set(l1, { opacity: 0 });
      if (l2) gsap.set(l2, { opacity: 0 });
    }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

    /*
      FLOATING BOARDS ON A CURVED SPLINE — not a ring, not a carousel.

      Each card is placed from a single continuous position `p` measured from the
      centre of the path. `s` is the scene's offset (scroll + a slow idle drift);
      a card's p = wrap(i - s) folded into [-N/2, N/2). As `s` advances every card
      slides along the path — entering from the far side, curving forward to the
      centre where it becomes the sharp, lit hero, then continuing on and away.
      Cards fade to nothing before the fold point, so the wrap is invisible and
      the motion reads as endless. No rot'n-around-a-circle, no visible loop.
    */
    var SPACING = 340;                 // horizontal gap between neighbours (px)
    var EDGE = 2.7;                    // half-window: cards beyond this are hidden
    var FADE = 1.0;                    // how far from EDGE the fade spans
    function measure() {
      var cw = cards[0].offsetWidth || 280;
      SPACING = cw * 1.16;             // just past the hero's width — visible, no mess
    }
    measure();

    var s = 0, idle = 0, lastFront = -1;
    var inView = true, running = false, scrolling = false, stopTimer = null;
    var AUTO = 0.0016;                 // idle drift (cards / frame) — slow, premium

    function wrap(x) {
      var h = N / 2;
      return ((x + h) % N + N) % N - h;
    }

    // 0 at the top of the sticky region, 1 at the bottom: scrolling the section
    // advances the scene by N (one full pass through the boards).
    function progress() {
      var r = scroll.getBoundingClientRect();
      var travel = r.height - window.innerHeight;
      if (travel <= 0) return 0;
      return clamp(-r.top / travel, 0, 1);
    }

    function render() {
      var target = progress() * N + idle;
      s += (target - s) * 0.085;                 // heavy, eased — every scroll glides
      var t = performance.now() / 1000;

      var front = -1, frontAbs = 1e9;
      for (var i = 0; i < N; i++) {
        var p = wrap(i - s);
        var ap = Math.abs(p);
        var d = Math.cos(clamp(p / EDGE, -1, 1) * Math.PI / 2);   // 1 centre -> 0 edge
        var tx = p * SPACING;
        var ty = (1 - d) * 30 + Math.sin(t * 0.5 + i * 1.7) * 7;  // gentle arc + float
        var scale = 0.58 + d * 0.5;                               // hero largest
        var ry = clamp(-p * 13, -34, 34);                         // boards turn on the path
        var op = smooth((EDGE - ap) / FADE) * intro.a;            // fade before the fold

        var c = cards[i];
        c.style.transform =
          'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) ' +
          'rotateY(' + ry.toFixed(2) + 'deg) scale(' + (scale * (0.9 + 0.1 * intro.r)).toFixed(3) + ')';
        c.style.opacity = op.toFixed(3);
        c.style.zIndex = Math.round(d * 100);
        c.style.pointerEvents = op > 0.5 ? 'auto' : 'none';

        if (ap < frontAbs) { frontAbs = ap; front = i; }
      }

      if (front !== lastFront) {
        lastFront = front;
        cards.forEach(function (c, i) { c.classList.toggle('is-center', i === front); });
        dots.forEach(function (dd, i) { dd.classList.toggle('is-on', i === front); });
      }
    }

    function frame() {
      if (!scrolling) idle += AUTO;            // keeps flowing when nobody scrolls
      render();
      if (inView) requestAnimationFrame(frame); else running = false;
    }
    function start() { if (!running && inView) { running = true; requestAnimationFrame(frame); } }

    render();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { inView = e.isIntersecting; if (inView) start(); });
      }, { threshold: 0 }).observe(sec);
    }
    start();

    // The cinematic intro. Heading rises, the serif line slides in a beat later,
    // then the cards expand out of the centre with depth and the ring's floating
    // rotation takes over — a staged first impression rather than everything at
    // once. Fires once as the section arrives; the rAF loop above reads intro.r
    // / intro.a every frame, so the card motion stays perfectly in sync.
    function playIntro() {
      if (introPlayed) return; introPlayed = true;
      if (!introGo) { intro.r = 1; intro.a = 1; return; }
      var tl = gsap.timeline();
      if (eyebrow) tl.fromTo(eyebrow, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, 0.0);
      if (l1) tl.fromTo(l1, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.95, ease: 'expo.out' }, 0.05);
      if (l2) tl.fromTo(l2, { xPercent: -7, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 1.0, ease: 'expo.out' }, 0.34);
      tl.to(intro, { r: 1, a: 1, duration: 1.15, ease: 'power3.out' }, 0.6);
    }

    if (hasST) {
      ScrollTrigger.create({ trigger: sec, start: 'top 65%', once: true, onEnter: playIntro });
      // If the section is already on screen at load (short page / anchor jump),
      // onEnter won't fire — play it straight away so nothing stays hidden.
      if (sec.getBoundingClientRect().top < window.innerHeight * 0.65) playIntro();
    } else {
      playIntro();
    }

    function onScroll() {
      scrolling = true;
      clearTimeout(stopTimer);
      stopTimer = setTimeout(function () { scrolling = false; }, 160);
      start();
    }
    if (lenis) lenis.on('scroll', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });

    window.addEventListener('resize', function () { measure(); render(); });
    // Re-measure once everything has settled (webfont/layout), in case the first
    // read of the card width happened before the responsive size applied.
    window.addEventListener('load', function () { measure(); render(); });
  }

  /* 11f. Process timeline — vertical cinematic reveal -------------------------- */
  /*
     The four steps as an alternating editorial timeline. Each step's image
     wipes up behind a clip-path mask while its number/title/copy rise; the
     centre rail fills to accent as the section is scrubbed. Without ScrollTrigger
     or under reduced motion everything is simply shown.
  */
  function initProcessTimeline() {
    var wrap = $('.ptime');
    if (!wrap) return;

    var steps = $$('.pstep', wrap);
    var fill  = $('.ptime__rail-fill', wrap);
    var list  = $('.ptime__list', wrap);

    if (reduced || !hasST) {
      steps.forEach(function (s) { s.classList.add('is-in'); });
      if (fill) fill.style.height = '100%';
      return;
    }

    steps.forEach(function (s) {
      ScrollTrigger.create({
        trigger: s, start: 'top 80%', once: true,
        onEnter: function () { s.classList.add('is-in'); }
      });
    });

    if (fill && list) {
      ScrollTrigger.create({
        trigger: list, start: 'top 68%', end: 'bottom 78%', scrub: 0.6,
        onUpdate: function (self) { fill.style.height = (self.progress * 100).toFixed(2) + '%'; }
      });
    }

    // Safety net: a step whose trigger never fired must never sit invisible.
    // Anything already within the viewport after load is shown regardless.
    setTimeout(function () {
      steps.forEach(function (s) {
        if (!s.classList.contains('is-in') && s.getBoundingClientRect().top < window.innerHeight) {
          s.classList.add('is-in');
        }
      });
    }, 1400);
  }

  /* 11g. Cinematic section wipe — Services -> Why ----------------------------- */
  /*
     A dark curtain, led by a glowing accent edge, is driven straight through the
     viewport as the Why-Us section enters: it rises from below to cover the light
     Services screen, then continues up and off to reveal the dark chapter beneath.
     One scrubbed transform, so it tracks the scrollbar exactly and reverses on the
     way back up. Fixed and pointer-events:none, so it never blocks interaction.
  */
  function initSectionWipe() {
    if (!hasST || reduced) return;

    // Each .cwipe names the incoming section via data-wipe. Its panel is driven
    // straight through the viewport as that section enters: +viewport (hidden
    // below) through 0 (fully covering) to -viewport (gone above, revealed).
    // Explicit pixel travel, re-measured on refresh so it stays exact on resize.
    $$('.cwipe').forEach(function (cw) {
      var panel = $('.cwipe__panel', cw);
      var target = $(cw.getAttribute('data-wipe') || '');
      if (!panel || !target) return;
      gsap.fromTo(panel,
        { y: function () { return window.innerHeight; } },
        { y: function () { return -window.innerHeight; }, ease: 'none',
          scrollTrigger: { trigger: target, start: 'top bottom', end: 'top top', scrub: true, invalidateOnRefresh: true } });
    });
  }

  /* 11i. Fixed bottom-nav pill — reveal past the hero -------------------------- */
  function initBottomNav() {
    var nav = $('.botnav');
    if (!nav) return;
    var landing = $('.landing');
    var upd = function (y) {
      if (typeof y !== 'number') y = window.scrollY || root.scrollTop || 0;
      var past = landing ? y > landing.offsetHeight * 0.85 : y > 300;
      nav.classList.toggle('is-shown', past);
    };
    if (lenis) lenis.on('scroll', function (e) { upd(e.scroll); });
    window.addEventListener('scroll', function () { upd(); }, { passive: true });
    upd();
  }

  /* 11j. Mouse-trail over the contact scene ----------------------------------- */
  /*
     Ported from the landing prompt's "Partner" interaction: existing work
     thumbnails spawn at the cursor and fade + rotate out. Decorative, desktop-
     only, throttled; sits behind the copy so nothing becomes less readable.
  */
  function initMouseTrail() {
    if (!fine || reduced) return;
    var zone = $('.closing');
    if (!zone) return;
    var names = ['work-workspace', 'work-code', 'work-branding', 'work-mobile',
                 'work-industrial', 'work-spa', 'work-atrium', 'work-desk',
                 'work-pilates', 'work-agency'];
    var last = 0;
    zone.addEventListener('mousemove', function (e) {
      var now = performance.now();
      if (now - last < 80) return;
      last = now;
      var r = zone.getBoundingClientRect();
      var t = document.createElement('img');
      t.className = 'trailthumb';
      t.setAttribute('aria-hidden', 'true');
      t.src = 'assets/img/work/' + names[(Math.random() * names.length) | 0] + '.jpg';
      t.style.left = (e.clientX - r.left) + 'px';
      t.style.top = (e.clientY - r.top) + 'px';
      t.style.setProperty('--rot', (Math.random() * 20 - 10).toFixed(1) + 'deg');
      zone.appendChild(t);
      t.addEventListener('animationend', function () { t.remove(); });
    });
  }

  /* 11k. Parallax layers — the continuous-canvas depth ------------------------ */
  /*
     Any [data-parallax] element eases along Y as it crosses the viewport, at a
     fraction of the host's height given by the attribute (0.1 = gentle, 0.2 =
     stronger). Media carries the largest values so images LEAD; text and UI use
     the smaller scene drift, so nothing hard-switches — the whole page reads as
     one moving canvas. Amplitude is clamped to any overscan an absolutely-sized
     image has, so a parallax layer never reveals its own edge.
  */
  function initParallax() {
    if (reduced || !hasST) return;

    $$('[data-parallax]').forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.12;
      var host = el.parentElement || el;

      var amp = function () {
        var base = (host.offsetHeight || window.innerHeight) * speed;
        if (getComputedStyle(el).position === 'absolute') {
          // Clamp to the slack this layer overscans its container by, less a
          // couple of pixels, so a scale/overscan image never shows an edge.
          var over = (el.offsetHeight - (host.clientHeight || host.offsetHeight)) / 2 - 2;
          base = over > 0 ? Math.min(base, over) : 0;
        }
        return base;
      };

      gsap.fromTo(el,
        { y: function () { return amp(); } },
        {
          y: function () { return -amp(); },
          ease: 'none',
          scrollTrigger: {
            trigger: host, start: 'top bottom', end: 'bottom top',
            scrub: true, invalidateOnRefresh: true
          }
        });
    });
  }

  /* 11l. Glass sheen — pointer light across the bento tiles -------------------- */
  /*
     Writes --mx/--my on each glass tile so the CSS radial sheen tracks the
     cursor. Desktop pointers only; on touch there is no hover to reveal it.
  */
  function initGlassSheen() {
    if (!fine || reduced) return;
    $$('.bcell').forEach(function (cell) {
      cell.addEventListener('mousemove', function (e) {
        var r = cell.getBoundingClientRect();
        cell.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        cell.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
    });
  }

  /* 11m. Why spotlight — a warm light tracking the pointer --------------------- */
  /*
     The Why chapter comes alive under the cursor: --mx/--my set on the section
     move a soft warm spotlight (CSS .why__spot) across the standards. The custom
     properties inherit down to the spotlight layer.
  */
  function initWhySpotlight() {
    if (!fine || reduced) return;
    var why = $('.why');
    if (!why) return;
    // Set directly — the spotlight tracks the cursor 1:1. --mx/--my inherit down
    // to the .why__spot layer, whose gradient reads them for its centre.
    why.addEventListener('mousemove', function (e) {
      var r = why.getBoundingClientRect();
      why.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      why.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  }

  /* 11n. Card tilt — a few degrees of 3D toward the pointer -------------------- */
  /*
     A restrained parallax tilt on the glass cards. Desktop pointers only; the
     card also lifts a touch while hovered. gsap owns the transform so it never
     fights the CSS hover shadow/border, and eases back to flat on leave.
  */
  function initTilt() {
    if (!fine || reduced || !hasGSAP) return;
    $$('[data-tilt]').forEach(function (el) {
      var rx, ry, yy, ready = false;

      // Deferred to the first hover so nothing writes an inline transform before
      // the scroll reveal has finished — otherwise the card would skip its rise.
      var arm = function () {
        if (ready) return;
        gsap.set(el, { transformPerspective: 900, transformOrigin: 'center' });
        rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
        ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
        yy = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
        ready = true;
      };

      el.addEventListener('mouseenter', arm);
      el.addEventListener('mousemove', function (e) {
        if (!ready) return;
        var r = el.getBoundingClientRect();
        var px = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var py = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        rx(-py * 4);           // a few degrees, never more
        ry(px * 5);
        yy(-6);                // the hover lift, owned here so CSS can't collide
      });
      el.addEventListener('mouseleave', function () { if (ready) { rx(0); ry(0); yy(0); } });
    });
  }

  /* 11o. Hero scroll-scrub — the video timeline is driven by scroll ----------- */
  /*
     The hero clip does not autoplay. Its first frame shows at rest; scrolling
     down advances currentTime, scrolling up reverses it — the scroll position
     maps linearly to the video timeline. A seek "pump" keeps at most ONE seek
     outstanding (issuing a new one only after `seeked`), which self-throttles to
     whatever the decoder can deliver and keeps the scrub smooth rather than
     queuing seeks faster than they retire. Reduced motion / no-ST just plays it.
  */
  function initHeroScrub() {
    var landing = $('.landing');
    if (!landing) return;
    var video = $('.landing__video', landing);
    if (!video || !video.hasAttribute('data-scrub')) return;

    video.pause();
    try { video.removeAttribute('autoplay'); } catch (e) {}

    // Reduced motion / no ScrollTrigger: hold the first frame (a clean poster).
    if (reduced || !hasST) {
      var hold = function () { try { video.currentTime = 0.001; } catch (e) {} };
      if (video.readyState >= 1) hold(); else video.addEventListener('loadedmetadata', hold, { once: true });
      return;
    }

    var dur = 0, target = 0, last = -1, seeking = false;
    var setDur = function () { dur = video.duration || 0; };
    if (video.readyState >= 1) setDur();
    video.addEventListener('loadedmetadata', function () { setDur(); try { video.currentTime = 0.001; } catch (e) {} }, { once: true });
    try { video.load(); } catch (e) {}

    function pump() {
      if (seeking || !dur) return;
      // Clamp a hair inside the ends so the decoder always has a frame to show.
      var t = Math.max(0.001, Math.min(dur - 0.05, target));
      if (Math.abs(t - last) < 0.015) return;
      seeking = true;
      var onSeeked = function () {
        video.removeEventListener('seeked', onSeeked);
        last = video.currentTime;
        seeking = false;
        pump();                       // chase the latest target
      };
      video.addEventListener('seeked', onSeeked);
      try { video.currentTime = t; } catch (e) { seeking = false; }
    }

    // Map the hero's own scroll span (its one viewport) to the whole clip.
    gsap.to({}, {
      ease: 'none',
      scrollTrigger: {
        trigger: landing, start: 'top top', end: 'bottom top', scrub: 0.6,
        onUpdate: function (self) {
          if (!dur) setDur();
          target = self.progress * (dur || 0);
          pump();
        }
      }
    });
  }

  /* 16. Boot ------------------------------------------------------------------ */

  function initYear() {
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  var typeBooted = false;

  function bootType() {
    if (typeBooted) return;
    typeBooted = true;

    safe('splitHeadings', initSplitHeadings);
    safe('stagger',       initStagger);
    safe('reveals',       initReveals);

    if (hasST) safe('refresh', function () { ScrollTrigger.refresh(); });

    // Nothing may stay invisible because a trigger never fired or a heading
    // never got split. Headings are unconditional — CSS hides them, so only
    // JS can bring them back.
    setTimeout(function () {
      $$('[data-split]').forEach(function (el) {
        if (getComputedStyle(el).opacity === '0') el.style.opacity = '1';

        // A heading already on screen whose trigger never fired would sit with
        // its lines parked below the baseline — invisible at best, ghosting at
        // worst. Snap those to their finished state.
        if (el._splitTween && el._splitTween.progress() === 0 &&
            el.getBoundingClientRect().top < window.innerHeight) {
          el._splitTween.progress(1);
        }
      });
      $$('[data-reveal]:not(.is-in), .mask:not(.is-in)').forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
      });
    }, 1200);
  }

  function initType() {
    // Splitting before the webfont lands freezes one word per line, and those
    // line boxes never re-flow.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(bootType);
      setTimeout(bootType, 2500);
    } else {
      bootType();
    }
  }

  function init() {
    safe('smoothScroll',    initSmoothScroll);
    safe('nav',             initNav);
    safe('marquee',         initMarquee);
    safe('type',            initType);
    safe('landing',         initLanding);
    safe('heroScrub',       initHeroScrub);
    safe('film',            initFilm);
    // Must follow initFilm (which configures the clip) and initLanding.
    safe('mobileVideo',     initMobileVideoOrchestration);
    safe('sceneTransition', initSceneTransition);
    safe('timeline',        initTimeline);
    safe('progress',        initProgress);
    safe('counters',        initCounters);
    safe('cursor',          initCursor);
    safe('magnetic',        initMagnetic);
    safe('serviceCarousel', initServiceCarousel);
    safe('servicesIndex',   initServicesIndex);
    safe('showcase3d',      initShowcase3d);
    safe('processTimeline', initProcessTimeline);
    safe('bottomNav',       initBottomNav);
    safe('mouseTrail',      initMouseTrail);
    safe('parallax',        initParallax);
    safe('glassSheen',      initGlassSheen);
    safe('whySpotlight',    initWhySpotlight);
    safe('tilt',            initTilt);
    safe('form',            initForm);
    safe('anchors',         initAnchors);
    safe('transitions',     initTransitions);
    safe('year',            initYear);

    if (hasST) {
      window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    }
  }

  var resizeTimer;
  var lastW = window.innerWidth;

  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      // Ignore pure height changes — mobile URL bars fire those constantly.
      if (window.innerWidth !== lastW) {
        lastW = window.innerWidth;
        splits.forEach(function (s) { s.revert(); });
        splits.length = 0;
        $$('[data-split]').forEach(function (el) { el.style.opacity = ''; });
        safe('resplit', initSplitHeadings);
      }
      if (hasST) ScrollTrigger.refresh();
    }, 240);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
