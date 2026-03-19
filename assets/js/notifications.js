/* ══════════════════════════════════════════
   NUESTROS RECUERDOS — Notificaciones Firebase
   ══════════════════════════════════════════ */

const firebaseConfig = {
  apiKey:            "AIzaSyARvM4FKjpchxUJVDH2q3wwlSrihBrYHiA",
  authDomain:        "nuestros-recuerdos-f17cf.firebaseapp.com",
  databaseURL:       "https://nuestros-recuerdos-f17cf-default-rtdb.firebaseio.com",
  projectId:         "nuestros-recuerdos-f17cf",
  storageBucket:     "nuestros-recuerdos-f17cf.firebasestorage.app",
  messagingSenderId: "451853471218",
  appId:             "1:451853471218:web:620c8ed5e3734e35b9ef6b"
};

let _db = null;

function getDB() {
  if (_db) return _db;
  try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    _db = firebase.database();
  } catch(e) {
    console.warn('Firebase no disponible:', e);
  }
  return _db;
}

/* ════════════════════
   GUARDAR NOTIFICACIÓN
════════════════════ */
function saveNotification(card, uploaderUsername) {
  const db = getDB();
  if (!db) return;

  let thumbUrl = '';
  if (card.image) {
    thumbUrl = card.image;
  } else if (card.video) {
    const afterUpload = card.video.split('/upload/')[1] || '';
    const pubId       = afterUpload.replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '');
    thumbUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/video/upload/w_120,h_120,c_fill,so_2/${pubId}.jpg`;
  }

  const notif = {
    title:    card.title,
    emoji:    card.emoji    || '📸',
    gradient: card.gradient || 'linear-gradient(135deg,#4a0015,#c0396e)',
    thumb:    thumbUrl,
    uploader: uploaderUsername,
    fecha:    card.fecha || '',
    ts:       Date.now(),
    image:    card.image || '',
    video:    card.video || '',
    readBy:   { [uploaderUsername]: true },
  };

  db.ref('notifications').push(notif)
    .catch(e => console.warn('Error guardando notif:', e));
}

/* ════════════════════
   MARCAR COMO LEÍDA
════════════════════ */
function markAllRead(username) {
  const db = getDB();
  if (!db) return;

  db.ref('notifications').once('value', snap => {
    const updates = {};
    snap.forEach(child => {
      const n = child.val();
      if (!n.readBy || !n.readBy[username]) {
        updates[`notifications/${child.key}/readBy/${username}`] = true;
      }
    });
    if (Object.keys(updates).length > 0) db.ref().update(updates);
  });
}

/* ════════════════════
   CONTAR NO LEÍDAS
════════════════════ */
async function contarNoLeidas(username) {
  return new Promise(resolve => {
    firebase.database().ref('notifications').once('value', snap => {
      let count = 0;
      snap.forEach(child => {
        const n = child.val();
        if (!n.readBy || !n.readBy[username]) count++;
      });
      resolve(count);
    });
  });
}

/* ════════════════════
   BADGE CAMPANA
════════════════════ */
function updateBellBadge(unreadCount) {
  const bell = document.querySelector('.nav-icon[title="Notificaciones"]');
  if (!bell) return;

  const existing = document.getElementById('bell-badge');
  if (existing) existing.remove();

  if (unreadCount > 0) {
    const badge = document.createElement('span');
    badge.id = 'bell-badge';
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    badge.style.cssText = `
      position: absolute;
      top: -5px; right: -5px;
      background: #e50914;
      color: white;
      border-radius: 50%;
      font-size: 0.58rem;
      font-weight: 700;
      min-width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Lato', sans-serif;
      pointer-events: none;
      animation: badgePop 0.3s cubic-bezier(0.22,1,0.36,1);
      line-height: 1;
    `;
    bell.style.position = 'relative';
    bell.style.display  = 'inline-flex';
    bell.appendChild(badge);
  }
}

/* ════════════════════
   ABRIR RECUERDO DESDE NOTIFICACIÓN
════════════════════ */
async function abrirRecuerdoDesdeNotif(key, username) {
  // Cerrar panel
  const panel = document.getElementById('notif-panel');
  if (panel) panel.remove();

  // Marcar como leída en Firebase
  try {
    await firebase.database()
      .ref(`notifications/${key}/readBy/${username}`)
      .set(true);
    const noLeidas = await contarNoLeidas(username);
    updateBellBadge(noLeidas);
  } catch(e) {
    console.warn('Error marcando leída:', e);
  }

  // Obtener datos de la notificación
  const n = window[`notif_${key}`];
  if (!n) return;

  // Buscar la card en los carruseles por título (coincidencia exacta)
  let encontrada = false;
  document.querySelectorAll('.card').forEach(el => {
    if (encontrada) return;
    const tituloEl = el.querySelector('.card-title');
    if (tituloEl && tituloEl.textContent.trim() === n.title.trim()) {
      encontrada = true;
      el.click();
    }
  });

  // Si no se encontró en carruseles, abrir modal con datos de la notif
  if (!encontrada && typeof openModal === 'function') {
    const card = {
      title:    n.title,
      emoji:    n.emoji    || '📸',
      gradient: n.gradient || 'linear-gradient(135deg,#4a0015,#c0396e)',
      sub:      `Subido por ${n.uploader}`,
      desc:     `Recuerdo subido por ${n.uploader}`,
      fecha:    n.fecha    || '',
      image:    n.image    || '',
      video:    n.video    || '',
    };
    openModal(card);
  }
}

/* ════════════════════
   RENDER ITEM NOTIFICACIÓN
════════════════════ */
function renderNotifItem(n, username) {
  const isUnread  = !n.readBy || !n.readBy[username];
  const timeAgo   = formatTimeAgo(n.ts);

  // Guardar datos para acceder al hacer click
  window[`notif_${n.key}`] = n;

  const thumbHTML = n.thumb
    ? `<img src="${n.thumb}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;flex-shrink:0;"
         onerror="this.style.display='none'"/>`
    : `<div style="width:44px;height:44px;border-radius:6px;flex-shrink:0;
         background:${n.gradient};display:flex;align-items:center;
         justify-content:center;font-size:1.3rem;">${n.emoji}</div>`;

  return `
    <div onclick="abrirRecuerdoDesdeNotif('${n.key}', '${username}')"
      style="display:flex;align-items:center;gap:0.8rem;padding:0.8rem 1.2rem;
      border-bottom:1px solid #1a1a1a;cursor:pointer;
      background:${isUnread ? 'rgba(229,9,20,0.06)' : 'transparent'};"
      onmouseover="this.style.background='rgba(255,255,255,0.04)'"
      onmouseout="this.style.background='${isUnread ? 'rgba(229,9,20,0.06)' : 'transparent'}'">
      ${thumbHTML}
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.83rem;color:${isUnread ? 'white' : '#888'};
          font-weight:${isUnread ? '700' : '400'};
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${n.title}</div>
        <div style="font-size:0.7rem;color:#555;margin-top:0.15rem;">
          ${n.uploader} · ${timeAgo}
        </div>
      </div>
      ${isUnread
        ? `<div id="dot_${n.key}" style="width:7px;height:7px;border-radius:50%;background:#e50914;flex-shrink:0;"></div>`
        : '<div style="width:7px;height:7px;flex-shrink:0;"></div>'
      }
    </div>`;
}

