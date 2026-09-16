/**
 * ZENTRIX 2026 - Main Application UI Scripts
 * The Kavery Engineering College (Autonomous)
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initCountdownTimer();
  initScrollEffects();
  initPaymentCopy();
});

function initPaymentCopy() {
  const copyButton = document.getElementById('copyUpiBtn');
  const upiId = document.getElementById('upiId');
  if (!copyButton || !upiId) return;

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(upiId.textContent.trim());
      copyButton.textContent = 'COPIED';
      setTimeout(() => { copyButton.textContent = 'COPY UPI ID'; }, 1600);
    } catch (error) {
      copyButton.textContent = 'SELECT UPI ID';
    }
  });
}

/**
 * Mobile Navigation Toggle & Smooth Scrolling
 */
function initNavigation() {
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const header = document.querySelector('.header');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('active');
      navToggle.classList.toggle('open');
    });

    // Close mobile nav when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (event) => {
        const targetId = link.getAttribute('href');
        if (targetId && targetId.startsWith('#')) {
          const target = document.querySelector(targetId);
          if (target) {
            event.preventDefault();
            header?.classList.remove('header-hidden');
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        navLinks.classList.remove('active');
        if (navToggle) navToggle.classList.remove('open');
      });
    });

    // Close mobile nav when clicking anywhere outside
    document.addEventListener('click', (event) => {
      if (navLinks.classList.contains('active') && !navLinks.contains(event.target) && !navToggle.contains(event.target)) {
        navLinks.classList.remove('active');
        navToggle.classList.remove('open');
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        navToggle.classList.remove('open');
      }
    });
  }
}

/**
 * Countdown Timer to Registration Deadline: September 21, 2026
 */
function initCountdownTimer() {
  const daysEl = document.getElementById('cdDays');
  const hoursEl = document.getElementById('cdHours');
  const minutesEl = document.getElementById('cdMinutes');
  const secondsEl = document.getElementById('cdSeconds');

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  const targetDate = new Date(window.SYMPOSIUM_META?.registrationDeadline || '2026-09-21T23:59:59+05:30').getTime();

  function updateTimer() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance <= 0) {
      daysEl.textContent = '00';
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    daysEl.textContent = days.toString().padStart(2, '0');
    hoursEl.textContent = hours.toString().padStart(2, '0');
    minutesEl.textContent = minutes.toString().padStart(2, '0');
    secondsEl.textContent = seconds.toString().padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

/**
 * Sticky Navbar Glassmorphism on Scroll
 */
function initScrollEffects() {
  const header = document.querySelector('.header');
  if (!header) return;

  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    if (currentScrollY > lastScrollY && currentScrollY > 120) {
      header.classList.add('header-hidden');
    } else {
      header.classList.remove('header-hidden');
    }

    lastScrollY = currentScrollY;
  });
}
