/* ══════════════════════════════════════════
   INTRO ANIMATION — Controlador
   ══════════════════════════════════════════ */

(function () {

  const SKIP_AFTER_SEEN = false;

  function alreadySeen() {
    if (!SKIP_AFTER_SEEN) return false;
    const last = localStorage.getItem('introLastSeen');
    if (!last) return false;
    return last === new Date().toDateString();
  }

  function markSeen() {
    localStorage.setItem('introLastSeen', new Date().toDateString());
  }

  function hideIntro() {
    const overlay = document.getElementById('intro-overlay');
    if (!overlay) return;

    overlay.classList.add('fade-out');
    document.body.classList.remove('intro-active');

    overlay.addEventListener('transitionend', () => {
      overlay.remove();
    }, { once: true });

    markSeen();
  }

  function buildIntro() {
    const overlay = document.createElement('div');
    overlay.id = 'intro-overlay';

    overlay.innerHTML = `
      <div class="intro-symbol">
        <div class="intro-pulse"></div>
        <div class="intro-pulse"></div>
        <div class="intro-pulse"></div>
        <div class="intro-glow"></div>
        <img src="assets/images/N Logo.svg" class="intro-logo-svg" alt="N" />
        <div class="intro-bar"></div>
        <div class="intro-shine"></div>
        <div class="intro-text">Nuestros Recuerdos</div>
      </div>
    `;

    overlay.addEventListener('click', hideIntro);
    document.body.appendChild(overlay);
    document.body.classList.add('intro-active');
  }

  function init() {
    if (alreadySeen()) return;

    buildIntro();

    // Fase 1: aparece y hace pulso (0 - 1800ms)
    // Fase 2: zoom hacia adelante (1800 - 2600ms)
    // Fase 3: fade out del overlay (2600ms+)
    setTimeout(() => {
      const logo = document.querySelector('.intro-logo-svg');
      const glow = document.querySelector('.intro-glow');
      const text = document.querySelector('.intro-text');
      const bar  = document.querySelector('.intro-bar');
      if (logo) logo.classList.add('intro-zoom-out');
      if (glow) glow.classList.add('intro-zoom-out');
      if (text) text.style.opacity = '0';
      if (bar)  bar.style.opacity  = '0';
    }, 1800);

    setTimeout(hideIntro, 2600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();