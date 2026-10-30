/* ICLUB · Panel de administración · base: datos, guardado, cobros y comprobantes. */
(function () {
  'use strict';
  const B = window.ICLUBBusiness, P = window.ICLUBCollectionPlan, M = window.ICLUBMetrics;
  const A = window.ICA = {};
  A.$ = (s, el) => (el || document).querySelector(s); A.$$ = (s, el) => [...(el || document).querySelectorAll(s)];
  A.esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  A.ars = (v) => '$ ' + nf.format(M.r2(Number(v) || 0));
  A.usd = (v) => 'USD ' + nf.format(M.r2(Number(v) || 0));
  A.money = (v, cur) => (cur === 'USD' ? A.usd(v) : A.ars(v));
  A.num = (v) => { const s = String(v ?? '').trim().replace(/\s|\$/g, ''); if (!s) return 0; if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.')); if (/,\d{1,2}$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.')); return Number(s.replace(/,/g, '')); };
  /* Porcentajes: punto o coma siempre son decimales (27.675% no es 27675%). */
  A.pct = (v) => { const t = String(v ?? '').trim().replace('%', '').replace(',', '.'); return t === '' ? 0 : Number(t); };
  A.initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
  A.first = (n) => String(n || '').trim().split(/\s+/)[0] || '';
  A.uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  A.today = () => B.dateLabel(B.localISO());
  A.dayName = (dt) => { const t = M.startOfDay(new Date()), d = M.startOfDay(dt), diff = Math.round((d - t) / 864e5); if (diff === 0) return 'Hoy'; if (diff === 1) return 'Mañana'; if (diff === -1) return 'Ayer'; const s = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); };
  A.wa = (phone) => { let d = String(phone || '').replace(/\D/g, ''); if (!d) return ''; if (d.indexOf('54') !== 0) d = '549' + d.replace(/^0/, '').replace(/^15/, ''); else if (d.indexOf('549') !== 0) d = '549' + d.slice(2); return d; };
  A.waLink = (phone, text) => 'https://wa.me/' + (phone ? A.wa(phone) : '') + '?text=' + encodeURIComponent(text);
  A.rate = () => Number(A.db && A.db.settings && A.db.settings.rate) || 1520;
  A.chip = (txt, cls) => '<span class="chip ' + (cls || '') + '">' + A.esc(txt) + '</span>';
  A.icon = (name) => ({
    home: 'M3 11l9-8 9 8 M5 10v10h14V10', sell: 'M3 6h18l-2 12H5z M8 6V4h8v2 M12 10v5 M9.5 12.5h5', list: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8',
    box: 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10', web: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18', stats: 'M4 20V10 M10 20V4 M16 20v-8 M22 20H2',
    money: 'M2 6h20v12H2z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M6 12h.01 M18 12h.01', ref: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M19 8v6 M16 11h6', inv: 'M3 17l6-6 4 4 8-8 M14 7h7v7', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'
  })[name] || '';
  A.svg = (name) => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + A.icon(name) + '"/></svg>';

  /* Estado */
  A.api = new ICLUBPortalApi(supabase.createClient(ICLUBData.config.url, ICLUBData.config.key));
  A.db = null; A.refs = null; A.net = null; A.busy = false; A.warn = ''; A.snap = null;
  A.rpc = (name, args) => A.api.call(name, Object.assign({ p_token: A.api.token }, args || {}));
  A.normalize = (d) => { d = d || {}; d.clients = d.clients || {}; d.catalog = d.catalog || {}; d.settings = d.settings || {}; d.ventas = (d.ventas || []).map((x, i) => ({ ...x, id: x.id || 'legacy-sale-' + i })); d.inventory = (d.inventory || []).map((x, i) => ({ ...x, id: x.id || 'legacy-inventory-' + i })); return d; };
  A.clone = (x) => JSON.parse(JSON.stringify(x));
  A.toast = (msg, bad) => { let t = A.$('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.style.background = bad ? '#991b1b' : '#0f172a'; t.hidden = false; clearTimeout(A._tt); A._tt = setTimeout(() => (t.hidden = true), bad ? 7000 : 3200); };
  A.load = async () => {
    const res = await A.api.read();
    if (res.user !== 'admin') { location.assign('/portal'); return; }
    A.db = A.normalize(res.data); const warns = [];
    const [refs, net] = await Promise.all([A.rpc('iclub_ref_read').catch((e) => ({ error: e.message })), A.rpc('iclub_net_read').catch((e) => ({ error: e.message }))]);
    A.refs = refs.error ? null : refs; A.net = net.error ? null : net;
    if (!A.refs) warns.push('Referidos no respondió: ' + refs.error + '. Revisá que ACTUALIZAR-SUPABASE.sql esté instalado.');
    if (!A.net) warns.push('Falta instalar migraciones/11-red-comercial.sql en Supabase: listas de precios, inversores, estadísticas y copia semanal no van a funcionar hasta ejecutarlo.');
    A.warn = warns.join('\n');
    if (A.net && !A.snap) A.rpc('iclub_snapshot_weekly', { p_force: false }).then((r) => { A.snap = r; if (r.created) A.reloadNet().then(() => A.render()); }).catch(() => {});
    A.render();
  };
  A.reloadRefs = async () => { try { A.refs = await A.rpc('iclub_ref_read'); } catch (_) {} };
  A.reloadNet = async () => { try { A.net = await A.rpc('iclub_net_read'); } catch (_) {} };
  A.saveDb = async (next) => { const r = await A.api.write(next); A.db = A.normalize(r.data); ICLUBData.invalidate && ICLUBData.invalidate(); return r; };
  A.applyServer = (r) => { if (r && r.data) { A.db = A.normalize(r.data); if (r.version) A.api.version = r.version; } };
  A.act = async (fn, okMsg) => {
    if (A.busy) return; A.busy = true; document.body.classList.add('busy');
    try { const r = await fn(); if (r !== false && okMsg) A.toast(okMsg); return r; }
    catch (e) { const m = String(e.message || e); A.toast(/Otro dispositivo|otro dispositivo/.test(m) ? m + '\nTocá Actualizar y volvé a intentar.' : m, true); }
    finally { A.busy = false; document.body.classList.remove('busy'); }
  };
  A.refChange = async (action, item) => { const r = await A.rpc('iclub_ref_change', { p_revision: A.refs.revision, p_action: action, p_item: item }); await A.reloadRefs(); return r; };
  A.netChange = async (action, item) => { if (!A.net) throw Error('Instalá primero migraciones/11-red-comercial.sql.'); const r = await A.rpc('iclub_net_change', { p_revision: A.net.revision, p_action: action, p_item: item }); await A.reloadNet(); return r; };

  /* Ventana modal */
  A.modal = (title, body, opt) => {
    let d = A.$('#modal'); if (!d) { d = document.createElement('dialog'); d.id = 'modal'; document.body.appendChild(d); d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); }
    d.className = 'modal' + (opt && opt.wide ? ' wide' : '');
    d.innerHTML = '<div class="modal-head"><h2>' + A.esc(title) + '</h2><button class="x" data-close aria-label="Cerrar">×</button></div><div class="modal-body">' + body + '</div>';
    if (!d.open) d.showModal(); const f = d.querySelector('input:not([type=hidden]):not([readonly]),select,textarea'); if (f && !(opt && opt.noFocus)) setTimeout(() => f.focus(), 30);
    return d;
  };
  A.closeModal = () => { const d = A.$('#modal'); if (d && d.open) d.close(); };
  document.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) A.closeModal(); });

  /* ===== Cobros ===== */
  A.planOf = (phone, doc) => { const c = A.db.clients[phone]; return c && (c.movs || []).find((m) => m.doc === doc && m.tipo === 'Compra'); };
  A.balanceFor = (phone, doc) => {
    const c = A.db.clients[phone], pm = A.planOf(phone, doc); if (!c || !pm) return 0;
    const account = M.saldo(c);
    if (pm.finan) return M.r2(Math.max(0, Math.min(account, P._planCalc(c, pm).pendiente)));
    const s = A.db.ventas.find((x) => x.invoice === doc || x.id === pm.grp); return M.r2(Math.max(0, Math.min(account, s ? B.saleData(A.db, s).balance : account)));
  };
  A.openPay = (phone, doc) => {
    const c = A.db.clients[phone]; if (!c) return;
    const plans = (c.movs || []).filter((m) => m.tipo === 'Compra' && A.balanceFor(phone, m.doc) > 0.005);
    if (!doc) { if (plans.length === 1) doc = plans[0].doc; else if (!plans.length) { A.toast('Este cliente no tiene saldo pendiente.'); return; } else { A.modal('¿Qué compra paga ' + A.first(c.name) + '?', '<div class="list">' + plans.map((pm) => '<div class="item clickable" data-act="pay" data-phone="' + A.esc(phone) + '" data-doc="' + A.esc(pm.doc) + '"><div class="grow"><div class="main-t">' + A.esc(pm.prodName || String(pm.det || pm.doc).split(' · ')[0]) + '</div><div class="sub-t">' + A.esc(pm.doc + ' · ' + pm.f) + '</div></div><div class="amt">' + A.ars(A.balanceFor(phone, pm.doc)) + '</div></div>').join('') + '</div>'); return; } }
    const pm = A.planOf(phone, doc), balance = A.balanceFor(phone, doc); const pc = pm.finan ? P._planCalc(c, pm) : null; const q = pc && pc.prox; const due = q ? M.r2(Math.min(balance, q.req - q.paid)) : balance;
    const resto = pm.finan ? P._restoTras(c, pm, 0) : null;
    const body = '<div class="chosen"><div class="avatar">' + A.esc(A.initials(c.name)) + '</div><div class="grow"><div class="strong">' + A.esc(c.name) + '</div><div class="small muted">' + A.esc((pm.prodName || String(pm.det || '').split(' · ')[0]) + ' · ' + doc) + '</div></div><div class="right"><div class="small muted">Saldo</div><div class="strong">' + A.ars(balance) + '</div></div></div>' +
      (q ? '<p class="small">' + (q.paid > 0 ? 'Resto de la cuota ' : 'Cuota ') + q.n + ' de ' + pc.n + ' · ' + (q.dt < M.startOfDay(new Date()) ? '<b class="bad">venció el ' + q.d + '</b>' : 'vence el ' + q.d) + ' · falta <b>' + A.ars(due) + '</b></p>' : '') +
      (resto ? '<div class="note warn">La cuota ' + resto.n + ' tiene un resto de <b>' + A.ars(resto.monto) + '</b>. Si no lo debe, resolvelo sin cobrar:<div class="row-flex" style="margin-top:8px">' + (resto.esUltima ? '' : '<button class="btn-2 btn-sm" data-act="resto-now" data-dest="next">Sumar a la próxima</button><button class="btn-2 btn-sm" data-act="resto-now" data-dest="last">Pasar a la última</button>') + '<button class="btn-2 btn-sm" data-act="resto-now" data-dest="perdon">Perdonar</button></div></div>' : '') +
      '<form id="payForm" data-phone="' + A.esc(phone) + '" data-doc="' + A.esc(doc) + '" class="grid"><div class="grid g2"><label class="f">Importe recibido<input name="amount" inputmode="decimal" value="' + due + '" required></label><label class="f">Medio<select name="method"><option>Efectivo</option><option>Transferencia</option><option>Combinado</option></select></label></div>' +
      '<div id="combBox" class="grid g2" hidden><label class="f">En efectivo<input name="efec" inputmode="decimal"></label><label class="f">Por transferencia<input name="transf" inputmode="decimal"><small id="combHint"></small></label></div>' +
      '<div id="adelBox" hidden class="note"><b id="adelTitle"></b><div class="options" style="margin-top:8px"><button type="button" class="on" data-sinint="0">Con interés: cada cuota adelantada vale ' + (pc ? A.ars(pc.cuotaImp) : '') + '</button><button type="button" data-sinint="1">Sin interés: se cobran a valor contado ' + (pc ? A.ars(pc.capImp) : '') + '</button></div><input type="hidden" name="sinInt" value="0"><small id="adelHint" class="muted"></small></div>' +
      '<div class="options">' + (q ? '<button type="button" class="btn-sm" data-fill="' + due + '">' + (q.paid > 0 ? 'Resto de cuota' : 'Cuota ' + q.n) + ' · ' + A.ars(due) + '</button>' : '') + '<button type="button" class="btn-sm" data-fill="' + balance + '">Todo · ' + A.ars(balance) + '</button></div>' +
      '<div id="restoBox" hidden><label class="f">Queda un resto en la cuota. ¿Qué hacemos?<select name="resto"><option value="">Dejarlo pendiente en esa cuota</option><option value="next">Sumarlo a la próxima cuota</option><option value="last">Pasarlo a la última cuota</option><option value="perdon">Perdonarlo (nota de crédito)</option></select></label><p id="restoHint" class="small muted"></p></div>' +
      '<p class="small muted">Registrá solo dinero que efectivamente recibiste.</p><button class="btn-good">Registrar pago</button></form>';
    A.modal('Registrar pago', body); A.payHint();
  };
  A.payHint = () => {
    const f = A.$('#payForm'); if (!f) return; const c = A.db.clients[f.dataset.phone], pm = A.planOf(f.dataset.phone, f.dataset.doc); const box = A.$('#restoBox');
    const comb = f.elements.method.value === 'Combinado'; A.$('#combBox').hidden = !comb;
    if (comb) { const sum = A.num(f.elements.efec.value) + A.num(f.elements.transf.value), tot = A.num(f.elements.amount.value); A.$('#combHint').textContent = !sum ? 'Repartí el importe entre efectivo y transferencia.' : Math.abs(sum - tot) < 0.005 ? '✓ Coincide con el importe.' : 'Suman ' + A.ars(sum) + ' · diferencia ' + A.ars(Math.abs(tot - sum)); }
    if (pm && pm.finan) { const pc = P._planCalc(c, pm), q = pc.prox, a = A.num(f.elements.amount.value); const falta = q ? q.req - q.paid : 0; const show = q && a > falta + 2 && pc.recPct > 0 && !pc.esContado; A.$('#adelBox').hidden = !show; if (show) { A.$('#adelTitle').textContent = 'Este pago cubre ' + A.ars(falta) + ' de la cuota ' + q.n + ' y adelanta ' + A.ars(a - falta) + '. ¿Cómo tomás el adelanto?'; A.$('#adelHint').textContent = f.elements.sinInt.value === '1' ? 'Se emite una nota de crédito por el recargo que le perdonás.' : 'El excedente cubre las cuotas siguientes a su valor normal.'; } else f.elements.sinInt.value = '0'; }
    if (!pm || !pm.finan) { box.hidden = true; return; }
    const a = A.num(f.elements.amount.value), r = a > 0 ? P._restoTras(c, pm, a) : null, before = P._restoTras(c, pm, 0);
    const show = r && !(before && before.i === r.i && Math.abs(before.monto - r.monto) < 0.005);
    box.hidden = !show; if (show) { [...f.elements.resto.options].forEach((o) => { if (o.value === 'next' || o.value === 'last') o.hidden = r.esUltima; }); A.$('#restoHint').textContent = 'La cuota ' + r.n + ' queda con ' + A.ars(r.monto) + ' pendiente. ' + P._restoTexto(f.elements.resto.value, r) + '.'; } else f.elements.resto.value = '';
  };
  A.applyResto = (next, phone, doc, destino) => {
    if (!destino) return null; const c = next.clients[phone], pm = c.movs.find((m) => m.doc === doc && m.finan); if (!pm) return null;
    const r = P._restoTras(c, pm, 0); if (!r) return null; if (r.esUltima && destino !== 'perdon') throw Error('Es la última cuota: el resto solo puede quedar pendiente o perdonarse.');
    const nc = 'NC 0003-' + String(next.nextNc || 1).padStart(6, '0'); c.movs = P._resolverResto(c, pm, r, destino, nc); if (destino === 'perdon') next.nextNc = (next.nextNc || 1) + 1; return r;
  };
  A.savePayment = (f) => A.act(async () => {
    const phone = f.dataset.phone, doc = f.dataset.doc, amount = M.r2(A.num(f.elements.amount.value)), balance = A.balanceFor(phone, doc);
    if (!(amount > 0)) throw Error('Ingresá un importe válido.'); if (amount > balance + 0.005) throw Error('El pago supera el saldo de ' + A.ars(balance) + '.');
    const next = A.clone(A.db), c = next.clients[phone], pm = c.movs.find((m) => m.doc === doc && m.tipo === 'Compra');
    let det = 'Pago de ' + doc, label = pm.prodName || String(pm.det || '').split(' · ')[0];
    if (pm.finan) { const before = P._planCalc(c, pm); const after = P._planCalc({ ...c, movs: c.movs.concat([{ f: A.today(), tipo: 'Pago', imp: amount, plan: doc }]) }, pm); const from = before.pagadas + 1, to = after.pagadas; det = (to > from ? 'Cuotas ' + from + ' a ' + to : to === from ? 'Cuota ' + from : 'Pago parcial de la cuota ' + from) + ' de ' + pm.finan.n + ' · ' + label; }
    const rc = 'RC 0002-' + String(next.nextRc || 1).padStart(8, '0'); next.nextRc = (next.nextRc || 1) + 1;
    let met = f.elements.method.value;
    if (met === 'Combinado') { const ef = A.num(f.elements.efec.value), tr = A.num(f.elements.transf.value); if (Math.abs(ef + tr - amount) > 0.005) throw Error('Efectivo + transferencia deben sumar ' + A.ars(amount) + '.'); met = 'Combinado (efectivo ' + A.ars(ef) + ' + transferencia ' + A.ars(tr) + ')'; }
    const pay = { f: A.today(), tipo: 'Pago', doc: rc, imp: amount, met, plan: doc, det }; if (f.elements.sinInt && f.elements.sinInt.value === '1') { pay.sinInt = true; pay.det += ' · adelanto sin interés'; }
    c.movs.push(pay);
    const r = A.applyResto(next, phone, doc, f.elements.resto && f.elements.resto.value); if (r) c.movs[c.movs.length - (f.elements.resto.value === 'perdon' ? 2 : 1)].det += ' · ' + P._restoTexto(f.elements.resto.value, r).toLowerCase();
    await A.saveDb(A.syncRecNC(next, phone)); if (A.refs) await A.reloadRefs();
    A.paymentReceipt(phone, doc, amount, rc); A.render();
  });
  A.paymentReceipt = (phone, doc, amount, rc) => {
    const c = A.db.clients[phone], pm = A.planOf(phone, doc), bal = A.balanceFor(phone, doc), pc = pm && pm.finan ? P._planCalc(c, pm) : null, q = pc && pc.prox;
    const text = ['*ICLUB · Recibo de pago*', rc + ' · ' + A.today(), 'Cliente: ' + c.name, 'Recibimos: ' + A.ars(amount), 'Compra: ' + (pm.prodName || String(pm.det || '').split(' · ')[0]) + ' (' + doc + ')', pc ? 'Cuotas pagadas: ' + pc.pagadas + ' de ' + pc.n : '', 'Saldo restante: ' + A.ars(bal), q ? 'Próxima cuota: ' + q.d + ' · ' + A.ars(q.req - q.paid) : (bal <= 0.005 ? '¡Compra pagada por completo! Gracias.' : ''), '', 'Gracias por confiar en ICLUB.'].filter((x) => x !== '').join('\n');
    A.modal('Pago registrado', '<div class="note good"><b>' + A.ars(amount) + '</b> de ' + A.esc(c.name) + '. Saldo restante: <b>' + A.ars(bal) + '</b></div><textarea readonly id="rcText" rows="9">' + A.esc(text) + '</textarea><div class="row-flex"><a class="btn btn-wa" target="_blank" rel="noopener" href="' + A.waLink(phone, text) + '">Enviar por WhatsApp</a><button class="btn-2" data-act="copy" data-target="#rcText">Copiar</button><button class="btn-2" data-close>Listo</button></div>', { noFocus: true });
  };
  A.resolveRestoNow = (dest) => {
    const f = A.$('#payForm'); const phone = f.dataset.phone, doc = f.dataset.doc, c = A.db.clients[phone], pm = A.planOf(phone, doc), r = P._restoTras(c, pm, 0);
    if (!r || !confirm('Resto de ' + A.ars(r.monto) + ' de la cuota ' + r.n + '. ' + P._restoTexto(dest, r) + '. ¿Confirmás?')) return;
    A.act(async () => { const next = A.clone(A.db); A.applyResto(next, phone, doc, dest); await A.saveDb(next); A.closeModal(); A.render(); }, 'Resto resuelto.');
  };
  A.copy = async (sel) => { const el = A.$(sel); if (!el) return; const t = el.value || el.textContent; try { await navigator.clipboard.writeText(t); A.toast('Copiado.'); } catch (_) { el.select && el.select(); try { document.execCommand('copy'); A.toast('Copiado.'); } catch (e) { A.toast('Seleccioná el texto y copialo.', true); } } };

  /* ===== Comprobante de venta ===== */
  A.receiptText = (s) => {
    const d = B.saleData(A.db, s), lines = ['*ICLUB · Comprobante de venta*', d.document + ' · ' + d.date, 'Cliente: ' + d.client, 'Producto: ' + d.name]; if (d.spec) lines.push(d.spec);
    lines.push('Precio de contado: ' + A.ars(d.cash), 'Total de la venta: ' + A.ars(d.total), 'Forma de pago: ' + (d.financed ? 'Financiamiento ICLUB' : s.method || 'Contado'));
    if (s.paymentSnapshot) lines.push('Dinero recibido al vender: ' + A.ars(s.paymentSnapshot.amount));
    if (d.tradeValue) lines.push('Canje: ' + ((d.trade && d.trade.name) || 'Equipo recibido') + ' · ' + A.ars(d.tradeValue));
    lines.push('Pagado a la fecha (incluye canje): ' + A.ars(d.paid), 'Saldo pendiente: ' + (d.hasAccount ? A.ars(d.balance) : 'Sin cuenta vinculada'));
    if (d.plan) { lines.push('', '*Plan: ' + d.plan.count + ' pagos ' + (d.plan.frequency === 'Semanal' ? 'semanales' : 'mensuales') + '*'); const reg = B.round(d.plan.base / d.plan.count); for (let i = 0; i < d.plan.count; i++) lines.push('Cuota ' + (i + 1) + ' · ' + (d.plan.dates[i] || 'A confirmar') + ' · ' + A.ars(i === d.plan.count - 1 ? B.round(d.plan.base - reg * (d.plan.count - 1)) : reg)); }
    lines.push('Entrega: ' + (d.delivered ? 'Entregado' : 'Pendiente'), '', 'Comprobante interno. No válido como factura fiscal.'); return lines.join('\n');
  };
  A.openSale = (id, created) => {
    const s = A.db.ventas.find((x) => x.id === id); if (!s) return; const st = M.sale(A.db, s), d = st; const r = A.refs && (A.refs.data.sales || []).find((x) => x.id === id);
    const member = s.referrer && A.refs && A.refs.data.members[s.referrer];
    const plan = st.cuotas ? (() => { const c = A.db.clients[s.clientKey], pm = c.movs.find((m) => m.tipo === 'Compra' && (m.grp === s.id || m.doc === s.invoice)); return A.cuotasHtml(c, pm); })() : '';
    const text = A.receiptText(s);
    const body = (created ? '<div class="note good"><b>Venta registrada.</b> El comprobante está listo para enviar.</div>' : '') +
      '<div class="row-flex"><div class="avatar">' + A.esc(A.initials(d.client)) + '</div><div class="grow"><div class="strong" style="font-size:18px">' + A.esc(d.client) + '</div><div class="small muted">' + A.esc(d.phone) + '</div></div>' + A.chip(st.tipo, st.tipo === 'Contado' ? 'good' : 'info') + A.chip(st.estado, st.color) + '</div>' +
      '<div class="card" style="padding:16px"><div class="small muted">' + A.esc(d.document + ' · ' + d.date) + '</div><div style="font-size:20px;font-weight:800;margin:2px 0">' + A.esc(d.name) + '</div><div class="small muted">' + A.esc(d.spec || '') + '</div>' +
      '<div class="sum-line"><span>Total de la venta</span><b>' + A.ars(d.total) + '</b></div>' + (d.tradeValue ? '<div class="sum-line"><span>Canje · ' + A.esc((d.trade && d.trade.name) || '') + '</span><b>' + A.ars(d.tradeValue) + '</b></div>' : '') +
      d.payments.map((p) => '<div class="sum-line"><span class="muted">' + A.esc(p.date + ' · ' + p.method) + '</span><b>' + A.ars(p.amount) + '</b></div>').join('') +
      '<div class="sum-line"><span>Pagado a la fecha</span><b class="good">' + A.ars(d.paid) + '</b></div><div class="sum-line"><span>Saldo</span><b class="' + (d.balance > 0 ? 'bad' : 'good') + '">' + (d.hasAccount ? A.ars(st.cuotas ? st.cuotas.pendiente : d.balance) : 'Sin cuenta') + '</b></div>' +
      '<div class="sum-line"><span>Ganancia</span><b>' + A.ars(st.ganancia) + '</b></div><div class="sum-line"><span>Entrega</span><b>' + (s.delivered ? 'Entregado' : 'Pendiente') + '</b></div>' +
      (member ? '<div class="sum-line"><span>Referidor</span><b>' + A.esc(member.name) + (r ? ' · comisión ' + A.money(r.commission, r.commissionCurrency) : '') + '</b></div>' : '') + '</div>' + plan +
      '<details><summary class="strong">Mensaje para el cliente</summary><textarea readonly id="saleText" rows="10" style="margin-top:8px">' + A.esc(text) + '</textarea></details>' +
      '<div class="row-flex"><a class="btn btn-wa" target="_blank" rel="noopener" href="' + A.waLink(d.phone, text) + '">Enviar por WhatsApp</a><button class="btn-2" data-act="copy" data-target="#saleText">Copiar mensaje</button><button class="btn-2" data-act="sale-pdf" data-id="' + A.esc(id) + '">Descargar PDF</button></div>' +
      '<div class="row-flex">' + (d.hasAccount && (st.cuotas ? st.cuotas.pendiente : d.balance) > 0.005 ? '<button class="btn-good" data-act="pay" data-phone="' + A.esc(s.clientKey) + '" data-doc="' + A.esc(d.document) + '">Registrar pago</button>' : '') + (!s.delivered ? '<button class="btn-2" data-act="deliver" data-id="' + A.esc(id) + '">Confirmar entrega</button>' : '') + (A.db.clients[s.clientKey] ? '<a class="btn btn-2" href="#cliente/' + encodeURIComponent(s.clientKey) + '" data-close>Ver cliente</a>' : '') + '</div>';
    A.modal(created ? 'Comprobante listo' : 'Detalle de la venta', body, { noFocus: true });
  };
  A.salePdf = async (id) => { const s = A.db.ventas.find((x) => x.id === id); try { if (!window.ICLUBSaleDocuments) throw Error('No se cargó el generador de PDF.'); await ICLUBSaleDocuments.receipt(A.db, s).save('ICLUB-comprobante-' + String(s.invoice || s.id).replace(/[^A-Za-z0-9-]/g, '-') + '.pdf', { returnPromise: true }); A.toast('PDF descargado.'); } catch (e) { A.toast('No se pudo generar el PDF. ' + e.message, true); } };
  A.deliver = (id) => A.act(async () => {
    const linked = A.refs && (A.refs.data.sales || []).some((x) => x.id === id);
    if (linked) { await A.refChange('deliver', { id }); const st = await A.api.read(); A.db = A.normalize(st.data); }
    else { const next = A.clone(A.db); next.ventas.find((x) => x.id === id).delivered = true; await A.saveDb(next); }
    A.closeModal(); A.render();
  }, 'Entrega confirmada.');
  /* Grilla de cuotas: pagada, parcial, atrasada, próxima y descuento por comisión. */
  A.cuotasHtml = (c, pm) => {
    if (!c || !pm || !pm.finan) return ''; const pc = P._planCalc(c, pm), t = M.startOfDay(new Date());
    return '<div class="cuotas">' + pc.cuotas.map((q) => { const late = !q.done && q.dt && q.dt < t, cls = q.done ? 'paid' : late ? 'late' : q.paid > 0 ? 'partial' : pc.prox && pc.prox.i === q.i ? 'next' : ''; return '<div class="cuota ' + cls + '"><span class="muted">Cuota ' + q.n + '</span><b>' + A.ars(q.done ? q.req : q.req - q.paid) + '</b>' + A.esc(q.d) + '<br>' + (q.done ? (q.req <= 0.005 && q.desc ? '<span class="disc">Cubierta con comisión</span>' : 'Pagada') : late ? '<span class="bad">Atrasada</span>' + (q.paid > 0 ? '<br>pagó ' + A.ars(q.paid) : '') : q.paid > 0 ? 'Pagó ' + A.ars(q.paid) : 'Pendiente') + (q.desc ? '<br><span class="disc">−' + A.ars(q.desc) + ' comisión</span>' : '') + (q.recibe ? '<br><span class="warn">+' + A.ars(q.recibe) + ' resto</span>' : '') + '</div>'; }).join('') + '</div>';
  };
  /* Nota de crédito automática por recargo perdonado (adelanto sin interés o plan pasado a contado). Igual que el portal anterior. */
  A.syncRecNC = (db, key) => {
    const c = db.clients[key]; if (!c) return db; const limpios = (c.movs || []).filter((m) => !(m.tipo === 'Nota de Crédito' && m.auto === 'rec'));
    const tmp = { ...c, movs: limpios }; let movs = limpios, nc = db.nextNc || 1;
    limpios.filter((m) => m.tipo === 'Compra' && m.finan).forEach((pm) => { const dif = Math.round(P._planCalc(tmp, pm).ahorro); if (dif <= 0) return; movs = movs.concat([{ f: A.today(), tipo: 'Nota de Crédito', doc: 'NC 0003-' + String(nc).padStart(6, '0'), imp: dif, det: 'Descuento de recargo por pago adelantado · ' + (pm.prodName || String(pm.det || '').split(' · ')[0]), plan: pm.doc, auto: 'rec' }]); nc++; });
    db.nextNc = nc; db.clients[key] = { ...c, movs }; return db;
  };
  /* Mora configurada en Ajustes: % por día de atraso, con días de gracia y tope. */
  A.mora = (falta, dias) => { const st = A.db.settings || {}, pct = A.pct(st.mora); if (!(pct > 0) || !(dias > 0)) return 0; const d = Math.max(0, dias - A.num(st.moraGracia ?? 3)); if (!d) return 0; let p = pct * d; const tope = A.pct(st.moraTope ?? 20); if (tope > 0) p = Math.min(p, tope); return Math.round(falta * p / 100); };
  /* Contrato de financiación en PDF (mismo contenido que el portal anterior). */
  A.planPdf = (phone, doc) => {
    try {
      const { jsPDF } = window.jspdf; const c = A.db.clients[phone], pm = A.planOf(phone, doc), pc = P._planCalc(c, pm), st = A.db.settings || {}; const d = new jsPDF({ unit: 'pt', format: 'a4' }); let y = 60;
      const S = (x) => String(x == null ? '' : x).replace(/−/g, '-'); const title = (t) => { if (y > 730) { d.addPage(); y = 60; } y += 8; d.setFont('helvetica', 'bold'); d.setFontSize(11); d.setTextColor(29, 29, 31); d.text(S(t), 40, y); y += 10; d.setDrawColor(225); d.line(40, y, 555, y); y += 22; };
      const line = (l, v, bold) => { if (y > 770) { d.addPage(); y = 60; } d.setFont('helvetica', 'normal'); d.setFontSize(9.5); d.setTextColor(110, 110, 115); d.text(S(l), 40, y); d.setFont('helvetica', bold ? 'bold' : 'normal'); d.setFontSize(bold ? 11 : 10); d.setTextColor(29, 29, 31); d.text(S(v), 555, y, { align: 'right' }); d.setDrawColor(240); d.line(40, y + 8, 555, y + 8); y += 25; };
      d.setFont('helvetica', 'bold'); d.setFontSize(24); d.text('ICLUB', 40, y); d.setFontSize(10); d.setFont('helvetica', 'normal'); d.setTextColor(110); d.text('CONTRATO DE FINANCIACIÓN · ' + S(doc), 555, y, { align: 'right' }); y += 40;
      title('Datos de la operación'); line('Comprador', c.name || '—'); line('Teléfono', phone); line('Documento de venta', pm.doc); line('Fecha de la venta', pm.f); line('Producto', pm.prodName || String(pm.det || '').split(' · ')[0]);
      title('Condiciones de pago'); line('Precio de contado', A.ars(pc.contado)); if (!pc.esContado && pc.recPct > 0) line('Recargo por financiación', pc.recPct + '%'); line('Total financiado', A.ars(pc.esContado ? pc.contado : pc.base), true); line('Cantidad de cuotas', pc.n + ' ' + (pc.freq === 'Semanal' ? 'semanales' : 'mensuales')); line('Importe de cada cuota', A.ars(pc.esContado ? pc.capImp : pc.cuotaImp), true);
      if (A.pct(st.mora) > 0) line('Recargo por mora', st.mora + '% por día, con ' + (st.moraGracia ?? 3) + ' días de gracia y tope del ' + (st.moraTope ?? 20) + '%');
      title('Cronograma de vencimientos'); d.setFont('helvetica', 'bold'); d.setFontSize(8); d.setTextColor(140); d.text('CUOTA', 40, y); d.text('VENCIMIENTO', 150, y); d.text('IMPORTE', 340, y, { align: 'right' }); d.text('ESTADO', 555, y, { align: 'right' }); y += 16;
      pc.cuotas.forEach((q) => { if (y > 760) { d.addPage(); y = 60; } d.setFont('helvetica', 'normal'); d.setFontSize(9.5); d.setTextColor(29, 29, 31); d.text(S(q.n + ' de ' + pc.n), 40, y); d.text(S(q.d), 150, y); d.text(S(A.ars(q.req)), 340, y, { align: 'right' }); d.setTextColor(q.done ? 31 : 161, q.done ? 138 : 161, q.done ? 91 : 166); d.text(q.done ? 'Pagada' : q.paid > 0 ? 'Parcial' : 'Pendiente', 555, y, { align: 'right' }); y += 18; });
      y += 30; if (y > 700) { d.addPage(); y = 80; } d.setTextColor(110); d.setFontSize(9); d.text('El comprador se compromete a abonar cada cuota en la fecha indicada. Comprobante interno, no válido como factura fiscal.', 40, y, { maxWidth: 515 }); y += 70; d.setDrawColor(150); d.line(60, y, 250, y); d.line(345, y, 535, y); d.text('Firma del comprador', 155, y + 14, { align: 'center' }); d.text('ICLUB', 440, y + 14, { align: 'center' });
      d.save('ICLUB-contrato-' + String(doc).replace(/[^A-Za-z0-9-]/g, '-') + '.pdf'); A.toast('Contrato descargado.');
    } catch (e) { A.toast('No se pudo generar el PDF: ' + e.message, true); }
  };

})();
