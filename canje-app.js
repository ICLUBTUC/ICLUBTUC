/* ICLUB · Plan canje: cotizá tu iPhone usado en 5 pasos (modelo, capacidad, batería, daños, resultado).
   Los valores salen de Ajustes → Plan canje del panel (se publican solos en la página). */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  const usd = (n) => 'US$' + nf.format(Math.round(n)), ars = (n) => '$ ' + nf.format(Math.round(n));
  const MODELOS = window.ICLUBCanjeModelos;
  const S = { step: 1, modelo: null, gb: null, bat: null, danos: [], quiere: '', name: '', phone: '', sent: false, err: '' };
  let D = null; // datos públicos: catálogo + ajustes
  const cfg = () => (D && D.settings && D.settings.canje) || {};
  const rate = () => Number(D && D.settings && D.settings.rate) || 1520;
  const precioBase = (m, gb) => { const v = Number((cfg().modelos || {})[m + '|' + gb]); return v > 0 ? v : null; };
  const modelosConPrecio = () => MODELOS.filter((g) => g.items.some((it) => it.gb.some((gb) => precioBase(it.id, gb))));
  const bateria = () => cfg().bateria && cfg().bateria.length ? cfg().bateria : window.ICLUBCanjeDefaults.bateria;
  const danos = () => cfg().danos && cfg().danos.length ? cfg().danos : window.ICLUBCanjeDefaults.danos;
  const modelo = () => MODELOS.flatMap((g) => g.items).find((x) => x.id === S.modelo);
  const valor = () => { const b = precioBase(S.modelo, S.gb); if (b == null) return null; const bt = bateria().find((x) => x.k === S.bat); const d = danos().filter((x) => S.danos.includes(x.k)).reduce((a, x) => a + Number(x.d || 0), 0); return Math.max(0, Math.round(b - (bt ? Number(bt.d || 0) : 0) - d)); };
  const catalogo = () => {
    const cat = (D && D.catalog) || {}, base = window.REF_BASE || [], ids = new Set(base.map((p) => p.id));
    const list = base.map((p) => Object.assign({}, p, cat[p.id] || {})).concat(Object.entries(cat).filter(([id, v]) => !ids.has(id) && v && v.custom).map(([id, v]) => Object.assign({ id }, v)));
    return list.filter((p) => !p.hidden && !p.deleted && Number(p.usd) > 0 && /iphone|ipad|airpods|apple/i.test((p.name || '') + ' ' + (p.cat || ''))).sort((a, b) => Number(a.usd) - Number(b.usd));
  };
  const waNum = () => { const w = String((D && D.settings && D.settings.biz && D.settings.biz.wa) || '3814680653').replace(/\D/g, ''); return w.startsWith('54') ? w : '549' + w.replace(/^0/, ''); };
  const progress = () => '<div class="cj-progress" aria-hidden="true">' + [1, 2, 3, 4, 5].map((i) => '<i class="' + (i <= S.step ? 'on' : '') + '"></i>').join('') + '</div>';
  const head = (n, t, sub) => (n > 1 ? '<button class="cj-back" data-a="back">← Volver</button>' : '<div class="cj-hero"><span class="cj-badge">Plan canje</span></div>') + progress() + '<p class="cj-step">Paso ' + n + ' de 5</p><h1 class="cj-h1">' + t + '</h1><p class="cj-sub">' + sub + '</p>';
  const cta = (txt, a, dis) => '<div class="cj-cta"><button data-a="' + a + '"' + (dis ? ' disabled' : '') + '>' + txt + '</button></div>';

  function render() {
    const root = $('#cj'); let h = '';
    if (S.step === 1) {
      const groups = modelosConPrecio(), all = groups.length ? groups : MODELOS;
      h = head(1, '¿Qué iPhone tenés?', 'Tocá tu modelo para empezar. Te decimos cuánto vale para entregarlo como parte de pago.') +
        all.map((g) => '<div class="cj-group">' + esc(g.g) + '</div><div class="cj-grid">' + g.items.filter((it) => !groups.length || it.gb.some((gb) => precioBase(it.id, gb))).map((it) => '<button class="cj-opt" data-a="modelo" data-v="' + esc(it.id) + '">' + esc(it.n) + '</button>').join('') + '</div>').join('') +
        '<div class="cj-trust"><div><b>1 minuto</b>Cotizás online</div><div><b>Sin vueltas</b>Lo traés y lo revisamos</div><div><b>En cuotas</b>Financiá la diferencia</div></div>';
    } else if (S.step === 2) {
      const m = modelo(), opts = m.gb.filter((gb) => precioBase(m.id, gb) || !modelosConPrecio().length);
      h = head(2, '¿Cuánto almacenamiento?', 'Tu <b>' + esc(m.n) + '</b> — elegí la capacidad.') + '<div class="cj-list">' + opts.map((gb, i) => '<button class="cj-opt" data-a="gb" data-v="' + gb + '">' + gb + (gb === '1TB' || gb === '2TB' ? '' : ' GB') + (i === 0 ? ' <small>Base</small>' : '') + '</button>').join('') + '</div><p class="cj-hint">¿No sabés? Ajustes → General → Información → Capacidad</p>';
    } else if (S.step === 3) {
      h = head(3, '¿Cómo está la batería?', 'Mirá la condición de la batería en tu iPhone.') + '<div class="cj-list">' + bateria().map((b) => '<button class="cj-opt" data-a="bat" data-v="' + esc(b.k) + '">' + esc(b.l) + (Number(b.d) > 0 ? '<span class="neg">−' + usd(b.d) + '</span>' : '<small>Sin descuento</small>') + '</button>').join('') + '</div><p class="cj-hint">Ajustes → Batería → Estado y carga → Capacidad máxima</p>';
    } else if (S.step === 4) {
      h = head(4, '¿Tiene algún daño?', 'Tocá los que apliquen. Si está perfecto, seguí de largo.') + '<div class="cj-dmg">' + danos().map((d) => '<button class="cj-opt' + (S.danos.includes(d.k) ? ' on' : '') + '" data-a="dano" data-v="' + esc(d.k) + '" aria-pressed="' + S.danos.includes(d.k) + '"><span>' + (S.danos.includes(d.k) ? '✓ ' : '⚠ ') + esc(d.l) + '</span><span class="neg">−' + usd(d.d) + '</span></button>').join('') + '</div>' +
        cta(S.danos.length ? 'Ver cotización (' + S.danos.length + ' daño' + (S.danos.length > 1 ? 's' : '') + ')' : '✓ Sin daños — ver cotización', 'ver');
    } else {
      const m = modelo(), v = valor(), bt = bateria().find((x) => x.k === S.bat), list = catalogo(), q = list.find((x) => x.id === S.quiere), dif = q && v != null ? Math.max(0, Number(q.usd) - v) : null;
      const rec = (D && D.settings && D.settings.recargos) || {}, fin = dif ? [3, 6].map((n) => { const r = Number(rec[n] || rec[String(n)] || 0); return { n, c: dif * (1 + r / 100) / n }; }).filter((x) => x.c > 0) : [];
      const msg = 'Hola, ¿cómo estás? Soy ' + (S.name || '…') + '. Quiero entregar mi ' + m.n + ' de ' + S.gb + (/TB/.test(S.gb) ? '' : ' GB') + ' (batería ' + (bt ? bt.l : '') + ')' + (S.danos.length ? ', con: ' + danos().filter((x) => S.danos.includes(x.k)).map((x) => x.l).join(', ') : ', sin daños') + '. ' + (v != null ? 'Me lo cotizaron en ' + usd(v) + '. ' : '') + (q ? 'Me interesa el ' + q.name + (q.spec ? ' (' + q.spec + ')' : '') + (dif != null ? ', con una diferencia de ' + usd(dif) : '') + '. ¿Hay stock?' : '¿Qué opciones tengo?');
      S.msg = msg; S.v = v; S.dif = dif; S.q = q;
      h = '<button class="cj-back" data-a="back">← Volver</button>' + progress() + '<div class="cj-result"><div class="cj-kicker">Tu cotización</div>' +
        (v != null && v > 0 ? '<div class="cj-price">' + nf.format(v) + '<small>USD</small></div><div class="cj-ars">≈ ' + ars(v * rate()) + ' al dólar de hoy</div>' : '<div class="cj-price" style="font-size:34px">Te lo cotizamos por WhatsApp</div>') +
        '<div class="cj-chips"><span class="cj-chip">' + esc(m.n) + '</span><span class="cj-chip">' + esc(S.gb) + (/TB/.test(S.gb) ? '' : ' GB') + '</span><span class="cj-chip">Bat. ' + esc(bt ? bt.l : '') + '</span>' + (S.danos.length ? '<span class="cj-chip bad">' + S.danos.length + ' daño' + (S.danos.length > 1 ? 's' : '') + '</span>' : '<span class="cj-chip">Sin daños</span>') + '</div>' +
        '<p class="cj-note">Valor estimado según lo que declaraste. Se confirma al revisar el equipo en el local.</p></div>' +
        '<div class="cj-sep">ÚLTIMO PASO</div>' +
        '<label class="cj-field"><span>¿Qué equipo te querés llevar?</span><select data-f="quiere"><option value="">Todavía no sé — quiero ver opciones</option>' + list.map((p) => '<option value="' + esc(p.id) + '"' + (S.quiere === p.id ? ' selected' : '') + '>' + esc(p.name + (p.spec ? ' · ' + p.spec : '') + ' — ' + usd(p.usd)) + '</option>').join('') + '</select></label>' +
        (q && v != null ? '<div class="cj-diff"><span class="l">Diferencia estimada</span><span class="v">' + (dif > 0 ? 'Abonás <b>' + usd(dif) + '</b>' : '¡Te alcanza! <b>Sin diferencia</b>') + '</span><span class="s">Tu equipo: ' + usd(v) + ' · ' + esc(q.name) + ': ' + usd(q.usd) + (dif > 0 ? ' · ≈ ' + ars(dif * rate()) : '') + '</span>' + (fin.length ? '<div class="cj-fin">' + fin.map((x) => '<span>o ' + x.n + ' cuotas de ' + usd(x.c) + '</span>').join('') + '</div>' : '') + '</div>' : '') +
        '<label class="cj-field"><span>Tu nombre</span><input data-f="name" value="' + esc(S.name) + '" autocomplete="name" placeholder="Nombre y apellido" maxlength="60"></label>' +
        '<label class="cj-field"><span>Tu celular (opcional)</span><input data-f="phone" value="' + esc(S.phone) + '" inputmode="tel" autocomplete="tel" placeholder="381 000 0000" maxlength="20"></label>' +
        '<div class="cj-msg" id="cjMsg">' + esc(msg) + '</div>' + (S.err ? '<p class="cj-err">' + esc(S.err) + '</p>' : '') +
        '<button class="cj-link" data-a="reset">↻ Cotizar otro equipo</button>' + cta('Enviar por WhatsApp', 'send', S.name.trim().length < 2);
    }
    root.innerHTML = h; window.scrollTo({ top: 0 });
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v;
    if (a === 'modelo') { S.modelo = v; S.gb = null; S.step = 2; }
    else if (a === 'gb') { S.gb = v; S.step = 3; }
    else if (a === 'bat') { S.bat = v; S.step = 4; }
    else if (a === 'dano') { S.danos = S.danos.includes(v) ? S.danos.filter((x) => x !== v) : S.danos.concat([v]); }
    else if (a === 'ver') { S.step = 5; track('canje_cotizado'); }
    else if (a === 'back') { S.step = Math.max(1, S.step - 1); }
    else if (a === 'reset') { Object.assign(S, { step: 1, modelo: null, gb: null, bat: null, danos: [], quiere: '', err: '' }); }
    else if (a === 'send') {
      b.disabled = true; S.err = '';
      const bt = bateria().find((x) => x.k === S.bat), m = modelo();
      try { const r = await api().rpc('iclub_lead_add', { p_item: { kind: 'canje', name: S.name.trim(), phone: S.phone, modelo: m.n, gb: S.gb, bateria: bt ? bt.l : '', danos: danos().filter((x) => S.danos.includes(x.k)).map((x) => x.l), valor: S.v != null ? String(S.v) : '', quiere: S.q ? S.q.name + (S.q.spec ? ' · ' + S.q.spec : '') : '', diferencia: S.dif != null ? String(S.dif) : '' } }); const res = r && r.data; if (res && res.ok === false && /Poné/.test(res.error || '')) { S.err = res.error; render(); return; } } catch (_) { /* aunque falle el registro, igual se abre WhatsApp */ }
      track('canje_enviado'); window.open('https://wa.me/' + waNum() + '?text=' + encodeURIComponent(S.msg), '_blank', 'noopener'); b.disabled = false; return;
    } else return;
    render();
  });
  document.addEventListener('input', (e) => {
    const f = e.target.dataset && e.target.dataset.f; if (!f) return; S[f] = e.target.value;
    if (f === 'quiere') { render(); return; }
    const m = $('#cjMsg'); if (m) { render(); const el = document.querySelector('[data-f="' + f + '"]'); if (el) { el.focus(); const n = el.value.length; try { el.setSelectionRange(n, n); } catch (_) {} } }
  });
  let client = null; const api = () => client || (client = window.supabase.createClient(window.ICLUBData.config.url, window.ICLUBData.config.key));
  const track = (k) => { try { api().rpc('iclub_page_track', { p_kind: 'evento', p_key: k }); } catch (_) {} };
  (async () => { try { D = await window.ICLUBData.read(); } catch (_) { D = window.ICLUBData.cached && window.ICLUBData.cached(); } render(); })();
})();
