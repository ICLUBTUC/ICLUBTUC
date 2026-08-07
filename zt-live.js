/* ZonaTech — aplica el catálogo del panel admin a la tienda pública + cuenta visitas */
(function () {
  var SB_URL = 'https://pbmsymvvemvbwhxmgddg.supabase.co';
  var SB_KEY = 'sb_publishable_dt4zRwkE4_NbZrXvbpZjIw_1Uhe7pFn';
  var LS = 'zt-portal-fin-db-v2';

  function fmtInt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function getLocal() {
    try { var raw = localStorage.getItem(LS); if (raw) { var db = JSON.parse(raw); if (db && db.clients) return db; } } catch (e) {}
    return null;
  }
  function fetchRemote(cb) {
    try {
      fetch(SB_URL + '/rest/v1/portal_state?id=eq.main&select=data', {
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
      }).then(function (r) { return r.json(); }).then(function (rows) {
        var db = rows && rows[0] && rows[0].data;
        if (db && db.clients) {
          try { localStorage.setItem(LS, JSON.stringify(db)); } catch (e) {}
          cb(db, true);
        } else cb(null, false);
      }).catch(function () { cb(null, false); });
    } catch (e) { cb(null, false); }
  }
  function pushRemote(db) {
    try {
      fetch(SB_URL + '/rest/v1/portal_state?id=eq.main', {
        method: 'PATCH',
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ data: db, updated_at: new Date().toISOString() })
      }).catch(function () {});
    } catch (e) {}
  }

  /* Editor de texto in-situ (sólo admin). */
  function editableText(el, getVal, onSave) {
    if (!el || !isAdmin() || el.getAttribute('data-zt-editable') === '1') return;
    el.setAttribute('data-zt-editable', '1');
    el.title = 'Doble clic para editar';
    el.style.cursor = 'text';
    el.addEventListener('dblclick', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (el.isContentEditable) return;
      el.contentEditable = 'true';
      el.style.outline = '2px solid #0A84FF'; el.style.outlineOffset = '3px'; el.style.borderRadius = '4px';
      el.focus();
      try { document.getSelection().selectAllChildren(el); } catch (err) {}
      function done(save) {
        el.removeEventListener('blur', onBlur); el.removeEventListener('keydown', onKey);
        el.contentEditable = 'false'; el.style.outline = '';
        var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (save) onSave(t); else el.textContent = getVal();
      }
      var onBlur = function () { done(true); };
      var onKey = function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); el.blur(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); done(false); }
      };
      el.addEventListener('blur', onBlur); el.addEventListener('keydown', onKey);
    });
  }

  /* La edición en la tienda pública es sólo para el administrador logueado. */
  function isAdmin() {
    try { return localStorage.getItem('zt-portal-fin-user') === 'admin'; } catch (e) { return false; }
  }

  function saveOv(pid, fields) {
    var db = getLocal(); if (!db) return;
    db.catalog = db.catalog || {};
    db.catalog[pid] = db.catalog[pid] || {};
    for (var k in fields) db.catalog[pid][k] = fields[k];
    try { localStorage.setItem(LS, JSON.stringify(db)); } catch (e) {}
    pushRemote(db);
    apply(db);
  }
  function savePhoto(pid, url) { saveOv(pid, { photo: url, px: 0, py: 0, pz: 1 }); }
  function frameCss(ov) {
    return 'translate(' + (ov.px || 0) + '%,' + (ov.py || 0) + '%) scale(' + (ov.pz || 1) + ')';
  }
  function makePhotoEditable(wrap, pid) {
    if (!isAdmin()) return;
    wrap.title = 'Doble clic para editar la foto';
    wrap.addEventListener('dblclick', function (e) {
      e.preventDefault(); e.stopPropagation();
      var img = wrap.querySelector('img');
      if (!img) { pickPhoto(pid); return; }
      if (wrap.getAttribute('data-zt-editing')) return;
      startFrameEdit(wrap, img, pid);
    });
  }
  function pickPhoto(pid) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { savePhoto(pid, rd.result); };
      rd.readAsDataURL(f);
    };
    inp.click();
  }
  function startFrameEdit(wrap, img, pid) {
    var db = getLocal();
    var ov = (db && db.catalog && db.catalog[pid]) || {};
    var st = { px: ov.px || 0, py: ov.py || 0, pz: ov.pz || 1 };
    wrap.setAttribute('data-zt-editing', '1');
    var oldOutline = wrap.style.outline;
    wrap.style.outline = '3px solid #0A84FF';
    wrap.style.cursor = 'grab';
    img.style.willChange = 'transform';
    var tip = document.createElement('div');
    tip.style.cssText = 'position:absolute;left:8px;right:8px;bottom:8px;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(29,29,31,.85);color:#fff;font-size:11.5px;font-weight:600;border-radius:12px;padding:8px 12px;pointer-events:auto;';
    tip.innerHTML = '<span>Arrastr\u00e1 \u00b7 rueda = zoom \u00b7 clic afuera = guardar</span>';
    var chg = document.createElement('button');
    chg.textContent = 'Cambiar foto';
    chg.style.cssText = 'flex:0 0 auto;background:#fff;color:#1D1D1F;border:none;border-radius:980px;padding:6px 12px;font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit;';
    tip.appendChild(chg);
    wrap.appendChild(tip);
    function render() { img.style.transform = frameCss(st); }
    render();
    var drag = null;
    function onDown(e) { drag = { x: e.clientX, y: e.clientY, px: st.px, py: st.py }; wrap.style.cursor = 'grabbing'; e.preventDefault(); }
    function onMove(e) {
      if (!drag) return;
      var r = wrap.getBoundingClientRect();
      st.px = drag.px + ((e.clientX - drag.x) / r.width) * 100;
      st.py = drag.py + ((e.clientY - drag.y) / r.height) * 100;
      render();
    }
    function onUp() { drag = null; wrap.style.cursor = 'grab'; }
    function onWheel(e) {
      e.preventDefault();
      st.pz = Math.min(4, Math.max(0.4, st.pz * (e.deltaY < 0 ? 1.07 : 0.93)));
      render();
    }
    function onWrapClick(e) { e.preventDefault(); e.stopPropagation(); }
    function onDocClick(e) {
      if (wrap.contains(e.target)) return;
      e.preventDefault(); e.stopPropagation();
      finish(true);
    }
    function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter') finish(e.key !== 'Escape'); }
    function finish(save) {
      wrap.removeAttribute('data-zt-editing');
      wrap.style.outline = oldOutline;
      wrap.style.cursor = '';
      tip.remove();
      wrap.removeEventListener('click', onWrapClick);
      wrap.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      wrap.removeEventListener('wheel', onWheel);
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKey);
      if (save) saveOv(pid, { px: st.px, py: st.py, pz: st.pz });
      else { var o = (getLocal() || {}).catalog || {}; img.style.transform = frameCss(o[pid] || {}); }
    }
    chg.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); finish(false); pickPhoto(pid); });
    wrap.addEventListener('click', onWrapClick);
    wrap.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    wrap.addEventListener('wheel', onWheel, { passive: false });
    setTimeout(function () {
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onKey);
    }, 100);
  }

  function findCard(slot) {
    var el = slot;
    for (var i = 0; i < 7 && el; i++) {
      if (el.hasAttribute && (el.hasAttribute('data-appl-card') || el.hasAttribute('data-cat-card') || el.hasAttribute('data-cc-card'))) return el;
      if (el.tagName === 'A' && el.querySelector('[data-cc-imgwrap],[data-appl-imgwrap]')) return el;
      el = el.parentElement;
    }
    return slot.parentElement ? slot.parentElement.parentElement : null;
  }
  function setPrices(card, usd, rate) {
    var walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var t = node.nodeValue || '';
      if (/^\s*(USD|US\$)\s*[\d.,]+\s*$/.test(t)) node.nodeValue = t.replace(/[\d.,]+/, fmtInt(usd));
      else if (/^\s*(ARS|\$)\s*[\d.,]+\s*$/.test(t)) node.nodeValue = t.replace(/[\d.,]+/, fmtInt(usd * rate));
    }
  }
  /* La cotización tiene que valer para TODOS los precios, no sólo para los
     productos editados en el panel: las tarjetas nativas traen el valor en
     pesos escrito a mano. Se recalcula por TARJETA (nunca por grilla: una
     grilla tiene muchos productos y todos quedarían con el primer precio)
     desde el USD que muestra cada una, con la cotización vigente. */
  /* "Última unidad" tomado del stock real del inventario del panel: sólo se
     avisa cuando queda 1, para que el aviso siga significando algo. */
  function stampUltimas(db) {
    var norm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
    var inv = (db.inventory || []).filter(function (it) { return (it.stock || 0) === 1; }).map(function (it) { return norm(it.name); }).filter(Boolean);
    var cards = document.querySelectorAll('[data-appl-card],[data-cat-card],[data-cc-card],[data-zt-custom],[data-nv-card]');
    Array.prototype.forEach.call(cards, function (card) {
      var old = card.querySelector('[data-zt-ultima]');
      if (old) old.parentNode.removeChild(old);
      if (card.querySelector('[data-zt-nostock]')) return;
      var txt = norm(card.textContent);
      var hit = inv.some(function (n) { return n.length > 5 && txt.indexOf(n) >= 0; });
      if (!hit) return;
      var wrap = card.querySelector('[data-cc-imgwrap],[data-appl-imgwrap]') || card;
      wrap.style.position = 'relative';
      var chip = document.createElement('span');
      chip.setAttribute('data-zt-ultima', '');
      chip.textContent = 'ÚLTIMA UNIDAD';
      chip.style.cssText = 'position:absolute;top:12px;left:12px;z-index:5;background:rgba(176,112,15,.95);color:#fff;font-size:10.5px;font-weight:700;letter-spacing:.08em;padding:6px 12px;border-radius:980px;font-family:inherit;';
      wrap.appendChild(chip);
    });
  }
  /* La cotización tiene que valer para TODOS los precios, no sólo para los
     productos editados en el panel: las tarjetas nativas traen el valor en
     pesos escrito a mano. Se recalcula por TARJETA (nunca por grilla: una
     grilla tiene muchos productos y todos quedarían con el primer precio)
     desde el USD que muestra cada una, con la cotización vigente. */
  function resyncArs(rate) {
    var seen = [];
    function scopeArs(scope, usdHint) {
      var usd = usdHint || 0, arsNodes = [];
      var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode())) {
        if (seen.indexOf(node) >= 0) continue;
        var t = node.nodeValue || '';
        var mUsd = t.match(/^\s*(USD|US\$)\s*([\d.,]+)\s*$/);
        if (mUsd) { seen.push(node); if (!usd) usd = parseFloat(mUsd[2].replace(/\./g, '').replace(',', '.')) || 0; continue; }
        if (/^\s*(ARS|\$)\s*[\d.,]+\s*$/.test(t)) { arsNodes.push(node); seen.push(node); }
      }
      if (!usd || !arsNodes.length) return;
      arsNodes.forEach(function (n) {
        n.nodeValue = (n.nodeValue || '').replace(/[\d.,]+/, fmtInt(usd * rate));
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-appl-card],[data-cat-card],[data-cc-card],[data-zt-custom],[data-nv-card]'), function (c) { scopeArs(c, 0); });
    Array.prototype.forEach.call(document.querySelectorAll('.det-section,.det-info'), function (el) { scopeArs(el, 0); });
  }
  /* Tarjetas que sólo traen el precio en dólares: se les agrega la línea en
     pesos, para que todas informen lo mismo. Es idempotente. */
  function stampArs(rate) {
    var cards = document.querySelectorAll('[data-appl-card],[data-cat-card],[data-cc-card],[data-zt-custom],[data-nv-card]');
    Array.prototype.forEach.call(cards, function (card) {
      var host = null, usd = 0, hasArs = false;
      var walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode())) {
        var t = node.nodeValue || '';
        if (/^\s*(ARS|\$)\s*[\d.,]+\s*$/.test(t) && !(node.parentNode && node.parentNode.hasAttribute && node.parentNode.hasAttribute('data-zt-ars'))) hasArs = true;
      }
      var all = card.querySelectorAll('*');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.children.length) continue;
        var m = (el.textContent || '').match(/^\s*(?:USD|US\$)\s*([\d.,]+)\s*$/);
        if (m) { host = el; usd = parseFloat(m[1].replace(/\./g, '').replace(',', '.')) || 0; break; }
      }
      var tag = card.querySelector('[data-zt-ars]');
      if (hasArs || !host || !usd) { if (tag) tag.parentNode.removeChild(tag); return; }
      if (!tag) {
        tag = document.createElement('div');
        tag.setAttribute('data-zt-ars', '');
        tag.style.cssText = 'font-size:12.5px;color:#86868B;letter-spacing:-.01em;margin-top:1px;white-space:nowrap;';
        var par = host.parentNode, dir = 'column';
        try { var cs = getComputedStyle(par); if (cs.display.indexOf('flex') >= 0 || cs.display.indexOf('grid') >= 0) dir = cs.flexDirection; } catch (e) {}
        if (dir === 'row' || dir === 'row-reverse') {
          var col = document.createElement('div');
          col.style.cssText = 'display:flex;flex-direction:column;gap:1px;min-width:0;';
          par.insertBefore(col, host);
          col.appendChild(host);
          col.appendChild(tag);
        } else {
          par.insertBefore(tag, host.nextSibling);
        }
      }
      tag.textContent = 'ARS ' + fmtInt(usd * rate);
    });
  }
  /* "Nuevo USD X · ahorrás Y": el argumento del seminuevo. Sólo aparece si el
     precio de nuevo está cargado en el panel y es mayor al de venta. */
  function stampAhorro(cat) {
    var norm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
    var list = [];
    Object.keys(cat || {}).forEach(function (id) {
      var o = cat[id] || {};
      var nu = parseFloat(o.usdNew) || 0, u = parseFloat(o.usd) || 0;
      if (nu > u && u > 0 && o.name) list.push({ n: norm(o.name), nuevo: nu, usd: u });
    });
    var cards = document.querySelectorAll('[data-appl-card],[data-cat-card],[data-cc-card],[data-zt-custom],[data-nv-card],.det-info');
    Array.prototype.forEach.call(cards, function (card) {
      var old = card.querySelector('[data-zt-ahorro]');
      var txt = norm(card.textContent);
      var hit = null;
      list.forEach(function (x) { if (x.n.length > 5 && txt.indexOf(x.n) >= 0) hit = x; });
      if (!hit) { if (old) old.parentNode.removeChild(old); return; }
      var host = null;
      var all = card.querySelectorAll('*');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.children.length) continue;
        if (/^\s*(?:USD|US\$)\s*[\d.,]+\s*$/.test(el.textContent || '')) { host = el; break; }
      }
      if (!host) { if (old) old.parentNode.removeChild(old); return; }
      var tag = old;
      if (!tag) {
        tag = document.createElement('div');
        tag.setAttribute('data-zt-ahorro', '');
        tag.style.cssText = 'font-size:12.5px;font-weight:600;color:#1F8A5B;letter-spacing:-.01em;margin-top:3px;white-space:nowrap;';
        var par = host.parentNode, dir = 'column';
        try { var cs = getComputedStyle(par); if (cs.display.indexOf('flex') >= 0 || cs.display.indexOf('grid') >= 0) dir = cs.flexDirection; } catch (e) {}
        if (dir === 'row' || dir === 'row-reverse') {
          var col = document.createElement('div');
          col.style.cssText = 'display:flex;flex-direction:column;gap:1px;min-width:0;';
          par.insertBefore(col, host);
          col.appendChild(host);
          col.appendChild(tag);
        } else {
          par.insertBefore(tag, host.nextSibling);
        }
      }
      tag.innerHTML = '<span style="color:#A1A1A6;font-weight:500;text-decoration:line-through;">Nuevo US$ ' + fmtInt(hit.nuevo) + '</span> \u00b7 ahorrás ' + Math.round((1 - hit.usd / hit.nuevo) * 100) + '%';
    });
  }
  function markSinStock(card) {
    if (card.querySelector('[data-zt-nostock]')) return;
    var wrap = card.querySelector('[data-cc-imgwrap],[data-appl-imgwrap]') || card;
    wrap.style.position = 'relative';
    var chip = document.createElement('span');
    chip.setAttribute('data-zt-nostock', '');
    chip.textContent = 'SIN STOCK';
    chip.style.cssText = 'position:absolute;top:12px;left:12px;z-index:5;background:rgba(201,80,42,.95);color:#fff;font-size:10.5px;font-weight:700;letter-spacing:.08em;padding:6px 12px;border-radius:980px;font-family:inherit;';
    wrap.appendChild(chip);
    card.style.opacity = '.62';
  }
  function setPhoto(slot, url) {
    var wrap = slot.parentElement || slot;
    var old = wrap.querySelector('[data-zt-photo]');
    if (old) { if (old.getAttribute('src') === url) return; old.remove(); }
    wrap.style.position = 'relative';
    var img = document.createElement('img');
    img.setAttribute('data-zt-photo', '');
    img.src = url;
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:4;border-radius:inherit;';
    wrap.appendChild(img);
  }

  function detailHrefFor(cat, id) {
    if (cat === 'Celulares') return 'Producto Android.dc.html?id=' + id;
    if (cat === 'Smart TV') return 'Producto Smart TV.dc.html?id=' + id;
    return 'Producto ZonaTech.dc.html?m=' + id;
  }

  function gridFor(catName) {
    var refId = (catName === 'Apple') ? 'apple-iphone13' : (catName === 'Accesorios') ? 'acc-airpodsmax' : (catName === 'Smart TV') ? 'tv-ecopower' : 'and-samsung-a07';
    var ref = document.getElementById(refId);
    if (!ref) return null;
    var card = findCard(ref);
    if (!card) return null;
    /* Solo grillas de listado reales: nunca inyectar dentro de tarjetas de
       recomendados ni fichas de producto (comparten ids de image-slot). */
    var ok = card.hasAttribute && (card.hasAttribute('data-appl-card') || card.hasAttribute('data-cat-card') || card.hasAttribute('data-cc-card') || card.hasAttribute('data-nv-card') || (card.classList && card.classList.contains('cat-card')));
    if (!ok) return null;
    return card.parentElement;
  }
  function injectCustomCard(id, ov, rate) {
    var existing = document.querySelector('[data-zt-custom="' + id + '"]');
    if (ov.hidden) { if (existing) existing.remove(); return; }
    var sig = [ov.name, ov.spec, ov.usd, ov.sinStock ? 1 : 0, (ov.photo || '').length, rate, ov.bat || '', ov.pos != null ? ov.pos : '', ov.cat || '', (ov.px || 0).toFixed ? (ov.px || 0).toFixed(1) : 0, (ov.py || 0).toFixed ? (ov.py || 0).toFixed(1) : 0, ov.pz || 1].join('|');
    if (existing && existing.getAttribute('data-zt-sig') === sig) return;
    var grid = gridFor(ov.cat || 'Celulares');
    if (!grid) { if (existing) existing.remove(); return; }
    if (existing) existing.remove();
    /* Grilla de Novedades (inicio): la tarjeta debe ser un data-nv-card
       idéntico a los nativos para que el CSS móvil la achique igual. */
    if (grid.hasAttribute && grid.hasAttribute('data-nv-grid')) {
      var nv = document.createElement('a');
      nv.setAttribute('data-zt-custom', id);
      nv.setAttribute('data-nv-card', '');
      nv.id = 'zt-custom-' + id;
      nv.setAttribute('data-zt-sig', sig);
      nv.href = detailHrefFor(ov.cat, id);
      nv.style.cssText = 'text-decoration:none;color:#1D1D1F;display:flex;flex-direction:column;gap:13px;padding:20px;background:#fff;border-radius:24px;border:1px solid rgba(0,0,0,.05);box-shadow:0 12px 40px -18px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.03);font-family:inherit;' + (ov.sinStock ? 'opacity:.62;' : '');
      var nvi = document.createElement('div');
      nvi.setAttribute('data-nv-img', '');
      nvi.style.cssText = 'width:100%;aspect-ratio:1/1;border-radius:18px;overflow:hidden;background:linear-gradient(160deg,#F2F3F4,#E7EAEC);position:relative;display:flex;align-items:center;justify-content:center;';
      if (ov.photo) { var nim = document.createElement('img'); nim.src = ov.photo; nim.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;transform:' + frameCss(ov) + ';'; nvi.appendChild(nim); }
      else { var nph = document.createElement('span'); nph.textContent = (ov.name || '?').charAt(0).toUpperCase(); nph.style.cssText = 'font-size:40px;font-weight:700;color:#C9BFB2;'; nvi.appendChild(nph); }
      nv.appendChild(nvi);
      makePhotoEditable(nvi, id);
      var nvEye = ov.sinStock ? 'SIN STOCK' : (ov.cat === 'Apple' ? 'SEMINUEVO CERTIFICADO' : 'DISPONIBLE');
      var nvEyeCol = ov.sinStock ? '#C9502A' : (ov.cat === 'Apple' ? '#C9502A' : '#1F8A5B');
      var nvb = document.createElement('div');
      nvb.innerHTML = '<div data-nv-eyebrow style="font-size:11px;font-weight:700;letter-spacing:.16em;color:' + nvEyeCol + ';">' + nvEye + '</div>'
        + '<div style="display:flex;flex-direction:column;gap:3px;margin-top:13px;"><h4 style="margin:0;font-size:17px;font-weight:600;letter-spacing:-.01em;color:#1D1D1F;"></h4><div data-zt-nvspec style="font-size:13px;color:#6E6E73;"></div></div>'
        + '<div data-nv-foot style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:13px;"><div style="display:flex;flex-direction:column;gap:1px;"><div style="font-size:20px;font-weight:600;letter-spacing:-.01em;color:#1D1D1F;">USD ' + fmtInt(ov.usd || 0) + '</div><div style="font-size:12px;color:#A1A1A6;">ARS ' + fmtInt((ov.usd || 0) * rate) + '</div></div><div style="display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:980px;background:#F5F1EC;font-size:13px;font-weight:600;color:#1D1D1F;white-space:nowrap;">Más info <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></div></div>';
      nvb.style.cssText = 'display:contents;';
      nv.appendChild(nvb);
      nv.querySelector('h4').textContent = ov.name || '';
      var nvsp = nv.querySelector('[data-zt-nvspec]');
      var nvspTxt = [ov.spec || '', ov.bat ? ('Batería ' + ov.bat + '%') : ''].filter(Boolean).join(' · ');
      if (nvspTxt) nvsp.textContent = nvspTxt; else nvsp.style.display = 'none';
      nv.setAttribute('data-zt-pos', ov.pos != null ? ov.pos : 9999);
      grid.appendChild(nv);
      reorderGrid(grid);
      return;
    }
    if ((ov.cat || '') === 'Apple') {
      var row = document.createElement('a');
      row.setAttribute('data-zt-custom', id);
      row.setAttribute('data-appl-card', '');
      row.id = 'zt-custom-' + id;
      row.setAttribute('data-zt-sig', sig);
      row.href = detailHrefFor(ov.cat, id);
      row.style.cssText = 'display:flex;flex-direction:column;gap:16px;padding:22px;background:#fff;border-radius:24px;text-decoration:none;color:#1D1D1F;box-shadow:0 12px 40px -18px rgba(0,0,0,.14), 0 2px 6px rgba(0,0,0,.03);transition:box-shadow .4s, transform .4s;will-change:transform;' + (ov.sinStock ? 'opacity:.62;' : '');
      var rw = document.createElement('div');
      rw.setAttribute('data-appl-imgwrap', '');
      rw.style.cssText = 'width:100%;aspect-ratio:1/1;border-radius:18px;overflow:hidden;background:linear-gradient(160deg,#F2F3F4,#E7EAEC);position:relative;display:flex;align-items:center;justify-content:center;';
      if (ov.photo) { var ri = document.createElement('img'); ri.src = ov.photo; ri.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;transform:' + frameCss(ov) + ';'; rw.appendChild(ri); }
      else { var rp = document.createElement('span'); rp.textContent = (ov.name || '?').charAt(0).toUpperCase(); rp.style.cssText = 'font-size:44px;font-weight:700;color:#C9BFB2;'; rw.appendChild(rp); }
      if (ov.sinStock) { var rc = document.createElement('span'); rc.textContent = 'SIN STOCK'; rc.setAttribute('data-zt-nostock', ''); rc.style.cssText = 'position:absolute;top:12px;left:12px;background:rgba(201,80,42,.95);color:#fff;font-size:10.5px;font-weight:700;letter-spacing:.08em;padding:6px 12px;border-radius:980px;'; rw.appendChild(rc); }
      row.appendChild(rw);
      makePhotoEditable(rw, id);
      var rb = document.createElement('div');
      rb.style.cssText = 'display:flex;flex-direction:column;gap:9px;';
      rb.innerHTML = '<div style="font-size:10.5px;font-weight:700;letter-spacing:.18em;color:#C9502A;">SEMINUEVO CERTIFICADO</div>'
        + '<h2 style="margin:0;font-size:19px;font-weight:600;letter-spacing:-.015em;"></h2>'
        + '<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:#6E6E73;"></div>';
      rb.children[1].textContent = ov.name || '';
      var specWrap = rb.children[2];
      var specParts = [];
      specParts.push('<span>128 GB</span>');
      if (ov.bat) {
        specParts.push('<span style="display:inline-flex;align-items:center;gap:6px;"><span style="position:relative;width:22px;height:11px;border:1.3px solid #9B9BA0;border-radius:3px;display:inline-block;flex:0 0 auto;"><span style="position:absolute;inset:1.5px;width:' + Math.max(8, Math.min(100, ov.bat)) + '%;background:#34C759;border-radius:1px;"></span></span>' + ov.bat + '%</span>');
      }
      specWrap.innerHTML = specParts.join('<span style="width:3px;height:3px;border-radius:50%;background:#C7C7CC;"></span>');
      row.appendChild(rb);
      var priceRow = document.createElement('div');
      priceRow.style.cssText = 'display:flex;align-items:flex-end;justify-content:space-between;margin-top:auto;padding-top:4px;';
      priceRow.innerHTML = '<div style="display:flex;flex-direction:column;gap:2px;"><div style="font-size:21px;font-weight:600;letter-spacing:-.01em;">USD ' + fmtInt(ov.usd || 0) + '</div><div style="font-size:12px;color:#A1A1A6;">ARS ' + fmtInt((ov.usd || 0) * rate) + '</div></div>'
        + '<div data-appl-arrow="" style="width:38px;height:38px;border-radius:50%;background:#F5F1EC;display:flex;align-items:center;justify-content:center;will-change:transform;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></div>';
      row.appendChild(priceRow);
      row.setAttribute('data-zt-pos', ov.pos != null ? ov.pos : 9999);
      grid.appendChild(row);
      reorderGrid(grid);
      return;
    }
    var card = document.createElement('a');
    card.href = detailHrefFor(ov.cat, id);
    card.setAttribute('data-zt-custom', id);
    card.id = 'zt-custom-' + id;
    card.setAttribute('data-zt-sig', sig);
    card.style.cssText = 'display:flex;flex-direction:column;gap:18px;padding:28px;background:#fff;border-radius:28px;text-decoration:none;color:#1D1D1F;box-shadow:0 18px 60px -24px rgba(0,0,0,.16), 0 3px 8px rgba(0,0,0,.03);font-family:inherit;' + (ov.sinStock ? 'opacity:.62;' : '');
    var wrap = document.createElement('div');
    wrap.style.cssText = 'width:100%;aspect-ratio:1/1;border-radius:20px;overflow:hidden;background:linear-gradient(160deg,#F2F3F4,#E7EAEC);position:relative;display:flex;align-items:center;justify-content:center;';
    if (ov.photo) {
      var im = document.createElement('img');
      im.src = ov.photo;
      im.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;transform:' + frameCss(ov) + ';';
      wrap.appendChild(im);
    } else {
      var ph = document.createElement('span');
      ph.textContent = (ov.name || '?').charAt(0).toUpperCase();
      ph.style.cssText = 'font-size:44px;font-weight:700;color:#C9BFB2;';
      wrap.appendChild(ph);
    }
    if (ov.sinStock) {
      var chip = document.createElement('span');
      chip.setAttribute('data-zt-nostock', '');
      chip.textContent = 'SIN STOCK';
      chip.style.cssText = 'position:absolute;top:12px;left:12px;background:rgba(201,80,42,.95);color:#fff;font-size:10.5px;font-weight:700;letter-spacing:.08em;padding:6px 12px;border-radius:980px;';
      wrap.appendChild(chip);
    }
    card.appendChild(wrap);
    makePhotoEditable(wrap, id);
    var body = document.createElement('div');
    body.style.cssText = 'display:flex;flex-direction:column;gap:6px;flex:1;';
    body.innerHTML = '<div style="font-size:11px;font-weight:700;letter-spacing:.16em;color:#1F8A5B;">DISPONIBLE</div>'
      + '<h3 style="margin:0;font-size:21px;font-weight:600;letter-spacing:-.02em;color:#1D1D1F;"></h3>'
      + '<div style="font-size:14px;color:#6E6E73;"></div>'
      + '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-top:auto;padding-top:10px;"><div style="display:flex;flex-direction:column;gap:2px;"><div style="font-size:26px;font-weight:600;letter-spacing:-.02em;color:#1D1D1F;">USD ' + fmtInt(ov.usd || 0) + '</div><div style="font-size:12px;color:#A1A1A6;">ARS ' + fmtInt((ov.usd || 0) * rate) + '</div></div><div style="width:44px;height:44px;border-radius:50%;background:#F5F1EC;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></div></div>';
    body.children[1].textContent = ov.name || '';
    var sw2 = body.children[2];
    sw2.style.cssText = 'font-size:14px;color:#6E6E73;display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
    if (ov.bat) {
      var bw2 = document.createElement('span');
      bw2.style.cssText = 'display:inline-flex;align-items:center;gap:6px;';
      bw2.innerHTML = '<span style="position:relative;width:38px;height:14px;border:1.5px solid rgba(0,0,0,.3);border-radius:4px;display:inline-block;flex:0 0 auto;"><span style="position:absolute;inset:2px;width:' + Math.max(8, Math.min(100, ov.bat)) + '%;background:#1D1D1F;border-radius:2px;"></span></span><span>Batería ' + ov.bat + '%</span>';
      sw2.appendChild(bw2);
    } else { sw2.style.display = 'none'; }
    card.appendChild(body);
    card.setAttribute('data-zt-pos', ov.pos != null ? ov.pos : 9999);
    grid.appendChild(card);
    reorderGrid(grid);
  }

  /* Ordena las tarjetas agregadas entre TODOS los productos de la grilla,
     para que el puesto elegido en el admin cuente nativos + agregados juntos. */
  function reorderGrid(grid) {
    if (!grid) return;
    var children = Array.prototype.slice.call(grid.children);
    var customs = children.filter(function (el) { return el.hasAttribute && el.hasAttribute('data-zt-custom'); });
    if (!customs.length) return;
    var hasAppl = children.some(function (el) { return el.hasAttribute && el.hasAttribute('data-appl-card'); });
    customs.sort(function (a, b) { return (+a.getAttribute('data-zt-pos') || 0) - (+b.getAttribute('data-zt-pos') || 0); });
    customs.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
    customs.forEach(function (el) {
      var pos = parseInt(el.getAttribute('data-zt-pos'), 10);
      var kids = Array.prototype.filter.call(grid.children, function (k) {
        if (k.nodeType !== 1 || k.style.display === 'none') return false;
        return k.hasAttribute('data-zt-custom') || !hasAppl || k.hasAttribute('data-appl-card');
      });
      if (!isNaN(pos) && pos < kids.length) grid.insertBefore(el, kids[pos]);
      else if (kids.length) { var last = kids[kids.length - 1]; if (last.nextSibling) grid.insertBefore(el, last.nextSibling); else grid.appendChild(el); }
      else grid.appendChild(el);
    });
  }

  /* Ficha de producto autogenerada para productos del catálogo (en las páginas Producto …) */
  function injectCustomDetail(db, rate) {
    var sec = document.querySelector('.det-section');
    if (!sec) return;
    var pid = productIdFromUrl();
    if (!pid) return;
    var ov = (db.catalog || {})[pid] || null;
    if (!ov || !ov.custom || ov.deleted) return;
    document.body.removeAttribute('data-zt-model');
    Array.prototype.forEach.call(document.querySelectorAll('.prod-block'), function (el) { el.style.setProperty('display', 'none', 'important'); });
    var recBlocks = document.querySelectorAll('.rec-block');
    Array.prototype.forEach.call(recBlocks, function (el, i) { el.style.setProperty('display', i === 0 ? 'block' : 'none', 'important'); });
    Array.prototype.forEach.call(sec.children, function (el) { if (el.id !== 'zt-custom-detail') el.style.setProperty('display', 'none', 'important'); });
    var defRowsByCat = {
      'Smart TV': [{ k: 'Marca', v: 'A completar' }, { k: 'Tamaño', v: 'A completar' }, { k: 'Resolución', v: 'Ultra HD (4K)' }],
      'Celulares': [{ k: 'Almacenamiento', v: ov.spec || '128 GB' }, { k: 'RAM', v: 'A completar' }, { k: 'Garantía', v: '30 días' }],
      'Apple': [{ k: 'Almacenamiento', v: ov.spec || '128 GB' }, { k: 'Garantía', v: '30 días' }, { k: 'Color', v: 'A completar' }],
      'Accesorios': [{ k: 'Condición', v: 'Nuevo · sellado' }, { k: 'Garantía', v: '30 días' }]
    };
    var rows = (ov.rows && ov.rows.length) ? ov.rows : (defRowsByCat[ov.cat] || [{ k: 'Detalle', v: ov.spec || 'A completar' }, { k: 'Garantía', v: '30 días' }]);
    var sig = [ov.name, ov.spec, ov.usd, ov.bat || '', (ov.photo || '').length, rate, ov.sinStock ? 1 : 0, ov.cat || '', (ov.px || 0).toFixed ? (ov.px || 0).toFixed(1) : 0, (ov.py || 0).toFixed ? (ov.py || 0).toFixed(1) : 0, ov.pz || 1, JSON.stringify(rows), ov.desc || ''].join('|');
    var ex = document.getElementById('zt-custom-detail');
    if (ex && ex.getAttribute('data-zt-sig') === sig) return;
    if (ex) ex.remove();
    var wa = 'Finalizar Compra.dc.html?id=' + encodeURIComponent(pid) + '&cat=' + encodeURIComponent(ov.cat || '') + '&name=' + encodeURIComponent(ov.name || '') + '&usd=' + (ov.usd || 0);
    var d = document.createElement('div');
    d.id = 'zt-custom-detail';
    d.setAttribute('data-zt-sig', sig);
    d.className = 'det-grid';
    d.style.cssText = 'display:grid;grid-template-columns:minmax(300px,380px) 1fr;gap:56px;align-items:stretch;animation:ztReveal .8s both;font-family:inherit;';
    var col = document.createElement('div');
    col.className = 'det-imgcol';
    var box = document.createElement('div');
    box.style.cssText = 'position:relative;height:100%;min-height:420px;border-radius:28px;overflow:hidden;background:#fff;box-shadow:0 24px 70px -32px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;flex:1;';
    if (ov.photo) { var im = document.createElement('img'); im.src = ov.photo; im.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;position:absolute;inset:0;transform:' + frameCss(ov) + ';'; box.appendChild(im); }
    else { var ph = document.createElement('span'); ph.textContent = (ov.name || '?').charAt(0).toUpperCase(); ph.style.cssText = 'font-size:80px;font-weight:700;color:#C9BFB2;'; box.appendChild(ph); }
    if (ov.sinStock) { var ch = document.createElement('span'); ch.textContent = 'SIN STOCK'; ch.style.cssText = 'position:absolute;top:16px;left:16px;background:rgba(201,80,42,.95);color:#fff;font-size:11px;font-weight:700;letter-spacing:.08em;padding:7px 14px;border-radius:980px;z-index:2;'; box.appendChild(ch); }
    col.appendChild(box); d.appendChild(col);
    makePhotoEditable(box, pid);
    var cmpBtn = (ov.cat === 'Accesorios') ? '' : '<button data-compare="' + pid + '" aria-pressed="false" aria-label="Comparar" title="Comparar equipos" style="width:50px;height:50px;flex-shrink:0;border:1.5px solid rgba(0,0,0,.16);background:#fff;border-radius:16px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:#1D1D1F;font-family:inherit;"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z"></path></svg></button>';
    var info = document.createElement('div');
    info.className = 'det-info';
    info.style.cssText = 'display:flex;flex-direction:column;gap:11px;min-width:0;';
    var eyeTxt = ov.sinStock ? 'SIN STOCK' : (ov.cat === 'Apple' ? 'SEMINUEVO CERTIFICADO' : 'NUEVO · DISPONIBLE');
    var eyeCol = ov.sinStock ? '#C9502A' : (ov.cat === 'Apple' ? '#C9502A' : '#1F8A5B');
    var dotCol = ov.sinStock ? '#C9502A' : '#1F8A5B';
    var rowsHtml = '';
    rows.forEach(function (r, i) {
      rowsHtml += '<div style="display:flex;justify-content:space-between;align-items:center;gap:18px;padding:9px 0;border-bottom:1px solid rgba(0,0,0,.08);font-size:14px;"><span data-zt-row-k="' + i + '" style="color:#86868B;"></span><span data-zt-row-v="' + i + '" style="font-weight:500;color:#1D1D1F;text-align:right;"></span></div>';
    });
    info.innerHTML = '<div style="font-size:12px;font-weight:700;letter-spacing:.24em;color:' + eyeCol + ';">' + eyeTxt + '</div>'
      + '<h1 data-zt-edit-name style="margin:0;font-size:clamp(28px,3.4vw,42px);font-weight:700;letter-spacing:-.04em;line-height:.98;color:#1D1D1F;"></h1>'
      + '<div data-zt-edit-desc style="font-size:16.5px;color:#6E6E73;"></div>'
      + '<div data-zd="bat" style="display:none;align-items:center;gap:16px;margin-top:2px;"><span style="width:52px;height:19px;border:1.5px solid rgba(0,0,0,.32);border-radius:5px;display:inline-flex;align-items:center;padding:2px;box-sizing:border-box;"><span data-zd="batfill" style="height:100%;width:0;background:#1D1D1F;border-radius:2.5px;transition:width 1.1s cubic-bezier(.22,1,.36,1);"></span></span><span data-zd="battxt" style="font-size:16px;color:#6E6E73;"></span></div>'
      + '<div style="display:flex;flex-direction:column;gap:2px;margin-top:2px;border-top:1px solid rgba(0,0,0,.08);">'
        + rowsHtml
        + ((ov.cat === 'Apple') ? '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid rgba(0,0,0,.08);font-size:14px;"><span style="color:#86868B;">Checking ICLUB</span><span style="font-weight:600;color:#1F8A5B;display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F8A5B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>Pasado</span></div>' : '')
      + '</div>'
      + '<div style="display:flex;flex-direction:row-reverse;align-items:center;justify-content:space-between;gap:16px;margin-top:8px;flex-wrap:wrap;">'
        + '<div style="display:inline-flex;align-self:flex-start;background:#F4F1EC;border-radius:12px;padding:3px;">'
          + '<button data-zt-cur="USD" style="padding:7px 16px;border:none;background:transparent;border-radius:9px;font-family:inherit;font-size:13.5px;font-weight:600;color:#86868B;cursor:pointer;">USD</button>'
          + '<button data-zt-cur="ARS" style="padding:7px 16px;border:none;background:transparent;border-radius:9px;font-family:inherit;font-size:13.5px;font-weight:600;color:#86868B;cursor:pointer;">ARS</button>'
        + '</div>'
        + '<div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0;"><span data-zt-price data-usd-val="' + (ov.usd || 0) + '" style="font-size:30px;font-weight:600;letter-spacing:-.02em;white-space:nowrap;color:#1D1D1F;">USD ' + fmtInt(ov.usd || 0) + '</span><span data-zt-price-alt style="font-size:15px;color:#A1A1A6;white-space:nowrap;"></span></div>'
      + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:9px;margin-top:8px;max-width:430px;">'
        + '<div style="display:flex;align-items:stretch;gap:12px;">'
          + '<div style="display:inline-flex;align-items:center;background:#F4F1EC;border-radius:16px;padding:4px;height:50px;box-sizing:border-box;">'
            + '<button data-zt-qminus aria-label="Quitar uno" style="width:44px;height:100%;border:none;background:transparent;border-radius:12px;font-size:22px;color:#1D1D1F;cursor:pointer;font-family:inherit;">−</button>'
            + '<input data-zt-qty type="number" min="1" value="1" inputmode="numeric" style="width:40px;height:100%;border:none;text-align:center;font-family:inherit;font-size:17px;font-weight:600;color:#1D1D1F;background:transparent;">'
            + '<button data-zt-qplus aria-label="Sumar uno" style="width:44px;height:100%;border:none;background:transparent;border-radius:12px;font-size:20px;color:#1D1D1F;cursor:pointer;font-family:inherit;">+</button>'
          + '</div>'
          + '<button data-zt-addcart style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:9px;height:50px;border:1.5px solid rgba(0,0,0,.16);cursor:pointer;background:#fff;color:#1D1D1F;font-size:16px;font-weight:600;border-radius:16px;font-family:inherit;">Agregar al carrito</button>'
          + cmpBtn
        + '</div>'
        + '<a href="' + wa + '" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:10px;height:50px;background:#1D1D1F;color:#fff;font-size:16.5px;font-weight:600;border-radius:16px;font-family:inherit;">Comprar ahora<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></a>'
        + '<a href="Portal Clientes ZonaTech.dc.html#financiar" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-top:2px;color:#C9502A;font-size:14.5px;font-weight:600;font-family:inherit;">Consultar financiamiento en cuotas →</a>'
        + '<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;padding-top:14px;border-top:1px solid rgba(0,0,0,.08);">'
          + '<div style="display:flex;align-items:center;gap:10px;font-size:13.5px;color:#1D1D1F;"><span style="width:8px;height:8px;border-radius:50%;background:' + dotCol + ';box-shadow:0 0 0 3px ' + (ov.sinStock ? 'rgba(201,80,42,.15)' : 'rgba(31,138,91,.15)') + ';flex-shrink:0;"></span><span><strong style="font-weight:600;">' + (ov.sinStock ? 'Sin stock' : 'En stock') + '</strong> <span style="color:#86868B;">· ' + (ov.sinStock ? 'consultanos por WhatsApp' : 'entrega inmediata') + '</span></span></div>'
          + '<div style="font-size:13.5px;color:#6E6E73;">Envío a todo el país — despacho en el día, el envío se paga al recibir.</div>'
        + '</div>'
      + '</div>';
    var h1 = info.querySelector('[data-zt-edit-name]');
    h1.textContent = ov.name || '';
    var descEl = info.querySelector('[data-zt-edit-desc]');
    if (ov.desc) { descEl.textContent = ov.desc; }
    else if (isAdmin()) { descEl.textContent = 'Doble clic para agregar una descripción'; descEl.style.color = '#C4C1BB'; descEl.style.fontStyle = 'italic'; }
    else { descEl.style.display = 'none'; }
    rows.forEach(function (r, i) {
      info.querySelector('[data-zt-row-k="' + i + '"]').textContent = r.k || '';
      info.querySelector('[data-zt-row-v="' + i + '"]').textContent = r.v || '';
    });
    if (ov.bat) {
      var br = info.querySelector('[data-zd="bat"]'); br.style.display = 'flex';
      info.querySelector('[data-zd="battxt"]').textContent = 'Batería ' + ov.bat + '%';
      var bf = info.querySelector('[data-zd="batfill"]');
      setTimeout(function () { bf.style.width = Math.max(8, Math.min(100, ov.bat)) + '%'; }, 80);
    }
    d.appendChild(info);
    sec.appendChild(d);

    /* ── edición en la página: doble clic sobre un texto ── */
    function makeEditable(el, getVal, onSave) {
      if (!isAdmin()) return;
      el.title = 'Doble clic para editar';
      el.style.cursor = 'text';
      el.addEventListener('dblclick', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (el.isContentEditable) return;
        el.contentEditable = 'true';
        el.style.outline = '2px solid #0A84FF'; el.style.outlineOffset = '3px'; el.style.borderRadius = '4px';
        el.focus();
        try { document.getSelection().selectAllChildren(el); } catch (err) {}
        var onBlur = function () { done(true); };
        var onKey = function (ev) {
          if (ev.key === 'Enter') { ev.preventDefault(); el.blur(); }
          else if (ev.key === 'Escape') { ev.preventDefault(); done(false); }
        };
        function done(save) {
          el.removeEventListener('blur', onBlur); el.removeEventListener('keydown', onKey);
          el.contentEditable = 'false'; el.style.outline = '';
          var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
          if (save) onSave(t); else el.textContent = getVal();
        }
        el.addEventListener('blur', onBlur); el.addEventListener('keydown', onKey);
      });
    }
    function cloneRows() { return rows.map(function (r) { return { k: r.k, v: r.v }; }); }
    makeEditable(h1, function () { return ov.name || ''; }, function (t) { if (t) saveOv(pid, { name: t }); });
    makeEditable(descEl, function () { return ov.desc || ''; }, function (t) { saveOv(pid, { desc: t }); });
    rows.forEach(function (r, i) {
      makeEditable(info.querySelector('[data-zt-row-k="' + i + '"]'), function () { return r.k || ''; }, function (t) { var rr = cloneRows(); rr[i].k = t; saveOv(pid, { rows: rr }); });
      makeEditable(info.querySelector('[data-zt-row-v="' + i + '"]'), function () { return r.v || ''; }, function (t) { var rr = cloneRows(); rr[i].v = t; saveOv(pid, { rows: rr }); });
    });
    var priceEl = info.querySelector('[data-zt-price]');
    makeEditable(priceEl, function () { return priceEl.textContent; }, function (t) {
      var digits = (t || '').replace(/[^0-9]/g, '');
      if (!digits) { ztApplyCur(); return; }
      var n = parseInt(digits, 10);
      var c = 'USD'; try { c = localStorage.getItem('zt_cur') || 'USD'; } catch (err) {}
      var usd = c === 'ARS' ? Math.round(n / rate) : n;
      if (usd > 0) saveOv(pid, { usd: usd }); else ztApplyCur();
    });

    var qin = info.querySelector('[data-zt-qty]');
    function ztApplyCur() {
      var c = 'USD'; try { c = localStorage.getItem('zt_cur') || 'USD'; } catch (e) {}
      var sp = info.querySelector('[data-zt-price]');
      if (sp) {
        var usd = parseFloat(sp.getAttribute('data-usd-val')) || 0;
        sp.textContent = c === 'ARS' ? ('ARS ' + fmtInt(usd * rate)) : ('USD ' + fmtInt(usd));
        var alt = info.querySelector('[data-zt-price-alt]');
        if (alt) alt.textContent = (c === 'ARS' ? ('USD ' + fmtInt(usd)) : ('ARS ' + fmtInt(usd * rate))) + ' · precio final';
      }
      Array.prototype.forEach.call(info.querySelectorAll('[data-zt-cur]'), function (b) {
        var act = b.getAttribute('data-zt-cur') === c;
        b.style.background = act ? '#fff' : 'transparent';
        b.style.color = act ? '#1D1D1F' : '#86868B';
        b.style.boxShadow = act ? '0 1px 3px rgba(0,0,0,.12)' : 'none';
      });
    }
    info.addEventListener('click', function (e) {
      if (e.target.closest('[data-zt-qplus]')) { if (qin) qin.value = Math.max(1, (parseInt(qin.value, 10) || 1) + 1); return; }
      if (e.target.closest('[data-zt-qminus]')) { if (qin) qin.value = Math.max(1, (parseInt(qin.value, 10) || 1) - 1); return; }
      var cb = e.target.closest('[data-zt-cur]');
      if (cb) { try { localStorage.setItem('zt_cur', cb.getAttribute('data-zt-cur')); } catch (err) {} ztApplyCur(); return; }
      var addBtn = e.target.closest('[data-zt-addcart]');
      if (addBtn) {
        var qty = Math.max(1, parseInt(qin ? qin.value : 1, 10) || 1);
        try {
          var cart = JSON.parse(localStorage.getItem('zt_cart') || '[]');
          var exi = null;
          cart.forEach(function (x) { if (x.id === pid) exi = x; });
          if (exi) exi.qty += qty; else cart.push({ id: pid, name: ov.name || 'Producto', usd: ov.usd || 0, qty: qty });
          localStorage.setItem('zt_cart', JSON.stringify(cart));
          try { window.dispatchEvent(new StorageEvent('storage', { key: 'zt_cart' })); } catch (err) {}
        } catch (err) {}
        addBtn.textContent = 'Agregado ✓';
        setTimeout(function () { addBtn.textContent = 'Agregar al carrito'; }, 1400);
        return;
      }
    });
    ztApplyCur();
  }


  /* Productos del catálogo agregados también aparecen en "También te puede interesar" */
  function injectRecCards(db, rate) {
    var grids = document.querySelectorAll('.rec-grid');
    if (!grids.length) return;
    var path = decodeURIComponent(location.pathname);
    var cats = path.indexOf('Producto Android') >= 0 ? ['Celulares'] : path.indexOf('Producto Smart TV') >= 0 ? ['Smart TV'] : ['Apple', 'Accesorios'];
    var pid = productIdFromUrl();
    var cat = db.catalog || {};
    Array.prototype.forEach.call(grids, function (grid) {
      var wrap = grid.querySelector('[data-zt-recwrap]');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.setAttribute('data-zt-recwrap', '');
        wrap.style.display = 'contents';
        grid.appendChild(wrap);
      }
      wrap.innerHTML = '';
      Object.keys(cat).forEach(function (id) {
        var o = cat[id] || {};
        if (!o.custom || o.deleted || o.hidden) return;
        if (cats.indexOf(o.cat) < 0 || id === pid) return;
        var href = detailHrefFor(o.cat, id);
        var d = document.createElement('div');
        d.setAttribute('data-zt-reccustom', id);
        d.style.cssText = 'position:relative;flex:0 0 232px;scroll-snap-align:start;background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:20px;overflow:hidden;display:flex;flex-direction:column;';
        var imA = document.createElement('a'); imA.href = href; imA.style.cssText = 'display:block;text-decoration:none;';
        var imB = document.createElement('div'); imB.style.cssText = 'height:210px;background:#fff;display:flex;align-items:center;justify-content:center;';
        if (o.photo) { imB.style.backgroundImage = 'url("' + o.photo + '")'; imB.style.backgroundSize = 'cover'; imB.style.backgroundPosition = 'center top'; }
        else { var ph = document.createElement('span'); ph.textContent = (o.name || '?').charAt(0).toUpperCase(); ph.style.cssText = 'font-size:44px;font-weight:700;color:#C9BFB2;'; imB.appendChild(ph); }
        if (o.sinStock) { var sk = document.createElement('span'); sk.textContent = 'SIN STOCK'; sk.style.cssText = 'position:absolute;top:12px;left:12px;background:rgba(201,80,42,.95);color:#fff;font-size:10px;font-weight:700;letter-spacing:.08em;padding:5px 10px;border-radius:980px;z-index:2;'; d.appendChild(sk); }
        imA.appendChild(imB); d.appendChild(imA);
        var body = document.createElement('div');
        body.style.cssText = 'padding:14px 16px 16px;display:flex;flex-direction:column;gap:2px;flex:1;font-family:inherit;';
        var wa = 'https://wa.me/5493814680653?text=' + encodeURIComponent('Hola! Quiero comprar el ' + (o.name || '') + ' (USD ' + fmtInt(o.usd || 0) + ').');
        body.innerHTML = '<a style="text-decoration:none;color:inherit;font-size:15px;font-weight:600;letter-spacing:-.01em;"></a>'
          + '<span style="font-size:12.5px;color:#86868B;">' + (o.bat ? 'Batería ' + o.bat + '%' : '&nbsp;') + '</span>'
          + '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-top:auto;padding-top:12px;">'
            + '<div style="display:flex;flex-direction:column;"><span style="font-size:18px;font-weight:700;letter-spacing:-.02em;color:#1D1D1F;">USD ' + fmtInt(o.usd || 0) + '</span><span style="font-size:12px;color:#A1A1A6;font-weight:500;">ARS ' + fmtInt((o.usd || 0) * rate) + '</span></div>'
            + '<a href="' + href + '" aria-label="Ver producto" style="flex:0 0 auto;width:40px;height:40px;border-radius:980px;border:1.5px solid rgba(0,0,0,.12);background:#fff;display:inline-flex;align-items:center;justify-content:center;color:#1D1D1F;text-decoration:none;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></a>'
          + '</div>';
        var nm = body.querySelector('a'); nm.href = href; nm.textContent = o.name || '';
        d.appendChild(body);
        wrap.appendChild(d);
      });
    });
  }

  /* Flechas de carrusel para "También te puede interesar" */
  function enhanceRecCarousels() {
    Array.prototype.forEach.call(document.querySelectorAll('.rec-grid'), function (grid) {
      var block = (grid.closest && grid.closest('.rec-block')) || grid.parentNode;
      if (!block) return;
      var upd = function () {
        var can = grid.scrollWidth > grid.clientWidth + 4;
        var L = block.querySelector('[data-zt-arr="l"]'), R = block.querySelector('[data-zt-arr="r"]');
        if (L) L.style.display = (can && grid.scrollLeft > 4) ? 'inline-flex' : 'none';
        if (R) R.style.display = (can && grid.scrollLeft < grid.scrollWidth - grid.clientWidth - 4) ? 'inline-flex' : 'none';
      };
      if (!grid.getAttribute('data-zt-carousel')) {
        grid.setAttribute('data-zt-carousel', '1');
        block.style.position = 'relative';
        ['l', 'r'].forEach(function (dir) {
          var b = document.createElement('button');
          b.setAttribute('data-zt-arr', dir);
          b.setAttribute('aria-label', dir === 'l' ? 'Anterior' : 'Siguiente');
          b.style.cssText = 'position:absolute;top:calc(50% + 30px);' + (dir === 'l' ? 'left:-16px;' : 'right:-16px;') + 'transform:translateY(-50%);width:46px;height:46px;border-radius:980px;border:1px solid rgba(0,0,0,.08);background:#fff;box-shadow:0 12px 30px -12px rgba(0,0,0,.35);cursor:pointer;display:none;align-items:center;justify-content:center;color:#1D1D1F;z-index:5;';
          b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="' + (dir === 'l' ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6') + '"></path></svg>';
          b.addEventListener('click', function () { grid.scrollBy({ left: (dir === 'l' ? -1 : 1) * Math.max(246, grid.clientWidth - 80), behavior: 'smooth' }); });
          block.appendChild(b);
        });
        grid.addEventListener('scroll', upd, { passive: true });
        window.addEventListener('resize', upd);
      }
      setTimeout(upd, 60);
    });
  }

  function updateNav(db) {
    var panels = {
      Apple: document.querySelector('[data-zt-dd="apple"]'),
      Accesorios: document.querySelector('[data-zt-dd="acc"]'),
      Celulares: document.querySelector('[data-zt-dd="cel"]'),
      'Smart TV': document.querySelector('[data-zt-dd="tv"]')
    };
    if (!panels.Apple && !panels.Celulares) return;
    var pages = { Apple: 'Apple ZonaTech.dc.html', Accesorios: 'Accesorios ZonaTech.dc.html', Celulares: 'Android ZonaTech.dc.html', 'Smart TV': 'Smart TV ZonaTech.dc.html' };
    var cat = db.catalog || {};
    /* El reordenamiento se hace una sola vez por panel al final: hacerlo dentro
       del bucle sacaba y volvía a poner los links en cada producto (parpadeo). */
    var dirty = {};
    Object.keys(cat).forEach(function (id) {
      var ov = cat[id] || {};
      if (ov.custom) {
        var panel = panels[ov.cat] || panels.Celulares;
        if (!panel) return;
        var ex = panel.querySelector('[data-zt-navc="' + id + '"]');
        if (ov.hidden || ov.deleted) { if (ex) ex.remove(); return; }
        var a = ex || document.createElement('a');
        a.setAttribute('data-zt-navc', id);
        a.setAttribute('href', detailHrefFor(ov.cat, id));
        a.textContent = '';
        a.appendChild(document.createTextNode(ov.name || ''));
        var all = panel.querySelector('.zt-dd-all');
        a.setAttribute('data-zt-pos', ov.pos != null ? ov.pos : 9999);
        if (!a.parentNode) { if (all) panel.insertBefore(a, all); else panel.appendChild(a); }
        dirty[ov.cat || 'Celulares'] = panel;
        return;
      }
      // producto base: ocultar / renombrar el link existente
      var link = null;
      document.querySelectorAll('.zt-dd-panel a').forEach(function (el) {
        var h = el.getAttribute('href') || '';
        if (h.indexOf('?m=' + id) !== -1 || h.indexOf('?id=' + id) !== -1 || h.indexOf('#card-' + id) !== -1) link = el;
      });
      if (!link) return;
      if (ov.hidden || ov.deleted) { link.style.display = 'none'; return; }
      link.style.display = '';
      if (ov.name && link.firstChild && link.firstChild.nodeType === 3) link.firstChild.nodeValue = ov.name + ' ';
    });
    Object.keys(dirty).forEach(function (k) { reorderPanel(dirty[k]); });
  }

  /* Ordena los links de un panel del menú sólo si el orden cambió. */
  function reorderPanel(panel) {
    var all = panel.querySelector('.zt-dd-all');
    var links = Array.prototype.filter.call(panel.querySelectorAll('a'), function (l) {
      return !l.classList.contains('zt-dd-all') && l.style.display !== 'none';
    });
    var want = links.slice().sort(function (x, y) {
      var px = x.hasAttribute('data-zt-navc') ? (+x.getAttribute('data-zt-pos') || 0) : links.indexOf(x);
      var py = y.hasAttribute('data-zt-navc') ? (+y.getAttribute('data-zt-pos') || 0) : links.indexOf(y);
      if (px === py) return links.indexOf(x) - links.indexOf(y);
      return px - py;
    });
    var same = want.every(function (el, i) { return el === links[i]; });
    if (same) return;
    var frag = document.createDocumentFragment();
    want.forEach(function (el) { frag.appendChild(el); });
    if (all) panel.insertBefore(frag, all); else panel.appendChild(frag);
  }

  function registerCompareCustoms(db) {
    var C = window.ZT_CATALOG;
    if (!C) return;
    var cat = db.catalog || {};
    Object.keys(cat).forEach(function (id) {
      var o = cat[id] || {};
      if (!o.custom || o.deleted || o.cat === 'Accesorios') return;
      var isTv = o.cat === 'Smart TV';
      var storage = parseInt(String(o.spec || '').replace(/[^0-9]/g, ''), 10);
      C[id] = {
        cat: isTv ? 'tv' : 'phone',
        name: o.name || 'Producto', usd: o.usd || 0,
        screen: null, panel: null, chip: null, ram: null,
        storage: (!isTv && storage) ? storage : null,
        resolution: null, camera: null, battery: null
      };
    });
  }

  /* Inicio: cada categoría muestra sus 3 productos más caros, de mayor a menor.
     Sólo se tocan 'order' y un atributo (el CSS hace el resto) para no chocar
     con el renderizado de la página. */
  /* Todas las grillas de listado se ordenan de más caro a más barato.
     Se usa 'order' para no reescribir el DOM de la página. */
  function sortGridsByPrice() {
    var sel = '[data-appl-card],[data-cat-card],[data-cc-card],[data-zt-custom]';
    var grids = [];
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (k) {
      var g = k.parentElement;
      if (!g) return;
      if (g.closest && g.closest('#novedades')) return;
      if (g.hasAttribute && g.hasAttribute('data-nv-grid')) return;
      if (grids.indexOf(g) === -1) grids.push(g);
    });
    grids.forEach(function (grid) {
      var cards = Array.prototype.filter.call(grid.children, function (k) {
        return k.nodeType === 1 && k.matches && k.matches(sel);
      });
      if (cards.length < 2) return;
      cards.forEach(function (k) {
        var m = (k.textContent || '').match(/USD\s*([\d.,]+)/);
        var n = m ? parseInt(m[1].replace(/[^0-9]/g, ''), 10) : 0;
        k.setAttribute('data-zt-usd', isNaN(n) ? 0 : n);
      });
      cards.sort(function (a, b) {
        return (+b.getAttribute('data-zt-usd') || 0) - (+a.getAttribute('data-zt-usd') || 0);
      });
      cards.forEach(function (k, i) { k.style.order = i; });
    });
  }

  function capNovedades() {
    if (!document.getElementById('novedades')) return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-nv-grid]'), function (grid) {
      var cards = Array.prototype.filter.call(grid.children, function (k) {
        return k.nodeType === 1 && k.hasAttribute && k.hasAttribute('data-nv-card');
      });
      cards.forEach(function (k) {
        var m = (k.textContent || '').match(/USD\s*([\d.,]+)/);
        var n = m ? parseInt(m[1].replace(/[^0-9]/g, ''), 10) : 0;
        k.setAttribute('data-zt-usd', isNaN(n) ? 0 : n);
      });
      cards.sort(function (a, b) {
        return (+b.getAttribute('data-zt-usd') || 0) - (+a.getAttribute('data-zt-usd') || 0);
      });
      cards.forEach(function (k, i) {
        k.style.order = i;
        if (i < 3) k.removeAttribute('data-zt-navcap');
        else k.setAttribute('data-zt-navcap', '1');
      });
    });
  }

  /* Recorta el fondo blanco de una foto (relleno desde los bordes, sin tocar
     los blancos internos del producto). Devuelve null si no se puede leer. */
  var _cutCache = {};
  function cutoutWhite(src, cb) {
    if (_cutCache[src] !== undefined) { cb(_cutCache[src]); return; }
    var im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = function () {
      try {
        var w = im.naturalWidth, hh = im.naturalHeight;
        if (!w || !hh) { cb(null); return; }
        var c = document.createElement('canvas');
        c.width = w; c.height = hh;
        var ctx = c.getContext('2d');
        ctx.drawImage(im, 0, 0);
        var d = ctx.getImageData(0, 0, w, hh);
        var px = d.data, seen = new Uint8Array(w * hh), stack = [];
        function isWhite(i) { var o = i * 4; return px[o] > 232 && px[o + 1] > 232 && px[o + 2] > 232; }
        for (var x = 0; x < w; x++) { stack.push(x); stack.push((hh - 1) * w + x); }
        for (var y = 0; y < hh; y++) { stack.push(y * w); stack.push(y * w + w - 1); }
        while (stack.length) {
          var i = stack.pop();
          if (i < 0 || i >= w * hh || seen[i]) continue;
          seen[i] = 1;
          if (!isWhite(i)) continue;
          px[i * 4 + 3] = 0;
          var cx = i % w;
          if (cx > 0) stack.push(i - 1);
          if (cx < w - 1) stack.push(i + 1);
          stack.push(i - w); stack.push(i + w);
        }
        ctx.putImageData(d, 0, 0);
        var out = c.toDataURL('image/png');
        _cutCache[src] = out;
        cb(out);
      } catch (e) { _cutCache[src] = null; cb(null); }
    };
    im.onerror = function () { _cutCache[src] = null; cb(null); };
    im.src = src;
  }

  /* Slide PS5 del carrusel: toma foto y link del producto real del catálogo. */
  function fillCarouselPs5(cat) {
    var slide = document.querySelector('[data-ztc-ps5]');
    if (!slide) return;
    var found = null, foundId = null;
    Object.keys(cat || {}).forEach(function (id) {
      var ov = cat[id] || {};
      if (found || ov.hidden || ov.deleted) return;
      var nm = (ov.name || '').toLowerCase().replace(/\s+/g, '');
      if (nm.indexOf('ps5') >= 0 || nm.indexOf('playstation5') >= 0) { found = ov; foundId = id; }
    });
    if (!found) return;
    var href = found.custom ? detailHrefFor(found.cat, foundId) : 'Accesorios ZonaTech.dc.html';
    Array.prototype.forEach.call(slide.querySelectorAll('[data-ztc-ps5-link]'), function (a) { a.href = href; });
    var img = slide.querySelector('[data-ztc-ps5-img]');
    var slot = slide.querySelector('[data-ztc-ps5-slot]');
    if (found.photo && img) {
      if (img.getAttribute('data-zt-srcref') !== found.photo) {
        img.setAttribute('data-zt-srcref', found.photo);
        img.src = found.photo;
        cutoutWhite(found.photo, function (url) { if (url) img.src = url; else img.style.mixBlendMode = 'multiply'; });
      }
      img.style.display = 'block';
      img.style.filter = 'drop-shadow(0 24px 34px rgba(20,20,22,.16)) drop-shadow(0 4px 8px rgba(20,20,22,.07))';
      if (slot) slot.style.display = 'none';
    }
  }

  var ZT_TOUCHED = 0;
  function apply(db) {
    if (!db) return;
    updateNav(db);
    var cat = db.catalog || {};
    var st = db.settings || {};
    var rate = st.rate || 1520;
    registerCompareCustoms(db);
    Object.keys(cat).forEach(function (id) {
      var ov = cat[id] || {};
      if (ov.custom) { injectCustomCard(id, ov, rate); return; }
      var slot = null;
      ['apple-' + id, 'and-' + id, 'acc-' + id, id].some(function (sid) {
        var el = document.getElementById(sid);
        if (el && el.tagName && el.tagName.toLowerCase() === 'image-slot') { slot = el; return true; }
        return false;
      });
      if (!slot) return;
      var card = findCard(slot);
      if (!card) return;
      ZT_TOUCHED++;
      if (ov.hidden) {
        if (card.style.display !== 'none') card.setAttribute('data-zt-disp', card.style.display || '');
        card.style.display = 'none';
        return;
      }
      if (card.style.display === 'none') card.style.display = card.getAttribute('data-zt-disp') || '';
      if (ov.usd) setPrices(card, ov.usd, rate);
      if (ov.sinStock) markSinStock(card);
      else {
        var chip = card.querySelector('[data-zt-nostock]');
        if (chip) { chip.remove(); card.style.opacity = ''; }
      }
      if (ov.photo) setPhoto(slot, ov.photo);
    });
    fillCarouselPs5(cat);
    injectCustomDetail(db, rate);
    injectRecCards(db, rate);
    resyncArs(rate);
    stampArs(rate);
    stampAhorro(cat);
    stampUltimas(db);
    enhanceRecCarousels();
    capNovedades();
    sortGridsByPrice();
    scheduleOrphans();
    // portada (carrusel)
    var track = document.getElementById('ztc-track');
    if (track && st.hero) {
      var hrefs = { apple: 'Apple ZonaTech.dc.html', celulares: 'Android ZonaTech.dc.html', tv: 'Smart TV ZonaTech.dc.html', accesorios: 'Accesorios ZonaTech.dc.html' };
      var slides = track.querySelectorAll('.ztc-slide');
      st.hero.forEach(function (h, i) {
        var sl = slides[i];
        if (!sl || !h) return;
        var h2 = sl.querySelector('h2');
        if (h2 && h.t) h2.textContent = h.t;
        var ps = sl.querySelectorAll('.ztc-text > p');
        if (ps.length && h.s) {
          ps[ps.length - 1].textContent = h.s;
          for (var pi = 0; pi < ps.length - 1; pi++) {
            if ((ps[pi].textContent || '').trim() === String(h.s).trim()) ps[pi].style.setProperty('display', 'none', 'important');
          }
        }
        var href = null;
        if (h.dest && String(h.dest).indexOf('prod:') === 0) {
          var dp = String(h.dest).split(':');
          var did = dp[1];
          while (did.indexOf('tv-tv-') === 0) did = did.slice(3);
          while (did.indexOf('and-and-') === 0) did = did.slice(4);
          href = detailHrefFor(dp.slice(2).join(':'), did);
        } else if (h.dest && hrefs[h.dest]) href = hrefs[h.dest];
        if (href) sl.querySelectorAll('a').forEach(function (a) { a.setAttribute('href', href); });
      });
    }
    // si el título de una diapositiva coincide con un producto del catálogo, Comprar/Más info van directo a su tarjeta
    if (track) {
      var pagesH = { Apple: 'Apple ZonaTech.dc.html', Accesorios: 'Accesorios ZonaTech.dc.html', Celulares: 'Android ZonaTech.dc.html', 'Smart TV': 'Smart TV ZonaTech.dc.html' };
      Array.prototype.forEach.call(track.querySelectorAll('.ztc-slide'), function (sl, si) {
        if (st.hero && st.hero[si] && String(st.hero[si].dest || '').indexOf('prod:') === 0) return;
        var h2b = sl.querySelector('h2');
        var t = h2b ? (h2b.textContent || '').trim().toLowerCase() : '';
        if (!t) return;
        var hit = null;
        Object.keys(cat).forEach(function (id) {
          var o = cat[id] || {};
          if (o.custom && !o.hidden && !o.deleted && String(o.name || '').trim().toLowerCase() === t) hit = { id: id, cat: o.cat };
        });
        if (!hit) return;
        var hrefP = detailHrefFor(hit.cat, hit.id);
        sl.querySelectorAll('a').forEach(function (a) { a.setAttribute('href', hrefP); });
      });
    }
    scrollToHash();
  }

  var hashScrolled = false;
  function scrollToHash() {
    if (hashScrolled) return;
    var h = location.hash;
    if (!h || h.indexOf('#zt-custom-') !== 0) return;
    var el = document.getElementById(h.slice(1));
    if (!el) return;
    hashScrolled = true;
    var y = el.getBoundingClientRect().top + window.pageYOffset - 90;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  /* Si una grilla deja 1 sola tarjeta en la última fila, pasa a fila
     deslizable con flecha para que no quede suelta. */
  function fixOrphanRows() {
    var cards = document.querySelectorAll('a.cat-card, [data-appl-card], [data-zt-custom]');
    var grids = [];
    Array.prototype.forEach.call(cards, function (c) {
      var g = c.parentElement;
      if (g && grids.indexOf(g) === -1 && g.getAttribute('data-zt-carousel') !== 'wrap') grids.push(g);
    });
    grids.forEach(function (grid) {
      if (!grid.getAttribute('data-zt-orig')) grid.setAttribute('data-zt-orig', grid.style.cssText);
      var wrapEl = grid.parentElement && grid.parentElement.getAttribute('data-zt-carousel') === 'wrap' ? grid.parentElement : null;
      // restore to measure
      grid.style.cssText = grid.getAttribute('data-zt-orig');
      Array.prototype.forEach.call(grid.children, function (ch) { ch.style.flex = ''; ch.style.minWidth = ''; ch.style.maxWidth = ''; });
      if (wrapEl) { var arr = wrapEl.querySelector('[data-zt-car-arrow]'); if (arr) arr.style.display = 'none'; }
      var cs = getComputedStyle(grid);
      if (cs.display !== 'grid') return;
      var cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
      var n = Array.prototype.filter.call(grid.children, function (ch) { return ch.offsetParent !== null || ch.style.display !== 'none'; }).length;
      if (!(cols > 1 && n > cols && n % cols === 1)) return;
      // carousel mode
      var gap = parseFloat(cs.columnGap) || 20;
      grid.style.display = 'flex';
      grid.style.gap = gap + 'px';
      grid.style.overflowX = 'auto';
      grid.style.scrollSnapType = 'x mandatory';
      grid.style.scrollbarWidth = 'none';
      grid.style.paddingBottom = '6px';
      Array.prototype.forEach.call(grid.children, function (ch) {
        ch.style.flex = '0 0 calc((100% - ' + (gap * (cols - 1)) + 'px)/' + cols + ')';
        ch.style.scrollSnapAlign = 'start';
      });
      if (!wrapEl) {
        wrapEl = document.createElement('div');
        wrapEl.setAttribute('data-zt-carousel', 'wrap');
        wrapEl.style.cssText = 'position:relative;';
        grid.parentElement.insertBefore(wrapEl, grid);
        wrapEl.appendChild(grid);
      }
      var arrow = wrapEl.querySelector('[data-zt-car-arrow]');
      if (!arrow) {
        arrow = document.createElement('button');
        arrow.setAttribute('data-zt-car-arrow', '');
        arrow.setAttribute('aria-label', 'Ver más');
        arrow.style.cssText = 'position:absolute;top:50%;right:-8px;transform:translateY(-50%);width:46px;height:46px;border-radius:50%;border:none;background:rgba(255,255,255,.92);box-shadow:0 10px 30px -8px rgba(0,0,0,.25),0 2px 6px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:4;transition:transform .25s, box-shadow .25s;';
        arrow.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>';
        arrow.addEventListener('mouseenter', function () { arrow.style.transform = 'translateY(-50%) scale(1.08)'; });
        arrow.addEventListener('mouseleave', function () { arrow.style.transform = 'translateY(-50%)'; });
        arrow.addEventListener('click', function () {
          var card = grid.children[0];
          var step = card ? card.getBoundingClientRect().width + 20 : 260;
          var max = grid.scrollWidth - grid.clientWidth;
          grid.scrollTo({ left: grid.scrollLeft >= max - 10 ? 0 : grid.scrollLeft + step, behavior: 'smooth' });
        });
        wrapEl.appendChild(arrow);
        var updDir = function () {
          var max = grid.scrollWidth - grid.clientWidth;
          arrow.firstChild.style.transform = grid.scrollLeft >= max - 10 ? 'rotate(180deg)' : '';
        };
        grid.addEventListener('scroll', updDir, { passive: true });
      }
      arrow.style.display = 'flex';
    });
  }
  var orphT = null;
  function scheduleOrphans() { clearTimeout(orphT); orphT = setTimeout(fixOrphanRows, 250); }
  window.addEventListener('resize', scheduleOrphans);

  function productIdFromUrl() {
    try {
      var q = new URLSearchParams(location.search);
      return q.get('m') || q.get('id') || null;
    } catch (e) { return null; }
  }

  var counted = false;
  function countVisit(db, remoteOk) {
    var pid = productIdFromUrl();
    if (!pid || counted || !db) return;
    counted = true;
    db.stats = db.stats || {};
    db.stats[pid] = (db.stats[pid] || 0) + 1;
    try { localStorage.setItem(LS, JSON.stringify(db)); } catch (e) {}
    if (remoteOk) pushRemote(db);
  }

  /* Hover igual al de las tarjetas nativas, para todo producto inyectado
     (presente y futuro). */
  (function ztHoverStyle() {
    if (document.getElementById('zt-hover-style')) return;
    var st = document.createElement('style');
    st.id = 'zt-hover-style';
    st.textContent = '[data-zt-custom]{transition:box-shadow .4s, transform .4s;will-change:transform}' +
      '[data-zt-custom]:hover{box-shadow:0 26px 64px -20px rgba(0,0,0,.22), 0 4px 10px rgba(0,0,0,.05) !important;transform:translateY(-4px)}' +
      '[data-zt-reccustom]{transition:box-shadow .4s, transform .4s;will-change:transform}' +
      '[data-zt-reccustom]:hover{box-shadow:0 22px 54px -20px rgba(0,0,0,.2) !important;transform:translateY(-3px)}';
    (document.head || document.documentElement).appendChild(st);
  })();

  var local = getLocal();

  /* Anti-parpadeo: si hay catálogo en caché, la página queda oculta hasta el
     primer apply() para que nunca se vea el catálogo viejo del HTML. */
  if (local) {
    var bootHide = document.createElement('style');
    bootHide.id = 'zt-boot-hide';
    bootHide.textContent = 'body{visibility:hidden !important}';
    (document.head || document.documentElement).appendChild(bootHide);
  }
  function revealPage() {
    var b = document.getElementById('zt-boot-hide');
    if (b) b.remove();
  }
  /* La página es un DC: el HTML sigue pintándose después de DOMContentLoaded,
     así que reaplicamos en cada mutación y sólo revelamos cuando ya tocamos
     tarjetas reales (o al vencer la red de seguridad). */
  function firstApply() {
    try { apply(local); scheduleOrphans(); } catch (e) {}
    if (ZT_TOUCHED > 0 || !document.querySelector('image-slot')) revealPage();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', firstApply);
  else firstApply();
  try {
    var ztMo = new MutationObserver(function () {
      if (ztMoT) return;
      ztMoT = setTimeout(function () { ztMoT = null; firstApply(); }, 40);
    });
    var ztMoT = null;
    ztMo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { ztMo.disconnect(); }, 6000);
  } catch (e) {}
  // Red de seguridad: pase lo que pase, la página se muestra como máximo a los 2.5s.
  setTimeout(revealPage, 2500);

  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    apply(local);
    scheduleOrphans();
    if (tries > 25) clearInterval(iv);
  }, 800);
  fetchRemote(function (db, ok) {
    if (db) { local = db; apply(db); }
    countVisit(db || local, ok);
  });

  /* ===== Búsqueda global (lupa) ===== */
  var ZT_SEARCH_INDEX = [{"n":"iPhone 13","h":"Producto ZonaTech.dc.html?m=iphone13","s":"iPhone · USD 400"},{"n":"iPhone 15","h":"Producto ZonaTech.dc.html?m=iphone15","s":"iPhone · USD 500"},{"n":"iPhone 16 Pro","h":"Producto ZonaTech.dc.html?m=iphone16pro","s":"iPhone · USD 820"},{"n":"AirPods Max","h":"Producto ZonaTech.dc.html?m=airpodsmax","s":"Accesorio Apple · USD 350"},{"n":"iPad 11ª gen","h":"Producto ZonaTech.dc.html?m=ipad11","s":"Accesorio Apple · USD 519"},{"n":"Samsung A07","h":"Producto Android.dc.html?id=and-samsung-a07","s":"Celular · 128 GB · 4 GB · USD 186"},{"n":"Samsung A17","h":"Producto Android.dc.html?id=and-samsung-a17","s":"Celular · 128 GB · 4 GB · USD 259"},{"n":"Samsung A26 5G","h":"Producto Android.dc.html?id=and-samsung-a26","s":"Celular · 256 GB · 8 GB · USD 393"},{"n":"Samsung A36 5G","h":"Producto Android.dc.html?id=and-samsung-a36","s":"Celular · 256 GB · 8 GB · USD 434"},{"n":"Redmi A5","h":"Producto Android.dc.html?id=and-redmi-a5","s":"Celular · 128 GB · 4 GB · USD 186"},{"n":"Xiaomi 15c","h":"Producto Android.dc.html?id=and-xiaomi-15c-4","s":"Celular · 256 GB · 4 GB · USD 205"},{"n":"Xiaomi 15c","h":"Producto Android.dc.html?id=and-xiaomi-15c-8","s":"Celular · 256 GB · 8 GB · USD 229"},{"n":"Xiaomi Note 14","h":"Producto Android.dc.html?id=and-xiaomi-note14","s":"Celular · 256 GB · 8 GB · USD 252"},{"n":"Xiaomi Note 14 Pro 5G","h":"Producto Android.dc.html?id=and-xiaomi-note14pro","s":"Celular · 256 GB · 8 GB · USD 381"},{"n":"Xiaomi Note 15","h":"Producto Android.dc.html?id=and-xiaomi-note15-128","s":"Celular · 128 GB · 6 GB · USD 252"},{"n":"Xiaomi Note 15","h":"Producto Android.dc.html?id=and-xiaomi-note15-256","s":"Celular · 256 GB · 8 GB · USD 300"},{"n":"Xiaomi Note 15 5G","h":"Producto Android.dc.html?id=and-xiaomi-note15-5g","s":"Celular · 256 GB · 8 GB · USD 355"},{"n":"Xiaomi Note 15 Pro","h":"Producto Android.dc.html?id=and-xiaomi-note15pro","s":"Celular · 512 GB · 12 GB · USD 435"},{"n":"Xiaomi Note 15 Pro Plus 5G","h":"Producto Android.dc.html?id=and-xiaomi-note15proplus","s":"Celular · 512 GB · 12 GB · USD 573"},{"n":"Poco C71","h":"Producto Android.dc.html?id=and-poco-c71-64","s":"Celular · 64 GB · 3 GB · USD 152"},{"n":"Poco C71","h":"Producto Android.dc.html?id=and-poco-c71-128","s":"Celular · 128 GB · 4 GB · USD 173"},{"n":"Poco C85","h":"Producto Android.dc.html?id=and-poco-c85","s":"Celular · 256 GB · 8 GB · USD 230"},{"n":"Poco X7 Pro 5G","h":"Producto Android.dc.html?id=and-poco-x7pro-256","s":"Celular · 256 GB · 12 GB · USD 420"},{"n":"Poco X7 Pro 5G","h":"Producto Android.dc.html?id=and-poco-x7pro-512","s":"Celular · 512 GB · 12 GB · USD 507"},{"n":"Motorola G06","h":"Producto Android.dc.html?id=and-moto-g06","s":"Celular · 128 GB · 4 GB · USD 180"},{"n":"Motorola G15","h":"Producto Android.dc.html?id=and-moto-g15","s":"Celular · 256 GB · 4 GB · USD 241"},{"n":"Infinix Smart 10","h":"Producto Android.dc.html?id=and-infinix-smart10","s":"Celular · 128 GB · 4 GB · USD 176"},{"n":"Infinix Hot 60i","h":"Producto Android.dc.html?id=and-infinix-hot60i-4","s":"Celular · 256 GB · 4 GB · USD 214"},{"n":"Infinix Hot 60i","h":"Producto Android.dc.html?id=and-infinix-hot60i-8","s":"Celular · 256 GB · 8 GB · USD 239"},{"n":"Infinix Hot 60 Pro","h":"Producto Android.dc.html?id=and-infinix-hot60pro","s":"Celular · 256 GB · 8 GB · USD 300"},{"n":"Infinix Hot 60 Pro Plus","h":"Producto Android.dc.html?id=and-infinix-hot60proplus","s":"Celular · 256 GB · 8 GB · USD 316"},{"n":"Smart TV EcoPower","h":"Producto Smart TV.dc.html?id=tv-ecopower","s":"Smart TV · 32\" · Full HD · USD 182"},{"n":"Smart TV RCA 40\"","h":"Producto Smart TV.dc.html?id=tv-rca-40","s":"Smart TV · 40\" · Full HD · USD 300"},{"n":"Smart TV Philco 58\"","h":"Producto Smart TV.dc.html?id=tv-philco-58","s":"Smart TV · 58\" · Ultra HD (4K) · USD 490"}];
  function ztBuildIndex() {
    var list = ZT_SEARCH_INDEX.slice();
    try {
      var db = getLocal();
      var cat = (db && db.catalog) || {};
      Object.keys(cat).forEach(function (id) {
        var o = cat[id];
        if (!o || o.deleted || o.hidden || !o.custom || !o.name) return;
        list.push({ n: o.name, h: detailHrefFor(o.cat || '', id), s: (o.cat || 'Producto') + (o.usd ? ' · USD ' + o.usd : '') });
      });
    } catch (e) {}
    return list;
  }
  function ztOpenSearch() {
    if (document.getElementById('zt-search-ov')) { document.getElementById('zt-search-input').focus(); return; }
    var idx = ztBuildIndex();
    var ov = document.createElement('div');
    ov.id = 'zt-search-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(13,13,14,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;padding:14vh 16px 16px;animation:ztFadeIn .2s ease;';
    var box = document.createElement('div');
    box.style.cssText = 'width:100%;max-width:620px;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 40px 90px -30px rgba(0,0,0,.6);display:flex;flex-direction:column;max-height:72vh;';
    var head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid rgba(0,0,0,.07);';
    head.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#86868B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.3-4.3"></path></svg>';
    var input = document.createElement('input');
    input.id = 'zt-search-input';
    input.placeholder = 'Buscá tu equipo…';
    input.style.cssText = 'flex:1;border:none;outline:none;font-family:inherit;font-size:18px;color:#1D1D1F;background:transparent;';
    var close = document.createElement('button');
    close.setAttribute('aria-label', 'Cerrar');
    close.style.cssText = 'border:none;background:#F2F2F2;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:17px;color:#6E6E73;line-height:1;flex-shrink:0;';
    close.textContent = '\u00d7';
    head.appendChild(input); head.appendChild(close);
    var results = document.createElement('div');
    results.style.cssText = 'overflow-y:auto;padding:6px;';
    box.appendChild(head); box.appendChild(results); ov.appendChild(box);
    document.body.appendChild(ov);
    function render(q) {
      q = (q || '').trim().toLowerCase();
      if (!q) { results.innerHTML = '<div style="padding:30px;text-align:center;color:#C9C6C0;font-size:14px;">Escrib\u00ed para buscar tu equipo</div>'; return; }
      var matches = idx.filter(function (it) { return (it.n + ' ' + it.s).toLowerCase().indexOf(q) >= 0; });
      if (!matches.length) { results.innerHTML = '<div style="padding:26px;text-align:center;color:#A1A1A6;font-size:14.5px;">Sin resultados para \u201c' + q + '\u201d</div>'; return; }
      results.innerHTML = '';
      matches.slice(0, 30).forEach(function (it) {
        var a = document.createElement('a');
        a.href = it.h;
        a.style.cssText = 'display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:14px;text-decoration:none;color:#1D1D1F;transition:background .15s;';
        a.onmouseenter = function () { a.style.background = '#F5F5F4'; };
        a.onmouseleave = function () { a.style.background = 'transparent'; };
        a.innerHTML = '<span style="width:36px;height:36px;border-radius:10px;background:#F4F1EC;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:#C9502A;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></span>' +
          '<span style="display:flex;flex-direction:column;gap:1px;min-width:0;"><span style="font-size:15.5px;font-weight:600;letter-spacing:-.01em;">' + it.n + '</span><span style="font-size:12.5px;color:#86868B;">' + it.s + '</span></span>';
        results.appendChild(a);
      });
    }
    render('');
    input.addEventListener('input', function () { render(input.value); });
    function shut() { ov.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') shut(); }
    close.addEventListener('click', shut);
    ov.addEventListener('click', function (e) { if (e.target === ov) shut(); });
    document.addEventListener('keydown', onKey);
    setTimeout(function () { input.focus(); }, 40);
  }
  (function(){ if(document.getElementById('zt-search-style')) return; var s=document.createElement('style'); s.id='zt-search-style'; s.textContent='@keyframes ztFadeIn{from{opacity:0}to{opacity:1}}'; (document.head||document.documentElement).appendChild(s); })();
  window.ztOpenSearch = ztOpenSearch;
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.zt-search-btn');
    if (b) { e.preventDefault(); ztOpenSearch(); }
  });


})();
