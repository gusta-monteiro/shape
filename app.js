/* Shape — app pessoal de treino e dieta. Sem dependências. */
'use strict';

/* ---------------- datas ---------------- */
const SEQ = ['A', 'B', 'C', 'D'];
const WD_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function dayKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addDays(d, n) { const c = new Date(d); c.setDate(c.getDate() + n); return c; }
function sameDay(a, b) { return dayKey(a) === dayKey(b); }
function today() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function mondayOf(d) { return addDays(d, -((d.getDay() + 6) % 7)); }
function fmtLong(d) { return `${WD_SHORT[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`; }
function fmtShort(d) { return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; }

const ANCHOR = parseISO(DATA.config.anchorDate);
const ANCHOR_REST = parseISO(DATA.config.anchorRestDate);
const TRAIN_WD = new Set(DATA.config.trainingWeekdays);

function isTrainingDay(d) { return TRAIN_WD.has(d.getDay()); }

/* Letra do treino: avança na sequência a cada dia de treino a partir da âncora. */
function workoutLetter(date) {
  if (!isTrainingDay(date)) return null;
  let count = 0;
  if (date >= ANCHOR) {
    for (let d = addDays(ANCHOR, 1); d <= date; d = addDays(d, 1)) if (isTrainingDay(d)) count++;
    return SEQ[(DATA.config.anchorWorkoutIndex + count) % 4];
  }
  for (let d = date; d < ANCHOR; d = addDays(d, 1)) if (isTrainingDay(d)) count++;
  return SEQ[((DATA.config.anchorWorkoutIndex - count) % 4 + 4) % 4];
}

/* Protocolo do descanso ativo: alterna A/B a cada descanso a partir de 13/08 (=A). */
function restProtocol(date) {
  if (isTrainingDay(date)) return null;
  let count = 0;
  if (date >= ANCHOR_REST) {
    for (let d = ANCHOR_REST; d < date; d = addDays(d, 1)) if (!isTrainingDay(d)) count++;
  } else {
    for (let d = date; d < ANCHOR_REST; d = addDays(d, 1)) if (!isTrainingDay(d)) count++;
  }
  return count % 2 === 0 ? 'A' : 'B';
}

/* Panturrilha (fonte: PDF) é 3–4x/semana, pós-treino OU descanso, alternando protocolos —
   por isso roda numa contagem própria que avança todo dia (não só nos de descanso). */
function calfProtocol(date) {
  const diffDays = Math.round((date - ANCHOR_REST) / 86400000);
  return ((diffDays % 2) + 2) % 2 === 0 ? 'A' : 'B';
}

function phaseFor(date) {
  const k = dayKey(date);
  for (const p of DATA.phases) if (k >= p.start && k <= p.end) return p;
  return k < DATA.phases[0].start ? DATA.phases[0] : DATA.phases[DATA.phases.length - 1];
}

function dietFor(date) {
  const phase = phaseFor(date);
  if (phase.diet === 'cutting') {
    const plan = isTrainingDay(date) ? DATA.diets.cutting.treino : DATA.diets.cutting.descanso;
    return { phase, plan, guidance: DATA.diets.cutting.guidance, dietLabel: `Cutting · ${plan.label}` };
  }
  return { phase, plan: DATA.diets.estabilizacao.all, guidance: DATA.diets.estabilizacao.guidance, dietLabel: 'Estabilização' };
}

/* ---------------- estado (localStorage) ---------------- */
const store = {
  get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};
const dayState = (key) => store.get('shape:day:' + key, { meals: [false, false, false, false, false], workout: false, extras: false, calf: false, exDone: [] });
const saveDayState = (key, s) => store.set('shape:day:' + key, s);
const cardioKey = (d) => 'shape:cardio:' + dayKey(mondayOf(d));
const getWeights = () => store.get('shape:weights', []);
const setWeights = (w) => store.set('shape:weights', w.sort((a, b) => a.d < b.d ? -1 : 1));

/* ---------------- fotos (IndexedDB) ---------------- */
let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('shape-db', 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('photos')) {
          const s = d.createObjectStore('photos', { keyPath: 'id' });
          s.createIndex('date', 'date');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}
async function putPhoto(rec) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction('photos', 'readwrite');
    tx.objectStore('photos').put(rec);
    // QuotaExceededError (storage cheio) normalmente só dispara 'abort' na transação, não
    // 'error' — sem esse handler a Promise nunca resolve nem rejeita.
    tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('transação abortada'));
  });
}
async function allPhotos() {
  const d = await db();
  return new Promise((res, rej) => {
    const req = d.transaction('photos').objectStore('photos').getAll();
    req.onsuccess = () => res(req.result || []); req.onerror = () => rej(req.error);
  });
}
async function deletePhoto(id) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction('photos', 'readwrite');
    tx.objectStore('photos').delete(id);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('transação abortada'));
  });
}
function compressImage(file, maxDim = 1280) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? resolve(b) : reject(new Error('toBlob falhou')), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem inválida')); };
    img.src = url;
  });
}

/* ---------------- helpers de UI ---------------- */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="M5 13l4 4 10-11"/></svg>';

