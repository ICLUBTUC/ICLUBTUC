/* ICLUB · Comprobantes en PDF (diseño premium, vectorial, con acentos).
   Tipos: Pago (recibo), Compra (con plan de cuotas y pagos), Nota de crédito, Reintegro, Saldo anterior y Estado de cuenta. */
(function (root) {
  'use strict';
  const P = () => root.ICLUBCollectionPlan;
  const C = { navy: [11, 18, 32], navy2: [22, 33, 56], ink: [17, 24, 39], muted: [107, 114, 128], light: [156, 163, 175], line: [229, 231, 235], soft: [244, 246, 250], blue: [10, 132, 255], blueSoft: [230, 241, 255], green: [22, 163, 74], greenSoft: [220, 252, 231], red: [220, 38, 38], redSoft: [254, 226, 226], amber: [217, 119, 6], amberSoft: [254, 243, 199], white: [255, 255, 255] };
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }), nf2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (n) => { const v = r2(n), neg = v < 0, a = Math.abs(v); return (neg ? '− ' : '') + '$ ' + (Math.abs(a - Math.round(a)) < 0.005 ? nf0.format(Math.round(a)) : nf2.format(a)); };
  const productOf = (m) => (m && (m.prodName || String(m.det || m.doc || '').split(' · ')[0])) || 'Compra';
  const parse = (s) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || '')); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
  const balanceOf = (movs) => r2(movs.reduce((a, m) => a - Number(m.imp || 0), 0));
  const biz = (db) => Object.assign({ name: 'ICLUB', tagline: 'Tecnología · Financiación propia', wa: '', ig: '', dir: 'San Miguel de Tucumán', alias: 'ICLUBTUC', nota: '' }, (db.settings && db.settings.biz) || {});

  function setup(db, kind, number, date) {
    const J = root.jspdf && root.jspdf.jsPDF; if (!J) throw Error('No se pudo cargar el generador de PDF.');
    const fonts = root.ICLUBDocFonts; if (!fonts) throw Error('Falta document-fonts.js en la página publicada.');
    const doc = new J({ unit: 'mm', format: 'a4', compress: true });
    for (const st of ['normal', 'bold']) { doc.addFileToVFS('ICLUB-' + st + '.ttf', fonts[st]); doc.addFont('ICLUB-' + st + '.ttf', 'ICLUB', st); }
    const B = biz(db); doc.setProperties({ title: B.name + ' · ' + kind + ' ' + (number || ''), author: B.name, creator: B.name + ' Gestión' });
    const W = 210, M = 16, CW = W - M * 2; let y = 0;
    const fill = (c) => doc.setFillColor(c[0], c[1], c[2]), stroke = (c) => doc.setDrawColor(c[0], c[1], c[2]), color = (c) => doc.setTextColor(c[0], c[1], c[2]);
    const font = (size, bold) => { doc.setFont('ICLUB', bold ? 'bold' : 'normal'); doc.setFontSize(size); };
    const alpha = (a, fn) => { if (doc.GState) { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: a })); fn(); doc.restoreGraphicsState(); } };
    const t = (s, x, yy, o) => doc.text(String(s == null ? '' : s), x, yy, o || {});

    function header(first) {
      fill(C.navy); doc.rect(0, 0, W, first ? 44 : 24, 'F');
      alpha(0.22, () => { fill(C.blue); doc.circle(W - 8, first ? -6 : -14, first ? 46 : 30, 'F'); });
      alpha(0.12, () => { fill(C.blue); doc.circle(W - 58, first ? 30 : 16, first ? 11 : 6, 'F'); });
      fill(C.blue); doc.rect(0, first ? 44 : 24, W, 1.4, 'F');
      color(C.white); font(first ? 30 : 17, true); t(B.name, M, first ? 22 : 15);
      if (first) { font(7.2); color([166, 180, 204]); t(B.tagline.toUpperCase(), M, 29.5, { charSpace: 0.6 }); }
      font(first ? 7.4 : 6.8, true); color([166, 180, 204]); t(kind.toUpperCase(), W - M, first ? 15 : 11, { align: 'right', charSpace: 0.8 });
      if (first) { color(C.white); font(15, true); t(number || '', W - M, 24, { align: 'right' }); font(9); color([205, 214, 230]); t(date ? 'Emitido el ' + date : '', W - M, 31, { align: 'right' }); }
      else { color(C.white); font(9.5, true); t((number || '') + (date ? '  ·  ' + date : ''), W - M, 17, { align: 'right' }); }
      y = first ? 54 : 34;
    }
    function ensure(h) { if (y + h > 274) { doc.addPage(); header(false); return true; } return false; }
    function pill(text, x, yy, tone, align) {
      const tones = { good: [C.greenSoft, C.green], bad: [C.redSoft, C.red], warn: [C.amberSoft, C.amber], info: [C.blueSoft, C.blue], muted: [C.soft, C.muted], dark: [C.navy, C.white] }; const [bg, fg] = tones[tone] || tones.muted;
      font(6.8, true); const w = doc.getTextWidth(text.toUpperCase()) + 0.35 * text.length + 6, x0 = align === 'right' ? x - w : x;
      fill(bg); doc.roundedRect(x0, yy - 3.6, w, 5.4, 2.7, 2.7, 'F'); color(fg); t(text.toUpperCase(), x0 + w / 2, yy + 0.2, { align: 'center', charSpace: 0.35 }); return w;
    }
    function hero(label, amount, sub, pillText, tone) {
      ensure(34); fill(C.soft); doc.roundedRect(M, y, CW, 26, 3.5, 3.5, 'F'); fill(tone === 'bad' ? C.red : tone === 'good' ? C.green : C.blue); doc.roundedRect(M, y, 2.2, 26, 1.1, 1.1, 'F');
      font(7.2, true); color(C.muted); t(label.toUpperCase(), M + 9, y + 8, { charSpace: 0.7 });
      font(24, true); color(C.ink); t(money(amount), M + 9, y + 17.8);
      if (sub) { font(8.4); color(C.muted); t(sub, M + 9, y + 22.8); }
      if (pillText) pill(pillText, W - M - 8, y + 8, tone, 'right');
      y += 32;
    }
    function boxes(cols) {
      const gap = 5, w = (CW - gap * (cols.length - 1)) / cols.length; let h = 0;
      const prepared = cols.map((col) => { font(8.6); const rows = col.rows.filter((r) => r && r[1] !== '' && r[1] != null).map(([k, v]) => [k, doc.splitTextToSize(String(v), w - 36)]); const hh = 12 + rows.reduce((a, r) => a + Math.max(1, r[1].length) * 4.3 + 1.6, 0) + 1; h = Math.max(h, hh); return { col, rows }; });
      ensure(h + 4);
      prepared.forEach(({ col, rows }, i) => {
        const x = M + i * (w + gap); stroke(C.line); doc.setLineWidth(0.3); doc.roundedRect(x, y, w, h, 3, 3, 'S');
        font(7, true); color(C.blue); t(col.title.toUpperCase(), x + 6, y + 7.5, { charSpace: 0.7 });
        let yy = y + 14; rows.forEach(([k, lines]) => { font(8.2); color(C.muted); t(k, x + 6, yy); font(8.6, true); color(C.ink); lines.forEach((ln, j) => t(ln, x + w - 6, yy + j * 4.3, { align: 'right' })); yy += Math.max(1, lines.length) * 4.3 + 1.6; });
      });
      y += h + 6;
    }
    function section(title, right) { ensure(16); font(10.5, true); color(C.ink); t(title, M, y); if (right) { font(8.2); color(C.muted); t(right, W - M, y, { align: 'right' }); } y += 3; stroke(C.line); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 5.5; }
    function paragraph(s, size, tone) { font(size || 9); const lines = doc.splitTextToSize(String(s), CW); lines.forEach((ln) => { ensure(5.5); font(size || 9); color(tone || C.ink); t(ln, M, y); y += (size || 9) * 0.48; }); y += 2.5; }
    function table(cols, rows) {
      const total = cols.reduce((a, c) => a + c.w, 0), k = CW / total; cols.forEach((c) => { c.ww = c.w * k; });
      const head = () => { fill(C.navy); doc.roundedRect(M, y - 4.6, CW, 7.6, 1.6, 1.6, 'F'); font(6.8, true); color(C.white); let x = M; cols.forEach((c) => { t(c.label.toUpperCase(), c.align === 'right' ? x + c.ww - 3 : c.align === 'center' ? x + c.ww / 2 : x + 3, y, { align: c.align || 'left', charSpace: 0.45 }); x += c.ww; }); y += 6.6; };
      head();
      rows.forEach((row, ri) => {
        font(8.4); const cells = cols.map((c, i) => (c.pill ? [row[i]] : doc.splitTextToSize(String(row[i] == null ? '' : row[i]), c.ww - 6))); const h = Math.max(...cells.map((x) => (x[0] && x[0].text ? 1 : x.length))) * 4.1 + 2.9;
        if (ensure(h + 2)) head();
        if (row.highlight) { fill(C.blueSoft); doc.rect(M, y - 4.2, CW, h, 'F'); } else if (ri % 2) { fill(C.soft); doc.rect(M, y - 4.2, CW, h, 'F'); }
        let x = M; cols.forEach((c, i) => { const v = cells[i];
          if (c.pill && v[0] && v[0].text) pill(v[0].text, c.align === 'right' ? x + c.ww - 3 : x + 3, y - 0.2, v[0].tone, c.align === 'right' ? 'right' : 'left');
          else { font(8.4, !!c.bold || !!row.bold); color(c.tone ? c.tone(row) : C.ink); v.forEach((ln, j) => t(ln, c.align === 'right' ? x + c.ww - 3 : c.align === 'center' ? x + c.ww / 2 : x + 3, y + j * 4.2, { align: c.align || 'left' })); }
          x += c.ww; });
        y += h;
      });
      stroke(C.line); doc.setLineWidth(0.3); doc.line(M, y - 3.6, W - M, y - 3.6); y += 5;
    }
    function progress(done, total, label) {
      ensure(14); font(8.4, true); color(C.ink); t(label, M, y); font(8.4); color(C.muted); t(done + ' de ' + total + ' cuotas', W - M, y, { align: 'right' }); y += 3;
      fill(C.line); doc.roundedRect(M, y, CW, 2.6, 1.3, 1.3, 'F'); const p = total ? Math.min(1, done / total) : 0; if (p > 0) { fill(p >= 1 ? C.green : C.blue); doc.roundedRect(M, y, Math.max(2.6, CW * p), 2.6, 1.3, 1.3, 'F'); } y += 8;
    }
    function totals(lines) {
      const w = 92, x = W - M - w; const h = lines.length * 7 + 4; ensure(h + 4);
      fill(C.soft); doc.roundedRect(x, y, w, h, 3, 3, 'F'); let yy = y + 8;
      lines.forEach((l, i) => { const last = l.strong; if (last) { fill(C.navy); doc.roundedRect(x, yy - 5.2, w, 8.4, 2.2, 2.2, 'F'); } font(last ? 9.4 : 8.6, !!last); color(last ? C.white : C.muted); t(l[0], x + 5, yy); color(last ? C.white : (l.tone || C.ink)); font(last ? 10.5 : 9, true); t(l[1], x + w - 5, yy, { align: 'right' }); yy += 7; });
      lastTot = { y: y, h: h, page: doc.getCurrentPageInfo().pageNumber }; y += h + 5;
    }
    let lastTot = null;
    function payBox() {
      if ((!B.alias && !B.wa)) return;
      if (lastTot && lastTot.page === doc.getCurrentPageInfo().pageNumber && lastTot.h >= 20) {
        const w = CW - 92 - 6, x = M, yy = lastTot.y; stroke(C.blue); doc.setLineWidth(0.35); doc.setLineDashPattern([1.2, 1.2], 0); doc.roundedRect(x, yy, w, lastTot.h, 3, 3, 'S'); doc.setLineDashPattern([], 0);
        font(7, true); color(C.blue); t('CÓMO PAGAR', x + 6, yy + 7, { charSpace: 0.7 }); let ly = yy + 13;
        if (B.alias) { font(7.6); color(C.muted); t('Transferí al alias', x + 6, ly); font(11, true); color(C.ink); t(B.alias, x + 6, ly + 5.2); ly += 11; }
        if (B.wa) { font(7.6); color(C.muted); t('Avisanos por WhatsApp', x + 6, ly); font(9, true); color(C.ink); t(B.wa, x + 6, ly + 4.6); }
        lastTot = null; return;
      }
      ensure(22); stroke(C.blue); doc.setLineWidth(0.35); doc.setLineDashPattern([1.2, 1.2], 0); doc.roundedRect(M, y, CW, 16, 3, 3, 'S'); doc.setLineDashPattern([], 0);
      font(7, true); color(C.blue); t('CÓMO PAGAR', M + 6, y + 6.4, { charSpace: 0.7 }); font(9, true); color(C.ink);
      t([B.alias ? 'Transferencia al alias ' + B.alias : '', B.wa ? 'Avisanos por WhatsApp ' + B.wa : ''].filter(Boolean).join('   ·   '), M + 6, y + 12); y += 22;
    }
    function finish(filename) {
      const n = doc.getNumberOfPages();
      for (let i = 1; i <= n; i++) {
        doc.setPage(i); stroke(C.line); doc.setLineWidth(0.3); doc.line(M, 280, W - M, 280);
        font(7.6, true); color(C.ink); t(B.name, M, 285.5); const w0 = doc.getTextWidth(B.name); font(7.6); color(C.muted);
        t([B.dir, B.wa ? 'WhatsApp ' + B.wa : '', B.ig].filter(Boolean).join('  ·  '), M + w0 + 3, 285.5);
        t('Página ' + i + ' de ' + n, W - M, 285.5, { align: 'right' });
        font(6.6); color(C.light); t(B.nota || 'Comprobante interno de ' + B.name + '. No válido como factura fiscal.', M, 290);
      }
      doc.__name = String(filename).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 ._-]+/g, '-'); return doc;
    }
    header(true);
    return { doc, B, hero, boxes, section, paragraph, table, progress, totals, pill, payBox, finish, ensure, get y() { return y; }, set y(v) { y = v; } };
  }

  const clientRows = (c, phone) => [['Nombre', c.name || 'Cliente'], ['Teléfono', phone], ['DNI / CUIT', c.cuit || ''], ['Dirección', c.dir || ''], ['Email', c.mail || '']];
  const ventaOf = (db, m) => (db.ventas || []).find((v) => (m.grp && v.id === m.grp) || (v.invoice && v.invoice === m.doc)) || null;
  const qState = (q, hoy) => (q.cancelada ? { text: 'Cancelada', tone: 'muted' } : q.done ? { text: 'Pagada', tone: 'good' } : q.paid > 0.005 ? { text: q.dt && q.dt < hoy ? 'Parcial · vencida' : 'Parcial', tone: 'warn' } : q.dt && q.dt < hoy ? { text: 'Vencida', tone: 'bad' } : { text: 'Pendiente', tone: 'muted' });
