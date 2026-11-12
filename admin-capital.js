/* ICLUB · Capital: cuánta plata tenés y en qué cuenta está (efectivo, Mercado Pago, bancos, dólares).
   Los cobros, gastos y reintegros se suman solos a su cuenta desde el día que configurás el capital.
   db.capital = { inicio, cuentas:[{id,name,cur,tipo,inicial}], porMedio:{Efectivo,Transferencia}, moves:[{id,at,f,cuenta,amount,kind,nota,grupo,by}] } */
(function () {
  'use strict';
  const A = window.ICA, M = window.ICLUBMetrics; const { esc } = A;
  const TIPOS = [['efectivo', 'Efectivo'], ['billetera', 'Billetera virtual'], ['banco', 'Banco'], ['otro', 'Otro']];
  const SUGERIDAS = [{ name: 'Efectivo', cur: 'ARS', tipo: 'efectivo' }, { name: 'Mercado Pago', cur: 'ARS', tipo: 'billetera' }, { name: 'Banco', cur: 'ARS', tipo: 'banco' }, { name: 'Dólares', cur: 'USD', tipo: 'efectivo' }];
  const cap = () => A.db && A.db.capital && (A.db.capital.cuentas || []).length ? A.db.capital : null;
  const rate = () => Number(A.db.settings && A.db.settings.rate) || 1520;
  const fmt = (n, cur) => A.money(n, cur);
  const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  /* ¿El movimiento ocurrió después de configurar el capital? (lo de antes ya está en el saldo inicial) */
  const despues = (c, m) => {
    const ini = new Date(c.inicio); if (m.at) return new Date(m.at) >= ini;
    const d = M.parseDate(m.f); return !!d && sod(d) > sod(ini);
  };
  const cuentaDe = (c, medio) => {
    const id = /transf|mercado|mp\b|banco|dep[oó]sito/i.test(medio || '') ? c.porMedio && c.porMedio.Transferencia : c.porMedio && c.porMedio.Efectivo;
    return (c.cuentas.find((x) => x.id === id) || c.cuentas.find((x) => x.cur === 'ARS') || c.cuentas[0]).id;
  };

  /* Todos los movimientos de dinero con su cuenta, más el saldo de cada cuenta. */
  A.capitalCalc = () => {
    const c = cap(); if (!c) return null;
    const ev = [], add = (cuenta, amount, x) => { if (!amount) return; ev.push(Object.assign({ cuenta, amount: M.r2(amount) }, x)); };
    for (const [phone, cl] of Object.entries(A.db.clients || {})) for (const m of cl.movs || []) {
      if (m.tipo !== 'Pago' && m.tipo !== 'Reintegro') continue; if (/plan canje|tarjeta pendiente/i.test(m.met || '')) continue; if (!despues(c, m)) continue;
      const base = { at: m.at, f: m.f, kind: m.tipo === 'Pago' ? 'cobro' : 'reintegro', nota: (m.tipo === 'Pago' ? 'Cobro ' : 'Reintegro ') + (cl.name || phone) + (m.doc ? ' · ' + m.doc : ''), phone };
      if (m.efec != null) { add(m.cuentaEf || cuentaDe(c, 'Efectivo'), Number(m.efec) || 0, base); add(m.cuenta || cuentaDe(c, 'Transferencia'), Number(m.transf) || 0, base); }
      else add(m.cuenta || cuentaDe(c, m.met), Number(m.imp) || 0, base);
    }
    for (const g of A.db.gastos || []) {
      if (!despues(c, g)) continue; const usd = /^USD/.test(g.wallet || '');
      const cu = g.cuenta || (usd ? (c.cuentas.find((x) => x.cur === 'USD') || {}).id : null) || cuentaDe(c, g.wallet || g.met || 'Efectivo');
      const acc = c.cuentas.find((x) => x.id === cu) || {}; let v = Number(g.walletAmount != null ? g.walletAmount : g.monto) || 0;
      if (acc.cur === 'USD' && !usd) v = v / rate(); if (acc.cur !== 'USD' && usd) v = v * rate();
      add(cu, -v, { at: g.at, f: g.f, kind: 'gasto', nota: 'Gasto · ' + (g.concepto || '') + (g.cat ? ' (' + g.cat + ')' : '') });
    }
    for (const x of A.db.comprasStock || []) {
      if (!despues(c, x)) continue; const cu = x.cuenta || cuentaDe(c, 'Efectivo'), acc = c.cuentas.find((y) => y.id === cu) || {};
      let v = Number(x.monto) || 0; if (acc.cur === 'USD' && x.cur !== 'USD') v = v / rate(); if (acc.cur !== 'USD' && x.cur === 'USD') v = Number(x.montoArs) || v * rate();
      add(cu, -v, { at: x.at, f: x.f, kind: 'compra', nota: 'Compra de stock · ' + x.qty + ' × ' + (x.name || ''), by: x.by });
    }
    for (const x of c.moves || []) add(x.cuenta, Number(x.amount) || 0, { at: x.at, f: x.f, kind: x.kind, nota: x.nota || '', id: x.id, grupo: x.grupo, by: x.by });
    const when = (e) => (e.at ? new Date(e.at) : M.parseDate(e.f) || new Date(0)).getTime(); ev.sort((a, b) => when(a) - when(b));
    const saldo = {}; c.cuentas.forEach((a) => { saldo[a.id] = Number(a.inicial) || 0; });
    ev.forEach((e) => { if (saldo[e.cuenta] == null) return; saldo[e.cuenta] = M.r2(saldo[e.cuenta] + e.amount); e.saldo = saldo[e.cuenta]; });
    const totalArs = M.r2(c.cuentas.reduce((s, a) => s + (a.cur === 'USD' ? saldo[a.id] * rate() : saldo[a.id]), 0));
    return { c, ev, saldo, totalArs };
  };
  /* Capital total del negocio: plata + mercadería en stock (a costo) + lo que te deben. */
  A.capitalTotal = (k) => {
    const stock = M.r2((A.db.inventory || []).reduce((s, it) => { const q = Number(it.stock) || 0; if (q <= 0) return s; const costo = (Number(it.costo) || 0) * (it.moneda === 'ARS' ? 1 : rate()); return s + q * costo; }, 0));
    const porCobrar = M.r2(M.finance(A.db, {}).k.porCobrar || 0);
    return { dinero: k ? k.totalArs : 0, stock, porCobrar, total: M.r2((k ? k.totalArs : 0) + stock + porCobrar) };
  };

  /* ---------- Pantalla Capital ---------- */
  const setupForm = () => {
    const old = window.ICLUBBusiness && ICLUBBusiness.cashBalances ? ICLUBBusiness.cashBalances(A.db) : null;
    const pre = old ? [{ name: 'Efectivo', cur: 'ARS', tipo: 'efectivo', v: old['ARS-Efectivo'] || 0 }, { name: 'Transferencia', cur: 'ARS', tipo: 'banco', v: old['ARS-Transferencia'] || 0 }, { name: 'Dólares', cur: 'USD', tipo: 'efectivo', v: (old['USD-Efectivo'] || 0) + (old['USD-Transferencia'] || 0) }] : SUGERIDAS.map((x) => Object.assign({ v: '' }, x));
    return '<div class="card"><div class="card-head"><div><h2>Configurá tu capital</h2><p>Poné cuánta plata tenés <b>hoy</b> en cada lugar. Desde ahora, cada cobro y cada gasto se suma o se resta solo en su cuenta.</p></div></div>' +
      '<form id="capSetup" class="grid"><div id="capRows" class="grid">' + pre.map(rowHtml).join('') + '</div><button type="button" class="btn-2 btn-sm" data-act="cap-row">+ Agregar otra cuenta</button>' +
      '<p class="small muted">Ejemplos: Efectivo, Mercado Pago, Banco Galicia, Brubank, Ualá, Dólares. Podés agregar o cambiar cuentas cuando quieras.</p><button class="btn-good">Guardar y empezar</button></form></div>';
  };
  const rowHtml = (x) => '<div class="grid g4 cap-row"><label class="f">Cuenta<input name="name" value="' + esc(x.name || '') + '" placeholder="Ej: Mercado Pago" maxlength="30"></label><label class="f">Tipo<select name="tipo">' + TIPOS.map(([v, l]) => '<option value="' + v + '"' + (x.tipo === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label><label class="f">Moneda<select name="cur"><option value="ARS"' + (x.cur !== 'USD' ? ' selected' : '') + '>Pesos</option><option value="USD"' + (x.cur === 'USD' ? ' selected' : '') + '>Dólares</option></select></label><label class="f">Saldo hoy<input name="v" inputmode="decimal" value="' + esc(x.v === '' ? '' : String(x.v)) + '" placeholder="0"></label></div>';
  const ICON = { efectivo: '<path d="M2 7h20v10H2z"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>', billetera: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h2M3 9h15a3 3 0 0 0 0-3"/>', banco: '<path d="M3 10h18L12 4z"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>', otro: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>' };
  const ico = (t) => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[t] || ICON.otro) + '</svg>';

  A.extra = A.extra || {};
  A.extra.capital = () => {
    const head = '<div class="page-head"><div><h1>Capital</h1><p>Cuánta plata tenés y dónde está</p></div></div>';
    const k = A.capitalCalc(); if (!k) return head + setupForm();
    const t = A.capitalTotal(k), c = k.c, hoy = new Date(); const mesKey = M.monthKey(hoy);
    const mes = k.ev.filter((e) => { const d = e.at ? new Date(e.at) : M.parseDate(e.f); return d && M.monthKey(d) === mesKey && e.kind !== 'transfer' && e.kind !== 'ajuste'; });
    const entro = M.r2(mes.filter((e) => e.amount > 0).reduce((s, e) => s + toArs(c, e), 0)), salio = M.r2(mes.filter((e) => e.amount < 0).reduce((s, e) => s - toArs(c, e), 0));
    return head +
      '<div class="cap-hero"><div><span class="lbl">Capital disponible</span><span class="cap-total">' + A.ars(k.totalArs) + '</span><span class="sub">en ' + c.cuentas.length + ' cuenta' + (c.cuentas.length === 1 ? '' : 's') + (c.cuentas.some((a) => a.cur === 'USD') ? ' · dólares a ' + A.ars(rate()) : '') + '</span></div><div class="cap-mes"><div><span>Entró este mes</span><b class="good">+' + A.ars(entro) + '</b></div><div><span>Salió este mes</span><b class="bad">−' + A.ars(salio) + '</b></div></div></div>' +
      '<div class="row-flex" style="margin:14px 0;gap:8px;flex-wrap:wrap"><button class="btn-brand" data-act="cap-move" data-k="transfer">⇄ Pasar entre cuentas</button><button class="btn-good" data-act="cap-move" data-k="ingreso">+ Ingreso</button><button class="btn-2" data-act="cap-move" data-k="retiro">− Retiro o pago</button><button class="btn-2" data-act="cap-move" data-k="ajuste">Ajustar saldo</button><button class="btn-2" data-act="cap-cuentas">Cuentas</button></div>' +
      '<div class="cap-grid">' + c.cuentas.map((a) => { const pct = k.totalArs > 0 ? Math.max(0, Math.round((a.cur === 'USD' ? k.saldo[a.id] * rate() : k.saldo[a.id]) / k.totalArs * 100)) : 0; return '<button class="cap-acc" data-act="cap-acc" data-id="' + esc(a.id) + '"><span class="cap-ico t-' + esc(a.tipo || 'otro') + '">' + ico(a.tipo) + '</span><span class="cap-name">' + esc(a.name) + '</span><span class="cap-amt' + (k.saldo[a.id] < 0 ? ' bad' : '') + '">' + fmt(k.saldo[a.id], a.cur) + '</span><span class="cap-bar"><i style="width:' + pct + '%"></i></span><span class="tiny muted">' + pct + '% de tu plata' + (a.cur === 'USD' ? ' · ≈ ' + A.ars(k.saldo[a.id] * rate()) : '') + '</span></button>'; }).join('') + '</div>' +
      '<div class="card" style="margin-top:16px"><div class="card-head"><div><h2>Capital total del negocio</h2><p>La plata que tenés, más lo que tenés en mercadería y lo que te deben.</p></div></div>' +
      '<div class="cap-sum"><div><span>Plata en cuentas</span><b>' + A.ars(t.dinero) + '</b></div><span class="op">+</span><div><span>Mercadería en stock (a costo)</span><b>' + A.ars(t.stock) + '</b></div><span class="op">+</span><div><span>Te deben los clientes</span><b>' + A.ars(t.porCobrar) + '</b></div><span class="op">=</span><div class="tot"><span>Capital total</span><b>' + A.ars(t.total) + '</b></div></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-head"><h2>Últimos movimientos</h2><div class="spacer"></div><span class="small muted">desde ' + new Date(c.inicio).toLocaleDateString('es-AR') + '</span></div>' + movList(k, k.ev.slice(-25).reverse(), true) + '</div>';
  };
  const toArs = (c, e) => { const a = c.cuentas.find((x) => x.id === e.cuenta); return a && a.cur === 'USD' ? e.amount * rate() : e.amount; };
  const KIND = { compra: 'Compra de stock', cobro: 'Cobro', gasto: 'Gasto', reintegro: 'Reintegro', transfer: 'Entre cuentas', ingreso: 'Ingreso', retiro: 'Retiro', ajuste: 'Ajuste' };
  const movList = (k, list, showAcc) => list.length ? '<div class="list">' + list.map((e) => { const a = k.c.cuentas.find((x) => x.id === e.cuenta) || {}; return '<div class="item"' + (e.phone ? ' data-act="fin-client" data-phone="' + esc(e.phone) + '" style="cursor:pointer"' : '') + '><div class="grow"><div class="strong" style="font-size:14px">' + esc(e.nota || KIND[e.kind] || '') + '</div><div class="sub-t">' + esc(e.f || (e.at ? new Date(e.at).toLocaleDateString('es-AR') : '')) + ' · ' + esc(KIND[e.kind] || e.kind) + (showAcc ? ' · ' + esc(a.name || '') : '') + (e.by ? ' · ' + esc(e.by) : '') + '</div></div><div style="text-align:right"><b class="' + (e.amount < 0 ? 'bad' : 'good') + '">' + (e.amount < 0 ? '−' : '+') + fmt(Math.abs(e.amount), a.cur) + '</b>' + (!showAcc ? '<div class="tiny muted">saldo ' + fmt(e.saldo, a.cur) + '</div>' : '') + '</div>' + (e.id && !e.grupo ? '<button class="btn-sm btn-2" data-act="cap-del" data-id="' + esc(e.id) + '" title="Borrar este movimiento" style="margin-left:8px">✕</button>' : e.id ? '<button class="btn-sm btn-2" data-act="cap-del" data-id="' + esc(e.id) + '" title="Borrar este pase" style="margin-left:8px">✕</button>' : '') + '</div>'; }).join('') + '</div>' : '<div class="empty" style="padding:20px">Todavía no hay movimientos.</div>';

  /* ---------- Modales ---------- */
  const accOpts = (c, sel, name) => '<select name="' + name + '">' + c.cuentas.map((a) => '<option value="' + esc(a.id) + '"' + (a.id === sel ? ' selected' : '') + '>' + esc(a.name) + (a.cur === 'USD' ? ' (USD)' : '') + '</option>').join('') + '</select>';
  A.capAcc = (id) => {
    const k = A.capitalCalc(); const a = k && k.c.cuentas.find((x) => x.id === id); if (!a) return;
    A.modal(a.name, '<div class="cap-hero" style="margin-bottom:12px"><div><span class="lbl">Saldo</span><span class="cap-total">' + fmt(k.saldo[a.id], a.cur) + '</span><span class="sub">Saldo inicial ' + fmt(a.inicial, a.cur) + ' el ' + new Date(k.c.inicio).toLocaleDateString('es-AR') + '</span></div></div>' + movList(k, k.ev.filter((e) => e.cuenta === id).reverse(), false), { wide: true, noFocus: true });
  };
  A.capMove = (kind) => {
    const k = A.capitalCalc(); if (!k) return; const c = k.c, first = c.cuentas[0].id, second = (c.cuentas[1] || c.cuentas[0]).id;
    const T = { transfer: 'Pasar plata entre cuentas', ingreso: 'Ingreso de plata', retiro: 'Retiro o pago', ajuste: 'Ajustar saldo de una cuenta' }[kind];
    const P = { transfer: 'Ej: deposité el efectivo en el banco, o pasé de Mercado Pago a Brubank.', ingreso: 'Plata que entra y no es un cobro a un cliente: un aporte, una venta suelta, un préstamo.', retiro: 'Plata que sale y no es un gasto del negocio: un retiro tuyo, compra de mercadería, pago a un referidor.', ajuste: 'Si el saldo no coincide con lo que tenés de verdad, poné el saldo real y el sistema registra la diferencia.' }[kind];
    const body = '<p class="small muted">' + P + '</p><form id="capMoveForm" data-k="' + kind + '" class="grid">' +
      (kind === 'transfer' ? '<div class="grid g2"><label class="f">Desde' + accOpts(c, first, 'from') + '</label><label class="f">Hacia' + accOpts(c, second, 'to') + '</label></div><div class="grid g2"><label class="f">Importe que sale<input name="amount" inputmode="decimal" required></label><label class="f">Importe que llega<input name="amount2" inputmode="decimal" placeholder="Igual al que sale"><small>Solo si es distinto (comisión, o cambio de pesos a dólares).</small></label></div>'
        : kind === 'ajuste' ? '<div class="grid g2"><label class="f">Cuenta' + accOpts(c, first, 'cuenta') + '</label><label class="f">Saldo real hoy<input name="real" inputmode="decimal" required></label></div><p class="small" id="capAjHint"></p>'
          : '<div class="grid g2"><label class="f">Cuenta' + accOpts(c, first, 'cuenta') + '</label><label class="f">Importe<input name="amount" inputmode="decimal" required></label></div>') +
      '<label class="f">Detalle<input name="nota" maxlength="80" placeholder="' + ({ transfer: 'Ej: depósito del efectivo de la semana', ingreso: 'Ej: aporte de capital', retiro: 'Ej: compra de 3 iPhone 15', ajuste: 'Ej: conté la caja' }[kind]) + '"></label><button class="btn-good">Guardar</button></form>';
    A.modal(T, body, { noFocus: true });
    if (kind === 'ajuste') { const f = A.$('#capMoveForm'), h = A.$('#capAjHint'); const upd = () => { const a = c.cuentas.find((x) => x.id === f.elements.cuenta.value), v = A.num(f.elements.real.value); h.textContent = 'Saldo en el sistema: ' + fmt(k.saldo[a.id], a.cur) + (f.elements.real.value ? ' · diferencia ' + fmt(M.r2(v - k.saldo[a.id]), a.cur) : ''); }; f.addEventListener('input', upd); upd(); }
  };
  A.capCuentas = () => {
    const k = A.capitalCalc(); if (!k) return; const c = k.c;
    A.modal('Cuentas', '<p class="small muted">Cambiá nombres, agregá cuentas nuevas y elegí a dónde van solos los cobros.</p><form id="capCuentasForm" class="grid"><div id="capRows" class="grid">' + c.cuentas.map((a) => rowHtml({ name: a.name, tipo: a.tipo, cur: a.cur, v: a.inicial }).replace('class="grid g4 cap-row"', 'class="grid g4 cap-row" data-id="' + esc(a.id) + '"').replace('Saldo hoy', 'Saldo inicial')).join('') + '</div><button type="button" class="btn-2 btn-sm" data-act="cap-row">+ Agregar cuenta</button>' +
      '<div class="grid g2"><label class="f">Cobros en efectivo van a' + accOpts(c, c.porMedio && c.porMedio.Efectivo, 'pmEf') + '</label><label class="f">Transferencias y Mercado Pago van a' + accOpts(c, c.porMedio && c.porMedio.Transferencia, 'pmTr') + '</label></div><p class="tiny muted">Para borrar una cuenta, dejá el nombre vacío (solo si no tiene movimientos).</p><button class="btn-good">Guardar cuentas</button></form>', { wide: true, noFocus: true });
  };
  const readRows = (f) => [...f.querySelectorAll('.cap-row')].map((r) => ({ id: r.dataset.id || '', name: r.querySelector('[name=name]').value.trim(), tipo: r.querySelector('[name=tipo]').value, cur: r.querySelector('[name=cur]').value, inicial: M.r2(A.num(r.querySelector('[name=v]').value)) }));

  const saveSetup = (f) => A.act(async () => {
    const rows = readRows(f).filter((r) => r.name); if (!rows.length) throw Error('Agregá al menos una cuenta.');
    const cuentas = rows.map((r) => ({ id: A.uid(), name: r.name.slice(0, 30), tipo: r.tipo, cur: r.cur, inicial: r.inicial }));
    const ef = cuentas.find((a) => a.tipo === 'efectivo' && a.cur === 'ARS') || cuentas[0], tr = cuentas.find((a) => a.tipo !== 'efectivo' && a.cur === 'ARS') || ef;
    const next = A.clone(A.db); next.capital = { inicio: new Date().toISOString(), cuentas, porMedio: { Efectivo: ef.id, Transferencia: tr.id }, moves: [] };
    await A.saveDb(next, 'Capital configurado'); A.render();
  }, 'Listo: tu capital ya está andando.');
  const saveCuentas = (f) => A.act(async () => {
    const k = A.capitalCalc(), rows = readRows(f), next = A.clone(A.db), c = next.capital; const usadas = new Set(k.ev.map((e) => e.cuenta));
    const cuentas = []; for (const r of rows) { const old = r.id && c.cuentas.find((a) => a.id === r.id); if (!r.name) { if (old && usadas.has(old.id)) throw Error('"' + old.name + '" tiene movimientos: no se puede borrar. Pasá su saldo a otra cuenta y dejala con otro nombre.'); continue; } cuentas.push(Object.assign(old || { id: A.uid() }, { name: r.name.slice(0, 30), tipo: r.tipo, cur: r.cur, inicial: r.inicial })); }
    if (!cuentas.length) throw Error('Tiene que quedar al menos una cuenta.');
    c.cuentas = cuentas; const ids = new Set(cuentas.map((a) => a.id)); c.porMedio = { Efectivo: ids.has(f.elements.pmEf.value) ? f.elements.pmEf.value : cuentas[0].id, Transferencia: ids.has(f.elements.pmTr.value) ? f.elements.pmTr.value : cuentas[0].id };
    await A.saveDb(next, 'Cuentas del capital actualizadas'); A.closeModal(); A.render();
  }, 'Cuentas guardadas.');
  const saveMove = (f) => A.act(async () => {
    const kind = f.dataset.k, e = f.elements, k = A.capitalCalc(), next = A.clone(A.db), c = next.capital, by = (A.me && A.me.name) || '';
    const base = { at: new Date().toISOString(), f: A.today(), kind, nota: e.nota.value.trim().slice(0, 80), by }; const moves = [];
    if (kind === 'transfer') { const a = A.num(e.amount.value), b = e.amount2.value ? A.num(e.amount2.value) : a; if (!(a > 0) || !(b > 0)) throw Error('Poné el importe.'); if (e.from.value === e.to.value) throw Error('Elegí dos cuentas distintas.'); const g = A.uid(); const na = (id) => (c.cuentas.find((x) => x.id === id) || {}).name; moves.push(Object.assign({}, base, { id: A.uid(), grupo: g, cuenta: e.from.value, amount: -M.r2(a), nota: base.nota || 'Pase a ' + na(e.to.value) }), Object.assign({}, base, { id: A.uid(), grupo: g, cuenta: e.to.value, amount: M.r2(b), nota: base.nota || 'Pase desde ' + na(e.from.value) })); }
    else if (kind === 'ajuste') { const real = A.num(e.real.value); if (!Number.isFinite(real) || e.real.value === '') throw Error('Poné el saldo real.'); const dif = M.r2(real - k.saldo[e.cuenta.value]); if (Math.abs(dif) < 0.01) throw Error('El saldo ya coincide, no hay nada que ajustar.'); moves.push(Object.assign({}, base, { id: A.uid(), cuenta: e.cuenta.value, amount: dif, nota: base.nota || 'Ajuste de saldo' })); }
    else { const n = A.num(e.amount.value); if (!(n > 0)) throw Error('Poné el importe.'); moves.push(Object.assign({}, base, { id: A.uid(), cuenta: e.cuenta.value, amount: kind === 'retiro' ? -M.r2(n) : M.r2(n), nota: base.nota || KIND[kind] })); }
    c.moves = (c.moves || []).concat(moves); await A.saveDb(next, 'Capital: ' + KIND[kind] + (base.nota ? ' · ' + base.nota : '')); A.closeModal(); A.render();
  }, 'Movimiento guardado.');
  const delMove = (id) => A.act(async () => {
    const next = A.clone(A.db), c = next.capital, m = (c.moves || []).find((x) => x.id === id); if (!m) return false;
    if (!confirm('¿Borrar este movimiento' + (m.grupo ? ' (y su pase en la otra cuenta)' : '') + '?')) return false;
    c.moves = c.moves.filter((x) => x.id !== id && !(m.grupo && x.grupo === m.grupo)); await A.saveDb(next, 'Capital: movimiento borrado'); A.closeModal(); A.render();
  }, 'Movimiento borrado.');

  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act^="cap-"]'); if (!b) return; ev.preventDefault(); const d = b.dataset;
    if (d.act === 'cap-row') { const box = A.$('#capRows'); if (box) box.insertAdjacentHTML('beforeend', rowHtml({ name: '', cur: 'ARS', tipo: 'banco', v: '' })); }
    else if (d.act === 'cap-acc') A.capAcc(d.id); else if (d.act === 'cap-move') A.capMove(d.k); else if (d.act === 'cap-cuentas') A.capCuentas(); else if (d.act === 'cap-del') delMove(d.id);
  });
  document.addEventListener('submit', (ev) => { const f = ev.target; if (f.id === 'capSetup') saveSetup(f); else if (f.id === 'capCuentasForm') saveCuentas(f); else if (f.id === 'capMoveForm') saveMove(f); });

  /* ---------- Menú: "Capital disponible" con el monto ---------- */
  const navUpdate = () => { const el = A.$('#navCapital'); if (!el) return; let k = null; try { k = A.capitalCalc(); } catch (_) {} el.textContent = k ? A.ars(k.totalArs) : 'Configurar'; el.style.color = k && k.totalArs < 0 ? '#f87171' : ''; };
  const r0 = A.render; A.render = (...a) => { const out = r0.apply(null, a); try { navUpdate(); } catch (_) {} return out; };
  if (A.registerWidget) A.registerWidget('capital', { t: 'Capital disponible', s: 4, fn: () => { const k = A.capitalCalc(); if (!k) return '<div class="card-head"><h2>Capital disponible</h2></div><p class="small muted">Configurá tus cuentas y vas a ver acá cuánta plata tenés y dónde.</p><a class="btn btn-brand btn-sm" href="#capital">Configurar</a>'; return '<div class="card-head"><h2>Capital disponible</h2><div class="spacer"></div><a class="small" href="#capital">Ver</a></div><div class="cap-total" style="font-size:28px">' + A.ars(k.totalArs) + '</div>' + k.c.cuentas.map((a) => '<div class="sum-line"><span>' + esc(a.name) + '</span><b>' + fmt(k.saldo[a.id], a.cur) + '</b></div>').join(''); } }, true);

  /* ---------- Elegir la cuenta al cobrar y al cargar un gasto ---------- */
  A.capCuentaSelect = (name, medio, label) => { const c = cap(); if (!c) return ''; let last = ''; try { last = localStorage.getItem('iclub-cap-' + name) || ''; } catch (_) {} const def = (medio === 'transfer' && c.cuentas.some((a) => a.id === last)) ? last : cuentaDe(c, medio === 'transfer' ? 'Transferencia' : 'Efectivo'); return '<label class="f fin-only">' + esc(label) + '<select name="' + name + '">' + c.cuentas.filter((a) => a.cur === 'ARS').map((a) => '<option value="' + esc(a.id) + '"' + (a.id === def ? ' selected' : '') + '>' + esc(a.name) + '</option>').join('') + '</select></label>'; };
  A.capCuentas_ = () => { const c = cap(); return c ? c.cuentas : []; };
  A.capRemember = (name, v) => { try { if (v) localStorage.setItem('iclub-cap-' + name, v); } catch (_) {} };
  document.addEventListener('change', (ev) => {
    const t = ev.target; if (t.name !== 'method' || !t.form || t.form.id !== 'payForm') return; const sel = t.form.elements.cuenta, c = cap(); if (!sel || !c) return;
    let last = ''; try { last = localStorage.getItem('iclub-cap-cuenta') || ''; } catch (_) {}
    sel.value = t.value === 'Efectivo' ? cuentaDe(c, 'Efectivo') : (c.cuentas.some((a) => a.id === last) ? last : cuentaDe(c, 'Transferencia'));
    const lab = sel.closest('label'); if (lab && lab.firstChild && lab.firstChild.nodeType === 3) lab.firstChild.textContent = t.value === 'Combinado' ? '¿A qué cuenta entró la transferencia?' : '¿A qué cuenta entró?';
  });
  A.capCuentaDe = (medio) => { const c = cap(); return c ? cuentaDe(c, medio) : ''; };
})();
