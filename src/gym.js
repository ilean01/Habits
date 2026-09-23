// Gym y bienestar: fotos del entrenamiento, peso y medidas, y comparación entre fechas.
// Todo se guarda como registros 'journal' (el esquema de Supabase ya acepta ese tipo):
//   fotos:   {workoutPhoto:true, path, date, angle, text, at}   (la imagen vive en el bucket privado workout-photos)
//   medidas: {bodyLog:true, date, weight, waist, hips, chest, arm, fat, text, at}
import {dayKey, parseDay} from './domain.js';
import * as db from './store.js';

export const GYM_AREA = 'salud';
const ANGLES = [['frente','De frente'],['perfil','De perfil'],['espalda','De espalda'],['otra','Otra']];
const MEASURES = [['weight','Peso','kg'],['waist','Cintura','cm'],['hips','Cadera','cm'],['chest','Pecho','cm'],['arm','Brazo','cm'],['fat','Grasa corporal','%']];
const urlCache = new Map();

export const photos = () => db.records('journal').filter(r => r.workoutPhoto && r.path).sort((a, b) => b.date.localeCompare(a.date) || (b.at || '').localeCompare(a.at || ''));
export const bodyLogs = () => db.records('journal').filter(r => r.bodyLog).sort((a, b) => a.date.localeCompare(b.date) || (a.at || '').localeCompare(b.at || ''));
export const isGymHabit = h => !!h && (h.area === GYM_AREA || /gym|gimnas|entren/i.test(h.name || '')) && (h.icon === 'Dumbbell' || /gym|gimnas|entren/i.test(h.name || ''));

const num = v => v === '' || v === null || v === undefined ? null : Number(v);
const fmt = (v, unit) => v === null || v === undefined || Number.isNaN(v) ? '—' : `${Number(v).toLocaleString('es-PY', {maximumFractionDigits:1})} ${unit}`;
const niceDate = d => parseDay(d).toLocaleDateString('es-PY', {weekday:'short', day:'numeric', month:'short', year:'numeric'});
const photoDates = () => [...new Set(photos().map(p => p.date))];

function lastMeasure(key, upTo = '9999-12-31') {
  const list = bodyLogs().filter(r => r.date <= upTo && num(r[key]) !== null);
  return list.length ? list[list.length - 1] : null;
}

