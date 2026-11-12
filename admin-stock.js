/* ICLUB · Stock que compra plata y se publica en la página.
   - Al cargar o sumar stock: "¿Cuánto pagaste y de qué cuenta salió?" → db.comprasStock, se resta del Capital y aparece en Finanzas.
   - "Mostrar en la página y el cotizador": crea o actualiza su ficha en el catálogo de la página. */
(function () {
  'use strict';
  const A = window.ICA, M = window.ICLUBMetrics; const { esc } = A;
  const rate = () => Number(A.db.settings && A.db.settings.rate) || 1520;
  const catWeb = (cat) => ({ Apple: 'Apple', Celulares: 'Celulares', 'Smart TV': 'Smart TV', Accesorios: 'Accesorios' })[cat] || 'Accesorios';
  const enPagina = (it) => { const c = it && it.catalogId && A.db.catalog[it.catalogId]; return !!(c && !c.hidden && !c.deleted); };
  const cuentaOpts = (sel) => { const cs = A.capCuentas_ ? A.capCuentas_() : []; if (!cs.length) return ''; return '<label class="f">Salió de<select name="compraCuenta">' + cs.map((a) => '<option value="' + esc(a.id) + '"' + (a.id === sel ? ' selected' : '') + '>' + esc(a.name) + (a.cur === 'USD' ? ' (USD)' : '') + '</option>').join('') + '</select></label>'; };
  const lastCuenta = () => { try { return localStorage.getItem('iclub-cap-compra') || ''; } catch (_) { return ''; } };

  const compraBlock = (editing, x) => '<div class="card compra-box" style="padding:12px 14px;margin:0;background:#f6f7f9;box-shadow:none"><label class="check"><input type="checkbox" name="compraOn" checked> <b>Lo compré: restar la plata</b> <span class="small muted">(se descuenta de tu capital y queda en Finanzas como compra)</span></label>' +
    '<div class="grid g3" style="margin-top:8px"><label class="f">Unidades que compraste<input name="compraQty" inputmode="numeric" value="' + (editing ? 0 : (x.stock || 1)) + '" readonly tabindex="-1"></label><label class="f">Pagaste en total<input name="compraMonto" inputmode="decimal" placeholder="Costo × unidades"><small class="compra-cur">' + (x.moneda === 'ARS' ? 'en pesos' : 'en USD') + '</small></label>' + cuentaOpts(lastCuenta()) + '</div></div>';
  const pubBlock = (x) => '<label class="check"><input type="checkbox" name="publicar" ' + ((x.id ? enPagina(x) : true) ? 'checked' : '') + '> <b>Mostrar en la página y el cotizador</b> <span class="small muted">(con el precio de venta; si no hay stock aparece como agotado)</span></label>';

  /* Agrega los dos bloques al formulario de producto. */
  const base = A.itemForm;
  A.itemForm = (id, preset) => {
    base(id, preset); const f = A.$('#itemForm'); if (!f) return; const x = id ? A.db.inventory.find((i) => i.id === id) : preset || {};
    const row = f.querySelector('.row-flex'); row.insertAdjacentHTML('beforebegin', pubBlock(x || {}) + (A.isAdmin && A.isAdmin() ? compraBlock(!!id, x || {}) : ''));
    const prev = id ? Number(x.stock) || 0 : 0, box = f.querySelector('.compra-box'); let touched = false;
    const upd = () => { if (!box) return; const e = f.elements, q = Math.max(0, Math.round(A.num(e.stock.value)) - prev); e.compraQty.value = q; box.style.display = q > 0 ? '' : 'none'; f.querySelector('.compra-cur').textContent = e.moneda.value === 'ARS' ? 'en pesos' : 'en USD'; if (!touched) e.compraMonto.value = q > 0 && A.num(e.costo.value) > 0 ? String(M.r2(A.num(e.costo.value) * q)) : ''; };
    if (box) { f.elements.compraMonto.addEventListener('input', () => { touched = true; }); f.addEventListener('input', (ev) => { if (ev.target.name !== 'compraMonto') upd(); }); f.addEventListener('change', upd); upd(); }
  };

  /* Se llama al guardar un producto, antes de guardar la base. Devuelve un texto para la bitácora. */
  A.stockExtras = (next, it, delta, f) => {
    const e = f.elements, out = [];
    if (delta > 0 && e.compraOn && e.compraOn.checked) {
      const monto = A.num(e.compraMonto.value); if (!(monto > 0)) throw Error('Poné cuánto pagaste por el stock, o destildá "Lo compré".');
      out.push(registrarCompra(next, it, delta, monto, e.compraCuenta && e.compraCuenta.value));
    }
    if (e.publicar) publicar(next, it, e.publicar.checked);
    return out.length ? ' · ' + out.join(' · ') : '';
  };
  const registrarCompra = (next, it, qty, monto, cuenta) => {
    const cur = it.moneda === 'ARS' ? 'ARS' : 'USD';
    next.comprasStock = (next.comprasStock || []).concat([{ id: A.uid(), at: new Date().toISOString(), f: A.today(), invId: it.id, name: it.name + (it.spec ? ' ' + it.spec : ''), qty, monto: M.r2(monto), cur, montoArs: M.r2(cur === 'USD' ? monto * rate() : monto), cuenta: cuenta || null, by: (A.me && A.me.name) || '' }]);
    if (cuenta) { try { localStorage.setItem('iclub-cap-compra', cuenta); } catch (_) {} }
    return 'compra ' + A.money(monto, cur);
  };
  const publicar = (next, it, on) => {
    const usd = M.r2(it.moneda === 'ARS' ? Number(it.venta || 0) / rate() : Number(it.venta || 0)), sinStock = !(Number(it.stock) > 0);
    let id = it.catalogId && next.catalog[it.catalogId] ? it.catalogId : null;
    if (!on) { if (id) next.catalog[id] = Object.assign({}, next.catalog[id], { hidden: true }); return; }
    if (!(usd > 0)) throw Error('Para mostrarlo en la página poné el precio de venta.');
    if (id) next.catalog[id] = Object.assign({}, next.catalog[id], { hidden: false, deleted: false, usd, sinStock });
    else { id = 'c' + Date.now().toString(36); next.catalog[id] = { custom: true, name: it.name, spec: it.spec || '', cat: catWeb(it.cat), usd, sinStock, hidden: false, cond: it.cat === 'Apple' ? 'impecable' : 'nuevo', fromInv: it.id }; it.catalogId = id; }
  };
  A.stockPublicar = publicar;

  /* +1 en el inventario: pregunta si lo compraste. */
  const stock0 = A.stock;
  A.stock = (id, d) => {
    if (d < 0 || !(A.isAdmin && A.isAdmin())) return stock0(id, d);
    const x = A.db.inventory.find((i) => i.id === id); if (!x) return;
    const cur = x.moneda === 'ARS' ? 'ARS' : 'USD';
    A.modal('Sumar stock · ' + x.name, '<form id="stockInForm" data-id="' + esc(id) + '" class="grid"><label class="f">Unidades que entran<input name="qty" inputmode="numeric" value="1" required></label><label class="check"><input type="checkbox" name="compraOn" checked> <b>Lo compré: restar la plata</b></label><div class="grid g2"><label class="f">Pagaste en total (' + (cur === 'USD' ? 'USD' : 'pesos') + ')<input name="monto" inputmode="decimal" value="' + esc(Number(x.costo) > 0 ? String(x.costo) : '') + '"></label>' + cuentaOpts(lastCuenta()).replace('name="compraCuenta"', 'name="cuenta"') + '</div><button class="btn-good">Sumar al stock</button></form>', { noFocus: true });
    const f = A.$('#stockInForm'); let touched = false; f.elements.monto.addEventListener('input', () => { touched = true; }); f.elements.qty.addEventListener('input', () => { if (!touched && Number(x.costo) > 0) f.elements.monto.value = String(M.r2(Number(x.costo) * Math.max(1, Math.round(A.num(f.elements.qty.value) || 1)))); });
  };
  document.addEventListener('submit', (ev) => {
    const f = ev.target; if (f.id !== 'stockInForm') return;
    A.act(async () => {
      const e = f.elements, q = Math.round(A.num(e.qty.value)); if (!(q > 0)) throw Error('Poné cuántas unidades entran.');
      const next = A.clone(A.db), x = next.inventory.find((i) => i.id === f.dataset.id), prev = Number(x.stock) || 0; x.stock = prev + q;
      let extra = ''; if (e.compraOn.checked) { const m = A.num(e.monto.value); if (!(m > 0)) throw Error('Poné cuánto pagaste, o destildá "Lo compré".'); extra = ' · ' + registrarCompra(next, x, q, m, e.cuenta && e.cuenta.value); }
      A.stockMove(next, x, q, e.compraOn.checked ? 'Compra de stock' : 'Ingreso manual');
      if (x.catalogId && next.catalog[x.catalogId] && next.catalog[x.catalogId].sinStock) next.catalog[x.catalogId] = Object.assign({}, next.catalog[x.catalogId], { sinStock: false });
      await A.saveDb(next, 'Stock de ' + x.name + ': ' + prev + ' → ' + x.stock + extra); A.closeModal(); A.render();
    }, 'Stock actualizado.');
  });

  /* Finanzas: lo que compraste de mercadería en el mes. */
  A.comprasStockCard = (month) => {
    const list = (A.db.comprasStock || []).filter((x) => { const d = x.at ? new Date(x.at) : M.parseDate(x.f); return d && (!month || M.monthKey(d) === month); }); if (!list.length) return '';
    const tot = M.r2(list.reduce((s, x) => s + (Number(x.montoArs) || 0), 0)), cs = A.capCuentas_ ? A.capCuentas_() : [];
    return '<div class="card fin-only" style="margin-top:16px"><div class="card-head"><div><h2>Compras de mercadería del mes · ' + A.ars(tot) + '</h2><p>Plata que salió para comprar stock. No es un gasto: se descuenta de la ganancia recién cuando vendés el equipo (como costo).</p></div></div><div class="list">' + list.slice().reverse().map((x) => '<div class="item"><div class="grow"><div class="main-t">' + x.qty + ' × ' + esc(x.name) + '</div><div class="sub-t">' + esc(x.f) + ((cs.find((a) => a.id === x.cuenta) || {}).name ? ' · desde ' + esc(cs.find((a) => a.id === x.cuenta).name) : '') + (x.by ? ' · ' + esc(x.by) : '') + '</div></div><b>' + A.money(x.monto, x.cur) + (x.cur === 'USD' ? '<div class="tiny muted">' + A.ars(x.montoArs) + '</div>' : '') + '</b></div>').join('') + '</div></div>';
  };
  A.enPagina = enPagina;
  /* Lo que vale tu stock y lo que te puede quedar si lo vendés todo al precio cargado. */
  A.stockValor = () => { const r = rate(); let costo = 0, venta = 0, u = 0, sinPrecio = 0; const porCat = {}; (A.db.inventory || []).forEach((it) => { const q = Math.max(0, Number(it.stock) || 0); if (!q) return; const k = it.moneda === 'ARS' ? 1 : r, c = q * (Number(it.costo) || 0) * k, v = q * (Number(it.venta) || 0) * k; u += q; costo += c; venta += v; if (!(Number(it.venta) > 0)) sinPrecio += q; const g = porCat[it.cat || 'Otro'] || (porCat[it.cat || 'Otro'] = { u: 0, costo: 0, venta: 0 }); g.u += q; g.costo += c; g.venta += v; }); return { u, costo: M.r2(costo), venta: M.r2(venta), ganancia: M.r2(venta - costo), margen: venta > 0 ? Math.round((venta - costo) / venta * 100) : 0, sinPrecio, porCat }; };
  A.stockValorCard = () => { if (A.can && !A.can('finanzas')) return ''; const v = A.stockValor(); if (!v.u) return ''; const box = (l, n, s, cls) => '<div class="kpi"><div class="lbl">' + l + '</div><div class="num ' + (cls || '') + '">' + A.ars(n) + '</div><div class="small muted">' + s + '</div></div>';
    return '<div class="kpis fin-only" style="margin-bottom:14px">' + box('Tu stock vale', v.costo, v.u + ' unidades, a lo que te costaron') + box('Si lo vendés todo', v.venta, 'a tu precio de venta' + (v.sinPrecio ? ' · ' + v.sinPrecio + ' sin precio' : '')) + box('Ganancia posible', v.ganancia, 'margen ' + v.margen + '%', 'good') + '</div>' +
      (Object.keys(v.porCat).length > 1 ? '<details class="fin-only" style="margin:-4px 0 14px"><summary class="small strong">Ver por categoría</summary><div class="table-wrap" style="margin-top:8px"><table class="table"><thead><tr><th>Categoría</th><th class="num">Unidades</th><th class="num">Vale (costo)</th><th class="num">Si lo vendés</th><th class="num">Ganancia posible</th></tr></thead><tbody>' + Object.entries(v.porCat).sort((a, b) => b[1].costo - a[1].costo).map(([k, g]) => '<tr><td>' + esc(k) + '</td><td class="num">' + g.u + '</td><td class="num">' + A.ars(g.costo) + '</td><td class="num">' + A.ars(g.venta) + '</td><td class="num strong good">' + A.ars(g.venta - g.costo) + '</td></tr>').join('') + '</tbody></table></div></details>' : ''); };
  if (A.registerWidget) A.registerWidget('stockValor', { t: 'Valor del stock y ganancia posible', s: 4, fn: () => { const v = A.stockValor(); return '<div class="card-head"><h2>Tu stock</h2><div class="spacer"></div><a class="small" href="#inventario">Ver</a></div><div class="sum-line"><span>Vale (costo)</span><b>' + A.ars(v.costo) + '</b></div><div class="sum-line"><span>Si lo vendés todo</span><b>' + A.ars(v.venta) + '</b></div><div class="sum-line"><span>Ganancia posible</span><b class="good">' + A.ars(v.ganancia) + '</b></div><div class="tiny muted">' + v.u + ' unidades · margen ' + v.margen + '%</div>'; } }, true);
  /* Productos con stock y precio que todavía no se ven en la página ni en el cotizador. */
  const pendientes = () => (A.db.inventory || []).filter((it) => Number(it.stock) > 0 && Number(it.venta) > 0 && !enPagina(it) && it.source !== 'Plan canje');
  A.pubPendAviso = () => { if (!(A.isAdmin && A.isAdmin())) return ''; const l = pendientes(); if (!l.length) return ''; return '<div class="note" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span><b>' + l.length + ' producto' + (l.length === 1 ? '' : 's') + ' con stock no se ve' + (l.length === 1 ? '' : 'n') + ' en la página ni en el cotizador:</b> ' + esc(l.slice(0, 4).map((x) => x.name + (x.spec ? ' ' + x.spec : '')).join(', ')) + (l.length > 4 ? ' y ' + (l.length - 4) + ' más' : '') + '.</span><button class="btn-brand btn-sm" data-act="pub-todos">Publicar ' + (l.length === 1 ? 'este' : 'todos') + '</button></div>'; };
  document.addEventListener('click', (ev) => { const b = ev.target.closest('[data-act="pub-todos"]'); if (!b) return; ev.preventDefault(); A.act(async () => { const next = A.clone(A.db), ids = new Set(pendientes().map((x) => x.id)); let n = 0; next.inventory.filter((it) => ids.has(it.id)).forEach((it) => { publicar(next, it, true); n++; }); await A.saveDb(next, 'Publicados en la página: ' + n + ' productos del inventario'); A.render(); }, 'Listo: ya se ven en la página y en el cotizador.'); });
})();
