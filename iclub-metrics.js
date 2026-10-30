/* ICLUB · Cálculos del negocio usados por el panel, los reportes y el Excel.
   Funciones puras sobre los datos guardados: no modifican nada. */
(function (root) {
  'use strict';
  const P = () => root.ICLUBCollectionPlan || (typeof require !== 'undefined' ? require('./collection-plan.js') : null);
  const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const DAY = 86400000;
  function parseDate(s) { const p = String(s || '').split('/'); if (p.length !== 3) return null; const d = new Date(+p[2], +p[1] - 1, +p[0]); return isNaN(d) ? null : d; }
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function fmtDate(d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function monthKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function saldo(c) { return r2((c && c.movs || []).reduce((a, m) => a - Number(m.imp || 0), 0)); }
  function blocked(c) { return c && (c.blocked === true || c.blocked === 'true'); }
  function freqKey(f) { const s = String(f || '').toLowerCase(); return s === 'semanal' ? 'weekly' : s === 'mensual' ? 'monthly' : 'other'; }

  /* Cuotas pendientes de todos los clientes con deuda. dias < 0 = atrasada. */
  function dues(db, opt) {
    opt = opt || {}; const today = startOfDay(opt.today || new Date()), out = [];
    for (const [phone, c] of Object.entries(db.clients || {})) {
      if (saldo(c) <= 0.005) continue;
      for (const pm of (c.movs || []).filter((m) => m.finan)) {
        if (opt.freq && opt.freq !== 'all' && freqKey(pm.finan.freq) !== opt.freq) continue;
        const pc = P()._planCalc(c, pm);
        if (!(pc.pendiente > 0.005)) continue;
        for (const q of pc.cuotas) {
          if (q.done || !q.dt) continue;
          const falta = r2(Math.max(0, q.req - q.paid)); if (!(falta > 0.005)) continue;
          out.push({ phone, client: c.name || 'Cliente', doc: pm.doc, product: pm.prodName || String(pm.det || '').split(' · ')[0] || pm.doc, n: q.n, total: pc.n, date: q.d, dt: q.dt, iso: iso(q.dt), amount: falta, partial: q.paid > 0, dias: Math.round((startOfDay(q.dt) - today) / DAY), freq: pm.finan.freq || 'Mensual' });
        }
      }
    }
    return out.sort((a, b) => a.dt - b.dt || a.client.localeCompare(b.client));
  }
  function collectionTotals(list, today) {
    today = startOfDay(today || new Date());
    const dow = (today.getDay() + 6) % 7, weekEnd = new Date(today.getTime() + (6 - dow) * DAY), monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const t = { hoy: 0, hoyN: 0, semana: 0, semanaN: 0, mes: 0, mesN: 0, atrasado: 0, atrasadoN: 0, atrasadoClientes: 0, proximos30: 0 };
    const late = new Set();
    for (const d of list) {
      if (d.dias < 0) { t.atrasado += d.amount; t.atrasadoN++; late.add(d.phone); continue; }
      if (d.dias === 0) { t.hoy += d.amount; t.hoyN++; }
      if (d.dt <= weekEnd) { t.semana += d.amount; t.semanaN++; }
      if (d.dt <= monthEnd) { t.mes += d.amount; t.mesN++; }
      if (d.dias <= 30) t.proximos30 += d.amount;
    }
    t.atrasadoClientes = late.size;
    for (const k of ['hoy', 'semana', 'mes', 'atrasado', 'proximos30']) t[k] = r2(t[k]);
    return t;
  }
  /* Resumen de cliente para listas y fichas. */
  function client(db, phone, today) {
    const c = (db.clients || {})[phone] || {}; today = startOfDay(today || new Date());
    const planes = (c.movs || []).filter((m) => m.finan).map((pm) => ({ pm, pc: P()._planCalc(c, pm) }));
    let prox = null, late = 0, lateDays = 0; const freqs = new Set();
    for (const { pm, pc } of planes) {
      if (pc.pendiente > 0.005) freqs.add(freqKey(pm.finan.freq));
      for (const q of pc.cuotas) {
        if (q.done || !q.dt) continue; const falta = r2(q.req - q.paid); if (!(falta > 0.005)) continue;
        const dias = Math.round((startOfDay(q.dt) - today) / DAY);
        if (dias < 0) { late += falta; lateDays = Math.max(lateDays, -dias); }
        if (!prox || q.dt < prox.dt) prox = { dt: q.dt, date: q.d, amount: falta, n: q.n, total: pc.n, doc: pm.doc, dias };
      }
    }
    const s = saldo(c);
    const estado = blocked(c) ? 'bloqueado' : s <= 0.005 ? 'sin-deuda' : late > 0.005 ? 'atrasado' : 'al-dia';
    return { phone, name: c.name || 'Cliente', saldo: s, planes, prox, atrasado: r2(late), diasAtraso: lateDays, estado, freqs: [...freqs], compras: (c.movs || []).filter((m) => m.tipo === 'Compra').length };
  }
  /* Estado de una venta para el registro. */
  function sale(db, s, today) {
    const B = root.ICLUBBusiness; const d = B.saleData(db, s); const c = (db.clients || {})[s.clientKey];
    const pm = c && (c.movs || []).find((m) => m.tipo === 'Compra' && ((s.id && m.grp === s.id) || (s.invoice && m.doc === s.invoice)));
    let cuotas = null, estado, color;
    if (pm && pm.finan) {
      const pc = P()._planCalc(c, pm); const t = startOfDay(today || new Date());
      const vencidas = pc.cuotas.filter((q) => !q.done && q.dt && q.dt < t).length;
      cuotas = { pagadas: pc.pagadas, total: pc.n, pendiente: pc.pendiente, vencidas, prox: pc.prox ? { date: pc.prox.d, amount: r2(pc.prox.req - pc.prox.paid) } : null, freq: pm.finan.freq };
      if (pc.pendiente <= 0.005) { estado = 'Pagada'; color = 'good'; } else if (vencidas) { estado = vencidas === 1 ? '1 cuota atrasada' : vencidas + ' cuotas atrasadas'; color = 'bad'; } else { estado = 'Al día'; color = 'info'; }
    } else {
      if (!d.hasAccount) { estado = 'Sin cuenta'; color = 'muted'; } else if (d.balance <= 0.005) { estado = 'Pagada'; color = 'good'; } else { estado = 'Saldo pendiente'; color = 'warn'; }
    }
    const ganancia = r2(Number(s.ventaArs || 0) - Number(s.costoArs || 0));
    return { ...d, id: s.id, tipo: s.fin ? 'Financiada' : 'Contado', estado, color, cuotas, ganancia, dt: parseDate(s.fecha), referrer: s.referrer || null };
  }
  /* Brand/modelo para ordenar inventario y rankings. */
  function brand(name) { const b = root.ICLUBPriceList && root.ICLUBPriceList.brandOf(name || ''); return b ? (b.cat === 'Apple' ? 'Apple' : b.label.replace(/ Galaxy$/, '')) : 'Otros'; }
  function naturalCompare(a, b) { return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' }); }

  /* Finanzas de un mes (YYYY-MM) y proyección de cobros. */
  function finance(db, opt) {
    opt = opt || {}; const today = startOfDay(opt.today || new Date()); const month = opt.month || monthKey(today);
    const rate = Number(db.settings && db.settings.rate) || 1520;
    const ventas = (db.ventas || []).map((s) => ({ s, dt: parseDate(s.fecha) })).filter((x) => x.dt);
    const ofMonth = ventas.filter((x) => monthKey(x.dt) === month).map((x) => x.s);
    const sum = (arr, f) => r2(arr.reduce((a, x) => a + (Number(f(x)) || 0), 0));
    const pagos = []; for (const [phone, c] of Object.entries(db.clients || {})) for (const m of c.movs || []) if (m.tipo === 'Pago' && m.met !== 'Plan canje') { const dt = parseDate(m.f); if (dt) pagos.push({ phone, m, dt }); }
    const gastos = (db.gastos || []).map((g) => ({ g, dt: parseDate(g.f) })).filter((x) => x.dt);
    const gastosMes = gastos.filter((x) => monthKey(x.dt) === month);
    const k = {
      month, ventas: ofMonth.length, vendido: sum(ofMonth, (s) => s.ventaArs), costo: sum(ofMonth, (s) => s.costoArs),
      contado: ofMonth.filter((s) => !s.fin).length, financiadas: ofMonth.filter((s) => s.fin).length,
      cobrado: sum(pagos.filter((p) => monthKey(p.dt) === month), (p) => p.m.imp),
      gastos: sum(gastosMes.filter((x) => x.g.cat !== 'Comisiones'), (x) => x.g.monto), comisiones: sum(gastosMes.filter((x) => x.g.cat === 'Comisiones'), (x) => x.g.monto),
      porCobrar: r2(Object.values(db.clients || {}).reduce((a, c) => a + Math.max(0, saldo(c)), 0))
    };
    k.gananciaBruta = r2(k.vendido - k.costo); k.gananciaNeta = r2(k.gananciaBruta - k.gastos - k.comisiones);
    k.margen = k.vendido > 0 ? r2(k.gananciaBruta / k.vendido * 100) : 0; k.ticket = k.ventas ? r2(k.vendido / k.ventas) : 0;
    const all = dues(db, { today }); k.atrasado = r2(all.filter((d) => d.dias < 0).reduce((a, d) => a + d.amount, 0));
    /* Proyección: lo que deberías cobrar cada mes si todos pagan al día (lo vencido va al mes actual). */
    const proj = new Map(); const cur = monthKey(today);
    for (const d of all) { const key = d.dias < 0 ? cur : monthKey(d.dt); proj.set(key, r2((proj.get(key) || 0) + d.amount)); }
    const realByMonth = new Map(); for (const p of pagos) { const key = monthKey(p.dt); realByMonth.set(key, r2((realByMonth.get(key) || 0) + Number(p.m.imp || 0))); }
    const flujo = []; for (let i = -5; i <= 6; i++) { const d = new Date(today.getFullYear(), today.getMonth() + i, 1), key = monthKey(d); flujo.push({ month: key, label: d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }), esperado: i >= 0 ? proj.get(key) || 0 : null, cobrado: i <= 0 ? realByMonth.get(key) || 0 : null }); }
    /* Ranking de equipos (todas las ventas o el período elegido). */
    const scope = opt.allTime ? ventas.map((x) => x.s) : ofMonth;
    const byModel = new Map();
    for (const s of scope) { const key = String(s.itemSnapshot && s.itemSnapshot.name || s.name || 'Producto'); const e = byModel.get(key) || { name: key, unidades: 0, vendido: 0, ganancia: 0 }; e.unidades++; e.vendido = r2(e.vendido + Number(s.ventaArs || 0)); e.ganancia = r2(e.ganancia + Number(s.ventaArs || 0) - Number(s.costoArs || 0)); byModel.set(key, e); }
    const equipos = [...byModel.values()].map((e) => ({ ...e, promedio: r2(e.ganancia / e.unidades), margen: e.vendido ? r2(e.ganancia / e.vendido * 100) : 0 })).sort((a, b) => b.ganancia - a.ganancia);
    /* Referidores. */
    const refs = opt.refs || { members: {}, sales: [] }; const members = refs.members || {};
    const refRows = Object.entries(members).map(([phone, m]) => {
      const rs = (refs.sales || []).filter((x) => x.referrer === phone);
      const toArs = (x, v) => r2(Number(v || 0) * (x.commissionCurrency === 'USD' ? rate : 1));
      const liberado = (x) => x.delivered ? r2(Number(x.commission) * Number(x.collected) / (Number(x.total) || 1)) : 0;
      const aplicado = (x) => (x.history || []).filter((h) => h.action === 'applied').reduce((a, h) => a + Number(h.amount || 0), 0);
      return { phone, name: m.name, active: !!m.active, ventas: rs.length, facturado: r2(rs.reduce((a, x) => a + Number(x.total || 0) * (x.currency === 'USD' ? rate : 1), 0)),
        comision: r2(rs.reduce((a, x) => a + toArs(x, x.commission), 0)), liberada: r2(rs.reduce((a, x) => a + toArs(x, liberado(x)), 0)), pagada: r2(rs.reduce((a, x) => a + toArs(x, x.paid), 0)),
        aplicada: r2(rs.reduce((a, x) => a + toArs(x, aplicado(x)), 0)), pendiente: r2(rs.reduce((a, x) => a + toArs(x, Math.max(0, Number(x.commission) - Number(x.paid))), 0)), extra: r2(rs.reduce((a, x) => a + Number(x.extraUsd || 0), 0)) };
    }).sort((a, b) => b.facturado - a.facturado);
    return { k, flujo, equipos, referidores: refRows, gastosMes: gastosMes.map((x) => x.g), pagosMes: pagos.filter((p) => monthKey(p.dt) === month) };
  }

  /* Inversores: capital vigente, ganancia devengada y pendiente, próximo cobro. */
  function investor(inv, moves, today) {
    today = startOfDay(today || new Date()); const rate = Number(inv && inv.rate) || 0;
    const ms = (moves || []).slice().map((m) => ({ ...m, dt: startOfDay(new Date(m.f + 'T12:00:00')) })).filter((m) => !isNaN(m.dt)).sort((a, b) => a.dt - b.dt);
    let capital = 0, last = null, devengado = 0, aportado = 0, retirado = 0, pagado = 0, reinvertido = 0;
    /* Meses calendario entre dos fechas: 29/09 → 29/10 = 1 mes exacto; los días sueltos son fracción del mes. */
    const months = (a, b) => { let m = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth(); let anchor = new Date(a.getFullYear(), a.getMonth() + m, Math.min(a.getDate(), new Date(a.getFullYear(), a.getMonth() + m + 1, 0).getDate())); if (anchor > b) { m--; anchor = new Date(a.getFullYear(), a.getMonth() + m, Math.min(a.getDate(), new Date(a.getFullYear(), a.getMonth() + m + 1, 0).getDate())); } const dim = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate(); return m + Math.round((b - anchor) / DAY) / dim; };
    const accrue = (to) => { if (last && capital > 0 && to > last) devengado += capital * rate / 100 * months(last, to); if (!last || to > last) last = to; };
    for (const m of ms) {
      accrue(m.dt < today ? m.dt : today);
      const a = Number(m.amount) || 0;
      if (m.type === 'aporte') { capital += a; aportado += a; } else if (m.type === 'retiro') { capital -= a; retirado += a; } else if (m.type === 'ganancia') pagado += a; else if (m.type === 'reinversion') { capital += a; reinvertido += a; }
      if (!last) last = m.dt;
    }
    accrue(today);
    const first = ms.find((m) => m.type === 'aporte'); let proximo = null;
    if (first && capital > 0) { const day = first.dt.getDate(); let d = new Date(today.getFullYear(), today.getMonth(), Math.min(day, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate())); if (d <= today) d = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(day, new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate())); proximo = d; }
    return { capital: r2(capital), rate, mensual: r2(capital * rate / 100), devengado: r2(devengado), aportado: r2(aportado), retirado: r2(retirado), pagado: r2(pagado), reinvertido: r2(reinvertido), pendiente: r2(Math.max(0, devengado - pagado - reinvertido)), proximo, desde: first ? first.dt : null };
  }
  /* Simulador: sin reinvertir (interés simple) vs reinvirtiendo cada mes (compuesto). */
  function simulate(monto, ratePct, meses, tna) {
    monto = Number(monto) || 0; const r = (Number(ratePct) || 0) / 100; meses = Math.max(1, Math.min(120, Math.round(Number(meses) || 12)));
    const rows = []; let comp = monto;
    for (let i = 1; i <= meses; i++) { comp = comp * (1 + r); rows.push({ mes: i, simple: r2(monto + monto * r * i), gananciaSimple: r2(monto * r * i), compuesto: r2(comp), gananciaCompuesta: r2(comp - monto), plazoFijo: tna ? r2(monto * Math.pow(1 + Number(tna) / 100 / 12, i)) : null }); }
    const last = rows[rows.length - 1];
    return { rows, monto, meses, simple: last.simple, compuesto: last.compuesto, gananciaSimple: last.gananciaSimple, gananciaCompuesta: last.gananciaCompuesta, multiplicador: monto ? r2(last.compuesto / monto) : 0,
      anualSimplePct: r2(r * 12 * 100), anualCompuestoPct: r2((Math.pow(1 + r, 12) - 1) * 100), plazoFijo: last.plazoFijo, tna: tna || null };
  }
  /* Ganancia del referidor en cada forma de pago (para que vea cómo gana más). */
  function referrerGain(cfg, priceUsd, extraUsd, plans, rate) {
    cfg = cfg || {}; extraUsd = Number(extraUsd) || 0; rate = Number(rate) || 1520;
    const base = (Number(priceUsd) || 0) + extraUsd;
    const gain = (totalUsd) => cfg.mode === 'percent' ? r2((totalUsd - extraUsd) * (Number(cfg.percent) || 0) / 100 + extraUsd) : r2((Number(cfg.usd) || 0) + extraUsd);
    const out = [{ key: 'contado', label: 'Contado', totalUsd: r2(base), cuotas: 1, cuotaUsd: r2(base), gananciaUsd: gain(base) }];
    for (const [m, pct] of Object.entries(plans || {}).sort((a, b) => +a[0] - +b[0])) { const p = Number(pct); if (!(Number(m) >= 2) || !Number.isFinite(p)) continue; const total = r2(base * (1 + p / 100)); out.push({ key: 'm' + m, label: m + ' meses', meses: +m, recargo: p, totalUsd: total, cuotas: +m, cuotaUsd: r2(total / m), gananciaUsd: gain(total) }); }
    const best = out.reduce((a, b) => (b.gananciaUsd > a.gananciaUsd + 0.004 ? b : a), out[0]);
    return out.map((o) => ({ ...o, best: o === best && out.some((x) => x.gananciaUsd !== best.gananciaUsd), gananciaArs: r2(o.gananciaUsd * rate), totalArs: r2(o.totalUsd * rate), cuotaArs: r2(o.cuotaUsd * rate) }));
  }

  /* Hojas del Excel completo. */
  function excelSheets(db, ctx) {
    ctx = ctx || {}; const today = startOfDay(ctx.today || new Date()), B = root.ICLUBBusiness;
    const f = finance(db, { today, month: ctx.month, refs: ctx.refs, allTime: true }); const fm = finance(db, { today, month: ctx.month, refs: ctx.refs });
    const ventas = (db.ventas || []).map((s) => {
      const st = sale(db, s, today), c = (db.clients || {})[s.clientKey] || {}; const pay = s.paymentSnapshot || {};
      return [s.fecha || '', st.document, st.client, st.phone || '', st.name, st.spec || '', st.tipo, s.method || '', Number(pay.amount || 0), Number(s.tradeValue || 0), (s.tradeSnapshot && s.tradeSnapshot.name) || '',
        Number(s.cashArs || s.ventaArs || 0), Number(s.ventaArs || 0), Number(s.costoArs || 0), st.ganancia, st.cuotas ? st.cuotas.total : '', st.cuotas ? st.cuotas.pagadas : '', st.cuotas ? (st.cuotas.freq || '') : '', st.paid, st.cuotas ? st.cuotas.pendiente : st.balance, st.estado, st.cuotas && st.cuotas.prox ? st.cuotas.prox.date : '', s.delivered ? 'Sí' : 'No', s.referrer ? ((ctx.refs && ctx.refs.members && ctx.refs.members[s.referrer] || {}).name || s.referrer) : '', c.blocked ? 'Bloqueado' : ''];
    });
    const cuotas = [];
    for (const [phone, c] of Object.entries(db.clients || {})) for (const pm of (c.movs || []).filter((m) => m.finan)) { const pc = P()._planCalc(c, pm); for (const q of pc.cuotas) { const falta = r2(Math.max(0, q.req - q.paid)); const dias = q.dt ? Math.round((startOfDay(q.dt) - today) / DAY) : ''; cuotas.push([c.name || '', phone, pm.doc, pm.prodName || String(pm.det || '').split(' · ')[0], pm.finan.freq || 'Mensual', q.n + ' de ' + pc.n, q.d, q.req, q.paid, falta, q.done ? 'Pagada' : q.paid > 0 ? 'Parcial' : dias < 0 ? 'Atrasada' : 'Pendiente', !q.done && dias < 0 ? -dias : '', q.desc || '']); } }
    const clientes = Object.keys(db.clients || {}).map((ph) => { const x = client(db, ph, today); return [x.name, ph, x.saldo, x.atrasado, x.diasAtraso || '', x.prox ? x.prox.date : '', x.prox ? x.prox.amount : '', ({ 'al-dia': 'Al día', atrasado: 'Atrasado', 'sin-deuda': 'Sin deuda', bloqueado: 'Bloqueado' })[x.estado], x.compras]; }).sort((a, b) => b[2] - a[2]);
    const k = fm.k;
    const resumen = [['Dato', 'Valor'], ['Reporte generado', fmtDate(today)], ['Mes analizado', k.month], ['Ventas del mes', k.ventas], ['Contado / financiadas', k.contado + ' / ' + k.financiadas], ['Total vendido', k.vendido], ['Costo de lo vendido', k.costo], ['Ganancia bruta', k.gananciaBruta], ['Margen bruto %', k.margen], ['Gastos del mes', k.gastos], ['Comisiones del mes', k.comisiones], ['Ganancia neta estimada', k.gananciaNeta], ['Cobrado en el mes', k.cobrado], ['Total por cobrar (todas las cuentas)', k.porCobrar], ['Atrasado', k.atrasado], ['Ticket promedio', k.ticket], ['Cotización usada', Number(db.settings && db.settings.rate) || 1520]];
    const sheets = [
      { name: 'Resumen', widths: [38, 22], money: [1], rows: resumen },
      { name: 'Ventas', widths: [11, 18, 24, 14, 24, 22, 11, 16, 14, 12, 20, 14, 14, 14, 14, 8, 8, 10, 14, 14, 18, 12, 9, 18, 10], money: [8, 9, 11, 12, 13, 14, 18, 19], rows: [['Fecha', 'Comprobante', 'Cliente', 'Teléfono', 'Equipo', 'Detalle', 'Tipo', 'Medio', 'Pagó al vender', 'Canje', 'Equipo de canje', 'Precio contado', 'Total venta', 'Costo', 'Ganancia', 'Cuotas', 'Pagadas', 'Frecuencia', 'Pagado a la fecha', 'Saldo', 'Estado', 'Próximo vencimiento', 'Entregado', 'Referidor', 'Cuenta']].concat(ventas) },
      { name: 'Cuotas', widths: [24, 14, 18, 22, 10, 10, 12, 14, 14, 14, 11, 10, 14], money: [7, 8, 9, 12], rows: [['Cliente', 'Teléfono', 'Plan', 'Equipo', 'Frecuencia', 'Cuota', 'Vence', 'Importe', 'Pagado', 'Falta', 'Estado', 'Días de atraso', 'Descuento aplicado']].concat(cuotas) },
      { name: 'Clientes', widths: [24, 14, 14, 14, 10, 14, 14, 12, 9], money: [2, 3, 6], rows: [['Cliente', 'Teléfono', 'Saldo', 'Atrasado', 'Días de atraso', 'Próximo pago', 'Importe próximo', 'Estado', 'Compras']].concat(clientes) },
      { name: 'Cobros por mes', widths: [12, 18, 18], money: [1, 2], rows: [['Mes', 'Cobrado real', 'Esperado si pagan al día']].concat(f.flujo.map((x) => [x.month, x.cobrado == null ? '' : x.cobrado, x.esperado == null ? '' : x.esperado])) },
      { name: 'Equipos', widths: [30, 10, 16, 16, 16, 10], money: [2, 3, 4], rows: [['Equipo', 'Unidades', 'Vendido', 'Ganancia total', 'Ganancia promedio', 'Margen %']].concat(f.equipos.map((e) => [e.name, e.unidades, e.vendido, e.ganancia, e.promedio, e.margen])) },
      { name: 'Referidores', widths: [24, 14, 8, 16, 16, 16, 16, 16, 16, 10], money: [3, 4, 5, 6, 7, 8], rows: [['Referidor', 'Teléfono', 'Ventas', 'Facturación generada', 'Comisión total', 'Liberada', 'Pagada en efectivo/cuotas', 'Aplicada a cuotas', 'Pendiente', 'Extra USD']].concat(f.referidores.map((r) => [r.name, r.phone, r.ventas, r.facturado, r.comision, r.liberada, r.pagada, r.aplicada, r.pendiente, r.extra])) },
      { name: 'Gastos', widths: [11, 30, 16, 14], money: [3], rows: [['Fecha', 'Concepto', 'Categoría', 'Monto']].concat((db.gastos || []).map((g) => [g.f || '', g.concepto || '', g.cat || '', Number(g.monto || 0)])) },
      { name: 'Inventario', widths: [28, 22, 12, 8, 8, 12, 12, 16], money: [5, 6], rows: [['Equipo', 'Detalle', 'Categoría', 'Moneda', 'Stock', 'Costo', 'Precio venta', 'Origen']].concat((db.inventory || []).map((i) => [i.name || '', i.spec || '', i.cat || '', i.moneda || 'USD', Number(i.stock || 0), Number(i.costo || 0), Number(i.venta || 0), i.source || ''])) }
    ];
    if (ctx.net && ctx.net.investors) {
      const rows = Object.entries(ctx.net.investors).map(([ph, inv]) => { const x = investor(inv, (ctx.net.investorMoves || []).filter((m) => m.phone === ph), today); return [inv.name, ph, x.rate, x.capital, x.mensual, x.devengado, x.pagado, x.reinvertido, x.pendiente, x.proximo ? fmtDate(x.proximo) : '']; });
      sheets.push({ name: 'Inversores', widths: [24, 14, 10, 16, 16, 16, 16, 16, 16, 14], money: [3, 4, 5, 6, 7, 8], rows: [['Inversor', 'Teléfono', '% mensual', 'Capital', 'Ganancia por mes', 'Ganancia devengada', 'Pagada', 'Reinvertida', 'Pendiente de pago', 'Próximo cobro']].concat(rows) });
    }
    return sheets;
  }
  const api = { r2, parseDate, fmtDate, iso, monthKey, startOfDay, saldo, dues, collectionTotals, client, sale, brand, naturalCompare, finance, investor, simulate, referrerGain, excelSheets, freqKey };
  root.ICLUBMetrics = api; if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
