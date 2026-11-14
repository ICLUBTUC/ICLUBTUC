/* ICLUB · Plan de ahorro (página pública).
   El cliente elige un iPhone, ve la cuota en dólares y en pesos, y entiende los dos caminos:
   completar el total y llevárselo sin recargo, o retirarlo antes (desde la mitad pagada) con el recargo normal sobre lo que falta.
   La configuración sale de Ajustes → Plan de ahorro del panel (settings.ahorro). */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }), nf2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usd = (n) => 'USD ' + (Math.abs(n - Math.round(n)) > 0.004 ? nf2.format(n) : nf.format(n)), ars = (n) => '$' + nf.format(Math.round(n));
  const DEF = { on: true, meses: 6, minPct: 50, rec1: 10, items: [
    { name: 'iPhone 13', spec: '128 GB', usd: 370 }, { name: 'iPhone 14', spec: '128 GB', usd: 400 },
    { name: 'iPhone 13 Pro', spec: '128 GB', usd: 485, destacado: true, motivos: ['Pantalla de 120 Hz, mucho más fluida', 'Triple cámara con zoom óptico 3x y modo macro', 'Cuerpo de acero inoxidable, más premium'] },
    { name: 'iPhone 14 Pro', spec: '128 GB', usd: 550 }, { name: 'iPhone 16 Pro', spec: '128 GB', usd: 825 }] };
  let D = null; const S = { sel: null, meses: null, name: '', phone: '', err: '' };
  const cfg = () => { const c = (D && D.settings && D.settings.ahorro) || {}; const items = (c.items && c.items.length ? c.items : DEF.items).filter((x) => x && x.name && Number(x.usd) > 0); return Object.assign({}, DEF, c, { items, meses: Math.min(12, Math.max(1, Number(c.meses) || DEF.meses)), minPct: Math.min(95, Math.max(10, Number(c.minPct) || DEF.minPct)) }); };
  const rate = () => Number(D && D.settings && D.settings.rate) || 1520;
  /* Recargo de la financiación normal según cuántas cuotas quedan (Ajustes → Financiación propia). */
  const recargo = (n) => { const r = (D && D.settings && D.settings.recargos) || {}; if (n <= 1) return Number(cfg().rec1) || 0; const v = Number(r[n] != null ? r[n] : r[String(n)]); return Number.isFinite(v) ? v : ({ 2: 25, 3: 45, 4: 65, 5: 80, 6: 90 })[n] || 0; };
  const escala = (item, meses) => { const c = cfg(), pasos = [...new Set([c.minPct, 75, 100].filter((p) => p >= c.minPct))].sort((a, b) => a - b); return pasos.map((p) => { const falta = item.usd * (1 - p / 100), cuotas = p >= 100 ? 0 : Math.max(1, Math.ceil(meses * (1 - p / 100))), rec = p >= 100 ? 0 : recargo(cuotas), extra = falta * rec / 100; return { p, falta, cuotas, rec, extra, cuota: cuotas ? (falta + extra) / cuotas : 0, total: item.usd + extra }; }); };
  const waNum = () => { const w = String((D && D.settings && D.settings.biz && D.settings.biz.wa) || '3814680653').replace(/\D/g, ''); return w.startsWith('54') ? w : '549' + w.replace(/^0/, ''); };

  function render() {
    const c = cfg(), root = $('#cj'); if (!c.on) { root.innerHTML = '<div class="cj-hero"><span class="cj-badge">Plan de ahorro</span></div><h1 class="cj-h1">Muy pronto</h1><p class="cj-sub">Escribinos por WhatsApp y te contamos.</p>'; return; }
    const items = c.items, dest = items.find((x) => x.destacado); if (S.sel == null) S.sel = items.indexOf(dest) >= 0 ? items.indexOf(dest) : 0; if (S.meses == null) S.meses = c.meses;
    const it = items[S.sel] || items[0], m = S.meses, cuota = it.usd / m, R = rate(), esc2 = escala(it, m);
    const msg = 'Hola, ¿cómo estás? Soy ' + (S.name.trim() || '(tu nombre)') + '. Me interesa el Plan de ahorro con el ' + it.name + (it.spec ? ' ' + it.spec : '') + ' (' + usd(it.usd) + ') en ' + m + (m === 1 ? ' pago' : ' cuotas') + ' de ' + usd(cuota) + ' (hoy ' + ars(cuota * R) + '). ¿Cómo empiezo?';
    S.msg = msg; S.it = it;
    let h = '<div class="cj-hero"><span class="cj-badge">Plan de ahorro iClub</span></div>' +
      '<h1 class="cj-h1">Tu iPhone en hasta ' + c.meses + ' meses, <span class="ah-hl">sin interés</span></h1>' +
      '<p class="cj-sub">Elegís el equipo, el precio queda fijo en dólares y lo vas pagando en pesos al dólar del día. Cuando completás, te lo llevás.</p>' +
      '<div class="cj-group">1 · Elegí tu iPhone</div><div class="ah-grid">' + items.map((x, i) => '<button class="ah-card' + (i === S.sel ? ' on' : '') + (x.destacado ? ' star' : '') + '" data-a="sel" data-v="' + i + '">' + (x.destacado ? '<span class="ah-star">★ Recomendado</span>' : '') + '<span class="ah-name">' + esc(x.name) + '</span><span class="ah-spec">' + esc(x.spec || '') + '</span><span class="ah-usd">' + usd(x.usd) + '</span><span class="ah-ars">' + ars(x.usd * R) + '</span><span class="ah-cuota">' + c.meses + ' × ' + usd(x.usd / c.meses) + '</span></button>').join('') + '</div>' +
      (dest ? '<div class="ah-why' + (it === dest ? ' on' : '') + '"><div class="ah-why-h">★ ¿Por qué el ' + esc(dest.name) + '?</div>' + (function () { const comun = items.filter((x) => !x.destacado && x.usd < dest.usd).sort((a, b) => b.usd - a.usd)[0]; return comun ? '<p>Por solo <b>' + usd(dest.usd - comun.usd) + ' más</b> que un ' + esc(comun.name) + ' tenés:</p>' : ''; })() + '<ul>' + (dest.motivos && dest.motivos.length ? dest.motivos : DEF.items[2].motivos).map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul><p class="ah-why-f">Es un Pro de verdad, al precio de uno común.</p></div>' : '') +
      '<div class="cj-group">2 · ¿En cuántos meses?</div><div class="ah-months">' + Array.from({ length: c.meses }, (_, i) => i + 1).map((n) => '<button class="ah-m' + (n === m ? ' on' : '') + '" data-a="mes" data-v="' + n + '">' + n + '</button>').join('') + '</div>' +
      '<div class="ah-result"><div class="cj-kicker">Pagás por mes</div><div class="cj-price">' + nf2.format(cuota).replace(/,00$/, '') + '<small>USD</small></div><div class="cj-ars">≈ <b>' + ars(cuota * R) + '</b> al dólar de hoy (' + ars(R) + ')</div><div class="cj-chips"><span class="cj-chip">' + esc(it.name + (it.spec ? ' ' + it.spec : '')) + '</span><span class="cj-chip">Total ' + usd(it.usd) + ' · ' + ars(it.usd * R) + '</span><span class="cj-chip">' + m + (m === 1 ? ' pago' : ' cuotas') + ' sin interés</span></div></div>' +
      '<div class="cj-group">Cómo funciona</div><div class="ah-steps"><div><i class="n">1</i><span>Elegís el iPhone y empezás a pagar. El precio queda <b>fijo en dólares</b>.</span></div><div><i class="n">2</i><span>Cada cuota la pagás en pesos <b>al dólar del día</b>. Lo que ya pagaste no pierde valor.</span></div><div><i class="n">3</i><span>Podés <b>adelantar plata cuando quieras</b>, y te falta menos.</span></div><div><i class="n">4</i><span>Completás el total y <b>te lo llevás sin ningún recargo</b>.</span></div></div>' +
      '<div class="cj-group">¿Lo querés antes?</div><p class="ah-p">Con el <b>' + c.minPct + '% pagado</b> ya lo podés retirar. Lo que te falta pasa a cuotas con el recargo normal de financiación. <b>Cuanto más tengas pagado, menos recargo pagás.</b> Ejemplo con el ' + esc(it.name) + ':</p>' +
      '<div class="ah-table"><div class="ah-tr ah-th"><span>Lo retirás con</span><span>Te falta</span><span>Recargo</span><span>Pagás después</span></div>' + esc2.map((x) => '<div class="ah-tr' + (x.p >= 100 ? ' best' : '') + '"><span><b>' + (x.p >= 100 ? 'Todo pagado' : x.p + '% pagado') + '</b><small>' + usd(it.usd * x.p / 100) + '</small></span><span>' + (x.falta > 0 ? usd(x.falta) : '—') + '</span><span>' + (x.p >= 100 ? '<b class="g">Sin recargo</b>' : x.rec + '%<small>+' + usd(x.extra) + '</small>') + '</span><span>' + (x.cuotas ? x.cuotas + ' × ' + usd(x.cuota) + '<small>≈ ' + ars(x.cuota * R) + ' c/u</small>' : '<b class="g">Te lo llevás</b>') + '</span></div>').join('') + '</div>' +
      '<p class="cj-note" style="text-align:left">Los pesos son con el dólar de hoy: cada cuota se calcula al dólar del día en que pagás. Precios en dólares sujetos a disponibilidad del equipo.</p>' +
      '<div class="cj-sep">EMPEZÁ TU PLAN</div>' +
      '<label class="cj-field"><span>Tu nombre</span><input data-f="name" value="' + esc(S.name) + '" autocomplete="name" placeholder="Nombre y apellido" maxlength="60"></label>' +
      '<label class="cj-field"><span>Tu celular (opcional)</span><input data-f="phone" value="' + esc(S.phone) + '" inputmode="tel" autocomplete="tel" placeholder="381 000 0000" maxlength="20"></label>' +
      '<div class="cj-msg" id="cjMsg">' + esc(msg) + '</div>' + (S.err ? '<p class="cj-err">' + esc(S.err) + '</p>' : '') +
      '<div class="cj-cta"><button data-a="send"' + (S.name.trim().length < 2 ? ' disabled' : '') + '>Quiero empezar · WhatsApp</button></div>';
    root.innerHTML = h;
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = Number(b.dataset.v);
    if (a === 'sel') { S.sel = v; track('ahorro_equipo'); }
    else if (a === 'mes') S.meses = v;
    else if (a === 'send') {
      b.disabled = true; S.err = ''; const it = S.it, m = S.meses;
      try { const r = await api().rpc('iclub_lead_add', { p_item: { kind: 'ahorro', name: S.name.trim(), phone: S.phone, modelo: it.name + (it.spec ? ' ' + it.spec : ''), valor: it.usd, quiere: 'Plan de ahorro · ' + m + ' cuotas de ' + usd(it.usd / m) } }); if (r && r.data && r.data.ok === false) S.err = r.data.error || ''; } catch (_) {}
      track('ahorro_enviado'); window.open('https://wa.me/' + waNum() + '?text=' + encodeURIComponent(S.msg), '_blank', 'noopener'); b.disabled = false; return;
    } else return;
    const y = window.scrollY; render(); window.scrollTo({ top: y });
  });
  document.addEventListener('input', (e) => {
    const f = e.target.dataset && e.target.dataset.f; if (!f) return; S[f] = e.target.value;
    const y = window.scrollY; render(); window.scrollTo({ top: y }); const el = document.querySelector('[data-f="' + f + '"]'); if (el) { el.focus(); const n = el.value.length; try { el.setSelectionRange(n, n); } catch (_) {} }
  });
  let client = null; const api = () => client || (client = window.supabase.createClient(window.ICLUBData.config.url, window.ICLUBData.config.key));
  const track = (k) => { try { api().rpc('iclub_page_track', { p_kind: 'evento', p_key: k }); } catch (_) {} };
  window.ICLUBAhorro = { escala: (it, m) => escala(it, m), cfg: () => cfg(), set: (d) => { D = d; render(); } };
  (async () => { try { D = await window.ICLUBData.read(); } catch (_) { D = window.ICLUBData.cached && window.ICLUBData.cached(); } render(); })();
})();
