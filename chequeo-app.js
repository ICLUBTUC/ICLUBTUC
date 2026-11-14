/* ICLUB · Chequeá tu iPhone (página pública): guía paso a paso para revisar un iPhone, con resultado al final
   y salida a Plan canje o a un chequeo profesional por WhatsApp. El avance queda guardado en este navegador. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const G = (window.ICLUBChequeo || []).map((g) => ({ g: g.g, items: g.items.filter((x) => !x.panel) })).filter((g) => g.items.length);
  const ALL = G.reduce((a, g) => a.concat(g.items), []);
  let S = { r: {}, bat: '' }; try { S = Object.assign(S, JSON.parse(localStorage.getItem('iclub-chequeo') || '{}')); } catch (_) {}
  const keep = () => { try { localStorage.setItem('iclub-chequeo', JSON.stringify(S)); } catch (_) {} };
  let D = null; const waNum = () => { const w = String((D && D.settings && D.settings.biz && D.settings.biz.wa) || '3814680653').replace(/\D/g, ''); return w.startsWith('54') ? w : '549' + w.replace(/^0/, ''); };
  function render() {
    const done = ALL.filter((x) => S.r[x.k]).length, ok = ALL.filter((x) => S.r[x.k] === 'ok'), bad = ALL.filter((x) => S.r[x.k] === 'falla'), pct = Math.round(done / ALL.length * 100), bat = Number(S.bat) || 0;
    let h = '<div class="cj-hero"><span class="cj-badge">Guía gratis</span></div><h1 class="cj-h1">Chequeá tu iPhone</h1><p class="cj-sub">' + ALL.length + ' pruebas simples, en unos 10 minutos. Tocá cada una para ver cómo se hace y marcá cómo te fue.</p>' +
      '<div class="cq-prog"><div class="cq-bar"><i style="width:' + pct + '%"></i></div><span>' + done + ' de ' + ALL.length + '</span></div>';
    G.forEach((g) => { h += '<div class="cj-group">' + esc(g.g) + '</div>' + g.items.map((x) => { const v = S.r[x.k]; return '<div class="cq-it' + (v ? ' ' + v : '') + '"><details' + (v ? '' : ' open') + '><summary><span class="cq-dot">' + (v === 'ok' ? '✓' : v === 'falla' ? '!' : '') + '</span><b>' + esc(x.t) + '</b>' + (x.crit ? '<em>clave</em>' : '') + '</summary><p>' + esc(x.how) + '</p>' + (x.num ? '<label class="cj-field cq-bat"><span>¿Qué porcentaje dice?</span><input data-f="bat" inputmode="numeric" maxlength="3" value="' + esc(S.bat) + '" placeholder="Ej: 87"></label>' : '') + '<div class="cq-btns"><button data-a="ok" data-k="' + x.k + '" class="' + (v === 'ok' ? 'on' : '') + '">Anda bien</button><button data-a="falla" data-k="' + x.k + '" class="bad' + (v === 'falla' ? ' on' : '') + '">Tiene un problema</button></div></details></div>'; }).join(''); });
    if (done) {
      const critBad = bad.filter((x) => x.crit), batBaja = bat > 0 && bat < 80;
      h += '<div class="cj-sep">TU RESULTADO</div><div class="cq-res ' + (bad.length || batBaja ? 'warn' : 'good') + '"><div class="cq-big">' + ok.length + '<small>/' + done + '</small></div><div><b>' + (done < ALL.length ? 'Te faltan ' + (ALL.length - done) + ' pruebas.' : !bad.length && !batBaja ? '¡Tu iPhone está impecable!' : critBad.length ? 'Revisá esto antes de comprar o vender:' : 'Tu iPhone tiene algunos detalles:') + '</b>' + (bad.length ? '<ul>' + bad.map((x) => '<li>' + esc(x.t) + '</li>').join('') + '</ul>' : '') + (batBaja ? '<p>La batería está en ' + bat + '%: conviene cambiarla.</p>' : bat ? '<p>Batería al ' + bat + '%.</p>' : '') +
        (critBad.some((x) => x.k === 'icloud') ? '<p class="cq-alert">Si tiene una cuenta de iCloud de otra persona, <b>no lo compres</b>: no se puede usar.</p>' : '') + '</div></div>' +
        '<div class="cq-ctas">' + (critBad.some((x) => x.k === 'icloud') ? '' : '<a class="cq-cta" href="/canje">Cotizá tu iPhone en Plan canje →<small>' + (bad.length ? 'Igual lo tomamos, con sus detalles' : 'Renovalo y pagá la diferencia en cuotas') + '</small></a>') + '<a class="cq-cta alt" target="_blank" rel="noopener" href="https://wa.me/' + waNum() + '?text=' + encodeURIComponent('Hola! Hice el chequeo de mi iPhone en la página: ' + ok.length + ' de ' + done + ' pruebas bien' + (bad.length ? ' (problemas: ' + bad.map((x) => x.t).join(', ') + ')' : '') + (bat ? ', batería ' + bat + '%' : '') + '. ¿Me lo pueden revisar?') + '">Pedí un chequeo profesional →<small>Lo revisamos con 3uTools y te damos el informe</small></a></div><p class="cj-note"><button class="cq-reset" data-a="reset">Empezar de nuevo</button></p>';
    }
    $('#cj').innerHTML = h;
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; e.preventDefault(); const a = b.dataset.a; if (a === 'reset') { S = { r: {}, bat: '' }; } else { S.r[b.dataset.k] = S.r[b.dataset.k] === a ? '' : a; } keep(); const y = window.scrollY; render(); window.scrollTo({ top: y }); });
  document.addEventListener('input', (e) => { if (e.target.dataset.f !== 'bat') return; S.bat = e.target.value.replace(/\D/g, '').slice(0, 3); keep(); });
  document.addEventListener('change', (e) => { if (e.target.dataset.f === 'bat') { const y = window.scrollY; render(); window.scrollTo({ top: y }); } });
  window.ICLUBChequeoPage = { state: () => S };
  render(); (async () => { try { D = await window.ICLUBData.read(); render(); } catch (_) {} })();
})();
