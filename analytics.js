/* Google Analytics 4 — ICLUB
   Para activarlo: pegá tu ID de medición (empieza con G-) entre las comillas.
   Mientras esté vacío el sitio no carga nada y no envía datos. */
var ICLUB_GA_ID = 'G-6P3V965ER2';

(function () {
  if (!ICLUB_GA_ID || ICLUB_GA_ID.indexOf('G-') !== 0) return;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ICLUB_GA_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', ICLUB_GA_ID, { anonymize_ip: true });
  /* Clics en WhatsApp: el evento que de verdad importa medir acá. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href*="wa.me"]');
    if (a) gtag('event', 'contacto_whatsapp', { link_url: a.href });
  }, true);
})();

/* Estadísticas propias de ICLUB (panel → Estadísticas): conteos diarios sin datos personales.
   Visitas por página, productos vistos, clics a WhatsApp y compras iniciadas. */
(function () {
  var URL_RPC = 'https://pbmsymvvemvbwhxmgddg.supabase.co/rest/v1/rpc/iclub_page_track';
  var KEY = 'sb_publishable_dt4zRwkE4_NbZrXvbpZjIw_1Uhe7pFn';
  function send(kind, key) {
    try {
      var once = 'iclub-st-' + kind + '-' + key;
      if (kind !== 'whatsapp' && sessionStorage.getItem(once)) return; /* una vez por visita */
      if (kind !== 'whatsapp') sessionStorage.setItem(once, '1');
      fetch(URL_RPC, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY }, body: JSON.stringify({ p_kind: kind, p_key: String(key || '-').slice(0, 120) }) }).catch(function () {});
    } catch (e) {}
  }
  var path = location.pathname.replace(/\.dc\.html$/, '').replace(/%20/g, ' ') || '/';
  send('view', path);
  if (/^\/(comprar|Finalizar)/i.test(path)) send('checkout', path);
  if (/^\/producto/i.test(path)) {
    /* El nombre se toma del título visible cuando la ficha termina de cargar. */
    setTimeout(function () { var h = document.querySelector('h1'); var p = new URLSearchParams(location.search).get('p'); send('product', (h && h.textContent.trim()) || p || path); }, 2500);
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href*="wa.me"],a[href*="whatsapp"]');
    if (a) send('whatsapp', path);
    var f = e.target && e.target.closest && e.target.closest('a[href*="/comprar"],a[href*="Finalizar"]');
    if (f) send('finance', path);
  }, true);
})();
