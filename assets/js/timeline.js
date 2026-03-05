/* ══════════════════════════════════════════
   NUESTROS RECUERDOS — Timeline
   Agrupa recuerdos por mes/año del más
   reciente al más antiguo con filtros
   ══════════════════════════════════════════ */

const MESES_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const CAT_LABELS = {
  c1: '▶ Seguir Viendo',
  c2: '⭐ Momentos Destacados',
  c4: '✈ Viajes Juntos',
  c5: '🎂 Fechas Especiales',
  c6: '🏠 Momentos en Casa',
};

let _tlAllCards     = [];
let _tlActiveFilter = 'all'; // 'all' | 'YYYY-MM'

/* ─── Abrir Timeline ─── */
async function openTimeline() {
  const modal = document.getElementById('timeline-modal');
  if (!modal) return;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  const body = document.getElementById('tl-body');
  if (body) body.innerHTML = '<div class="tl-loading">Cargando recuerdos... ⏳</div>';

  // Cargar todos los recuerdos
  await loadTimelineCards();
  renderTimeline();
}

/* ─── Cerrar Timeline ─── */
function closeTimeline() {
  const modal = document.getElementById('timeline-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

/* ─── Cargar cards desde Cloudinary + localStorage ─── */
async function loadTimelineCards() {
  _tlAllCards = [];

  try {
    const bust = `?ts=${Date.now()}`;
    const [imgRes, vidRes] = await Promise.all([
      fetch(`https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/list/recuerdos.json${bust}`),
      fetch(`https://res.cloudinary.com/${CLOUDINARY_CLOUD}/video/list/recuerdos.json${bust}`),
    ]);

    const imgData = imgRes.ok ? await imgRes.json() : { resources: [] };
    const vidData = vidRes.ok ? await vidRes.json() : { resources: [] };

    const all = [
      ...(imgData.resources || []).map(r => ({ ...r, resourceType: 'image' })),
      ...(vidData.resources || []).map(r => ({ ...r, resourceType: 'video' })),
    ];

    all.forEach(r => {
      const ctx      = r.context?.custom || {};
      const tagCat   = (r.tags || []).find(t => t.startsWith('cat_'));
      const category = ctx.category || (tagCat ? tagCat.replace('cat_', '') : 'c1');
      const type     = ctx.type || r.resourceType || 'image';
      const fecha    = ctx.fecha ? decodeURIComponent(ctx.fecha) : '';

      _tlAllCards.push({
        title:    decodeURIComponent(ctx.title    || r.public_id.split('/').pop() || 'Recuerdo'),
        sub:      decodeURIComponent(ctx.sub      || ''),
        desc:     decodeURIComponent(ctx.desc     || ''),
        emoji:    decodeURIComponent(ctx.emoji    || '📸'),
        gradient: decodeURIComponent(ctx.gradient || 'linear-gradient(135deg,#4a0015,#c0396e)'),
        fecha,
        category,
        image: type === 'image' ? `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/${r.public_id}` : '',
        video: type === 'video' ? `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/video/upload/${r.public_id}` : '',
        _ts: parseFechaToTs(fecha),
      });
    });

  } catch(e) {
    console.warn('Timeline: error cargando Cloudinary:', e);
  }

  // Agregar también los de localStorage si no están ya
  try {
    const ls  = JSON.parse(localStorage.getItem('nuestrosRecuerdos_cards') || '{}');
    const existing = new Set(_tlAllCards.map(c => c.image || c.video));
    Object.entries(ls).forEach(([catId, cards]) => {
      cards.forEach(card => {
        const key = card.image || card.video || '';
        if (!existing.has(key)) {
          _tlAllCards.push({ ...card, category: catId, _ts: parseFechaToTs(card.fecha || '') });
        }
      });
    });
  } catch(e) {}

  // Ordenar del más reciente al más antiguo
  _tlAllCards.sort((a, b) => b._ts - a._ts);
}

/* ─── Convertir "21 Febrero 2026" a timestamp ─── */
function parseFechaToTs(fecha) {
  if (!fecha) return 0;
  const mesesMap = {
    'enero':0,'febrero':1,'marzo':2,'abril':3,'mayo':4,'junio':5,
    'julio':6,'agosto':7,'septiembre':8,'octubre':9,'noviembre':10,'diciembre':11
  };
  const parts = fecha.toLowerCase().split(' ');
  if (parts.length === 3) {
    const d = parseInt(parts[0]);
    const m = mesesMap[parts[1]];
    const y = parseInt(parts[2]);
    if (!isNaN(d) && m !== undefined && !isNaN(y)) {
      return new Date(y, m, d).getTime();
    }
  }
  return 0;
}

/* ─── Obtener clave mes/año de un card ─── */
function getMonthKey(card) {
  if (!card.fecha) return 'sin-fecha';
  const parts = card.fecha.toLowerCase().split(' ');
  if (parts.length === 3) {
    const mesesMap = {
      'enero':'01','febrero':'02','marzo':'03','abril':'04','mayo':'05','junio':'06',
      'julio':'07','agosto':'08','septiembre':'09','octubre':'10','noviembre':'11','diciembre':'12'
    };
    return `${parts[2]}-${mesesMap[parts[1]] || '00'}`;
  }
  return 'sin-fecha';
}

/* ─── Render principal ─── */
function renderTimeline() {
  buildFilters();

  const filtered = _tlActiveFilter === 'all'
    ? _tlAllCards
    : _tlAllCards.filter(c => getMonthKey(c) === _tlActiveFilter);

  const body = document.getElementById('tl-body');
  if (!body) return;

  if (filtered.length === 0) {
    body.innerHTML = `
      <div class="tl-empty">
        <div class="tl-empty-icon">📭</div>
        <div class="tl-empty-text">No hay recuerdos en este período</div>
      </div>`;
    return;
  }

  // Agrupar por mes/año
  const groups = {};
  filtered.forEach(card => {
    const key = getMonthKey(card);
    if (!groups[key]) groups[key] = [];
    groups[key].push(card);
  });

  // Ordenar grupos del más reciente
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'sin-fecha') return 1;
    if (b === 'sin-fecha') return -1;
    return b.localeCompare(a);
  });

  body.innerHTML = '';

  sortedKeys.forEach(key => {
    const cards = groups[key];
    const label = key === 'sin-fecha' ? 'Sin fecha' : formatMonthKey(key);

    const group = document.createElement('div');
    group.className = 'tl-month-group';

    group.innerHTML = `
      <div class="tl-month-header">
        <div class="tl-month-dot"></div>
        <h3 class="tl-month-title">${label}</h3>
        <span class="tl-month-count">${cards.length} recuerdo${cards.length !== 1 ? 's' : ''}</span>
        <div class="tl-month-line"></div>
      </div>
      <div class="tl-grid" id="tl-grid-${key.replace(/[^a-z0-9]/gi,'_')}"></div>
    `;

    body.appendChild(group);

    const grid = group.querySelector('.tl-grid');
    cards.forEach(card => grid.appendChild(buildTlCard(card)));
  });
}

