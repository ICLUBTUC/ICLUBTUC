(function(root){class Plan {
  _num(s) { return parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0; }
  _fmtDate(d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
  _today() { return this._fmtDate(new Date()); }
  _now() {
    const d = new Date();
    return this._today() + ' · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  _parseDate(s) {
    const p = String(s || '').split('/');
    if (p.length !== 3) return null;
    return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
  }
  _schedule(startF, n, freq) {
    const start = this._parseDate(startF) || new Date();
    const out = [];
    for (let i = 1; i <= n; i++) {
      const d = new Date(start);
      if (freq === 'Semanal') d.setDate(d.getDate() + 7 * i);
      else d.setMonth(d.getMonth() + i);
      out.push(this._fmtDate(d));
    }
    return out;
  }
  _planCalc(client, pm) {
    const n = pm.finan.n;
    const freq = pm.finan.freq || 'Mensual';
    const base = pm.finan.base != null ? pm.finan.base : -pm.imp;
    const recUnset = pm.finan.rec == null;
    const recPct = recUnset ? 0 : this._num(pm.finan.rec);
    const contado = recPct > 0 ? base / (1 + recPct / 100) : base;
    const cuotaImp = pm.finan.exact ? Math.round(base / n * 100)/100 : Math.round(base / n);
    const capImp = Math.round(contado / n);
    const vencs = pm.finan.vencs || {};
    const dates = this._schedule(pm.f, n, freq).map((d, i) => vencs[i] || d);
    /* Si el cliente tiene un solo plan financiado, los pagos sueltos (cargados
       sin elegir "Aplicar a") también se imputan a ese plan — salvo el adelanto
       de la propia compra, que ya está descontado del monto financiado. */
    const planesCount = (client.movs || []).filter((x) => x.finan).length;
    /* Un adelanto NO paga cuotas: ya está descontado del monto financiado.
       Se reconoce por la marca, por el grupo de la compra, por el detalle, o
       porque se cobró el mismo día de la venta (datos viejos sin marca). */
    const esAdelanto = (x) => !!x.adel || /adelanto/i.test(String(x.det || ''))
      || (x.grp && x.grp === pm.grp) || x.f === pm.f;
    const pagos = (client.movs || []).filter((x) => x.tipo === 'Pago' && (
      x.plan === pm.doc || (planesCount === 1 && !x.plan && !esAdelanto(x))
    )).slice().sort((a, b) => (this._parseDate(a.f) || 0) - (this._parseDate(b.f) || 0));
    /* Plan liquidado a contado: el cliente pagó (o paga) en efectivo y se le
       saca el recargo entero, sin importar la fecha de cada cuota. */
    const esContado = !!pm.finan.contado;
    const cuotaBase = esContado ? capImp : cuotaImp;
    const cuotas = dates.map((d, i) => ({ n: i + 1, i: i, d: d, dt: this._parseDate(d), req: i===n-1 ? Math.round(((esContado?Math.round(contado):base)-cuotaBase*(n-1))*100)/100 : cuotaBase, paid: 0, pay: null, sinInt: esContado, done: false }));
    const TOL = 0.005;
    let ahorro = esContado ? Math.round(base - contado) : 0, credito = 0;
    pagos.forEach((p) => {
      let rest = p.imp;
      const pd = this._parseDate(p.f) || new Date();
      let primera = true;
      for (let i = 0; i < cuotas.length && rest > 0; i++) {
        const q = cuotas[i];
        if (q.done) continue;
        /* El adelanto sin interés aplica a las cuotas que este pago adelanta
           (no a la que ya estaba vencida o en curso). */
        if (p.sinInt && q.paid === 0 && !primera && q.dt && pd < q.dt) { q.req = capImp; q.sinInt = true; }
        primera = false;
        const take = Math.min(q.req - q.paid, rest);
        q.paid = Math.round((q.paid + take)*100)/100; rest = Math.round((rest - take)*100)/100;
        if (q.paid >= q.req - TOL) { q.done = true; q.pay = p; if (q.sinInt && !esContado) ahorro += (cuotaImp - capImp); }
      }
      if (rest > 0) credito += rest;
    });
    let pendiente = 0, vencidoAhora = 0;
    const hoy = new Date();
    cuotas.forEach((q) => {
      if (q.done) return;
      const falta = Math.max(0, q.req - q.paid);
      pendiente += falta;
      if (q.dt && q.dt < hoy) vencidoAhora += falta;
    });
    const pagadas = cuotas.filter((q) => q.done).length;
    const prox = cuotas.find((q) => !q.done) || null;
    return {
      n: n, freq: freq, base: base, contado: Math.round(contado), recPct: recPct, recUnset: recUnset, esContado: esContado,
      cuotaImp: cuotaImp, capImp: capImp, cuotas: cuotas, ahorro: ahorro, credito: credito,
      pendiente: Math.round(pendiente*100)/100, vencidoAhora: Math.round(vencidoAhora*100)/100,
      pagadas: pagadas, pagadoTotal: pagos.reduce((a, x) => a + x.imp, 0), prox: prox
    };
  }
}root.ICLUBCollectionPlan=new Plan();if(typeof module!=="undefined")module.exports=new Plan();})(typeof window!=="undefined"?window:globalThis);