/* ICLUB · Inicio: cosas por hacer. Primera en el Inicio.
   Cada tarea tiene a quién se le deriva (con su WhatsApp), fecha, fotos y botones para copiarla o mandarla.
   Las fotos van aparte (migraciones/18-tareas-fotos.sql); en la tarea queda solo una miniatura. */
(function () {
  'use strict';
  const A = window.ICA, M = window.ICLUBMetrics; const { esc, chip } = A; const ui = A.ui;
  ui.tarFil = ui.tarFil || 'pend'; ui.tarPara = ui.tarPara || '';
  const panel = () => A.db.panel || {};
  const tareas = () => panel().tareas || [];
  const equipo = () => panel().equipo || [];
  const hoy = () => M.iso(new Date());
  const fdate = (f) => String(f || '').split('-').reverse().join('/');
  const telDe = (para) => { const p = String(para || '').trim().toLowerCase(); const e = equipo().find((x) => x.name.toLowerCase() === p); return e ? e.tel : ''; };
  let pend = []; // fotos elegidas en el formulario, ya achicadas

  /* ---------- Fotos ---------- */
  const shrink = (file, max, q) => new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s)); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', q)); };
    img.onerror = () => { URL.revokeObjectURL(u); rej(Error('No pude leer la imagen ' + file.name + '.')); };
    img.src = u;
  });
  const prep = async (files) => { const out = []; for (const f of files) { if (!/^image\//.test(f.type)) continue; out.push({ id: A.uid(), name: f.name.replace(/\.[^.]+$/, '') + '.jpg', full: await shrink(f, 1600, 0.85), th: await shrink(f, 260, 0.7) }); } return out; };
  const rpc = async (action, item) => {
    let r; try { r = await A.rpc('iclub_tarea_foto', { p_action: action, p_item: item }); } catch (e) { if (/tarea_foto|function|schema cache|not find/i.test(e.message)) throw Error('Para guardar fotos ejecutá migraciones/18-tareas-fotos.sql en Supabase.'); throw e; }
    if (r && r.ok === false) throw Error(r.error || 'No se pudo guardar la foto.'); return r || {};
  };
  const subir = async (tareaId, list) => { for (const p of list) await rpc('put', { id: p.id, tarea: tareaId, name: p.name, data: p.full }); return list.map((p) => ({ id: p.id, name: p.name, th: p.th })); };
  const bajar = async (tareaId) => (await rpc('get', { tarea: tareaId })).fotos || [];
  const toFile = (f) => { const [h, b] = f.data.split(','), bin = atob(b), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new File([u], f.name || 'foto.jpg', { type: (h.match(/data:([^;]+)/) || [])[1] || 'image/jpeg' }); };

  /* ---------- Texto para mandar ---------- */
  A.tareaTexto = (x) => (x.para ? 'Hola ' + A.first(x.para) + '! ' : '') + 'Te paso esta tarea de ICLUB 📌\n\n' + x.t + (x.f ? '\n\n📅 Para el ' + fdate(x.f) : '') + ((x.fotos || []).length ? '\n🖼 Te mando ' + (x.fotos.length === 1 ? '1 foto' : x.fotos.length + ' fotos') + ' con la tarea.' : '') + '\n\nCuando esté lista avisame ✅';
  const copiar = async (t) => { try { await navigator.clipboard.writeText(t); } catch (_) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* nada */ } ta.remove(); } A.toast('Tarea copiada. Pegala donde quieras.'); };

  /* ---------- Widget ---------- */
  const fotosHtml = (x) => (x.fotos || []).length ? '<div class="tar-th">' + x.fotos.map((f) => '<img src="' + esc(f.th) + '" alt="" data-act="tar-ver" data-id="' + esc(x.id) + '" title="Ver foto">').join('') + '</div>' : '';
  const itemHtml = (x) => { const late = !x.done && x.f && x.f < hoy(), today = !x.done && x.f === hoy();
    return '<div class="tar-item' + (x.done ? ' done' : '') + '" data-id="' + esc(x.id) + '"><input type="checkbox" class="tar-ck" data-act="tar-toggle" data-id="' + esc(x.id) + '" ' + (x.done ? 'checked' : '') + ' title="Marcar como hecha">' +
      '<div class="grow"><div class="tar-t">' + esc(x.t).replace(/\n/g, '<br>') + '</div><div class="tar-meta">' + (x.para ? chip('👤 ' + x.para, 'brand') : chip('Sin asignar', 'muted')) + (x.f ? chip((late ? 'Venció ' : today ? 'Hoy · ' : '') + fdate(x.f), late ? 'bad' : today ? 'warn' : 'muted') : '') + ((x.fotos || []).length ? chip('🖼 ' + x.fotos.length, 'muted') : '') + (x.done && x.doneAt ? '<span class="tiny muted">hecha el ' + esc(fdate(x.doneAt.slice(0, 10))) + '</span>' : '') + '</div>' + fotosHtml(x) + '</div>' +
      '<div class="tar-acts"><button type="button" class="btn-sm btn-2" data-act="tar-copy" data-id="' + esc(x.id) + '">Copiar</button><button type="button" class="btn-sm btn-wa" data-act="tar-send" data-id="' + esc(x.id) + '">Mandar</button><button type="button" class="btn-sm btn-2" data-act="tar-edit" data-id="' + esc(x.id) + '">Editar</button><button type="button" class="btn-sm btn-2 x-del" data-act="tar-del" data-id="' + esc(x.id) + '" title="Borrar">✕</button></div></div>'; };
  const lista = () => { let ts = tareas().slice(); if (ui.tarFil === 'pend') ts = ts.filter((x) => !x.done); else if (ui.tarFil === 'done') ts = ts.filter((x) => x.done); if (ui.tarPara) ts = ts.filter((x) => (x.para || '') === ui.tarPara);
    return ts.sort((a, b) => (a.done - b.done) || String(a.f || '9999').localeCompare(String(b.f || '9999')) || String(b.at || '').localeCompare(String(a.at || ''))); };
  const formHtml = () => '<form id="tareaForm" class="tar-form"><textarea name="t" rows="2" placeholder="¿Qué hay que hacer? Ej: Subir historia con el iPhone 15 nuevo" required></textarea>' +
    '<div class="tar-form-row"><label class="f">Para quién<input name="para" list="tarEquipo" placeholder="Ej: Cami (CM)" autocomplete="off"></label><label class="f">Su WhatsApp<input name="tel" inputmode="tel" placeholder="381…"></label><label class="f">Para cuándo<input type="date" name="f"></label>' +
    '<label class="btn btn-2 tar-file">🖼 Fotos<input type="file" name="fotos" accept="image/*" multiple hidden></label><button class="btn-brand">Agregar tarea</button></div><div class="tar-pend small muted" id="tarPend"></div>' +
    '<datalist id="tarEquipo">' + equipo().map((e) => '<option value="' + esc(e.name) + '">').join('') + '</datalist></form>';
  function wTareas() {
    const all = tareas(), n = all.filter((x) => !x.done).length, late = all.filter((x) => !x.done && x.f && x.f < hoy()).length, personas = [...new Set(all.map((x) => x.para).filter(Boolean))].sort();
    const seg = '<div class="seg" data-tarfil>' + [['pend', 'Pendientes'], ['done', 'Hechas'], ['all', 'Todas']].map(([v, l]) => '<button type="button" data-act="tar-fil" data-v="' + v + '" class="' + (ui.tarFil === v ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
    const per = personas.length ? '<select data-act="tar-para" class="tar-sel"><option value="">Todos</option>' + personas.map((p) => '<option' + (ui.tarPara === p ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '</select>' : '';
    const ls = lista();
    return '<div class="tar-head"><h2>✅ Cosas por hacer</h2>' + chip(n + (n === 1 ? ' pendiente' : ' pendientes'), n ? 'brand' : 'muted') + (late ? chip(late + ' vencida' + (late === 1 ? '' : 's'), 'bad') : '') + '<div class="spacer"></div><div class="tar-filtros">' + per + seg + '</div></div>' + formHtml() +
      '<div class="tar-list">' + (ls.length ? ls.map(itemHtml).join('') : '<div class="empty" style="padding:18px 8px">' + (ui.tarFil === 'pend' ? 'Nada pendiente. 🎉' : 'No hay tareas.') + '</div>') + '</div>';
  }
  if (A.registerWidget) A.registerWidget('tareas', { t: 'Cosas por hacer (tareas)', s: 12, fn: wTareas });

  /* ---------- Guardar ---------- */
  const guardar = (fn, msg) => A.act(async () => { const next = A.clone(A.db); next.panel = { ...(next.panel || {}) }; next.panel.tareas = (next.panel.tareas || []).slice(); const desc = await fn(next); await A.saveDb(next, desc); A._keepScroll = true; A.closeModal(); A.render(); }, msg);
  const recordar = (next, para, tel) => { para = String(para || '').trim(); tel = String(tel || '').replace(/[^\d+]/g, ''); if (!para) return; const eq = (next.panel.equipo || []).slice(), i = eq.findIndex((e) => e.name.toLowerCase() === para.toLowerCase()); if (i >= 0) { if (tel) eq[i] = { ...eq[i], tel }; } else eq.push({ name: para, tel }); next.panel.equipo = eq; };
  const pendHtml = (list) => list.length ? '<div class="tar-th">' + list.map((p, i) => '<span class="tar-pv"><img src="' + esc(p.th) + '" alt=""><button type="button" data-act="tar-pend-del" data-i="' + i + '" title="Quitar">×</button></span>').join('') + '</div>' : '';
  const byId = (id) => tareas().find((x) => x.id === id);

  document.addEventListener('change', async (ev) => {
    const el = ev.target;
    if (el.matches('[data-act="tar-para"]')) { ui.tarPara = el.value; A._keepScroll = true; A.render(); return; }
    if (el.name === 'para' && el.form && /^tarea(Form|Edit)$/.test(el.form.id)) { const t = telDe(el.value); if (t && !el.form.elements.tel.value) el.form.elements.tel.value = t; }
    if (el.name === 'fotos' && el.form && /^tarea(Form|Edit)$/.test(el.form.id)) {
      try { const nuevos = await prep([...el.files]); el.value = ''; if (el.form.id === 'tareaForm') { pend = pend.concat(nuevos).slice(0, 12); A.$('#tarPend').innerHTML = pendHtml(pend); } else { const box = el.form.querySelector('.tar-edit-new'); el.form._nuevos = (el.form._nuevos || []).concat(nuevos).slice(0, 12); box.innerHTML = el.form._nuevos.map((p) => '<span class="tar-pv"><img src="' + esc(p.th) + '" alt=""></span>').join(''); } }
      catch (e) { A.toast(e.message, true); }
    }
  });
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act^="tar-"]'); if (!b || b.matches('select')) return; const act = b.dataset.act, id = b.dataset.id;
    if (act === 'tar-toggle') { const done = b.checked; guardar((next) => { next.panel.tareas = next.panel.tareas.map((x) => x.id === id ? { ...x, done, doneAt: done ? new Date().toISOString() : '' } : x); const x = byId(id); return 'Tarea ' + (done ? 'hecha' : 'reabierta') + ': ' + (x ? x.t.slice(0, 60) : ''); }); return; }
    ev.preventDefault();
    if (act === 'tar-fil') { ui.tarFil = b.dataset.v; A._keepScroll = true; A.render(); }
    else if (act === 'tar-pend-del') { pend.splice(Number(b.dataset.i), 1); A.$('#tarPend').innerHTML = pendHtml(pend); }
    else if (act === 'tar-copy') { const x = byId(id); if (x) copiar(A.tareaTexto(x)); }
    else if (act === 'tar-send') A.tareaMandar(id);
    else if (act === 'tar-edit') A.tareaEditar(id);
    else if (act === 'tar-ver') A.tareaFotos(id);
    else if (act === 'tar-del') { const x = byId(id); if (!x || !confirm('¿Borrar la tarea "' + x.t.slice(0, 60) + '"' + ((x.fotos || []).length ? ' y sus fotos' : '') + '?')) return; guardar(async (next) => { if ((x.fotos || []).length) { try { await rpc('delTarea', { tarea: id }); } catch (_) { /* si no está la 18, igual se borra la tarea */ } } next.panel.tareas = next.panel.tareas.filter((t) => t.id !== id); return 'Tarea borrada: ' + x.t.slice(0, 60); }, 'Tarea borrada.'); }
    else if (act === 'tar-share') { const s = A._tarShare; if (!s) return; navigator.share(s).catch(() => {}); }
    else if (act === 'tar-wa') { const x = byId(id); if (x) window.open(A.waLink(x.tel || '', A.tareaTexto(x)), '_blank', 'noopener'); }
    else if (act === 'tar-copy2') { const x = byId(id); if (x) copiar(A.tareaTexto(x)); }
    else if (act === 'tar-foto-del') { const f = b.closest('form'); if (!f) return; f._quitar = (f._quitar || []).concat([b.dataset.f]); b.closest('.tar-pv').remove(); }
  });
  document.addEventListener('submit', (ev) => {
    const f = ev.target; if (f.id !== 'tareaForm' && f.id !== 'tareaEdit') return; ev.preventDefault(); const e = f.elements, t = e.t.value.trim(); if (!t) return;
    if (f.id === 'tareaForm') {
      const fotos = pend.slice();
      guardar(async (next) => { const id = A.uid(), sub = fotos.length ? await subir(id, fotos) : []; next.panel.tareas.push({ id, t: t.slice(0, 2000), para: e.para.value.trim().slice(0, 60), tel: e.tel.value.trim().slice(0, 30), f: e.f.value || '', done: false, at: new Date().toISOString(), fotos: sub }); recordar(next, e.para.value, e.tel.value); pend = []; return 'Tarea nueva' + (e.para.value.trim() ? ' para ' + e.para.value.trim() : '') + ': ' + t.slice(0, 60); }, 'Tarea agregada.');
    } else {
      const id = f.dataset.id, x = byId(id), nuevos = f._nuevos || [], quitar = f._quitar || [];
      guardar(async (next) => { for (const q of quitar) await rpc('del', { id: q }); const sub = nuevos.length ? await subir(id, nuevos) : []; next.panel.tareas = next.panel.tareas.map((y) => y.id === id ? { ...y, t: t.slice(0, 2000), para: e.para.value.trim().slice(0, 60), tel: e.tel.value.trim().slice(0, 30), f: e.f.value || '', fotos: (y.fotos || []).filter((p) => !quitar.includes(p.id)).concat(sub) } : y); recordar(next, e.para.value, e.tel.value); return 'Tarea editada: ' + (x ? x.t.slice(0, 60) : t.slice(0, 60)); }, 'Tarea guardada.');
    }
  });

  /* ---------- Ventanas ---------- */
  A.tareaEditar = (id) => { const x = byId(id); if (!x) return;
    A.modal('Editar tarea', '<form id="tareaEdit" class="grid" data-id="' + esc(id) + '"><label class="f">Qué hay que hacer<textarea name="t" rows="4" required>' + esc(x.t) + '</textarea></label><div class="grid g3"><label class="f">Para quién<input name="para" list="tarEquipo2" value="' + esc(x.para || '') + '" autocomplete="off"></label><label class="f">Su WhatsApp<input name="tel" inputmode="tel" value="' + esc(x.tel || '') + '"></label><label class="f">Para cuándo<input type="date" name="f" value="' + esc(x.f || '') + '"></label></div>' +
      '<datalist id="tarEquipo2">' + equipo().map((p) => '<option value="' + esc(p.name) + '">').join('') + '</datalist>' +
      '<div><div class="small strong" style="margin-bottom:6px">Fotos</div><div class="tar-th">' + (x.fotos || []).map((p) => '<span class="tar-pv"><img src="' + esc(p.th) + '" alt=""><button type="button" data-act="tar-foto-del" data-f="' + esc(p.id) + '" title="Quitar">×</button></span>').join('') + '<span class="tar-edit-new"></span></div><label class="btn btn-2 tar-file" style="margin-top:8px">🖼 Agregar fotos<input type="file" name="fotos" accept="image/*" multiple hidden></label></div>' +
      '<div class="row-flex"><button class="btn-good">Guardar</button><button type="button" class="btn-2" data-close>Cancelar</button></div></form>', { noFocus: true }); };
  A.tareaMandar = async (id) => { const x = byId(id); if (!x) return; const txt = A.tareaTexto(x), nf = (x.fotos || []).length;
    A._tarShare = null;
    A.modal('Mandar tarea' + (x.para ? ' a ' + x.para : ''), '<textarea readonly id="tarTxt" rows="7">' + esc(txt) + '</textarea>' +
      (nf ? '<div id="tarFotosBox" class="small muted" style="margin:10px 0">Cargando ' + nf + ' foto' + (nf === 1 ? '' : 's') + '…</div>' : '') +
      '<div class="row-flex" style="margin-top:10px">' + (nf ? '<button type="button" class="btn-wa" data-act="tar-share" id="tarShareBtn" hidden>Compartir con las fotos</button>' : '') + '<button type="button" class="' + (nf ? 'btn-2' : 'btn-wa') + '" data-act="tar-wa" data-id="' + esc(id) + '">WhatsApp' + (x.tel ? ' a ' + esc(A.first(x.para || x.tel)) : '') + (nf ? ' (solo texto)' : '') + '</button><button type="button" class="btn-2" data-act="tar-copy2" data-id="' + esc(id) + '">Copiar texto</button></div>' +
      (nf ? '<p class="small muted" style="margin-top:8px">Desde el celu, <b>Compartir con las fotos</b> te deja elegir WhatsApp y el contacto: le llega el texto con las fotos. Desde la compu, descargá las fotos y arrastralas al chat.</p>' : ''), { noFocus: true });
    if (!nf) return;
    try { const fotos = await bajar(id), box = A.$('#tarFotosBox'); if (!box) return;
      box.innerHTML = '<div class="tar-th big">' + fotos.map((f, i) => '<a href="' + esc(f.data) + '" download="tarea-' + (i + 1) + '.jpg" title="Descargar"><img src="' + esc(f.data) + '" alt=""></a>').join('') + '</div><div class="row-flex" style="margin-top:6px">' + fotos.map((f, i) => '<a class="btn btn-2 btn-sm" href="' + esc(f.data) + '" download="tarea-' + (i + 1) + '.jpg">⬇ Foto ' + (i + 1) + '</a>').join('') + '</div>';
      const files = fotos.map(toFile), s = { text: txt, files };
      if (A.esCelu && A.esCelu() && navigator.canShare && navigator.canShare(s)) { A._tarShare = s; const btn = A.$('#tarShareBtn'); if (btn) btn.hidden = false; }
    } catch (e) { const box = A.$('#tarFotosBox'); if (box) box.innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; }
  };
  A.tareaFotos = async (id) => { const x = byId(id); if (!x) return; A.modal('Fotos · ' + x.t.slice(0, 50), '<div id="tarVer" class="small muted">Cargando…</div>', { wide: true, noFocus: true });
    try { const fotos = await bajar(id), el = A.$('#tarVer'); if (el) el.innerHTML = '<div class="tar-full">' + fotos.map((f, i) => '<figure><img src="' + esc(f.data) + '" alt=""><a class="btn btn-2 btn-sm" href="' + esc(f.data) + '" download="tarea-' + (i + 1) + '.jpg">⬇ Descargar</a></figure>').join('') + '</div>'; }
    catch (e) { const el = A.$('#tarVer'); if (el) el.innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; } };
})();