/* ─── Construir tarjeta ─── */
function buildTlCard(card) {
  const el = document.createElement('div');
  el.className = 'tl-card';

  let thumbHTML = '';
  if (card.image) {
    thumbHTML = `<img class="tl-card-thumb" src="${card.image}" alt="${card.title}"
      onerror="this.parentElement.innerHTML='<div class=\\'tl-card-thumb-placeholder\\'  style=\\'background:${card.gradient}\\'>${card.emoji}</div>'"/>`;
  } else if (card.video) {
    const afterUpload = card.video.split('/upload/')[1] || '';
    const pubId = afterUpload.replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '');
    const thumb = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/video/upload/w_300,h_200,c_fill,so_2/${pubId}.jpg`;
    thumbHTML = `
      <div style="position:relative;">
        <img class="tl-card-thumb" src="${thumb}" alt="${card.title}"
          onerror="this.parentElement.style.background='${card.gradient}';this.style.display='none'"/>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.85);
            display:flex;align-items:center;justify-content:center;font-size:0.75rem;">▶</div>
        </div>
      </div>`;
  } else {
    thumbHTML = `<div class="tl-card-thumb-placeholder" style="background:${card.gradient}">${card.emoji}</div>`;
  }

  const catLabel = CAT_LABELS[card.category] || '';

  el.innerHTML = `
    ${thumbHTML}
    <div class="tl-card-info">
      <div class="tl-card-title">${card.title}</div>
      ${card.fecha ? `<div class="tl-card-fecha">📅 ${card.fecha}</div>` : ''}
      ${catLabel ? `<div class="tl-card-cat">${catLabel}</div>` : ''}
    </div>
  `;

  el.onclick = () => {
    closeTimeline();
    setTimeout(() => openModal(card), 200);
  };

  return el;
}

/* ─── Construir filtros ─── */
function buildFilters() {
  const container = document.getElementById('tl-filter-scroll');
  if (!container) return;

  // Obtener todos los meses únicos
  const monthKeys = [...new Set(_tlAllCards.map(c => getMonthKey(c)))]
    .filter(k => k !== 'sin-fecha')
    .sort((a, b) => b.localeCompare(a));

  container.innerHTML = '';

  // Botón "Todos"
  const allBtn = document.createElement('button');
  allBtn.className = `tl-filter-btn ${_tlActiveFilter === 'all' ? 'active' : ''}`;
  allBtn.textContent = `Todos (${_tlAllCards.length})`;
  allBtn.onclick = () => { _tlActiveFilter = 'all'; renderTimeline(); };
  container.appendChild(allBtn);

  // Un botón por mes
  monthKeys.forEach(key => {
    const count = _tlAllCards.filter(c => getMonthKey(c) === key).length;
    const btn   = document.createElement('button');
    btn.className   = `tl-filter-btn ${_tlActiveFilter === key ? 'active' : ''}`;
    btn.textContent = `${formatMonthKey(key)} (${count})`;
    btn.onclick     = () => { _tlActiveFilter = key; renderTimeline(); };
    container.appendChild(btn);
  });

  // Botón "Sin fecha" si hay
  const sinFecha = _tlAllCards.filter(c => getMonthKey(c) === 'sin-fecha');
  if (sinFecha.length > 0) {
    const btn   = document.createElement('button');
    btn.className   = `tl-filter-btn ${_tlActiveFilter === 'sin-fecha' ? 'active' : ''}`;
    btn.textContent = `Sin fecha (${sinFecha.length})`;
    btn.onclick     = () => { _tlActiveFilter = 'sin-fecha'; renderTimeline(); };
    container.appendChild(btn);
  }
}

/* ─── Formato "2026-02" → "Febrero 2026" ─── */
function formatMonthKey(key) {
  const [y, m] = key.split('-');
  return `${MESES_ES[parseInt(m) - 1] || '?'} ${y}`;
}
