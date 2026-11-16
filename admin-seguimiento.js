/* ICLUB · Seguimiento: todo lo que hay que hacer con la gente, en un solo lugar.
   - Postventa: mensajes después de la compra (a los 3 días para ver cómo va y a los 2 meses para que recomiende).
     Se arman solos con el nombre y el equipo; un toque abre WhatsApp. No se repiten. Los textos y días se cambian en Ajustes.
   - Cobranza (recordatorios y atrasados), Consultas (Plan canje y ahorro), Oportunidades y Agenda (lo que anotás vos).
   db.panel.postventa = { 'ventaId|k': { st:'sent'|'skip', at, nota } } · db.panel.agenda = [{ id, phone, name, nota, f, done }] */
(function () {
  'use strict';
  const A = window.ICA, M = window.ICLUBMetrics; const { esc } = A;
  const DEF = [
    { k: 'p3', d: 3, t: '¿Cómo vas?', txt: 'Hola {nombre}! Soy Leo de iClub 👋 ¿Cómo vas con tu {equipo}? Si te surge cualquier duda, escribime y te ayudo 🙌' },
    { k: 'p60', d: 60, t: 'Que te recomiende', txt: 'Hola {nombre}! Espero que sigas disfrutando tu {equipo} 😊 Si conocés a alguien que quiera un iPhone, pasale tu código {codigo}: él tiene un descuento y vos sumás beneficio en tu próxima compra 🎁' }];
  const cfg = () => { const c = (A.db.settings && A.db.settings.postventa) || {}; const pasos = (c.pasos && c.pasos.length ? c.pasos : DEF).filter((p) => p.k !== 'p25' && !/\{garantia\}/.test(p.txt || '')); return { on: c.on !== false, pasos: pasos.length ? pasos : DEF, desde: c.desde || null }; };
  const pv = () => ((A.db.panel || {}).postventa) || {};
  const dayMs = 864e5, sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const codigo = (name, phone) => (String(name || '').split(' ')[0].normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase() || 'ICLUB') + String(phone || '').slice(-4);
  const fmt = (d) => d.toLocaleDateString('es-AR');

  /* Mensajes de postventa que tocan hoy (o están pendientes de los últimos días). */
  A.postventa = (today) => {
    const c = cfg(); if (!c.on) return []; const hoy = sod(today || new Date()), done = pv(), desde = c.desde ? sod(new Date(c.desde)) : null, out = [];
    for (const s of A.db.ventas || []) {
      if (s.devolucion || s.sinStats || !s.clientKey) continue; const f = M.parseDate(s.fecha); if (!f) continue; const cl = A.db.clients[s.clientKey] || {}, name = cl.name || (s.clientSnapshot && s.clientSnapshot.name) || '';
      const equipo = ((s.itemSnapshot && s.itemSnapshot.name) || s.name || 'equipo');
      for (const p of c.pasos) {
        const due = new Date(sod(f).getTime() + p.d * dayMs), key = s.id + '|' + p.k; if (done[key] || due > hoy) continue;
        if (desde && due < new Date(desde.getTime() - 3 * dayMs)) continue; /* no llenar con ventas viejas al activarlo */
        if ((hoy - due) / dayMs > 20) continue; /* si pasó mucho, ya no tiene sentido */
        const gar = new Date(sod(f).getTime() + 30 * dayMs), first = String(name).split(' ')[0] || '';
        if (/\{garantia\}/.test(p.txt) && hoy > gar) continue; /* la garantía ya venció: ese mensaje ya no va */
        out.push({ key, venta: s, phone: s.clientKey, name, equipo, paso: p, due, text: String(p.txt).replace(/\{nombre\}/g, first).replace(/\{equipo\}/g, equipo).replace(/\{garantia\}/g, fmt(gar)).replace(/\{codigo\}/g, codigo(name, s.clientKey)) });
      }
    }
    return out.sort((a, b) => a.due - b.due);
  };
  const agenda = () => (((A.db.panel || {}).agenda) || []).filter((x) => !x.done).sort((a, b) => (M.parseDate(a.f) || 0) - (M.parseDate(b.f) || 0));
  const agendaHoy = () => { const hoy = sod(new Date()); return agenda().filter((x) => { const d = M.parseDate(x.f); return !d || d <= hoy; }); };
  A.seguimientoCount = () => { let n = 0; try { n += A.postventa().length + agendaHoy().length + (A.reminders ? A.reminders().length : 0); } catch (_) {} return n; };

  const savePanel = (fn, msg) => A.act(async () => { const next = A.clone(A.db); next.panel = Object.assign({}, next.panel || {}); const desc = fn(next.panel, next); await A.saveDb(next, desc); A.render(); }, msg);
  const card = (title, sub, body, n) => '<div class="card seg-card"><div class="card-head"><div><h2>' + title + (n != null ? ' <span class="seg-n">' + n + '</span>' : '') + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div></div>' + body + '</div>';
  const widget = (k) => { const w = A.widgetDef && A.widgetDef(k); if (!w) return ''; try { return '<div class="card seg-card">' + w.fn() + '</div>'; } catch (_) { return ''; } };

  const pvList = (list) => list.length ? '<div class="list">' + list.map((x) => '<div class="item"><div class="grow"><div class="main-t">' + esc(x.name) + ' <span class="chip info">' + esc(x.paso.t) + '</span></div><div class="sub-t">' + esc(x.equipo) + ' · compró el ' + esc(x.venta.fecha) + ' · ' + (sod(new Date()) - x.due < dayMs ? 'toca hoy' : 'tocaba el ' + fmt(x.due)) + '</div><div class="seg-msg">' + esc(x.text) + '</div></div><div class="seg-acts"><a class="btn-sm btn-wa" target="_blank" rel="noopener" data-act="pv-send" data-key="' + esc(x.key) + '" href="' + A.waLink(x.phone, x.text) + '">Enviar por WhatsApp</a><button class="btn-sm btn-2" data-act="pv-skip" data-key="' + esc(x.key) + '">No enviar</button></div></div>').join('') + '</div>' : '<div class="empty" style="padding:18px">No hay mensajes de postventa para hoy. 👌</div>';
  const agList = (list) => '<form id="agForm" class="grid g4" style="align-items:end;margin-bottom:10px"><label class="f">Persona<input name="name" required maxlength="60" list="agClients" placeholder="Nombre"></label><label class="f">Celular<input name="phone" inputmode="tel" maxlength="20"></label><label class="f">Qué hacer<input name="nota" required maxlength="120" placeholder="Ej: cobra el 20, volver a escribirle"></label><label class="f">Cuándo<input name="f" type="date" required></label><datalist id="agClients">' + Object.entries(A.db.clients || {}).slice(0, 400).map(([ph, c]) => '<option value="' + esc(c.name || '') + '" data-ph="' + esc(ph) + '">').join('') + '</datalist><button class="btn-brand" style="grid-column:1/-1;justify-self:start">+ Anotar</button></form>' +
    (list.length ? '<div class="list">' + list.map((x) => { const d = M.parseDate(x.f), venc = d && d <= sod(new Date()); return '<div class="item"><div class="grow"><div class="main-t">' + esc(x.name) + (venc ? ' <span class="chip warn">Hoy</span>' : '') + '</div><div class="sub-t">' + esc(x.f) + ' · ' + esc(x.nota) + '</div></div><div class="seg-acts">' + (x.phone ? '<a class="btn-sm btn-wa" target="_blank" rel="noopener" href="' + A.waLink(x.phone, 'Hola ' + String(x.name).split(' ')[0] + '! ') + '">WhatsApp</a>' : '') + '<button class="btn-sm btn-good" data-act="ag-done" data-id="' + esc(x.id) + '">Hecho</button></div></div>'; }).join('') + '</div>' : '<div class="empty" style="padding:14px">Nada anotado.</div>');

  const TABS = [['hoy', 'Hoy'], ['postventa', 'Postventa'], ['cobranza', 'Cobranza'], ['consultas', 'Consultas'], ['oportunidades', 'Oportunidades'], ['agenda', 'Agenda']];
  A.extra = A.extra || {};
  A.extra.seguimiento = () => {
    const tab = A.ui.segTab || 'hoy', pvl = A.postventa(), rem = A.reminders ? A.reminders() : [], agh = agendaHoy(), cnt = { hoy: pvl.length + rem.length + agh.length, postventa: pvl.length, cobranza: rem.length, agenda: agenda().length };
    const tabs = '<div class="seg-tabs">' + TABS.map(([k, l]) => '<button class="' + (k === tab ? 'on' : '') + '" data-act="seg-tab" data-k="' + k + '">' + l + (cnt[k] ? ' <b>' + cnt[k] + '</b>' : '') + '</button>').join('') + '</div>';
    let body = '';
    if (tab === 'hoy') body = (cnt.hoy ? '' : '<div class="card"><div class="empty" style="padding:24px">Hoy no hay nada pendiente. 🎉</div></div>') + (pvl.length ? card('Postventa', 'Mensajes para saber cómo les va a los que compraron.', pvList(pvl), pvl.length) : '') + (rem.length ? widget('recordatorios') : '') + (agh.length ? card('Agenda de hoy', '', agList(agh).replace(/<form[\s\S]*?<\/form>/, ''), agh.length) : '') + widget('atrasados');
    else if (tab === 'postventa') body = card('Postventa', 'Se arman solos: a los ' + cfg().pasos.map((p) => p.d).join(', ') + ' días de cada compra. Tocá "Enviar" y se abre WhatsApp con el mensaje listo. Cada uno aparece una sola vez. Los textos se cambian en Ajustes.', pvList(pvl), pvl.length);
    else if (tab === 'cobranza') body = widget('recordatorios') + widget('atrasados') + widget('proximos');
    else if (tab === 'consultas') body = widget('consultas') + widget('interesados');
    else if (tab === 'oportunidades') body = widget('oportunidades') + widget('ahorros');
    else body = card('Agenda', 'Anotá a quién tenés que escribirle y cuándo. Ese día te aparece en "Hoy".', agList(agenda()));
    return '<div class="page-head"><div><h1>Seguimiento</h1><p>Postventa, cobranza, consultas y tu agenda, todo en un lugar</p></div></div>' + tabs + '<div class="seg-body">' + body + '</div>';
  };

  /* Ajustes → textos de postventa */
  A.postventaCard = () => { const c = cfg(); return '<div class="card"><div class="card-head"><div><h2>Mensajes de postventa</h2><p>Se usan en Seguimiento. Podés usar {nombre}, {equipo} y {codigo} (su código de referido).</p></div></div><form id="pvForm" class="grid">' + c.pasos.map((p, i) => '<div class="grid" style="grid-template-columns:110px 1fr;gap:8px;align-items:start"><label class="f">A los días<input name="d' + i + '" inputmode="numeric" value="' + esc(p.d) + '"></label><label class="f">' + esc(p.t) + '<textarea name="t' + i + '" rows="2">' + esc(p.txt) + '</textarea></label></div>').join('') + '<label class="check"><input type="checkbox" name="on" ' + (c.on ? 'checked' : '') + '> Activar mensajes de postventa</label><button class="btn-brand">Guardar mensajes</button></form></div>'; };

  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act="seg-tab"],[data-act="pv-send"],[data-act="pv-skip"],[data-act="ag-done"]'); if (!b) return; const act = b.dataset.act;
    if (act === 'seg-tab') { ev.preventDefault(); A.ui.segTab = b.dataset.k; A.render(); return; }
    if (act === 'pv-send') { const key = b.dataset.key; setTimeout(() => savePanel((p) => { p.postventa = Object.assign({}, p.postventa || {}, { [key]: { st: 'sent', at: new Date().toISOString(), by: (A.me && A.me.name) || '' } }); return 'Postventa enviada: ' + key; }, 'Listo, marcado como enviado.'), 300); return; }
    ev.preventDefault();
    if (act === 'pv-skip') savePanel((p) => { p.postventa = Object.assign({}, p.postventa || {}, { [b.dataset.key]: { st: 'skip', at: new Date().toISOString() } }); return 'Postventa omitida: ' + b.dataset.key; }, 'No se envía.');
    else if (act === 'ag-done') savePanel((p) => { p.agenda = (p.agenda || []).map((x) => x.id === b.dataset.id ? Object.assign({}, x, { done: new Date().toISOString() }) : x); return 'Agenda: hecho'; }, 'Hecho.');
  });
  document.addEventListener('change', (ev) => { const f = ev.target.form; if (!f || f.id !== 'agForm' || ev.target.name !== 'name') return; const o = [...f.querySelectorAll('#agClients option')].find((x) => x.value === ev.target.value); if (o && !f.elements.phone.value) f.elements.phone.value = o.dataset.ph; });
  document.addEventListener('submit', (ev) => {
    const f = ev.target;
    if (f.id === 'agForm') { const e = f.elements, d = e.f.value.split('-'); savePanel((p) => { p.agenda = (p.agenda || []).concat([{ id: A.uid(), name: e.name.value.trim().slice(0, 60), phone: String(e.phone.value || '').replace(/\D/g, ''), nota: e.nota.value.trim().slice(0, 120), f: d.length === 3 ? d[2] + '/' + d[1] + '/' + d[0] : A.today(), at: new Date().toISOString() }]); return 'Agenda: ' + e.name.value.trim(); }, 'Anotado.'); }
    else if (f.id === 'pvForm') { const c = cfg(), pasos = c.pasos.map((p, i) => Object.assign({}, p, { d: Math.max(1, Math.round(A.num(f.elements['d' + i].value) || p.d)), txt: f.elements['t' + i].value.trim().slice(0, 500) || p.txt })); A.saveSettings({ postventa: { on: f.elements.on.checked, pasos, desde: c.desde || new Date().toISOString() } }, 'Mensajes de postventa guardados.'); }
  });
  /* Al primer uso, guarda desde cuándo está activo (así no aparecen todas las ventas viejas). */
  const markDesde = () => { if (!A.db || !A.db.settings || (A.db.settings.postventa && A.db.settings.postventa.desde) || !(A.isAdmin && A.isAdmin())) return; A.db.settings.postventa = Object.assign({}, A.db.settings.postventa || {}, { desde: new Date().toISOString() }); };
  const nav = () => { const el = A.$('#navSeg'); if (!el) return; const n = A.seguimientoCount(); el.textContent = n ? String(n) : ''; el.hidden = !n; };
  const r0 = A.render; A.render = (...a) => { try { markDesde(); } catch (_) {} const out = r0.apply(null, a); try { nav(); } catch (_) {} return out; };
  if (A.registerWidget) A.registerWidget('seguimientoHoy', { t: 'Seguimiento de hoy', s: 4, fn: () => { const pvl = A.postventa(), ag = agendaHoy(), rem = A.reminders ? A.reminders() : []; return '<div class="card-head"><h2>Seguimiento de hoy</h2><div class="spacer"></div><a class="small" href="#seguimiento">Ver</a></div><div class="sum-line"><span>Mensajes de postventa</span><b>' + pvl.length + '</b></div><div class="sum-line"><span>Recordatorios de cuotas</span><b>' + rem.length + '</b></div><div class="sum-line"><span>Agenda</span><b>' + ag.length + '</b></div>'; } }, true);
})();
