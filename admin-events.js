/* ICLUB · Panel de administración · botones, formularios y arranque. */
(function () {
  'use strict';
  const A = window.ICA, M = window.ICLUBMetrics, P = window.ICLUBCollectionPlan, ui = A.ui, pos = A.pos;
  const rerender = (keep) => { A._keepScroll = keep !== false; A.render(); };
  const setPath = (obj, path, v) => { const k = path.split('.'); if (k.length === 2) obj[k[0]][k[1]] = v; else obj[k[0]] = v; };

  document.addEventListener('click', (e) => {
    const seg = e.target.closest('[data-seg] button');
    if (seg) {
      const name = seg.parentElement.dataset.seg, v = seg.dataset.v;
      if (name === 'pos-mode') { pos.mode = v; return rerender(); } if (name === 'pos-freq') { pos.freq = v; pos.firstDue = ''; return rerender(); } if (name === 'pos-trade') { pos.trade = v === 'si'; return rerender(); }
      if (name === 'listKind') { ui.listKind = v; return rerender(); }
      if (name === 'cfgMode') { seg.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === seg)); A.$('#memberCfgForm').elements.mode.value = v; return; }
      if (name === 'payWay') { seg.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === seg)); A.$('#refPayForm').elements.way.value = v; A.$('#cuotasWay').hidden = v !== 'cuotas'; return; }
      if (name in ui) { ui[name] = v; return rerender(); }
    }
    const fill = e.target.closest('[data-fill]'); if (fill) { const f = A.$('#payForm'); f.elements.amount.value = fill.dataset.fill; A.payHint(); return; }
    const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'INPUT') return;
    const d = b.dataset, act = d.act;
    if (b.tagName === 'A' && !['all-dues'].includes(act)) return;
    e.preventDefault();
    switch (act) {
      case 'pay': A.openPay(d.phone, d.doc); break;
      case 'resto-now': A.resolveRestoNow(d.dest); break;
      case 'copy': A.copy(d.target); break;
      case 'sale': A.openSale(d.id); break;
      case 'sale-pdf': A.salePdf(d.id); break;
      case 'deliver': A.deliver(d.id); break;
      case 'all-dues': ui.showAllDues = true; rerender(); break;
      case 'sale-allmonths': ui.saleMonth = ''; rerender(); break;
      case 'month-pdf': { const month = ui.saleMonth || M.monthKey(new Date()); try { ICLUBSaleDocuments.monthly(A.db, month, ui.saleQ).save('ICLUB-ventas-' + month + '.pdf'); } catch (err) { A.toast(err.message, true); } break; }
      /* Punto de venta */
      case 'pos-item': { pos.item = d.id || null; pos.newProduct = false; const it = A.db.inventory.find((x) => x.id === pos.item); if (it) { pos.cash = String(M.r2(Number(it.venta || 0) * (it.moneda === 'ARS' ? 1 : A.rate()))); pos.paidTouched = false; } rerender(); break; }
      case 'pos-newprod': pos.newProduct = !d.off; pos.item = null; rerender(); break;
      case 'pos-client': pos.client = d.id || ''; pos.newClient = false; rerender(); break;
      case 'pos-newclient': pos.newClient = !d.off; pos.client = ''; if (!d.off && pos.cliQ && /\d{6,}/.test(pos.cliQ)) pos.nc.phone = pos.cliQ.replace(/\D/g, ''); else if (!d.off && pos.cliQ) pos.nc.name = pos.cliQ; rerender(); break;
      case 'pos-genpass': { const w = 'iclub' + Math.floor(1000 + Math.random() * 9000); pos.nc.password = w; A.$('[name="nc.password"]').value = w; A.posSummary(); break; }
      case 'pos-plan': case 'pos-noint': {
        const cash = A.num(pos.cash), trade = pos.trade ? A.num(pos.tr.value) : 0, adel = A.num(pos.adel); const saldo = M.r2(cash - trade - adel); if (!(saldo > 0)) { A.toast('Primero completá el precio de contado (y el adelanto si deja).', true); break; }
        const months = act === 'pos-plan' ? Number(d.m) : Math.max(1, Math.round(A.num(pos.count) / (pos.freq === 'Semanal' ? 4 : 1)) || 1); const pct = act === 'pos-plan' ? Number(d.p) : 0;
        const count = act === 'pos-plan' ? months * (pos.freq === 'Semanal' ? 4 : 1) : (A.num(pos.count) || months); const total = saldo * (1 + pct / 100);
        pos.count = String(count); pos.installment = String(Math.ceil(Math.round(total * 100) / count) / 100); rerender(); break;
      }
      case 'pos-weekly': { try { const r = window.ICLUBBusiness.weeklyPlan(A.num(pos.count), A.num(pos.installment)); if (r.difference && !confirm('Por los centavos, el total aumenta ' + A.ars(r.difference) + '. ¿Aplicar?')) break; pos.count = String(r.count); pos.installment = String(r.installment); pos.freq = 'Semanal'; pos.firstDue = ''; rerender(); } catch (err) { A.toast(err.message, true); } break; }
      case 'pos-reset': if (confirm('¿Borrar lo cargado y empezar de nuevo?')) { pos.reset(); rerender(false); } break;
      case 'pos-confirm': A.posConfirm(); break;
      /* Clientes */
      case 'new-client': A.clientForm(); break;
      case 'edit-client': A.clientForm(d.phone); break;
      case 'del-mov': A.delMov(d.phone, Number(d.i)); break;
      /* Inventario */
      case 'add-item': A.itemForm(); break;
      case 'edit-item': A.itemForm(d.id); break;
      case 'stock': A.stock(d.id, Number(d.d)); break;
      case 'del-item': A.delItem(d.id); break;
      case 'pick-item': {
        if (d.kind === 'inv') { A.closeModal(); A.itemForm(d.id); setTimeout(() => { const s = A.$('#itemForm [name=stock]'); if (s) { s.focus(); s.select(); } A.toast('Ya existe: ajustá el stock o el precio.'); }, 60); }
        else { const base = (window.REF_BASE || []).find((p) => p.id === d.id); const p = { ...(base || {}), ...(A.db.catalog[d.id] || {}) }; const f = A.$('#itemForm'); f.dataset.catalog = d.id; f.elements.name.value = p.name || ''; f.elements.spec.value = p.spec || ''; f.elements.venta.value = p.usd || ''; f.elements.moneda.value = 'USD'; const cat = [...f.elements.cat.options].find((o) => o.value === p.cat); f.elements.cat.value = cat ? p.cat : 'Celulares'; f.elements.costo.focus(); }
        break;
      }
      /* Catálogo */
      case 'cat-toggle': { const cur = { ...((window.REF_BASE || []).find((p) => p.id === d.id) || {}), ...(A.db.catalog[d.id] || {}) }; A.catSet(d.id, { [d.k]: !cur[d.k] }); break; }
      /* Estadísticas / pedidos */
      case 'ped-state': A.act(async () => { const next = A.clone(A.db); const p = (next.pedidos || []).find((x) => x.id === d.id); if (p) p.estado = d.v; await A.saveDb(next); rerender(); }); break;
      case 'ped-sell': { const p = (A.db.pedidos || []).find((x) => x.id === d.id); pos.reset(); if (p) { if (p.phone && A.db.clients[p.phone]) pos.client = p.phone; pos.prodQ = String(p.prod || '').split(' ').slice(0, 3).join(' '); } location.hash = 'vender'; break; }
      /* Finanzas */
      case 'excel': A.excel(); break;
      case 'fin-pdf': A.finPdf(); break;
      case 'del-gasto': if (confirm('¿Borrar este gasto?')) A.act(async () => { const next = A.clone(A.db); next.gastos = (next.gastos || []).filter((g) => g.id !== d.id); await A.saveDb(next); rerender(); }, 'Gasto borrado.'); break;
      /* Referidos */
      case 'new-member': A.modal('Nuevo referidor', '<form id="memberForm" class="grid"><label class="f">Nombre<input name="name" required></label><label class="f">Celular<input name="phone" inputmode="tel" required></label><label class="check"><input type="checkbox" name="existing"> Ya es cliente (usa su cuenta y clave actual)</label><label class="f">Contraseña<input name="password" placeholder="Mínimo 8 caracteres"></label><button class="btn-good">Crear referidor</button></form>'); break;
      case 'member-cfg': A.memberCfg(d.id); break;
      case 'member-toggle': { const m = A.refs.data.members[d.id]; A.act(async () => { await A.refChange('member', { id: d.id, name: m.name, active: !m.active }); rerender(); }, m.active ? 'Referidor deshabilitado.' : 'Referidor habilitado.'); break; }
      case 'member-note': A.modal('Notas privadas · ' + A.refs.data.members[d.id].name, '<form id="noteForm" class="grid"><input type="hidden" name="seller" value="' + A.esc(d.id) + '"><label class="f">Solo vos ves estas notas<textarea name="note" maxlength="2000">' + A.esc((A.refs.data.memberNotes || {})[d.id] || '') + '</textarea></label><button class="btn-good">Guardar nota</button></form>'); break;
      case 'list-parse': A.listParse(); break;
      case 'list-publish': A.listPublish(); break;
      case 'list-view': A.listView(d.k); break;
      case 'list-clear': if (confirm('¿Vaciar esta lista? Los referidores dejan de verla.')) A.act(async () => { await A.netChange('list', { kind: d.k, items: [] }); A.closeModal(); rerender(); }, 'Lista vaciada.'); break;
      case 'ref-deliver': A.act(async () => { await A.refChange('deliver', { id: d.id }); const st = await A.api.read(); A.db = A.normalize(st.data); rerender(); }, 'Entrega confirmada.'); break;
      case 'ref-pay': A.refPay(d.id); break;
      case 'ref-assign': { const ms = Object.entries(A.refs.data.members || {}).filter(([, m]) => m.active); A.modal('Venta hecha fuera del sistema', '<p class="small muted">Registra solo la comisión. No toca stock, caja ni deuda del cliente.</p><form id="assignForm" class="grid"><label class="f">Referidor<select name="referrer">' + ms.map(([ph, m]) => '<option value="' + A.esc(ph) + '">' + A.esc(m.name) + '</option>').join('') + '</select></label><div class="grid g2"><label class="f">Equipo<input name="label" required></label><label class="f">Cliente<input name="client" required></label><label class="f">Precio total<input name="total" inputmode="decimal" required></label><label class="f">Moneda<select name="currency"><option>ARS</option><option>USD</option></select></label><label class="f">Comisión<select name="mode"><option value="fixed">Monto fijo</option><option value="percent">Porcentaje del total</option></select></label><label class="f">Monto o %<input name="value" inputmode="decimal" required></label></div><button class="btn-good">Registrar</button></form>'); break; }
      case 'act-filter': ui.actMember = d.id; rerender(); break;
      /* Inversores */
      case 'new-investor': A.modal('Nuevo inversor', '<form id="investorForm" class="grid"><label class="f">Nombre<input name="name" required></label><label class="f">Celular<input name="phone" inputmode="tel" required></label><label class="f">Ganancia mensual (%)<input name="rate" inputmode="decimal" value="20" required></label><label class="check"><input type="checkbox" name="existing"> Ya es cliente (usa su cuenta y clave actual)</label><label class="f">Contraseña para su portal<input name="password" placeholder="Mínimo 8 caracteres"></label><button class="btn-good">Crear inversor</button></form>'); break;
      case 'investor': A.investor(d.id); break;
      case 'inv-move-del': if (confirm('¿Borrar este movimiento?')) A.act(async () => { await A.netChange('investor_move_delete', { id: d.id }); A.investor(d.ph); rerender(); }, 'Movimiento borrado.'); break;
      case 'inv-alloc-del': A.act(async () => { await A.netChange('allocation_delete', { id: d.id }); A.investor(d.ph); }, 'Asignación quitada.'); break;
      /* Respaldo */
      case 'snap-get': A.snapGet(d.id); break;
      case 'snap-now': A.act(async () => { A.snap = await A.rpc('iclub_snapshot_weekly', { p_force: true }); await A.reloadNet(); rerender(); }, 'Copia guardada.'); break;
      case 'menu': A.$('.side').classList.toggle('open'); break;
      case 'reload': A.act(A.load, 'Datos actualizados.'); break;
      case 'logout': A.act(async () => { await A.api.logout(); location.assign('/portal'); }); break;
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.ui) { ui[t.dataset.ui] = t.value; clearTimeout(A._it); A._it = setTimeout(() => { const pos0 = t.selectionStart; rerender(); const n = A.$('[data-ui="' + t.dataset.ui + '"]'); if (n) { n.focus(); try { n.setSelectionRange(pos0, pos0); } catch (_) {} } }, t.type === 'month' ? 0 : 180); return; }
    if (t.form && t.form.id === 'posForm' && t.name) {
      if (t.name === 'prodQ') { pos.prodQ = t.value; A.$('#invPick').innerHTML = A.views.invPick(t.value); return; }
      if (t.name === 'cliQ') { pos.cliQ = t.value; A.$('#cliPick').innerHTML = A.views.cliPick(t.value); return; }
      const v = t.type === 'checkbox' ? t.checked : t.value; setPath(pos, t.name, v);
      if (t.name === 'paid') pos.paidTouched = true; if (t.name === 'cash' || t.name === 'tr.value') { pos.paidTouched = false; const p = A.$('[name=paid]'); if (p) p.value = Math.max(0, M.r2(A.num(pos.cash) - (pos.trade ? A.num(pos.tr.value) : 0))); }
      if (t.name === 'referrer') return rerender(); A.posSummary(); return;
    }
    if (t.closest('#payForm')) { A.payHint(); return; }
    if (t.dataset.li != null) { const it = ui.listDraft.items[Number(t.dataset.li)]; it[t.dataset.f] = t.type === 'checkbox' ? t.checked : t.value; return; }
    if (t.id === 'itemPickQ') { A.$('#itemPick').innerHTML = A.itemPick(t.value); return; }
    const sim = t.closest('.sim-form'); if (sim) { const f = sim.elements; sim.querySelector('.sim-out').innerHTML = A.simOut(f.monto.value, f.rate.value, f.meses.value, f.tna.value); }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.form && t.form.id === 'posForm' && t.name && t.tagName === 'SELECT') { setPath(pos, t.name, t.value); if (t.name === 'referrer' || t.name === 'method') rerender(); else A.posSummary(); return; }
    if (t.form && t.form.id === 'posForm' && t.type === 'checkbox') { setPath(pos, t.name, t.checked); A.posSummary(); return; }
    if (t.dataset.ui && t.tagName === 'SELECT') { ui[t.dataset.ui] = t.value; rerender(); return; }
    if (t.dataset.actChange === 'cat-price') { const v = A.num(t.value); if (!(v > 0)) { A.toast('Precio inválido.', true); return; } A.catSet(t.dataset.id, { usd: v }); return; }
    if (t.dataset.li != null) { const it = ui.listDraft.items[Number(t.dataset.li)]; it[t.dataset.f] = t.type === 'checkbox' ? t.checked : t.value; return; }
    if (t.closest('#payForm')) A.payHint();
  });

  document.addEventListener('submit', (e) => {
    const f = e.target; if (f.dataset.backupForm) return; e.preventDefault(); const el = f.elements;
    switch (f.id) {
      case 'payForm': A.savePayment(f); break;
      case 'clientForm': A.saveClient(f); break;
      case 'itemForm': A.saveItem(f); break;
      case 'gastoForm': A.act(async () => { const monto = A.num(el.monto.value); if (!(monto > 0) || !el.concepto.value.trim()) throw Error('Completá concepto y monto.'); const next = A.clone(A.db); next.gastos = (next.gastos || []).concat([{ id: A.uid(), f: A.today(), concepto: el.concepto.value.trim(), cat: el.cat.value, monto }]); await A.saveDb(next); rerender(); }, 'Gasto agregado.'); break;
      case 'cashStart': A.act(async () => { if (A.db.cashOpening) throw Error('La caja ya fue inicializada.'); const balances = {}; for (const [w, v] of new FormData(f)) { const n = A.num(v); if (!Number.isFinite(n) || n < 0) throw Error('Saldo inválido.'); balances[w] = n; } await A.saveDb({ ...A.clone(A.db), cashOpening: { at: new Date().toISOString(), balances }, cashEntries: [] }); rerender(); }, 'Caja configurada.'); break;
      case 'cashAdjust': A.act(async () => { const n = A.num(el.amount.value); if (!(n > 0) || !el.reason.value.trim()) throw Error('Completá importe y motivo.'); const next = A.clone(A.db); next.cashEntries = (next.cashEntries || []).concat([{ id: A.uid(), wallet: el.wallet.value, amount: n * (el.kind.value === 'out' ? -1 : 1), reason: el.reason.value.trim(), at: new Date().toISOString() }]); await A.saveDb(next); rerender(); }, 'Movimiento registrado.'); break;
      case 'memberForm': A.act(async () => { await A.rpc('iclub_ref_member_create', { p_revision: A.refs.revision, p_name: el.name.value.trim(), p_phone: el.phone.value.replace(/\D/g, ''), p_password: el.existing.checked ? '' : el.password.value, p_existing: el.existing.checked }); await A.load(); A.closeModal(); A.memberCfg(el.phone.value.replace(/\D/g, '')); }, 'Referidor creado. Ahora configurá su comisión.'); break;
      case 'memberCfgForm': A.act(async () => { await A.netChange('member_settings', { id: f.dataset.id, mode: el.mode.value, usd: A.num(el.usd.value), percent: A.num(el.percent.value), allowExtra: el.allowExtra.checked }); A.closeModal(); rerender(); }, 'Comisión guardada.'); break;
      case 'noteForm': A.act(async () => { await A.rpc('iclub_ref_configure', { p_revision: A.refs.revision, p_action: 'note', p_item: { seller: el.seller.value, note: el.note.value } }); await A.reloadRefs(); A.closeModal(); }, 'Nota guardada.'); break;
      case 'programForm': A.act(async () => { await A.rpc('iclub_ref_configure', { p_revision: A.refs.revision, p_action: 'program', p_item: { title: el.title.value, welcome: el.welcome.value, instructions: el.instructions.value, fields: (A.refs.data.program && A.refs.data.program.fields) || [] } }); await A.reloadRefs(); rerender(); }, 'Textos guardados.'); break;
      case 'refPayForm': {
        const id = f.dataset.id, amount = A.num(el.amount.value); const s = A.refs.data.sales.find((x) => x.id === id);
        if (el.way.value === 'cuotas') A.act(async () => { const r = await A.rpc('iclub_ref_apply_cuotas', { p_revision: A.refs.revision, p_expected_version: A.api.version, p_item: { saleId: id, amount, mode: el.mode.value, planDoc: el.planDoc.value } }); A.applyServer(r); await A.reloadRefs(); A.closeModal(); rerender(); A.toast('Se descontaron ' + A.ars(r.ars) + ' de sus cuotas (' + r.nc + ').'); });
        else A.act(async () => { if (!confirm('¿Confirmás que le pagaste ' + A.money(amount, s.commissionCurrency) + ' en efectivo?')) return false; await A.refChange('payout', { id, amount }); const st = await A.api.read(); A.db = A.normalize(st.data); A.closeModal(); rerender(); }, 'Pago registrado como gasto de comisiones.');
        break;
      }
      case 'assignForm': A.act(async () => { const pct = el.mode.value === 'percent'; await A.rpc('iclub_ref_assign', { p_revision: A.refs.revision, p_item: { id: A.uid(), referrer: el.referrer.value, label: el.label.value, client: el.client.value, total: A.num(el.total.value), currency: el.currency.value, mode: el.mode.value, commission: pct ? 0 : A.num(el.value.value), percent: pct ? A.num(el.value.value) : 0, extras: {} } }); await A.reloadRefs(); A.closeModal(); rerender(); }, 'Venta registrada.'); break;
      case 'investorForm': A.act(async () => { await A.rpc('iclub_inv_create', { p_revision: A.net.revision, p_name: el.name.value.trim(), p_phone: el.phone.value.replace(/\D/g, ''), p_password: el.existing.checked ? '' : el.password.value, p_existing: el.existing.checked, p_rate: A.num(el.rate.value) }); await A.load(); A.closeModal(); A.investor(el.phone.value.replace(/\D/g, '')); }, 'Inversor creado. Cargá su primer aporte.'); break;
      case 'invEditForm': A.act(async () => { await A.netChange('investor_update', { id: f.dataset.id, name: el.name.value, rate: A.num(el.rate.value), notes: el.notes.value, active: el.active.checked }); A.investor(f.dataset.id); rerender(); }, 'Datos guardados.'); break;
      case 'invMoveForm': A.act(async () => { await A.netChange('investor_move', { id: A.uid(), phone: f.dataset.id, type: el.type.value, amount: A.num(el.amount.value), f: el.f.value, note: el.note.value }); A.investor(f.dataset.id); rerender(); }, 'Movimiento agregado.'); break;
      case 'invAllocForm': A.act(async () => { await A.netChange('allocation', { id: A.uid(), phone: f.dataset.id, saleId: el.saleId.value, amount: A.num(el.amount.value) }); A.investor(f.dataset.id); }, 'Venta asignada.'); break;
      case 'netSettingsForm': A.act(async () => { await A.netChange('settings', { plazoFijoTna: el.plazoFijoTna.value.trim() === '' ? '' : A.num(el.plazoFijoTna.value), investorNote: el.investorNote.value }); rerender(); }, 'Ajustes guardados.'); break;
    }
  });
  window.addEventListener('hashchange', () => { window.scrollTo(0, 0); A.render(); });
  window.addEventListener('beforeunload', (e) => { if (A.busy) { e.preventDefault(); e.returnValue = ''; } });
  if (!A.api.token) location.assign('/portal'); else A.load().catch((e) => { A.$('#view').innerHTML = '<div class="note bad">' + A.esc(e.message) + '<br><a href="/portal">Volver a ingresar</a></div>'; });
})();