let toastTimer = null;
function toast(msg) {
  let el = $('.toast');
  if (!el) { el = h('<div class="toast"></div>'); document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------------- HOJE (renderiza qualquer dia) ---------------- */
function renderDayPlan(container, date) {
  container.innerHTML = '';
  const key = dayKey(date);
  const state = dayState(key);
  const info = dietFor(date);
  const isToday = sameDay(date, today());
  const letter = workoutLetter(date);
  const rerender = () => renderDayPlan(container, date);

  // hero: treino (com checklist de exercícios) ou descanso
  if (letter) {
    const w = DATA.workouts[letter];
    const exCount = w.exercises.length;
    if (!Array.isArray(state.exDone) || state.exDone.length !== exCount) {
      state.exDone = new Array(exCount).fill(false);
    }
    const doneCount = state.exDone.filter(Boolean).length;

    const card = h(`<div class="card">
      <div class="hero">
        <div class="hero-letter ${w.group}">${letter}</div>
        <div class="hero-info">
          <div class="t">Treino ${letter} — ${esc(w.name)}</div>
          <div class="s">${doneCount}/${exCount} exercícios · descanso ${w.rest} · 20h</div>
        </div>
        <button class="bigcheck hero-check ${state.workout ? 'on' : ''}" aria-label="Marcar treino inteiro como feito">${CHECK_SVG}</button>
      </div>
      <div class="ex-checklist"></div>
    </div>`);
    $('.hero-check', card).addEventListener('click', () => {
      const allDone = state.exDone.every(Boolean);
      state.exDone = new Array(exCount).fill(!allDone);
      state.workout = !allDone;
      saveDayState(key, state);
      if (state.workout) toast('Treino concluído 💪');
      rerender();
    });

    const listEl = $('.ex-checklist', card);
    w.exercises.forEach((ex, i) => {
      const row = h(`<div class="exercise ex-track ${state.exDone[i] ? 'done' : ''}">
        <button class="bigcheck small ${state.exDone[i] ? 'on' : ''}" aria-label="Marcar ${esc(ex.name)}">${CHECK_SVG}</button>
        <div class="ex-track-body">${exerciseInner(ex)}</div>
      </div>`);
      $('.bigcheck', row).addEventListener('click', () => {
        state.exDone[i] = !state.exDone[i];
        state.workout = state.exDone.every(Boolean);
        saveDayState(key, state);
        rerender();
      });
      listEl.appendChild(row);
    });
    container.appendChild(card);
  } else {
    const proto = restProtocol(date);
    const cproto = calfProtocol(date);
    const card = h(`<div class="card">
      <div class="hero">
        <div class="hero-letter rest">🧘</div>
        <div class="hero-info">
          <div class="t">Descanso Ativo</div>
          <div class="s">Abs ${proto} · Panturrilha ${cproto} · Antebraço</div>
        </div>
        <button class="bigcheck hero-check ${state.extras ? 'on' : ''}" aria-label="Marcar como feito">${CHECK_SVG}</button>
      </div>
    </div>`);
    $('.hero-check', card).addEventListener('click', (e) => {
      state.extras = !state.extras; saveDayState(key, state);
      e.currentTarget.classList.toggle('on', state.extras);
      if (state.extras) toast('Descanso ativo concluído ✔');
    });
    card.addEventListener('click', (e) => {
      if (e.target.closest('.bigcheck')) return;
      showWorkoutInTab('rest');
    });
    container.appendChild(card);
    const isFirstCheckin = key === DATA.config.firstCheckinDate;
    if (date.getDay() === DATA.config.checkinWeekday || isFirstCheckin) {
      container.appendChild(h(`<div class="card" style="border-color: rgba(252,211,77,0.35)">
        <div class="hero">
          <div class="hero-letter" style="background: var(--amber-dim); color: var(--amber); font-size:22px">⚖️</div>
          <div class="hero-info">
            <div class="t">${isFirstCheckin ? 'Primeiro Check-in' : 'Dia de Check-in'}</div>
            <div class="s">Peso em jejum + fotos frente/lado/costas</div>
          </div>
        </div>
      </div>`));
    }
  }

  // cardio da semana (só no dia atual, para não confundir)
  if (isToday) {
    const ck = cardioKey(date);
    const cardioRaw = store.get(ck, { bike: 0, escada: 0 });
    const cardio = { bike: Number(cardioRaw.bike) || 0, escada: Number(cardioRaw.escada) || 0 };
    const targets = parseCardioTargets(info.guidance.cardio);
    const card = h(`<div class="card">
      <h2>Cardio da semana</h2>
      <div class="cardio-row">
        ${['bike', 'escada'].map(k => `
        <div class="cardio-item" data-k="${k}">
          <span class="lbl">${k === 'bike' ? 'Bike/Esteira' : 'Escada'}</span>
          <div class="bar"><i style="width:${Math.min(100, cardio[k] / targets[k] * 100)}%"></i></div>
          <span class="val">${cardio[k]} / ${targets[k]} min</span>
        </div>`).join('')}
      </div>
      <div class="cardio-btns">
        <button class="mini-btn accent" data-add="bike">+10 Bike</button>
        <button class="mini-btn accent" data-add="escada">+10 Escada</button>
        <button class="mini-btn" data-undo>−10</button>
      </div>
    </div>`);
    let last = null;
    card.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      const undo = e.target.closest('[data-undo]');
      if (!add && !undo) return;
      const cur = store.get(ck, { bike: 0, escada: 0 });
      if (add) { cur[add.dataset.add] += 10; last = add.dataset.add; }
      else if (undo && last) cur[last] = Math.max(0, cur[last] - 10);
      else if (undo) cur.bike = Math.max(0, cur.bike - 10);
      store.set(ck, cur);
      ['bike', 'escada'].forEach(k => {
        const item = $(`.cardio-item[data-k="${k}"]`, card);
        $('.bar i', item).style.width = Math.min(100, cur[k] / targets[k] * 100) + '%';
        $('.val', item).textContent = `${cur[k]} / ${targets[k]} min`;
      });
    });
    container.appendChild(card);
  }

  // refeições
  container.appendChild(h(`<p class="section-label">Refeições · ${esc(info.dietLabel)}</p>`));
  const mealsCard = h('<div class="card"></div>');
  info.plan.meals.forEach((meal, i) => {
    const row = h(`<div class="meal ${state.meals[i] ? 'done' : ''}">
      <button class="bigcheck ${state.meals[i] ? 'on' : ''}" aria-label="Marcar ${esc(meal.name)}">${CHECK_SVG}</button>
      <div class="meal-body">
        <div class="meal-name">${esc(meal.name)}</div>
        <div class="meal-items">${meal.items.map(esc).join(' · ')}</div>
      </div>
    </div>`);
    $('.bigcheck', row).addEventListener('click', () => {
      state.meals[i] = !state.meals[i]; saveDayState(key, state);
      row.classList.toggle('done', state.meals[i]);
      $('.bigcheck', row).classList.toggle('on', state.meals[i]);
    });
    mealsCard.appendChild(row);
  });
  container.appendChild(mealsCard);

  // orientações rápidas
  const g = info.guidance;
  container.appendChild(h(`<div class="card">
    <h2>Diário</h2>
    <div class="guide-grid">
      <div class="guide-item"><span class="ico">💧</span><span>${esc(g.water)} · ${esc(g.salt)}</span></div>
      <div class="guide-item"><span class="ico">💊</span><span>${g.supplements.map(esc).join(' · ')}</span></div>
      ${g.freeMeal ? `<div class="guide-item"><span class="ico">🍕</span><span>${esc(g.freeMeal)}</span></div>` : ''}
    </div>
  </div>`));

  // panturrilha pós-treino: opcional, 3-4x/semana no total somando com os dias de descanso
  if (letter) {
    const cproto = calfProtocol(date);
    const calfCard = h(`<div class="card">
      <div class="hero">
        <div class="hero-letter rest" style="font-size:20px">🦵</div>
        <div class="hero-info">
          <div class="t">Panturrilha pós-treino</div>
          <div class="s">Opcional · protocolo ${cproto} · alterne com os dias de descanso (3–4x/semana no total)</div>
        </div>
        <button class="bigcheck hero-check ${state.calf ? 'on' : ''}" aria-label="Marcar panturrilha como feita">${CHECK_SVG}</button>
      </div>
    </div>`);
    $('.hero-check', calfCard).addEventListener('click', (e) => {
      state.calf = !state.calf; saveDayState(key, state);
      e.currentTarget.classList.toggle('on', state.calf);
      if (state.calf) toast('Panturrilha concluída ✔');
    });
    calfCard.addEventListener('click', (e) => {
      if (e.target.closest('.bigcheck')) return;
      showWorkoutInTab('calf-' + cproto);
    });
    container.appendChild(calfCard);
  }
}

