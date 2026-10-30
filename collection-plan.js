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
      else { /* Un vencimiento del 30 o 31 cae el último día de los meses más cortos (no se pasa al mes siguiente). */
        const day = start.getDate(); d.setDate(1); d.setMonth(start.getMonth() + i);
        d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); }
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
    const cuotas = dates.map((d, i) => ({ n: i + 1, i: i, d: d, dt: this._parseDate(d), req: i===n-1 ? Math.round(((esContado?Math.round(contado):base)-cuotaBase*(n-1))*100)/100 : cuotaBase, paid: 0, pay: null, sinInt: esContado, done: false, adj: 0, restos: [] }));
    /* Restos de cuota resueltos por administración: el faltante de una cuota
       se suma a la próxima, se pasa a la última o se perdona (con nota de
       crédito). Así un pago chico nunca arrastra el faltante cuota por cuota. */
    (pm.finan.restos || []).forEach((r) => {
      const q = cuotas[r.i], m = Math.round(Number(r.monto) * 100) / 100;
      if (!q || !(m > 0)) return;
      const dest = r.destino === 'next' ? cuotas[r.i + 1] : r.destino === 'last' ? cuotas[n - 1] : null;
      q.adj = Math.round((q.adj - m) * 100) / 100; q.req = Math.round((q.req - m) * 100) / 100; q.restos.push(r);
      if (dest && dest !== q) { dest.adj = Math.round((dest.adj + m) * 100) / 100; dest.req = Math.round((dest.req + m) * 100) / 100; dest.recibe = Math.round(((dest.recibe || 0) + m) * 100) / 100; }
    });
    /* Comisiones de referidos aplicadas a las cuotas propias: "ultimas" cancela desde
       la última cuota hacia la primera; "repartir" baja el importe de las cuotas que
       vencen desde la fecha del descuento. Cada cuota muestra cuánto se le descontó. */
    (pm.finan.creditos || []).forEach((cr) => {
      let rest = Math.round(Number(cr.monto) * 100) / 100;
      if (!(rest > 0)) return;
      const take = (q, m) => { m = Math.min(m, Math.max(0, q.req)); if (!(m > 0)) return 0; q.req = Math.round((q.req - m) * 100) / 100; q.adj = Math.round((q.adj - m) * 100) / 100; q.desc = Math.round(((q.desc || 0) + m) * 100) / 100; (q.creditos = q.creditos || []).push({ ref: cr.ref, monto: Math.round(m * 100) / 100, f: cr.f }); return m; };
      if (cr.modo === 'repartir') {
        const desde = this._parseDate(cr.f);
        let pool = cuotas.filter((q) => q.req > 0 && (!desde || !q.dt || q.dt >= desde));
        if (!pool.length) pool = cuotas.filter((q) => q.req > 0);
        for (let guard = 0; rest > 0.004 && pool.length && guard < 200; guard++) {
          const each = Math.floor(rest / pool.length * 100) / 100 || rest;
          pool.forEach((q, k) => { if (rest > 0.004) rest = Math.round((rest - take(q, k === pool.length - 1 ? rest : Math.min(each, rest))) * 100) / 100; });
          pool = pool.filter((q) => q.req > 0);
        }
      }
      for (let i = cuotas.length - 1; i >= 0 && rest > 0.004; i--) rest = Math.round((rest - take(cuotas[i], rest)) * 100) / 100;
    });
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
        if (p.sinInt && q.paid === 0 && !primera && q.dt && pd < q.dt) { q.req = Math.round((capImp + q.adj) * 100) / 100; q.sinInt = true; }
        primera = false;
        const take = Math.min(q.req - q.paid, rest);
        q.paid = Math.round((q.paid + take)*100)/100; rest = Math.round((rest - take)*100)/100;
        if (q.paid >= q.req - TOL) { q.done = true; q.pay = p; if (q.sinInt && !esContado) ahorro += (cuotaImp - capImp); }
      }
      if (rest > 0) credito += rest;
    });
    cuotas.forEach((q) => { if (!q.done && q.req <= TOL) q.done = true; });
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
  /* Cuota que quedaría con resto si se registra un pago de `amount` (0 = estado actual). */
  _restoTras(client, pm, amount) {
    const movs = (client.movs || []).slice();
    if (amount > 0) movs.push({ f: this._today(), tipo: 'Pago', imp: amount, plan: pm.doc, _sim: true });
    const pc = this._planCalc(Object.assign({}, client, { movs: movs }), pm);
    const q = pc.cuotas.find((x) => !x.done && x.paid > 0);
    if (!q) return null;
    const monto = Math.round((q.req - q.paid) * 100) / 100;
    if (!(monto > 0)) return null;
    return { i: q.i, n: q.n, total: pc.n, monto: monto, esUltima: q.i === pc.n - 1 };
  }
  /* Devuelve los movimientos del cliente con el resto resuelto. destino:
     'next' (sumar a la próxima), 'last' (pasar a la última) o 'perdon'.
     El perdón agrega una nota de crédito para que el saldo de la cuenta
     coincida con el plan. */
  _resolverResto(client, pm, resto, destino, ncDoc, motivo) {
    if (!resto || !(resto.monto > 0)) throw new Error('No hay un resto para resolver.');
    if (!['next', 'last', 'perdon'].includes(destino)) throw new Error('Elegí qué hacer con el resto.');
    if (destino !== 'perdon' && resto.esUltima) throw new Error('Es la última cuota: el resto solo puede quedar pendiente o perdonarse.');
    const r = { i: resto.i, monto: resto.monto, destino: destino, f: this._today() };
    if (motivo) r.motivo = String(motivo).slice(0, 200);
    const pm2 = Object.assign({}, pm, { finan: Object.assign({}, pm.finan, { restos: (pm.finan.restos || []).concat([r]) }) });
    let movs = (client.movs || []).map((m) => m === pm ? pm2 : m);
    if (destino === 'perdon') {
      if (!ncDoc) throw new Error('Falta el número de nota de crédito.');
      movs = movs.concat([{ f: this._today(), tipo: 'Nota de Crédito', doc: ncDoc, imp: resto.monto, plan: pm.doc, auto: 'resto',
        det: 'Resto perdonado de la cuota ' + resto.n + ' de ' + resto.total + ' · ' + pm.doc }]);
    }
    return movs;
  }
  _restoTexto(destino, resto) {
    if (!resto) return '';
    return destino === 'next' ? 'Se suma a la cuota ' + (resto.n + 1)
      : destino === 'last' ? 'Se suma a la cuota ' + resto.total + ' (última)'
      : destino === 'perdon' ? 'Se perdona con nota de crédito' : 'Queda pendiente en la cuota ' + resto.n;
  }

}root.ICLUBCollectionPlan=new Plan();if(typeof module!=="undefined")module.exports=new Plan();})(typeof window!=="undefined"?window:globalThis);