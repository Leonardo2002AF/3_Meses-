/* ══════════════════════════════════════════
   NUESTROS RECUERDOS — Subida a Cloudinary
   ══════════════════════════════════════════ */

const CLOUDINARY_CLOUD  = "dwtqq0c7y";
const CLOUDINARY_PRESET = "2 Meses";
const CLOUDINARY_API_KEY = "779436443365798";

/* ─── Categorías disponibles ─── */
const UPLOAD_CATEGORIES = [
  { id: "c1", label: "▶ Seguir Viendo"       },
  { id: "c2", label: "⭐ Momentos Destacados" },
  { id: "c4", label: "✈ Viajes Juntos"        },
  { id: "c5", label: "🎂 Fechas Especiales"   },
  { id: "c6", label: "🏠 Momentos en Casa"    },
];

/* ─── Estado del modal ─── */
let uploadState = {
  file:     null,
  type:     null,
  preview:  null,
  category: UPLOAD_CATEGORIES[0].id,
};

/* ════════════════════
   ABRIR / CERRAR MODAL
════════════════════ */
function openUploadModal() {
  resetUploadModal();
  document.getElementById('upload-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeUploadModal() {
  document.getElementById('upload-modal').classList.remove('open');
  document.body.style.overflow = '';
  resetUploadModal();
}

function resetUploadModal() {
  uploadState = { file: null, type: null, preview: null, category: UPLOAD_CATEGORIES[0].id };
  const dropzone = document.getElementById('um-dropzone');
  if (dropzone) {
    dropzone.innerHTML = `
      <div class="um-drop-icon">📁</div>
      <p class="um-drop-label">Toca para elegir una foto o video</p>
      <p class="um-drop-sub">JPG, PNG, MP4, MOV · Máx. 100 MB</p>
      <input type="file" id="um-file-input" accept="image/*,video/*" capture="environment"
             style="display:none" onchange="onFileSelected(event)"/>
      <button class="btn btn-outline um-choose-btn" onclick="document.getElementById('um-file-input').click()">
        📷 Elegir archivo
      </button>
    `;
  }
  const titleInput = document.getElementById('um-title');
  if (titleInput) titleInput.value = '';
  const descInput = document.getElementById('um-desc');
  if (descInput)  descInput.value  = '';

  setUploadStep(1);
}

/* ════════════════════
   PASOS DEL MODAL
════════════════════ */
function setUploadStep(step) {
  document.querySelectorAll('.um-step').forEach((el, i) => {
    el.classList.toggle('um-step-active', i + 1 === step);
  });
  document.querySelectorAll('.um-step-dot').forEach((el, i) => {
    el.classList.toggle('active', i + 1 <= step);
  });
}

/* ════════════════════
   SELECCIÓN DE ARCHIVO
════════════════════ */
function onFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 100 * 1024 * 1024) {
    showUploadError('El archivo supera los 100 MB. Elige uno más pequeño.');
    return;
  }

  uploadState.file = file;
  uploadState.type = file.type.startsWith('video/') ? 'video' : 'image';

  const reader = new FileReader();
  reader.onload = (ev) => {
    uploadState.preview = ev.target.result;
    showPreview(uploadState.type, ev.target.result, file.name);
    setUploadStep(2);
  };
  reader.readAsDataURL(file);
}

function showPreview(type, src, name) {
  const dropzone = document.getElementById('um-dropzone');
  if (type === 'video') {
    dropzone.innerHTML = `
      <video src="${src}" controls class="um-preview-media"></video>
      <p class="um-preview-name">🎬 ${name}</p>
      <button class="btn btn-outline um-change-btn" onclick="triggerFileInput()">🔄 Cambiar archivo</button>
      <input type="file" id="um-file-input" accept="image/*,video/*" capture="environment"
             style="display:none" onchange="onFileSelected(event)"/>
    `;
  } else {
    dropzone.innerHTML = `
      <img src="${src}" alt="preview" class="um-preview-media"/>
      <p class="um-preview-name">🖼️ ${name}</p>
      <button class="btn btn-outline um-change-btn" onclick="triggerFileInput()">🔄 Cambiar archivo</button>
      <input type="file" id="um-file-input" accept="image/*,video/*" capture="environment"
             style="display:none" onchange="onFileSelected(event)"/>
    `;
  }
}

function triggerFileInput() {
  document.getElementById('um-file-input').click();
}

/* ════════════════════
   SUBIR A CLOUDINARY
════════════════════ */
async function startUpload() {
  const title    = document.getElementById('um-title').value.trim();
  const desc     = document.getElementById('um-desc').value.trim();
  const emoji    = document.getElementById('um-emoji').value || '📸';
  const category = document.getElementById('um-category').value;

  if (!uploadState.file) { showUploadError('Primero elige un archivo.');          return; }
  if (!title)             { showUploadError('Escribe un título para el recuerdo.'); return; }

  setUploadStep(3);
  showProgress(0);

  try {
    const url = await uploadToCloudinary(uploadState.file, (pct) => showProgress(pct));

    const card = {
      title,
      emoji,
      sub:      desc || title,
      desc:     desc || `Un recuerdo especial: ${title}`,
      gradient: randomGradient(),
      image:    uploadState.type === 'image' ? url : '',
      video:    uploadState.type === 'video' ? url : '',
    };

    // ✅ CORRECCIÓN 1: extraer publicId correctamente y pasar todos los parámetros
    const publicId = url.split('/upload/')[1].split('.')[0];
    const resType  = uploadState.type === 'video' ? 'video' : 'image';
    await saveCardToStorage(category, card, publicId, resType);

    addCardToCarousel(category, card);
    showUploadSuccess(title);
    setUploadStep(4);

  } catch (err) {
    console.error(err);
    showUploadError('Error al subir. Revisa tu conexión e intenta de nuevo.');
    setUploadStep(2);
  }
}

function uploadToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file',          file);
    form.append('upload_preset', CLOUDINARY_PRESET);
    form.append('folder',        'nuestros-recuerdos');

    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        reject(new Error(`Cloudinary error: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(form);
  });
}

/* ════════════════════
   PROGRESO
════════════════════ */
function showProgress(pct) {
  const bar   = document.getElementById('um-progress-bar');
  const label = document.getElementById('um-progress-label');
  if (bar)   bar.style.width   = pct + '%';
  if (label) label.textContent = pct < 100 ? `Subiendo... ${pct}%` : '✅ ¡Listo!';
}

function showUploadError(msg) {
  const el = document.getElementById('um-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  setTimeout(() => { if (el) el.style.display = 'none'; }, 4000);
}

function showUploadSuccess(title) {
  const el = document.getElementById('um-success-title');
  if (el) el.textContent = `"${title}" fue agregado 💖`;
}

/* ════════════════════
   GUARDAR METADATA EN CLOUDINARY
════════════════════ */
// ✅ CORRECCIÓN 2: función ahora recibe publicId y resourceType
async function saveCardToStorage(categoryId, card, publicId, resourceType) {
  const context = [
    `title=${encodeURIComponent(card.title)}`,
    `sub=${encodeURIComponent(card.sub)}`,
    `desc=${encodeURIComponent(card.desc)}`,
    `emoji=${encodeURIComponent(card.emoji)}`,
    `category=${categoryId}`,
    `gradient=${encodeURIComponent(card.gradient)}`,
    `type=${resourceType}`,
  ].join('|');

  await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/resources/${resourceType}/upload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        public_ids: [publicId],
        context,
        api_key: CLOUDINARY_API_KEY,
      }),
    }
  );
}

/* ════════════════════
   CARGAR TARJETAS DESDE CLOUDINARY
════════════════════ */
// ✅ CORRECCIÓN 3: carga desde Cloudinary en vez de localStorage
async function loadSavedCards() {
  try {
    const res = await fetch(
      `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/list/nuestros-recuerdos.json`
    );
    if (!res.ok) return;
    const data = await res.json();

    (data.resources || []).forEach(r => {
      const ctx      = r.context?.custom || {};
      const category = ctx.category || 'c1';
      const type     = ctx.type     || 'image';
      const card = {
        title:    decodeURIComponent(ctx.title    || 'Recuerdo'),
        sub:      decodeURIComponent(ctx.sub      || ''),
        desc:     decodeURIComponent(ctx.desc     || ''),
        emoji:    decodeURIComponent(ctx.emoji    || '📸'),
        gradient: decodeURIComponent(ctx.gradient || randomGradient()),
        image:    type === 'image' ? r.secure_url : '',
        video:    type === 'video' ? r.secure_url : '',
      };
      addCardToCarousel(category, card, false);
    });
  } catch (err) {
    console.warn('No se pudieron cargar recuerdos:', err);
  }
}

/* ════════════════════
   AGREGAR TARJETA AL CARRUSEL
════════════════════ */
function addCardToCarousel(categoryId, card, prepend = false) {
  const container = document.getElementById(categoryId);
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'card';

  let thumbHTML = '';
  if (card.image) {
    thumbHTML = `<img src="${card.image}" alt="${card.title}"
                      style="width:100%;height:120px;object-fit:cover;"
                      onerror="this.style.display='none'">`;
  } else if (card.video) {
    thumbHTML = `<div class="card-thumb-placeholder" style="background:${card.gradient};position:relative;">
                   <span style="font-size:2rem">▶</span>
                   <span style="font-size:0.65rem;position:absolute;bottom:4px;right:6px;background:rgba(0,0,0,0.6);padding:1px 5px;border-radius:3px;">VIDEO</span>
                 </div>`;
  } else {
    thumbHTML = `<div class="card-thumb-placeholder" style="background:${card.gradient}">
                   <span style="font-size:2.5rem">${card.emoji}</span>
                 </div>`;
  }

  el.innerHTML = `
    ${thumbHTML}
    <div class="card-info">
      <div class="card-title">${card.title}</div>
      <div class="card-sub">${card.sub}</div>
    </div>
    <div class="card-overlay"><div class="card-play">▶</div></div>
  `;

  el.onclick = () => openModal(card);

  if (prepend && container.firstChild) {
    container.insertBefore(el, container.firstChild);
  } else {
    container.prepend(el);
  }
}

/* ════════════════════
   HELPERS
════════════════════ */
function randomGradient() {
  const pairs = [
    ['#4a0015','#c0396e'], ['#001a2a','#1a5276'], ['#002a0f','#1a6b3c'],
    ['#1a0030','#7b2d9e'], ['#2a1a00','#c0800e'], ['#0a0a2a','#4040c0'],
  ];
  const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];
  return `linear-gradient(135deg,${a},${b})`;
}

/* ════════════════════
   INIT
════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadSavedCards();
});