function parseCardioTargets(list) {
  // "120 min/semana Bicicleta ou Esteira" → 120 / "60 min/semana Escada" → 60
  const t = { bike: 120, escada: 120 };
  for (const item of list) {
    const min = parseInt(item, 10);
    if (/escada/i.test(item)) t.escada = min; else t.bike = min;
  }
  return t;
}

/* ---------------- SEMANA ---------------- */
let weekOffset = 0;
let weekSelected = null;

function renderSemana() {
  const view = $('#view-semana');
  view.innerHTML = '';
  const monday = addDays(mondayOf(today()), weekOffset * 7);
  const sel = weekSelected && mondayOf(weekSelected).getTime() === monday.getTime() ? weekSelected : (weekOffset === 0 ? today() : monday);
  weekSelected = sel;

  const nav = h(`<div class="week-nav">
    <button class="mini-btn" data-nav="-1">‹</button>
    <span class="title">${fmtShort(monday)} – ${fmtShort(addDays(monday, 6))}${weekOffset === 0 ? ' · esta semana' : ''}</span>
    <button class="mini-btn" data-nav="1">›</button>
  </div>`);
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('[data-nav]');
    if (!b) return;
    weekOffset += Number(b.dataset.nav);
    weekSelected = null;
    renderSemana();
  });
  view.appendChild(nav);

  const strip = h('<div class="week-strip"></div>');
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    const letter = workoutLetter(d);
    const cell = h(`<div class="day-cell ${sameDay(d, sel) ? 'selected' : ''} ${sameDay(d, today()) ? 'today' : ''}">
      <div class="dw">${WD_SHORT[d.getDay()]}</div>
      <div class="dn">${d.getDate()}</div>
      <div class="dl ${letter ? DATA.workouts[letter].group : 'rest'}">${letter || 'DESC'}</div>
    </div>`);
    cell.addEventListener('click', () => { weekSelected = d; renderSemana(); });
    strip.appendChild(cell);
  }
  view.appendChild(strip);

  const phase = phaseFor(sel);
  view.appendChild(h(`<p class="section-label">${esc(fmtLong(sel))} · ${esc(phase.label)}</p>`));
  const planBox = h('<div style="display:flex;flex-direction:column;gap:12px"></div>');
  view.appendChild(planBox);
  renderDayPlan(planBox, sel);
}

