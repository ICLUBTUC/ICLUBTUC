# ICLUB — Auditoría actualizada, 26/10/2026

## Alcance y arquitectura

Revisión del proyecto y pruebas locales; no certificación de seguridad ni revisión del Supabase productivo. No se modificó producción. La captura mostró que PostgREST no encontraba iclub_ref_assign: por sí sola no distingue función ausente de caché pendiente.

App estática publicada en Vercel (vercel.json). Portal Clientes ICLUB.dc.html conserva DCLogic/React y lógica incrustada; gestion.js y referidos.js usan DOM nativo. business.js concentra ventas; ref-quote.js cotizaciones; finance-reports.js y sale-documents.js reportes. Autenticación propia por RPC, no Supabase Auth: 02-seguridad.sql implementa bcrypt, tokens hasheados, vencimiento de ocho horas y límites de login. Roles admin/client; membresía activa de referido separada.

portal_state es un documento JSON de clientes, movimientos, inventario, ventas y configuración. storefront_state proyecta catálogo público. iclub_private.referrals contiene miembros, productos, ventas, configuración y notas privadas. No hay claves foráneas por cada venta; la integridad depende de funciones y revisiones. iclub_checkout guarda cliente/stock/venta y referencia en una transacción. Las ventas manuales de Referidos son independientes de stock y deuda; sus pagos de comisión sí generan gasto/caja.

## Estado comprobable

- Implementado y ejecutado localmente: altas, login, roles, aislamiento, venta/stock, cotización, reportes, comisiones, cobros, pagos, asignación por vendedor, configuración y notas privadas. Evidencia: tests/ y migraciones sobre PostgreSQL local/PGlite.
- Parcial: respaldo JSON, trazabilidad de inventario, recuperación frente a respuesta perdida y permisos (roles fijos, sin matriz por acción).
- Simulado: las pruebas usan datos ficticios. JSDOM ejecuta código y eventos, sin layout real. Algunas suites usan RPC simulados; referral-integration.cjs usa SQL real local.
- Ausente en alcance revisado: devolución/anulación integral, kardex por IMEI, monitoreo centralizado y restauración integral ensayada.
- No verificado: datos/migraciones de producción, egress real, política de backup del proveedor, navegador móvil y rendimiento real de red.

## Hallazgos, prioridad y verificación

| ID / prioridad | Evidencia y consecuencia | Solución / criterio de aceptación |
|---|---|---|
| A1 alta — corregido | referidos.js load verificaba solamente management_version=6; asignación y configuración requieren funciones posteriores. Permitía formularios sin backend compatible. | 09 agrega capacidades por firmas de función; banner persistente y bloqueo preventivo. Test elimina endpoint, comprueba bloqueo y reinstala. |
| A2 alta — corregido | change mezclaba escritura y load: si fallaba la lectura posterior decía “No se guardó”. Incentivaba repetir un movimiento confirmado. | Se distingue commit confirmado de recarga fallida; ante red ambigua se pide consultar historial. Test confirma cobro en SQL aunque falle load. No equivale a idempotencia total. |
| A3 alta — corregido en RPC de referidos | Wrapper 05 calculaba margen con costArs sin excluir NaN: costo<0 no lo rechaza. Invocación directa podía generar comisión no finita. | 09 valida números antes de mutar y limita amount/total/commission a dos decimales. Test NaN y milésima comprueba rechazo sin cambio de revisión. Bases y porcentajes económicos se conservan. |
| A4 alta — implementado con límites | La exportación antigua sigue siendo parcial y está etiquetada. | 10 agrega exportación conjunta firmada, vista previa, confirmación, control de versión y recuperación transaccional de negocio. Prueba SQL ida/vuelta con rechazo por firma, rol, versión y cambio de cuentas; conserva accesos actuales. Solo mismo proyecto; no recupera infraestructura ni credenciales. |
| A5 alta — pendiente | receipt/payout tienen revisión global, pero no ID durable de operación del cliente. Tras respuesta perdida y recarga, un nuevo intento puede repetir un movimiento válido. | Idempotencia persistente con contenido y recuperación de resultado. Probar reintento/concurrencia y mismo ID con monto distinto. |
| A6 media — pendiente | business.buildSale y save_state modifican inventario JSON, protegido por versión global, sin libro completo por unidad. | Movimientos con actor/fecha/venta y política de devolución. Probar ventas concurrentes y canje sin sobrescrituras. |
| A7 media — pendiente | load trae catálogo y ventas completos; portal_state también es un documento completo. El costo crece con volumen. No explica por sí solo egress pasado. | Medir payload/frecuencia y después paginar/usar lecturas parciales. No hay métricas productivas aquí. |
| A8 media — pendiente | Ventas tienen historia parcial; no hay bitácora general de cambios de configuración, productos y notas. | Log de actor/fecha/entidad/acción, sin secretos. Probar permisos de lectura. |
| A9 media — pendiente | Plantillas grandes y eventos mezclados; frontend calcula con Number. Riesgo de mantenimiento/redondeo, sin demostrar otro error actual. | Extraer validaciones y presentación gradualmente; comparar contra numeric SQL antes de pasar cálculos a centavos. |
| A10 media — pendiente | HTML carga Supabase @2 por CDN; CSP limita objetos/base/frames, sin política estricta de scripts. | Fijar versión y probar CSP compatible con runtime DC. No bloquear scripts existentes sin pruebas. |
| A11 media — no verificado | JSDOM no cubre layout/foco visual ni todas las reglas de Chrome (el fallo previo del campo id lo demuestra). | QA en navegador autorizado con datos aislados, móvil y teclado. No declarar QA visual completo. |

