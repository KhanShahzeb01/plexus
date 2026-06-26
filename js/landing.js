/**
 * Plexus landing — scroll reveals, nav show/hide, 3D cards, carousel drag
 */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ─── Scroll reveal ─────────────────────────────────────────────
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && !prefersReduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // ─── Nav: hide on scroll down, show on scroll up ───────────────
  const nav = document.getElementById("site-nav");
  const darkSections = document.querySelectorAll(".section-dark, .section-faq");
  let lastY = window.scrollY;
  let ticking = false;

  function updateNav() {
    const y = window.scrollY;
    if (y > lastY && y > 120) {
      nav.classList.add("nav-hidden");
    } else {
      nav.classList.remove("nav-hidden");
    }
    lastY = y;

    const navRect = nav.getBoundingClientRect();
    const navBottom = navRect.bottom;
    let onDark = false;
    darkSections.forEach((sec) => {
      const r = sec.getBoundingClientRect();
      if (r.top < navBottom && r.bottom > 0) onDark = true;
    });
    nav.classList.toggle("nav-on-dark", onDark);
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(updateNav);
        ticking = true;
      }
    },
    { passive: true }
  );
  updateNav();

  // ─── Hero terminal: 3D rig tilt + dynamic glare ──────────────
  const heroVisual = document.getElementById("hero-visual");
  const terminalTilt = document.getElementById("terminal-tilt");
  const terminalShadow = document.getElementById("terminal-shadow");
  const terminalAmbient = document.getElementById("terminal-ambient");
  const terminalGlare = document.getElementById("terminal-glare");
  const terminalCard = document.getElementById("terminal-card");
  const terminalAura = document.getElementById("terminal-aura");

  if (heroVisual && terminalTilt && !prefersReduced) {
    const REST_X = 12;
    const REST_Y = -22;
    const MAX_TILT = 20;

    let currentX = REST_X;
    let currentY = REST_Y;
    let targetX = REST_X;
    let targetY = REST_Y;
    let glareX = 28;
    let glareY = 22;

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function tick() {
      currentX = lerp(currentX, targetX, 0.085);
      currentY = lerp(currentY, targetY, 0.085);
      glareX = lerp(glareX, targetGlareX, 0.12);
      glareY = lerp(glareY, targetGlareY, 0.12);

      const lift = 10 + Math.abs(currentY - REST_Y) * 0.35 + Math.abs(currentX - REST_X) * 0.2;
      terminalTilt.style.transform =
        `rotateX(${currentX.toFixed(2)}deg) rotateY(${currentY.toFixed(2)}deg) translateZ(${lift.toFixed(1)}px)`;

      if (terminalAura) {
        const auraShiftX = (currentY - REST_Y) * 1.4;
        const auraShiftY = (currentX - REST_X) * -1.1;
        terminalAura.style.transform =
          `translate3d(${auraShiftX.toFixed(1)}px, ${auraShiftY.toFixed(1)}px, -90px) scale(1.02)`;
      }

      if (terminalGlare) {
        terminalGlare.style.background =
          `radial-gradient(circle at ${glareX.toFixed(1)}% ${glareY.toFixed(1)}%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 22%, transparent 54%)`;
      }

      if (terminalShadow) {
        const offsetX = ((currentY - REST_Y) / MAX_TILT) * 22;
        const offsetY = ((currentX - REST_X) / MAX_TILT) * 14;
        const scale = 1 + Math.abs(currentY - REST_Y) / MAX_TILT * 0.1;
        terminalShadow.style.transform =
          `translateX(calc(-50% + ${offsetX.toFixed(1)}px)) translateY(${offsetY.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      }

      if (terminalAmbient) {
        const glowX = ((currentY - REST_Y) / MAX_TILT) * 18;
        const glowOpacity = 0.75 + Math.abs(currentX - REST_X) / MAX_TILT * 0.25;
        terminalAmbient.style.transform = `translateX(calc(-50% + ${glowX.toFixed(1)}px)) translateZ(-60px)`;
        terminalAmbient.style.opacity = glowOpacity.toFixed(2);
      }

      requestAnimationFrame(tick);
    }

    let targetGlareX = 28;
    let targetGlareY = 22;

    requestAnimationFrame(tick);

    heroVisual.addEventListener("mousemove", (e) => {
      const rect = heroVisual.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetY = REST_Y + x * MAX_TILT * 2.4;
      targetX = REST_X - y * MAX_TILT * 2.4;

      if (terminalCard) {
        const cardRect = terminalCard.getBoundingClientRect();
        targetGlareX = ((e.clientX - cardRect.left) / cardRect.width) * 100;
        targetGlareY = ((e.clientY - cardRect.top) / cardRect.height) * 100;
      }
    });

    heroVisual.addEventListener("mouseleave", () => {
      targetX = REST_X;
      targetY = REST_Y;
      targetGlareX = 28;
      targetGlareY = 22;
    });
  }

  // ─── Click zoom: sticker + carousel cards → center at 2× ───
  const cardZoomPortal = document.getElementById("card-zoom-portal");
  const cardZoomStage = cardZoomPortal?.querySelector(".card-zoom-stage");
  const cardZoomBackdrop = cardZoomPortal?.querySelector(".card-zoom-backdrop");
  let carouselHoverLocked = false;
  let activeZoomCard = null;
  let activeZoomClone = null;

  const CRISP_PROPS = [
    "fontSize",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "borderRadius",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "gap",
    "rowGap",
    "columnGap",
    "letterSpacing",
    "minHeight",
  ];

  function scalePx(value, factor) {
    const num = parseFloat(value);
    if (!num || Number.isNaN(num)) return null;
    if (value.endsWith("px")) return `${num * factor}px`;
    if (value.endsWith("rem")) return `${num * factor}rem`;
    return null;
  }

  function applyCrispScale(sourceEl, targetEl, factor) {
    const cs = getComputedStyle(sourceEl);
    CRISP_PROPS.forEach((prop) => {
      const scaled = scalePx(cs[prop], factor);
      if (scaled) targetEl.style[prop] = scaled;
    });
    const lineHeight = scalePx(cs.lineHeight, factor);
    if (lineHeight) targetEl.style.lineHeight = lineHeight;
  }

  function hideCardZoom() {
    if (!activeZoomCard && !cardZoomPortal?.classList.contains("is-active")) return;
    if (activeZoomCard) {
      activeZoomCard.classList.remove("is-zoom-source");
      activeZoomCard = null;
    }
    carouselHoverLocked = false;
    cardZoomPortal?.classList.remove("is-active");
    if (activeZoomClone) {
      activeZoomClone.classList.remove("is-zoomed");
      const clone = activeZoomClone;
      activeZoomClone = null;
      window.setTimeout(() => clone.remove(), 420);
    }
  }

  function toggleCardZoom(card) {
    if (prefersReduced || !cardZoomPortal || !cardZoomStage) return;
    if (activeZoomCard === card) {
      hideCardZoom();
      return;
    }
    showCardZoom(card);
  }

  function prepareZoomClone(card, clone, scale) {
    clone.classList.add("card-zoom-clone");
    clone.classList.remove("is-zoom-source", "reveal", "reveal-delay-1", "reveal-delay-2", "reveal-delay-3", "reveal-delay-4", "reveal-delay-5");
    clone.style.transform = "";
    clone.style.zIndex = "";
    clone.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));

    applyCrispScale(card, clone, scale);
    const sourceNodes = card.querySelectorAll("*");
    const cloneNodes = clone.querySelectorAll("*");
    for (let i = 0; i < sourceNodes.length && i < cloneNodes.length; i++) {
      applyCrispScale(sourceNodes[i], cloneNodes[i], scale);
    }

    const inner = clone.querySelector(".card-inner");
    if (inner) {
      inner.style.transform = card.classList.contains("is-flipped") ? "rotateY(180deg)" : "";
    }
  }

  function showCardZoom(card) {
    if (prefersReduced || !cardZoomPortal || !cardZoomStage) return;

    hideCardZoom();
    const rect = card.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const scale = Math.min(
      2,
      (window.innerWidth * 0.88) / rect.width,
      (window.innerHeight * 0.78) / rect.height
    );
    const targetW = rect.width * scale;
    const targetH = rect.height * scale;
    const startScale = 1 / scale;

    const clone = card.cloneNode(true);
    prepareZoomClone(card, clone, scale);
    clone.style.setProperty("--zoom-start-scale", startScale.toFixed(4));
    clone.style.left = `${cx}px`;
    clone.style.top = `${cy}px`;
    clone.style.width = `${targetW}px`;
    clone.style.height = `${targetH}px`;

    cardZoomStage.appendChild(clone);
    activeZoomCard = card;
    activeZoomClone = clone;
    card.classList.add("is-zoom-source");
    carouselHoverLocked = card.classList.contains("carousel-card");
    cardZoomPortal.classList.add("is-active");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => clone.classList.add("is-zoomed"));
    });
  }

  if (cardZoomPortal && cardZoomStage && !prefersReduced) {
    cardZoomBackdrop?.addEventListener("click", hideCardZoom);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideCardZoom();
    });
  }

  // ─── Sticker tilt + click zoom ────────────────────────────────
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    if (prefersReduced) return;

    card.addEventListener("mousemove", (e) => {
      if (card.classList.contains("is-zoom-source")) return;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const inner = card.querySelector(".card-inner");
      inner.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
    });

    card.addEventListener("mouseleave", () => {
      const inner = card.querySelector(".card-inner");
      if (!card.classList.contains("is-zoom-source")) {
        inner.style.transform = "";
      }
    });

    card.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCardZoom(card);
    });
  });

  // ─── Carousel: translate track + 3D rotateY + slow auto-drift ───
  const carouselViewport = document.getElementById("carousel-viewport");
  const carouselTrack = document.getElementById("use-carousel");

  if (carouselViewport && carouselTrack) {
    const originals = [...carouselTrack.querySelectorAll(".carousel-card")];
    originals.forEach((card) => {
      const clone = card.cloneNode(true);
      clone.dataset.clone = "true";
      clone.setAttribute("aria-hidden", "true");
      carouselTrack.appendChild(clone);
    });

    const cards = [...carouselTrack.querySelectorAll(".carousel-card")];
    const AUTO_PX_PER_SEC = prefersReduced ? 0 : 30;
    const DRAG_MULT = 1.2;
    const HOVER_SCROLL_MULT = 0.9;
    const SNAP_EASE = 0.1;

    let isDown = false;
    let dragMoved = 0;
    let startX = 0;
    let dragStartOffset = 0;
    let hoverX = null;
    let loopWidth = 0;
    let trackOffset = 0;
    let snapTarget = null;
    let lastTime = performance.now();

    function measureLoopWidth() {
      const firstClone = carouselTrack.querySelector(".carousel-card[data-clone]");
      if (!originals.length || !firstClone) return 0;
      return firstClone.offsetLeft - originals[0].offsetLeft;
    }

    function applyTrackOffset() {
      if (loopWidth > 0) {
        while (trackOffset >= loopWidth) trackOffset -= loopWidth;
        while (trackOffset < 0) trackOffset += loopWidth;
      }
      carouselTrack.style.transform = `translate3d(${-trackOffset}px, 0, 0)`;
    }

    function updateCarousel3D() {
      if (prefersReduced) return;
      const vp = carouselViewport.getBoundingClientRect();
      const center = vp.left + vp.width / 2;
      cards.forEach((card) => {
        const r = card.getBoundingClientRect();
        const cardCenter = r.left + r.width / 2;
        const dist = (cardCenter - center) / vp.width;
        const rotate = Math.max(-28, Math.min(28, dist * 55));
        const scale = 1 - Math.min(0.12, Math.abs(dist) * 0.2);
        card.style.transform = `perspective(900px) rotateY(${rotate}deg) scale(${scale})`;
        card.style.zIndex = String(100 - Math.round(Math.abs(dist) * 50));
      });
    }

    function tick(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (snapTarget !== null && !isDown) {
        const delta = snapTarget - trackOffset;
        if (Math.abs(delta) < 0.5) {
          trackOffset = snapTarget;
          snapTarget = null;
        } else {
          trackOffset += delta * SNAP_EASE;
        }
        applyTrackOffset();
      } else if (AUTO_PX_PER_SEC > 0 && !isDown && !carouselHoverLocked) {
        trackOffset += AUTO_PX_PER_SEC * dt;
        applyTrackOffset();
      }

      updateCarousel3D();
      requestAnimationFrame(tick);
    }

    function initCarousel() {
      loopWidth = measureLoopWidth();
      if (loopWidth <= 0) {
        requestAnimationFrame(initCarousel);
        return;
      }
      trackOffset = 0;
      lastTime = performance.now();
      applyTrackOffset();
      requestAnimationFrame(tick);
    }

    window.addEventListener("resize", () => {
      loopWidth = measureLoopWidth();
      applyTrackOffset();
      updateCarousel3D();
    });

    if (document.readyState === "complete") {
      initCarousel();
    } else {
      window.addEventListener("load", initCarousel, { once: true });
    }

    carouselViewport.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      hideCardZoom();
      isDown = true;
      dragMoved = 0;
      snapTarget = null;
      carouselViewport.classList.add("is-dragging");
      startX = e.clientX;
      dragStartOffset = trackOffset;
    });

    carouselViewport.addEventListener("mouseleave", () => {
      isDown = false;
      hoverX = null;
      carouselViewport.classList.remove("is-dragging");
    });

    carouselViewport.addEventListener("mouseup", () => {
      isDown = false;
      carouselViewport.classList.remove("is-dragging");
    });

    carouselViewport.addEventListener("mousemove", (e) => {
      if (isDown) {
        e.preventDefault();
        const dx = e.clientX - startX;
        dragMoved += Math.abs(dx);
        trackOffset = dragStartOffset - dx * DRAG_MULT;
        applyTrackOffset();
        return;
      }
      if (hoverX !== null && !carouselHoverLocked) {
        const dx = e.clientX - hoverX;
        if (Math.abs(dx) > 1) {
          trackOffset -= dx * HOVER_SCROLL_MULT;
          snapTarget = null;
          applyTrackOffset();
        }
      }
      hoverX = e.clientX;
    });

    carouselViewport.addEventListener(
      "touchstart",
      (e) => {
        hideCardZoom();
        isDown = true;
        dragMoved = 0;
        snapTarget = null;
        startX = e.touches[0].clientX;
        dragStartOffset = trackOffset;
        carouselViewport.classList.add("is-dragging");
      },
      { passive: true }
    );

    carouselViewport.addEventListener(
      "touchmove",
      (e) => {
        if (!isDown) return;
        const dx = e.touches[0].clientX - startX;
        dragMoved += Math.abs(dx);
        trackOffset = dragStartOffset - dx * DRAG_MULT;
        applyTrackOffset();
      },
      { passive: true }
    );

    carouselViewport.addEventListener("touchend", () => {
      isDown = false;
      carouselViewport.classList.remove("is-dragging");
    });

    carouselViewport.addEventListener("click", (e) => {
      const card = e.target.closest(".carousel-card");
      if (!card || dragMoved > 8) return;
      e.stopPropagation();
      toggleCardZoom(card);
    });
  }

  // ─── Smooth anchor offset for fixed nav ───────────────────────
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: prefersReduced ? "auto" : "smooth" });
    });
  });
})();
