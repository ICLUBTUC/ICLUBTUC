/* ICLUB · Equipos recibidos como forma de pago (plan canje).
   Sirve para un aporte del plan de ahorro o como parte de pago de una deuda.
   El equipo no es plata: no entra a ninguna cuenta del Capital; entra al stock con su valor como costo. */
(function () {
  'use strict';
  const A = window.ICA, M = window.ICLUBMetrics; const { esc } = A;
  const catDe = (n) => /iphone/i.test(n) ? 'iPhone' : /ipad/i.test(n) ? 'iPad' : /watch/i.test(n) ? 'Apple Watch' : /airpod/i.test(n) ? 'AirPods' : /mac/i.test(n) ? 'Mac' : 'Otros';
  /* Campos del equipo (se muestran cuando eligen "equipo"). */
  A.canjeCampos = (moneda) => '<div class="grid canje-box"><label class="f">¿Qué equipo te dio?<input name="cjEquipo" placeholder="Ej: iPhone 14 128 GB 89% batería" maxlength="80"></label>' +
    '<label class="check"><input type="checkbox" name="cjStock" checked> Entra al stock para vender (con ese valor como costo' + (moneda === 'USD' ? ' en USD' : '') + ')</label></div>';
  /* Suma el equipo al stock. Devuelve el id del producto. */
  A.canjeAStock = (next, equipo, costo, moneda, ref) => {
    next.inventory = next.inventory || [];
    const it = { id: A.uid(), name: String(equipo).slice(0, 80), spec: 'Recibido en canje' + (ref ? ' · ' + ref : ''), cat: catDe(equipo), moneda: moneda || 'USD', costo: M.r2(costo), venta: '', stock: 1, source: 'Plan canje', createdAt: new Date().toISOString() };
    next.inventory.push(it); A.stockMove(next, it, 1, 'Entró por canje' + (ref ? ' · ' + ref : '')); return it.id;
  };
  /* Si se borra el aporte o el pago, el equipo sale del stock (si todavía está). */
  A.canjeQuitarStock = (next, itemId) => { const it = (next.inventory || []).find((x) => x.id === itemId); if (it && Number(it.stock) > 0) { it.stock = Number(it.stock) - 1; A.stockMove(next, it, -1, 'Se anuló el canje'); } };
})();