## Plan por bloques

1. Entregado: compatibilidad de instalación, mensajes de persistencia y validación numérica. Aceptación: suite completa y actualización consolidada conservando ventas/campos.
2. Entregado: respaldo/restauración de negocio en el mismo proyecto con vista previa y ensayo aislado. Recuperación total de infraestructura y credenciales sigue pendiente.
3. Idempotencia durable y bitácora. Repetir una operación no debe duplicar dinero aunque se pierda la respuesta.
4. Inventario por movimientos, devoluciones según reglas acordadas y rendimiento medido.

No se agregan módulos por apariencia. No se reescribe el framework. No se cambia la base económica: comisión fija o porcentaje elegido, liberación proporcional y sujeta a entrega, pagos efectivos y monedas separadas. Falta definir tratamiento de comisiones pagadas ante devolución/cancelación antes de automatizar reversión.

## Operación y recuperación

Esta entrega usa únicamente ACTUALIZAR-SUPABASE.sql completo: 06, 08, 09 y 10 dentro de una transacción. Incluye 07 mediante 08. Requiere seguridad 02 instalada. Si falla, conservar el error, no ejecutar fragmentos ni reinstalar migraciones viejas que reemplacen funciones nuevas. Resultado final esperado: version_instalada=10 y firmas de respaldo/asignar.

Conservar ZIP anterior y copia protegida de la base antes de aplicar. El JSON del portal no sustituye un backup integral. Recuperación total y tiempos RTO/RPO no están ensayados ni prometidos. Para revertir interfaz puede usarse el ZIP anterior; no eliminar tablas para revertir SQL.

## Verificación y límites

Suite original e integración ampliada: endpoint ausente, reinstalación consolidada con datos existentes, rol denegado, NaN y fracciones de centavo, fallo de lectura después de cobro confirmado, notas privadas y campos históricos. PostgreSQL local/PGlite + JSDOM. No hubo prueba dentro de cuenta publicada, QA visual móvil, recuperación integral ni devoluciones. Estos últimos permanecen pendientes, no completados.

## Verificación adicional 26/10

Filtros semanal/mensual, cuotas pagadas ocultas, calendario y apertura del acordeón probados en JSDOM. Recuperación verificada en PostgreSQL local/PGlite: exportar, comparar y restaurar; rol cliente rechazado, firma alterada rechazada, revisión antigua rechazada, contraseñas y habilitaciones conservadas, cambio de cuentas rechazado y reinstalación de SQL compatible. Interfaz de respaldo probada con RPC simulados. Menú de Gestión adaptado al panel de Clientes. No se verificó el diseño en Chrome móvil ni se modificó producción.

## Incidencias de venta y comprobante, 27/10

La captura de financiación muestra rechazo por total inferior al contado; no aporta los importes completos para reconstruir esa operación exacta. Se reprodujo el rechazo con datos controlados y se corrigió su explicación, bloqueo del botón y cálculo asistido. Conversión mensual ÷4 con cantidad ×4, sin cambiar precios automáticamente.

El comprobante enviaba mensajes del portapapeles a una región detrás del diálogo. Ahora tiene estado interno, alternativa manual y enlace a WhatsApp. Rediseño de acciones, resumen y vista previa en la identidad del panel. APIs del sistema se prueban simuladas; no se declara prueba de esos permisos en Chrome real.

Saldos pequeños: _num eliminaba separadores de importes monetarios; nuevo parseo de pagos conserva centavos y formato argentino. Se quita tolerancia de $2 en planes antiguos y se concilia el redondeo en la última cuota. No cambia el historial almacenado. La UI de cobro precarga el resto y comprueba el saldo del plan/cuenta. Las cuotas siguientes permanecen intactas. 19 suites locales; sale-flow.cjs une DOM con SQL y small-balances.cjs ejecuta las acciones reales del portal.