/* ---------------- TREINO ---------------- */
function exerciseInner(ex) {
  return `<div class="ex-name">${esc(ex.name)}${ex.pair ? '<span class="pair-tag">BI-SET</span>' : ''}</div>
    <div class="ex-sets">${(Array.isArray(ex.sets) ? ex.sets : [])
      .map(s => Array.isArray(s)
        ? `<div class="ex-set"><span class="st">${esc(s[0])}</span><span>${esc(s[1])}</span></div>`
        : '').join('')}
      ${typeof ex.sets === 'string' ? `<div class="ex-set"><span>${esc(ex.sets)}</span></div>` : ''}
    </div>
    ${ex.note ? `<div class="ex-note">${esc(ex.note)}</div>` : ''}
    ${ex.link ? `<a class="ex-link" href="${esc(ex.link)}" target="_blank" rel="noopener">▶ ver execução</a>` : ''}
    ${ex.link2 ? `<a class="ex-link" href="${esc(ex.link2)}" target="_blank" rel="noopener" style="margin-left:10px">▶ vídeo 2</a>` : ''}`;
}
function exerciseHTML(ex) {
  return `<div class="exercise">${exerciseInner(ex)}</div>`;
}

function renderTreino() {
  const view = $('#view-treino');
  view.innerHTML = '';
  const letter = workoutLetter(today());
  const restToday = !letter;

  view.appendChild(h(`<p class="section-label">${restToday ? 'Hoje é descanso ativo' : 'Treino de hoje: ' + letter}</p>`));

  for (const L of SEQ) {
    const w = DATA.workouts[L];
    const det = h(`<details class="acc" ${L === letter ? 'open' : ''}>
      <summary>
        <span class="acc-letter ${w.group}">${L}</span>
        <span>${esc(w.name)} <div class="acc-sub">${w.exercises.length} exercícios · descanso ${w.rest}</div></span>
        <span class="chev">›</span>
      </summary>
      <div class="acc-body">${w.exercises.map(exerciseHTML).join('')}</div>
    </details>`);
    view.appendChild(det);
  }

  const proto = restToday ? restProtocol(today()) : null;
  const cproto = calfProtocol(today());
  const rd = DATA.restDay;

  view.appendChild(h('<p class="section-label">Abdômen — descanso ativo (qui/dom, 2x/semana)</p>'));
  for (const P of ['A', 'B']) {
    view.appendChild(h(`<details class="acc" ${restToday && proto === P ? 'open' : ''}>
      <summary>
        <span class="acc-letter rest">${P}</span>
        <span>Abdômen — Protocolo ${P} <div class="acc-sub">descanso ${rd.rest}</div></span>
        <span class="chev">›</span>
      </summary>
      <div class="acc-body">${rd.abs[P].map(exerciseHTML).join('')}</div>
    </details>`));
  }

  view.appendChild(h('<p class="section-label">Panturrilha — pós-treino ou descanso (3–4x/semana)</p>'));
  for (const P of ['A', 'B']) {
    view.appendChild(h(`<details class="acc" id="calf-${P}" ${cproto === P ? 'open' : ''}>
      <summary>
        <span class="acc-letter rest">${P}</span>
        <span>Panturrilha — Protocolo ${P} <div class="acc-sub">descanso ${rd.rest} · alterne entre os protocolos</div></span>
        <span class="chev">›</span>
      </summary>
      <div class="acc-body">${rd.calves[P].map(exerciseHTML).join('')}</div>
    </details>`));
  }

  view.appendChild(h(`<details class="acc" ${restToday ? 'open' : ''}>
    <summary>
      <span class="acc-letter rest">✚</span>
      <span>Antebraço <div class="acc-sub">todo descanso ativo</div></span>
      <span class="chev">›</span>
    </summary>
    <div class="acc-body">${rd.forearm.map(exerciseHTML).join('')}</div>
  </details>`));

  view.appendChild(h('<p class="section-label">Como executar as séries</p>'));
  view.appendChild(h(`<div class="card"><div class="note-list">
    ${DATA.setNotes.map(([t, d]) => `<div class="n"><b>${esc(t)}:</b> ${esc(d)}</div>`).join('')}
  </div></div>`));

  view.appendChild(h('<p class="section-label">Mobilidade</p>'));
  view.appendChild(h(`<div class="card"><div class="note-list">
    <div class="n"><b>Inferiores:</b> ${DATA.mobility.inferiores.map((u, i) => `<a class="ex-link" href="${esc(u)}" target="_blank" rel="noopener">vídeo ${i + 1}</a>`).join(' · ')}</div>
    <div class="n"><b>Superiores:</b> ${DATA.mobility.superiores.map((u, i) => `<a class="ex-link" href="${esc(u)}" target="_blank" rel="noopener">vídeo ${i + 1}</a>`).join(' · ')}</div>
  </div></div>`));
}

