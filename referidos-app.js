/* ICLUB · Portal de referidores: listas para vender, cuánto ganás, cotizador, tus ventas y tus cuotas. */
(function () {
  'use strict';
  const C = window.ICP, M = window.ICLUBMetrics, P = window.ICLUBCollectionPlan, L = window.ICLUBPriceList; const { esc, ars, usd, chip } = C;
  const root = C.$('#app');
  let S = null; const ui = { tab: 'stock', q: '', extra: '' };
  const defaults = ICLUBRefQuote.settings({});
  async function load() {
    root.innerHTML = '<div class="loading">Abriendo tu portal…</div>';
    let net; try { net = await C.rpc('iclub_net_read'); } catch (e) { if (/sesión|Sesión/.test(e.message)) { C.api.storeToken(null); return C.login(root, 'Portal de referidos', 'Ingresá con tu celular y contraseña de ICLUB.', load); } root.innerHTML = '<div class="card login"><h1>Sin acceso</h1><p class="muted">' + esc(e.message) + '</p><button class="btn-2" data-act="logout" style="margin-top:14px">Salir</button></div>'; return; }
    const [refs, st] = await Promise.all([C.rpc('iclub_ref_read').catch(() => null), C.api.read().catch(() => null)]);
    const admin = net.role === 'admin';
    S = { net, refs, admin, name: admin ? 'Administrador' : (net.name || ''), phone: net.phone,
      cfg: admin ? { mode: 'fixed', usd: 25, allowExtra: true, ejemplo: true } : (net.commission && net.commission.mode ? net.commission : null),
      lists: admin ? net.data.lists || {} : net.lists || {}, settings: admin ? { rate: 1520 } : net.settings, client: st && st.data && st.data.clients ? st.data.clients[st.user] : null, sales: refs && !refs.admin ? refs.data.sales || [] : [], program: refs && refs.data && refs.data.program || {} };
    if (admin && st && st.data) { S.settings = { rate: Number(st.data.settings.rate) || 1520, recargos: st.data.settings.recargos || {} }; }
    if (net.role === 'investor') { location.assign('/inversores'); return; }
    if (!admin && !sessionStorage.getItem('iclub-tracked')) { C.track('login', {}); sessionStorage.setItem('iclub-tracked', '1'); }
    render();
  }
  const rate = () => Number(S.settings && S.settings.rate) || 1520;
  const recargos = () => { const r = S.settings && S.settings.recargos; return r && Object.keys(r).length ? r : defaults.recargos; };
  const extra = () => (S.cfg && S.cfg.allowExtra === false ? 0 : Math.max(0, C.num(ui.extra)));
  const gainCash = (u) => M.referrerGain(S.cfg || {}, u, extra(), {}, rate())[0].gananciaUsd;
  const linesOf = (k) => ((S.lists[k] && S.lists[k].items) || []).slice().sort(L.compare);
  function summary() {
    const toArs = (s, v) => Number(v || 0) * (s.commissionCurrency === 'USD' ? rate() : 1);
    const lib = (s) => s.delivered ? Number(s.commission) * Number(s.collected) / (Number(s.total) || 1) : 0;
    const applied = (s) => (s.history || []).filter((h) => h.action === 'applied').reduce((a, h) => a + Number(h.amount || 0), 0);
    const tot = S.sales.reduce((a, s) => a + toArs(s, s.commission), 0), paid = S.sales.reduce((a, s) => a + toArs(s, s.paid), 0), app = S.sales.reduce((a, s) => a + toArs(s, applied(s)), 0), avail = S.sales.reduce((a, s) => a + toArs(s, Math.max(0, lib(s) - s.paid)), 0);
    return { tot, paid, app, cash: paid - app, avail, pend: tot - paid };
  }
  function render() {
    const debt = S.client ? M.saldo(S.client) : 0; const hasPlans = S.client && (S.client.movs || []).some((m) => m.finan);
    const tabs = [['stock', 'Disponible ahora'], ['order', 'Por encargo'], ['ventas', 'Mis ventas']].concat(hasPlans ? [['cuotas', 'Mis cuotas']] : []).concat([['info', 'Cómo funciona']]);
    const s = summary();
    root.innerHTML = '<div class="page-head"><div><h1>Hola, ' + esc(C.first(S.name)) + '</h1><p>' + (S.cfg ? 'Ganás ' + (S.cfg.mode === 'percent' ? S.cfg.percent + '% de cada venta (si el cliente financia, ganás más)' : usd(S.cfg.usd) + ' por cada equipo') + (S.cfg.ejemplo ? ' · <b>ejemplo: estás viendo el portal como administrador</b>' : '') : 'ICLUB todavía no configuró tu comisión.') + '</p></div><div class="spacer"></div>' + (S.admin ? '<a class="btn btn-2" href="/gestion#referidos">Volver al panel</a>' : '') + '<button class="btn-2" data-act="logout">Salir</button></div>' +
      (S.program.welcome ? '<div class="note">' + esc(S.program.welcome) + '</div>' : '') +
      '<div class="kpis"><div class="kpi dark"><span class="lbl">Ganaste en total</span><span class="num">' + ars(s.tot) + '</span><span class="sub">' + S.sales.length + (S.sales.length === 1 ? ' venta' : ' ventas') + '</span></div><div class="kpi good"><span class="lbl">Listo para cobrar</span><span class="num">' + ars(s.avail) + '</span><span class="sub">el cliente ya pagó esa parte</span></div><div class="kpi"><span class="lbl">Ya cobraste</span><span class="num">' + ars(s.cash) + '</span><span class="sub">en efectivo</span></div>' + (s.app > 0 || debt > 0 ? '<div class="kpi"><span class="lbl">Descontado de tus cuotas</span><span class="num">' + ars(s.app) + '</span><span class="sub">' + (debt > 0 ? 'todavía debés ' + ars(debt) : 'terminaste de pagar') + '</span></div>' : '') + '</div>' +
      '<div class="tabs">' + tabs.map(([k, l]) => '<a href="#" data-tab="' + k + '" class="' + (ui.tab === k ? 'on' : '') + '">' + l + '</a>').join('') + '</div>' +
      (ui.tab === 'stock' || ui.tab === 'order' ? listView(ui.tab) : ui.tab === 'ventas' ? ventasView() : ui.tab === 'cuotas' ? cuotasView() : infoView());
  }
  function listView(k) {
    const l = S.lists[k], q = ui.q.toLowerCase(), items = linesOf(k).filter((x) => !q || (x.name + ' ' + x.spec).toLowerCase().includes(q)), ex = extra();
    if (!l || !l.items.length) return '<div class="card">' + '<div class="empty">' + (k === 'stock' ? 'Todavía no hay equipos disponibles publicados.' : 'Todavía no hay lista de equipos por encargo.') + '</div></div>';
    const groups = new Map(); items.forEach((x) => { const g = x.cat || 'Otros'; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(x); });
    return '<div class="card" style="margin-bottom:16px"><div class="grid g3" style="align-items:end"><label class="f">Buscar<input type="search" data-ui="q" value="' + esc(ui.q) + '" placeholder="iPhone, Redmi, 128…"></label>' + (S.cfg && S.cfg.allowExtra === false ? '<span></span>' : '<label class="f">Sumar USD por equipo<input data-ui="extra" inputmode="decimal" value="' + esc(ui.extra) + '" placeholder="0"><small>Lo que sumes es todo para vos, además de tu comisión.</small></label>') + '<button class="btn-brand" data-act="copy-list">Copiar lista ' + (ex ? 'con +' + usd(ex) : 'tal cual') + '</button></div><p class="small muted" style="margin-top:10px">Actualizada ' + new Date(l.updatedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) + ' · ' + l.items.length + ' equipos · dólar ' + ars(rate()) + '</p></div>' +
      [...groups].map(([g, list]) => '<div class="card"><h2 style="margin-bottom:6px">' + esc(g) + '</h2><div class="list">' + list.map((x) => { const price = Number(x.usd) + ex; return '<div class="item"><div class="grow"><div class="main-t">' + esc(x.name) + '</div><div class="sub-t">' + esc(x.spec || '') + (k === 'stock' && x.stock != null ? ' · ' + (Number(x.stock) > 0 ? '<b>' + x.stock + ' disponibles</b>' : '<b class="bad">sin stock</b>') : k === 'order' ? ' · por encargo' : '') + '</div><div class="small" style="margin-top:4px">Contado <b>' + usd(price) + '</b> · ' + ars(price * rate()) + '</div></div><div class="right">' + (S.cfg ? '<div class="small muted">Ganás' + (S.cfg.mode === 'percent' ? ' desde' : '') + '</div><div class="amt good">' + usd(gainCash(x.usd)) + '</div>' : '') + '</div><button class="btn-sm btn-brand" data-act="quote" data-k="' + k + '" data-id="' + esc(x.id) + '">Cotizar</button></div>'; }).join('') + '</div></div>').join('');
  }
  function listText(k) {
    const ex = extra(), items = linesOf(k).filter((x) => k !== 'stock' || x.stock == null || Number(x.stock) > 0); const groups = new Map(); items.forEach((x) => { const g = x.cat || 'Otros'; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(x); });
    const out = ['*ICLUB · ' + (k === 'stock' ? 'Disponibles ahora' : 'Por encargo') + '* (' + M.fmtDate(new Date()).slice(0, 5) + ')', ''];
    for (const [g, list] of groups) { out.push('*' + g + '*'); list.forEach((x) => out.push('• ' + x.name + (x.spec ? ' ' + x.spec : '') + ' — USD ' + M.r2(Number(x.usd) + ex))); out.push(''); }
    out.push('Precios de contado en dólares (o pesos al cambio del día). Consultá por financiación en cuotas.'); return { text: out.join('\n'), count: items.length };
  }
  function quote(k, id) {
    const x = linesOf(k).find((i) => i.id === id); if (!x) return; ui.quote = { k, id };
    const ex = extra(), rows = M.referrerGain(S.cfg || {}, x.usd, ex, recargos(), rate());
    C.track('quote', { product: x.name + ' ' + (x.spec || ''), mode: 'abrir', extraUsd: ex, list: k });
    const best = rows.find((r) => r.best);
    C.modal(x.name + (x.spec ? ' · ' + x.spec : ''), '<div class="grid g2"><label class="f">Precio para el cliente (USD)<input value="' + esc(M.r2(Number(x.usd) + ex)) + '" readonly><small>Lista ' + usd(x.usd) + (ex ? ' + tu extra ' + usd(ex) : '') + '</small></label>' + (S.cfg && S.cfg.allowExtra === false ? '' : '<label class="f">Sumar USD por equipo<input id="qExtra" inputmode="decimal" value="' + esc(ui.extra) + '" placeholder="0"></label>') + '</div>' +
      (best ? '<div class="note good">Te conviene más: <b>' + esc(best.label) + '</b> → ganás ' + usd(best.gananciaUsd) + ' (' + ars(best.gananciaArs) + ')</div>' : S.cfg && S.cfg.mode !== 'percent' ? '<div class="note">Con tu comisión fija ganás lo mismo con cualquier forma de pago. Para ganar más, sumá USD por equipo.</div>' : '') +
      '<div class="table-wrap"><table class="table"><thead><tr><th></th><th>Forma de pago</th><th class="num">Cuota</th><th class="num">Total</th>' + (S.cfg ? '<th class="num">Ganás vos</th>' : '') + '</tr></thead><tbody>' + rows.map((r) => '<tr style="' + (r.best ? 'background:#f0fdf4' : '') + '"><td><input type="checkbox" class="qopt" value="' + r.key + '" ' + (r.key === 'contado' || r.best ? 'checked' : '') + ' style="width:20px;min-height:0"></td><td><b>' + esc(r.label) + '</b>' + (r.recargo ? '<br><span class="tiny muted">o ' + r.cuotas * 4 + ' semanales de ' + ars(r.totalArs / (r.cuotas * 4)) + '</span>' : '') + '</td><td class="num">' + (r.cuotas > 1 ? r.cuotas + ' × ' + ars(r.cuotaArs) : '—') + '</td><td class="num">' + ars(r.totalArs) + '<br><span class="tiny muted">' + usd(r.totalUsd) + '</span></td>' + (S.cfg ? '<td class="num ' + (r.best ? 'good strong' : '') + '">' + usd(r.gananciaUsd) + '<br><span class="tiny muted">' + ars(r.gananciaArs) + '</span></td>' : '') + '</tr>').join('') + '</tbody></table></div>' +
      '<label class="f">Nombre del cliente (opcional)<input id="qClient" placeholder="Para el mensaje"></label><div class="row-flex"><button class="btn-wa" data-act="copy-quote">Copiar mensaje para WhatsApp</button><span class="small muted">Marcá las formas de pago que querés incluir.</span></div><p class="disclaimer">Montos en pesos al dólar ' + ars(rate()) + '. ICLUB confirma la financiación al registrar la venta.</p>');
  }
  function quoteText() {
    const { k, id } = ui.quote, x = linesOf(k).find((i) => i.id === id), ex = extra(), rows = M.referrerGain(S.cfg || {}, x.usd, ex, recargos(), rate());
    const sel = [...document.querySelectorAll('.qopt:checked')].map((c) => c.value); const cl = (C.$('#qClient') || {}).value || '';
    const lines = ['Hola' + (cl ? ' ' + cl : '') + '! Te paso la cotización de *' + x.name + (x.spec ? ' ' + x.spec : '') + '* en ICLUB:', ''];
    rows.filter((r) => sel.includes(r.key)).forEach((r) => lines.push(r.key === 'contado' ? '💵 Contado: ' + usd(r.totalUsd) + ' (' + ars(r.totalArs) + ')' : '📅 ' + r.cuotas + ' cuotas mensuales de ' + ars(r.cuotaArs) + ' (o ' + r.cuotas * 4 + ' semanales de ' + ars(r.totalArs / (r.cuotas * 4)) + ')'));
    lines.push('', k === 'stock' ? 'Disponible para entrega inmediata.' : 'Equipo por encargo: consultá el plazo de entrega.', 'Precios al dólar del día, sujetos a confirmación.'); return { text: lines.join('\n'), modes: sel };
  }
  function ventasView() {
    if (!S.sales.length) return '<div class="card"><div class="empty">Todavía no tenés ventas registradas. Cuando ICLUB registre una venta tuya, la vas a ver acá con tu ganancia.</div></div>';
    return '<div class="card"><div class="list">' + S.sales.slice().sort((a, b) => String(b.created).localeCompare(String(a.created))).map((s) => { const pct = Math.min(100, Math.round(Number(s.collected) / (Number(s.total) || 1) * 100)); const lib = s.delivered ? M.r2(Number(s.commission) * Number(s.collected) / (Number(s.total) || 1)) : 0; const app = (s.history || []).filter((h) => h.action === 'applied').reduce((a, h) => a + Number(h.amount || 0), 0); const cash = M.r2(Number(s.paid) - app); return '<div class="item"><div class="grow"><div class="main-t">' + esc(s.label) + '</div><div class="sub-t">Cliente ' + esc(s.client) + ' · ' + new Date(s.created).toLocaleDateString('es-AR') + (s.extraUsd ? ' · sumaste ' + usd(s.extraUsd) : '') + '</div><div class="row-flex" style="margin-top:6px;gap:10px"><div class="progress" style="width:140px"><i style="width:' + pct + '%"></i></div><span class="small">el cliente pagó ' + pct + '%</span>' + (s.delivered ? '' : chip('Falta entregar', 'warn')) + '</div><div class="small" style="margin-top:6px">Liberado ' + C.money(lib, s.commissionCurrency) + (cash > 0 ? ' · cobraste ' + C.money(cash, s.commissionCurrency) : '') + (app > 0 ? ' · <span class="disc" style="color:#7c3aed;font-weight:700">' + C.money(app, s.commissionCurrency) + ' descontado de tus cuotas</span>' : '') + (lib - s.paid > 0.005 ? ' · <b class="good">listo para cobrar ' + C.money(lib - s.paid, s.commissionCurrency) + '</b>' : '') + '</div></div><div class="right"><div class="small muted">Tu ganancia</div><div class="amt">' + C.money(s.commission, s.commissionCurrency) + '</div></div></div>'; }).join('') + '</div></div>';
  }
  function cuotasView() {
    const c = S.client; const plans = (c.movs || []).filter((m) => m.finan); const ncs = (c.movs || []).filter((m) => m.auto === 'comision');
    return (ncs.length ? '<div class="note good">Tus comisiones ya pagaron <b>' + ars(ncs.reduce((a, m) => a + Number(m.imp), 0)) + '</b> de tus cuotas, empezando por las últimas.</div>' : '') + plans.map((pm) => { const pc = P._planCalc(c, pm); return '<div class="card"><div class="card-head"><div><h2>' + esc(pm.prodName || String(pm.det || '').split(' · ')[0]) + '</h2><p>' + pc.pagadas + ' de ' + pc.n + ' cuotas pagadas · te falta ' + ars(pc.pendiente) + '</p></div></div>' + C.cuotas(c, pm) + '</div>'; }).join('') +
      (ncs.length ? '<div class="card"><h2>Descuentos por tus ventas</h2><div class="list">' + ncs.slice().reverse().map((m) => '<div class="item"><div class="grow"><div class="strong">' + esc(m.det) + '</div><div class="sub-t">' + esc(m.f + ' · ' + m.doc) + '</div></div><div class="amt good">−' + ars(m.imp) + '</div></div>').join('') + '</div></div>' : '');
  }
  function infoView() { const p = S.program; return '<div class="card"><h2>' + esc(p.title || 'Cómo funciona') + '</h2><div style="white-space:pre-line;margin-top:10px">' + esc(p.instructions || 'Compartí las listas con tus contactos. Cuando alguien compre, avisale a ICLUB para registrar la venta a tu nombre.\n\nTu comisión se libera a medida que el cliente paga y una vez entregado el equipo. Si tenés cuotas pendientes con ICLUB, tu comisión se descuenta de tus cuotas empezando por la última; si no debés nada, la cobrás en efectivo.\n\nPodés sumar un extra en dólares a cada equipo: ese extra es todo para vos.') + '</div></div>'; }

  document.addEventListener('click', async (e) => {
    const tab = e.target.closest('[data-tab]'); if (tab) { e.preventDefault(); ui.tab = tab.dataset.tab; render(); if (!S.admin) C.track('view', { section: tab.textContent }); return; }
    const b = e.target.closest('[data-act]'); if (!b) return; const act = b.dataset.act;
    if (act === 'logout') return C.logout();
    if (act === 'quote') return quote(b.dataset.k, b.dataset.id);
    if (act === 'copy-list') { const { text, count } = listText(ui.tab); const ok = await C.copy(text); C.toast(ok ? 'Lista copiada (' + count + ' equipos). Pegala en WhatsApp.' : 'No se pudo copiar: probá de nuevo.', !ok); if (ok && !S.admin) C.track('copy_list', { kind: ui.tab, extraUsd: extra(), count }); return; }
    if (act === 'copy-quote') { const { text, modes } = quoteText(); const ok = await C.copy(text); C.toast(ok ? 'Cotización copiada. Pegala en WhatsApp.' : 'No se pudo copiar.', !ok); const x = linesOf(ui.quote.k).find((i) => i.id === ui.quote.id); if (ok && !S.admin) C.track('copy_quote', { product: x.name + ' ' + (x.spec || ''), extraUsd: extra(), modes }); }
  });
  document.addEventListener('input', (e) => {
    const t = e.target; if (t.dataset.ui) { ui[t.dataset.ui] = t.value; clearTimeout(ui._t); ui._t = setTimeout(() => { const p0 = t.selectionStart, name = t.dataset.ui; render(); const n = C.$('[data-ui="' + name + '"]'); if (n) { n.focus(); try { n.setSelectionRange(p0, p0); } catch (_) {} } }, 200); }
    if (t.id === 'qExtra') { ui.extra = t.value; clearTimeout(ui._q); ui._q = setTimeout(() => { quote(ui.quote.k, ui.quote.id); const n = C.$('#qExtra'); n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (_) {} }, 350); }
  });
  if (!C.api.token) C.login(root, 'Portal de referidos', 'Ingresá con tu celular y contraseña de ICLUB.', load); else load();
})();
