# ICLUB — subida y copia de seguridad

## Lo primero: tus datos de clientes NO están en esta carpeta

Los planes de financiación, las cuotas pagadas, los recibos y el catálogo editado
**no viven en estos archivos**. Viven en dos lugares:

1. **La nube (Supabase)** — es la copia real y compartida. Sobrevive a que
   cambies de celular, borres el navegador o subas esta carpeta de nuevo.
2. **El navegador que usás** (localStorage, clave `zt-portal-fin-db-v2`) — es una
   copia local que se sincroniza con la nube.

**Subir esta carpeta no toca ninguno de los dos.** Se reemplazan las páginas, no
los datos. Podés subirla tranquilo.

Las fotos de productos que cargaste sí son un archivo: `imageslots.state.json`.
Está incluido en esta carpeta.

## Cómo subirla

Arrastrá el contenido de la carpeta a tu hosting (Vercel). `vercel.json` ya trae
las direcciones nuevas (`/apple`, `/android`, `/smart-tv`, `/portal`, `/ayuda`) y
las redirecciones de los links viejos, así nada de lo que compartiste queda roto.

## PENDIENTE — copia de seguridad propia (a hacer)

Hoy dependés de que la nube siga andando. Falta un botón en el panel que baje
**un archivo con todo** (clientes, planes, cuotas pagadas, recibos, catálogo,
inventario, cotización y ajustes) y otro que lo vuelva a cargar.

Con eso tendrías:

- Un respaldo tuyo, en tu compu, que no depende de nadie.
- Poder volver atrás si borrás algo por error.
- Poder pasar todo a otra cuenta o a otro servicio sin perder historial.

Recomendado: bajar la copia **una vez por semana** y guardarla con la fecha en el
nombre (`iclub-2026-08-14.json`).

## Mientras eso no exista — respaldo a mano

1. Entrá al panel desde el navegador donde trabajás siempre.
2. Abrí la consola del navegador (F12).
3. Pegá esto y apretá Enter:

```js
(() => {
  const d = localStorage.getItem('zt-portal-fin-db-v2');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([d], { type: 'application/json' }));
  a.download = 'iclub-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
})()
```

Te baja un archivo con todo. Guardalo donde no se pierda.

**No hagas esto:** borrar los datos del sitio / "limpiar caché y datos" en el
navegador donde usás el panel. Es lo único que puede hacerte perder la copia
local. La de la nube queda igual, pero mejor no probar.
