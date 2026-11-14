/* ICLUB · Chequeo de iPhone en el panel: lista de pruebas por equipo del inventario, informe PDF para el cliente
   y el resultado queda guardado con el equipo (it.chequeo) y en la venta. */
(function () {
  'use strict';
  const A = window.ICA; const { esc } = A;
  const L = () => window.ICLUBChequeoItems || [];
  const esIphone = (it) => /iphone/i.test(((it && it.name) || '') + ' ' + ((it && it.cat) || ''));
  A.chequeoRes = (ch) => { const r = (ch && ch.items) || {}, h = L().filter((x) => r[x.k] && r[x.k].st && r[x.k].st !== 'na'); return { hechas: h.length, ok: h.filter((x) => r[x.k].st === 'ok').length, fallas: h.filter((x) => r[x.k].st === 'falla'), total: L().length }; };
  A.chequeoChip = (it) => { if (!esIphone(it)) return ''; if (!it.chequeo) return ' ' + A.chip('Sin chequear', 'muted'); const r = A.chequeoRes(it.chequeo); return ' ' + A.chip(r.fallas.length ? 'Chequeo: ' + r.fallas.length + ' falla' + (r.fallas.length === 1 ? '' : 's') : 'Chequeado ✓ ' + r.ok + '/' + r.hechas, r.fallas.length ? 'warn' : 'good'); };
  A.chequeoBtn = (it) => esIphone(it) ? '<button class="btn-sm btn-2" data-act="chq-open" data-id="' + esc(it.id) + '">' + (it.chequeo ? 'Chequeo' : 'Chequear') + '</button>' : '';

  A.chequeoOpen = (id) => {
    const it = A.db.inventory.find((x) => x.id === id); if (!it) return; const ch = it.chequeo || {}, r = ch.items || {};
    const opt = (k, v, l, cls) => '<label class="chq-o ' + cls + '"><input type="radio" name="st_' + k + '" value="' + v + '"' + ((r[k] && r[k].st) === v ? ' checked' : '') + '><span>' + l + '</span></label>';
    const body = '<p class="small muted">Marcá cada prueba. Tocá el ⓘ para ver cómo se hace. Lo que falle, anotalo: queda en el informe.</p><div class="row-flex" style="gap:8px;margin:6px 0 10px"><button type="button" class="btn-sm btn-2" data-act="chq-all">Marcar todo OK</button></div><form id="chqForm" data-id="' + esc(id) + '" class="grid">' +
      (window.ICLUBChequeo || []).map((g) => '<div class="chq-g"><div class="chq-gt">' + esc(g.g) + '</div>' + g.items.map((x) => '<div class="chq-it"><div class="chq-t"><b>' + esc(x.t) + '</b>' + (x.crit ? ' <span class="tiny bad">clave</span>' : '') + ' <details><summary>ⓘ</summary><span class="small muted">' + esc(x.how) + '</span></details></div><div class="chq-ops">' + opt(x.k, 'ok', 'OK', 'ok') + opt(x.k, 'falla', 'Falla', 'bad') + opt(x.k, 'na', '—', 'na') + '</div>' + (x.num ? '<label class="f chq-num">Salud %<input name="bateria" inputmode="numeric" value="' + esc(ch.bateria || '') + '" placeholder="Ej: 88"></label>' : '') + '<input class="chq-nota" name="nota_' + x.k + '" value="' + esc((r[x.k] && r[x.k].nota) || '') + '" placeholder="Nota (opcional)" maxlength="80"></div>').join('') + '</div>').join('') +
      '<div class="row-flex" style="gap:8px;flex-wrap:wrap"><button class="btn-good">Guardar chequeo</button>' + (it.chequeo ? '<button type="button" class="btn-2" data-act="chq-pdf" data-id="' + esc(id) + '">Informe PDF</button>' : '') + '</div></form>';
    A.modal('Chequeo · ' + it.name + (it.spec ? ' ' + it.spec : ''), body, { wide: true, noFocus: true });
  };
  const save = (f) => A.act(async () => {
    const next = A.clone(A.db), it = next.inventory.find((x) => x.id === f.dataset.id), items = {};
    L().forEach((x) => { const v = (f.querySelector('[name="st_' + x.k + '"]:checked') || {}).value, n = (f.elements['nota_' + x.k] || {}).value || ''; if (v || n.trim()) items[x.k] = { st: v || '', nota: n.trim().slice(0, 80) }; });
    const bat = Math.round(A.num(f.elements.bateria && f.elements.bateria.value)); if (!Object.keys(items).length) throw Error('Marcá al menos una prueba.');
    it.chequeo = { at: new Date().toISOString(), f: A.today(), by: (A.me && A.me.name) || '', items, bateria: bat > 0 && bat <= 100 ? bat : null };
    if (it.chequeo.bateria) it.battery = it.chequeo.bateria;
    const r = A.chequeoRes(it.chequeo); await A.saveDb(next, 'Chequeo de ' + it.name + ': ' + r.ok + '/' + r.hechas + ' OK' + (r.fallas.length ? ' · fallas: ' + r.fallas.map((x) => x.t).join(', ') : '')); A.closeModal(); A.render(); A.chequeoOpen(it.id);
  }, 'Chequeo guardado.');
  A.chequeoPdf = async (id) => { const it = A.db.inventory.find((x) => x.id === id); if (!it || !it.chequeo) return; try { await A.jspdf(); const d = ICLUBDocs.chequeo(A.db, it); if (A.sharePdf) A.sharePdf(d, '', 'Te paso el informe de chequeo de tu ' + it.name + '. Todo revisado ✅'); else d.save('ICLUB Chequeo ' + it.name + '.pdf'); } catch (e) { A.toast('No se pudo armar el PDF: ' + (e.message || e), true); } };
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act^="chq-"]'); if (!b) return; ev.preventDefault();
    if (b.dataset.act === 'chq-open') A.chequeoOpen(b.dataset.id); else if (b.dataset.act === 'chq-pdf') A.chequeoPdf(b.dataset.id);
    else if (b.dataset.act === 'chq-all') document.querySelectorAll('#chqForm input[type=radio][value=ok]').forEach((r) => { r.checked = true; });
  });
  document.addEventListener('submit', (ev) => { if (ev.target.id === 'chqForm') save(ev.target); });
})();
