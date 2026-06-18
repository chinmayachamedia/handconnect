/**
 * landing.js
 * ─────────────────────────────────────────────
 * All landing page enhancement logic.
 * Does NOT touch any of the AR experience code.
 * Loaded after script.js via a separate <script> tag.
 * ─────────────────────────────────────────────
 *
 * Features:
 *  1. Cursor glow — mouse-tracked CSS custom property
 *  2. Hero frame parallax — subtle mouse-driven depth
 *  3. CTA button ripple on click
 *  4. Scroll reveal — IntersectionObserver fade+slide
 *  5. Wordmark easter egg — shake + hand reveal
 *  6. Footer secret easter egg
 *  7. Second start button (#startBtn2) wiring
 *  8. Staggered card reveal delays
 */

(function () {
  'use strict';

  /* ─── 1. CURSOR GLOW ─────────────────────── */
  const cursorGlow = document.getElementById('cursorGlow');

  // Only run cursor tracking on non-touch devices
  if (window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', (e) => {
      // Update CSS custom properties — the element uses these via its left/top
      document.documentElement.style.setProperty('--mx', e.clientX + 'px');
      document.documentElement.style.setProperty('--my', e.clientY + 'px');
    });
  } else {
    // Touch device — hide the glow
    if (cursorGlow) cursorGlow.style.display = 'none';
  }


  /* ─── 2. HERO FRAME PARALLAX ─────────────── */
  const heroFrame   = document.getElementById('heroFrame');
  const parallaxBack = document.getElementById('parallaxBack');
  const parallaxMid  = document.getElementById('parallaxMid');
  const parallaxFore = document.getElementById('parallaxFore');
  const heroSection  = document.getElementById('hero');

  if (heroFrame && heroSection && window.matchMedia('(pointer: fine)').matches) {
    let raf = null;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    heroSection.addEventListener('mousemove', (e) => {
      const rect = heroSection.getBoundingClientRect();
      // Normalise to -1 → 1 relative to hero centre
      targetX = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      targetY = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;

      if (!raf) raf = requestAnimationFrame(animateParallax);
    });

    heroSection.addEventListener('mouseleave', () => {
      targetX = 0;
      targetY = 0;
    });

    function animateParallax() {
      raf = null;
      // Lerp toward target
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      const tiltX = currentY * -5;
      const tiltY = currentX *  5;

      // Frame tilts with mouse
      heroFrame.style.transform =
        `rotate(1.2deg) perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

      // Layers move at different depths (parallax illusion)
      if (parallaxBack) parallaxBack.style.transform = `translate(${currentX * -6}px, ${currentY * -6}px)`;
      if (parallaxMid)  parallaxMid.style.transform  = `translate(${currentX * -10}px, ${currentY * -10}px)`;
      if (parallaxFore) parallaxFore.style.transform = `translate(${currentX * -14}px, ${currentY * -14}px)`;

      if (Math.abs(currentX - targetX) > 0.001 || Math.abs(currentY - targetY) > 0.001) {
        raf = requestAnimationFrame(animateParallax);
      }
    }
  }


  /* ─── 3. CTA BUTTON RIPPLE ───────────────── */
  function addRipple(btn) {
    const ripple = btn.querySelector('.btn-ripple');
    if (!ripple) return;

    btn.addEventListener('click', () => {
      ripple.classList.remove('rippling');
      // Force reflow to restart animation
      void ripple.offsetWidth;
      ripple.classList.add('rippling');
    });
  }

  document.querySelectorAll('.btn-primary').forEach(addRipple);


  /* ─── 4. SCROLL REVEAL ───────────────────── */
  // Cards get staggered delays from data-delay attribute
  const revealEls = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = parseInt(el.dataset.delay || '0', 10);
            setTimeout(() => el.classList.add('revealed'), delay);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach((el) => observer.observe(el));
  } else {
    // Fallback: just show everything
    revealEls.forEach((el) => el.classList.add('revealed'));
  }

  // Hero copy: reveal immediately (it's above the fold)
  const heroCopy = document.querySelector('.hero-copy[data-reveal]');
  if (heroCopy) {
    setTimeout(() => heroCopy.classList.add('revealed'), 120);
  }


  /* ─── 5. WORDMARK EASTER EGG ─────────────── */
  const wordmark = document.getElementById('wordmark');
  const wordmarkText = wordmark && wordmark.querySelector('.wordmark-text');
  let wordmarkClicks = 0;

  if (wordmark && wordmarkText) {
    wordmark.addEventListener('click', () => {
      wordmarkClicks++;

      // Shake on every click
      wordmark.classList.remove('shake');
      void wordmark.offsetWidth;
      wordmark.classList.add('shake');
      wordmark.addEventListener('animationend', () => {
        wordmark.classList.remove('shake');
      }, { once: true });

      // After 5 clicks: reveal hidden message
      if (wordmarkClicks === 5) {
        wordmarkText.textContent = '✋ HandConnect';
        wordmark.style.color = 'var(--accent)';
        wordmark.title = 'you found it';

        // Reset after a moment
        setTimeout(() => {
          wordmarkText.textContent = 'HandConnect';
          wordmark.style.color = '';
          wordmark.title = '(psst: try clicking me)';
          wordmarkClicks = 0;
        }, 2400);
      }
    });
  }


  /* ─── 6. FOOTER SECRET EASTER EGG ────────── */
  const footerSecret = document.getElementById('footerSecret');

  if (footerSecret) {
    footerSecret.addEventListener('click', () => {
      if (footerSecret.classList.contains('revealed-secret')) return;
      footerSecret.classList.add('revealed-secret');
      footerSecret.textContent = 'built between 2am and 4am. the best ideas happen then.';
      footerSecret.setAttribute('aria-label', 'Easter egg: built between 2am and 4am. the best ideas happen then.');
    });
  }


  /* ─── SIGNATURE REVEAL + INTERACTION ────── */
  // ADDED: Fades in when scrolled into view; click triggers brief glow
  const devSig = document.getElementById('devSignature');

  if (devSig) {
    // Scroll reveal via IntersectionObserver
    if ('IntersectionObserver' in window) {
      const sigObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setTimeout(() => devSig.classList.add('sig-visible'), 200);
              sigObserver.unobserve(devSig);
            }
          });
        },
        { threshold: 0.5 }
      );
      sigObserver.observe(devSig);
    } else {
      devSig.classList.add('sig-visible');
    }

    // Click: momentary glow flash
    devSig.addEventListener('click', () => {
      devSig.classList.add('sig-flash');
      setTimeout(() => devSig.classList.remove('sig-flash'), 800);
    });
  }

  /* ─── 7. SECOND START BUTTON ─────────────── */
  // The pre-footer has a second CTA that also triggers the experience
  const startBtn2 = document.getElementById('startBtn2');
  const startBtn  = document.getElementById('startBtn');

  if (startBtn2 && startBtn) {
    startBtn2.addEventListener('click', () => {
      startBtn.click();
    });
  }


  /* ─── 8. IDLE ANIMATION FOR HERO FRAME ───── */
  // When mouse hasn't moved for 3s, gently bob the frame
  if (heroFrame) {
    let idleTimer = null;
    let idleRaf   = null;
    let idleTime  = 0;
    let isIdle    = false;

    function startIdle() {
      isIdle = true;
      let lastNow = performance.now();

      function bobFrame(now) {
        if (!isIdle) return;
        idleRaf = requestAnimationFrame(bobFrame);

        idleTime += (now - lastNow) / 1000;
        lastNow = now;

        const bobY = Math.sin(idleTime * 0.6) * 4;
        const bobR = Math.sin(idleTime * 0.4) * 0.5 + 1.2;
        heroFrame.style.transform = `rotate(${bobR}deg) translateY(${bobY}px)`;
      }

      idleRaf = requestAnimationFrame(bobFrame);
    }

    function stopIdle() {
      isIdle = false;
      idleTime = 0;
      if (idleRaf) {
        cancelAnimationFrame(idleRaf);
        idleRaf = null;
      }
    }

    function resetIdle() {
      stopIdle();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(startIdle, 3000);
    }

    // Start idle bob after initial 3s
    idleTimer = setTimeout(startIdle, 3000);

    // Cancel idle on mouse movement over hero
    if (heroSection) {
      heroSection.addEventListener('mousemove', resetIdle, { passive: true });
      heroSection.addEventListener('mouseleave', () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(startIdle, 1500);
      });
    }
  }

})();