function showWorkoutInTab(letterOrRest) {
  switchView('treino');
  requestAnimationFrame(() => {
    const view = $('#view-treino');
    $$('details.acc', view).forEach(d => { d.open = false; });
    if (letterOrRest === 'rest') {
      const proto = restProtocol(today()) || 'A';
      const cproto = calfProtocol(today());
      $$('details.acc', view).forEach(d => {
        const s = $('summary', d).textContent;
        if (s.includes(`Abdômen — Protocolo ${proto}`) || d.id === `calf-${cproto}` || s.includes('Antebraço')) d.open = true;
      });
    } else if (letterOrRest.startsWith('calf-')) {
      const target = $('#' + letterOrRest, view);
      if (target) { target.open = true; target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    } else {
      const target = $$('details.acc', view).find(d => $('.acc-letter', d).textContent.trim() === letterOrRest);
      if (target) { target.open = true; target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
  });
}

/* ---------------- DIETA ---------------- */
let dietTab = null;

function renderDieta() {
  const view = $('#view-dieta');
  view.innerHTML = '';
  const todayInfo = dietFor(today());
  if (!dietTab) {
    dietTab = todayInfo.phase.diet === 'cutting' ? (isTrainingDay(today()) ? 'ct' : 'cd') : 'es';
  }

  const seg = h(`<div class="seg">
    <button data-t="ct" class="${dietTab === 'ct' ? 'active' : ''}">Cutting Treino</button>
    <button data-t="cd" class="${dietTab === 'cd' ? 'active' : ''}">Cutting Desc.</button>
    <button data-t="es" class="${dietTab === 'es' ? 'active' : ''}">Estabilização</button>
  </div>`);
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    dietTab = b.dataset.t;
    renderDieta();
  });
  view.appendChild(seg);

  const map = {
    ct: { plan: DATA.diets.cutting.treino, guidance: DATA.diets.cutting.guidance, label: 'Cutting · Dia de Treino' },
    cd: { plan: DATA.diets.cutting.descanso, guidance: DATA.diets.cutting.guidance, label: 'Cutting · Dia de Descanso' },
    es: { plan: DATA.diets.estabilizacao.all, guidance: DATA.diets.estabilizacao.guidance, label: 'Estabilização' },
  };
  const cur = map[dietTab];
  const isTodayPlan = cur.label.startsWith(todayInfo.dietLabel) || todayInfo.dietLabel === cur.label;
  view.appendChild(h(`<p class="section-label">${esc(cur.label)}${isTodayPlan ? ' · vale hoje ✓' : ''}</p>`));

  const mealsCard = h('<div class="card"></div>');
  cur.plan.meals.forEach(meal => {
    mealsCard.appendChild(h(`<div class="meal">
      <div class="meal-body">
        <div class="meal-name">${esc(meal.name)}</div>
        <div class="meal-items">${meal.items.map(esc).join(' · ')}</div>
      </div>
    </div>`));
  });
  view.appendChild(mealsCard);

  const g = cur.guidance;
  view.appendChild(h(`<div class="card">
    <h2>Orientações</h2>
    <div class="guide-grid">
      <div class="guide-item"><span class="ico">🚴</span><span>${g.cardio.map(esc).join(' · ')}</span></div>
      <div class="guide-item"><span class="ico">💧</span><span>${esc(g.water)} · ${esc(g.salt)}</span></div>
      <div class="guide-item"><span class="ico">💊</span><span>${g.supplements.map(esc).join(' · ')}</span></div>
      ${g.freeMeal ? `<div class="guide-item"><span class="ico">🍕</span><span>${esc(g.freeMeal)}</span></div>` : ''}
    </div>
  </div>`));

  view.appendChild(h('<p class="section-label">Periodização até 31/dez</p>'));
  const tl = h('<div class="card"><div class="timeline"></div></div>');
  const tk = dayKey(today());
  DATA.phases.forEach(p => {
    const current = tk >= p.start && tk <= p.end;
    const end = p.end > '2026-12-31' ? '2026-12-31' : p.end;
    $('.timeline', tl).appendChild(h(`<div class="tl-item ${current ? 'current' : ''}">
      <div class="tl-dot"></div>
      <div>
        <div class="tl-t">${esc(p.label)}</div>
        <div class="tl-d">${fmtShort(parseISO(p.start))} → ${fmtShort(parseISO(end))}</div>
      </div>
    </div>`));
  });
  view.appendChild(tl);
}

/* ---------------- CHECK-IN ---------------- */
const POSES = ['frente', 'lado', 'costas'];

// URLs de blob criadas para as fotos do check-in — revogadas a cada re-render para não
// vazar memória (renderCheckin roda de novo a cada foto salva/excluída, peso salvo, etc).
let checkinObjectURLs = [];
function trackObjectURL(blob) {
  const url = URL.createObjectURL(blob);
  checkinObjectURLs.push(url);
  return url;
}

function renderCheckin() {
  const view = $('#view-checkin');
  view.innerHTML = '';
  checkinObjectURLs.forEach(u => URL.revokeObjectURL(u));
  checkinObjectURLs = [];
  const weights = getWeights();
  const goal = DATA.config.goal;
  const last = weights[weights.length - 1];
  const current = last ? (Number(last.kg) || goal.startKg) : goal.startKg;
  const lost = goal.startKg - current;
  const toGo = current - goal.targetKg;

  // ritmo: média das últimas 4 semanas
  let pace = '—';
  if (weights.length >= 2) {
    const cutoff = dayKey(addDays(today(), -28));
    const recent = weights.filter(w => w.d >= cutoff);
    if (recent.length >= 2) {
      const first = recent[0], lastR = recent[recent.length - 1];
      const days = (parseISO(lastR.d) - parseISO(first.d)) / 86400000;
      if (days > 0) pace = ((first.kg - lastR.kg) / days * 7).toFixed(1).replace('.', ',') + ' kg/sem';
    }
  }

  view.appendChild(h(`<div class="stat-row">
    <div class="stat"><div class="v">${String(current).replace('.', ',')}</div><div class="l">atual</div></div>
    <div class="stat"><div class="v" style="color:var(--lime)">${lost > 0 ? '−' : ''}${String(Math.abs(lost).toFixed(1)).replace('.', ',')}</div><div class="l">perdido</div></div>
    <div class="stat"><div class="v">${String(Math.max(0, toGo).toFixed(1)).replace('.', ',')}</div><div class="l">faltam</div></div>
    <div class="stat"><div class="v">${pace}</div><div class="l">ritmo</div></div>
  </div>`));

  // registrar peso
  const form = h(`<div class="card">
    <h2>Registrar peso <span class="sub">· em jejum, domingo de manhã</span></h2>
    <div class="weight-form">
      <input type="number" inputmode="decimal" step="0.1" min="40" max="200" placeholder="kg de hoje" aria-label="Peso em kg">
      <button class="btn">Salvar</button>
    </div>
  </div>`);
  $('.btn', form).addEventListener('click', () => {
    const input = $('input', form);
    const kg = parseFloat(String(input.value).replace(',', '.'));
    if (!kg || kg < 40 || kg > 200) { toast('Peso inválido'); return; }
    const w = getWeights().filter(x => x.d !== dayKey(today()));
    w.push({ d: dayKey(today()), kg: Math.round(kg * 10) / 10 });
    setWeights(w);
    input.value = '';
    toast('Peso registrado ✔');
    renderCheckin();
  });
  view.appendChild(form);

  // gráfico
  const chartCard = h('<div class="card chart-wrap"><h2>Evolução <span class="sub">· meta 80kg em 31/dez</span></h2></div>');
  chartCard.appendChild(buildChart(weights));
  chartCard.appendChild(h('<div class="chart-info"></div>'));
  view.appendChild(chartCard);

  // histórico
  if (weights.length) {
    const histCard = h('<div class="card"><h2>Histórico</h2><div class="w-history"></div></div>');
    const list = $('.w-history', histCard);
    [...weights].reverse().forEach((w, ri) => {
      const idx = weights.length - 1 - ri;
      const prev = weights[idx - 1];
      const diff = prev ? w.kg - prev.kg : 0;
      const row = h(`<div class="w-row">
        <span class="d">${fmtShort(parseISO(w.d))}</span>
        <span class="kg">${esc(String(Number(w.kg) || 0).replace('.', ','))} kg</span>
        <span class="diff ${diff < 0 ? 'down' : diff > 0 ? 'up' : ''}">${prev ? (diff > 0 ? '+' : '') + String(diff.toFixed(1)).replace('.', ',') : ''}</span>
        <button class="del" aria-label="Excluir">✕</button>
      </div>`);
      $('.del', row).addEventListener('click', () => {
        if (!confirm(`Excluir registro de ${fmtShort(parseISO(w.d))}?`)) return;
        setWeights(getWeights().filter(x => x.d !== w.d));
        renderCheckin();
      });
      list.appendChild(row);
    });
    view.appendChild(histCard);
  }

  // fotos da semana
  const photosCard = h(`<div class="card">
    <h2>Fotos desta semana <span class="sub">· domingo em jejum</span></h2>
    <div class="photo-slots">
      ${POSES.map(p => `<label class="photo-slot" data-pose="${p}">
        <span>+ ${p}</span>
        <span class="pose-tag" hidden>${p}</span>
        <input type="file" accept="image/*">
      </label>`).join('')}
    </div>
  </div>`);
  view.appendChild(photosCard);

  // galeria + comparação
  const galleryCard = h('<div class="card"><h2>Acompanhamento</h2><div class="gallery"></div></div>');
  view.appendChild(galleryCard);

  loadPhotosUI(photosCard, galleryCard);

  // backup
  const backup = h(`<div class="card">
    <h2>Backup <span class="sub">· dados ficam só neste aparelho</span></h2>
    <div class="backup-row">
      <button class="btn ghost small" data-exp>Exportar</button>
      <button class="btn ghost small" data-imp>Importar</button>
    </div>
    <input type="file" accept="application/json" hidden>
  </div>`);
  $('[data-exp]', backup).addEventListener('click', exportBackup);
  $('[data-imp]', backup).addEventListener('click', () => $('input', backup).click());
  $('input', backup).addEventListener('change', (e) => importBackup(e.target.files[0]));
  view.appendChild(backup);
}

async function loadPhotosUI(photosCard, galleryCard) {
  let photos = [];
  try { photos = await allPhotos(); } catch { /* indexeddb indisponível */ }
  const weekKey = dayKey(mondayOf(today()));

  // slots da semana atual
  for (const slot of $$('.photo-slot', photosCard)) {
    const pose = slot.dataset.pose;
    const mine = photos.filter(p => p.week === weekKey && p.pose === pose);
    if (mine.length) {
      const url = trackObjectURL(mine[0].blob);
      slot.insertBefore(h(`<img src="${url}" alt="${pose}">`), slot.firstChild);
      $('.pose-tag', slot).hidden = false;
    }
    $('input', slot).addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const blob = await compressImage(file);
        await putPhoto({ id: `${weekKey}:${pose}`, week: weekKey, date: dayKey(today()), pose, blob });
        toast('Foto salva ✔');
        renderCheckin();
      } catch (err) { toast('Erro ao salvar foto'); }
    });
  }

  // galeria por semana
  const gallery = $('.gallery', galleryCard);
  const byWeek = {};
  photos.forEach(p => { (byWeek[p.week] = byWeek[p.week] || []).push(p); });
  const weeks = Object.keys(byWeek).sort().reverse();
  if (!weeks.length) {
    gallery.appendChild(h('<p class="empty">Sem fotos ainda. Primeira sessão: domingo de manhã.</p>'));
    return;
  }

  // comparação primeira vs última semana
  if (weeks.length >= 2) {
    const first = byWeek[weeks[weeks.length - 1]];
    const lastW = byWeek[weeks[0]];
    const cmp = h(`<div class="compare-grid" style="margin-bottom:12px">
      <div class="col"><h3>Início · ${fmtShort(parseISO(weeks[weeks.length - 1]))}</h3><div class="gallery-imgs"></div></div>
      <div class="col"><h3>Agora · ${fmtShort(parseISO(weeks[0]))}</h3><div class="gallery-imgs"></div></div>
    </div>`);
    const cols = $$('.gallery-imgs', cmp);
    [first, lastW].forEach((set, ci) => {
      POSES.forEach(pose => {
        const p = set.find(x => x.pose === pose);
        if (p) cols[ci].appendChild(h(`<div class="ph"><img src="${trackObjectURL(p.blob)}" alt="${esc(pose)}"></div>`));
      });
    });
    gallery.appendChild(cmp);
  }

  weeks.forEach(week => {
    const group = h(`<div class="gallery-group">
      <div class="gallery-date">Semana de ${fmtShort(parseISO(week))}</div>
      <div class="gallery-imgs"></div>
    </div>`);
    byWeek[week].sort((a, b) => POSES.indexOf(a.pose) - POSES.indexOf(b.pose)).forEach(p => {
      const ph = h(`<div class="ph"><img src="${trackObjectURL(p.blob)}" alt="${esc(p.pose)}"></div>`);
      let pressTimer = null;
      ph.addEventListener('touchstart', () => {
        pressTimer = setTimeout(async () => {
          if (confirm(`Excluir foto (${p.pose}, semana ${fmtShort(parseISO(week))})?`)) {
            await deletePhoto(p.id); renderCheckin();
          }
        }, 650);
      }, { passive: true });
      ph.addEventListener('touchend', () => clearTimeout(pressTimer));
      ph.addEventListener('touchmove', () => clearTimeout(pressTimer));
      ph.addEventListener('touchcancel', () => clearTimeout(pressTimer));
      ph.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        if (confirm(`Excluir foto (${p.pose})?`)) { await deletePhoto(p.id); renderCheckin(); }
      });
      $('.gallery-imgs', group).appendChild(ph);
    });
    gallery.appendChild(group);
  });
}

