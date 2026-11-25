/* ICLUB · Cotizador (lo uso YO para cotizarle al cliente).
   Izquierda: panel de carga con costos y ganancia (solo lo veo yo).
   Derecha: ficha 1080×1920 para captura / WhatsApp, sin costos, recargos ni márgenes.
   Historial en db.cotizaciones = [{ id, at, f, name, phone, estado, hist:[{at,estado}], hasta, data, resumen }]. */
(function () {
  'use strict';
  const A = window.ICA, M = window.ICLUBMetrics; const { esc } = A; const ui = A.ui;
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const ars = (n) => '$ ' + Math.round(Number(n) || 0).toLocaleString('es-AR');
  const arsC = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');
  const usdT = (n) => 'USD ' + Math.round(Number(n) || 0).toLocaleString('es-AR');
  const ESTADOS = ['Usado premium', 'Usado', 'Nuevo sellado', 'Reacondicionado', 'Exhibición'];
  const GARANTIAS = ['Garantía iCLUB 1 mes', 'Garantía iCLUB 3 meses', 'Garantía iCLUB 6 meses', 'Garantía oficial 1 año', 'AS IS / sin garantía'];
  const EST = { enviada: ['Enviada', 'brand'], respondio: ['Respondió', 'warn'], vendida: ['Vendida', 'good'], perdida: ['Perdida', 'muted'] };
  A.cotRecargo = (costo) => { const c = Number(costo) || 0; return c < 500 ? 50 : c < 800 ? 70 : 90; };
  const eqVacio = () => ({ inv: '', modelo: '', cap: '', color: '', bat: '', estado: 'Usado premium', gar: 'Garantía iCLUB 1 mes', costo: '', rec: '', recManual: false });
  const nuevo = () => ({ id: null, name: '', phone: '', rate: A.rate(), coef: 1.95, horas: 48, presu: '', planes: [3, 6, 9, 12], redondeo: true, canje: { on: false, desc: '', val: '', cur: 'ARS' }, entrega: '', eqs: [eqVacio()], reco: 0, creada: new Date().toISOString() });
  const draft = () => { if (!ui.cot) ui.cot = nuevo(); return ui.cot; };
  const list = () => A.db.cotizaciones || [];
  const d10 = (x) => String(x || '').replace(/\D/g, '').slice(-10);

  /* ---------- Cálculo ---------- */
  A.cotCalc = (q) => {
    const rate = Number(q.rate) || A.rate(), coef = Number(q.coef) || 1.95, canjeArs = q.canje && q.canje.on ? (q.canje.cur === 'USD' ? A.num(q.canje.val) * rate : A.num(q.canje.val)) : 0, entrega = A.num(q.entrega) || 0, presu = A.num(q.presu) || 0;
    const planes = (q.planes || []).map(Number).filter((n) => n >= 2 && n <= 12).sort((a, b) => a - b);
    const eqs = (q.eqs || []).filter((e) => e.modelo || A.num(e.costo) > 0).map((e, i) => {
      const costo = A.num(e.costo) || 0, rec = e.recManual && e.rec !== '' ? A.num(e.rec) : A.cotRecargo(costo), usd = r2(costo + rec), contado = Math.round(usd * rate), saldo = Math.max(0, contado - canjeArs - entrega);
      const total = saldo * coef, cuotas = planes.map((n) => { let c = total / n; if (q.redondeo) c = Math.ceil(c / 500) * 500; return { n, cuota: c, total: c * n }; });
      let cerca = null; if (presu > 0 && cuotas.length) cerca = cuotas.reduce((b, x) => Math.abs(x.cuota - presu) < Math.abs(b.cuota - presu) ? x : b).n;
      const principal = cerca || (cuotas.find((x) => x.n === 6) || cuotas[Math.floor((cuotas.length - 1) / 2)] || {}).n || null;
      const costoArs = Math.round(costo * rate), finTotal = cuotas.length ? cuotas.find((x) => x.n === principal).total : 0;
      return Object.assign({}, e, { idx: q.eqs.indexOf(e), costo, rec, usd, contado, saldo, cuotas, cerca, principal, costoArs, ganContado: contado - costoArs, ganFin: finTotal ? Math.round(finTotal + canjeArs + entrega - costoArs) : 0, reco: q.eqs.indexOf(e) === Number(q.reco) });
    });
    return { rate, coef, canjeArs, entrega, presu, planes, eqs };
  };
  const hastaDe = (q) => new Date(new Date(q.creada || Date.now()).getTime() + (Number(q.horas) || 48) * 36e5);
  const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const fHasta = (d) => DIAS[d.getDay()] + ' ' + d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' h';
  const nombreEq = (e) => [e.modelo, e.cap].filter(Boolean).join(' ');
  const detalleEq = (e) => [e.color, e.bat !== '' && e.bat != null && String(e.bat).trim() ? '🔋 ' + String(e.bat).replace('%', '') + '%' : '', e.estado].filter(Boolean).join(' · ');
  const biz = () => Object.assign({ wa: '', ig: '' }, (A.db.settings && A.db.settings.biz) || {});

  /* ---------- Texto para WhatsApp (sin costos) ---------- */
  A.cotTexto = (q) => {
    const k = A.cotCalc(q), b = biz(), L = ['*Cotización iCLUB* ♻️ Usados Testeados', 'Para: *' + (q.name || 'vos') + '* · ' + new Date(q.creada || Date.now()).toLocaleDateString('es-AR'), ''];
    if (k.canjeArs > 0) L.push('🔁 Tomamos tu *' + (q.canje.desc || 'equipo') + '* en *' + arsC(k.canjeArs) + '*');
    if (k.entrega > 0) L.push('💵 Con tu entrega de *' + arsC(k.entrega) + '*');
    if (k.canjeArs > 0 || k.entrega > 0) L.push('');
    k.eqs.forEach((e) => {
      L.push((e.reco ? '⭐ ' : '📱 ') + '*' + nombreEq(e) + '*' + (e.reco ? ' (Recomendado)' : ''));
      const det = detalleEq(e); if (det) L.push(det + (e.gar ? ' · ' + e.gar : ''));
      L.push('💵 Contado: *' + usdT(e.usd) + '* (' + arsC(e.contado) + ')');
      if (k.canjeArs > 0 || k.entrega > 0) L.push('➡️ Te queda un saldo de *' + arsC(e.saldo) + '*');
      if (e.cuotas.length) L.push('📅 ' + e.cuotas.map((c) => (c.n === e.principal ? '*' + c.n + ' × ' + arsC(c.cuota) + '*' : c.n + ' × ' + arsC(c.cuota))).join(' · '));
      L.push('');
    });
    if (k.eqs.some((e) => e.cuotas.length)) L.push('Si te queda más cómodo, también te lo financiamos 🙌');
    L.push('✅ Testeado' + (k.eqs.some((e) => !/AS IS/i.test(e.gar || '')) ? ' · Garantía iCLUB' : ''));
    L.push('⏳ Válido hasta ' + fHasta(hastaDe(q)));
    if (b.wa || b.ig) L.push('', [b.wa ? '📲 ' + b.wa : '', b.ig ? '📸 ' + b.ig : ''].filter(Boolean).join(' · '));
    return L.join('\n');
  };

  /* ---------- Ficha 1080×1920 (canvas) ---------- */
  const FONT = "'Inter','Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji'";
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const fit = (g, txt, max, size, weight) => { let s = size; do { g.font = (weight || 400) + ' ' + s + 'px ' + FONT; if (g.measureText(txt).width <= max) break; s -= 2; } while (s > 16); return s; };
  const write = (g, txt, x, y, size, color, weight, align, max) => { if (max) fit(g, txt, max, size, weight); else g.font = (weight || 400) + ' ' + size + 'px ' + FONT; g.fillStyle = color; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic'; g.fillText(txt, x, y); };
  A.cotDibujar = (cv, q) => {
    const W = 1080, H = 1920, g = cv.getContext('2d'); cv.width = W; cv.height = H; const k = A.cotCalc(q), b = biz(), P = 72;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#070a12'); bg.addColorStop(0.55, '#0b1220'); bg.addColorStop(1, '#05070c'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(W - 120, 120, 20, W - 120, 120, 620); glow.addColorStop(0, 'rgba(10,132,255,.35)'); glow.addColorStop(1, 'rgba(10,132,255,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    const glow2 = g.createRadialGradient(80, H - 200, 10, 80, H - 200, 520); glow2.addColorStop(0, 'rgba(34,197,94,.16)'); glow2.addColorStop(1, 'rgba(34,197,94,0)'); g.fillStyle = glow2; g.fillRect(0, 0, W, H);
    let y = 150; write(g, 'iCLUB', P, y, 96, '#ffffff', 800); g.font = '800 96px ' + FONT; const lw = g.measureText('iCLUB').width; write(g, '♻️ Usados Testeados', P + lw + 26, y - 8, 36, '#9fb3c8', 600);
    g.fillStyle = '#0a84ff'; rr(g, P, y + 26, 120, 8, 4); g.fill();
    y += 120; write(g, 'Cotización para', P, y, 34, '#8b9bb0', 500); y += 74; write(g, q.name || 'vos', P, y, 72, '#ffffff', 800, 'left', W - 2 * P); y += 50; write(g, new Date(q.creada || Date.now()).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }), P, y, 32, '#8b9bb0', 500);
    y += 46;
    if (k.canjeArs > 0 || k.entrega > 0) { const t = [k.canjeArs > 0 ? '🔁 Tomamos tu ' + (q.canje.desc || 'equipo') + ' en ' + arsC(k.canjeArs) : '', k.entrega > 0 ? '💵 Entrega ' + arsC(k.entrega) : ''].filter(Boolean).join('   ·   '); g.fillStyle = 'rgba(34,197,94,.12)'; rr(g, P, y, W - 2 * P, 84, 24); g.fill(); g.strokeStyle = 'rgba(34,197,94,.45)'; g.lineWidth = 2; g.stroke(); write(g, t, W / 2, y + 55, 34, '#86efac', 700, 'center', W - 2 * P - 40); y += 112; }
    const foot = 360, n = Math.max(1, k.eqs.length), gap = 24, avail = H - foot - y - gap * (n - 1), hayCanje = k.canjeArs > 0 || k.entrega > 0;
    /* Alto que necesita cada tarjeta a escala 1; después se achica todo junto para que entren. */
    const alto = (e) => 88 + 56 + (detalleEq(e) ? 46 : 0) + (e.gar ? 86 : 10) + 30 + (hayCanje ? 76 : 0) + (e.cuotas.length ? 34 + 84 + (e.cuotas.length > 1 ? 52 : 0) : 0) + 44;
    const need = k.eqs.reduce((a, e) => a + alto(e), 0), sc = Math.min(n === 1 ? 1.12 : 1, need > 0 ? avail / need : 1);
    if (!k.eqs.length) { write(g, 'Cargá un equipo para ver la ficha', W / 2, y + 200, 38, '#64748b', 600, 'center'); }
    const Z = (v) => Math.round(v * sc);
    k.eqs.forEach((e) => {
      const x = P, w = W - 2 * P, ch = Z(alto(e)); g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 40; g.fillStyle = e.reco ? 'rgba(255,214,102,.08)' : 'rgba(255,255,255,.05)'; rr(g, x, y, w, ch, Z(36)); g.fill(); g.restore();
      g.lineWidth = e.reco ? 4 : 2; if (e.reco) { const gr = g.createLinearGradient(x, y, x + w, y + ch); gr.addColorStop(0, '#fcd34d'); gr.addColorStop(1, '#f59e0b'); g.strokeStyle = gr; } else g.strokeStyle = 'rgba(255,255,255,.12)'; rr(g, x, y, w, ch, Z(36)); g.stroke();
      let yy = y + Z(88); const ix = x + 44, iw = w - 88;
      if (e.reco) { g.fillStyle = '#fbbf24'; const bw = Z(300), bh = Z(56); rr(g, x + w - bw - 36, y + Z(30), bw, bh, bh / 2); g.fill(); write(g, '⭐ RECOMENDADO', x + w - bw / 2 - 36, y + Z(30) + bh * 0.68, Z(26), '#1f1300', 800, 'center'); }
      write(g, nombreEq(e) || 'Equipo', ix, yy, Z(58), '#ffffff', 800, 'left', e.reco ? iw - Z(330) : iw); yy += Z(56);
      const det = detalleEq(e); if (det) { write(g, det, ix, yy, Z(32), '#a9b8cc', 500, 'left', iw); yy += Z(46); }
      if (e.gar) { write(g, (/AS IS/i.test(e.gar) ? '⚠️ ' : '🛡️ ') + e.gar, ix, yy, Z(30), /AS IS/i.test(e.gar) ? '#fca5a5' : '#93c5fd', 600, 'left', iw); yy += Z(86); } else yy += Z(10);
      write(g, usdT(e.usd), ix, yy, Z(80), '#ffffff', 800); g.font = '800 ' + Z(80) + 'px ' + FONT; const uw = g.measureText(usdT(e.usd)).width; write(g, arsC(e.contado) + ' de contado', ix + uw + 24, yy, Z(34), '#a9b8cc', 600, 'left', iw - uw - 24); yy += Z(30);
      if (hayCanje) { yy += Z(40); write(g, 'Te queda un saldo de ' + arsC(e.saldo), ix, yy, Z(36), '#86efac', 700, 'left', iw); yy += Z(36); }
      if (e.cuotas.length) {
        const main = e.cuotas.find((c) => c.n === e.principal) || e.cuotas[0]; yy += Z(34) - (hayCanje ? Z(36) : 0) + (hayCanje ? Z(20) : 0); g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2; g.beginPath(); g.moveTo(ix, yy); g.lineTo(ix + iw, yy); g.stroke(); yy += Z(84);
        write(g, main.n + ' × ' + arsC(main.cuota), ix, yy, Z(82), '#4ade80', 800, 'left', iw); yy += Z(52);
        const otros = e.cuotas.filter((c) => c !== main).map((c) => c.n + ' × ' + arsC(c.cuota)).join('   ·   '); if (otros) write(g, otros, ix, yy, Z(30), '#a9b8cc', 600, 'left', iw);
      }
      y += ch + gap;
    });
    let fy = H - foot + 40; if (k.eqs.some((e) => e.cuotas.length)) { write(g, 'Si te queda más cómodo, también te lo financiamos 🙌', W / 2, fy, 36, '#e2e8f0', 600, 'center', W - 2 * P); fy += 66; }
    const gar = k.eqs.some((e) => !/AS IS/i.test(e.gar || '')); write(g, 'Testeado ✅' + (gar ? '  ·  Garantía iCLUB' : ''), W / 2, fy, 34, '#ffffff', 700, 'center', W - 2 * P); fy += 54;
    write(g, 'Válido hasta ' + fHasta(hastaDe(q)), W / 2, fy, 30, '#fbbf24', 700, 'center', W - 2 * P); fy += 50;
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(P, fy); g.lineTo(W - P, fy); g.stroke(); fy += 64;
    const contacto = [b.wa ? '📲 ' + b.wa : '', b.ig ? '📸 ' + b.ig : ''].filter(Boolean).join('     '); write(g, contacto || 'iCLUB · San Miguel de Tucumán', W / 2, fy, 34, '#cbd5e1', 600, 'center', W - 2 * P);
    return cv;
  };

  /* ---------- Pantalla ---------- */
  const inp = (path, val, attrs) => '<input data-cot="' + path + '" value="' + esc(val == null ? '' : val) + '"' + (attrs || '') + '>';
  const sel = (path, opts, val) => '<select data-cot="' + path + '">' + opts.map((o) => '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
  const stock = () => (A.db.inventory || []).filter((x) => Number(x.stock) > 0);
  const eqForm = (e, i, q, k) => { const c = k.eqs.find((x) => x.idx === i);
    return '<div class="cot-eq' + (Number(q.reco) === i ? ' reco' : '') + '"><div class="cot-eq-h"><b>Equipo ' + (i + 1) + '</b><label class="check"><input type="radio" name="cotReco" data-act="cot-reco" data-i="' + i + '"' + (Number(q.reco) === i ? ' checked' : '') + '> ⭐ Recomendado</label><div class="spacer"></div>' + (q.eqs.length > 1 ? '<button type="button" class="btn-sm btn-2" data-act="cot-quitar" data-i="' + i + '">Quitar</button>' : '') + '</div>' +
      '<label class="f">Del stock (opcional)<select data-act="cot-stock" data-i="' + i + '"><option value="">— Escribir a mano —</option>' + stock().map((x) => '<option value="' + esc(x.id) + '"' + (e.inv === x.id ? ' selected' : '') + '>' + esc(x.name + (x.spec ? ' · ' + x.spec : '')) + '</option>').join('') + '</select></label>' +
      '<div class="grid g3"><label class="f">Modelo' + inp('eqs.' + i + '.modelo', e.modelo, ' placeholder="iPhone 13 Pro"') + '</label><label class="f">Capacidad' + inp('eqs.' + i + '.cap', e.cap, ' placeholder="128 GB"') + '</label><label class="f">Color' + inp('eqs.' + i + '.color', e.color, ' placeholder="Grafito"') + '</label></div>' +
      '<div class="grid g3"><label class="f">Batería %' + inp('eqs.' + i + '.bat', e.bat, ' inputmode="numeric" placeholder="88"') + '</label><label class="f">Estado' + sel('eqs.' + i + '.estado', ESTADOS, e.estado) + '</label><label class="f">Garantía' + sel('eqs.' + i + '.gar', GARANTIAS, e.gar) + '</label></div>' +
      '<div class="grid g3"><label class="f">Mi costo (USD)' + inp('eqs.' + i + '.costo', e.costo, ' inputmode="decimal"') + '</label><label class="f">Recargo (USD) <small class="muted">' + (e.recManual ? 'a mano · <a href="#" data-act="cot-rec-auto" data-i="' + i + '">auto</a>' : 'automático') + '</small>' + inp('eqs.' + i + '.rec', e.recManual ? e.rec : (A.num(e.costo) > 0 ? A.cotRecargo(e.costo) : ''), ' inputmode="decimal"') + '</label><div class="cot-precio"><span>Precio contado</span><b>' + (c ? usdT(c.usd) : '—') + '</b><small>' + (c ? ars(c.contado) : '') + '</small></div></div>' +
      (c && (!A.can || A.can('finanzas')) ? '<div class="cot-gan"><span>Mi costo <b>' + ars(c.costoArs) + '</b></span><span>Gano de contado <b class="good">' + ars(c.ganContado) + '</b></span>' + (c.cuotas.length ? '<span>Gano en ' + c.principal + ' cuotas <b class="good">' + ars(c.ganFin) + '</b></span>' : '') + '</div>' +
        (c.cuotas.length ? '<div class="cot-planes">' + c.cuotas.map((x) => '<span class="' + (x.n === c.cerca ? 'cerca' : '') + (x.n === c.principal ? ' main' : '') + '">' + x.n + ' × ' + ars(x.cuota) + (x.n === c.cerca ? ' <i>≈ presupuesto</i>' : '') + '</span>').join('') + '</div>' : '') : '') + (c && A.can && !A.can('finanzas') && c.cuotas.length ? '<div class="cot-planes">' + c.cuotas.map((x) => '<span class="' + (x.n === c.cerca ? 'cerca' : '') + '">' + x.n + ' × ' + ars(x.cuota) + '</span>').join('') + '</div>' : '') + '</div>'; };
  const panelHtml = () => { const q = draft(), k = A.cotCalc(q);
    return '<div class="card cot-panel"><div class="card-head"><h2>Cargar cotización</h2><div class="spacer"></div>' + (q.id ? A.chip('Editando una guardada', 'warn') + ' ' : '') + '<button type="button" class="btn-sm btn-2" data-act="cot-nueva">Nueva</button></div>' +
      '<h3 class="ah-h">Cliente</h3><div class="grid g2"><label class="f">Nombre' + inp('name', q.name, ' list="cotClients" autocomplete="off" placeholder="Ej: Juan"') + '</label><label class="f">Teléfono' + inp('phone', q.phone, ' inputmode="tel" placeholder="381…"') + '</label></div><datalist id="cotClients">' + Object.entries(A.db.clients || {}).slice(0, 500).map(([ph, c]) => '<option value="' + esc(c.name || '') + '" data-ph="' + esc(ph) + '">').join('') + '</datalist>' +
      '<h3 class="ah-h">Equipos (hasta 3)</h3>' + q.eqs.map((e, i) => eqForm(e, i, q, k)).join('') + (q.eqs.length < 3 ? '<button type="button" class="btn-2 btn-sm" data-act="cot-agregar">+ Agregar otro equipo para comparar</button>' : '') +
      '<h3 class="ah-h">Dólar y pago</h3><div class="grid g3"><label class="f">Dólar del día' + inp('rate', q.rate, ' inputmode="decimal"') + '</label><label class="f">Entrega en efectivo ($)' + inp('entrega', q.entrega, ' inputmode="decimal" placeholder="0"') + '</label><label class="f">Válida por (horas)' + inp('horas', q.horas, ' inputmode="numeric"') + '</label></div>' +
      '<label class="check"><input type="checkbox" data-cot="canje.on"' + (q.canje.on ? ' checked' : '') + '> Recibo un equipo en canje</label>' + (q.canje.on ? '<div class="grid g3"><label class="f">Qué entrega' + inp('canje.desc', q.canje.desc, ' placeholder="PS4 / iPhone 13"') + '</label><label class="f">Valor de toma' + inp('canje.val', q.canje.val, ' inputmode="decimal"') + '</label><label class="f">Moneda' + sel('canje.cur', ['ARS', 'USD'], q.canje.cur) + '</label></div>' : '') +
      '<h3 class="ah-h">Cuotas</h3><div class="cot-n">' + [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => '<label class="' + (q.planes.includes(n) ? 'on' : '') + '"><input type="checkbox" data-act="cot-plan" data-n="' + n + '"' + (q.planes.includes(n) ? ' checked' : '') + '>' + n + '</label>').join('') + '</div>' +
      '<div class="grid g3"><label class="f">Coeficiente (saldo ×)' + inp('coef', q.coef, ' inputmode="decimal"') + '</label><label class="f">Presupuesto mensual del cliente ($)' + inp('presu', q.presu, ' inputmode="decimal" placeholder="Ej: 200000"') + '</label><label class="check" style="align-self:end"><input type="checkbox" data-cot="redondeo"' + (q.redondeo ? ' checked' : '') + '> Redondear cuotas a $500</label></div>' +
      '<p class="small muted">Total financiado = saldo × ' + esc(q.coef) + ', dividido en las cuotas. Saldo = contado − canje − entrega.</p></div>'; };
  const histHtml = () => { const all = list().slice().sort((a, b) => String(b.at).localeCompare(String(a.at))), qf = String(ui.cotQ || '').toLowerCase(), ef = ui.cotEst || '';
    const rows = all.filter((c) => (!ef || c.estado === ef) && (!qf || (c.name + ' ' + c.phone + ' ' + c.resumen).toLowerCase().includes(qf)));
    const pend = A.cotPendientes();
    return '<div class="card" style="margin-top:16px"><div class="card-head"><h2>Historial de cotizaciones</h2>' + A.chip(all.length + '', 'muted') + '<div class="spacer"></div><input class="cot-buscar" data-act="cot-q" placeholder="Buscar cliente…" value="' + esc(ui.cotQ || '') + '"><select data-act="cot-est"><option value="">Todos los estados</option>' + Object.entries(EST).map(([k2, v]) => '<option value="' + k2 + '"' + (ef === k2 ? ' selected' : '') + '>' + v[0] + '</option>').join('') + '</select></div>' +
      (pend.length ? '<div class="fd-alerta bad">⏰ ' + pend.length + ' cotización' + (pend.length === 1 ? '' : 'es') + ' lleva' + (pend.length === 1 ? '' : 'n') + ' más de 2 días en "Enviada" sin respuesta. Escribiles para seguir la venta.</div>' : '') +
      '<div class="list">' + (rows.length ? rows.map((c) => { const late = pend.includes(c), e = EST[c.estado] || EST.enviada;
        return '<div class="item' + (late ? ' cot-late' : '') + '"><div class="grow"><span class="strong">' + esc(c.name || 'Sin nombre') + '</span> ' + A.chip(e[0], e[1]) + (late ? ' ' + A.chip('2+ días sin respuesta', 'bad') : '') + '<div class="sub-t">' + esc(c.f) + ' · ' + esc(c.resumen || '') + (c.phone ? ' · ' + esc(c.phone) : '') + '</div></div>' +
          '<select data-act="cot-estado" data-id="' + esc(c.id) + '">' + Object.entries(EST).map(([k2, v]) => '<option value="' + k2 + '"' + (c.estado === k2 ? ' selected' : '') + '>' + v[0] + '</option>').join('') + '</select>' +
          (c.phone ? '<a class="btn-sm btn-wa" target="_blank" rel="noopener" href="' + A.waLink(c.phone, 'Hola ' + A.first(c.name || '') + '! ¿Pudiste ver la cotización que te pasé? Cualquier duda te ayudo 🙌') + '">Seguir</a>' : '') +
          '<button class="btn-sm btn-2" data-act="cot-abrir" data-id="' + esc(c.id) + '">Abrir</button>' + (c.estado !== 'vendida' ? '<button class="btn-sm btn-good" data-act="cot-vender" data-id="' + esc(c.id) + '">Convertir en venta</button>' : '') + '<button class="btn-sm btn-2" data-act="cot-borrar" data-id="' + esc(c.id) + '" title="Borrar">✕</button></div>'; }).join('') : '<div class="empty">Todavía no guardaste cotizaciones.</div>') + '</div></div>'; };
  A.extra.cotizador = () => { setTimeout(repintar, 0); return '<div class="page-head"><div><h1>Cotizador</h1><p>Cargás a la izquierda; a la derecha queda la ficha para mandarle al cliente.</p></div></div>' +
    '<div class="cot-wrap"><div id="cotPanel">' + panelHtml() + '</div><div class="cot-side"><div class="cot-prev"><canvas id="cotCanvas" width="1080" height="1920"></canvas></div><div class="cot-acts"><button class="btn btn-brand" data-act="cot-png">⬇ Descargar imagen</button><button class="btn btn-2" data-act="cot-copiar">Copiar texto</button><button class="btn btn-wa" data-act="cot-wa">Enviar por WhatsApp</button><button class="btn btn-good" data-act="cot-guardar">Guardar cotización</button></div><p class="small muted" style="text-align:center">La ficha no muestra costos, recargos ni márgenes.</p></div></div>' + histHtml(); };
  const repintar = () => { const cv = A.$('#cotCanvas'); if (cv) A.cotDibujar(cv, draft()); };
  const refrescarPanel = () => { const box = A.$('#cotPanel'); if (!box) return; const a = document.activeElement, path = a && a.dataset && a.dataset.cot, pos = a && a.selectionStart; box.innerHTML = panelHtml(); if (path) { const el = box.querySelector('[data-cot="' + path + '"]'); if (el) { el.focus(); try { if (pos != null) el.setSelectionRange(pos, pos); } catch (_) {} } } repintar(); };
  let tmr = null; const pronto = () => { clearTimeout(tmr); tmr = setTimeout(refrescarPanel, 220); };
  const setPath = (q, path, v) => { const ps = path.split('.'); let o = q; for (let i = 0; i < ps.length - 1; i++) o = o[ps[i]]; o[ps[ps.length - 1]] = v; };

  /* ---------- Guardar / estados ---------- */
  const resumenDe = (q) => A.cotCalc(q).eqs.map((e) => nombreEq(e) + ' ' + usdT(e.usd)).join(' · ');
  A.cotPendientes = () => { const lim = Date.now() - 2 * 864e5; return list().filter((c) => c.estado === 'enviada' && new Date((c.hist && c.hist.length ? c.hist[c.hist.length - 1].at : c.at)).getTime() < lim); };
  const guardar = (q, msg, silent) => A.act(async () => { const next = A.clone(A.db); next.cotizaciones = (next.cotizaciones || []).slice(); const now = new Date().toISOString(), data = A.clone(q); data.id = q.id || A.uid();
    const i = next.cotizaciones.findIndex((c) => c.id === data.id), base = i >= 0 ? next.cotizaciones[i] : { id: data.id, at: now, f: A.today(), estado: 'enviada', hist: [{ at: now, estado: 'enviada' }] };
    const row = Object.assign({}, base, { name: q.name.trim(), phone: String(q.phone || '').replace(/\D/g, ''), hasta: hastaDe(q).toISOString(), data, resumen: resumenDe(q), upd: now });
    if (i >= 0) next.cotizaciones[i] = row; else next.cotizaciones.push(row); await A.saveDb(next, 'Cotización ' + (i >= 0 ? 'actualizada' : 'guardada') + ' para ' + row.name + ': ' + row.resumen); q.id = data.id; A._keepScroll = true; A.render(); }, silent ? '' : msg);
  const validar = (q) => { if (!String(q.name || '').trim()) { A.toast('Poné el nombre del cliente.', true); return false; } if (!A.cotCalc(q).eqs.length) { A.toast('Cargá al menos un equipo.', true); return false; } return true; };

  /* ---------- Convertir en venta ---------- */
  A.cotVender = (id) => { const c = list().find((x) => x.id === id); if (!c) return; const k = A.cotCalc(c.data);
    A.modal('Convertir en venta · ' + c.name, '<form id="cotVentaForm" class="grid" data-id="' + esc(id) + '"><label class="f">Equipo<select name="eq">' + k.eqs.map((e, i) => '<option value="' + i + '"' + (e.reco ? ' selected' : '') + '>' + esc(nombreEq(e) + ' · ' + usdT(e.usd)) + '</option>').join('') + '</select></label><label class="f">Cómo paga<select name="forma"><option value="contado">Contado</option>' + (k.eqs[0] && k.eqs[0].cuotas.length ? k.eqs[0].cuotas.map((x) => '<option value="' + x.n + '">' + x.n + ' cuotas</option>').join('') : '') + '</select></label><p class="small muted">Se abre Registrar venta con todo cargado (cliente, equipo, precio, canje y cuotas). Revisás y confirmás ahí.</p><button class="btn-good">Pasar a Registrar venta</button></form>', { noFocus: true }); };
  const aVenta = (c, ei, forma) => { const q = c.data, k = A.cotCalc(q), e = k.eqs[ei]; if (!e) throw Error('Equipo inválido.'); const pos = A.pos; pos.reset();
    const ph = d10(c.phone), key = Object.keys(A.db.clients || {}).find((p) => ph && d10(p) === ph);
    if (key) pos.client = key; else { pos.newClient = true; pos.nc.name = c.name; pos.nc.phone = String(c.phone || '').replace(/\D/g, ''); }
    const it = e.inv && (A.db.inventory || []).find((x) => x.id === e.inv && Number(x.stock) > 0);
    if (it) pos.item = it.id; else { pos.newProduct = true; Object.assign(pos.np, { name: nombreEq(e), cat: 'Celulares', currency: 'USD', cost: String(e.costo), price: String(e.usd), stock: 1, spec: [e.color, e.bat ? e.bat + '% batería' : '', e.estado].filter(Boolean).join(' · ') }); }
    pos.cash = String(e.contado);
    if (k.canjeArs > 0) { pos.trade = true; pos.tr.model = q.canje.desc || 'Equipo en canje'; pos.tr.value = String(Math.round(k.canjeArs)); }
    if (forma !== 'contado') { const pl = e.cuotas.find((x) => x.n === Number(forma)); if (pl) { pos.mode = 'financiado'; pos.adel = String(k.entrega || 0); pos.count = String(pl.n); pos.installment = String(pl.cuota); pos.freq = 'Mensual'; const d = new Date(); d.setMonth(d.getMonth() + 1); pos.firstDue = d.toISOString().slice(0, 10); } }
    else { pos.mode = 'contado'; pos.paid = String(Math.max(0, e.contado - k.canjeArs)); pos.paidTouched = true; }
    pos.cotId = c.id; };

  /* ---------- Eventos ---------- */
  document.addEventListener('input', (ev) => { const el = ev.target; if (!el.dataset) return;
    if (el.dataset.cot) { const q = draft(), p = el.dataset.cot; if (el.type === 'checkbox') { setPath(q, p, el.checked); refrescarPanel(); return; } setPath(q, p, el.value); const m = p.match(/^eqs\.(\d+)\.rec$/); if (m) q.eqs[+m[1]].recManual = true; if (p === 'name') { const o = [...document.querySelectorAll('#cotClients option')].find((x) => x.value === el.value); if (o && !q.phone) q.phone = o.dataset.ph; } pronto(); return; }
    if (el.dataset.act === 'cot-q') { ui.cotQ = el.value; clearTimeout(tmr); tmr = setTimeout(() => { A._keepScroll = true; A.render(); const s = A.$('.cot-buscar'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }, 300); } });
  document.addEventListener('change', (ev) => { const el = ev.target; if (!el.dataset) return; const q = draft();
    if (el.dataset.cot && el.tagName === 'SELECT') { setPath(q, el.dataset.cot, el.value); refrescarPanel(); return; }
    if (el.dataset.cot && el.type === 'checkbox') return;
    if (el.dataset.act === 'cot-reco') { q.reco = Number(el.dataset.i); refrescarPanel(); }
    else if (el.dataset.act === 'cot-plan') { const n = Number(el.dataset.n); q.planes = el.checked ? [...new Set(q.planes.concat(n))].sort((a, b) => a - b) : q.planes.filter((x) => x !== n); refrescarPanel(); }
    else if (el.dataset.act === 'cot-stock') { const i = Number(el.dataset.i), it = (A.db.inventory || []).find((x) => x.id === el.value), e = q.eqs[i]; e.inv = el.value; if (it) { e.modelo = it.name; e.cap = it.spec || ''; e.costo = String(M.r2(it.moneda === 'ARS' ? Number(it.costo || 0) / (Number(q.rate) || A.rate()) : Number(it.costo || 0))); e.recManual = false; } refrescarPanel(); }
    else if (el.dataset.act === 'cot-est') { ui.cotEst = el.value; A._keepScroll = true; A.render(); }
    else if (el.dataset.act === 'cot-estado') { const id = el.dataset.id, v = el.value; A.act(async () => { const next = A.clone(A.db); next.cotizaciones = next.cotizaciones.map((c) => c.id === id ? Object.assign({}, c, { estado: v, hist: (c.hist || []).concat([{ at: new Date().toISOString(), estado: v }]) }) : c); const c = next.cotizaciones.find((x) => x.id === id); await A.saveDb(next, 'Cotización de ' + c.name + ': ' + EST[v][0]); A._keepScroll = true; A.render(); }, 'Estado: ' + EST[v][0] + '.'); } });
  document.addEventListener('click', async (ev) => { const b = ev.target.closest('[data-act^="cot-"]'); if (!b || b.matches('select,input')) return; const act = b.dataset.act, q = draft();
    if (b.type === 'checkbox' || b.type === 'radio') return; ev.preventDefault();
    if (act === 'cot-agregar') { if (q.eqs.length < 3) q.eqs.push(eqVacio()); refrescarPanel(); }
    else if (act === 'cot-quitar') { const i = Number(b.dataset.i); q.eqs.splice(i, 1); if (q.reco >= q.eqs.length) q.reco = 0; refrescarPanel(); }
    else if (act === 'cot-rec-auto') { q.eqs[Number(b.dataset.i)].recManual = false; refrescarPanel(); }
    else if (act === 'cot-nueva') { ui.cot = nuevo(); A._keepScroll = true; A.render(); }
    else if (act === 'cot-png') { if (!validar(q)) return; const cv = A.cotDibujar(document.createElement('canvas'), q), name = ('Cotizacion iCLUB ' + (q.name || '')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w .-]/g, '').trim() + '.png';
      cv.toBlob(async (blob) => { const file = new File([blob], name, { type: 'image/png' }); if (A.esCelu && A.esCelu() && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (_) { /* sigue con descarga */ } } const a = document.createElement('a'); a.download = name; a.rel = 'noopener'; a.href = URL.createObjectURL(blob); a.style.display = 'none'; document.body.appendChild(a); a.dispatchEvent(new MouseEvent('click')); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000); A.toast('Imagen descargada.'); }, 'image/png'); }
    else if (act === 'cot-copiar') { if (!validar(q)) return; const t = A.cotTexto(q); try { await navigator.clipboard.writeText(t); } catch (_) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* nada */ } ta.remove(); } A.toast('Texto copiado. Pegalo en WhatsApp.'); }
    else if (act === 'cot-wa') { if (!validar(q)) return; window.open(A.waLink(q.phone || '', A.cotTexto(q)), '_blank', 'noopener'); guardar(q, '', true); }
    else if (act === 'cot-guardar') { if (!validar(q)) return; guardar(q, 'Cotización guardada en el historial.'); }
    else if (act === 'cot-abrir') { const c = list().find((x) => x.id === b.dataset.id); if (!c) return; ui.cot = Object.assign(nuevo(), A.clone(c.data), { id: c.id }); window.scrollTo(0, 0); A.render(); }
    else if (act === 'cot-vender') A.cotVender(b.dataset.id);
    else if (act === 'cot-borrar') { const c = list().find((x) => x.id === b.dataset.id); if (!c || !confirm('¿Borrar la cotización de ' + c.name + '?')) return; A.act(async () => { const next = A.clone(A.db); next.cotizaciones = next.cotizaciones.filter((x) => x.id !== c.id); await A.saveDb(next, 'Cotización borrada: ' + c.name); if (ui.cot && ui.cot.id === c.id) ui.cot = nuevo(); A._keepScroll = true; A.render(); }, 'Cotización borrada.'); } });
  document.addEventListener('submit', (ev) => { const f = ev.target; if (f.id !== 'cotVentaForm') return; ev.preventDefault(); const c = list().find((x) => x.id === f.dataset.id); if (!c) return;
    try { aVenta(c, Number(f.elements.eq.value), f.elements.forma.value); } catch (e) { A.toast(e.message, true); return; }
    A.act(async () => { const next = A.clone(A.db); next.cotizaciones = next.cotizaciones.map((x) => x.id === c.id ? Object.assign({}, x, { estado: 'vendida', hist: (x.hist || []).concat([{ at: new Date().toISOString(), estado: 'vendida' }]) }) : x); await A.saveDb(next, 'Cotización de ' + c.name + ' pasada a venta'); A.closeModal(); location.hash = 'vender'; A.render(); }, 'Revisá y confirmá la venta.'); });

  /* La "Cotización rápida" de siempre ahora abre el cotizador. */
  A.quickQuote = () => { location.hash = 'cotizador'; };
  /* Aviso en Seguimiento: cotizaciones enviadas hace 2+ días sin respuesta. */
  const segCount = A.seguimientoCount; if (segCount) A.seguimientoCount = () => segCount() + A.cotPendientes().length;
  const segView = A.extra.seguimiento; if (segView) A.extra.seguimiento = () => { const html = segView(), p = A.cotPendientes(); if (!p.length) return html;
    const card = '<div class="card seg-card"><div class="card-head"><div><h2>Cotizaciones sin respuesta <span class="seg-n">' + p.length + '</span></h2><p>Enviadas hace más de 2 días. Escribiles para seguir la venta.</p></div><div class="spacer"></div><a class="btn-sm btn-2" href="#cotizador">Ver cotizador</a></div><div class="list">' + p.map((c) => '<div class="item"><div class="grow"><span class="strong">' + esc(c.name) + '</span><div class="sub-t">' + esc(c.f) + ' · ' + esc(c.resumen || '') + '</div></div>' + (c.phone ? '<a class="btn-sm btn-wa" target="_blank" rel="noopener" href="' + A.waLink(c.phone, 'Hola ' + A.first(c.name || '') + '! ¿Pudiste ver la cotización que te pasé? Cualquier duda te ayudo 🙌') + '">Escribir</a>' : '') + '</div>').join('') + '</div></div>';
    const t = A.ui.segTab || 'hoy'; if (t !== 'hoy' && t !== 'consultas') return html; return html.replace('<div class="seg-body">', '<div class="seg-body">' + card).replace('Hoy no hay nada pendiente. 🎉', 'Nada más pendiente para hoy.'); };
})();
