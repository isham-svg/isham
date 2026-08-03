/* =============================================================================
   SiTech — interaction layer
   Progressive enhancement: works without GSAP/Lenis, respects reduced motion.
   ========================================================================== */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------- Year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Opening animation ---------- */
  (function intro() {
    var el = $("#intro");
    if (!el) return;
    var seen = false;
    try { seen = sessionStorage.getItem("sitech_intro") === "1"; } catch (e) {}
    function finish() {
      el.classList.add("is-done");
      try { sessionStorage.setItem("sitech_intro", "1"); } catch (e) {}
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 700);
    }
    if (seen || reduce) { el.parentNode && el.parentNode.removeChild(el); return; }

    root.classList.add("is-intro");
    var grid = $(".intro__grid", el),
        lines = $$(".bp-line", el),
        nodes = $$(".bp-node", el),
        diamond = $(".bp-diamond", el),
        fill = $(".bp-fill", el),
        word = $(".intro__word", el);
    var A = window.Animation ? true : (typeof Element.prototype.animate === "function");

    if (!A) { setTimeout(finish, 400); return; }
    var E = "cubic-bezier(.22,.61,.36,1)";
    grid.animate([{ opacity: 0, transform: "scale(1.04)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 700, easing: E, fill: "forwards" });

    lines.forEach(function (ln, i) {
      var len = 0; try { len = ln.getTotalLength(); } catch (e) { len = 120; }
      ln.style.strokeDasharray = len; ln.style.strokeDashoffset = len;
      ln.animate([{ strokeDashoffset: len, opacity: .2 }, { strokeDashoffset: 0, opacity: .55 }],
        { duration: 620, delay: 260 + i * 60, easing: E, fill: "forwards" });
    });
    nodes.forEach(function (n, i) {
      n.animate([{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "scale(1)" }],
        { duration: 360, delay: 480 + i * 60, easing: E, fill: "forwards" });
      n.style.transformOrigin = "center";
    });
    diamond.animate([{ opacity: 0, transform: "scale(.6) rotate(45deg)" }, { opacity: 1, transform: "scale(1) rotate(45deg)" }],
      { duration: 620, delay: 1000, easing: E, fill: "forwards" });
    diamond.style.transformOrigin = "100px 70px";
    fill.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 520, delay: 1320, easing: E, fill: "forwards" });
    fill.style.transformOrigin = "100px 70px";
    word.animate([{ opacity: 0, letterSpacing: ".2em" }, { opacity: 1, letterSpacing: ".4em" }],
      { duration: 700, delay: 1500, easing: E, fill: "forwards" });

    var skip = $("[data-intro-skip]", el);
    if (skip) skip.addEventListener("click", finish);
    setTimeout(finish, 2650);
  })();

  /* ---------- Smooth scroll (Lenis) ---------- */
  var lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (window.gsap && window.ScrollTrigger) { lenis.on("scroll", window.ScrollTrigger.update); }
  }

  /* ---------- Anchor navigation ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      var t = doc.getElementById(id.slice(1));
      if (!t) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(t, { offset: -70 });
      else t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });

  /* ---------- Nav stuck + bottom CTA ---------- */
  var nav = $("#nav"), botcta = $(".botcta"), lastY = 0;
  function onScroll() {
    var y = window.pageYOffset || doc.documentElement.scrollTop;
    if (nav) nav.classList.toggle("is-stuck", y > 30);
    if (botcta) botcta.classList.toggle("is-vis", y > window.innerHeight * 0.85);
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var burger = $(".burger"), menu = $("#menu");
  function openMenu() { root.classList.add("is-open"); menu && menu.classList.add("is-open"); doc.body.classList.add("is-locked"); burger && burger.setAttribute("aria-expanded", "true"); }
  function closeMenu() { root.classList.remove("is-open"); menu && menu.classList.remove("is-open"); doc.body.classList.remove("is-locked"); burger && burger.setAttribute("aria-expanded", "false"); }
  if (burger) burger.addEventListener("click", function () { root.classList.contains("is-open") ? closeMenu() : openMenu(); });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  /* ---------- Reveal on scroll (IntersectionObserver) ---------- */
  function applyDelay(el) {
    var d = el.getAttribute("data-delay");
    if (d) el.style.transitionDelay = (parseFloat(d) / 1000) + "s";
  }
  if (reduce || !("IntersectionObserver" in window)) {
    $$("[data-reveal],[data-reveal-stagger]").forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add("is-in");
        if (el.hasAttribute("data-reveal-stagger")) {
          Array.prototype.forEach.call(el.children, function (child, i) {
            child.style.transitionDelay = (i * 0.07) + "s";
          });
        }
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    $$("[data-reveal]").forEach(function (el) { applyDelay(el); io.observe(el); });
    $$("[data-reveal-stagger]").forEach(function (el) { io.observe(el); });
  }

  /* ---------- Process step dots ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); pio.unobserve(en.target); } });
    }, { threshold: 0.4 });
    $$("[data-proc]").forEach(function (el) { pio.observe(el); });
  } else {
    $$("[data-proc]").forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Counters ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    var dec = (el.getAttribute("data-count").split(".")[1] || "").length;
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = target.toFixed(dec) + suffix; return; }
    var start = performance.now(), dur = 1400;
    function step(now) {
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * e).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { animateCount(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.6 });
    $$("[data-count]").forEach(function (el) { cio.observe(el); });
  } else {
    $$("[data-count]").forEach(animateCount);
  }

  /* ---------- Parallax ---------- */
  var pxEls = $$("[data-parallax]");
  if (pxEls.length && !reduce) {
    var ticking = false;
    function px() {
      var vh = window.innerHeight;
      pxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var amt = parseFloat(el.getAttribute("data-parallax")) || 0.08;
        var mid = r.top + r.height / 2, off = (mid - vh / 2) * amt * -1;
        el.style.transform = (el.dataset.baseTransform || "") + " translateY(" + off.toFixed(1) + "px)";
      });
      ticking = false;
    }
    pxEls.forEach(function (el) {
      var cs = getComputedStyle(el).transform;
      el.dataset.baseTransform = el.classList.contains("hero__product") ? "translate(-50%,-50%) rotate(-8deg)" : "";
    });
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(px); } }, { passive: true });
    px();
  }

  /* ---------- Tilt ---------- */
  if (!reduce && window.matchMedia("(pointer:fine)").matches) {
    $$("[data-tilt]").forEach(function (el) {
      var raf = null;
      el.style.transition = "transform .3s cubic-bezier(.22,.61,.36,1)";
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - .5) * -5;
        var ry = ((e.clientX - r.left) / r.width - .5) * 5;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          el.style.transform = "perspective(1000px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
        });
      });
      el.addEventListener("pointerleave", function () {
        if (raf) cancelAnimationFrame(raf);
        el.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
      });
    });
  }

  /* ---------- FAQ accordion ---------- */
  $$("[data-faq] .faq__item").forEach(function (item) {
    var btn = $(".faq__q", item), panel = $(".faq__a", item), inner = $(".faq__a-inner", item);
    btn.addEventListener("click", function () {
      var open = item.classList.contains("is-open");
      // close siblings
      $$("[data-faq] .faq__item.is-open").forEach(function (o) {
        if (o !== item) { o.classList.remove("is-open"); $(".faq__q", o).setAttribute("aria-expanded", "false"); $(".faq__a", o).style.height = "0px"; }
      });
      if (open) { item.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); panel.style.height = "0px"; }
      else { item.classList.add("is-open"); btn.setAttribute("aria-expanded", "true"); panel.style.height = inner.offsetHeight + "px"; }
    });
  });

  /* ---------- Video facade ---------- */
  $$("[data-video]").forEach(function (frame) {
    var btn = $(".video__play", frame), id = frame.getAttribute("data-vimeo");
    function play() {
      if (frame.classList.contains("is-playing")) return;
      var iframe = doc.createElement("iframe");
      iframe.src = "https://player.vimeo.com/video/" + id + "?autoplay=1&title=0&byline=0&portrait=0";
      iframe.allow = "autoplay; fullscreen; picture-in-picture";
      iframe.setAttribute("allowfullscreen", "");
      iframe.title = "SiTech Corp Overview";
      frame.classList.add("is-playing");
      frame.appendChild(iframe);
    }
    if (btn) btn.addEventListener("click", play);
  });
})();
