/* ICLUB · Finanzas: cada número se toca y abre su detalle completo. */
(function () {
  'use strict';
  const A = window.ICA, M = window.ICLUBMetrics; const { esc, ars, chip } = A; const ui = A.ui;
  const month = () => ui.finMonth || M.monthKey(new Date());
  const monthLabel = (k) => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }); };
  const ventasMes = () => (A.db.ventas || []).filter((s) => !s.devolucion && !s.sinStats).map((s) => ({ s, dt: M.parseDate(s.fecha) })).filter((x) => x.dt && M.monthKey(x.dt) === month()).map((x) => ({ s: x.s, st: M.sale(A.db, x.s) })).sort((a, b) => b.st.dt - a.st.dt);
  const sumLine = (l, v, cls, strong) => '<div class="sum-line"' + (strong ? ' style="border-top:2px solid var(--ink);margin-top:4px"' : '') + '><span' + (strong ? ' class="strong"' : '') + '>' + l + '</span><b class="' + (cls || '') + '">' + v + '</b></div>';
  const table = (heads, rows, empty) => '<div class="table-wrap"><table class="table"><thead><tr>' + heads.map((h) => '<th' + (h.num ? ' class="num"' : '') + '>' + h.t + '</th>').join('') + '</tr></thead><tbody>' + (rows.length ? rows.join('') : '<tr><td colspan="' + heads.length + '" class="muted">' + (empty || 'Sin datos.') + '</td></tr>') + '</tbody></table></div>';
  const ventaRow = ({ s, st }, cols) => '<tr class="clickable" data-act="fin-sale" data-id="' + esc(s.id) + '"><td class="nowrap">' + esc(s.fecha) + '</td><td>' + esc(st.client) + '</td><td>' + esc(st.name) + (s.itemSnapshot && s.itemSnapshot.imei ? '<br><span class="tiny muted">IMEI ' + esc(s.itemSnapshot.imei) + '</span>' : '') + '</td><td>' + chip(st.tipo, st.tipo === 'Contado' ? 'info' : 'warn') + '</td>' + cols.map((c) => '<td class="num ' + (c.cls ? c.cls({ s, st }) : '') + '">' + c.v({ s, st }) + '</td>').join('') + '</tr>';
  const tabs = (id, list) => '<div class="seg" role="tablist" style="margin-bottom:10px">' + list.map(([k, l], i) => '<button type="button" class="' + (i === 0 ? 'on' : '') + '" data-act="fin-tab" data-g="' + id + '" data-k="' + k + '">' + l + '</button>').join('') + '</div>';

  const D = {
    vendido() {
      const v = ventasMes(), cont = v.filter((x) => x.st.tipo === 'Contado'), fin = v.filter((x) => x.st.tipo !== 'Contado'), tot = (l) => l.reduce((a, x) => a + Number(x.s.ventaArs || 0), 0);
      const cols = [{ v: ({ s }) => ars(s.ventaArs) }, { v: ({ st }) => st.balance > 0.005 ? '<span class="bad">' + ars(st.balance) + '</span>' : '<span class="good">Pagada</span>' }];
      const heads = [{ t: 'Fecha' }, { t: 'Cliente' }, { t: 'Equipo' }, { t: 'Tipo' }, { t: 'Total', num: 1 }, { t: 'Saldo', num: 1 }];
      return ['Vendido en ' + monthLabel(month()), '<div class="kpis" style="margin-bottom:12px"><div class="kpi dark"><span class="lbl">Total vendido</span><span class="num">' + ars(tot(v)) + '</span><span class="sub">' + v.length + (v.length === 1 ? ' venta' : ' ventas') + '</span></div><div class="kpi"><span class="lbl">Contado</span><span class="num">' + ars(tot(cont)) + '</span><span class="sub">' + cont.length + (cont.length === 1 ? ' venta' : ' ventas') + '</span></div><div class="kpi"><span class="lbl">Financiadas</span><span class="num">' + ars(tot(fin)) + '</span><span class="sub">' + fin.length + (fin.length === 1 ? ' venta' : ' ventas') + '</span></div></div>' +
        tabs('vend', [['todas', 'Todas (' + v.length + ')'], ['contado', 'Contado (' + cont.length + ')'], ['fin', 'Financiadas (' + fin.length + ')']]) +
        '<div data-g="vend" data-k="todas">' + table(heads, v.map((x) => ventaRow(x, cols)), 'Sin ventas este mes.') + '</div><div data-g="vend" data-k="contado" hidden>' + table(heads, cont.map((x) => ventaRow(x, cols))) + '</div><div data-g="vend" data-k="fin" hidden>' + table(heads, fin.map((x) => ventaRow(x, cols))) + '</div><p class="tiny muted">Tocá una venta para ver su comprobante.</p>'];
    },
    ganancia() {
      const v = ventasMes().sort((a, b) => b.st.ganancia - a.st.ganancia), f = M.finance(A.db, { month: month() }).k;
      const cols = [{ v: ({ s }) => ars(s.ventaArs) }, { v: ({ s }) => ars(s.costoArs) }, { v: ({ st }) => ars(st.ganancia), cls: ({ st }) => (st.ganancia < 0 ? 'bad strong' : 'good strong') }, { v: ({ s, st }) => (Number(s.ventaArs) ? Math.round(st.ganancia / Number(s.ventaArs) * 100) : 0) + '%' }];
      const raras = v.filter((x) => x.st.ganancia < 0 || !Number(x.s.costoArs));
      return ['Ganancia de ' + monthLabel(month()), '<div class="grid g2" style="margin-bottom:12px"><div class="card" style="margin:0">' + sumLine('Vendido', ars(f.vendido)) + sumLine('− Costo de los equipos', ars(f.costo), 'bad') + sumLine('= Ganancia bruta', ars(f.gananciaBruta), 'good', true) + sumLine('· ya cobrada', ars(f.gananciaCobrada)) + sumLine('· por cobrar en cuotas', ars(f.gananciaPorCobrar), 'muted') + '</div><div class="card" style="margin:0">' + sumLine('Ganancia bruta', ars(f.gananciaBruta)) + sumLine('− Gastos', ars(f.gastos), 'bad') + sumLine('− Comisiones', ars(f.comisiones), 'bad') + sumLine('= Ganancia neta', ars(f.gananciaNeta), f.gananciaNeta >= 0 ? 'good' : 'bad', true) + sumLine('Margen', f.margen + '%') + '</div></div>' +
        (raras.length ? '<div class="note warn">Revisá ' + raras.length + ' venta' + (raras.length > 1 ? 's' : '') + ' con ganancia negativa o sin costo cargado: suelen ser datos mal cargados.</div>' : '') +
        '<h3>Ganancia por venta</h3>' + table([{ t: 'Fecha' }, { t: 'Cliente' }, { t: 'Equipo' }, { t: 'Tipo' }, { t: 'Vendido', num: 1 }, { t: 'Costo', num: 1 }, { t: 'Ganancia', num: 1 }, { t: 'Margen', num: 1 }], v.map((x) => ventaRow(x, cols)), 'Sin ventas este mes.') + D._gastos(true)];
    },
    _gastos(inner) {
      const g = (A.db.gastos || []).filter((x) => { const d = M.parseDate(x.f); return d && M.monthKey(d) === month(); }); const byCat = {}; g.forEach((x) => { byCat[x.cat || 'Otros'] = (byCat[x.cat || 'Otros'] || 0) + Number(x.monto || 0); });
      return '<h3 style="margin-top:14px">Gastos y comisiones</h3>' + (Object.keys(byCat).length ? Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => sumLine(esc(c), ars(v), 'bad')).join('') : '') + table([{ t: 'Fecha' }, { t: 'Concepto' }, { t: 'Categoría' }, { t: 'Importe', num: 1 }], g.map((x) => '<tr><td>' + esc(x.f) + '</td><td>' + esc(x.concepto || '') + '</td><td>' + esc(x.cat || '') + '</td><td class="num bad">' + ars(x.monto) + '</td></tr>'), 'Sin gastos este mes.');
    },
    gastos() { return ['Gastos y comisiones de ' + monthLabel(month()), D._gastos()]; },
    neta() { return D.ganancia(); },
    cobrado() {
      const p = []; for (const [phone, c] of Object.entries(A.db.clients || {})) for (const m of c.movs || []) { if (m.tipo !== 'Pago' || m.met === 'Plan canje') continue; const d = M.parseDate(m.f); if (d && M.monthKey(d) === month()) p.push({ phone, c, m, d }); }
      p.sort((a, b) => b.d - a.d); const byMed = {}; p.forEach((x) => { const k = x.m.efec != null ? 'Combinado' : x.m.met || 'Sin medio'; byMed[k] = (byMed[k] || 0) + Number(x.m.imp); });
      return ['Cobrado en ' + monthLabel(month()), '<div style="margin-bottom:10px">' + Object.entries(byMed).sort((a, b) => b[1] - a[1]).map(([k, v]) => sumLine(esc(k), ars(v))).join('') + sumLine('Total', ars(p.reduce((a, x) => a + Number(x.m.imp), 0)), 'good', true) + '</div>' +
        table([{ t: 'Fecha' }, { t: 'Cliente' }, { t: 'Recibo' }, { t: 'Medio' }, { t: 'Cobró' }, { t: 'Importe', num: 1 }], p.map((x) => '<tr class="clickable" data-act="fin-client" data-phone="' + esc(x.phone) + '"><td>' + esc(x.m.f) + '</td><td>' + esc(x.c.name || x.phone) + '</td><td class="nowrap">' + esc(x.m.doc || '') + '</td><td>' + esc(x.m.efec != null ? 'Combinado' : x.m.met || '') + '</td><td>' + esc(x.m.by || '') + '</td><td class="num strong">' + ars(x.m.imp) + '</td></tr>'), 'Sin cobros este mes.') + '<p class="tiny muted">No incluye los equipos recibidos en canje (no es plata).</p>'];
    },
    porCobrar() {
      const due = M.dues(A.db, {}); const rows = Object.entries(A.db.clients || {}).map(([ph, c]) => ({ ph, c, saldo: M.saldo(c), d: due.filter((x) => x.phone === ph).sort((a, b) => a.dt - b.dt) })).filter((x) => x.saldo > 0.005).sort((a, b) => b.saldo - a.saldo);
      return ['Por cobrar · ' + rows.length + ' clientes', sumLine('Total por cobrar', ars(rows.reduce((a, x) => a + x.saldo, 0)), 'strong', true) + '<div style="margin-top:10px"></div>' +
        table([{ t: 'Cliente' }, { t: 'Próxima cuota' }, { t: 'Estado' }, { t: 'Debe', num: 1 }, { t: '' }], rows.map((x) => { const n = x.d[0], at = x.d.filter((q) => q.dias < 0); return '<tr><td><a href="#cliente/' + encodeURIComponent(x.ph) + '" data-act="fin-close">' + esc(x.c.name || x.ph) + '</a></td><td>' + (n ? esc(n.date) + ' · cuota ' + n.n + '/' + n.total + ' · ' + ars(n.amount) : '<span class="muted">Cuenta corriente</span>') + '</td><td>' + (at.length ? chip(at.length + ' atrasada' + (at.length > 1 ? 's' : ''), 'bad') : chip('Al día', 'good')) + '</td><td class="num strong">' + ars(x.saldo) + '</td><td><button class="btn-sm btn-good" data-act="pay" data-phone="' + esc(x.ph) + '">Cobrar</button></td></tr>'; }), 'Nadie te debe.')];
    },
    atrasado() {
      const due = M.dues(A.db, {}).filter((d) => d.dias < 0); const by = new Map(); due.forEach((d) => { const e = by.get(d.phone) || { ph: d.phone, name: d.client, total: 0, max: 0, items: [] }; e.total += d.amount; e.max = Math.max(e.max, -d.dias); e.items.push(d); by.set(d.phone, e); });
      const rows = [...by.values()].sort((a, b) => b.max - a.max);
      return ['Atrasados · ' + rows.length + ' clientes', sumLine('Total atrasado', ars(rows.reduce((a, x) => a + x.total, 0)), 'bad', true) + '<div style="margin-top:10px"></div>' +
        table([{ t: 'Cliente' }, { t: 'Cuotas vencidas' }, { t: 'Días de atraso', num: 1 }, { t: 'Vencido', num: 1 }, { t: '' }], rows.map((x) => '<tr><td><a href="#cliente/' + encodeURIComponent(x.ph) + '" data-act="fin-close">' + esc(x.name) + '</a></td><td>' + x.items.map((q) => esc(q.product) + ' · cuota ' + q.n + '/' + q.total + ' (' + esc(q.date) + ')').join('<br>') + '</td><td class="num"><b class="bad">' + x.max + '</b></td><td class="num strong bad">' + ars(x.total) + '</td><td><button class="btn-sm btn-good" data-act="pay" data-phone="' + esc(x.ph) + '">Cobrar</button></td></tr>'), 'Nadie está atrasado.')];
    },
    ticket() {
      const v = ventasMes(), t = (l) => (l.length ? l.reduce((a, x) => a + Number(x.s.ventaArs || 0), 0) / l.length : 0), cont = v.filter((x) => x.st.tipo === 'Contado'), fin = v.filter((x) => x.st.tipo !== 'Contado');
      const sorted = v.slice().sort((a, b) => Number(b.s.ventaArs) - Number(a.s.ventaArs)); const byCat = {}; v.forEach((x) => { const it = (A.db.inventory || []).find((i) => i.id === x.s.inventoryId); const k = (it && it.cat) || (/iphone|ipad|airpods|apple/i.test(x.st.name) ? 'Apple' : 'Otros'); (byCat[k] = byCat[k] || []).push(x); });
      return ['Ticket promedio de ' + monthLabel(month()), '<div class="kpis" style="margin-bottom:12px"><div class="kpi dark"><span class="lbl">General</span><span class="num">' + ars(t(v)) + '</span><span class="sub">' + v.length + (v.length === 1 ? ' venta' : ' ventas') + '</span></div><div class="kpi"><span class="lbl">Contado</span><span class="num">' + ars(t(cont)) + '</span><span class="sub">' + cont.length + (cont.length === 1 ? ' venta' : ' ventas') + '</span></div><div class="kpi"><span class="lbl">Financiadas</span><span class="num">' + ars(t(fin)) + '</span><span class="sub">' + fin.length + (fin.length === 1 ? ' venta' : ' ventas') + '</span></div></div>' +
        (Object.keys(byCat).length > 1 ? '<h3>Por categoría</h3>' + Object.entries(byCat).map(([k, l]) => sumLine(esc(k) + ' <span class="tiny muted">(' + l.length + ')</span>', ars(t(l)))).join('') : '') +
        (v.length ? sumLine('Venta más alta', ars(sorted[0].s.ventaArs) + ' · ' + esc(sorted[0].st.name)) + sumLine('Venta más baja', ars(sorted[sorted.length - 1].s.ventaArs) + ' · ' + esc(sorted[sorted.length - 1].st.name)) : '') +
        '<h3 style="margin-top:12px">Cada venta</h3>' + table([{ t: 'Fecha' }, { t: 'Cliente' }, { t: 'Equipo' }, { t: 'Tipo' }, { t: 'Ticket', num: 1 }], sorted.map((x) => ventaRow(x, [{ v: ({ s }) => ars(s.ventaArs) }])), 'Sin ventas este mes.')];
    }
  };
  A.finDetail = (key) => { const fn = D[key]; if (!fn) return; const [title, body] = fn(); A.modal(title, body, { wide: true, noFocus: true }); };
  A.finTab = (g, k) => { document.querySelectorAll('[data-act=fin-tab][data-g="' + g + '"]').forEach((b) => b.classList.toggle('on', b.dataset.k === k)); document.querySelectorAll('div[data-g="' + g + '"]').forEach((d) => { d.hidden = d.dataset.k !== k; }); };
})();
