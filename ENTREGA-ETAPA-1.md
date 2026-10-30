# ICLUB · Entrega Etapa 1 · 29/10/2026

No hace falta ejecutar nada en Supabase. Solo subí los archivos a GitHub y recargá con Ctrl + Shift + R.

## Qué cambió
1. **Sesión única.** Si ya entraste en Gestión, Clientes o Referidos, las otras pantallas abren sin volver a pedir el ingreso, también en otra pestaña. Mientras se verifica la sesión aparece "Abriendo tu cuenta…" en lugar del formulario de ingreso. La sesión sigue venciendo a las 8 horas y "Cerrar sesión" la borra en todas.
2. **Logo ICLUB en la pestaña** de Gestión y Referidos (las demás ya lo tenían).
3. **Restos de cuota.** Un pago que deja corta una cuota ya no arrastra el faltante de cuota en cuota. Al cobrar, si queda un resto, elegís:
   - Dejarlo pendiente en esa cuota (como antes).
   - Sumarlo a la próxima cuota.
   - Pasarlo a la última cuota.
   - Perdonarlo: se emite una nota de crédito y el saldo de la cuenta baja exactamente ese importe.
   Si una cuota ya tiene un resto viejo (como los $416,67), al abrir el cobro aparece un aviso para resolverlo **sin cobrar**. Funciona desde Inicio ("Saldar cuota") y desde Clientes ("Registrar pago").

## Archivos modificados
collection-plan.js, gestion.js, gestion.html, gestion.css, Portal Clientes ICLUB.dc.html, secure-portal.js, referidos.js, referidos.html, tests/package.json, tests/restos-cuota.cjs (nuevo).

## Pruebas
- Nueva: tests/restos-cuota.cjs (las tres opciones, pago chico, última cuota, adelanto sin interés y la acción real del portal).
- Aprobadas sin cambios: small-balances, business, catalog-filters, client-list, finance-reports, frontend, quote.
- Chromium real con servidor simulado: Gestión abierta en pestaña nueva sin reingresar, ícono, aviso de resto, perdonar y cobro parcial con "sumar a la próxima"; sin errores.
- No se pudieron correr en esta sesión las suites que usan PostgreSQL local o JSDOM (no se pudo instalar el paquete). No tocan código modificado salvo gestion-dom/workflows6-dom; corré `npm test` en tests/ si tenés Node instalado.
- El portal de Clientes no se pudo abrir en el navegador de prueba (necesita React desde internet); su lógica nueva se probó ejecutando el código real del portal.