const proxTxt = (q) => { const hoy = new Date(); hoy.setHours(0, 0, 0, 0); const resta = Math.max(0, q.req - q.paid); return q.dt && q.dt < hoy ? 'Cuota ' + q.n + ' vencida el ' + q.d + ': resta ' + money(resta) + '. Regularizala para evitar recargos.' : 'Próxima cuota: N° ' + q.n + ' · vence el ' + q.d + ' · ' + money(resta); };
  function cuotasTable(d, pc, highlightN) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    d.table([{ label: 'Cuota', w: 13, align: 'center', bold: true }, { label: 'Vencimiento', w: 25 }, { label: 'Importe', w: 26, align: 'right' }, { label: 'Pagado', w: 25, align: 'right' }, { label: 'Resta', w: 25, align: 'right' }, { label: 'Estado', w: 40, align: 'right', pill: true }],
      pc.cuotas.map((q) => { const row = [q.n + '/' + pc.n, q.d || '', money(q.req), money(q.paid), money(Math.max(0, q.req - q.paid)), qState(q, hoy)]; if (highlightN && highlightN.includes(q.n)) row.highlight = true; return row; }));
  }
  function plan(c, pm, upto) { const movs = upto == null ? c.movs : c.movs.slice(0, upto + 1); return P()._planCalc(Object.assign({}, c, { movs }), pm); }

  /* ---------- Recibo de pago ---------- */
  function pago(db, phone, idx) {
    const c = db.clients[phone], m = c.movs[idx], pm = c.movs.find((x) => x.tipo === 'Compra' && x.doc === m.plan) || null;
    const d = setup(db, 'Comprobante de pago', m.doc || 'Recibo', m.f);
    const after = c.movs.slice(0, idx + 1), saldoCuenta = balanceOf(after);
    const pcB = pm && pm.finan ? plan(c, pm, idx - 1) : null, pcA = pm && pm.finan ? plan(c, pm, idx) : null;
    const saldoCompra = pm ? r2(-Number(pm.imp) - after.filter((x) => x !== pm && (x.plan === pm.doc || (pm.grp && x.grp === pm.grp)) && x.tipo !== 'Compra').reduce((a, x) => a + Number(x.imp || 0), 0)) : saldoCuenta;
    d.hero('Recibimos', m.imp, 'Gracias por tu pago, ' + (String(c.name || '').split(' ')[0] || 'cliente') + '.', 'Pago recibido', 'good');
    const medio = m.efec != null ? 'Efectivo ' + money(m.efec) + ' + transferencia ' + money(m.transf) : (m.met || 'Sin especificar');
    d.boxes([{ title: 'Cliente', rows: clientRows(c, phone) }, { title: 'Pago', rows: [['Recibo', m.doc || ''], ['Fecha', m.f], ['Medio', medio], ['Aplicado a', pm ? productOf(pm) + ' · ' + pm.doc : 'Cuenta corriente']] }]);
    if (m.det) d.paragraph('Detalle: ' + m.det, 9, C.muted);
    const paidNow = pcA && pcB ? pcA.cuotas.filter((q) => q.paid - (pcB.cuotas[q.i] ? pcB.cuotas[q.i].paid : 0) > 0.005).map((q) => q.n) : [];
    if (pcA) { d.section('Plan de cuotas', pcA.n + ' cuotas ' + (pcA.freq === 'Semanal' ? 'semanales' : 'mensuales')); d.progress(pcA.pagadas, pcA.n, 'Avance del plan después de este pago'); cuotasTable(d, pcA, paidNow); }
    const prox = pcA && pcA.prox;
    if (prox) d.paragraph(proxTxt(prox), 9.4, C.ink);
    d.totals([['Total de la compra', pm ? money(-pm.imp) : '—'], ['Este pago', money(m.imp)], ['Saldo de esta compra', money(Math.max(0, saldoCompra)), saldoCompra > 0.005 ? null : null], Object.assign(['Saldo total de tu cuenta', money(Math.max(0, saldoCuenta))], { strong: true })]);
    if (prox) { /* ya indicada arriba */ }
    else if (saldoCompra <= 0.005 && pm) d.paragraph('¡Esta compra quedó totalmente pagada! Gracias por confiar en nosotros.', 9.4, C.green);
    if (saldoCuenta > 0.005) d.payBox();
    return d.finish(d.B.name + ' Comprobante de pago ' + (m.doc || '') + '.pdf');
  }

  /* ---------- Comprobante de compra ---------- */
  function compra(db, phone, idx) {
    const c = db.clients[phone], m = c.movs[idx], v = ventaOf(db, m), pc = m.finan ? plan(c, m) : null;
    const pagos = c.movs.filter((x) => x.tipo === 'Pago' && (x.plan === m.doc || (m.grp && x.grp === m.grp)));
    const creditos = c.movs.filter((x) => x.tipo === 'Nota de Crédito' && (x.plan === m.doc || (m.grp && x.grp === m.grp)));
    const reint = c.movs.filter((x) => x.tipo === 'Reintegro' && x.plan === m.doc);
    const total = -Number(m.imp), pagado = r2(pagos.reduce((a, x) => a + Number(x.imp), 0)), nc = r2(creditos.reduce((a, x) => a + Number(x.imp), 0)), ri = r2(reint.reduce((a, x) => a - Number(x.imp), 0));
    const saldo = Math.max(0, r2(total - pagado - nc + ri));
    const d = setup(db, m.tipo === 'Saldo anterior' ? 'Saldo anterior' : 'Comprobante de compra', m.doc, m.f);
    const devuelta = (v && v.devolucion) || (m.finan && m.finan.cancelada);
    d.hero('Total de la compra', total, pc && !pc.esContado ? pc.n + ' cuotas ' + (pc.freq === 'Semanal' ? 'semanales' : 'mensuales') + ' de ' + money(pc.cuotaImp) : (m.finan ? 'Precio de contado' : saldo <= 0.005 ? 'Pagada de contado' : 'Cuenta corriente'), devuelta ? 'Devuelta' : saldo <= 0.005 ? 'Pagada' : pc && pc.vencidoAhora > 0.005 ? 'Con atraso' : m.finan ? 'Financiada' : 'Saldo pendiente', devuelta ? 'muted' : saldo <= 0.005 ? 'good' : pc && pc.vencidoAhora > 0.005 ? 'bad' : 'info');
    const snap = v && v.itemSnapshot || {};
    d.boxes([{ title: 'Cliente', rows: clientRows(c, phone) }, { title: 'Equipo', rows: [['Producto', snap.name || productOf(m)], ['Detalle', snap.spec || ''], ['IMEI / serie', snap.imei || ''], ['Entrega', v ? (v.delivered ? 'Entregado' : 'Pendiente de entrega') : ''], ['Comprobante', m.doc]] }]);
    if ((m.prods || []).length > 1) { d.section('Productos'); d.table([{ label: 'Producto', w: 120 }, { label: 'Cantidad', w: 30, align: 'right' }], m.prods.map((p) => [p.name, p.qty])); }
    const cond = [];
    if (v && Number(v.cashArs) && Number(v.cashArs) !== total) cond.push(['Precio de contado', money(v.cashArs)]);
    if (v && Number(v.tradeValue)) cond.push(['Equipo entregado en parte de pago' + (v.tradeSnapshot && v.tradeSnapshot.name ? ' (' + v.tradeSnapshot.name + ')' : ''), money(v.tradeValue)]);
    if (m.finan && Number(m.finan.adel)) cond.push(['Adelanto', money(m.finan.adel)]);
    if (pc && !pc.esContado) { cond.push(['Monto financiado en ' + pc.n + ' cuotas ' + (pc.freq === 'Semanal' ? 'semanales' : 'mensuales'), money(pc.base)]); if (pc.recPct) cond.push(['Recargo de financiación', pc.recPct + '%']); }
    if (cond.length) { d.section('Condiciones de la compra'); d.table([{ label: 'Concepto', w: 95 }, { label: 'Importe', w: 75, align: 'right', bold: true }], cond); }
    if (pc) { d.section('Plan de cuotas'); d.progress(pc.pagadas, pc.n, 'Avance del plan'); cuotasTable(d, pc); }
    const movRows = pagos.map((x) => [x.f, x.doc || '', x.efec != null ? 'Combinado' : (x.met || ''), x.det || '', money(x.imp)]).concat(creditos.map((x) => [x.f, x.doc || '', 'Nota de crédito', x.det || '', money(x.imp)])).concat(reint.map((x) => [x.f, x.doc || '', 'Reintegro', x.det || '', money(x.imp)]));
    if (movRows.length) { d.section('Pagos y créditos registrados'); movRows.sort((a, b) => (parse(a[0]) || 0) - (parse(b[0]) || 0)); d.table([{ label: 'Fecha', w: 24 }, { label: 'Número', w: 36 }, { label: 'Medio', w: 28 }, { label: 'Detalle', w: 54 }, { label: 'Importe', w: 28, align: 'right', bold: true }], movRows); }
    const lines = [['Total de la compra', money(total)], ['Pagado', money(pagado)]]; if (nc) lines.push(['Notas de crédito', money(nc)]); if (ri) lines.push(['Reintegrado', money(-ri)]);
    if (pc && pc.prox && !devuelta) d.paragraph(proxTxt(pc.prox), 9.4, C.ink);
    lines.push(Object.assign(['Saldo pendiente', money(saldo)], { strong: true })); d.totals(lines);
    if (saldo > 0.005 && !devuelta) d.payBox();
    return d.finish(d.B.name + ' Comprobante ' + (m.doc || '') + '.pdf');
  }

  /* ---------- Nota de crédito / Reintegro / otros ---------- */
  function simple(db, phone, idx) {
    const c = db.clients[phone], m = c.movs[idx], pm = c.movs.find((x) => x.tipo === 'Compra' && x.doc === m.plan) || null; const nc = m.tipo === 'Nota de Crédito';
    const d = setup(db, nc ? 'Nota de crédito' : m.tipo, m.doc || '', m.f); const saldo = balanceOf(c.movs.slice(0, idx + 1));
    d.hero(nc ? 'Crédito a tu favor' : m.tipo === 'Reintegro' ? 'Te devolvimos' : 'Importe', Math.abs(Number(m.imp)), m.det || '', nc ? 'Crédito' : m.tipo, nc ? 'info' : 'warn');
    d.boxes([{ title: 'Cliente', rows: clientRows(c, phone) }, { title: 'Comprobante', rows: [['Número', m.doc || ''], ['Fecha', m.f], ['Medio', m.met || ''], ['Compra', pm ? productOf(pm) + ' · ' + pm.doc : '']] }]);
    if (m.det) { d.section('Motivo'); d.paragraph(m.det, 9.6); }
    d.totals([Object.assign(['Saldo de tu cuenta', money(Math.max(0, saldo))], { strong: true })]);
    return d.finish(d.B.name + ' ' + (nc ? 'Nota de credito' : m.tipo) + ' ' + (m.doc || '') + '.pdf');
  }

  /* ---------- Estado de cuenta ---------- */
  function cuenta(db, phone) {
    const c = db.clients[phone], hoy = new Date(); const fecha = hoy.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const d = setup(db, 'Estado de cuenta', c.name || phone, fecha); const saldo = Math.max(0, balanceOf(c.movs || []));
    const planes = (c.movs || []).filter((m) => m.tipo === 'Compra' && m.finan).map((pm) => ({ pm, pc: plan(c, pm) })); const venc = r2(planes.reduce((a, x) => a + x.pc.vencidoAhora, 0));
    d.hero('Saldo total', saldo, venc > 0.005 ? 'Tenés ' + money(venc) + ' vencido. Regularizalo para evitar recargos.' : saldo > 0.005 ? 'Estás al día con tus cuotas.' : 'No tenés deuda pendiente.', venc > 0.005 ? 'Con atraso' : 'Al día', venc > 0.005 ? 'bad' : 'good');
    const compras = (c.movs || []).filter((m) => m.tipo === 'Compra' || m.tipo === 'Saldo anterior');
    d.boxes([{ title: 'Cliente', rows: clientRows(c, phone) }, { title: 'Resumen', rows: [['Compras', String(compras.length)], ['Planes activos', String(planes.filter((x) => x.pc.pendiente > 0.005).length)], ['Vencido', money(venc)], ['Fecha', fecha]] }]);
    planes.filter((x) => x.pc.pendiente > 0.005).forEach(({ pm, pc }) => { d.section(productOf(pm), pm.doc + ' · resta ' + money(pc.pendiente)); d.progress(pc.pagadas, pc.n, 'Avance'); cuotasTable(d, Object.assign({}, pc, { cuotas: pc.cuotas.filter((q) => !q.done) })); });
    const movs = (c.movs || []).slice(-40);
    if (movs.length) { d.section('Últimos movimientos', movs.length < (c.movs || []).length ? 'últimos ' + movs.length : ''); d.table([{ label: 'Fecha', w: 24 }, { label: 'Tipo', w: 28 }, { label: 'Número', w: 36 }, { label: 'Detalle', w: 54 }, { label: 'Importe', w: 28, align: 'right', bold: true, tone: (r) => (r.neg ? C.red : C.green) }], movs.map((m) => { const r = [m.f, m.tipo, m.doc || '', m.tipo === 'Compra' ? productOf(m) : (m.det || m.met || ''), money(-Number(m.imp))]; r.neg = -Number(m.imp) > 0; return r; })); }
    d.totals([Object.assign(['Saldo total', money(saldo)], { strong: true })]);
    if (saldo > 0.005) d.payBox();
    return d.finish(d.B.name + ' Estado de cuenta ' + (c.name || phone) + '.pdf');
  }

  function forMov(db, phone, idx) { const m = db.clients[phone].movs[idx]; if (!m) throw Error('Comprobante inexistente.'); if (m.tipo === 'Pago') return pago(db, phone, idx); if (m.tipo === 'Compra' || m.tipo === 'Saldo anterior') return compra(db, phone, idx); return simple(db, phone, idx); }
  root.ICLUBDocs = { forMov, cuenta, pago, compra, simple, money };
})(typeof window !== 'undefined' ? window : globalThis);
