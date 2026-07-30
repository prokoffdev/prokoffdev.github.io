const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none)").matches;

gsap.registerPlugin(ScrollTrigger);

/* Smooth scroll */

const lenis = new Lenis({
  duration: 1.15,
  smoothWheel: !reduceMotion,
  wheelMultiplier: 0.9,
});

lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -70 });
  });
});

/* Split text into animatable chars */

function splitText(el) {
  const lines = el.innerHTML.split(/<br\s*\/?>/i);
  el.innerHTML = lines
    .map((line) =>
      `<span class="word">${[...line.trim()]
        .map((ch) => `<span class="char">${ch === " " ? "&nbsp;" : ch}</span>`)
        .join("")}</span>`
    )
    .join("<br>");
  return el.querySelectorAll(".char");
}

document.querySelectorAll("[data-split]").forEach(splitText);

/* Loader → hero reveal */

const loaderCount = document.querySelector(".loader-count");
const heroChars = document.querySelectorAll(".hero-title .char");

let heroRevealed = false;

function revealHero() {
  if (heroRevealed) return;
  heroRevealed = true;
  document.body.classList.add("is-loaded");

  gsap.from(heroChars, {
    yPercent: 118,
    duration: 1.1,
    ease: "expo.out",
    stagger: 0.028,
  });

  gsap.from(".hero .eyebrow, .hero-meta > *", {
    y: 26,
    opacity: 0,
    duration: 0.9,
    ease: "expo.out",
    stagger: 0.09,
    delay: 0.35,
  });

  gsap.from(".site-header, .scroll-hint", {
    opacity: 0,
    duration: 0.8,
    ease: "power2.out",
    delay: 0.6,
  });
}

// rAF is paused in background tabs, so the loader must never gate the page on it alone.
setTimeout(revealHero, 3500);

if (reduceMotion) {
  revealHero();
} else {
  const counter = { v: 0 };
  gsap.to(counter, {
    v: 100,
    duration: 1.3,
    ease: "power2.inOut",
    onUpdate: () => (loaderCount.textContent = Math.round(counter.v)),
    onComplete: () => {
      gsap.to(".loader", {
        yPercent: -100,
        duration: 0.9,
        ease: "expo.inOut",
        onComplete: revealHero,
      });
    },
  });
}

/* Scroll reveals */

document.querySelectorAll("[data-reveal]").forEach((el) => {
  gsap.from(el, {
    y: 34,
    opacity: 0,
    duration: 0.9,
    ease: "expo.out",
    scrollTrigger: { trigger: el, start: "top 88%", once: true },
  });
});

document.querySelectorAll(".section-title, .contact-title").forEach((title) => {
  gsap.from(title.querySelectorAll(".char"), {
    yPercent: 110,
    duration: 0.9,
    ease: "expo.out",
    stagger: 0.02,
    scrollTrigger: { trigger: title, start: "top 85%", once: true },
  });
});

gsap.utils.toArray(".card").forEach((card, i) => {
  gsap.from(card, {
    y: 60,
    opacity: 0,
    duration: 0.9,
    ease: "expo.out",
    delay: i * 0.06,
    scrollTrigger: { trigger: ".cards", start: "top 82%", once: true },
  });
});

// The webfont swap (font-display: swap) reflows text after ScrollTrigger has
// already cached pixel positions, which can make a fast Lenis scroll skip an
// onEnter entirely and leave that element stuck invisible. Recompute once
// fonts settle, and again shortly after in case late layout shifts happen.
document.fonts.ready.then(() => ScrollTrigger.refresh());
window.addEventListener("load", () => setTimeout(() => ScrollTrigger.refresh(), 300));

// Belt-and-suspenders: anything that scrolls into view but is still invisible
// after a beat gets forced visible outright, regardless of why the entrance
// tween didn't fire. Decorative motion must never be able to permanently hide
// real content.
const revealSafetyNet = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      setTimeout(() => {
        if (parseFloat(getComputedStyle(el).opacity) < 0.05) {
          gsap.to(el, { opacity: 1, x: 0, y: 0, duration: 0.4, ease: "power2.out" });
        }
        el.querySelectorAll(".char").forEach((ch) => {
          if (getComputedStyle(ch).transform.includes("118") || ch.style.transform) {
            gsap.to(ch, { yPercent: 0, duration: 0.4 });
          }
        });
      }, 1400);
    });
  },
  { threshold: 0.1 }
);