/* ════════════════════
   POP-UP FLOTANTE
════════════════════ */
function showNotifPopup(notif) {
  const existing = document.getElementById('notif-popup');
  if (existing) existing.remove();

  const thumbHTML = notif.thumb
    ? `<img src="${notif.thumb}"
         style="width:52px;height:52px;object-fit:cover;border-radius:8px;flex-shrink:0;"
         onerror="this.outerHTML='<div style=\'width:52px;height:52px;border-radius:8px;background:${notif.gradient};display:flex;align-items:center;justify-content:center;font-size:1.5rem\'>${notif.emoji}</div>'">`
    : `<div style="width:52px;height:52px;border-radius:8px;flex-shrink:0;
         background:${notif.gradient};display:flex;align-items:center;
         justify-content:center;font-size:1.5rem;">${notif.emoji}</div>`;

  const popup = document.createElement('div');
  popup.id = 'notif-popup';
  popup.style.cssText = `
    position: fixed;
    bottom: 24px; right: 24px;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-left: 3px solid #e50914;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.9rem;
    max-width: 300px;
    z-index: 9998;
    box-shadow: 0 16px 48px rgba(0,0,0,0.8);
    animation: notifSlideIn 0.4s cubic-bezier(0.22,1,0.36,1);
    cursor: pointer;
  `;

  popup.innerHTML = `
    <style>
      @keyframes notifSlideIn {
        from { transform: translateX(120%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      @keyframes notifSlideOut {
        from { transform: translateX(0);    opacity: 1; }
        to   { transform: translateX(120%); opacity: 0; }
      }
      @keyframes badgePop {
        0%   { transform: scale(0); }
        70%  { transform: scale(1.3); }
        100% { transform: scale(1); }
      }
    </style>
    ${thumbHTML}
    <div style="flex:1;min-width:0;">
      <div style="font-size:0.68rem;color:#e50914;font-weight:700;
        letter-spacing:1px;text-transform:uppercase;margin-bottom:0.2rem;
        font-family:'Lato',sans-serif;">💖 Nuevo recuerdo</div>
      <div style="font-size:0.88rem;color:white;font-weight:700;
        font-family:'Playfair Display',serif;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${notif.title}
      </div>
      <div style="font-size:0.72rem;color:#888;font-family:'Lato',sans-serif;margin-top:0.15rem;">
        Subido por ${notif.uploader}
      </div>
    </div>
    <button id="notif-popup-close" style="
      position:absolute;top:8px;right:8px;
      background:none;border:none;color:#555;
      cursor:pointer;font-size:0.8rem;padding:2px 5px;border-radius:4px;">✕</button>
  `;

  popup.querySelector('#notif-popup-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.remove();
  });

  popup.addEventListener('click', () => {
    popup.remove();
    openNotifPanel();
  });

  document.body.appendChild(popup);

  setTimeout(() => {
    if (popup.parentNode) {
      popup.style.animation = 'notifSlideOut 0.3s ease forwards';
      setTimeout(() => popup.remove(), 300);
    }
  }, 6000);
}

