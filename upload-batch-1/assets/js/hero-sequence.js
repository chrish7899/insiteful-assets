/* ============================================================
   INSITEFUL — Home hero: scroll-driven 3-clip sequence
   Segment 1: Hero Orbit  · Segment 2: Macro Fly-Through
   Segment 3: Infinite Zoom → dictionary definition reveal
   Renders a WebP frame sequence to <canvas>, scrubbed by scroll.
   Falls back gracefully: no frames → cinematic poster + text beats.
   Frame manifest is provided by assets/js/hero-manifest.js
   (window.HERO_FRAMES). Reduced motion → static stacked layout.
   ============================================================ */
(() => {
  "use strict";

  const seq = document.getElementById("heroSeq");
  if (!seq) return;

  // Restart the hero story on refresh instead of restoring mid-sequence
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  const media = seq.querySelector(".hero-media");
  const canvas = document.getElementById("heroCanvas");
  const dark = seq.querySelector(".hero-dark");
  const hint = seq.querySelector(".hero-scroll-hint");
  const copyA = seq.querySelector(".hero-copy--a");
  const copyB = seq.querySelector(".hero-copy--b");
  const copyC = seq.querySelector(".hero-copy--c");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const manifest = window.HERO_FRAMES || null;

  /* ---------- Reduced motion: stacked static layout ---------- */
  if (reduced) {
    seq.classList.add("hero-seq--static");
    [copyA, copyB, copyC].forEach((c) => {
      if (c) {
        c.style.opacity = "1";
        c.style.position = "relative";
        c.style.pointerEvents = "auto";
      }
    });
    return;
  }

  /* ---------- Text beat choreography ---------- */
  // progress windows: [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd]
  const BEATS = [
    { el: copyA, w: [0.0, 0.0, 0.2, 0.3] },
    { el: copyB, w: [0.37, 0.43, 0.56, 0.65] },
    { el: copyC, w: [0.83, 0.91, 2, 3] }, // never fades out
  ];

  const beatOpacity = (p, [inS, inE, outS, outE]) => {
    if (p < inS) return 0;
    if (p < inE) return (p - inS) / Math.max(0.0001, inE - inS);
    if (p < outS) return 1;
    if (p < outE) return 1 - (p - outS) / Math.max(0.0001, outE - outS);
    return 0;
  };

  /* ---------- Canvas frame engine ---------- */
  // Segment ranges are derived from the manifest (equal shares of the pin)
  let SEG_RANGES = [[0, 1]];
  const XFADE = 0.03;

  let ctx = null;
  let frames = [];      // [segIndex][frameIndex] -> Image | undefined
  let segCounts = [];
  let framesActive = false;
  let mobileVideoEl = null;

  const frameSrc = (seg, i) => {
    const s = manifest.segments[seg];
    return manifest.base + s.name + "-" + String(i + 1).padStart(3, "0") + manifest.ext;
  };

  const loadFrame = (seg, i) =>
    new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        frames[seg][i] = img;
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = frameSrc(seg, i);
    });

  const preloadAll = async () => {
    // 1) first frame of each segment for instant coverage
    await Promise.all(manifest.segments.map((_, s) => loadFrame(s, 0)));
    markCanvasReady();
    // 2) everything else with limited concurrency, in scroll order
    const queue = [];
    manifest.segments.forEach((s, si) => {
      for (let i = 1; i < s.count; i++) queue.push([si, i]);
    });
    const CONCURRENCY = 8;
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const [s, i] = queue[cursor++];
        await loadFrame(s, i);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  };

  const markCanvasReady = () => {
    if (media) media.classList.add("canvas-ready");
  };

  const sizeCanvas = () => {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  };

  const nearestLoaded = (seg, idx) => {
    const list = frames[seg];
    if (!list) return null;
    for (let i = idx; i >= 0; i--) if (list[i]) return list[i];
    for (let i = idx + 1; i < list.length; i++) if (list[i]) return list[i];
    return null;
  };

  const drawCover = (img, alpha = 1) => {
    if (!img || !ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    ctx.globalAlpha = 1;
  };

  const segFor = (p) => {
    for (let s = 0; s < SEG_RANGES.length; s++) {
      if (p <= SEG_RANGES[s][1] || s === SEG_RANGES.length - 1) return s;
    }
    return SEG_RANGES.length - 1;
  };

  const renderFrames = (p) => {
    if (!framesActive || !ctx) return;
    const s = segFor(p);
    const [a, b] = SEG_RANGES[s];
    const local = Math.min(1, Math.max(0, (p - a) / (b - a)));
    const count = segCounts[s];
    const idx = Math.min(count - 1, Math.floor(local * count));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const img = nearestLoaded(s, idx);
    drawCover(img, 1);

    // crossfade into next segment near the boundary
    if (s < SEG_RANGES.length - 1 && b - p < XFADE) {
      const t = 1 - (b - p) / XFADE;
      const nextImg = nearestLoaded(s + 1, 0);
      if (nextImg) drawCover(nextImg, Math.min(1, Math.max(0, t)));
    }
  };

  /* ---------- Scroll progress loop ---------- */
  let progress = 0;
  let rafId = null;
  let inView = true;

  const computeProgress = () => {
    const rect = seq.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, -rect.top / total));
  };

  const apply = () => {
    progress = computeProgress();

    BEATS.forEach(({ el, w }) => {
      if (!el) return;
      const o = beatOpacity(progress, w);
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${((1 - o) * 22).toFixed(1)}px)`;
      el.classList.toggle("is-active", o > 0.5);
    });

    if (hint) hint.style.opacity = progress < 0.04 ? "1" : "0";

    if (dark) {
      // Scrim so the dictionary definition stays legible over the finale
      const maxDark = framesActive ? 0.85 : 0.94;
      const t = Math.min(1, Math.max(0, (progress - 0.74) / 0.16));
      dark.style.opacity = (t * maxDark).toFixed(3);
    }

    renderFrames(progress);
    rafId = inView ? requestAnimationFrame(apply) : null;
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        inView = entry.isIntersecting;
        if (inView && rafId === null) rafId = requestAnimationFrame(apply);
      });
    },
    { rootMargin: "60px" }
  );
  io.observe(seq);

  /* ---------- Boot ---------- */
  if (manifest && manifest.segments && manifest.segments.length && canvas && !isMobile) {
    ctx = canvas.getContext("2d");
    frames = manifest.segments.map(() => []);
    segCounts = manifest.segments.map((s) => s.count);
    SEG_RANGES = manifest.segments.map((_, i, arr) => [i / arr.length, (i + 1) / arr.length]);
    framesActive = true;
    sizeCanvas();
    window.addEventListener("resize", () => {
      sizeCanvas();
      renderFrames(progress);
    });
    preloadAll();
  } else if (manifest && manifest.mobileVideo && isMobile && media) {
    // Mobile: ambient orbit loop instead of frame scrubbing
    mobileVideoEl = document.createElement("video");
    mobileVideoEl.src = manifest.mobileVideo;
    mobileVideoEl.muted = true;
    mobileVideoEl.loop = true;
    mobileVideoEl.playsInline = true;
    mobileVideoEl.autoplay = true;
    mobileVideoEl.setAttribute("aria-hidden", "true");
    media.insertBefore(mobileVideoEl, media.querySelector(".hero-vignette"));
    const tryPlay = () => mobileVideoEl.play().catch(() => {});
    tryPlay();
    document.addEventListener("touchstart", tryPlay, { once: true, passive: true });
  }

  rafId = requestAnimationFrame(apply);
})();