document
  .querySelectorAll("[data-reveal], .card, .section-title, .contact-title")
  .forEach((el) => revealSafetyNet.observe(el));

// Bars animate width, not opacity, so they need their own stuck check against
// the percentage authored in the markup.
const barSafetyNet = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const bar = entry.target;
      const target = bar.dataset.width;
      setTimeout(() => {
        if (getComputedStyle(bar).width === "0px") {
          gsap.to(bar, { width: target, duration: 0.5, ease: "power2.out" });
        }
      }, 1400);
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll("[data-bar]").forEach((bar) => {
  bar.dataset.width = bar.style.width;
  barSafetyNet.observe(bar);
});

/* Language bars fill on scroll (width comes from markup, so no-JS still reads right) */

document.querySelectorAll("[data-bar]").forEach((bar, i) => {
  // immediateRender:false keeps the authored percentage until the tween actually
  // starts, and the target stays a percentage so the bar survives a resize.
  gsap.fromTo(
    bar,
    { width: 0 },
    {
      width: bar.style.width,
      duration: 1.2,
      ease: "expo.out",
      delay: i * 0.12,
      immediateRender: false,
      scrollTrigger: { trigger: ".langs", start: "top 84%", once: true },
    }
  );
});

/* Marquee driven by scroll velocity */

const track = document.querySelector(".marquee-track");
if (track && !reduceMotion) {
  let half = track.scrollWidth / 2;
  let offset = 0;
  let speed = 1.1;

  // Webfont swap and resize change the track width, which would break the loop seam.
  const measure = () => { half = track.scrollWidth / 2; };
  document.fonts.ready.then(measure);
  window.addEventListener("resize", measure);

  lenis.on("scroll", ({ velocity }) => {
    speed = 1.1 + Math.min(Math.abs(velocity) * 0.22, 9);
    gsap.to(".marquee-track span", {
      skewX: gsap.utils.clamp(-11, 11, velocity * -0.32),
      duration: 0.5,
      ease: "power3.out",
      overwrite: true,
    });
  });

  gsap.ticker.add(() => {
    offset = (offset + speed) % half;
    track.style.transform = `translate3d(${-offset}px,0,0)`;
  });
}

/* Parallax on blobs */

if (!reduceMotion) {
  gsap.to(".blob-1", { yPercent: 22, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 1 } });
  gsap.to(".blob-2", { yPercent: -28, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 1 } });
  gsap.to(".blob-3", { yPercent: -14, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 1 } });
}

/* Theme toggle */

const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");

function syncToggle() {
  themeToggle.setAttribute("aria-pressed", String(root.dataset.theme === "dark"));
}

syncToggle();

themeToggle.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", root.dataset.theme);
  syncToggle();
});

// Follow the OS only while the visitor has not picked a theme themselves.
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (localStorage.getItem("theme")) return;
  root.dataset.theme = e.matches ? "dark" : "light";
  syncToggle();
});

/* Starfield with comets (dark theme only) */

const canvas = document.querySelector(".starfield");
const ctx = canvas.getContext("2d");

let stars = [];
let comets = [];
let vw = 0;
let vh = 0;
let nextComet = 0;

function buildStars() {
  const count = Math.round((vw * vh) / 6200);
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * vw,
    y: Math.random() * vh,
    r: Math.random() * 1.1 + 0.25,
    a: Math.random() * 0.5 + 0.22,
    sp: Math.random() * 1.7 + 0.3,
    ph: Math.random() * Math.PI * 2,
  }));
}

function resizeStarfield() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  vw = window.innerWidth;
  vh = window.innerHeight;
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildStars();
}

resizeStarfield();
window.addEventListener("resize", resizeStarfield);

function spawnComet() {
  const speed = 6.5 + Math.random() * 5;
  comets.push({
    x: Math.random() * vw * 1.15 - vw * 0.15,
    y: Math.random() * vh * 0.45 - vh * 0.12,
    vx: speed,
    vy: speed * (0.45 + Math.random() * 0.3),
    len: 120 + Math.random() * 150,
    life: 0,
    max: 80 + Math.random() * 45,
  });
}