/* ---------------- gráfico SVG ---------------- */
function buildChart(weights) {
  const goal = DATA.config.goal;
  const W = 520, H = 240, PAD = { t: 14, r: 14, b: 26, l: 34 };
  const x0 = parseISO(goal.startDate).getTime();
  // o range cobre até a meta OU até o último peso registrado, o que for mais tarde —
  // assim pesos lançados depois de 31/dez continuam aparecendo no gráfico.
  const lastWeightT = weights.length ? Math.max(...weights.map(w => parseISO(w.d).getTime())) : 0;
  const x1 = Math.max(parseISO(goal.targetDate).getTime(), lastWeightT, x0 + 86400000);
  const kgs = weights.map(w => w.kg).concat([goal.startKg, goal.targetKg]);
  const yMin = Math.floor(Math.min(...kgs) / 5) * 5 - 2;
  const yMax = Math.ceil(Math.max(...kgs) / 5) * 5 + 2;
  const X = t => PAD.l + (t - x0) / (x1 - x0) * (W - PAD.l - PAD.r);
  const Y = kg => PAD.t + (yMax - kg) / (yMax - yMin) * (H - PAD.t - PAD.b);

  let grid = '', labels = '';
  for (let kg = Math.ceil(yMin / 5) * 5; kg <= yMax; kg += 5) {
    grid += `<line x1="${PAD.l}" y1="${Y(kg)}" x2="${W - PAD.r}" y2="${Y(kg)}" stroke="#20262330" stroke-width="1"/>`;
    labels += `<text x="${PAD.l - 6}" y="${Y(kg) + 3.5}" text-anchor="end" font-size="10" fill="#6E7A74">${kg}</text>`;
  }
  const shortMonths = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const startD = new Date(x0), endD = new Date(x1);
  for (let y = startD.getFullYear(), m = startD.getMonth(); y < endD.getFullYear() || (y === endD.getFullYear() && m <= endD.getMonth()); m++) {
    if (m > 11) { m = 0; y++; }
    const t = new Date(y, m, 1).getTime();
    if (t > x0 && t < x1) labels += `<text x="${X(t)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#6E7A74">${shortMonths[m]}</text>`;
  }

  const meta = `<line x1="${X(x0)}" y1="${Y(goal.startKg)}" x2="${X(x1)}" y2="${Y(goal.targetKg)}"
    stroke="#5A655F" stroke-width="1.5" stroke-dasharray="5 5"/>
    <text x="${X(x1) - 4}" y="${Y(goal.targetKg) - 7}" text-anchor="end" font-size="10.5" fill="#A6B1AB">Meta 80</text>`;

  let line = '', dots = '';
  if (weights.length) {
    const pts = weights.map(w => [X(parseISO(w.d).getTime()), Y(w.kg), w]);
    line = `<polyline points="${pts.map(p => p[0] + ',' + p[1]).join(' ')}" fill="none" stroke="#A3E635" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach(([px, py, w], i) => {
      const isLast = i === pts.length - 1;
      dots += `<circle cx="${px}" cy="${py}" r="${isLast ? 5 : 4}" fill="#A3E635" stroke="#0B0D0C" stroke-width="2"
        data-d="${esc(w.d)}" data-kg="${esc(String(Number(w.kg) || 0))}" style="cursor:pointer"/>`;
      if (isLast) dots += `<text x="${px}" y="${py - 10}" text-anchor="middle" font-size="11" font-weight="700" fill="#F0F4F1">${esc(String(Number(w.kg) || 0).replace('.', ','))}</text>`;
    });
  }

  const svg = h(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução do peso">
    ${grid}${labels}${meta}${line}${dots}
  </svg>`);
  svg.addEventListener('click', (e) => {
    const c = e.target.closest('circle[data-d]');
    const info = svg.parentElement && $('.chart-info', svg.parentElement);
    if (c && info) info.textContent = `${fmtShort(parseISO(c.dataset.d))}: ${String(c.dataset.kg).replace('.', ',')} kg`;
  });
  return svg;
}