/* ════════════════════
   PANEL DE NOTIFICACIONES
════════════════════ */
function openNotifPanel() {
  const existing = document.getElementById('notif-panel');
  if (existing) { existing.remove(); return; }

  const session = (typeof getSession === 'function') ? getSession() : null;
  if (!session || session.guest) return;

  const db   = getDB();
  const bell = document.querySelector('.nav-icon[title="Notificaciones"]');
  const rect = bell ? bell.getBoundingClientRect() : { bottom: 70, right: 80 };

  const panel = document.createElement('div');
  panel.id = 'notif-panel';
  panel.style.cssText = `
    position: fixed;
    top: ${rect.bottom + 8}px;
    right: ${window.innerWidth - rect.right - 8}px;
    background: #161616;
    border: 1px solid #2a2a2a;
    border-radius: 12px;
    width: 300px;
    max-height: 520px;
    overflow-y: auto;
    z-index: 9000;
    box-shadow: 0 16px 48px rgba(0,0,0,0.8);
    animation: menuIn 0.2s cubic-bezier(0.22,1,0.36,1);
    font-family: 'Lato', sans-serif;
  `;

  panel.innerHTML = `
    <div style="padding:1rem 1.2rem 0.8rem;border-bottom:1px solid #222;
      display:flex;align-items:center;justify-content:space-between;
      position:sticky;top:0;background:#161616;z-index:1;">
      <span style="font-family:'Playfair Display',serif;font-size:1rem;color:white;">🔔 Notificaciones</span>
      <span id="notif-mark-read" style="font-size:0.72rem;color:#e50914;cursor:pointer;font-weight:700;">
        Marcar leídas
      </span>
    </div>
    <div id="notif-panel-list" style="padding:0.4rem 0;">
      <div style="padding:2rem;text-align:center;color:#444;font-size:0.85rem;">Cargando... ⏳</div>
    </div>
  `;

  document.body.appendChild(panel);

  if (db) {
    db.ref('notifications').orderByChild('ts').once('value', snap => {
      const list = document.getElementById('notif-panel-list');
      if (!list) return;

      const noLeidas = [];
      const leidas   = [];

      snap.forEach(child => {
        const n = { key: child.key, ...child.val() };
        const esNoLeida = !n.readBy || !n.readBy[session.username];
        if (esNoLeida) noLeidas.unshift(n);
        else leidas.unshift(n);
      });

      noLeidas.sort((a, b) => b.ts - a.ts);
      leidas.sort((a, b) => b.ts - a.ts);

      if (noLeidas.length === 0 && leidas.length === 0) {
        list.innerHTML = `<div style="padding:2rem;text-align:center;color:#444;font-size:0.85rem;">
          Sin notificaciones aún 🌙</div>`;
        return;
      }

      let html = '';

      // Sección no leídas
      if (noLeidas.length > 0) {
        html += `<div style="padding:0.4rem 1.2rem 0.3rem;font-size:0.68rem;
          color:#e50914;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
          Nuevas (${noLeidas.length})
        </div>`;
        html += noLeidas.map(n => renderNotifItem(n, session.username)).join('');
      }

      // Sección leídas — solo últimas 10
      if (leidas.length > 0) {
        const recientes = leidas.slice(0, 10);
        html += `<div style="padding:0.6rem 1.2rem 0.3rem;font-size:0.68rem;
          color:#555;font-weight:700;letter-spacing:1px;text-transform:uppercase;
          border-top:1px solid #222;margin-top:0.3rem;">
          Anteriores
        </div>`;
        html += recientes.map(n => renderNotifItem(n, session.username)).join('');

        if (leidas.length > 10) {
          html += `<div style="padding:0.8rem;text-align:center;">
            <button onclick="expandLeidas()" style="
              background:none;border:1px solid #333;color:#666;
              border-radius:6px;padding:0.4rem 1rem;font-size:0.75rem;
              cursor:pointer;font-family:'Lato',sans-serif;">
              Ver ${leidas.length - 10} más
            </button>
          </div>`;
          window._notifsLeidasExtra = leidas.slice(10);
          window._notifsUsername    = session.username;
        }
      }

      list.innerHTML = html;
    });
  }

  // Solo marca leídas al presionar el botón
  panel.querySelector('#notif-mark-read')?.addEventListener('click', () => {
    markAllRead(session.username);
    updateBellBadge(0);
    panel.remove();
  });

  setTimeout(() => {
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && !bell?.contains(e.target)) panel.remove();
    }, { once: true });
  }, 50);
}

