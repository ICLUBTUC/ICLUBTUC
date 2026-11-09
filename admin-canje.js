/* ICLUB · Plan canje en el panel: tabla de valores (se publica en la página) y consultas que llegan. */
(function () {
  'use strict';
  const A = window.ICA; const { esc, chip } = A;
  const MOD = window.ICLUBCanjeModelos || [], DEF = window.ICLUBCanjeDefaults || { bateria: [], danos: [] };
  const cfg = () => Object.assign({ modelos: {}, bateria: DEF.bateria, danos: DEF.danos }, (A.db.settings && A.db.settings.canje) || {});
  A.canjeCard = () => {
    const c = cfg(), cargados = Object.values(c.modelos || {}).filter((v) => Number(v) > 0).length;
    return '<div class="card"><div class="card-head"><div><h2>Plan canje (página)</h2><p>Valor en USD que pagás por cada iPhone en perfecto estado. La página descuenta batería y daños. Lo que dejes vacío no se muestra.</p></div><div class="spacer"></div><a class="btn-2 btn-sm" href="/canje" target="_blank" rel="noopener">Ver la página</a></div>' +
      (cargados ? '' : '<div class="note warn">Todavía no cargaste valores: la página dice "Te lo cotizamos por WhatsApp". Cargá al menos tus modelos más comunes.</div>') +
      '<form id="canjeForm" class="grid"><details' + (cargados ? '' : ' open') + '><summary class="strong">Valores por modelo (USD) · ' + cargados + ' cargados</summary><div class="table-wrap" style="margin-top:8px"><table class="table"><thead><tr><th>Modelo</th><th colspan="4">Capacidad → valor en USD</th></tr></thead><tbody>' +
      MOD.map((g) => g.items.map((it) => '<tr><td class="strong nowrap">' + esc(it.n) + '</td>' + it.gb.map((gb) => '<td><label class="tiny muted" style="display:block">' + gb + (/TB/.test(gb) ? '' : ' GB') + '<input name="m_' + esc(it.id + '|' + gb) + '" inputmode="decimal" value="' + esc(c.modelos[it.id + '|' + gb] || '') + '" style="width:86px;padding:8px" placeholder="—"></label></td>').join('') + '</tr>').join('')).join('') + '</tbody></table></div></details>' +
      '<details><summary class="strong">Descuentos por batería (USD)</summary><div class="grid g3" style="margin-top:8px">' + c.bateria.map((b, i) => '<label class="f">' + esc(b.l) + '<input name="b_' + i + '" inputmode="decimal" value="' + esc(b.d) + '"></label>').join('') + '</div></details>' +
      '<details><summary class="strong">Descuentos por daño (USD)</summary><div class="grid g3" style="margin-top:8px">' + c.danos.map((d, i) => '<label class="f">' + esc(d.l) + '<input name="d_' + i + '" inputmode="decimal" value="' + esc(d.d) + '"></label>').join('') + '</div></details>' +
      '<button class="btn-good">Guardar y publicar</button></form></div>';
  };
  A.saveCanje = (f) => {
    const c = cfg(), e = f.elements, modelos = {};
    MOD.forEach((g) => g.items.forEach((it) => it.gb.forEach((gb) => { const el = e['m_' + it.id + '|' + gb]; const v = el ? A.num(el.value) : NaN; if (v > 0) modelos[it.id + '|' + gb] = Math.round(v); })));
    const bateria = c.bateria.map((b, i) => Object.assign({}, b, { d: Math.max(0, Math.round(A.num(e['b_' + i].value) || 0)) }));
    const danos = c.danos.map((d, i) => Object.assign({}, d, { d: Math.max(0, Math.round(A.num(e['d_' + i].value) || 0)) }));
    A.saveSettings({ canje: { modelos, bateria, danos } }, 'Plan canje guardado. Ya se ve en la página.');
  };
  /* Consultas de la página (canje). */
  A._leads = null;
  A.loadLeads = async (force) => { if (A._leads && !force) return A._leads; try { const r = await A.rpc('iclub_leads', { p_action: 'list', p_item: {} }); A._leads = r.leads || []; } catch (e) { A._leads = { error: /iclub_leads|function|schema/i.test(e.message) ? 'Ejecutá migraciones/14-plan-canje.sql en Supabase.' : e.message }; } return A._leads; };
  const usd = (n) => 'US$' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(n || 0));
  const leadRow = (l) => { const d = l.data || {}; const tel = String(d.phone || ''), wa = tel ? A.waLink(tel, 'Hola ' + (String(d.name || '').split(' ')[0]) + ', te escribo de ICLUB por la cotización de tu ' + (d.modelo || 'iPhone') + '.') : '';
    return '<div class="item"><div class="grow"><div class="strong">' + esc(d.name || 'Sin nombre') + ' ' + chip(l.estado === 'nuevo' ? 'Nueva' : l.estado === 'contactado' ? 'Contactado' : l.estado === 'vendido' ? 'Vendido' : 'Descartada', l.estado === 'nuevo' ? 'info' : l.estado === 'vendido' ? 'good' : 'muted') + '</div><div class="sub-t">Entrega ' + esc((d.modelo || '') + ' ' + (d.gb || '') + (/TB/.test(d.gb || '') ? '' : ' GB')) + ' · bat. ' + esc(d.bateria || '') + (d.danos && d.danos.length ? ' · ' + esc(d.danos.join(', ')) : '') + '</div><div class="sub-t">' + (d.valor != null ? 'Cotizado <b>' + usd(d.valor) + '</b>' : 'Sin valor') + (d.quiere ? ' · quiere ' + esc(d.quiere) + (d.diferencia != null ? ' (dif. ' + usd(d.diferencia) + ')' : '') : '') + ' · ' + new Date(l.at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) + '</div></div>' +
      (wa ? '<a class="btn-sm btn-wa" href="' + wa + '" target="_blank" rel="noopener" data-act="lead-estado" data-id="' + l.id + '" data-e="contactado">WhatsApp</a>' : '') + '<select class="btn-sm" data-lead="' + l.id + '" aria-label="Estado">' + ['nuevo', 'contactado', 'vendido', 'descartado'].map((s) => '<option value="' + s + '"' + (l.estado === s ? ' selected' : '') + '>' + s[0].toUpperCase() + s.slice(1) + '</option>').join('') + '</select></div>'; };
  function wConsultas() {
    setTimeout(async () => { const box = A.$('#leadsBox'); if (!box) return; const l = await A.loadLeads(); if (!A.$('#leadsBox')) return; A.$('#leadsBox').innerHTML = l.error ? '<div class="note warn">' + esc(l.error) + '</div>' : l.length ? l.filter((x) => x.estado === 'nuevo' || x.estado === 'contactado').slice(0, 8).map(leadRow).join('') || '<div class="empty" style="padding:14px">Sin consultas pendientes.</div>' : '<div class="empty" style="padding:14px">Todavía no llegaron consultas de canje.</div>'; }, 0);
    return '<div class="card-head" style="margin-bottom:6px"><h2>Consultas de Plan canje</h2><div class="spacer"></div><a class="small" href="/canje" target="_blank" rel="noopener">Ver página</a></div><p class="tiny muted" style="margin:0 0 8px">Lo que cotizaron en la página. Escribiles y marcá cómo terminó.</p><div class="list" id="leadsBox"><div class="small muted">Cargando…</div></div>';
  }
  A.leadEstado = async (id, estado) => { try { await A.rpc('iclub_leads', { p_action: 'estado', p_item: { id, estado } }); await A.loadLeads(true); A._keepScroll = true; A.render(); } catch (e) { A.toast(e.message, true); } };
  if (A.registerWidget) A.registerWidget('consultas', { t: 'Consultas de Plan canje', s: 6, fn: wConsultas }, true);
})();
