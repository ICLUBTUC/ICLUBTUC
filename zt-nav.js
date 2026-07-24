/* ZonaTech — franja negra de navegación compartida (categorías y detalle) */
(function () {
  if (document.getElementById('zt-shared-topbar')) return;
  var css = ''
    + '#zt-shared-topbar{position:sticky;top:0;z-index:40;background:linear-gradient(180deg,#151517,#0D0D0E);box-shadow:0 1px 0 rgba(255,255,255,.07),0 12px 30px -18px rgba(0,0,0,.6);}'
    + '#zt-shared-topbar .zt-topnav a{position:relative;color:rgba(255,255,255,.72);text-decoration:none;font-size:15px;font-weight:600;letter-spacing:-.01em;padding:10px 16px;border-radius:10px;transition:background .25s,color .25s;}'
    + '#zt-shared-topbar .zt-topnav a:hover{background:rgba(255,255,255,.08);color:#fff;}'
    + '#zt-shared-topbar .zt-nav-item{position:relative;}'
    + '#zt-shared-topbar .zt-nav-item > a{display:inline-flex;align-items:center;gap:6px;}'
    + '#zt-shared-topbar .zt-caret{opacity:.5;transition:transform .28s cubic-bezier(.22,1,.36,1),opacity .2s;}'
    + '#zt-shared-topbar .zt-nav-item:hover .zt-caret{transform:rotate(180deg);opacity:1;}'
    + '#zt-shared-topbar .zt-dd{position:absolute;top:100%;left:50%;transform:translate(-50%,10px);padding-top:12px;opacity:0;pointer-events:none;transition:opacity .22s ease,transform .26s cubic-bezier(.22,1,.36,1);z-index:50;}'
    + '#zt-shared-topbar .zt-nav-item:hover .zt-dd,#zt-shared-topbar .zt-nav-item:focus-within .zt-dd{opacity:1;pointer-events:auto;transform:translate(-50%,0);}'
    + '#zt-shared-topbar .zt-dd-panel{min-width:236px;background:rgba(21,21,23,.97);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:10px;box-shadow:0 30px 70px -20px rgba(0,0,0,.6);}'
    + '#zt-shared-topbar .zt-dd-label{font-size:10.5px;font-weight:700;letter-spacing:.18em;color:rgba(255,255,255,.38);padding:8px 12px 7px;}'
    + '#zt-shared-topbar .zt-dd-panel a{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 12px;border-radius:11px;font-size:14.5px;color:rgba(255,255,255,.85);}'
    + '#zt-shared-topbar .zt-dd-panel a em{font-style:normal;font-size:11px;font-weight:700;color:#7CC7FF;letter-spacing:.06em;}'
    + '#zt-shared-topbar .zt-dd-panel a:hover{background:rgba(255,255,255,.09);color:#fff;}'
    + '#zt-shared-topbar .zt-dd-panel a.zt-dd-all{margin-top:6px;border-top:1px solid rgba(255,255,255,.09);border-radius:0 0 12px 12px;color:#7CC7FF;}'
    + '#zt-shared-topbar .zt-dd-panel a.zt-dd-all:hover{background:rgba(90,200,250,.15);color:#A5D8FF;}'
    + '#zt-shared-topbar .zt-topnav a.zt-nav-active{color:#fff;}'
    + '#zt-shared-topbar .zt-topnav a.zt-nav-active::after{content:"";position:absolute;left:16px;right:16px;bottom:4px;height:2px;border-radius:2px;background:linear-gradient(90deg,#5AC8FA,#0A84FF);}'
    + '#zt-shared-topbar .zt-acct{display:inline-flex;align-items:center;gap:9px;text-decoration:none;color:#fff;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:980px;padding:7px 16px 7px 8px;transition:background .25s,border-color .25s;}'
    + '#zt-shared-topbar .zt-acct:hover{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.28);color:#fff;}'
    + '#zt-shared-topbar .zt-burger{display:none;background:none;border:none;cursor:pointer;padding:9px;color:#fff;border-radius:9px;}'
    + '#zt-shared-topbar .zt-burger:hover{background:rgba(255,255,255,.11);}'
    + '#zt-shared-topbar .zt-mobile-menu{display:none;flex-direction:column;background:#111112;border-top:1px solid rgba(255,255,255,.08);padding:6px 20px 16px;}'
    + '#zt-shared-topbar .zt-mobile-menu.open{display:flex;}'
    + '#zt-shared-topbar .zt-mobile-menu a{color:rgba(255,255,255,.9);text-decoration:none;font-size:16px;font-weight:600;padding:15px 4px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:space-between;}'
    + '#zt-shared-topbar .zt-mobile-menu a:last-child{border-bottom:none;}'
    + '@media (max-width:880px){#zt-shared-topbar .zt-topnav{display:none !important;}#zt-shared-topbar .zt-burger{display:inline-flex !important;}#zt-shared-topbar .zt-acct-text{display:none !important;}#zt-shared-topbar .zt-acct{padding:8px !important;gap:0 !important;}}'
    + '#zt-shared-topbar .zt-topnav a{white-space:nowrap;}'
    + '@media (max-width:1080px){#zt-shared-topbar .zt-topnav a{font-size:14px;padding:9px 10px;}#zt-shared-topbar > div{gap:12px !important;padding:0 18px !important;}#zt-shared-topbar .zt-acct-text{display:none !important;}#zt-shared-topbar .zt-acct{padding:8px !important;gap:0 !important;}}';
  var fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap'; document.head.appendChild(fl);
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var caret = '<svg class="zt-caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>';
  var chev = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>';
  var bar = document.createElement('header');
  bar.id = 'zt-shared-topbar';
  bar.innerHTML = ''
    + '<div style="display:flex;align-items:center;gap:22px;max-width:1420px;margin:0 auto;padding:0 30px;height:76px;">'
    +   '<a href="Hero ZonaTech.dc.html" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;flex-shrink:0;">'
    +     '<span style="width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,#5AC8FA,#0A84FF);box-shadow:0 6px 16px -6px rgba(10,132,255,.55);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;">I</span>'
    +     '<span style="font-family:\'Space Grotesk\',sans-serif;font-size:22px;font-weight:700;letter-spacing:.14em;color:#fff;">ICLUB</span>'
    +   '</a>'
    +   '<div style="width:1px;height:26px;background:rgba(255,255,255,.12);margin:0 2px 0 4px;"></div>'
    +   '<nav class="zt-topnav" style="display:flex;align-items:center;gap:2px;">'
    +     '<div class="zt-nav-item"><a href="Apple ZonaTech.dc.html" data-zt-page="apple">iPhone ' + caret + '</a>'
    +       '<div class="zt-dd"><div class="zt-dd-panel" data-zt-dd="apple">'
    +         '<div class="zt-dd-label">MODELOS</div>'
    +         '<a href="Producto ZonaTech.dc.html?m=iphone13">iPhone 13</a>'
    +         '<a href="Producto ZonaTech.dc.html?m=iphone15">iPhone 15</a>'
    +         '<a href="Producto ZonaTech.dc.html?m=iphone16pro">iPhone 16 Pro</a>'
    +         '<a class="zt-dd-all" href="Apple ZonaTech.dc.html">Ver todos los iPhone</a>'
    +       '</div></div></div>'
    +     '<div class="zt-nav-item"><a href="Apple ZonaTech.dc.html#card-airpodsmax">Accesorios ' + caret + '</a>'
    +       '<div class="zt-dd"><div class="zt-dd-panel" data-zt-dd="acc">'
    +         '<div class="zt-dd-label">ACCESORIOS</div>'
    +         '<a href="Apple ZonaTech.dc.html#card-airpodsmax">AirPods Max <em>Nuevo</em></a>'
    +         '<a href="Apple ZonaTech.dc.html#card-ipad11">iPad 11ª gen <em>Nuevo</em></a>'
    +         '<a class="zt-dd-all" href="Apple ZonaTech.dc.html#card-airpodsmax">Ver todos</a>'
    +       '</div></div></div>'
    +     '<div class="zt-nav-item"><a href="Android ZonaTech.dc.html" data-zt-page="android">Celulares ' + caret + '</a>'
    +       '<div class="zt-dd"><div class="zt-dd-panel" data-zt-dd="cel">'
    +         '<div class="zt-dd-label">MARCAS</div>'
    +         '<a href="Android ZonaTech.dc.html#and-sec-samsung">Samsung</a>'
    +         '<a href="Android ZonaTech.dc.html#and-sec-xiaomi">Xiaomi</a>'
    +         '<a href="Android ZonaTech.dc.html#and-sec-poco">Poco</a>'
    +         '<a href="Android ZonaTech.dc.html#and-sec-motorola">Motorola</a>'
    +         '<a href="Android ZonaTech.dc.html#and-sec-infinix">Infinix</a>'
    +         '<a class="zt-dd-all" href="Android ZonaTech.dc.html">Ver todos los celulares</a>'
    +       '</div></div></div>'
    +     '<div class="zt-nav-item"><a href="Smart TV ZonaTech.dc.html" data-zt-page="tv">Smart TV ' + caret + '</a>'
    +       '<div class="zt-dd"><div class="zt-dd-panel" data-zt-dd="tv">'
    +         '<div class="zt-dd-label">TELEVISORES</div>'
    +         '<a href="Producto Smart TV.dc.html?id=tv-ecopower">EcoPower <em>Smart</em></a>'
    +         '<a href="Producto Smart TV.dc.html?id=tv-rca-40">RCA 40&quot; <em>Smart</em></a>'
    +         '<a href="Producto Smart TV.dc.html?id=tv-philco-58">Philco 58&quot; <em>Smart 4K</em></a>'
    +         '<a class="zt-dd-all" href="Smart TV ZonaTech.dc.html">Ver todos los Smart TV</a>'
    +       '</div></div></div>'
    +     '<a href="Portal Clientes ZonaTech.dc.html#financiar">Cotizador</a>'
    +   '</nav>'
    +   '<div style="margin-left:auto;display:flex;align-items:center;gap:8px;">'
    +     '<a class="zt-acct" href="Portal Clientes ZonaTech.dc.html">'
    +       '<span style="width:32px;height:32px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
    +         '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#1D1D1F" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.2" r="3.4"></circle><path d="M4.8 19.5c1.35-3.2 4-4.7 7.2-4.7s5.85 1.5 7.2 4.7"></path></svg>'
    +       '</span>'
    +       '<span class="zt-acct-text" style="font-size:15.5px;font-weight:600;letter-spacing:-.01em;color:#fff;white-space:nowrap;">Mi cuenta</span>'
    +     '</a>'
    +     '<button class="zt-burger" id="zt-shared-burger" aria-label="Menú"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"></path></svg></button>'
    +   '</div>'
    + '</div>'
    + '<div class="zt-mobile-menu" id="zt-shared-mobile-menu">'
    +   '<a href="Apple ZonaTech.dc.html">iPhone ' + chev + '</a>'
    +   '<a href="Apple ZonaTech.dc.html#card-airpodsmax">Accesorios ' + chev + '</a>'
    +   '<a href="Android ZonaTech.dc.html">Celulares ' + chev + '</a>'
    +   '<a href="Smart TV ZonaTech.dc.html">Smart TV ' + chev + '</a>'
    +   '<a href="Portal Clientes ZonaTech.dc.html#financiar">Cotizador ' + chev + '</a>'
    +   '<a href="Portal Clientes ZonaTech.dc.html">Mi cuenta ' + chev + '</a>'
    + '</div>';

  function mount() {
    if (!document.body) { setTimeout(mount, 60); return; }
    document.body.insertBefore(bar, document.body.firstChild);
    // active underline
    var loc = decodeURIComponent(location.pathname + ' ' + location.href);
    var page = /Apple ZonaTech/i.test(loc) ? 'apple'
      : /Android ZonaTech/i.test(loc) ? 'android'
      : /Smart TV ZonaTech/i.test(loc) ? 'tv' : '';
    if (page) {
      var act = bar.querySelector('[data-zt-page="' + page + '"]');
      if (act) act.classList.add('zt-nav-active');
    }
    var burger = document.getElementById('zt-shared-burger');
    var menu = document.getElementById('zt-shared-mobile-menu');
    if (burger && menu) {
      burger.addEventListener('click', function (e) { e.stopPropagation(); menu.classList.toggle('open'); });
      document.addEventListener('click', function (e) { if (!menu.contains(e.target) && e.target !== burger) menu.classList.remove('open'); });
    }
  }
  mount();
})();