/* ─── Expandir leídas antiguas ─── */
function expandLeidas() {
  const extra    = window._notifsLeidasExtra || [];
  const username = window._notifsUsername || '';
  const list     = document.getElementById('notif-panel-list');
  if (!list) return;

  const btn = list.querySelector('button[onclick="expandLeidas()"]')?.parentElement;
  if (btn) btn.remove();

  const div = document.createElement('div');
  div.innerHTML = extra.map(n => renderNotifItem(n, username)).join('');
  list.appendChild(div);
}

/* ════════════════════
   TIEMPO RELATIVO
════════════════════ */
function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'Ahora mismo';
  if (m < 60) return `hace ${m}m`;
  if (h < 24) return `hace ${h}h`;
  return `hace ${d}d`;
}

/* ════════════════════
   INICIALIZAR
════════════════════ */
function initNotifications() {
  const session = (typeof getSession === 'function') ? getSession() : null;
  if (!session || session.guest) return;

  const db = getDB();
  if (!db) return;

  const bell = document.querySelector('.nav-icon[title="Notificaciones"]');
  if (bell) {
    bell.style.cursor = 'pointer';
    bell.onclick = (e) => { e.stopPropagation(); openNotifPanel(); };
  }

  // Escuchar nuevas notificaciones en tiempo real
  db.ref('notifications').orderByChild('ts').startAt(Date.now() - 5000)
    .on('child_added', snap => {
      const n = snap.val();
      if (!n) return;
      if (n.uploader === session.username) return;
      if (n.readBy && n.readBy[session.username]) return;

      db.ref('notifications').once('value', allSnap => {
        let unread = 0;
        allSnap.forEach(child => {
          const notif = child.val();
          if (!notif.readBy || !notif.readBy[session.username]) unread++;
        });
        updateBellBadge(unread);
      });

      showNotifPopup(n);
    });

  // Badge inicial
  db.ref('notifications').once('value', snap => {
    let unread = 0;
    snap.forEach(child => {
      const n = child.val();
      if (!n.readBy || !n.readBy[session.username]) unread++;
    });
    updateBellBadge(unread);

    // Pop-up si hay no leídas recientes (últimas 24h)
    const recientes = [];
    snap.forEach(child => {
      const n = child.val();
      if (n.uploader !== session.username &&
          (!n.readBy || !n.readBy[session.username]) &&
          (Date.now() - n.ts) < 86400000) {
        recientes.push(n);
      }
    });
    if (recientes.length > 0) {
      setTimeout(() => showNotifPopup(recientes[recientes.length - 1]), 1500);
    }
  });
}