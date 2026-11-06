/* ICLUB · Cierre de caja con el período que elijas (semanal por defecto, diario, quincenal, mensual o desde el último cierre). */
(function () {
  'use strict';
  const A = window.ICA, M = window.ICLUBMetrics; const { esc, ars } = A; const ui = A.ui;
  Object.assign(ui, { cajaOff: 0 });
  const DAY = 86400000;
  const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const fmt = (d) => d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const parse = (s) => M.parseDate(s);
  const cfg = () => Object.assign({ periodo: 'semanal', inicio: 1 }, (A.db.settings && A.db.settings.cierre) || {});
  const cierres = () => (A.db.cierres || []).slice().sort((a, b) => String(a.hasta).localeCompare(String(b.hasta)));
  const lastCierre = () => { const l = cierres(); return l[l.length - 1] || null; };

  /* Rango del período (off = 0 actual, -1 anterior…). */
  A.cajaRange = (off) => {
    const c = cfg(), today = sod(new Date()); let from, to;
    if (c.periodo === 'diario') { from = new Date(today.getTime() + off * DAY); to = from; }
    else if (c.periodo === 'mensual') { from = new Date(today.getFullYear(), today.getMonth() + off, 1); to = new Date(today.getFullYear(), today.getMonth() + off + 1, 0); }
    else if (c.periodo === 'quincenal') { const half = today.getDate() <= 15 ? 0 : 1, idx = today.getFullYear() * 24 + today.getMonth() * 2 + half + off, y = Math.floor(idx / 24), mo = Math.floor((idx % 24) / 2), h = idx % 2; from = new Date(y, mo, h ? 16 : 1); to = h ? new Date(y, mo + 1, 0) : new Date(y, mo, 15); }
    else if (c.periodo === 'libre') { const l = lastCierre(); from = l ? new Date(sod(parse(l.hasta)).getTime() + DAY) : new Date(today.getTime() - 6 * DAY); to = today; }
    else { const start = Number(c.inicio) || 0, back = (today.getDay() - start + 7) % 7; from = new Date(today.getTime() - back * DAY + off * 7 * DAY); to = new Date(from.getTime() + 6 * DAY); }
    return { from: sod(from), to: sod(to) };
  };
  const inR = (s, r) => { const d = parse(s); return d && sod(d) >= r.from && sod(d) <= r.to; };
  const medioOf = (m) => (m.efec != null ? 'Combinado' : /mercado ?pago/i.test(m.met || '') ? 'Mercado Pago' : /transf/i.test(m.met || '') ? 'Transferencia' : /tarjeta|d[eé]bito|cr[eé]dito/i.test(m.met || '') ? 'Tarjeta' : /efectivo/i.test(m.met || '') || !m.met ? 'Efectivo' : 'Otros');

  /* Cálculo del cierre: todo sale de los movimientos registrados. */
  A.cajaCalc = (r) => {
    const out = { cobros: 0, n: 0, efectivo: 0, transferencia: 0, mp: 0, tarjeta: 0, otros: 0, porCobrador: {}, reintegros: { efectivo: 0, transferencia: 0 }, gastos: { efectivo: 0, transferencia: 0, otros: 0, total: 0, lista: [] }, ajustes: { efectivo: 0, transferencia: 0, lista: [] }, detalle: [] };
    for (const [phone, c] of Object.entries(A.db.clients || {})) for (const m of c.movs || []) {
      if (!inR(m.f, r)) continue;
      if (m.tipo === 'Pago') {
        const imp = Number(m.imp) || 0, med = medioOf(m); out.cobros += imp; out.n++;
        if (med === 'Combinado') { out.efectivo += Number(m.efec) || 0; out.transferencia += Number(m.transf) || 0; } else if (med === 'Efectivo') out.efectivo += imp; else if (med === 'Transferencia') out.transferencia += imp; else if (med === 'Mercado Pago') out.mp += imp; else if (med === 'Tarjeta') out.tarjeta += imp; else out.otros += imp;
        const who = m.by || 'Sin indicar'; out.porCobrador[who] = M.r2((out.porCobrador[who] || 0) + imp);
        out.detalle.push({ f: m.f, cliente: c.name || phone, doc: m.doc || '', medio: med, by: m.by || '', imp });
      } else if (m.tipo === 'Reintegro') { const v = Math.abs(Number(m.imp) || 0); if (/transf/i.test(m.met || '')) out.reintegros.transferencia += v; else out.reintegros.efectivo += v; }
    }
    for (const g of A.db.gastos || []) { if (!inR(g.f, r)) continue; const v = Number(g.monto) || 0, w = String(g.wallet || 'ARS-Efectivo'); out.gastos.total += v; if (/USD/.test(w)) out.gastos.otros += v; else if (/Transf/i.test(w)) out.gastos.transferencia += v; else out.gastos.efectivo += v; out.gastos.lista.push(g); }
    for (const x of A.db.cashEntries || []) { const d = x.at ? sod(new Date(x.at)) : null; if (!d || d < r.from || d > r.to || /^Cobros \/ gastos registrados$/.test(x.reason || '') || /^Reintegro por devolución/.test(x.reason || '') || /^Saldo inicial/i.test(x.reason || '')) continue; if (x.wallet === 'ARS-Efectivo') out.ajustes.efectivo += Number(x.amount) || 0; else if (x.wallet === 'ARS-Transferencia') out.ajustes.transferencia += Number(x.amount) || 0; out.ajustes.lista.push(x); }
    ['cobros', 'efectivo', 'transferencia', 'mp', 'tarjeta', 'otros'].forEach((k) => { out[k] = M.r2(out[k]); });
    out.netoEfectivo = M.r2(out.efectivo - out.reintegros.efectivo - out.gastos.efectivo + out.ajustes.efectivo);
    out.netoTransferencia = M.r2(out.transferencia - out.reintegros.transferencia - out.gastos.transferencia + out.ajustes.transferencia);
    out.detalle.sort((a, b) => (parse(a.f) || 0) - (parse(b.f) || 0));
    return out;
  };
  const yaCerrado = (r) => cierres().find((x) => x.desde === fmt(r.from));

  A.extra.caja = () => {
    const c = cfg(), r = A.cajaRange(c.periodo === 'libre' ? 0 : ui.cajaOff), k = A.cajaCalc(r), prev = cierres().filter((x) => (parse(x.hasta) || 0) < r.from).pop(), cerrado = yaCerrado(r);
    const inicial = cerrado ? cerrado.efectivoInicial : prev ? Number(prev.efectivoContado) || 0 : 0, esperado = M.r2(inicial + k.netoEfectivo);
    const per = { semanal: 'Semana', diario: 'Día', quincenal: 'Quincena', mensual: 'Mes', libre: 'Desde el último cierre' }[c.periodo];
    const kp = (l, v, s, cls) => '<div class="kpi ' + (cls || '') + '"><span class="lbl">' + l + '</span><span class="num">' + v + '</span>' + (s ? '<span class="sub">' + s + '</span>' : '') + '</div>';
    const line = (l, v, cls) => '<div class="sum-line"><span>' + l + '</span><b class="' + (cls || '') + '">' + v + '</b></div>';
    return '<div class="page-head"><div><h1>Cierre de caja</h1><p>' + esc(per) + ' del ' + fmt(r.from) + (r.from - r.to ? ' al ' + fmt(r.to) : '') + (cerrado ? ' · <b class="good">cerrado el ' + new Date(cerrado.at).toLocaleDateString('es-AR') + '</b>' : '') + '</p></div><div class="spacer"></div>' +
      (c.periodo !== 'libre' ? '<button class="btn-2" data-act="caja-off" data-d="-1">← Anterior</button>' + (ui.cajaOff < 0 ? '<button class="btn-2" data-act="caja-off" data-d="1">Siguiente →</button>' : '') : '') + '<button class="btn-2" data-act="caja-pdf">PDF</button></div>' +
      '<div class="card" style="margin-bottom:16px"><form id="cajaCfgForm" class="row-flex"><label class="f" style="margin:0">Tipo de cierre<select name="periodo">' + [['semanal', 'Semanal'], ['diario', 'Diario'], ['quincenal', 'Quincenal'], ['mensual', 'Mensual'], ['libre', 'Desde el último cierre hasta hoy']].map(([v, l]) => '<option value="' + v + '" ' + (c.periodo === v ? 'selected' : '') + '>' + l + '</option>').join('') + '</select></label>' + (c.periodo === 'semanal' ? '<label class="f" style="margin:0">La semana empieza el<select name="inicio">' + ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((d, i) => '<option value="' + i + '" ' + (Number(c.inicio) === i ? 'selected' : '') + '>' + d + '</option>').join('') + '</select></label>' : '') + '<button class="btn-2">Guardar</button></form></div>' +
      '<div class="kpis">' + kp('Cobrado', ars(k.cobros), k.n + ' pagos', 'dark') + kp('Efectivo', ars(k.efectivo), 'cobros en efectivo') + kp('Transferencia', ars(k.transferencia), 'cobros por transferencia') + kp('Gastos', ars(k.gastos.total), k.gastos.lista.length + ' gastos', k.gastos.total ? 'bad' : '') + '</div>' +
      '<div class="grid g2" style="margin-top:16px"><div class="card"><h2>Efectivo</h2><div style="margin-top:8px">' + line('Efectivo al inicio' + (prev && !cerrado ? ' <span class="tiny muted">(lo contado en el cierre anterior)</span>' : ''), ars(inicial)) + line('+ Cobros en efectivo', ars(k.efectivo), 'good') + line('− Gastos en efectivo', ars(k.gastos.efectivo), 'bad') + line('− Reintegros', ars(k.reintegros.efectivo), 'bad') + (k.ajustes.efectivo ? line('± Retiros / ingresos', ars(k.ajustes.efectivo)) : '') + '<div class="sum-line" style="border-top:2px solid var(--ink);margin-top:4px"><span class="strong">Debería haber</span><b class="big-num" style="font-size:22px">' + ars(esperado) + '</b></div></div>' +
      (cerrado ? line('Contaste', ars(cerrado.efectivoContado)) + line('Diferencia', ars(cerrado.diferencia), Math.abs(cerrado.diferencia) < 1 ? 'good' : 'bad') + (cerrado.nota ? '<p class="small muted">' + esc(cerrado.nota) + '</p>' : '') + '<button class="btn-link small" data-act="caja-reopen" data-id="' + esc(cerrado.id) + '">Reabrir este cierre</button>' :
        '<form id="cajaCloseForm" class="grid" style="margin-top:12px" data-inicial="' + inicial + '" data-esperado="' + esperado + '"><label class="f">¿Cuánto efectivo contaste?<input name="contado" inputmode="decimal" placeholder="' + esc(String(esperado)) + '" required></label><p id="cajaDif" class="small muted"></p><label class="f">Nota (opcional)<input name="nota" maxlength="200" placeholder="Ej: faltan $ 2.000 de cambio"></label><button class="btn-good">Cerrar caja</button></form>') + '</div>' +
      '<div class="card"><h2>Otros medios</h2><div style="margin-top:8px">' + line('Transferencias cobradas', ars(k.transferencia)) + line('− Gastos por transferencia', ars(k.gastos.transferencia), 'bad') + line('− Reintegros', ars(k.reintegros.transferencia), 'bad') + line('Neto en banco', ars(k.netoTransferencia), 'strong') + (k.mp ? line('Mercado Pago', ars(k.mp)) : '') + (k.tarjeta ? line('Tarjeta', ars(k.tarjeta)) : '') + (k.otros ? line('Otros', ars(k.otros)) : '') + '</div><h2 style="margin-top:16px">Por quién cobró</h2><div style="margin-top:8px">' + (Object.keys(k.porCobrador).length ? Object.entries(k.porCobrador).sort((a, b) => b[1] - a[1]).map(([w, v]) => line(esc(w), ars(v))).join('') : '<p class="small muted">Sin cobros.</p>') + '</div></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-head"><h2>Detalle de cobros</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Cliente</th><th>Recibo</th><th>Medio</th><th>Cobró</th><th class="num">Importe</th></tr></thead><tbody>' + (k.detalle.length ? k.detalle.map((x) => '<tr><td>' + esc(x.f) + '</td><td>' + esc(x.cliente) + '</td><td class="nowrap">' + esc(x.doc) + '</td><td>' + esc(x.medio) + '</td><td>' + esc(x.by) + '</td><td class="num strong">' + ars(x.imp) + '</td></tr>').join('') : '<tr><td colspan="6" class="muted">Sin cobros en este período.</td></tr>') + '</tbody></table></div>' +
      (k.gastos.lista.length ? '<h3 style="margin-top:14px">Gastos</h3><div class="list">' + k.gastos.lista.map((g) => '<div class="sum-line"><span>' + esc(g.f + ' · ' + g.concepto + ' · ' + g.cat) + '</span><b class="bad">' + ars(g.monto) + '</b></div>').join('') + '</div>' : '') + '</div>' +
      '<div class="card" style="margin-top:16px"><div class="card-head"><h2>Cierres anteriores</h2></div><div class="list">' + (cierres().length ? cierres().slice().reverse().slice(0, 30).map((x) => '<div class="item"><div class="grow"><div class="strong">' + esc(x.desde + (x.desde !== x.hasta ? ' al ' + x.hasta : '')) + '</div><div class="sub-t">Cobrado ' + ars(x.totals.cobros) + ' · efectivo contado ' + ars(x.efectivoContado) + (x.by ? ' · cerró ' + esc(x.by) : '') + '</div></div><b class="' + (Math.abs(x.diferencia) < 1 ? 'good' : 'bad') + '">' + (Math.abs(x.diferencia) < 1 ? 'Sin diferencia' : 'Dif. ' + ars(x.diferencia)) + '</b><button class="btn-sm btn-2" data-act="caja-pdf" data-id="' + esc(x.id) + '">PDF</button></div>').join('') : '<div class="empty" style="padding:14px">Todavía no hiciste ningún cierre.</div>') + '</div></div>';
  };
  A.cajaDif = () => { const f = A.$('#cajaCloseForm'); if (!f) return; const v = A.num(f.elements.contado.value), e = Number(f.dataset.esperado); const o = A.$('#cajaDif'); if (!Number.isFinite(v)) { o.textContent = ''; return; } const d = M.r2(v - e); o.innerHTML = Math.abs(d) < 1 ? '<b class="good">Cierra perfecto.</b>' : d > 0 ? 'Sobran <b class="warn">' + ars(d) + '</b>.' : 'Faltan <b class="bad">' + ars(-d) + '</b>.'; };
  A.cajaClose = (f) => A.act(async () => {
    const c = cfg(), r = A.cajaRange(c.periodo === 'libre' ? 0 : ui.cajaOff), k = A.cajaCalc(r), contado = M.r2(A.num(f.elements.contado.value)); if (!Number.isFinite(contado) || contado < 0) throw Error('Ingresá cuánto efectivo contaste.');
    if (r.to > sod(new Date()) && !confirm('El período todavía no terminó (termina el ' + fmt(r.to) + '). ¿Cerrar igual hasta hoy?')) return false;
    const inicial = Number(f.dataset.inicial) || 0, esperado = M.r2(inicial + k.netoEfectivo); let by = ''; try { by = localStorage.getItem('iclub-cobro-by') || ''; } catch (_) {}
    const next = A.clone(A.db); next.cierres = (next.cierres || []).concat([{ id: A.uid(), periodo: c.periodo, desde: fmt(r.from), hasta: fmt(r.to > sod(new Date()) ? sod(new Date()) : r.to), at: new Date().toISOString(), by, efectivoInicial: inicial, efectivoEsperado: esperado, efectivoContado: contado, diferencia: M.r2(contado - esperado), nota: f.elements.nota.value.trim().slice(0, 200), totals: { cobros: k.cobros, n: k.n, efectivo: k.efectivo, transferencia: k.transferencia, mp: k.mp, tarjeta: k.tarjeta, otros: k.otros, gastos: M.r2(k.gastos.total), porCobrador: k.porCobrador, netoTransferencia: k.netoTransferencia } }]).slice(-500);
    await A.saveDb(next, 'Cierre de caja ' + fmt(r.from) + ' al ' + fmt(r.to) + ' · contado ' + ars(contado)); A.render();
  }, 'Caja cerrada.');
  A.cajaReopen = (id) => { if (!confirm('¿Reabrir este cierre? Se borra el registro del cierre (los cobros no cambian).')) return; A.act(async () => { const next = A.clone(A.db); next.cierres = (next.cierres || []).filter((x) => x.id !== id); await A.saveDb(next, 'Cierre de caja reabierto'); A.render(); }, 'Cierre reabierto.'); };
  A.cajaCfg = (f) => A.saveSettings({ cierre: { periodo: f.elements.periodo.value, inicio: f.elements.inicio ? Number(f.elements.inicio.value) : cfg().inicio } }, 'Tipo de cierre guardado.');
  A.cajaPdf = async (id) => {
    try {
      await A.jspdf(); if (!window.ICLUBDocs || !ICLUBDocs.cierre) throw Error('Falta iclub-docs.js.');
      let data; if (id) { const x = cierres().find((y) => y.id === id); const r = { from: parse(x.desde), to: parse(x.hasta) }; data = { r, k: A.cajaCalc(r), cierre: x }; }
      else { const c = cfg(), r = A.cajaRange(c.periodo === 'libre' ? 0 : ui.cajaOff); data = { r, k: A.cajaCalc(r), cierre: yaCerrado(r) || null }; }
      const doc = ICLUBDocs.cierre(A.db, data); doc.save(doc.__name); A.toast('PDF del cierre descargado.');
    } catch (e) { A.toast('No se pudo generar el PDF: ' + e.message, true); }
  };
})();