function weightChart(esc) {
  const list = bodyLogs().filter(r => num(r.weight) !== null).slice(-20);
  if (list.length < 2) return '<p class="muted small">Cuando registres tu peso al menos dos veces, acá vas a ver cómo va cambiando.</p>';
  const ws = list.map(r => Number(r.weight)), min = Math.min(...ws), max = Math.max(...ws), span = max - min || 1;
  const W = 600, H = 150, pad = 18;
  const pts = list.map((r, i) => [pad + i * (W - 2 * pad) / (list.length - 1), H - pad - (Number(r.weight) - min) / span * (H - 2 * pad)]);
  return `<svg class="gym-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del peso"><polyline fill="none" stroke="currentColor" stroke-width="2.5" points="${pts.map(p => p.join(',')).join(' ')}"/>${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="4"><title>${esc(niceDate(list[i].date))}: ${esc(fmt(ws[i], 'kg'))}</title></circle>`).join('')}</svg><div class="gym-chart-labels"><small>${esc(niceDate(list[0].date))}</small><small>${esc(niceDate(list[list.length - 1].date))}</small></div>`;
}

function photoTile(p, esc, btn) {
  const angle = ANGLES.find(a => a[0] === p.angle)?.[1] || '';
  return `<figure class="gym-photo"><div class="gym-photo-img" data-gym-photo="${esc(p.path)}"><span>Cargando…</span></div><figcaption><strong>${esc(niceDate(p.date))}</strong>${angle ? ` · ${esc(angle)}` : ''}${p.text ? `<small>${esc(p.text)}</small>` : ''}${btn('Quitar', 'gym-photo-delete', `data-id="${esc(p.id)}"`, 'text-button danger small')}</figcaption></figure>`;
}

function comparePair(dates = photoDates()) {
  const a = window.gymCompareA && dates.includes(window.gymCompareA) ? window.gymCompareA : dates[dates.length - 1];
  const b = window.gymCompareB && dates.includes(window.gymCompareB) ? window.gymCompareB : dates[0];
  return [a, b];
}

function comparePanel(esc, btn) {
  const dates = photoDates();
  if (dates.length < 2) return `<section class="panel"><h2>Comparar fechas</h2><p class="muted">Cuando tengas fotos de al menos dos días distintos, vas a poder ponerlas una al lado de la otra.</p></section>`;
  const [a, b] = comparePair(dates);
  const option = sel => dates.map(d => `<option value="${esc(d)}" ${d === sel ? 'selected' : ''}>${esc(niceDate(d))}</option>`).join('');
  const side = d => {
    const ps = photos().filter(p => p.date === d), w = lastMeasure('weight', d);
    return `<div class="gym-compare-side">${ps.map(p => `<div class="gym-photo-img" data-gym-photo="${esc(p.path)}"><span>Cargando…</span></div>`).join('')}<p><strong>${esc(niceDate(d))}</strong><br><small>${w ? `Peso: ${esc(fmt(num(w.weight), 'kg'))}${w.date !== d ? ` (registrado el ${esc(niceDate(w.date))})` : ''}` : 'Sin peso registrado hasta ese día'}</small></p></div>`;
  };
  const wa = lastMeasure('weight', a), wb = lastMeasure('weight', b);
  const diff = wa && wb ? Number(wb.weight) - Number(wa.weight) : null;
  const days = Math.round((parseDay(b) - parseDay(a)) / 86400000);
  return `<section class="panel"><div class="section-title"><div><h2>Comparar fechas</h2><p>Elegí dos días y mirá tus fotos lado a lado.</p></div></div><div class="gym-compare-controls"><label>Antes<select data-gym-compare="A">${option(a)}</select></label>${btn('⇄', 'gym-compare-swap', 'aria-label="Intercambiar fechas"', 'icon-button')}<label>Después<select data-gym-compare="B">${option(b)}</select></label></div>${diff !== null && a !== b ? `<p class="gym-diff">En ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}: <strong>${diff > 0 ? '+' : ''}${esc(fmt(diff, 'kg'))}</strong></p>` : ''}<div class="gym-compare">${side(a)}${side(b)}</div></section>`;
}

export function gymView({esc, btn, icon}) {
  const today = dayKey(), todayPhotos = photos().filter(p => p.date === today), todayBody = bodyLogs().filter(r => r.date === today).pop();
  const demo = db.info().demo;
  const cards = MEASURES.map(([key, label, unit]) => {
    const last = lastMeasure(key); if (!last) return '';
    const prev = bodyLogs().filter(r => r.date < last.date && num(r[key]) !== null).pop();
    const d = prev ? Number(last[key]) - Number(prev[key]) : null;
    return `<article class="panel gym-stat"><span>${esc(label)}</span><strong>${esc(fmt(num(last[key]), unit))}</strong><small>${d === null ? esc(niceDate(last.date)) : `${d > 0 ? '+' : ''}${esc(fmt(d, unit))} desde el ${esc(niceDate(prev.date))}`}</small></article>`;
  }).join('');
  return `<section class="panel gym-today"><div class="section-title"><div><h2>Tu registro de hoy</h2><p>${todayPhotos.length ? `${todayPhotos.length} ${todayPhotos.length === 1 ? 'foto' : 'fotos'} de hoy` : 'Todavía no hay foto de hoy'}${todayBody ? ` · peso ${esc(fmt(num(todayBody.weight), 'kg'))}` : ''}</p></div></div><div class="button-row">${btn(icon('Plus') + 'Foto de hoy', 'gym-photo-add', '', 'button primary')}${btn(icon('Plus') + 'Peso y medidas', 'gym-body-add', '', 'button outline')}</div>${demo ? '<p class="notice">En la demo podés registrar peso y medidas. Las fotos necesitan una cuenta, porque se guardan en tu espacio privado.</p>' : ''}</section>${cards ? `<div class="gym-stats">${cards}</div>` : ''}<section class="panel"><h2>Tu peso en el tiempo</h2>${weightChart(esc)}${bodyLogs().length ? `<details class="gym-history"><summary>Ver todos los registros</summary>${bodyLogs().slice().reverse().map(r => `<p class="session-row"><span>${esc(niceDate(r.date))}<small>${MEASURES.filter(([k]) => num(r[k]) !== null && k !== 'weight').map(([k, l, u]) => `${l} ${fmt(num(r[k]), u)}`).join(' · ') || (r.text ? esc(r.text) : '')}</small></span><b>${esc(fmt(num(r.weight), 'kg'))}</b>${btn('Quitar', 'gym-body-delete', `data-id="${esc(r.id)}"`, 'text-button danger small')}</p>`).join('')}</details>` : ''}</section>${comparePanel(esc, btn)}<section class="panel"><h2>Tus fotos</h2>${photos().length ? `<div class="gym-gallery">${photos().map(p => photoTile(p, esc, btn)).join('')}</div>` : '<p class="muted">Todavía no guardaste fotos. Podés subir una desde "Foto de hoy" o al marcar tu gym como hecho.</p>'}</section>`;
}

export async function hydrateGymPhotos() {
  const slots = [...document.querySelectorAll('[data-gym-photo]')];
  if (!slots.length) return;
  if (db.info().demo || !db.supabase) { slots.forEach(s => s.innerHTML = '<span>Foto disponible con tu cuenta</span>'); return; }
  const now = Date.now(), missing = [...new Set(slots.map(s => s.dataset.gymPhoto))].filter(p => !(urlCache.get(p)?.until > now));
  if (missing.length) {
    const {data} = await db.supabase.storage.from('workout-photos').createSignedUrls(missing, 3600);
    for (const row of data || []) if (row?.path && row.signedUrl) urlCache.set(row.path, {url:row.signedUrl, until:now + 55 * 60000});
  }
  for (const s of document.querySelectorAll('[data-gym-photo]')) {
    const u = urlCache.get(s.dataset.gymPhoto)?.url;
    if (u && !s.querySelector('img')) s.innerHTML = `<img src="${u}" alt="Foto del entrenamiento" loading="lazy">`;
    else if (!u) s.innerHTML = '<span>No se pudo cargar</span>';
  }
}

async function shrink(file) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) { if (['image/jpeg','image/png','image/webp'].includes(file.type) && file.size <= 10485760) return file; throw new Error('No se pudo leer esa imagen. Probá con otra foto.'); }
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('No se pudo preparar la foto.')), 'image/jpeg', 0.85));
}

function photoForm({showModal, input, textarea, esc, toast, modal}, {title = 'Foto de hoy', intro = '', date = dayKey()} = {}) {
  showModal(title, `<form>${intro}${input('Fecha', 'date', date, 'date', `required max="${dayKey()}"`)}<label>Tomar o elegir una foto<input name="photo" type="file" accept="image/*" required></label><label>Tipo de foto<select name="angle">${ANGLES.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label>${textarea('¿Cómo te sentiste? (opcional)', 'text', '')}<p class="muted small">Solo tu cuenta puede ver estas fotos. Se achican antes de subir para que carguen rápido. Necesitás conexión.</p><div class="modal-footer"><button type="button" class="button outline" data-action="close">Ahora no</button><button class="button primary" type="submit">Guardar foto</button></div></form>`, async f => {
    if (db.info().demo) throw new Error('Iniciá sesión para guardar fotos privadas.');
    const file = f.get('photo'); if (!file?.size) throw new Error('Elegí una foto.');
    const blob = await shrink(file);
    const {data:{user}} = await db.supabase.auth.getUser(); if (!user) throw new Error('Iniciá sesión de nuevo.');
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const {error} = await db.supabase.storage.from('workout-photos').upload(path, blob, {contentType:'image/jpeg'});
    if (error) throw new Error('No se pudo subir la foto. Revisá la conexión.');
    db.put('journal', {workoutPhoto:true, path, angle:f.get('angle') || 'frente', text:String(f.get('text') || ''), date:f.get('date'), at:new Date().toISOString()});
    modal.close(); toast('Foto guardada. ¡Qué bueno ver tu avance!');
  });
}

export function afterGymDone(h, date, helpers) {
  if (!isGymHabit(h) || db.info().demo) return false;
  if (photos().some(p => p.date === date)) return false;
  photoForm(helpers, {title:`¡Terminaste ${helpers.esc(h.name)}! 💪`, intro:'<p>¿Querés guardar una foto de hoy para ver tu avance con el tiempo? Es opcional.</p>', date});
  return true;
}

export async function gymAction(a, el, helpers) {
  if (!a.startsWith('gym-') && a !== 'workout-photos') return false;
  const {showModal, input, textarea, esc, toast, modal, render} = helpers;
  if (a === 'gym-photo-add' || a === 'workout-photos') { photoForm(helpers); return true; }
  if (a === 'gym-body-add') {
    const last = Object.fromEntries(MEASURES.map(([k]) => [k, lastMeasure(k)?.[k] ?? '']));
    showModal('Peso y medidas', `<form>${input('Fecha', 'date', dayKey(), 'date', `required max="${dayKey()}"`)}<div class="form-grid">${MEASURES.map(([k, l, u]) => input(`${l} (${u})`, k, '', 'number', `min="0" max="${k === 'fat' ? 100 : 500}" step="0.1" placeholder="${last[k] === '' ? '' : 'Último: ' + last[k]}"`)).join('')}</div>${textarea('Nota (opcional)', 'text', '')}<p class="muted small">Completá solo lo que quieras. Nada es obligatorio.</p><button class="button primary" type="submit">Guardar</button></form>`, f => {
      const data = {bodyLog:true, date:f.get('date'), text:String(f.get('text') || ''), at:new Date().toISOString()};
      for (const [k] of MEASURES) { const v = f.get(k); if (v !== '' && v !== null) data[k] = Number(v); }
      if (!MEASURES.some(([k]) => data[k] !== undefined)) throw new Error('Completá al menos un dato.');
      db.put('journal', data); modal.close(); toast('Registro guardado.');
    });
    return true;
  }
  if (a === 'gym-body-delete') { db.remove(el.dataset.id); toast('Registro quitado.'); return true; }
  if (a === 'gym-compare-swap') { const [A, B] = comparePair(); window.gymCompareA = B; window.gymCompareB = A; render(); return true; }
  if (a === 'gym-photo-delete') {
    const p = photos().find(r => r.id === el.dataset.id); if (!p) return true;
    showModal('Quitar foto', `<p>La foto se borra de tu espacio privado. No se puede deshacer.</p><form><div class="modal-footer"><button type="button" class="button outline" data-action="close">Cancelar</button><button type="submit" class="button primary">Quitar esta foto</button></div></form>`, async () => {
      if (!db.info().demo) { const {error} = await db.supabase.storage.from('workout-photos').remove([p.path]); if (error) throw error; }
      urlCache.delete(p.path); db.remove(p.id); modal.close(); toast('Foto quitada.');
    });
    return true;
  }
  return false;
}

document.addEventListener('change', e => {
  const s = e.target.closest?.('[data-gym-compare]'); if (!s) return;
  window[`gymCompare${s.dataset.gymCompare}`] = s.value;
  document.dispatchEvent(new CustomEvent('habits:rerender'));
});
