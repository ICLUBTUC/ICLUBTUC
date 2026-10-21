# ICLUB · Actualización de gestión y punto de venta

## Antes de subirla

Esta versión parte del ZIP «ICLUBTUC-diseno-claro(1).zip», idéntico a la última entrega anterior. Conserva tienda, clientes, catálogo, inventario, pedidos y reportes. No contiene cuentas ficticias ni modifica tu instalación hasta que la publiques.

1. Descargá una copia de seguridad desde el panel anterior y conservá tu versión publicada como respaldo.
2. En Supabase, si todavía NO instalaste Referidos, ejecutá primero `migraciones/04-referidos.sql`. Si ya está instalado, no hace falta repetirla.
3. Ejecutá `migraciones/05-gestion.sql`. Es necesaria para el punto de venta, los porcentajes y la actualización de caja/comisiones. No borra datos ni cambia claves. No vuelvas a ejecutar las migraciones 01/02 ni reinicies tu base.
4. Subí TODO el contenido de `ICLUBTUC` a la raíz de tu repositorio GitHub, con `vercel.json` en la raíz. Conservá tu configuración de Vercel. No hace falta configurar otro hosting ni credenciales nuevas.
5. Entrá con tu cuenta de administrador en `/portal`. Se abre `/gestion`, el nuevo inicio. Los clientes mantienen su portal habitual.

## Qué cambia

- Inicio: caja por moneda y medio, ventas del mes, saldo por cobrar, cuentas plegables y calendario mensual.
- Registrar venta: elegís cliente existente o creás uno con su acceso; seleccionás equipo, referidor opcional, contado/financiación, cobro, canje y entrega.
- Plan canje: modelo, capacidad, batería, grado, estado y valor reconocido. Al confirmar se agrega al inventario con stock 1 y costo igual al importe reconocido. Su precio de reventa queda en 0 hasta que lo configures en Inventario. No se publica automáticamente.
- Una confirmación guarda cliente, compra, pago, venta, stock y referido en la misma transacción. Un conflicto o error revierte la operación entera. Un reintento no duplica la misma venta.
- Registro de ventas por mes o todo el historial: búsqueda, detalle y registro de cobros. Incluye ventas históricas; las antiguas sin identificación o cliente pueden tener menos detalle.
- Las ventas referidas creadas desde el nuevo punto de venta actualizan su comisión al registrar pagos vinculados a su factura desde el nuevo registro o desde el portal habitual.
- Referidos: misma sesión del administrador y acceso directo a administración; botón Ver como referidor con selector de una cuenta habilitada.
- Comisión por producto: fija en ARS/USD, o porcentaje del margen en ARS. Se puede incluir la ganancia adicional de financiación. Regla e importe quedan fijados al confirmar; cambios futuros no alteran ventas anteriores.
- Portada, crédito ICLUB, tarjetas, mora, visitas, ranking, gastos y cuentas por cobrar tienen secciones plegables.

## Configurar caja una sola vez

En Inicio → Caja abrí el acordeón e ingresá lo disponible HOY en efectivo y transferencia, por separado en ARS y USD. No sumes el saldo de cuentas pendientes ni stock.

Desde ese momento se suman los pagos registrados y se descuentan los gastos registrados. Se calculan diferencias al editar/eliminar pagos o gastos, para evitar duplicados. Los cobros anteriores al saldo inicial no se vuelven a sumar.

Los pagos sin medio o con un medio distinto de Transferencia se consideran efectivo. Los gastos del menú Finanzas sin medio se consideran efectivo. Un canje no suma dinero a caja. Una tarjeta pendiente tampoco: cuando se acredite, registrá el pago de esa factura por Transferencia. No cargues además un ajuste de caja para el mismo cobro.

Compras a proveedores, retiros, aportes y movimientos que no registrás como gasto se cargan desde los ajustes de caja con un motivo. Dar de alta inventario por sí solo no confirma un pago al proveedor. Los costos ingresados al cotizar una venta afectan su margen, pero no confirman una salida de dinero: registrá su pago cuando ocurra. No registres el mismo costo dos veces al calcular el resultado.

Los pagos al referidor se consideran salidas de efectivo de su moneda y se registran como gasto en Finanzas (USD convertido a ARS a la cotización vigente al pagar). Conservá fondos para comisiones aún no pagadas: no se descuentan de caja hasta abonarlas.

## Comisión porcentual

Margen del equipo = máximo de cero y (precio contado − costo del equipo − otros costos).
Si activás incluir financiación, se agrega máximo de cero y (total de la venta − precio contado − costos de financiación).
Comisión = base anterior × porcentaje / 100.

Se libera proporcionalmente a lo cobrado al cliente, incluyendo el valor reconocido en canje, y solo al confirmar entrega. El sistema impide pagar más de lo liberado. Los costos/márgenes de ICLUB no se muestran al referidor.

Los registros manuales independientes de Referidos anteriores siguen siendo independientes: no se convierten ni se importan como ventas del punto de venta. Sus cobros se siguen registrando manualmente allí, evitando duplicarlos en la cuenta del cliente.

No hay devoluciones/cancelaciones automáticas: no se permite eliminar ni cambiar el total de una venta vinculada a Referidos. Tampoco reducir cobros si ya se pagó más comisión de la que quedaría liberada. Para operaciones sin vincular se conservan las herramientas anteriores.

## Calendario

Usa los planes de cuotas reales del portal, con nombre, vencimiento, monto y estado. Rojo: pendiente, verde: cubierto; también indica el estado con texto. No inventa vencimientos para deudas antiguas sin un plan. El saldo general por cobrar sí incluye esas deudas.

## Comprobaciones realizadas

- Pruebas de permisos, claves, sesiones, aislamiento de clientes y conflictos.
- Cotizador, filtros de clientes/catálogo y reportes existentes.
- Lógica del punto de venta, canje, cuenta nueva, financiación, fechas y tarjeta pendiente.
- Base PostgreSQL local: migraciones, transacción y reversión completa por error, comisión porcentual, cobros sincronizados, caja, gastos y repetición segura de migración 05.
- Pruebas DOM con conexión simulada: navegación, formularios, canje, registro, acceso de admin y vista de referidor.

No se aplicó SQL a tu Supabase ni se publicó en tu Vercel. Las pruebas DOM no reemplazan una revisión visual en un navegador real, que no estuvo disponible en esta ejecución. Al instalar, verificá primero con una operación controlada y revisá el saldo inicial de caja.

Para ejecutar las pruebas de código: en `tests`, `npm ci` y `npm test` con Node 22 o superior. La carpeta node_modules no se incluye en la entrega.
