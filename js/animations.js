/**
 * ZENTRIX 2026 — Futuristic Visual Animations Engine
 * The Kavery Engineering College (Autonomous)
 * Lightweight Vanilla JS: Scroll Reveal + Floating Particles + Ambient Parallax
 * Zero external libraries & prefers-reduced-motion compliant
 */

(function () {
  'use strict';

  // Check user motion preferences
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================================
     1. SCROLL REVEAL (IntersectionObserver)
     ========================================================================== */
  function initScrollReveal() {
    const revealElements = document.querySelectorAll('[data-reveal]');
    if (!revealElements.length) return;

    // If reduced motion is preferred or IntersectionObserver is unsupported, reveal all immediately
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach(el => el.classList.add('revealed'));
      return;
    }

    // Prepare stagger children indices
    revealElements.forEach(el => {
      if (el.getAttribute('data-reveal') === 'stagger') {
        const children = el.children;
        for (let i = 0; i < children.length; i++) {
          children[i].style.setProperty('--reveal-delay', i);
        }
      }
    });

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => observer.observe(el));
  }

  /* ==========================================================================
     2. FLOATING BACKGROUND PARTICLES (Lightweight 60fps Canvas)
     ========================================================================== */
  function initFloatingParticles() {
    if (prefersReducedMotion) return;
    if (document.getElementById('sym-particles')) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'sym-particles';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let animationFrameId = null;
    let isPaused = false;

    // Palette: Futuristic Cyan, Electric Purple, Radiant Gold
    const colors = [
      { r: 0, g: 242, b: 254 },   // Cyan
      { r: 155, g: 81, b: 224 },  // Purple
      { r: 255, g: 215, b: 0 },   // Gold
      { r: 79, g: 172, b: 254 }   // Blue
    ];

    const PARTICLE_COUNT = 32;
    const particles = [];

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }

    function createParticle() {
      const color = colors[Math.floor(Math.random() * colors.length)];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.8,
        vy: -(Math.random() * 0.35 + 0.15),
        vx: (Math.random() - 0.5) * 0.25,
        baseAlpha: Math.random() * 0.4 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseOffset: Math.random() * Math.PI * 2,
        color: color
      };
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createParticle());
      }
    }

    let time = 0;

    function render() {
      if (isPaused) return;

      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Draw faint connections between nearby particles (distance < 75px)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 75) {
            const alpha = (1 - dist / 75) * 0.1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 242, 254, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.vy;
        p.x += p.vx + Math.sin(time + p.pulseOffset) * 0.15;

        // Wrap around top/bottom/sides
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const currentAlpha = p.baseAlpha + Math.sin(time * p.pulseSpeed * 50 + p.pulseOffset) * 0.15;
        const safeAlpha = Math.max(0.05, Math.min(0.7, currentAlpha));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${safeAlpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    }

    resize();
    initParticles();
    render();

    // Resize handling with debounce
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        initParticles();
      }, 200);
    }, { passive: true });

    // Page Visibility check: Pause when tab is not active to conserve CPU & battery
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        isPaused = true;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      } else {
        isPaused = false;
        render();
      }
    });
  }

  /* ==========================================================================
     3. AMBIENT GLOW ORBS PARALLAX
     ========================================================================== */
  function initAmbientParallax() {
    if (prefersReducedMotion) return;
    // Skip on touch-only mobile devices for efficiency
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

    const orbs = document.querySelectorAll('.ambient-glow');
    if (!orbs.length) return;

    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    let isTicking = false;

    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 28;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 28;

      if (!isTicking) {
        requestAnimationFrame(() => {
          currentX += (mouseX - currentX) * 0.08;
          currentY += (mouseY - currentY) * 0.08;

          orbs.forEach((orb, index) => {
            const factor = (index + 1) * 0.35;
            orb.style.transform = `translate3d(${currentX * factor}px, ${currentY * factor}px, 0)`;
          });

          isTicking = false;
        });
        isTicking = true;
      }
    }, { passive: true });
  }

  /* ==========================================================================
     INITIALIZATION ON DOM READY
     ========================================================================== */
  function init() {
    initScrollReveal();
    initFloatingParticles();
    initAmbientParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
