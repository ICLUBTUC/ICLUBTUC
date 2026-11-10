/* ICLUB · Usuarios para vendedores: permisos en el panel (el servidor además bloquea lo crítico) y administración de usuarios. */
(function () {
  'use strict';
  const A = window.ICA; const { esc, chip } = A;
  const PERMS = [['vender', 'Vender', 'Registrar ventas desde el inventario'], ['cobrar', 'Cobrar', 'Registrar pagos y mandar recibos'], ['editar', 'Editar y anular', 'Editar/anular pagos, deshacer compras, devoluciones, cambiar fechas'], ['clientes', 'Datos de clientes', 'Cambiar datos, claves y bloquear clientes'], ['inventario', 'Inventario', 'Cargar productos, precios y stock'], ['finanzas', 'Finanzas y caja', 'Ver finanzas, estadísticas, gastos y cierres de caja'], ['ajustes', 'Ajustes', 'Dólar, recargos, tarjeta y textos']];
  A.PERMS = PERMS;
  const ROUTE = { vender: 'vender', finanzas: 'finanzas', caja: 'finanzas', estadisticas: 'finanzas', ajustes: 'ajustes' };
  const ADMIN_ONLY = ['catalogo', 'referidos', 'inversores', 'respaldo'];
  A.routeAllowed = (route) => { if (A.isAdmin()) return true; if (ADMIN_ONLY.includes(route)) return false; return !ROUTE[route] || A.can(ROUTE[route]); };
  const STAFF_W = ['accesos', 'consultas', 'recordatorios', 'oportunidades', 'kpis', 'calendario', 'tareas', 'atrasados', 'proximos', 'stock', 'interesados', 'clientesW'];
  A.widgetAllowed = (k) => A.isAdmin() || (STAFF_W.includes(k) && (k !== 'kpis' || A.can('cobrar')));

  A.applyPerms = () => {
    const b = document.body; PERMS.forEach(([k]) => b.classList.toggle('no-' + k, !A.can(k))); b.classList.toggle('is-staff', !A.isAdmin());
    document.querySelectorAll('.side a.nav').forEach((a) => { const r = (a.getAttribute('href') || '').slice(1); a.hidden = !A.routeAllowed(r); });
    document.querySelectorAll('.side .nav-label').forEach((l) => { let n = l.nextElementSibling, any = false; while (n && n.classList.contains('nav')) { if (!n.hidden) any = true; n = n.nextElementSibling; } l.hidden = !any; });
    const foot = document.querySelector('.side .foot span'); if (foot) foot.textContent = A.me.name + (A.isAdmin() ? '' : ' · vendedor');
  };
  /* Si entra a una sección sin permiso, se lo dice en vez de mostrarla. */
  const render0 = A.render;
  A.render = () => {
    if (!A.db || !A.me) return render0();
    const route = decodeURIComponent(location.hash.slice(1) || 'inicio').split('/')[0];
    if (!A.routeAllowed(route)) { const v = A.$('#view'); if (v) v.innerHTML = '<div class="page-head"><div><h1>Sin acceso</h1><p>Tu usuario no tiene permiso para esta sección. Pedíselo al administrador.</p></div></div><a class="btn btn-brand" href="#inicio">Volver al inicio</a>'; return; }
    return render0();
  };

  /* ===================== ADMINISTRAR USUARIOS (Ajustes, solo admin) ===================== */
  A.usersCard = () => !A.isAdmin() ? '' : '<div class="card"><div class="card-head"><div><h2>Usuarios y vendedores</h2><p>Cada vendedor entra con su usuario y clave. Vos elegís qué puede hacer.</p></div><div class="spacer"></div><button class="btn-brand btn-sm" data-act="user-new">+ Nuevo usuario</button></div><div id="usersBox" class="small muted">Cargando…</div></div>';
  A.loadUsers = async () => {
    const box = A.$('#usersBox'); if (!box) return;
    try { const r = await A.rpc('iclub_staff_admin', { p_action: 'list', p_item: {} }); A._users = r.users || [];
      box.className = 'list'; box.innerHTML = A._users.length ? A._users.map((u) => '<div class="item"><div class="avatar">' + esc(A.initials(u.name)) + '</div><div class="grow"><div class="strong">' + esc(u.name) + ' ' + (u.blocked ? chip('Bloqueado', 'dark') : '') + '</div><div class="sub-t">Usuario: <b>' + esc(u.user) + '</b>' + (u.lastLogin ? ' · último ingreso ' + new Date(u.lastLogin).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : ' · nunca ingresó') + '</div><div class="small" style="margin-top:4px">' + PERMS.filter(([k]) => u.perms[k]).map(([, l]) => chip(l, 'info')).join(' ') + (PERMS.some(([k]) => u.perms[k]) ? '' : chip('Solo mirar', 'muted')) + '</div></div><button class="btn-sm btn-2" data-act="user-edit" data-user="' + esc(u.user) + '">Editar</button></div>').join('') : '<div class="empty" style="padding:14px">Todavía no hay vendedores. Creá el primero con "+ Nuevo usuario".</div>';
    } catch (e) { box.innerHTML = /staff_admin|function|schema cache/i.test(e.message) ? '<div class="note warn">Para usar vendedores ejecutá <b>migraciones/13-usuarios.sql</b> en Supabase.</div>' : esc(e.message); }
  };
  A.userForm = (user) => {
    const u = user ? (A._users || []).find((x) => x.user === user) : null; const p = u ? u.perms : { vender: true, cobrar: true };
    A.modal(u ? 'Editar ' + u.name : 'Nuevo usuario', '<form id="userForm" data-edit="' + (u ? esc(u.user) : '') + '" class="grid"><div class="grid g2"><label class="f">Nombre<input name="name" required maxlength="60" value="' + esc(u ? u.name : '') + '" placeholder="Ej: Juan Pérez"></label><label class="f">Usuario para ingresar<input name="user" required ' + (u ? 'readonly' : '') + ' value="' + esc(u ? u.user : '') + '" placeholder="juan" autocapitalize="off" pattern="[A-Za-z][A-Za-z0-9._-]{2,23}"><small>Letras y números, sin espacios. Entra en la misma pantalla que vos.</small></label><label class="f">' + (u ? 'Nueva clave (dejala vacía para no cambiarla)' : 'Clave') + '<input name="password" type="text" minlength="8" maxlength="72" ' + (u ? '' : 'required') + ' autocomplete="off"><small>Mínimo 8 caracteres.</small></label></div>' +
      '<fieldset style="border:0;padding:0;margin:4px 0"><legend class="strong" style="margin-bottom:6px">¿Qué puede hacer?</legend>' + PERMS.map(([k, l, d]) => '<label class="check" style="align-items:flex-start;margin:6px 0"><input type="checkbox" name="p_' + k + '" ' + (p[k] ? 'checked' : '') + '> <span><b>' + l + '</b><br><span class="small muted">' + d + '</span></span></label>').join('') + '</fieldset>' +
      '<p class="small muted">Nunca puede: ver inversores, referidos ni respaldos, ni administrar usuarios. Aunque intente desde el navegador, el servidor no le deja anular, editar ni borrar si no tiene el permiso.</p>' +
      (u ? '<label class="check"><input type="checkbox" name="blocked" ' + (u.blocked ? 'checked' : '') + '> Bloquear (no puede entrar)</label>' : '') +
      '<div class="row-flex"><button class="btn-good">' + (u ? 'Guardar cambios' : 'Crear usuario') + '</button>' + (u ? '<button type="button" class="btn-bad" data-act="user-del" data-user="' + esc(u.user) + '">Eliminar usuario</button>' : '') + '</div></form>');
  };
  A.saveUser = (f) => A.act(async () => {
    const e = f.elements, perms = {}; PERMS.forEach(([k]) => { perms[k] = e['p_' + k].checked; });
    const item = { user: e.user.value.trim(), name: e.name.value.trim(), password: e.password.value, perms }; if (f.dataset.edit) item.blocked = !!(e.blocked && e.blocked.checked);
    await A.rpc('iclub_staff_admin', { p_action: f.dataset.edit ? 'update' : 'create', p_item: item }); A.closeModal(); await A.loadUsers();
  }, 'Usuario guardado.');
  A.delUser = (user) => { if (!confirm('¿Eliminar el usuario ' + user + '? Lo que registró queda guardado.')) return; A.act(async () => { await A.rpc('iclub_staff_admin', { p_action: 'delete', p_item: { user } }); A.closeModal(); await A.loadUsers(); }, 'Usuario eliminado.'); };
})();
