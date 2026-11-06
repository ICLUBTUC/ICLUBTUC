/* ICLUB · Cobranza inteligente (solo panel):
   - Puntaje del cliente (se calcula en el momento, nunca se guarda ni lo ve el cliente).
   - Recordatorios 0 invasivos: un único aviso amable por cuota, antes del vencimiento, solo a quien suele atrasarse.
   - Oportunidades: clientes buenos que terminan (o terminaron) de pagar → ofrecer renovar. */
(function () {
  'use strict';
  const A = window.ICA, P = window.ICLUBCollectionPlan, M = window.ICLUBMetrics; const { esc, ars, chip } = A;
  const DAY = 86400000, GRACE = 3;
  const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const fmt = (d) => d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const productOf = (pm) => pm.prodName || String(pm.det || pm.doc).split(' · ')[0];
  const plans = (c) => (c.movs || []).filter((m) => m.tipo === 'Compra' && m.finan && !m.finan.cancelada);
  const panel = () => A.db.panel || {};

  /* ===================== PUNTAJE ===================== */
  const LABELS = [[85, 'Excelente', 'good'], [70, 'Bueno', 'info'], [50, 'Regular', 'warn'], [0, 'Riesgoso', 'bad']];
  const memo = new WeakMap();
  A.score = (phone, today) => { if (today) return scoreRaw(phone, today); let m = memo.get(A.db); const k = M.iso(new Date()); if (!m || m.k !== k) { m = { k, v: new Map() }; memo.set(A.db, m); } if (!m.v.has(phone)) m.v.set(phone, scoreRaw(phone)); return m.v.get(phone); };
  const scoreRaw = (phone, today) => {
    const c = A.db.clients[phone]; if (!c) return null; today = sod(today || new Date());
    let n = 0, onTime = 0, lateN = 0, lateSum = 0, overdueMax = 0, overdueN = 0, done = 0, active = 0;
    plans(c).forEach((pm) => {
      const pc = P._planCalc(c, pm); if (pc.pendiente > 0.005) active++; else done++;
      pc.cuotas.forEach((q) => {
        if (!q.dt || q.cancelada) return; const due = sod(q.dt);
        if (due > today) { if (q.done) { n++; onTime++; } return; }
        if (q.done) { const pd = (q.pay && P._parseDate(q.pay.f)) || due; const late = Math.round((sod(pd) - due) / DAY); n++; if (late <= GRACE) onTime++; else { lateN++; lateSum += late; } return; }
        const late = Math.round((today - due) / DAY); if (late <= GRACE) return;
        n++; lateN++; lateSum += late; overdueN++; overdueMax = Math.max(overdueMax, late);
      });
    });
    const devol = (A.db.ventas || []).filter((v) => v.clientKey === phone && v.devolucion).length;
    const base = { n, onTime, lateN, avg: lateN ? Math.round(lateSum / lateN) : 0, overdueN, overdueMax, done, active, devol };
    if (n < 2 && !done && !overdueN) return Object.assign(base, { score: null, label: 'Sin historial', tone: 'muted', reasons: ['Todavía no tiene cuotas vencidas para evaluar.'] });
    const rate = n ? onTime / n : 1;
    let s = 100 * rate - Math.min(25, base.avg * 0.8) - (overdueMax ? Math.min(30, 8 + overdueMax * 0.6) : 0) + Math.min(10, done * 5) - devol * 5;
    s = Math.max(0, Math.min(100, Math.round(s))); const [, label, tone] = LABELS.find(([min]) => s >= min);
    const reasons = [Math.round(rate * 100) + '% de sus cuotas pagadas a tiempo (' + onTime + ' de ' + n + ')'];
    if (lateN) reasons.push('Cuando se atrasa, lo hace ' + base.avg + ' días en promedio');
    if (overdueN) reasons.push('Hoy tiene ' + overdueN + ' cuota' + (overdueN > 1 ? 's' : '') + ' vencida' + (overdueN > 1 ? 's' : '') + ' (la más vieja, ' + overdueMax + ' días)');
    if (done) reasons.push('Terminó de pagar ' + done + ' plan' + (done > 1 ? 'es' : ''));
    if (devol) reasons.push(devol + ' devolución' + (devol > 1 ? 'es' : ''));
    return Object.assign(base, { score: s, label, tone, reasons });
  };
  A.scoreSuggest = (sc) => ({ Excelente: 'Muy buen pagador: podés financiarle sin adelanto mínimo y hasta 12 cuotas.', Bueno: 'Buen pagador: sugerido adelanto desde 20% y hasta 9 cuotas.', Regular: 'Se atrasa seguido: sugerido adelanto desde 30% y hasta 6 cuotas.', Riesgoso: 'Alto riesgo: sugerido adelanto desde 50% y hasta 3 cuotas, o solo contado.', 'Sin historial': 'Cliente nuevo: sugerido adelanto desde 30% y hasta 6 cuotas.' })[sc.label] || '';
  A.scoreChip = (sc) => (sc ? chip(sc.score == null ? 'Sin historial' : sc.label + ' · ' + sc.score, sc.tone) : '');

  /* ===================== RECORDATORIOS ===================== */
  const remCfg = () => Object.assign({ dias: 1, nuevos: true, texto: 'Hola {nombre}! Te recordamos que {cuando} vence tu cuota {cuota} de {producto}: {importe}. Si ya la pagaste, ignorá este mensaje. ¡Gracias! ICLUB' }, (A.db.settings && A.db.settings.recordatorios) || {});
  A.remCfg = remCfg;
  const cuando = (due, today) => { const d = Math.round((due - today) / DAY); return d === 0 ? 'hoy' : d === 1 ? 'mañana' : 'el ' + due.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'numeric' }); };
  A.reminders = (today) => {
    today = sod(today || new Date()); const cfg = remCfg(), lim = new Date(today.getTime() + Math.max(0, Number(cfg.dias) || 0) * DAY), sent = panel().recordados || {}, out = [];
    for (const [phone, c] of Object.entries(A.db.clients || {})) {
      if (c.noRecordar || c.blocked === true || c.blocked === 'true') continue;
      const sc = A.score(phone, today); if (sc.label === 'Excelente' || sc.label === 'Bueno') continue; if (sc.score == null && !cfg.nuevos) continue;
      if ((c.movs || []).some((m) => m.tipo === 'Pago' && m.f === fmt(today))) continue;
      const items = [];
      plans(c).forEach((pm) => { const pc = P._planCalc(c, pm); pc.cuotas.forEach((q) => {
        if (q.done || !q.dt || q.paid > 0.005) return; const due = sod(q.dt); if (due < today || due > lim) return;
        const key = phone + '|' + pm.doc + '|' + q.n; if (sent[key]) return; items.push({ key, pm, q, n: pc.n, falta: M.r2(q.req - q.paid), due });
      }); });
      if (items.length) out.push({ phone, c, sc, items, due: Math.min(...items.map((i) => +i.due)) });
    }
    return out.sort((a, b) => a.due - b.due || String(a.c.name).localeCompare(String(b.c.name)));
  };
  A.remText = (r, today) => {
    today = sod(today || new Date()); const it = r.items, first = String(r.c.name || '').split(' ')[0] || 'cliente';
    const v = { nombre: first, cuando: cuando(it[0].due, today), cuota: it.map((i) => i.q.n + ' de ' + i.n).join(' y '), producto: [...new Set(it.map((i) => productOf(i.pm)))].join(' y '), importe: ars(it.reduce((a, i) => a + i.falta, 0)) };
    let t = remCfg().texto.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)); const al = A.db.settings && A.db.settings.biz && A.db.settings.biz.alias || 'ICLUBTUC'; if (!/alias/i.test(t)) t += '\nAlias: ' + al;
    return t;
  };
  const mark = (store, keys, val) => A.act(async () => {
    const next = A.clone(A.db); next.panel = next.panel || {}; const map = Object.assign({}, next.panel[store] || {}); const cut = Date.now() - 200 * DAY;
    Object.keys(map).forEach((k) => { if (Date.parse(map[k].at) < cut) delete map[k]; }); keys.forEach((k) => { map[k] = Object.assign({ at: new Date().toISOString() }, val); }); next.panel[store] = map;
    await A.saveDb(next, store === 'recordados' ? 'Recordatorio ' + val.how : 'Oportunidad: ' + val.estado); A._keepScroll = true; A.render();
  });
  A.remSend = (phone) => { const r = A.reminders().find((x) => x.phone === phone); if (!r) return; window.open(A.waLink(phone, A.remText(r)), '_blank', 'noopener'); mark('recordados', r.items.map((i) => i.key), { how: 'enviado' }); };
  A.remSkip = (phone) => { const r = A.reminders().find((x) => x.phone === phone); if (r) mark('recordados', r.items.map((i) => i.key), { how: 'no enviado' }); };
  function wRecordatorios() {
    const list = A.reminders(), today = sod(new Date());
    return '<div class="card-head" style="margin-bottom:6px"><h2>Recordatorios de hoy</h2><div class="spacer"></div><a class="small" href="#ajustes">Ajustar</a></div><p class="tiny muted" style="margin:0 0 8px">Un solo aviso amable por cuota, antes de que venza. No incluye a los que pagan a tiempo.</p><div class="list">' +
      (list.length ? list.map((r) => '<div class="item"><div class="grow"><a class="strong" style="color:inherit;text-decoration:none" href="#cliente/' + encodeURIComponent(r.phone) + '">' + esc(r.c.name || r.phone) + '</a> ' + A.scoreChip(r.sc) + '<div class="sub-t">' + esc(cuando(r.items[0].due, today)) + ' · ' + r.items.map((i) => 'cuota ' + i.q.n + '/' + i.n).join(', ') + ' · ' + esc(productOf(r.items[0].pm)) + '</div></div><b>' + ars(r.items.reduce((a, i) => a + i.falta, 0)) + '</b><button class="btn-sm btn-wa" data-act="rem-send" data-phone="' + esc(r.phone) + '">Enviar</button><button class="btn-sm btn-2" data-act="rem-skip" data-phone="' + esc(r.phone) + '" title="No mandar este aviso">No</button></div>').join('') : '<div class="empty" style="padding:14px 6px">Hoy no hay recordatorios para mandar.</div>') + '</div>';
  }

  /* ===================== OPORTUNIDADES ===================== */
  const opCfg = () => Object.assign({ dias: 30, texto: 'Hola {nombre}! {estado} tu {producto}. Por ser cliente ICLUB que paga al día, tenés prioridad para renovar: entregás tu equipo como parte de pago y te llevás uno nuevo en cuotas. ¿Querés que te pase opciones?' }, (A.db.settings && A.db.settings.oportunidades) || {});
  A.opCfg = opCfg;
  A.opportunities = (today) => {
    today = sod(today || new Date()); const cfg = opCfg(), st = panel().oportunidades || {}, out = [];
    for (const [phone, c] of Object.entries(A.db.clients || {})) {
      if (c.blocked === true || c.blocked === 'true') continue; const sc = A.score(phone, today); if (sc.label !== 'Excelente' && sc.label !== 'Bueno') continue;
      const s0 = st[phone]; if (s0) { const age = (today - sod(new Date(s0.at))) / DAY; if (s0.estado === 'no' && age < 180) continue; if (s0.estado === 'contactado' && age < 60) continue; if (s0.estado === 'después' && age < 30) continue; }
      const compras = (c.movs || []).filter((m) => m.tipo === 'Compra'); const lastBuy = compras.reduce((a, m) => Math.max(a, +(P._parseDate(m.f) || 0)), 0);
      let best = null;
      plans(c).forEach((pm) => {
        const pc = P._planCalc(c, pm), last = pc.cuotas[pc.cuotas.length - 1]; if (!last || !last.dt) return; const end = sod(last.dt), restan = pc.cuotas.filter((q) => !q.done).length;
        const finished = pc.pendiente <= 0.005, finDate = finished ? sod((last.pay && P._parseDate(last.pay.f)) || end) : end;
        if (finished) { if ((today - finDate) / DAY > 120 || lastBuy > +(P._parseDate(pm.f) || 0)) return; }
        else if (!(restan <= 1 || (end - today) / DAY <= cfg.dias)) return;
        const meses = Math.max(0, Math.round((today - (P._parseDate(pm.f) || today)) / (30.4 * DAY)));
        const o = { pm, pc, finished, finDate, restan, meses }; if (!best || +finDate < +best.finDate) best = o;
      });
      if (best) out.push(Object.assign({ phone, c, sc }, best));
    }
    return out.sort((a, b) => (b.sc.score || 0) - (a.sc.score || 0) || a.finDate - b.finDate);
  };
  A.opText = (o) => { const first = String(o.c.name || '').split(' ')[0] || 'cliente'; const v = { nombre: first, estado: o.finished ? 'Terminaste de pagar' : 'Estás por terminar de pagar', producto: productOf(o.pm), meses: String(o.meses) }; return opCfg().texto.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)); };
  A.opStats = () => { const st = panel().oportunidades || {}; const contactados = Object.entries(st).filter(([, v]) => v.estado === 'contactado'); const ganadas = contactados.filter(([ph, v]) => ((A.db.clients[ph] || {}).movs || []).some((m) => m.tipo === 'Compra' && +(P._parseDate(m.f) || 0) >= +sod(new Date(v.at)))); return { contactados: contactados.length, ganadas: ganadas.length }; };
  A.opSend = (phone) => { const o = A.opportunities().find((x) => x.phone === phone); if (!o) return; window.open(A.waLink(phone, A.opText(o)), '_blank', 'noopener'); mark('oportunidades', [phone], { estado: 'contactado', doc: o.pm.doc }); };
  A.opLater = (phone) => mark('oportunidades', [phone], { estado: 'después' });
  A.opNo = (phone) => mark('oportunidades', [phone], { estado: 'no' });
  function wOportunidades() {
    const list = A.opportunities(), stt = A.opStats();
    return '<div class="card-head" style="margin-bottom:6px"><h2>Oportunidades de venta</h2><div class="spacer"></div><span class="small muted">' + stt.contactados + ' contactados · ' + stt.ganadas + ' compraron</span></div><p class="tiny muted" style="margin:0 0 8px">Buenos pagadores que terminan (o terminaron) de pagar: el mejor momento para ofrecer renovar.</p><div class="list">' +
      (list.length ? list.slice(0, 8).map((o) => '<div class="item"><div class="grow"><a class="strong" style="color:inherit;text-decoration:none" href="#cliente/' + encodeURIComponent(o.phone) + '">' + esc(o.c.name || o.phone) + '</a> ' + A.scoreChip(o.sc) + '<div class="sub-t">' + esc(productOf(o.pm)) + ' · ' + (o.finished ? 'terminó de pagar el ' + fmt(o.finDate) : (o.restan === 1 ? 'le falta 1 cuota' : 'le faltan ' + o.restan + ' cuotas') + ' · termina el ' + fmt(o.finDate)) + ' · comprado hace ' + o.meses + (o.meses === 1 ? ' mes' : ' meses') + '</div></div><button class="btn-sm btn-wa" data-act="op-send" data-phone="' + esc(o.phone) + '">Ofrecer</button><button class="btn-sm btn-2" data-act="op-later" data-phone="' + esc(o.phone) + '" title="Volver a mostrar en 30 días">Después</button><button class="btn-sm btn-2" data-act="op-no" data-phone="' + esc(o.phone) + '" title="No ofrecer por 6 meses">No</button></div>').join('') : '<div class="empty" style="padding:14px 6px">Por ahora no hay clientes para ofrecer renovar.</div>') + '</div>';
  }

  /* ===================== FICHA: tarjeta de puntaje ===================== */
  A.scoreCard = (phone) => {
    const sc = A.score(phone), c = A.db.clients[phone]; if (!sc) return '';
    const bar = sc.score == null ? '' : '<div style="height:8px;border-radius:6px;background:var(--line,#e5e7eb);margin:10px 0 6px"><div style="height:8px;border-radius:6px;width:' + sc.score + '%;background:var(--' + ({ good: 'good', info: 'brand', warn: 'warn', bad: 'bad' })[sc.tone] + ',#0a84ff)"></div></div>';
    return '<div class="card"><div class="card-head"><div><h2>Puntaje del cliente ' + A.scoreChip(sc) + '</h2><p>Solo lo ves vos. No aparece en el portal, los PDF ni los mensajes.</p></div></div>' + bar + '<ul class="small" style="margin:6px 0 8px 18px">' + sc.reasons.map((r) => '<li>' + esc(r) + '</li>').join('') + '</ul><p class="small"><b>Sugerencia para financiar:</b> ' + esc(A.scoreSuggest(sc)) + '</p>' +
      '<label class="check" style="margin-top:8px"><input type="checkbox" data-act-norec="' + esc(phone) + '" ' + (c.noRecordar ? 'checked' : '') + '> No enviarle recordatorios</label></div>';
  };
  A.setNoRec = (phone, on) => A.act(async () => { const next = A.clone(A.db); if (on) next.clients[phone].noRecordar = true; else delete next.clients[phone].noRecordar; await A.saveDb(next, 'Recordatorios de ' + (next.clients[phone].name || phone) + (on ? ' pausados' : ' activados')); A._keepScroll = true; A.render(); }, on ? 'No le llegarán recordatorios.' : 'Recordatorios activados.');

  /* ===================== AJUSTES ===================== */
  A.cobranzaSettings = () => {
    const r = remCfg(), o = opCfg();
    return '<div class="card"><div class="card-head"><div><h2>Recordatorios y oportunidades</h2><p>Cómo y cuándo te armamos los mensajes. Vos decidís si los mandás.</p></div></div><form id="cobranzaForm" class="grid"><div class="grid g2"><label class="f">Avisar antes del vencimiento<select name="dias">' + [[0, 'El mismo día'], [1, '1 día antes'], [2, '2 días antes'], [3, '3 días antes']].map(([v, l]) => '<option value="' + v + '" ' + (Number(r.dias) === v ? 'selected' : '') + '>' + l + '</option>').join('') + '</select></label><label class="f">Ofrecer renovar cuando falten<select name="opDias">' + [[15, '15 días o menos'], [30, '30 días o menos'], [60, '60 días o menos']].map(([v, l]) => '<option value="' + v + '" ' + (Number(o.dias) === v ? 'selected' : '') + '>' + l + '</option>').join('') + '</select></label></div>' +
      '<label class="check"><input type="checkbox" name="nuevos" ' + (r.nuevos ? 'checked' : '') + '> Incluir clientes nuevos (sin historial de pagos)</label>' +
      '<label class="f">Mensaje del recordatorio<textarea name="texto" rows="3" maxlength="400">' + esc(r.texto) + '</textarea><small>Podés usar {nombre}, {cuando}, {cuota}, {producto} e {importe}.</small></label>' +
      '<label class="f">Mensaje para ofrecer renovar<textarea name="opTexto" rows="3" maxlength="400">' + esc(o.texto) + '</textarea><small>Podés usar {nombre}, {estado}, {producto} y {meses}.</small></label><button class="btn-good">Guardar</button></form></div>';
  };
  A.saveCobranza = (f) => { const e = f.elements; A.saveSettings({ recordatorios: { dias: Number(e.dias.value), nuevos: e.nuevos.checked, texto: e.texto.value.trim() || remCfg().texto }, oportunidades: { dias: Number(e.opDias.value), texto: e.opTexto.value.trim() || opCfg().texto } }, 'Recordatorios guardados.'); };

  /* Widgets en el Inicio (aparecen solos la primera vez). */
  if (A.registerWidget) { A.registerWidget('recordatorios', { t: 'Recordatorios de hoy', s: 6, fn: wRecordatorios }, true); A.registerWidget('oportunidades', { t: 'Oportunidades de venta', s: 6, fn: wOportunidades }, true); }
})();
