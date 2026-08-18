/* Google Analytics 4 — ICLUB
   Para activarlo: pegá tu ID de medición (empieza con G-) entre las comillas.
   Mientras esté vacío el sitio no carga nada y no envía datos. */
var ICLUB_GA_ID = '';

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
