/* ══════════════════════════════════════════
   NUESTROS RECUERDOS — Sistema de Login
   ══════════════════════════════════════════ */

const USERS = [
  { username: "KerllyV",   password: "kerlly2000",  emoji: "🌸", color: "#ff6b8a" },
  { username: "LeonardoJ", password: "leonardo2002", emoji: "💙", color: "#4a9eff" },
];

const SESSION_KEY = 'nuestrosRecuerdos_session';

/* ════════════════════
   VERIFICAR SESIÓN
════════════════════ */
function getSession() {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch(e) { return null; }
}

function saveSession(user) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      username: user.username,
      emoji:    user.emoji,
      color:    user.color,
      loginAt:  Date.now(),
    }));
  } catch(e) {}
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
}

/* ════════════════════
   LOGIN
════════════════════ */
function attemptLogin(username, password) {
  const user = USERS.find(
    u => u.username.toLowerCase() === username.trim().toLowerCase()
      && u.password === password
  );
  if (user) {
    saveSession(user);
    return { ok: true, user };
  }
  return { ok: false };
}

function logout() {
  clearSession();
  showLoginScreen();
}

/* ════════════════════
   MOSTRAR / OCULTAR LOGIN
════════════════════ */
function showLoginScreen() {
  document.getElementById('login-overlay').classList.add('active');
  document.getElementById('login-input-user').value = '';
  document.getElementById('login-input-pass').value = '';
  document.getElementById('login-error').style.display = 'none';
  document.body.style.overflow = 'hidden';
}

function hideLoginScreen() {
  const overlay = document.getElementById('login-overlay');
  overlay.classList.add('hiding');
  setTimeout(() => {
    overlay.classList.remove('active', 'hiding');
    document.body.style.overflow = '';
  }, 600);
}

/* ════════════════════
   ACTUALIZAR UI SEGÚN SESIÓN
════════════════════ */
function applySession(session) {
  // Botón de subida — solo si está logueado
  const uploadBtn = document.querySelector('[onclick="openUploadModal()"]');
  if (uploadBtn) {
    uploadBtn.style.display = session ? '' : 'none';
  }

  // Mostrar usuario en navbar
  const avatar = document.querySelector('.nav-avatar');
  if (avatar && session) {
    avatar.textContent  = session.emoji;
    avatar.title        = session.username;
    avatar.style.cursor = 'pointer';
    avatar.onclick      = () => {
      if (confirm(`¿Cerrar sesión de ${session.username}?`)) logout();
    };
  }

  // Tooltip en avatar si no hay sesión
  if (avatar && !session) {
    avatar.textContent  = '💑';
    avatar.title        = 'Iniciar sesión';
    avatar.style.cursor = 'pointer';
    avatar.onclick      = () => showLoginScreen();
  }
}

/* ════════════════════
   MANEJAR SUBMIT DEL FORM
════════════════════ */
function handleLoginSubmit() {
  const username = document.getElementById('login-input-user').value;
  const password = document.getElementById('login-input-pass').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-submit-btn');

  if (!username || !password) {
    showLoginError('Completa todos los campos.');
    return;
  }

  // Animación de carga
  btn.disabled    = true;
  btn.textContent = '...';

  setTimeout(() => {
    const result = attemptLogin(username, password);
    if (result.ok) {
      btn.textContent = '♥';
      errEl.style.display = 'none';
      applySession(result.user);
      setTimeout(() => hideLoginScreen(), 400);
    } else {
      btn.disabled    = false;
      btn.textContent = 'Entrar';
      showLoginError('Usuario o contraseña incorrectos.');
      // Shake animation
      document.querySelector('.login-box').classList.add('shake');
      setTimeout(() => document.querySelector('.login-box').classList.remove('shake'), 500);
    }
  }, 600);
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent    = msg;
  el.style.display  = 'block';
}

/* ════════════════════
   INIT
════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const session = getSession();

  if (!session) {
    showLoginScreen();
  } else {
    applySession(session);
  }

  // Enter key en los inputs
  ['login-input-user', 'login-input-pass'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleLoginSubmit();
    });
  });
});
