/* ICLUB · Ajustes → Plan de ahorro: equipos y precios en USD, meses máximos, desde qué % se retira antes,
   y el recargo para 1 cuota (2 o más cuotas usan los recargos de Financiación propia). Se publica en /ahorro. */
(function () {
  'use strict';
  const A = window.ICA; const { esc } = A;
  const DEF_ITEMS = [{ name: 'iPhone 13', spec: '128 GB', usd: 370 }, { name: 'iPhone 14', spec: '128 GB', usd: 400 }, { name: 'iPhone 13 Pro', spec: '128 GB', usd: 485, destacado: true, motivos: ['Pantalla de 120 Hz, mucho más fluida', 'Triple cámara con zoom óptico 3x y modo macro', 'Cuerpo de acero inoxidable, más premium'] }, { name: 'iPhone 14 Pro', spec: '128 GB', usd: 550 }, { name: 'iPhone 16 Pro', spec: '128 GB', usd: 825 }];
  A.ahorroDefItems = DEF_ITEMS;
  const cfg = () => { const c = (A.db.settings && A.db.settings.ahorro) || {}; return { on: c.on !== false, meses: Number(c.meses) || 6, minPct: Number(c.minPct) || 50, rec1: c.rec1 != null ? Number(c.rec1) : 10, items: c.items && c.items.length ? c.items : DEF_ITEMS }; };
  const row = (x, i) => '<div class="grid g4 ah-row" style="align-items:end"><label class="f">Equipo<input name="n" value="' + esc(x.name || '') + '" placeholder="iPhone 13"></label><label class="f">Detalle<input name="s" value="' + esc(x.spec || '') + '" placeholder="128 GB"></label><label class="f">Precio (USD)<input name="u" inputmode="decimal" value="' + esc(x.usd || '') + '"></label><label class="check"><input type="radio" name="dest" value="' + i + '"' + (x.destacado ? ' checked' : '') + '> Recomendado</label></div>';
  A.ahorroCard = () => { const c = cfg(), dest = c.items.find((x) => x.destacado) || {};
    return '<div class="card"><div class="card-head"><div><h2>Plan de ahorro</h2><p>El cliente elige el equipo y lo paga en cuotas en dólares, sin interés. Si lo quiere antes, lo que falta se financia con tu recargo normal.</p></div><div class="spacer"></div><a class="small" href="/ahorro" target="_blank" rel="noopener">Ver página</a></div>' +
      '<form id="ahorroForm" class="grid"><div class="grid g3"><label class="f">Meses máximos<input name="meses" inputmode="numeric" value="' + c.meses + '"></label><label class="f">Puede retirarlo con (% pagado)<input name="minPct" inputmode="numeric" value="' + c.minPct + '"></label><label class="f">Recargo si falta 1 cuota (%)<input name="rec1" inputmode="decimal" value="' + c.rec1 + '"><small>Con 2 o más cuotas usa los recargos de Financiación propia.</small></label></div>' +
      '<div id="ahRows" class="grid">' + c.items.map(row).join('') + '</div><button type="button" class="btn-2 btn-sm" data-act="ah-row">+ Agregar equipo</button>' +
      '<label class="f">Por qué conviene el recomendado (una razón por línea)<textarea name="motivos" rows="3">' + esc((dest.motivos || DEF_ITEMS[2].motivos).join('\n')) + '</textarea></label>' +
      '<label class="check"><input type="checkbox" name="on" ' + (c.on ? 'checked' : '') + '> Mostrar el Plan de ahorro en la página</label><p class="tiny muted">Para sacar un equipo, dejá el nombre vacío.</p><button class="btn-brand">Guardar plan de ahorro</button></form></div>'; };
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-act="ah-row"]'); if (!b) return; e.preventDefault(); const box = A.$('#ahRows'); box.insertAdjacentHTML('beforeend', row({}, box.querySelectorAll('.ah-row').length)); });
  document.addEventListener('submit', (e) => {
    const f = e.target; if (f.id !== 'ahorroForm') return; const el = f.elements;
    const motivos = el.motivos.value.split('\n').map((t) => t.trim()).filter(Boolean).slice(0, 6), dest = (f.querySelector('[name=dest]:checked') || {}).value;
    const items = [...f.querySelectorAll('.ah-row')].map((r, i) => ({ name: r.querySelector('[name=n]').value.trim().slice(0, 40), spec: r.querySelector('[name=s]').value.trim().slice(0, 40), usd: A.num(r.querySelector('[name=u]').value), destacado: String(i) === dest })).filter((x) => x.name);
    if (items.some((x) => !(x.usd > 0))) { A.toast('Poné el precio en USD de cada equipo.', true); return; }
    items.forEach((x) => { if (x.destacado) x.motivos = motivos; else delete x.destacado; });
    const meses = Math.min(12, Math.max(1, Math.round(A.num(el.meses.value) || 6))), minPct = Math.min(95, Math.max(10, Math.round(A.num(el.minPct.value) || 50)));
    A.saveSettings({ ahorro: { on: el.on.checked, meses, minPct, rec1: Math.max(0, A.num(el.rec1.value) || 0), items } }, 'Plan de ahorro guardado. Ya se ve en la página.');
  });
})();
