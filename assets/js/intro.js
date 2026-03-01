/* ══════════════════════════════════════════
   INTRO ANIMATION — Controlador
   ══════════════════════════════════════════ */

(function () {

  /* ── Duración total antes de ocultar el intro ── */
  const INTRO_DURATION = 2200; // ms  (ajusta si quieres más o menos tiempo)
  const SKIP_AFTER_SEEN = false; // true = salta el intro si ya se vio hoy

  /* ── ¿Ya lo vio hoy? ── */
  function alreadySeen() {
    if (!SKIP_AFTER_SEEN) return false;
    const last = localStorage.getItem('introLastSeen');
    if (!last) return false;
    const today = new Date().toDateString();
    return last === today;
  }

  function markSeen() {
    localStorage.setItem('introLastSeen', new Date().toDateString());
  }

  /* ── Elimina el overlay y libera la página ── */
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

  /* ── Construye e inyecta el HTML del intro ── */
  function buildIntro() {
    const overlay = document.createElement('div');
    overlay.id = 'intro-overlay';

    overlay.innerHTML = `
      <div class="intro-symbol">

        <!-- Ondas de pulso -->
        <div class="intro-pulse"></div>
        <div class="intro-pulse"></div>
        <div class="intro-pulse"></div>

        <!-- Resplandor rojo -->
        <div class="intro-glow"></div>

        <!-- Logo SVG: corazón con letra N dentro -->
        <img src="assets/images/N Logo.svg" class="intro-logo-svg" alt="N" />

        <!-- Barra inferior -->
        <div class="intro-bar"></div>

        <!-- Efecto de luz -->
        <div class="intro-shine"></div>

        <!-- Nombre de la página -->
        <div class="intro-text">Nuestros Recuerdos</div>

      </div>
    `;

    /* Clic para saltar manualmente */
    overlay.addEventListener('click', hideIntro);

    document.body.appendChild(overlay);
    document.body.classList.add('intro-active');
  }

  /* ── Punto de entrada ── */
  function init() {
    if (alreadySeen()) return; // no mostrar si ya se vio hoy

    buildIntro();

    /* Ocultar automáticamente después de INTRO_DURATION */
    setTimeout(hideIntro, INTRO_DURATION);
  }

  /* Ejecutar tan pronto como el DOM esté listo */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
