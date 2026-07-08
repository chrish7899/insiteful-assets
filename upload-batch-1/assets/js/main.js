/* ============================================================
   INSITEFUL — Shared site behavior
   Effects: text scramble, trailing cursor, smooth scroll (Lenis),
   scroll reveals, animated counters, parallax, magnetic buttons,
   nav / dropdown / mobile menu, GoHighLevel booking modal.
   ============================================================ */

/* --------------------------------------------------------
   CONFIG — paste your live GoHighLevel calendar URL here.
   Example: "https://api.leadconnectorhq.com/widget/booking/XXXXXXXX"
   Leave empty to show the contact placeholder instead.
   -------------------------------------------------------- */
const GHL_CALENDAR_URL = "";

(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const docEl = document.documentElement;

  /* ------------------------------------------------------
     Smooth scroll (Lenis via CDN — graceful if absent)
     ------------------------------------------------------ */
  let lenis = null;
  if (!prefersReducedMotion && typeof window.Lenis === "function") {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    // Anchor links keep working through Lenis
    document.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80 });
    });
  }
  window.__lenis = lenis;

  /* ------------------------------------------------------
     Header scroll state
     ------------------------------------------------------ */
  const header = document.getElementById("siteHeader");
  if (header) {
    let lastState = false;
    const onScroll = () => {
      const scrolled = window.scrollY > 24;
      if (scrolled !== lastState) {
        header.classList.toggle("is-scrolled", scrolled);
        lastState = scrolled;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------
     Active nav highlighting
     ------------------------------------------------------ */
  (() => {
    const path = location.pathname.replace(/\/+$/, "");
    const page = path.split("/").pop() || "index.html";
    const inServices = /\/services\//.test(location.pathname);
    document.querySelectorAll(".main-nav a[href]").forEach((a) => {
      const href = a.getAttribute("href").split("/").pop();
      if (
        (href === page && !inServices) ||
        (inServices && a.closest(".has-dropdown") === null && /services/.test(a.getAttribute("href")))
      ) {
        a.classList.add("is-active");
      }
    });
    if (inServices) {
      const trigger = document.querySelector(".nav-drop-trigger");
      if (trigger) trigger.classList.add("is-active");
    }
  })();

  /* ------------------------------------------------------
     Services dropdown (click/keyboard support on top of hover)
     ------------------------------------------------------ */
  document.querySelectorAll(".has-dropdown").forEach((item) => {
    const trigger = item.querySelector(".nav-drop-trigger");
    if (!trigger) return;
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const open = item.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", (e) => {
      if (!item.contains(e.target)) {
        item.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
    item.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        item.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
        trigger.focus();
      }
    });
  });

  /* ------------------------------------------------------
     Mobile menu
     ------------------------------------------------------ */
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileMenu = document.getElementById("mobileMenu");
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      const open = mobileMenu.classList.toggle("is-open");
      menuToggle.classList.toggle("is-active", open);
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
      if (lenis) open ? lenis.stop() : lenis.start();
      if (open) {
        mobileMenu.querySelectorAll("ul > li").forEach((li, i) => {
          li.style.transitionDelay = `${0.06 + i * 0.05}s`;
        });
      }
    });
    const mmServices = mobileMenu.querySelector(".mm-services-toggle");
    const mmSub = mobileMenu.querySelector(".mm-sub");
    if (mmServices && mmSub) {
      mmServices.addEventListener("click", () => {
        const open = mmSub.classList.toggle("is-open");
        mmServices.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
  }

  /* ------------------------------------------------------
     Text scramble
     ------------------------------------------------------ */
  const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#________";

  class Scrambler {
    constructor(el) {
      this.el = el;
      this.original = el.textContent;
      this.originalHTML = el.innerHTML;
      this.frame = 0;
      this.queue = [];
      this.raf = null;
      el.setAttribute("aria-label", this.original.trim());
    }
    play() {
      const text = this.original;
      this.queue = [];
      for (let i = 0; i < text.length; i++) {
        const start = Math.floor(Math.random() * 22);
        const end = start + Math.floor(Math.random() * 22);
        this.queue.push({ char: text[i], start, end, rnd: "" });
      }
      cancelAnimationFrame(this.raf);
      this.frame = 0;
      this.update();
    }
    update() {
      let output = "";
      let done = 0;
      for (const item of this.queue) {
        if (this.frame >= item.end) {
          done++;
          output += item.char;
        } else if (this.frame >= item.start) {
          if (!item.rnd || this.frame % 2 === 0) {
            item.rnd = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          }
          output += item.char === " " ? " " : `<span class="scramble-char" aria-hidden="true">${item.rnd}</span>`;
        } else {
          output += item.char === " " ? " " : " ";
        }
      }
      this.el.innerHTML = output;
      if (done < this.queue.length) {
        this.frame++;
        this.raf = requestAnimationFrame(() => this.update());
      } else {
        this.el.innerHTML = this.originalHTML;
      }
    }
  }

  // One Scrambler per element, shared between hover and load triggers
  const scramblerRegistry = new WeakMap();
  const getScrambler = (el) => {
    let s = scramblerRegistry.get(el);
    if (!s) {
      s = new Scrambler(el);
      scramblerRegistry.set(el, s);
    }
    return s;
  };

  // Split a heading into scramble "leaves" so <br>, accent spans, and
  // highlight colors survive the animation. Bare text nodes get wrapped.
  const collectLeaves = (root) => {
    const leaves = [];
    const walk = (el) => {
      Array.from(el.childNodes).forEach((node) => {
        if (node.nodeType === 3) {
          if (node.textContent.trim()) {
            const w = document.createElement("span");
            w.className = "scr-leaf";
            node.parentNode.insertBefore(w, node);
            w.appendChild(node);
            leaves.push(w);
          }
        } else if (node.nodeType === 1 && node.tagName !== "BR" && node.tagName !== "svg" && node.tagName !== "SVG") {
          if (node.children.length === 0) {
            if (node.textContent.trim()) leaves.push(node);
          } else {
            walk(node);
          }
        }
      });
    };
    walk(root);
    return leaves;
  };

  if (!prefersReducedMotion) {
    // Hover scramble on all headlines, sub-headlines, and explicit targets
    const roots = Array.from(
      document.querySelectorAll("h1, h2, .hero-statement, .defn-word, [data-scramble]")
    );
    const outerRoots = roots.filter((r) => !roots.some((o) => o !== r && o.contains(r)));
    outerRoots.forEach((root) => {
      const leaves = collectLeaves(root);
      if (!leaves.length) return;
      let cooling = false;
      const trigger = () => {
        if (cooling) return;
        cooling = true;
        leaves.forEach((leaf) => getScrambler(leaf).play());
        setTimeout(() => (cooling = false), 1000);
      };
      const hoverTarget = root.closest("a, button") || root;
      hoverTarget.addEventListener("mouseenter", trigger);
      hoverTarget.addEventListener("focus", trigger, true);
    });
    // Scramble once on first reveal
    const loadEls = document.querySelectorAll("[data-scramble-load]");
    if (loadEls.length) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const delay = parseFloat(el.dataset.scrambleLoad || "0");
            setTimeout(() => getScrambler(el).play(), delay);
            io.unobserve(el);
          });
        },
        { threshold: 0.4 }
      );
      loadEls.forEach((el) => io.observe(el));
    }
  }

  /* ------------------------------------------------------
     Scroll reveals (+ stagger groups)
     ------------------------------------------------------ */
  document.querySelectorAll("[data-reveal-group]").forEach((group) => {
    group.querySelectorAll("[data-reveal]").forEach((child, i) => {
      child.style.setProperty("--reveal-delay", `${i * 0.09}s`);
    });
  });
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length) {
    if (prefersReducedMotion) {
      revealEls.forEach((el) => el.classList.add("is-inview"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-inview");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      revealEls.forEach((el) => io.observe(el));
    }
  }

  /* ------------------------------------------------------
     Animated counters  [data-count][data-suffix][data-decimals]
     ------------------------------------------------------ */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    const animate = (el) => {
      const target = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const suffix = el.dataset.suffix || "";
      const prefix = el.dataset.prefix || "";
      const dur = parseInt(el.dataset.duration || "1800", 10);
      if (prefersReducedMotion) {
        el.textContent = prefix + target.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
        return;
      }
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        const val = target * eased;
        el.textContent = prefix + val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------
     Parallax  [data-parallax="0.12"]
     ------------------------------------------------------ */
  const parallaxEls = Array.from(document.querySelectorAll("[data-parallax]"));
  if (parallaxEls.length && !prefersReducedMotion && finePointer) {
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax || "0.12");
        const rect = el.getBoundingClientRect();
        const offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  /* ------------------------------------------------------
     Trailing custom cursor
     ------------------------------------------------------ */
  if (finePointer && !prefersReducedMotion) {
    docEl.classList.add("has-cursor-fx");
    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    const label = document.createElement("span");
    label.className = "cursor-label";
    ring.appendChild(label);
    document.body.append(dot, ring);

    let mx = -100, my = -100;
    let rx = -100, ry = -100;
    let visible = false;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) {
        visible = true;
        document.body.classList.add("cursor-in");
        rx = mx; ry = my;
      }
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });
    document.addEventListener("mouseleave", () => {
      visible = false;
      document.body.classList.remove("cursor-in");
    });

    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    const HOVER_SEL = "a, button, [data-cursor], input, select, textarea, summary, label";
    document.addEventListener("mouseover", (e) => {
      const labelled = e.target.closest("[data-cursor-label]");
      if (labelled) {
        label.textContent = labelled.dataset.cursorLabel;
        document.body.classList.add("cursor-label-on");
        document.body.classList.remove("cursor-hover");
        return;
      }
      document.body.classList.remove("cursor-label-on");
      document.body.classList.toggle("cursor-hover", !!e.target.closest(HOVER_SEL));
    });
  }

  /* ------------------------------------------------------
     Magnetic buttons  [data-magnetic]
     ------------------------------------------------------ */
  if (finePointer && !prefersReducedMotion) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const strength = 0.35;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transition = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 500);
      });
    });
  }

  /* ------------------------------------------------------
     Booking modal (GoHighLevel calendar slot)
     ------------------------------------------------------ */
  const modal = document.getElementById("bookingModal");
  if (modal) {
    const panel = modal.querySelector(".booking-panel");
    const closeBtn = modal.querySelector(".booking-close");
    const embed = modal.querySelector(".booking-embed");
    let iframeInjected = false;
    let lastFocus = null;

    const openModal = () => {
      lastFocus = document.activeElement;
      modal.hidden = false;
      requestAnimationFrame(() => modal.classList.add("is-open"));
      document.body.style.overflow = "hidden";
      if (lenis) lenis.stop();
      if (GHL_CALENDAR_URL && !iframeInjected && embed) {
        const iframe = document.createElement("iframe");
        iframe.src = GHL_CALENDAR_URL;
        iframe.title = "Book a discovery call";
        iframe.loading = "eager";
        iframe.setAttribute("allow", "payment");
        embed.innerHTML = "";
        embed.appendChild(iframe);
        iframeInjected = true;
      }
      (closeBtn || panel).focus();
    };
    const closeModal = () => {
      modal.classList.remove("is-open");
      document.body.style.overflow = "";
      if (lenis) lenis.start();
      setTimeout(() => {
        modal.hidden = true;
        if (lastFocus) lastFocus.focus();
      }, 380);
    };

    document.addEventListener("click", (e) => {
      const opener = e.target.closest("[data-book]");
      if (opener) {
        e.preventDefault();
        openModal();
      }
    });
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    modal.querySelector(".booking-backdrop")?.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });
  }

  /* ------------------------------------------------------
     Footer year
     ------------------------------------------------------ */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