/* ---------------- backup ---------------- */
function blobToB64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}
async function exportBackup() {
  try {
    const days = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('shape:')) days[k] = store.get(k, null);
    }
    const photos = [];
    for (const p of await allPhotos()) {
      photos.push({ id: p.id, week: p.week, date: p.date, pose: p.pose, b64: await blobToB64(p.blob) });
    }
    const payload = { app: 'shape', version: 1, exportedAt: new Date().toISOString(), store: days, photos };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `shape-backup-${dayKey(today())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Backup exportado ✔');
  } catch { toast('Erro no backup'); }
}
/* Valida a forma de cada chave conhecida antes de gravar — um backup vindo de fora
   (arquivo editado à mão, ou adulterado) nunca deve poder gravar HTML/JS via innerHTML
   nem quebrar o app com um tipo inesperado (ex.: array virar objeto). */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function sanitizeStoreValue(k, v) {
  if (k === 'shape:weights') {
    if (!Array.isArray(v)) return null;
    return v.filter(w => w && DATE_RE.test(w.d) && typeof w.kg === 'number' && w.kg >= 40 && w.kg <= 200)
      .map(w => ({ d: w.d, kg: Math.round(w.kg * 10) / 10 }));
  }
  if (k.startsWith('shape:cardio:')) {
    if (!DATE_RE.test(k.slice('shape:cardio:'.length)) || !v || typeof v !== 'object') return null;
    const num = (n) => (typeof n === 'number' && n >= 0 && n <= 2000) ? n : 0;
    return { bike: num(v.bike), escada: num(v.escada) };
  }
  if (k.startsWith('shape:day:')) {
    if (!DATE_RE.test(k.slice('shape:day:'.length)) || !v || typeof v !== 'object') return null;
    const meals = Array.isArray(v.meals) ? v.meals.slice(0, 5).map(Boolean) : [false, false, false, false, false];
    while (meals.length < 5) meals.push(false);
    const exDone = Array.isArray(v.exDone) ? v.exDone.slice(0, 8).map(Boolean) : [];
    return { meals, workout: Boolean(v.workout), extras: Boolean(v.extras), calf: Boolean(v.calf), exDone };
  }
  return null; // chave desconhecida: ignora (nunca grava fora do formato esperado)
}

async function importBackup(file) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (payload.app !== 'shape') throw new Error('arquivo inválido');
    if (!confirm('Importar backup? Dados atuais com mesma data serão sobrescritos.')) return;
    for (const [k, v] of Object.entries(payload.store || {})) {
      const clean = sanitizeStoreValue(k, v);
      if (clean !== null) store.set(k, clean);
    }
    for (const p of payload.photos || []) {
      if (!POSES.includes(p.pose) || !DATE_RE.test(p.week) || !DATE_RE.test(p.date)) continue;
      if (typeof p.b64 !== 'string' || !p.b64.startsWith('data:image/')) continue; // nunca busca URL remota
      const blob = await (await fetch(p.b64)).blob();
      await putPhoto({ id: `${p.week}:${p.pose}`, week: p.week, date: p.date, pose: p.pose, blob });
    }
    toast('Backup importado ✔');
    renderAll();
  } catch { toast('Arquivo de backup inválido'); }
}

/* ---------------- navegação ---------------- */
const renderers = { hoje: renderHoje, semana: renderSemana, treino: renderTreino, dieta: renderDieta, checkin: renderCheckin };

function renderHoje() {
  const view = $('#view-hoje');
  view.innerHTML = '';
  renderDayPlan(view, today());
}

function switchView(name) {
  $$('.view').forEach(v => { v.hidden = v.id !== 'view-' + name; });
  $$('.tab').forEach(t => {
    const on = t.dataset.view === name;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on);
  });
  renderTopbar();
  renderers[name]();
  window.scrollTo({ top: 0 });
}

function renderTopbar() {
  const t = today();
  $('#topbar-date').textContent = fmtLong(t);
  $('#phase-chip').textContent = phaseFor(t).label;
}

function renderAll() {
  renderTopbar();
  const active = $('.tab.active');
  switchView(active ? active.dataset.view : 'hoje');
}

$$('.tab').forEach(t => t.addEventListener('click', () => switchView(t.dataset.view)));

/* re-renderiza na virada de dia — ao voltar pro app (visibilitychange) e também com o
   app aberto e em primeiro plano (setInterval), para não gravar check-marks no dia errado
   nem deixar a topbar defasada se a aba nunca for ocultada cruzando a meia-noite. */
let lastRenderDay = dayKey(today());
function checkDayChange() {
  if (dayKey(today()) !== lastRenderDay) {
    lastRenderDay = dayKey(today());
    renderAll();
  }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDayChange(); });
setInterval(() => { if (!document.hidden) checkDayChange(); }, 60000);

/* ---------------- init ---------------- */
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // só recarrega em troca de controller que representa uma ATUALIZAÇÃO real — não a
    // ativação inicial do service worker na primeira visita (clients.claim() dispara
    // controllerchange mesmo sem update algum, o que recarregaria a página à toa).
    const hadControllerAtLoad = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage('skipWaiting');
          }
        });
      });
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded || !hadControllerAtLoad) { reloaded = true; return; }
      reloaded = true;
      location.reload();
    });
  });
}

renderAll();
