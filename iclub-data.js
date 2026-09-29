/* Lectura compartida de catálogo público. Nunca almacena datos de clientes. */
(function(root) {
  'use strict';
  var config = { url: 'https://pbmsymvvemvbwhxmgddg.supabase.co', key: 'sb_publishable_dt4zRwkE4_NbZrXvbpZjIw_1Uhe7pFn' };
  var KEY = 'iclub-storefront-v1';
  var pending = null;
  function load(key) { try { return localStorage.getItem(key); } catch(_) { return null; } }
  function save(key,value) { try { localStorage.setItem(key,value); } catch(_) {} }
  function cached() { try { var data = JSON.parse(load(KEY) || 'null'); return data && data.catalog && !data.clients ? data : null; } catch(_) { return null; } }
  async function request(fields) {
    var res = await fetch(config.url + '/rest/v1/storefront_state?id=eq.main&select=' + fields, {
      headers: { apikey: config.key, Authorization: 'Bearer ' + config.key }
    });
    if (!res.ok) throw new Error('No se pudo actualizar el catálogo.');
    var rows = await res.json();
    if (!rows || !rows[0]) throw new Error('El catálogo público todavía no está configurado.');
    return rows[0];
  }
  async function read(force) {
    var local = cached();
    if (!force && local && Date.now() - Number(load(KEY+'-checked') || 0) < 60000) return local;
    if (pending) return pending;
    pending = (async function() {
      try {
        if (local) {
          var meta = await request('updated_at');
          if (meta.updated_at === load(KEY+'-version')) {
            save(KEY+'-checked',String(Date.now())); return local;
          }
        }
        var row = await request('data,updated_at');
        if (!row.data || !row.data.catalog || row.data.clients) throw new Error('Respuesta de catálogo inválida.');
        save(KEY,JSON.stringify(row.data)); save(KEY+'-version',row.updated_at); save(KEY+'-checked',String(Date.now()));
        return row.data;
      } catch(error) { if (local) return local; throw error; }
      finally { pending = null; }
    }());
    return pending;
  }
  root.ICLUBData = { config: config, read: read, cached: cached,
    invalidate: function() { save(KEY+'-checked','0'); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ICLUBData;
}(typeof window !== 'undefined' ? window : globalThis));
