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
    scrollTrigger: { trigger: el, start: "top 88%" },
  });
});

document.querySelectorAll(".section-title, .contact-title").forEach((title) => {
  gsap.from(title.querySelectorAll(".char"), {
    yPercent: 110,
    duration: 0.9,
    ease: "expo.out",
    stagger: 0.02,
    scrollTrigger: { trigger: title, start: "top 85%" },
  });
});

gsap.utils.toArray(".card").forEach((card, i) => {
  gsap.from(card, {
    y: 60,
    opacity: 0,
    duration: 0.9,
    ease: "expo.out",
    delay: i * 0.06,
    scrollTrigger: { trigger: ".cards", start: "top 82%" },
  });
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
