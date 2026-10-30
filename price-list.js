/* ICLUB · Lectura de listas de precios pegadas como texto (WhatsApp, notas, Excel).
   parse(texto, {rate}) → { items:[{name,spec,cat,usd,currency,original,line,flags}], ignored:[líneas] }
   Ignora saludos y relleno; reconoce marca por encabezado ("SAMSUNG" en una línea sola),
   capacidad (128GB, 8+256, 128/4), batería, estado y varios formatos de precio. */
(function (root) {
  'use strict';
  const BRANDS = [
    ['iphone', 'iPhone', 'Apple'], ['ipad', 'iPad', 'Apple'], ['airpods', 'AirPods', 'Apple'], ['apple watch', 'Apple Watch', 'Apple'], ['macbook', 'MacBook', 'Apple'], ['watch', 'Watch', 'Apple'],
    ['samsung', 'Samsung', 'Celulares'], ['galaxy', 'Samsung Galaxy', 'Celulares'], ['xiaomi', 'Xiaomi', 'Celulares'], ['redmi', 'Redmi', 'Celulares'], ['poco', 'Poco', 'Celulares'],
    ['motorola', 'Motorola', 'Celulares'], ['moto ', 'Motorola', 'Celulares'], ['infinix', 'Infinix', 'Celulares'], ['tecno', 'Tecno', 'Celulares'], ['realme', 'Realme', 'Celulares'],
    ['oppo', 'Oppo', 'Celulares'], ['vivo', 'Vivo', 'Celulares'], ['honor', 'Honor', 'Celulares'], ['zte', 'ZTE', 'Celulares'], ['nokia', 'Nokia', 'Celulares'], ['tcl', 'TCL', 'Celulares'],
    ['smart tv', 'Smart TV', 'Smart TV'], [' tv', 'TV', 'Smart TV'], ['philco', 'Philco', 'Smart TV'], ['rca', 'RCA', 'Smart TV'], ['noblex', 'Noblex', 'Smart TV'], ['jbl', 'JBL', 'Accesorios'],
    ['cargador', 'Cargador', 'Accesorios'], ['funda', 'Funda', 'Accesorios'], ['auricular', 'Auriculares', 'Accesorios'], ['playstation', 'PlayStation', 'Otro'], ['ps5', 'PlayStation 5', 'Otro']
  ];
  const NOISE = /\b(hola|bienvenid|consult|env[ií]o|horario|direcci[oó]n|retiro|stock sujeto|precios sujetos|sujeto a|cotizaci[oó]n|transferencia|efectivo|tarjeta|cuotas|garant[ií]a|whatsapp|instagram|gracias|lista de precios|actualizad|seña|reserva|pedido|abonar|pago|aceptamos|dólar blue|dolar blue|valores|lunes|martes|s[aá]bado|domingo)\b/i;
  const COND = /\b(sellad[oa]s?|nuev[oa]s?|usad[oa]s?|seminuev[oa]s?|reacondicionad[oa]s?|caja abierta|grado\s*[a-c]\d?|a\+|como nuev[oa]|libre|esim|dual sim|garant[ií]a\s*\d+\s*(meses|d[ií]as)?)\b/gi;
  function clean(s) {
    return String(s || '').normalize('NFC').replace(/💲|💵/g, ' $ ')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{2190}-\u{21FF}\u{25A0}-\u{25FF}]/gu, ' ')
      .replace(/[•·▪►▶➡➤✓✔☑✅❗️*_~|]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function brandOf(s) { const t = ' ' + s.toLowerCase() + ' '; for (const [k, label, cat] of BRANDS) if (t.includes(k)) return { key: k, label, cat }; return null; }
  /* Precio: número con o sin "usd/u$s/us$/$/dólares". Se descartan capacidades (GB/TB),
     porcentajes, pulgadas, mAh, Hz y MP. Devuelve la última coincidencia válida. */
  const PRICE = /(u\$d|u\$s|us\$|usd|u\$|\$|💲|dls)?\s*(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(k\b|mil\b|usd|u\$s|us\$|d[oó]lares|dls|ars|pesos)?(?!\s*(?:gb|tb|g\b|t\b|%|"|”|''|pulg|mah|hz|mp|w\b|mm|\+|\/|gen|ª|°|ta\b|º))/gi;
  function priceIn(line) {
    let best = null; PRICE.lastIndex = 0; let m;
    while ((m = PRICE.exec(line))) {
      const pre = (m[1] || '').toLowerCase(), post = (m[3] || '').toLowerCase();
      const numStart = m.index + m[0].indexOf(m[2], (m[1] || '').length), numEnd = numStart + m[2].length;
      const before = line.slice(Math.max(0, numStart - 1), numStart), after = line.slice(numEnd, numEnd + 1);
      if (/[0-9]/.test(after) || /[0-9.,]/.test(before) && !pre) continue; /* coincidencia parcial de otro número */
      if (/[a-z]/i.test(before) && !pre) continue; /* parte de un modelo: A15, S24, 15c */
      if (/^[a-z]/i.test(line.slice(m.index + m[0].length, m.index + m[0].length + 1)) && !post) continue;
      let raw = m[2], val;
      if (/^\d{1,3}([.,]\d{3})+([.,]\d{1,2})?$/.test(raw)) { const dec = raw.match(/[.,](\d{1,2})$/) && raw.length - raw.search(/[.,]\d{1,2}$/) <= 3 && /[.,]\d{3}[.,]\d{1,2}$/.test(raw); val = Number(dec ? raw.slice(0, -3).replace(/[.,]/g, '') + '.' + raw.slice(-2) : raw.replace(/[.,]/g, '')); }
      else val = Number(raw.replace(',', '.'));
      if ((post === 'k' || post === 'mil') && val >= 10) val *= 1000; else if (post === 'k') continue; /* 4K = resolución */
      if (!Number.isFinite(val) || val <= 0) continue;
      const usdMark = /usd|u\$s|us\$|u\$|u\$d|dls/.test(pre) || /usd|u\$s|us\$|d[oó]lares|dls/.test(post), arsMark = /ars|pesos/.test(post);
      const explicit = !!(pre || post);
      if (!explicit && val < 40) continue; /* números sueltos chicos: RAM, modelo, cantidad */
      if (!explicit && /^(19|20)\d{2}$/.test(String(val))) continue; /* años */
      best = { val, index: m.index, length: m[0].length, currency: arsMark ? 'ARS' : usdMark ? 'USD' : (val >= 20000 ? 'ARS' : 'USD'), explicit };
    }
    return best;
  }
  function specOf(text) {
    const parts = []; let rest = ' ' + text + ' ';
    const take = (re, fmt) => { rest = rest.replace(re, (...a) => { parts.push(fmt(...a)); return ' '; }); };
    take(/\b(\d{1,2})\s*\+\s*(\d{2,4})\s*(gb)?\b/gi, (_, r, s) => s + ' GB · ' + r + ' GB RAM');
    take(/\b(\d{2,4})\s*\/\s*(\d{1,2})\s*(gb)?\b/gi, (_, s, r) => s + ' GB · ' + r + ' GB RAM');
    take(/\b(\d{1,2})\s*gb\s*(?:de\s*)?ram\b/gi, (_, r) => r + ' GB RAM');
    take(/\b(\d{2,4})\s*(gb|g)\b/gi, (_, s) => s + ' GB');
    take(/\b(\d)\s*(tb|t)\b/gi, (_, s) => s + ' TB');
    take(/\b(?:bat(?:er[ií]a)?|bt|condici[oó]n)\s*[:\-]?\s*(\d{2,3})\s*%/gi, (_, b) => 'Batería ' + b + '%');
    take(/\b(\d{2,3})\s*%\s*(?:de\s*)?bat(?:er[ií]a)?\b/gi, (_, b) => 'Batería ' + b + '%');
    take(/\b(\d{2,3})\s*%/g, (_, b) => 'Batería ' + b + '%');
    take(/\b(\d{2,3})\s*("|”|''|pulgadas|pulg)/gi, (_, p) => p + '"');
    take(COND, (c) => c.trim().charAt(0).toUpperCase() + c.trim().slice(1).toLowerCase());
    return { spec: [...new Set(parts)].join(' · '), rest: rest.replace(/\s+/g, ' ').trim() };
  }
  function titleCase(name) {
    return name.split(' ').map((w) => {
      const lw = w.toLowerCase();
      if (/^iphone$/i.test(w)) return 'iPhone'; if (/^ipad$/i.test(w)) return 'iPad'; if (/^airpods$/i.test(w)) return 'AirPods'; if (/^macbook$/i.test(w)) return 'MacBook';
      if (/^(pro|max|plus|ultra|mini|lite|air|fe|neo|prime|power|edge|play|note|smart|hot|spark|camon)$/i.test(w)) return lw.charAt(0).toUpperCase() + lw.slice(1);
      if (/^(5g|4g|lte|nfc|se|xr|xs|tv|rca|jbl|zte|tcl|ps5)$/i.test(w)) return w.toUpperCase();
      if (/^[a-z]\d/i.test(w)) return w.toUpperCase(); /* a15, s24, g54 */
      if (w === w.toUpperCase() && w.length > 2) return lw.charAt(0).toUpperCase() + lw.slice(1);
      return w;
    }).join(' ');
  }
  function parse(text, opt) {
    const rate = Number(opt && opt.rate) || 1520;
    const items = [], ignored = []; let header = null, headerCond = '';
    String(text || '').split(/\r?\n/).forEach((original, lineNo) => {
      const line = clean(original);
      if (!line) return;
      const price = priceIn(line);
      if (!price) {
        /* Encabezado de marca o sección: "SAMSUNG", "IPHONE USADOS", "📱 XIAOMI 📱". */
        const b = brandOf(line), words = line.split(' ').length;
        if (b && words <= 4 && !NOISE.test(line)) { header = b; const c = (line.match(COND) || []).join(' '); headerCond = c; return; }
        if (/^(usad|nuev|sellad|seminuev)/i.test(line) && words <= 3) { headerCond = line; return; }
        if (line.length > 2) ignored.push(original.trim());
        return;
      }
      if (NOISE.test(line) && !brandOf(line)) { ignored.push(original.trim()); return; }
      let namePart = (line.slice(0, price.index) + ' ' + line.slice(price.index + price.length)).replace(/\b(precio|valor|contado|efectivo|usd|u\$s|us\$|dls)\b/gi, ' ').replace(/[:=\-–—>.$]+/g, ' ').replace(/\s+/g, ' ').trim();
      const sp = specOf(namePart);
      let name = sp.rest.replace(/^[^a-z0-9]+|[^a-z0-9)]+$/gi, '').trim();
      let b = brandOf(name);
      if (!b && header) { name = header.label + ' ' + name; b = header; }
      if (!/[a-z]{2,}/i.test(name) || name.length < 2) { ignored.push(original.trim()); return; }
      name = titleCase(name.replace(/\s+/g, ' ')).slice(0, 120);
      let spec = sp.spec; if (headerCond && !/sellad|nuev|usad|seminuev|grado/i.test(spec)) { const hc = headerCond.toLowerCase().trim(); spec = [spec, hc.charAt(0).toUpperCase() + hc.slice(1)].filter(Boolean).join(' · '); }
      const flags = [];
      let usd = price.val;
      if (price.currency === 'ARS') { usd = Math.round(price.val / rate * 100) / 100; flags.push('Precio en pesos convertido a USD con cotización ' + rate); }
      if (!price.explicit) flags.push('Sin símbolo de moneda: se tomó como USD');
      if (usd > 20000) flags.push('Precio muy alto: revisalo');
      items.push({ id: (name + ' ' + spec).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item-' + lineNo, name, spec: spec.slice(0, 160), cat: (b && b.cat) || 'Otro', usd: Math.round(usd * 100) / 100, currency: price.currency, original: original.trim(), line: lineNo + 1, flags });
    });
    /* Mismo equipo repetido: queda el último precio. */
    const seen = new Map(); items.forEach((it) => { if (seen.has(it.id)) it.flags.push('Repetido en la lista: se usa este precio'); seen.set(it.id, it); });
    return { items: [...seen.values()], ignored };
  }
  /* Orden natural por marca y modelo: iPhone 11 < iPhone 13 < iPhone 13 Pro. */
  function compare(a, b) {
    const ka = (a.cat || '') + ' ' + (a.name || ''), kb = (b.cat || '') + ' ' + (b.name || '');
    return ka.localeCompare(kb, 'es', { numeric: true, sensitivity: 'base' }) || String(a.spec || '').localeCompare(String(b.spec || ''), 'es', { numeric: true });
  }
  root.ICLUBPriceList = { parse, compare, brandOf, clean };
  if (typeof module !== 'undefined') module.exports = root.ICLUBPriceList;
})(typeof window !== 'undefined' ? window : globalThis);
