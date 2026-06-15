const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    navLinks.classList.toggle("open", !isOpen);
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      navLinks.classList.remove("open");
    });
  });
}

document.querySelectorAll("[data-ripple]").forEach((button) => {
  button.addEventListener("click", (event) => {
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    button.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 650);
  });
});

const revealItems = document.querySelectorAll(".reveal");
const countItems = document.querySelectorAll("[data-count]");

function formatCount(value, progress) {
  const current = Math.round(value * progress);

  if (value >= 10000) {
    return `${Math.max(1, Math.round(current / 1000))}k+`;
  }

  if (value === 98) {
    return `${current}%`;
  }

  if (value === 24) {
    return progress >= 1 ? "24/7" : String(current);
  }

  return String(current);
}

function animateCount(element) {
  if (element.dataset.counted === "true") {
    return;
  }

  element.dataset.counted = "true";
  const value = Number(element.dataset.count);
  const start = performance.now();
  const duration = 1100;

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatCount(value, eased);

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => observer.observe(item));

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.7 }
  );

  countItems.forEach((item) => counterObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
  countItems.forEach((item) => animateCount(item));
}

const dashboardTabs = document.querySelectorAll("[data-panel]");
const dashboardPanels = document.querySelectorAll("[data-panel-content]");

dashboardTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.panel;

    dashboardTabs.forEach((item) => {
      const isActive = item === tab;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });

    dashboardPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panelContent === target);
    });
  });
});

const sidebarItems = document.querySelectorAll(".sidebar-item");

sidebarItems.forEach((item) => {
  item.addEventListener("click", () => {
    sidebarItems.forEach((button) => button.classList.remove("active"));
    item.classList.add("active");
  });
});

document.querySelectorAll(".faq-list details").forEach((details) => {
  details.addEventListener("toggle", () => {
    if (!details.open) {
      return;
    }

    document.querySelectorAll(".faq-list details").forEach((item) => {
      if (item !== details) {
        item.open = false;
      }
    });
  });
});

if (!prefersReducedMotion) {
  const glow = document.querySelector(".cursor-glow");
  const parallaxZones = document.querySelectorAll("[data-parallax-zone]");

  window.addEventListener("pointermove", (event) => {
    if (glow) {
      glow.style.opacity = "1";
      glow.style.transform = `translate3d(${event.clientX - 260}px, ${event.clientY - 260}px, 0)`;
    }

    parallaxZones.forEach((zone) => {
      const rect = zone.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = (event.clientX - centerX) / rect.width;
      const y = (event.clientY - centerY) / rect.height;

      zone.querySelectorAll("[data-parallax]").forEach((item) => {
        const depth = Number(item.dataset.parallax || 12);
        item.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0)`;
      });
    });
  });

  window.addEventListener("pointerleave", () => {
    if (glow) {
      glow.style.opacity = "0";
    }

    document.querySelectorAll("[data-parallax]").forEach((item) => {
      item.style.transform = "";
    });
  });

  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateY = ((x / rect.width) - 0.5) * 7;
      const rotateX = ((0.5 - y / rect.height) * 7);

      card.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

function initParticles() {
  const canvas = document.getElementById("particle-canvas");

  if (!canvas || prefersReducedMotion) {
    return;
  }

  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let particles = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(78, Math.max(34, Math.floor((width * height) / 24000)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.7 + 0.45,
      speedX: (Math.random() - 0.5) * 0.18,
      speedY: (Math.random() - 0.5) * 0.18,
      alpha: Math.random() * 0.26 + 0.08,
      color: Math.random() > 0.82 ? "53, 213, 167" : "149, 136, 255",
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((particle) => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      if (particle.x < -20) particle.x = width + 20;
      if (particle.x > width + 20) particle.x = -20;
      if (particle.y < -20) particle.y = height + 20;
      if (particle.y > height + 20) particle.y = -20;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${particle.color}, ${particle.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener("resize", resize);
}

initParticles();
