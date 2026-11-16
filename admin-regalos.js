/* ICLUB · Regalos en la venta: cables, fundas, templados que regalás con un equipo.
   Salen del stock, su costo se suma al costo de la venta (la ganancia queda real) y quedan anotados en la venta y el comprobante. */
(function () {
  'use strict';
  const A = window.ICA, M = window.ICLUBMetrics; const { esc } = A;
  const rate = () => A.rate();
  const disponibles = () => (A.db.inventory || []).filter((it) => Number(it.stock) > 0 && it.id !== A.pos.item && !A.esCelular(it));
  const costoArs = (it) => (Number(it.costo) || 0) * (it.moneda === 'ARS' ? 1 : rate());
  A.regalosCosto = () => M.r2((A.pos.regalos || []).reduce((s, r) => { const it = A.db.inventory.find((x) => x.id === r.id); return s + (it ? costoArs(it) * r.qty : 0); }, 0));
  A.regalosBox = () => { const l = A.pos.regalos || [], d = disponibles();
    return '<div class="reg-box"><div class="strong small">🎁 Regalos <span class="muted" style="font-weight:500">(salen del stock)</span></div>' +
      (l.length ? '<div class="reg-list">' + l.map((r) => { const it = A.db.inventory.find((x) => x.id === r.id) || {}; return '<span class="reg-chip">' + r.qty + ' × ' + esc(it.name || '') + (it.spec ? ' ' + esc(it.spec) : '') + ' <button type="button" data-act="reg-del" data-id="' + esc(r.id) + '" aria-label="Sacar">✕</button></span>'; }).join('') + '</div>' : '') +
      (d.length ? '<div class="row-flex" style="gap:6px;margin-top:6px"><select id="regSel" style="flex:1">' + d.map((it) => '<option value="' + esc(it.id) + '">' + esc(it.name + (it.spec ? ' ' + it.spec : '')) + ' · quedan ' + it.stock + '</option>').join('') + '</select><input id="regQty" type="number" min="1" value="1" style="width:64px"><button type="button" class="btn-2 btn-sm" data-act="reg-add">Sumar</button></div>' : '<div class="tiny muted">No hay accesorios en stock.</div>') + '</div>'; };
  /* Al confirmar la venta: descuenta el stock y anota los regalos. */
  A.regalosAplicar = (nd, s) => { const l = A.pos.regalos || []; if (!l.length) return; const v = nd.ventas.find((x) => x.id === s.id), out = [];
    for (const r of l) { const it = nd.inventory.find((x) => x.id === r.id); if (!it) continue; const q = Math.min(r.qty, Number(it.stock) || 0); if (!q) continue; it.stock = (Number(it.stock) || 0) - q; A.stockMove(nd, it, -q, 'Regalo en venta', (s.invoice || '') + ' · ' + ((s.clientSnapshot && s.clientSnapshot.name) || '')); out.push({ id: it.id, name: it.name + (it.spec ? ' ' + it.spec : ''), qty: q, costoArs: M.r2(costoArs(it) * q) }); }
    if (v && out.length) { v.regalos = out; v.itemSnapshot.regalos = out.map((x) => x.qty + ' × ' + x.name).join(', '); s.itemSnapshot.regalos = v.itemSnapshot.regalos; } };
  document.addEventListener('click', (ev) => { const b = ev.target.closest('[data-act="reg-add"],[data-act="reg-del"]'); if (!b) return; ev.preventDefault(); const p = A.pos; p.regalos = p.regalos || [];
    if (b.dataset.act === 'reg-add') { const id = (A.$('#regSel') || {}).value, q = Math.max(1, Math.round(Number((A.$('#regQty') || {}).value) || 1)), it = A.db.inventory.find((x) => x.id === id); if (!it) return; const cur = p.regalos.find((r) => r.id === id); const tot = (cur ? cur.qty : 0) + q; if (tot > Number(it.stock)) { A.toast('Solo quedan ' + it.stock + ' de ' + it.name + '.', true); return; } if (cur) cur.qty = tot; else p.regalos.push({ id, qty: q }); }
    else p.regalos = p.regalos.filter((r) => r.id !== b.dataset.id);
    const y = window.scrollY; A.render(); window.scrollTo(0, y); });
})();
