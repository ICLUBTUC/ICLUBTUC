# ICLUB — versión optimizada y protegida

Esta carpeta contiene la web completa. No reemplaces la web actual hasta aplicar las migraciones y configurar el administrador. Los cambios se probaron con datos ficticios; no se modificó tu base real.

## Instalación paso a paso

1. **Guardá una copia.** Conservá el ZIP original y exportá una copia de tus datos desde el panel actual. Esa copia contiene información privada: no la subas a Vercel ni la compartas.
2. **Prepará la publicación.** Descomprimí este ZIP y dejá preparada la actualización del proyecto actual en Vercel, sin publicarla todavía. Conserva el mismo proyecto Supabase. No hace falta crear otra cuenta.
3. **Abrí Supabase → tu proyecto → SQL Editor → New query.** Abrí el archivo `migracion-01-catalogo-publico.sql` en un editor de texto, copiá TODO su contenido, pegalo en la consulta y presioná **Run**. No pegues el nombre del archivo: pegá su contenido.
4. **En otra consulta**, copiá TODO `migraciones/02-seguridad.sql` y presioná **Run**. Esto cierra el acceso directo a los datos privados. Desde este momento el portal viejo deja de funcionar; completá los pasos siguientes en la misma intervención.
5. **Configurá una contraseña NUEVA de administrador.** Ejecutá esta consulta, reemplazando el texto entre comillas por una clave privada de al menos 12 caracteres (máximo 72 bytes). No compartas esa clave en el chat:

```sql
select public.iclub_set_admin_password('REEMPLAZAR_POR_TU_CLAVE_NUEVA');
```

6. **Publicá los archivos de esta versión en tu proyecto Vercel.** `vercel.json`, los HTML, JavaScript y la carpeta `assets` deben estar en la raíz del sitio, conservando sus nombres. Si usás GitHub, actualizá el repositorio conectado y dejá que Vercel publique. No subas tus copias de datos privadas. No hace falta instalar Node para servir esta web estática.
7. **Comprobá el acceso.** Abrí `/portal`, ingresá como `admin` con la nueva clave y verificá clientes, saldos y productos. Después probá con una cuenta de cliente existente: mantiene su celular y contraseña, y debe ver únicamente su cuenta. Probá también abrir la tienda sin ingresar.
8. **Verificá permisos.** En SQL Editor ejecutá `migraciones/03-verificar.sql`. Todas las comprobaciones deben devolver `true`. Si algún paso devuelve error, detené la publicación y conservá el mensaje exacto, sin compartir contraseñas ni datos de clientes.

No vuelvas a habilitar la política pública anterior para hacer funcionar el portal viejo. Si necesitás recuperar datos, hacelo desde una copia privada y revisá los permisos antes de publicar.

## Qué cambió

- La tienda lee un catálogo público separado: ya no descarga clientes, contraseñas ni costos internos.
- El servidor valida el acceso con celular y contraseña. Las claves pasan a bcrypt; la identidad no depende de una bandera del navegador.
- Los clientes conservan su acceso. Las nuevas claves de cliente requieren al menos 8 caracteres. Las sesiones vencen a las 8 horas; cinco intentos fallidos bloquean ese teléfono durante 15 minutos. No se incorporó verificación por SMS.
- Solo el administrador guarda el estado financiero. Las solicitudes de financiación quedan pendientes de revisión; sus importes no son pagos verificados.
- Se evita sobrescribir cambios simultáneos. Si falla un guardado, el panel avisa: no cierres esa pestaña y exportá una copia antes de recargar.
- Sin Realtime ni escrituras de visitas al estado completo. El catálogo usa caché y una consulta pequeña para comprobar cambios; normalmente puede tardar hasta un minuto en actualizarse.
- Las imágenes repetidas se convirtieron en archivos compartidos con caché, sin cambiar su contenido visual.
- Se quitaron las páginas antiguas ZonaTech; sus enlaces redirigen a ICLUB. Se mantiene la estructura de varios HTML y se comparte la lógica de datos.
- La edición de productos se realiza desde el panel; se deshabilitó la edición rápida dentro de la tienda. Se quitó una regla antigua que podía alterar automáticamente el iPhone 14.

## Consumo y seguridad

Estas mejoras reducen las transferencias futuras; no borran el consumo acumulado del mes ni garantizan que siempre alcance el plan gratuito. El contador compartido antiguo de visitas ya no aumenta con cada apertura; la analítica independiente existente puede seguir midiendo visitas.

La migración guarda una copia inicial en `iclub_private.backup`, inaccesible desde la web. Esa copia conserva el estado antiguo, que puede incluir claves en texto plano. Conservála solo durante la validación; luego podés eliminarla desde SQL Editor con `delete from iclub_private.backup;` si ya tenés un respaldo privado seguro. No publiques respaldos dentro del sitio.

Como el diseño anterior permitía descargar el estado privado desde el navegador, conviene renovar las contraseñas de los clientes desde el panel. Esto no demuestra que alguien haya accedido indebidamente.

El límite de registro es global (60 cuentas/hora), el de login también (120 intentos/minuto), y cada cliente puede enviar hasta 10 solicitudes/día. Son controles básicos contra abuso, no una auditoría de seguridad completa. Las dependencias React/Babel siguen cargándose desde CDN como en la versión original.

## Pruebas incluidas

Desde `tests`, con Node instalado: `npm install`, luego `npm test`. Se prueban permisos, aislamiento de cuentas, migración de claves, sesiones, bloqueos, solicitudes, conflictos y caché. Las pruebas no contactan tu Supabase real.

También se comprobó en navegador el acceso de administrador/cliente, alta y guardado de un cliente, cierre de sesión, aislamiento y vista móvil; se revisó la carga de páginas de tienda e imágenes locales.
