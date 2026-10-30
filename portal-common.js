/* ICLUB · Base compartida de los portales de referidos e inversores: sesión, servidor y formato. */
(function () {
  'use strict';
  const M = window.ICLUBMetrics;
  const C = window.ICP = {};
  C.$ = (s, el) => (el || document).querySelector(s);
  C.esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  C.ars = (v) => '$ ' + nf.format(M.r2(Number(v) || 0)); C.usd = (v) => 'USD ' + nf.format(M.r2(Number(v) || 0)); C.money = (v, c) => (c === 'USD' ? C.usd(v) : C.ars(v));
  C.num = (v) => { const s = String(v ?? '').trim().replace(/\s|\$/g, ''); if (!s) return 0; if (/,\d{1,2}$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.')); return Number(s.replace(/,/g, '')); };
  C.first = (n) => String(n || '').trim().split(/\s+/)[0] || '';
  C.chip = (t, c) => '<span class="chip ' + (c || '') + '">' + C.esc(t) + '</span>';
  C.api = new ICLUBPortalApi(supabase.createClient(ICLUBData.config.url, ICLUBData.config.key));
  C.rpc = (name, args) => C.api.call(name, Object.assign({ p_token: C.api.token }, args || {}));
  C.track = (kind, detail) => { C.rpc('iclub_net_track', { p_kind: kind, p_detail: detail || {} }).catch(() => {}); };
  C.toast = (msg, bad) => { let t = C.$('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.style.background = bad ? '#991b1b' : '#0f172a'; t.hidden = false; clearTimeout(C._t); C._t = setTimeout(() => (t.hidden = true), bad ? 6000 : 2800); };
  C.copy = async (text) => { try { await navigator.clipboard.writeText(text); return true; } catch (_) { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} ta.remove(); return ok; } };
  C.modal = (title, body) => { let d = C.$('#modal'); if (!d) { d = document.createElement('dialog'); d.id = 'modal'; d.className = 'modal'; document.body.appendChild(d); d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); }); } d.innerHTML = '<div class="modal-head"><h2>' + C.esc(title) + '</h2><button class="x" data-close aria-label="Cerrar">×</button></div><div class="modal-body">' + body + '</div>'; if (!d.open) d.showModal(); return d; };
  /* Pantalla de ingreso. onOk se llama con la sesión iniciada. */
  C.login = (root, title, sub, onOk) => {
    root.innerHTML = '<div class="card login"><h1>' + C.esc(title) + '</h1><p class="muted" style="margin-bottom:18px">' + sub + '</p><form id="loginForm" class="grid"><label class="f">Celular<input name="phone" inputmode="tel" autocomplete="username" required></label><label class="f">Contraseña<input name="password" type="password" autocomplete="current-password" required></label><p id="loginErr" class="err"></p><button class="btn-brand">Ingresar</button></form><p class="small muted" style="margin-top:14px">¿No tenés acceso? Pedíselo a ICLUB por WhatsApp.</p></div>';
    C.$('#loginForm').addEventListener('submit', async (e) => { e.preventDefault(); const f = e.target; f.querySelector('button').disabled = true; try { await C.api.login(f.elements.phone.value.replace(/\D/g, '') || f.elements.phone.value.trim(), f.elements.password.value); sessionStorage.removeItem('iclub-tracked'); onOk(); } catch (err) { C.$('#loginErr').textContent = err.message; f.querySelector('button').disabled = false; } });
  };
  C.logout = async () => { try { await C.api.logout(); } catch (_) {} location.reload(); };
  /* Grilla de cuotas (misma lectura que el panel). */
  C.cuotas = (c, pm) => {
    const P = window.ICLUBCollectionPlan; if (!c || !pm || !pm.finan) return ''; const pc = P._planCalc(c, pm), t = M.startOfDay(new Date());
    return '<div class="cuotas">' + pc.cuotas.map((q) => { const late = !q.done && q.dt && q.dt < t, cls = q.done ? 'paid' : late ? 'late' : q.paid > 0 ? 'partial' : pc.prox && pc.prox.i === q.i ? 'next' : ''; return '<div class="cuota ' + cls + '"><span class="muted">Cuota ' + q.n + '</span><b>' + C.ars(q.done ? q.req : q.req - q.paid) + '</b>' + C.esc(q.d) + '<br>' + (q.done ? (q.req <= 0.005 && q.desc ? '<span class="disc">Cubierta con tu comisión</span>' : 'Pagada') : late ? '<span class="bad">Vencida</span>' : q.paid > 0 ? 'Pagaste ' + C.ars(q.paid) : 'Pendiente') + (q.desc ? '<br><span class="disc">−' + C.ars(q.desc) + ' por tu comisión</span>' : '') + '</div>'; }).join('') + '</div>';
  };
})();