function drawStarfield(time) {
  ctx.clearRect(0, 0, vw, vh);

  for (const s of stars) {
    const alpha = reduceMotion
      ? s.a
      : s.a + Math.sin(time * 0.001 * s.sp + s.ph) * 0.22;
    ctx.globalAlpha = Math.max(0.05, Math.min(1, alpha));
    ctx.fillStyle = "#efe9ff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (reduceMotion) return;

  if (time > nextComet) {
    spawnComet();
    nextComet = time + 2600 + Math.random() * 4200;
  }

  comets = comets.filter((c) => c.life < c.max && c.x - c.len < vw + 200);

  for (const c of comets) {
    c.life += 1;
    c.x += c.vx;
    c.y += c.vy;

    const fade = Math.sin((c.life / c.max) * Math.PI);
    const mag = Math.hypot(c.vx, c.vy);
    const tx = c.x - (c.vx / mag) * c.len;
    const ty = c.y - (c.vy / mag) * c.len;

    const grad = ctx.createLinearGradient(c.x, c.y, tx, ty);
    grad.addColorStop(0, `rgba(238, 232, 255, ${0.9 * fade})`);
    grad.addColorStop(0.35, `rgba(168, 85, 247, ${0.45 * fade})`);
    grad.addColorStop(1, "rgba(168, 85, 247, 0)");

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.globalAlpha = fade;
    ctx.fillStyle = "#fbf7ff";
    ctx.beginPath();
    ctx.arc(c.x, c.y, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

let litUntil = 0;

gsap.ticker.add(() => {
  const now = performance.now();
  const dark = root.dataset.theme === "dark";

  if (dark) litUntil = now + 900; // keep drawing through the CSS fade-out

  if (now < litUntil) {
    drawStarfield(now);
  } else if (stars.length && comets.length) {
    comets = [];
    ctx.clearRect(0, 0, vw, vh);
  }
});

/* Custom cursor + magnetic elements */

if (!isTouch && !reduceMotion) {
  const dot = document.querySelector(".cursor");
  const ring = document.querySelector(".cursor-ring");

  const setDotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
  const setDotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
  const setRingX = gsap.quickTo(ring, "x", { duration: 0.42, ease: "power3" });
  const setRingY = gsap.quickTo(ring, "y", { duration: 0.42, ease: "power3" });

  window.addEventListener("mousemove", (e) => {
    gsap.to([dot, ring], { opacity: 1, duration: 0.3, overwrite: "auto" });
    setDotX(e.clientX - 3.5);
    setDotY(e.clientY - 3.5);
    setRingX(e.clientX - 19);
    setRingY(e.clientY - 19);
  });

  document.querySelectorAll("a, button, .card").forEach((el) => {
    el.addEventListener("mouseenter", () => ring.classList.add("is-active"));
    el.addEventListener("mouseleave", () => ring.classList.remove("is-active"));
  });

  document.querySelectorAll("[data-magnet]").forEach((el) => {
    const strength = 0.32;
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, {
        x: (e.clientX - (r.left + r.width / 2)) * strength,
        y: (e.clientY - (r.top + r.height / 2)) * strength,
        duration: 0.5,
        ease: "power3.out",
      });
    });
    el.addEventListener("mouseleave", () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
    });
  });

  document.querySelectorAll("[data-tilt]").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, {
        rotateY: ((e.clientX - (r.left + r.width / 2)) / r.width) * 11,
        rotateX: -((e.clientY - (r.top + r.height / 2)) / r.height) * 11,
        transformPerspective: 800,
        duration: 0.5,
        ease: "power2.out",
      });
    });
    el.addEventListener("mouseleave", () => {
      gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.8, ease: "power3.out" });
    });
  });
}

/* Hero mouse parallax */

if (!isTouch && !reduceMotion) {
  const title = document.querySelector(".hero-title");
  window.addEventListener("mousemove", (e) => {
    const dx = (e.clientX / window.innerWidth - 0.5) * 2;
    const dy = (e.clientY / window.innerHeight - 0.5) * 2;
    gsap.to(title, { x: dx * 16, y: dy * 10, duration: 1, ease: "power3.out" });
  });
}
