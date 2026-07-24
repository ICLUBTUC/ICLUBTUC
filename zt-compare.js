/* ZonaTech · Comparador de equipos
   Módulo compartido, autoinicializable. Cada página de producto sólo debe:
   1) cargar este script en el <helmet>
   2) tener botones con  data-compare="<id>"  junto a Agregar/Comprar
   La ficha técnica vive acá (oculta) y sólo se muestra dentro del comparador. */
(function () {
  if (window.__ztCompareLoaded) return;
  window.__ztCompareLoaded = true;

  var RATE = 1520;
  var KEY = 'zt_compare';
  var MAX = 4;

  // ---- Ficha técnica (oculta) --------------------------------------------
  // better: 'higher' | 'lower' | null(texto, sin ganador)
  function phone(name, usd, extra) {
    return Object.assign({ cat: 'phone', name: name, usd: usd,
      screen: null, panel: null, chip: null, ram: null, storage: null,
      camera: null, battery: null }, extra || {});
  }
  var CATALOG = {
    // iPhone — specs reales
    'iphone13':    phone('iPhone 13', 400,     { screen:6.1, panel:'OLED Super Retina XDR', chip:'A15 Bionic', ram:4, storage:128, camera:12, battery:3240 }),
    'iphone15':    phone('iPhone 15', 500,     { screen:6.1, panel:'OLED Super Retina XDR', chip:'A16 Bionic', ram:6, storage:128, camera:48, battery:3349 }),
    'iphone16pro': phone('iPhone 16 Pro', 820, { screen:6.3, panel:'OLED ProMotion 120Hz', chip:'A18 Pro', ram:8, storage:128, camera:48, battery:3582 }),

    // Celulares — datos base (cámara/batería a confirmar)
    'and-samsung-a07':          phone('Samsung A07', 186,             { storage:128, ram:4 }),
    'and-samsung-a17':          phone('Samsung A17', 259,             { storage:128, ram:4 }),
    'and-samsung-a26':          phone('Samsung A26 5G', 393,          { storage:256, ram:8 }),
    'and-samsung-a36':          phone('Samsung A36 5G', 434,          { storage:256, ram:8 }),
    'and-redmi-a5':             phone('Redmi A5', 186,                { storage:128, ram:4 }),
    'and-xiaomi-15c-4':         phone('Xiaomi 15c', 205,              { storage:256, ram:4 }),
    'and-xiaomi-15c-8':         phone('Xiaomi 15c', 229,              { storage:256, ram:8 }),
    'and-xiaomi-note14':        phone('Xiaomi Note 14', 252,          { storage:256, ram:8 }),
    'and-xiaomi-note14pro':     phone('Xiaomi Note 14 Pro 5G', 381,   { storage:256, ram:8 }),
    'and-xiaomi-note15-128':    phone('Xiaomi Note 15', 252,          { storage:128, ram:6 }),
    'and-xiaomi-note15-256':    phone('Xiaomi Note 15', 300,          { storage:256, ram:8 }),
    'and-xiaomi-note15-5g':     phone('Xiaomi Note 15 5G', 355,       { storage:256, ram:8 }),
    'and-xiaomi-note15pro':     phone('Xiaomi Note 15 Pro', 435,      { storage:512, ram:12 }),
    'and-xiaomi-note15proplus': phone('Xiaomi Note 15 Pro Plus 5G', 573, { storage:512, ram:12 }),
    'and-poco-c71-64':          phone('Poco C71', 152,                { storage:64,  ram:3 }),
    'and-poco-c71-128':         phone('Poco C71', 173,                { storage:128, ram:4 }),
    'and-poco-c85':             phone('Poco C85', 230,                { storage:256, ram:8 }),
    'and-poco-x7pro-256':       phone('Poco X7 Pro 5G', 420,          { storage:256, ram:12 }),
    'and-poco-x7pro-512':       phone('Poco X7 Pro 5G', 507,          { storage:512, ram:12 }),
    'and-moto-g06':             phone('Motorola G06', 180,            { storage:128, ram:4 }),
    'and-moto-g15':             phone('Motorola G15', 241,            { storage:256, ram:4 }),
    'and-infinix-smart10':      phone('Infinix Smart 10', 176,        { storage:128, ram:4 }),
    'and-infinix-hot60i-4':     phone('Infinix Hot 60i', 214,         { storage:256, ram:4 }),
    'and-infinix-hot60i-8':     phone('Infinix Hot 60i', 239,         { storage:256, ram:8 }),
    'and-infinix-hot60pro':     phone('Infinix Hot 60 Pro', 300,      { storage:256, ram:8 }),
    'and-infinix-hot60proplus': phone('Infinix Hot 60 Pro Plus', 316, { storage:256, ram:8 }),

    // Smart TV
    'tv-ecopower':  { cat:'tv', name:'Smart TV EcoPower', usd:182, screen:32, resolution:'Full HD' },
    'tv-rca-40':    { cat:'tv', name:'Smart TV RCA 40"',  usd:300, screen:40, resolution:'Full HD' },
    'tv-philco-58': { cat:'tv', name:'Smart TV Philco 58"', usd:490, screen:58, resolution:'Ultra HD (4K)' }
  };
  window.ZT_CATALOG = CATALOG;

  var PHONE_ROWS = [
    { key:'screen',  label:'Pantalla',       fmt:function(v){return v+'"';},                 better:'higher' },
    { key:'panel',   label:'Tipo de pantalla', fmt:function(v){return v;},                   better:null },
    { key:'chip',    label:'Procesador',     fmt:function(v){return v;},                      better:null },
    { key:'ram',     label:'Memoria RAM',    fmt:function(v){return v+' GB';},                better:'higher' },
    { key:'storage', label:'Almacenamiento', fmt:function(v){return v+' GB';},                better:'higher' },
    { key:'camera',  label:'Cámara principal', fmt:function(v){return v+' MP';},              better:'higher' },
    { key:'battery', label:'Batería',        fmt:function(v){return v.toLocaleString('es-AR')+' mAh';}, better:'higher' },
    { key:'usd',     label:'Precio',         fmt:function(v){return money(v);},               better:'lower' }
  ];
  var TV_ROWS = [
    { key:'screen',     label:'Pantalla',   fmt:function(v){return v+'"';},   better:'higher' },
    { key:'resolution', label:'Resolución', fmt:function(v){return v;},       better:null },
    { key:'usd',        label:'Precio',     fmt:function(v){return money(v);}, better:'lower' }
  ];

  function money(usd) {
    var cur = 'USD';
    try { cur = localStorage.getItem('zt_cur') || 'USD'; } catch (e) {}
    return cur === 'ARS'
      ? 'ARS ' + Math.round(usd * RATE).toLocaleString('es-AR')
      : 'USD ' + usd.toLocaleString('es-AR');
  }

  // ---- Estado (localStorage compartido) ----------------------------------
  function load() {
    try { var r = localStorage.getItem(KEY); var a = r ? JSON.parse(r) : []; return a.filter(function (id) { return CATALOG[id]; }); }
    catch (e) { return []; }
  }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  var sel = load();

  function toggle(id) {
    if (!CATALOG[id]) return;
    var i = sel.indexOf(id);
    if (i >= 0) sel.splice(i, 1);
    else { if (sel.length >= MAX) { flashBar(); return; } sel.push(id); }
    save(sel); syncButtons(); renderBar();
  }
  function remove(id) { var i = sel.indexOf(id); if (i >= 0) { sel.splice(i, 1); save(sel); syncButtons(); renderBar(); } }
  function clearAll() { sel = []; save(sel); syncButtons(); renderBar(); }

  // ---- Botones de las páginas -------------------------------------------
  function syncButtons() {
    var btns = document.querySelectorAll('[data-compare]');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i], on = sel.indexOf(b.getAttribute('data-compare')) >= 0;
      b.style.background = on ? '#C9502A' : '#fff';
      b.style.borderColor = on ? '#C9502A' : 'rgba(0,0,0,.16)';
      b.style.color = on ? '#fff' : '#1D1D1F';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  // ---- Barra flotante ----------------------------------------------------
  var bar, barInner;
  function ensureBar() {
    if (bar) return;
    bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:70;display:flex;justify-content:center;padding:0 16px 18px;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,\'SF Pro Text\',\'Segoe UI\',Roboto,sans-serif;';
    barInner = document.createElement('div');
    barInner.style.cssText = 'pointer-events:auto;max-width:760px;width:100%;box-sizing:border-box;background:rgba(255,255,255,.9);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border:1px solid rgba(0,0,0,.08);border-radius:20px;box-shadow:0 20px 55px -22px rgba(0,0,0,.4);padding:11px 12px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;transform:translateY(160%);transition:transform .5s cubic-bezier(.22,1,.36,1);';
    bar.appendChild(barInner);
    document.body.appendChild(bar);
  }
  function flashBar() {
    if (!barInner) return;
    barInner.animate([{ transform:'translateY(0) scale(1)' }, { transform:'translateY(0) scale(1.02)' }, { transform:'translateY(0) scale(1)' }], { duration:280 });
  }
  function chip(id) {
    var p = CATALOG[id];
    return '<span style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;background:#F4F1EC;border:1px solid rgba(0,0,0,.06);border-radius:980px;padding:6px 7px 6px 12px;font-size:13px;font-weight:600;color:#1D1D1F;white-space:nowrap;">' +
      esc(p.name) +
      '<button data-cmp-rm="' + id + '" aria-label="Quitar" style="width:19px;height:19px;flex-shrink:0;border:none;border-radius:50%;background:rgba(0,0,0,.08);color:#1D1D1F;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:13px;line-height:1;padding:0;">×</button></span>';
  }
  function renderBar() {
    ensureBar();
    if (!sel.length) { barInner.style.transform = 'translateY(160%)'; return; }
    var canGo = sel.length >= 2;
    var chips = sel.map(chip).join('');
    barInner.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;flex:1 1 180px;min-width:0;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;">' +
        '<span style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;color:#C9502A;font-size:13px;font-weight:700;letter-spacing:.01em;">' +
          '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z"/></svg>' +
          '<span data-cmp-eyebrow>Comparar</span></span>' +
        chips +
      '</div>' +
      '<div style="flex-shrink:0;display:flex;align-items:center;gap:6px;margin-left:auto;">' +
        '<button data-cmp-clear style="flex-shrink:0;border:none;background:transparent;color:#86868B;cursor:pointer;font-size:13px;font-weight:600;padding:9px 8px;font-family:inherit;">Limpiar</button>' +
        '<button data-cmp-go ' + (canGo ? '' : 'disabled') + ' style="flex-shrink:0;border:none;border-radius:980px;padding:10px 20px;font-family:inherit;font-size:14px;font-weight:600;white-space:nowrap;cursor:' + (canGo ? 'pointer' : 'not-allowed') + ';background:' + (canGo ? '#1D1D1F' : 'rgba(0,0,0,.14)') + ';color:#fff;transition:background .3s;">Comparar' + (canGo ? ' (' + sel.length + ')' : '') + '</button>' +
      '</div>';
    requestAnimationFrame(function () { barInner.style.transform = 'translateY(0)'; });
  }

  // ---- Modal comparador --------------------------------------------------
  function rowsFor(ids) {
    var anyTv = ids.some(function (id) { return CATALOG[id].cat === 'tv'; });
    var anyPhone = ids.some(function (id) { return CATALOG[id].cat === 'phone'; });
    if (anyPhone && !anyTv) return PHONE_ROWS;
    if (anyTv && !anyPhone) return TV_ROWS;
    // mezcla: unir filas (pantalla, resolución/panel, precio + resto)
    return [
      { key:'screen',  label:'Pantalla',       fmt:function(v){return v+'"';}, better:'higher' },
      { key:'resolution', label:'Resolución',  fmt:function(v){return v;},     better:null },
      { key:'ram',     label:'Memoria RAM',    fmt:function(v){return v+' GB';}, better:'higher' },
      { key:'storage', label:'Almacenamiento', fmt:function(v){return v+' GB';}, better:'higher' },
      { key:'camera',  label:'Cámara principal', fmt:function(v){return v+' MP';}, better:'higher' },
      { key:'battery', label:'Batería',        fmt:function(v){return v.toLocaleString('es-AR')+' mAh';}, better:'higher' },
      { key:'usd',     label:'Precio',         fmt:function(v){return money(v);}, better:'lower' }
    ];
  }
  function winners(ids, row) {
    if (!row.better) return {};
    var vals = ids.map(function (id) { var v = CATALOG[id][row.key]; return (typeof v === 'number') ? v : null; });
    var nums = vals.filter(function (v) { return v !== null; });
    if (nums.length < 2) return {};
    var best = row.better === 'higher' ? Math.max.apply(null, nums) : Math.min.apply(null, nums);
    var w = {};
    ids.forEach(function (id, i) { if (vals[i] === best) w[id] = true; });
    return w;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; }); }

  var modal;
  function openModal() {
    if (sel.length < 2) return;
    var ids = sel.slice();
    var rows = rowsFor(ids);
    var col = 'minmax(120px,1fr)';
    var grid = '150px repeat(' + ids.length + ',' + col + ')';

    var head = '<div style="display:grid;grid-template-columns:' + grid + ';gap:0;position:sticky;top:0;background:#fff;z-index:2;border-bottom:1px solid rgba(0,0,0,.08);">' +
      '<div style="padding:20px 16px;"></div>';
    ids.forEach(function (id) {
      var p = CATALOG[id];
      head += '<div style="padding:20px 14px;text-align:center;border-left:1px solid rgba(0,0,0,.06);">' +
        '<div style="font-size:15.5px;font-weight:700;letter-spacing:-.02em;line-height:1.15;">' + esc(p.name) + '</div>' +
        '<div style="font-size:13px;color:#C9502A;font-weight:600;margin-top:5px;">' + money(p.usd) + '</div>' +
        '<button data-cmp-rm="' + id + '" style="margin-top:9px;border:none;background:rgba(0,0,0,.05);color:#86868B;border-radius:980px;font-size:11.5px;font-weight:600;padding:4px 11px;cursor:pointer;font-family:inherit;">Quitar</button>' +
      '</div>';
    });
    head += '</div>';

    var body = '';
    rows.forEach(function (row, ri) {
      var w = winners(ids, row);
      body += '<div style="display:grid;grid-template-columns:' + grid + ';gap:0;border-bottom:1px solid rgba(0,0,0,.06);background:' + (ri % 2 ? '#FAFAF9' : '#fff') + ';">' +
        '<div style="padding:15px 16px;font-size:13.5px;color:#86868B;font-weight:500;display:flex;align-items:center;">' + row.label + '</div>';
      ids.forEach(function (id) {
        var v = CATALOG[id][row.key];
        var has = v !== null && v !== undefined;
        var isW = !!w[id];
        var txt = has ? row.fmt(v) : '<span style="color:#C0C0C4;">A confirmar</span>';
        body += '<div style="padding:15px 14px;border-left:1px solid rgba(0,0,0,.06);text-align:center;font-size:14.5px;font-weight:' + (isW ? '700' : '500') + ';color:' + (isW ? '#1F8A5B' : '#1D1D1F') + ';display:flex;align-items:center;justify-content:center;gap:7px;">' +
          (isW ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F8A5B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' : '') +
          txt + '</div>';
      });
      body += '</div>';
    });

    modal = document.createElement('div');
    modal.setAttribute('data-cmp-modal', '');
    modal.style.cssText = 'position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,\'SF Pro Text\',\'Segoe UI\',Roboto,sans-serif;animation:ztCmpFade .3s both;';
    modal.innerHTML =
      '<div data-cmp-sheet style="background:#fff;border-radius:26px;max-width:860px;width:100%;max-height:88vh;overflow:auto;box-shadow:0 40px 100px -30px rgba(0,0,0,.55);position:relative;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:22px 24px 16px;position:sticky;top:0;background:#fff;z-index:3;">' +
          '<div><div style="font-size:12px;font-weight:600;letter-spacing:.22em;color:#C9502A;">COMPARADOR</div>' +
          '<div style="font-size:22px;font-weight:700;letter-spacing:-.02em;margin-top:3px;">Ficha técnica lado a lado</div></div>' +
          '<button data-cmp-close aria-label="Cerrar" style="width:40px;height:40px;border-radius:980px;border:none;background:rgba(0,0,0,.05);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>' +
        '</div>' +
        head + body +
        '<div style="padding:16px 24px 24px;color:#A1A1A6;font-size:12px;text-align:center;">El check verde marca la mejor opción en cada característica.</div>' +
      '</div>';
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!modal) return;
    modal.remove(); modal = null;
    document.body.style.overflow = '';
  }

  // ---- Eventos -----------------------------------------------------------
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('[data-compare]');
    if (c) { e.preventDefault(); toggle(c.getAttribute('data-compare')); return; }
    var rm = e.target.closest && e.target.closest('[data-cmp-rm]');
    if (rm) { remove(rm.getAttribute('data-cmp-rm')); if (modal) { if (sel.length < 2) closeModal(); else { closeModal(); openModal(); } } return; }
    if (e.target.closest && e.target.closest('[data-cmp-clear]')) { clearAll(); return; }
    if (e.target.closest && e.target.closest('[data-cmp-go]')) { openModal(); return; }
    if (e.target.closest && e.target.closest('[data-cmp-close]')) { closeModal(); return; }
    if (modal && !e.target.closest('[data-cmp-sheet]') && e.target.closest('[data-cmp-modal]')) { closeModal(); return; }
  });
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { sel = load(); syncButtons(); renderBar(); }
  });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal) closeModal(); });

  function init() {
    if (!document.getElementById('zt-cmp-kf')) {
      var st = document.createElement('style');
      st.id = 'zt-cmp-kf';
      st.textContent = '@keyframes ztCmpFade{from{opacity:0}to{opacity:1}}';
      document.head.appendChild(st);
    }
    ensureBar(); syncButtons(); renderBar();
    // re-sincroniza botones cuando el DC vuelve a renderizar
    var mo = new MutationObserver(function () { syncButtons(); });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
