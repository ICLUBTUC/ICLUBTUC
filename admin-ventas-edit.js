/* ICLUB · Arreglos de ventas desde el panel:
   1) "Editar venta": cambiar el precio final y vincular el cliente (por ejemplo, una venta que quedó "sin cliente vinculado").
   2) "Compras sin venta": compras cargadas a mano en la cuenta de un cliente que no figuran en Registro de ventas.
      Con un toque pasan a Registro de ventas con su costo, sin tocar lo que debe el cliente. */
(function () {
  'use strict';
  const A = window.ICA, M = window.ICLUBMetrics; const { esc } = A;
  const clientOpts = () => '<datalist id="seClients">' + Object.entries(A.db.clients || {}).map(([ph, c]) => '<option value="' + esc((c.name || '') + ' · ' + ph) + '">').join('') + '</datalist>';
  const phoneOf = (txt) => { const m = String(txt || '').match(/(\d{6,})\s*$/); if (m && A.db.clients[m[1]]) return m[1]; const t = String(txt || '').trim().toLowerCase(); const hit = Object.entries(A.db.clients || {}).filter(([, c]) => String(c.name || '').toLowerCase() === t); return hit.length === 1 ? hit[0][0] : ''; };
  const linkedMov = (s) => { const c = A.db.clients[s.clientKey]; return c ? (c.movs || []).find((m) => m.tipo === 'Compra' && ((s.id && m.grp === s.id) || (s.invoice && m.doc === s.invoice))) : null; };

  /* ---------- 1) Editar venta ---------- */
  A.saleEdit = (id) => {
    const s = A.db.ventas.find((x) => x.id === id); if (!s) return; const c = A.db.clients[s.clientKey], m = linkedMov(s);
    A.modal('Editar venta · ' + ((s.itemSnapshot && s.itemSnapshot.name) || s.name || ''), '<form id="saleEditForm" data-id="' + esc(id) + '" class="grid">' +
      '<label class="f">Cliente<input name="cli" list="seClients" value="' + esc(c ? (c.name || '') + ' · ' + s.clientKey : '') + '" placeholder="Escribí el nombre y elegilo de la lista"><small>' + (c ? 'Vinculada a ' + esc(c.name) + '.' : '<b class="bad">Esta venta no tiene cliente vinculado.</b>') + '</small></label>' + clientOpts() +
      '<div class="grid g2"><label class="f">Precio final de la venta ($)<input name="precio" inputmode="decimal" value="' + esc(Math.round(Number(s.ventaArs) || 0)) + '" required></label><label class="f">Precio de contado ($)<input name="cash" inputmode="decimal" value="' + esc(Math.round(Number(s.cashArs) || Number(s.ventaArs) || 0)) + '"><small>Si fue de contado, el mismo número.</small></label></div>' +
      (m && !m.finan ? '<label class="check"><input type="checkbox" name="cuenta"> Cambiar también lo que figura en la cuenta del cliente (' + A.ars(-Number(m.imp)) + ')</label>' : m && m.finan ? '<p class="tiny muted">Es una venta financiada: el plan de cuotas no cambia acá. Para cambiarlo usá "Editar plan pactado" en la ficha del cliente.</p>' : '<p class="tiny muted">Esto corrige el precio y la ganancia en Ventas y Finanzas. No le agrega ni le saca deuda al cliente.</p>') +
      '<label class="f">Motivo (queda en el historial)<input name="motivo" maxlength="80" placeholder="Ej: se cerró en 630.000 en vez de 850.000"></label><button class="btn-good">Guardar cambios</button></form>', { noFocus: true });
  };
  const saveEdit = (f) => A.act(async () => {
    const e = f.elements, next = A.clone(A.db), s = next.ventas.find((x) => x.id === f.dataset.id), precio = M.r2(A.num(e.precio.value)), cash = M.r2(A.num(e.cash.value) || precio);
    if (!(precio > 0)) throw Error('Poné el precio final.');
    const before = { precio: s.ventaArs, cliente: s.clientKey || '' }; let ph = s.clientKey;
    if (e.cli.value.trim()) { ph = phoneOf(e.cli.value); if (!ph) throw Error('Elegí el cliente de la lista (nombre · celular).'); }
    if (ph && ph !== s.clientKey) { const c = next.clients[ph]; s.clientKey = ph; s.clientSnapshot = { name: c.name, phone: ph }; }
    if (e.cuenta && e.cuenta.checked) { const c = next.clients[s.clientKey], m = c && (c.movs || []).find((x) => x.tipo === 'Compra' && ((s.id && x.grp === s.id) || (s.invoice && x.doc === s.invoice))); if (m && !m.finan) m.imp = -precio; }
    s.ventaArs = precio; s.cashArs = cash; s.editado = (s.editado || []).concat([{ at: new Date().toISOString(), by: (A.me && A.me.name) || '', antes: before, motivo: e.motivo.value.trim().slice(0, 80) }]);
    await A.saveDb(next, 'Venta editada ' + (s.invoice || s.id) + ': ' + A.ars(before.precio) + ' → ' + A.ars(precio) + (ph !== before.cliente ? ' · cliente ' + (next.clients[ph] || {}).name : '') + (e.motivo.value.trim() ? ' · ' + e.motivo.value.trim() : '')); A.closeModal(); A.render(); A.openSale(s.id);
  }, 'Venta corregida. La ganancia ya se recalculó.');
  const open0 = A.openSale; A.openSale = (id, created) => { const r = open0(id, created); if (A.isAdmin && A.isAdmin()) { const box = document.querySelector('dialog#modal [data-act="sale-pdf"]'); if (box && !document.querySelector('dialog#modal [data-act="sale-edit"]')) box.insertAdjacentHTML('afterend', '<button class="btn-2" data-act="sale-edit" data-id="' + esc(id) + '">Editar venta</button>'); } return r; };

  /* ---------- 2) Compras cargadas a mano que no están en Registro de ventas ---------- */
  A.comprasSinVenta = () => { const ids = new Set((A.db.ventas || []).map((v) => v.id)), docs = new Set((A.db.ventas || []).map((v) => v.invoice).filter(Boolean)), out = [];
    for (const [ph, c] of Object.entries(A.db.clients || {})) for (const m of c.movs || []) { if (m.tipo !== 'Compra' || !(Number(m.imp) < 0)) continue; if ((m.grp && ids.has(m.grp)) || (m.doc && docs.has(m.doc))) continue; out.push({ ph, name: c.name || ph, m }); }
    return out.sort((a, b) => (M.parseDate(b.m.f) || 0) - (M.parseDate(a.m.f) || 0)); };
  A.comprasSinVentaCard = () => { if (!(A.isAdmin && A.isAdmin())) return ''; const l = A.comprasSinVenta(); if (!l.length) return '';
    return '<div class="card fin-only" style="margin-bottom:14px;border-color:#f59e0b"><div class="card-head"><div><h2>' + l.length + ' compra' + (l.length === 1 ? '' : 's') + ' cargada' + (l.length === 1 ? '' : 's') + ' a mano que no figura' + (l.length === 1 ? '' : 'n') + ' en ventas</h2><p>Están en la cuenta del cliente pero no en Registro de ventas, por eso no suman ganancia. Pasalas con su costo: no cambia lo que debe el cliente.</p></div></div><div class="list">' +
      l.slice(0, 12).map((x) => '<div class="item"><div class="grow"><div class="main-t">' + esc(x.name) + '</div><div class="sub-t">' + esc(x.m.f) + ' · ' + esc(x.m.doc || '') + ' · ' + esc(x.m.prodName || x.m.det || 'Compra') + '</div></div><b style="margin:0 10px">' + A.ars(-Number(x.m.imp)) + '</b><button class="btn-sm btn-brand" data-act="csv-pasar" data-ph="' + esc(x.ph) + '" data-doc="' + esc(x.m.doc || '') + '" data-f="' + esc(x.m.f) + '">Pasar a ventas</button></div>').join('') + '</div></div>'; };
  A.csvPasar = (ph, doc, f) => { const c = A.db.clients[ph], m = c && (c.movs || []).find((x) => x.tipo === 'Compra' && (x.doc || '') === doc && x.f === f); if (!m) return;
    A.modal('Pasar a Registro de ventas', '<p class="small">' + esc(c.name) + ' · ' + esc(m.doc || '') + ' · ' + A.ars(-Number(m.imp)) + '</p><form id="csvForm" data-ph="' + esc(ph) + '" data-doc="' + esc(doc) + '" data-f="' + esc(f) + '" class="grid"><label class="f">Equipo / producto<input name="name" value="' + esc(m.prodName || m.det || '') + '" required maxlength="60"></label><div class="grid g3"><label class="f">Lo que te costó<input name="costo" inputmode="decimal" required placeholder="Ej: 300"></label><label class="f">En<select name="cur"><option value="USD">USD</option><option value="ARS">$</option></select></label><label class="f">Dólar<input name="rate" inputmode="decimal" value="' + A.rate() + '"></label></div><div class="grid g2"><label class="f">Precio de venta ($)<input name="precio" inputmode="decimal" value="' + Math.round(m.finan && m.finan.base ? Number(m.finan.base) + Number(m.finan.adel || 0) : -Number(m.imp)) + '"><small>Si fue financiada, el precio de contado.</small></label><label class="check" style="align-self:end"><input type="checkbox" name="delivered" checked> Ya lo entregué</label></div><button class="btn-good">Pasar a ventas</button></form>', { noFocus: true }); };
  const saveCsv = (f) => A.act(async () => {
    const e = f.elements, next = A.clone(A.db), c = next.clients[f.dataset.ph], m = c.movs.find((x) => x.tipo === 'Compra' && (x.doc || '') === f.dataset.doc && x.f === f.dataset.f);
    const n = A.num(e.costo.value), rate = A.num(e.rate.value) || A.rate(); if (!(n > 0)) throw Error('Poné lo que te costó.');
    const costoArs = M.r2(e.cur.value === 'USD' ? n * rate : n), total = M.r2(-Number(m.imp)), cash = M.r2(A.num(e.precio.value) || total), id = A.uid();
    next.ventas = (next.ventas || []).concat([{ id, name: e.name.value.trim(), itemSnapshot: { name: e.name.value.trim(), spec: '' }, clientSnapshot: { name: c.name, phone: f.dataset.ph }, clientKey: f.dataset.ph, fecha: m.f, createdAt: new Date().toISOString(), invoice: m.doc || null, ventaArs: total, cashArs: cash, costoArs, equipmentCostArs: costoArs, fin: !!m.finan, delivered: e.delivered.checked, method: 'Cuenta', desdeCuenta: true }].concat(e.cur.value === 'USD' ? [] : []));
    const v = next.ventas[next.ventas.length - 1]; if (e.cur.value === 'USD') { v.costoUsd = n; v.costoRate = rate; } m.grp = id;
    await A.saveDb(next, 'Compra pasada a ventas: ' + c.name + ' · ' + (m.doc || '') + ' · costo ' + A.ars(costoArs)); A.closeModal(); A.render();
  }, 'Listo: ya figura en Registro de ventas con su ganancia.');

  document.addEventListener('click', (ev) => { const b = ev.target.closest('[data-act="sale-edit"],[data-act="csv-pasar"]'); if (!b) return; ev.preventDefault(); if (b.dataset.act === 'sale-edit') A.saleEdit(b.dataset.id); else A.csvPasar(b.dataset.ph, b.dataset.doc, b.dataset.f); });
  document.addEventListener('submit', (ev) => { const f = ev.target; if (f.id === 'saleEditForm') saveEdit(f); else if (f.id === 'csvForm') saveCsv(f); });
})();
