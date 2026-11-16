/* ICLUB · Mercado Pago en el panel.
   - Ajustes → Mercado Pago: estado, clave para Vercel, recargo (lo paga el cliente) y últimos pagos que entraron solos.
   - Al cobrar: botón "Mandar link de Mercado Pago" que arma el link por el importe y lo abre en WhatsApp. */
(function () {
  'use strict';
  const A = window.ICA; const { esc } = A;
  let ST = null;
  const load = async () => { try { ST = await A.rpc('iclub_mp_admin', { p_action: 'status', p_item: {} }); } catch (e) { ST = { ok: false, error: String(e.message || e) }; } return ST; };
  A.mpLink = async (phone, doc, monto, cuota) => {
    const r = await fetch('/api/mp-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: A.api.token, phone, doc, monto, cuota }) });
    const j = await r.json().catch(() => ({ ok: false, error: 'El servidor no respondió.' })); if (!j.ok) throw new Error(j.error || 'No se pudo crear el link.'); return j;
  };
  const pasos = '<ol class="small" style="margin:6px 0 10px;padding-left:18px;line-height:1.6"><li>Entrá a <b>mercadopago.com.ar/developers</b> → "Tus integraciones" → <b>Crear aplicación</b> (tipo "Pagos online", producto "Checkout Pro").</li><li>En la aplicación, abrí <b>Credenciales de producción</b> y copiá el <b>Access Token</b> (empieza con APP_USR-). No se lo pases a nadie.</li><li>En <b>Vercel</b> → tu proyecto → Settings → <b>Environment Variables</b>, agregá <code>MP_ACCESS_TOKEN</code> con ese valor.</li><li>Acá abajo tocá <b>Generar clave</b> y agregá en Vercel <code>ICLUB_MP_SECRET</code> con la clave que aparece.</li><li>En Vercel tocá <b>Redeploy</b>. Listo: probá con "Probar link".</li></ol>';
  A.mpCard = () => {
    const body = !ST ? '<p class="small muted">Cargando…</p>' : !ST.ok ? '<p class="small bad">' + esc(/function|does not exist|404/.test(ST.error || '') ? 'Falta correr la migración 17-mercadopago.sql en Supabase.' : ST.error) + '</p>' :
      '<div class="row-flex" style="gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px">' + (ST.activo ? A.chip('Clave lista', 'good') : A.chip('Sin configurar', 'warn')) + '<span class="small muted">' + (ST.clave ? 'Clave generada.' : 'Todavía no generaste la clave.') + '</span></div>' + pasos +
      '<form id="mpForm" class="grid g3" style="align-items:end"><label class="f">Recargo Mercado Pago (%)<input name="fee" inputmode="decimal" value="' + esc(ST.fee) + '"><small>Lo paga el cliente. "Al instante" ≈ 7,61% (6,29% + IVA).</small></label><label class="f">&nbsp;<button class="btn-brand">Guardar</button></label><label class="f">&nbsp;<button type="button" class="btn-2" data-act="mp-clave">' + (ST.clave ? 'Generar clave nueva' : 'Generar clave') + '</button></label></form><div id="mpClave"></div>' +
      '<div class="row-flex" style="gap:8px;margin-top:10px"><button type="button" class="btn-2 btn-sm" data-act="mp-test">Probar link ($100)</button></div>' +
      (ST.pagos && ST.pagos.length ? '<div class="list" style="margin-top:12px">' + ST.pagos.map((p) => '<div class="item"><div class="grow"><div class="main-t">' + esc((A.db.clients[p.phone] || {}).name || p.phone) + '</div><div class="sub-t">' + new Date(p.at).toLocaleString('es-AR') + ' · ' + esc(p.doc || '') + ' · MP ' + esc(p.id) + '</div></div><b>' + A.ars(p.monto) + '<div class="tiny muted">cobró ' + A.ars(p.cobrado) + '</div></b></div>').join('') + '</div>' : '<p class="tiny muted" style="margin-top:8px">Cuando alguien pague, aparece acá y en su cuenta, solo.</p>');
    if (!ST) load().then(() => { const el = A.$('#mpCardBox'); if (el) el.innerHTML = A.mpCard().replace(/^<div class="card" id="mpCardBox">|<\/div>$/g, ''); });
    return '<div class="card" id="mpCardBox"><div class="card-head"><div><h2>Mercado Pago</h2><p>El cliente paga su cuota con un link y el pago se carga solo. El recargo de Mercado Pago lo paga él.</p></div></div>' + body + '</div>';
  };
  const refresh = async () => { await load(); A.render(); };
  document.addEventListener('submit', (ev) => { const f = ev.target; if (f.id !== 'mpForm') return; ev.preventDefault(); A.act(async () => { const r = await A.rpc('iclub_mp_admin', { p_action: 'config', p_item: { fee: A.num(f.elements.fee.value) } }); if (!r.ok) throw Error(r.error); await refresh(); }, 'Recargo guardado.'); });
  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-act="mp-clave"],[data-act="mp-test"],[data-act="mp-send"]'); if (!b) return; ev.preventDefault();
    if (b.dataset.act === 'mp-clave') { if (ST && ST.clave && !confirm('Si generás una clave nueva, tenés que cambiarla también en Vercel. ¿Seguro?')) return; A.act(async () => { const r = await A.rpc('iclub_mp_admin', { p_action: 'clave', p_item: {} }); if (!r.ok) throw Error(r.error); await load(); A.render(); setTimeout(() => { const el = A.$('#mpClave'); if (el) el.innerHTML = '<div class="note" style="margin-top:10px">Copiá esta clave y pegala en Vercel como <code>ICLUB_MP_SECRET</code>. <b>No se vuelve a mostrar.</b><input readonly value="' + esc(r.clave) + '" style="width:100%;margin-top:6px;font-family:monospace" onclick="this.select()"></div>'; }, 50); }, 'Clave generada.'); }
    else if (b.dataset.act === 'mp-test') { const ph = Object.keys(A.db.clients || {})[0]; if (!ph) return A.toast('Necesitás al menos un cliente.', true); try { const r = await A.mpLink(ph, 'PRUEBA', 100, ''); window.open(r.url, '_blank', 'noopener'); A.toast('Link creado: cobra ' + A.ars(r.total) + '. No hace falta pagarlo.'); } catch (e) { A.toast(e.message, true); } }
    else if (b.dataset.act === 'mp-send') {
      const f = b.closest('form'), phone = f.dataset.phone, doc = f.dataset.doc, monto = A.num(f.elements.amount.value), c = A.db.clients[phone] || {};
      if (!(monto >= 100)) return A.toast('Poné el importe de la cuota.', true);
      const w = window.open('', '_blank'); b.disabled = true;
      try { const r = await A.mpLink(phone, doc, monto, ''); const txt = 'Hola ' + A.first(c.name || '') + '! Te paso el link para pagar ' + A.ars(monto) + ' de tu cuenta iClub con Mercado Pago 💳\n' + r.url + '\n\nCon la comisión de Mercado Pago el total es ' + A.ars(r.total) + '. Apenas pagás, se registra solo en tu cuenta ✅';
        if (w) w.location = A.waLink(phone, txt); else window.open(A.waLink(phone, txt), '_blank'); A.toast('Link listo: el cliente paga ' + A.ars(r.total) + ' y a vos te quedan ' + A.ars(monto) + '.'); }
      catch (e) { if (w) w.close(); A.toast(/Falta|no está activo|404|servidor/.test(e.message) ? 'Mercado Pago todavía no está configurado (Ajustes → Mercado Pago).' : e.message, true); }
      b.disabled = false;
    }
  });
  /* Botón en el formulario de cobro. */
  const open0 = A.openPay; A.openPay = (phone, doc) => { const r = open0(phone, doc); const f = A.$('#payForm'); if (f && !f.querySelector('[data-act=mp-send]') && A.isAdmin && A.isAdmin()) { const btn = f.querySelector('button.btn-good'); if (btn) btn.insertAdjacentHTML('afterend', '<button type="button" class="btn-2" data-act="mp-send" style="margin-top:6px">Mandar link de Mercado Pago</button>'); } return r; };
})();
