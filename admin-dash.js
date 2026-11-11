/* ICLUB · Inicio tipo tablero: accesos rápidos, flujo del mes, gráfico de barras por mes y torta por categoría. */
(function () {
  'use strict';
  const A = window.ICA, M = window.ICLUBMetrics; const { esc, ars } = A;
  const short = (n) => { const a = Math.abs(n); return (n < 0 ? '−' : '') + icon('pago') + (a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.', ',') + 'M' : a >= 1e3 ? Math.round(a / 1e3) + 'k' : Math.round(a)); };
  const COL = { blue: '#0A84FF', green: '#16A34A', orange: '#F59E0B', purple: '#7C3AED', teal: '#0EA5A4', pink: '#DB2777', red: '#DC2626', slate: '#64748B' };
  const catOf = (s) => { const it = (A.db.inventory || []).find((i) => i.id === s.inventoryId); const n = ((it && (it.cat + ' ' + it.name)) || (s.itemSnapshot && s.itemSnapshot.name) || s.name || '').toLowerCase(); return /iphone|ipad|apple|airpods|macbook|watch/.test(n) ? 'Apple' : /tv|smart/.test(n) ? 'Smart TV' : /samsung|xiaomi|redmi|poco|motorola|moto |infinix|celular|android/.test(n) ? 'Android' : /ps5|playstation|joystick|consola/.test(n) ? 'Consolas' : 'Accesorios y otros'; };

  /* Iconos de línea propios (24×24, trazo 2). */
  const ICO = { venta: '<path d="M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M10 18h4"/><path d="M12 7v6M9 10h6"/>', pago: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>', clientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>', caja: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 15h3"/><path d="M16 14v3"/>', finanzas: '<path d="M3 20h18"/><path d="M6 16V11M11 16V7M16 16v-4M21 6l-5 4-4-3-6 4"/>' };
  const icon = (k) => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICO[k] + '</svg>';
  /* 1. Accesos rápidos */
  function wAccesos() {
    const t = (href, act, color, icon, label, sub) => '<a class="dash-tile" style="--c:' + color + '" ' + (act ? 'href="#" data-act="' + act + '"' : 'href="' + href + '"') + '><span class="dash-ico">' + icon + '</span><span><b>' + label + '</b><small>' + sub + '</small></span></a>';
    return '<div class="dash-tiles">' + t('#vender', '', COL.blue, icon('venta'), 'Registrar venta', 'desde el inventario') + t('', 'qp-focus', COL.green, '$', 'Registrar pago', 'buscar cliente y cobrar') + t('#clientes', '', COL.orange, icon('clientes'), 'Clientes', 'fichas, cuotas y deudas') + t('#caja', '', COL.purple, icon('caja'), 'Cierre de caja', 'semanal o el que elijas') + t('#finanzas', '', COL.teal, icon('finanzas'), 'Finanzas', 'ganancias y previsión') + '</div>';
  }
  /* 2. Flujo del mes: vendido → cobrado → por cobrar */
  function wFlujo() {
    const k = M.finance(A.db, {}).k, due = M.dues(A.db, {}), atr = new Set(due.filter((d) => d.dias < 0).map((d) => d.phone)).size, hoy = due.filter((d) => d.dias === 0).length;
    const node = (color, label, v, href) => '<a class="flow-node" href="' + href + '" style="--c:' + color + '"><span class="flow-dot">' + short(v) + '</span><span class="flow-lbl">' + label + '</span></a>';
    const stat = (l, v, cls) => '<div class="flow-stat"><span>' + l + '</span><b class="' + (cls || '') + '">' + v + '</b></div>';
    return '<div class="card-head" style="margin-bottom:8px"><h2>Cómo va el mes</h2><div class="spacer"></div><a class="small" href="#finanzas">Ver finanzas</a></div><div class="flow"><div class="flow-col">' + node(COL.blue, 'Vendido', k.vendido, '#ventas') + stat('Ventas', k.ventas) + stat('Contado / financiadas', k.contado + ' / ' + k.financiadas) + stat('Ticket promedio', ars(k.ticket)) + '</div><div class="flow-arrow">→</div><div class="flow-col">' + node(COL.green, 'Cobrado', k.cobrado, '#finanzas') + stat('Ganancia que entró', ars(k.gananciaCaja), 'good') + stat('Ganancia bruta del mes', ars(k.gananciaBruta)) + stat('Vencen hoy', hoy + ' cuota' + (hoy === 1 ? '' : 's')) + '</div><div class="flow-arrow">→</div><div class="flow-col">' + node(k.atrasado > 0 ? COL.red : COL.orange, 'Por cobrar', k.porCobrar, '#clientes') + stat('Atrasado', ars(k.atrasado), k.atrasado > 0 ? 'bad' : 'good') + stat('Clientes atrasados', String(atr), atr ? 'bad' : 'good') + stat('Margen del mes', k.margen + '%') + '</div></div>';
  }
  /* 3. Barras: vendido y cobrado por mes (últimos 12) */
  function wMeses() {
    const now = new Date(), months = []; for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ k: M.monthKey(d), l: d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''), v: 0, c: 0 }); }
    const idx = new Map(months.map((m, i) => [m.k, i]));
    (A.db.ventas || []).forEach((s) => { if (s.devolucion || s.sinStats) return; const d = M.parseDate(s.fecha); const i = d && idx.get(M.monthKey(d)); if (i != null) months[i].v += Number(s.ventaArs) || 0; });
    Object.values(A.db.clients || {}).forEach((c) => (c.movs || []).forEach((m) => { if (m.tipo !== 'Pago' || m.met === 'Plan canje') return; const d = M.parseDate(m.f); const i = d && idx.get(M.monthKey(d)); if (i != null) months[i].c += Number(m.imp) || 0; }));
    const max = Math.max(1, ...months.map((m) => Math.max(m.v, m.c))), W = 720, H = 240, pl = 46, pb = 26, cw = (W - pl - 8) / 12, bw = cw * 0.32, y = (v) => H - pb - (v / max) * (H - pb - 14);
    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => '<line x1="' + pl + '" x2="' + W + '" y1="' + y(max * f) + '" y2="' + y(max * f) + '" stroke="var(--line)" stroke-width="1"/><text x="' + (pl - 6) + '" y="' + (y(max * f) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + short(max * f) + '</text>').join('');
    const bars = months.map((m, i) => { const x = pl + i * cw + cw * 0.15; return '<g><title>' + esc(m.l) + ': vendido ' + ars(m.v) + ' · cobrado ' + ars(m.c) + '</title><rect x="' + x + '" y="' + y(m.v) + '" width="' + bw + '" height="' + (H - pb - y(m.v)) + '" rx="3" fill="' + COL.blue + '"/><rect x="' + (x + bw + 3) + '" y="' + y(m.c) + '" width="' + bw + '" height="' + (H - pb - y(m.c)) + '" rx="3" fill="' + COL.green + '"/><text x="' + (pl + i * cw + cw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + esc(m.l) + '</text></g>'; }).join('');
    const tot = months.reduce((a, m) => a + m.v, 0);
    return '<div class="card-head" style="margin-bottom:6px"><h2>Ventas y cobros por mes</h2><div class="spacer"></div><span class="legend"><i style="background:' + COL.blue + '"></i>Vendido <i style="background:' + COL.green + '"></i>Cobrado</span></div>' + (tot ? '<svg viewBox="0 0 ' + W + ' ' + H + '" class="dash-chart" role="img" aria-label="Ventas y cobros de los últimos 12 meses">' + grid + bars + '</svg>' : '<div class="empty" style="padding:30px">Todavía no hay ventas para graficar.</div>');
  }
  /* 4. Torta: ventas del mes por categoría */
  function wTorta() {
    const mk = M.monthKey(new Date()), by = {}; (A.db.ventas || []).forEach((s) => { if (s.devolucion || s.sinStats) return; const d = M.parseDate(s.fecha); if (!d || M.monthKey(d) !== mk) return; const k = catOf(s); by[k] = (by[k] || 0) + (Number(s.ventaArs) || 0); });
    const list = Object.entries(by).sort((a, b) => b[1] - a[1]), tot = list.reduce((a, x) => a + x[1], 0), colors = [COL.blue, COL.green, COL.orange, COL.purple, COL.pink, COL.teal];
    if (!tot) return '<div class="card-head"><h2>Ventas del mes por tipo</h2></div><div class="empty" style="padding:30px">Sin ventas este mes.</div>';
    let a0 = -Math.PI / 2; const R = 70, r = 44, cx = 90, cy = 90;
    const arcs = list.map(([k, v], i) => { const a1 = a0 + (v / tot) * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0, p = (ang, rr) => (cx + rr * Math.cos(ang)).toFixed(2) + ' ' + (cy + rr * Math.sin(ang)).toFixed(2); const d = list.length === 1 ? 'M ' + (cx - R) + ' ' + cy + ' a ' + R + ' ' + R + ' 0 1 0 ' + 2 * R + ' 0 a ' + R + ' ' + R + ' 0 1 0 ' + -2 * R + ' 0 M ' + (cx - r) + ' ' + cy + ' a ' + r + ' ' + r + ' 0 1 1 ' + 2 * r + ' 0 a ' + r + ' ' + r + ' 0 1 1 ' + -2 * r + ' 0' : 'M ' + p(a0, R) + ' A ' + R + ' ' + R + ' 0 ' + big + ' 1 ' + p(a1, R) + ' L ' + p(a1, r) + ' A ' + r + ' ' + r + ' 0 ' + big + ' 0 ' + p(a0, r) + ' Z'; a0 = a1; return '<path d="' + d + '" fill="' + colors[i % colors.length] + '" fill-rule="evenodd"><title>' + esc(k) + ': ' + ars(v) + '</title></path>'; }).join('');
    return '<div class="card-head" style="margin-bottom:6px"><h2>Ventas del mes por tipo</h2></div><div class="donut-wrap"><svg viewBox="0 0 180 180" class="donut" role="img" aria-label="Ventas del mes por categoría">' + arcs + '<text x="90" y="86" text-anchor="middle" font-size="11" fill="var(--muted)">Total</text><text x="90" y="104" text-anchor="middle" font-size="15" font-weight="800" fill="var(--ink)">' + short(tot) + '</text></svg><div class="donut-legend">' + list.map(([k, v], i) => '<div><i style="background:' + colors[i % colors.length] + '"></i><span>' + esc(k) + '</span><b>' + Math.round(v / tot * 100) + '%</b></div>').join('') + '</div></div>';
  }
  if (A.registerWidget) {
    A.registerWidget('accesos', { t: 'Accesos rápidos', s: 12, fn: wAccesos }, true);
    A.registerWidget('flujoMes', { t: 'Cómo va el mes (vendido → cobrado → por cobrar)', s: 12, fn: wFlujo }, true);
    A.registerWidget('graficoMeses', { t: 'Gráfico: ventas y cobros por mes', s: 8, fn: wMeses }, true);
    A.registerWidget('tortaTipos', { t: 'Gráfico: ventas del mes por tipo', s: 4, fn: wTorta }, true);
  }
})();
