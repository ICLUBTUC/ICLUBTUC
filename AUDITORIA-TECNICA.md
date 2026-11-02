# ICLUB · Auditoría técnica completa · 31/10/2026

Alcance: panel de administración nuevo (`gestion.html` + `admin-*.js`), portales de referidos e inversores, portal de clientes, cálculos (`collection-plan.js`, `iclub-metrics.js`, `business.js`), migración `11-red-comercial.sql` sobre el esquema de producción (01 + 02 + ACTUALIZAR v10), despliegue en Vercel y pruebas.

Método: revisión de código, pruebas contra **PostgreSQL 16 real** con las mismas funciones que Supabase, **Chromium real** conectado a esa base, ataque de inyección de código en todos los campos, prueba de permisos con cuentas de distinto rol y medición de rendimiento con negocios simulados de 200 a 3.000 clientes.

No incluye: tu Supabase publicado ni tus datos reales, pruebas en celulares físicos, carga real de red ni revisión legal.

---

## 1. Resumen ejecutivo

| | Estado |
|---|---|
| Seguridad del panel y portales | **Bien.** 0 ejecuciones de código inyectado en 21 pantallas + 2 portales. Funciones del servidor con permisos por rol. |
| Integridad del dinero | **Bien, con 1 error corregido** (caja de pagos combinados). Validaciones de importes, decimales y concurrencia activas. |
| Cálculos | **Bien.** Cuotas, restos, comisiones, inversores, finanzas y Excel con pruebas automáticas. |
| Rendimiento | **Bien hasta ~3.000 clientes.** El documento único crece; ver riesgos. |
| Mantenimiento | **Aceptable.** Quedan archivos viejos sin uso y el portal de clientes monolítico. |
| Despliegue | **A mejorar.** Se detectó que `vendor/` no llegó a GitHub (PDF fallaban). |

**Corregido en esta auditoría: 8 hallazgos** (1 alto, 4 medios, 3 bajos). **Pendientes: 10**, ninguno crítico; están priorizados abajo.

---

## 2. Hallazgos corregidos

| ID | Severidad | Problema | Evidencia | Corrección y prueba |
|---|---|---|---|---|
| C1 | **Alta** | Un pago **combinado** (efectivo + transferencia) entraba entero a "Transferencia" en la caja. | Pago de $100.000 efectivo + $50.000 transferencia → caja: Transferencia +$150.000. | El pago guarda las dos partes y la caja las reparte (`wallet_totals` en la migración 11). Pagos combinados viejos no cambian. Editar un pago combinado exige que las partes sumen el total. Prueba SQL: Efectivo +100.000 / Transferencia +50.000. |
| C2 | Media | Los PDF (contrato, factura, reportes) fallaban en la página publicada. | Error del navegador: `window.jspdf` sin definir; `vendor/` no estaba publicado. | Carga automática de respaldo (servidor propio → cdnjs → jsDelivr). Probado borrando el archivo: descargan igual. |
| C3 | Media | Un porcentaje con 3 decimales (tarjeta 27,675%) se guardaba como 27675%. | Captura de Ajustes después de guardar. | Los campos de % leen punto y coma siempre como decimales. Prueba: queda 27,675. |
| C4 | Media | Cualquier cliente con sesión podía escribir en el reporte de actividad de referidores. | Cliente común → `iclub_net_track` respondía ok. | Solo referidores e inversores habilitados. Prueba SQL de rechazo. |
| C5 | Media | Las estadísticas públicas aceptaban claves ilimitadas (alguien podía llenar la tabla). | 300 claves basura aceptadas sin sesión. | Tope de 300 claves distintas por día y tipo; el excedente suma a "(otros)"; se borran datos de más de 400 días. Prueba SQL. |
| C6 | Baja | El portal del inversor recibía todos los datos de la compra del cliente (medio de pago, detalle). | Respuesta del servidor con `met`, `prodName`. | Solo los campos necesarios para calcular cuotas. Prueba SQL. |
| C7 | Baja | El Inicio repetía los mismos cálculos hasta 4 veces por pantalla. | Medición con 3.000 clientes: ~1,5 s por dibujo. | Los cálculos se guardan mientras los datos no cambian. |
| C8 | Baja | El Excel salía sin comprimir (46 MB con 3.000 clientes). | Medición. | Compresión en el navegador: ~10 veces menos (2.961 KB → 287 KB en 20.000 filas). Verificado con Excel/LibreOffice/openpyxl. |

Mejoras agregadas en la misma pasada: **actualización automática** cuando otro dispositivo guardó cambios (al volver a la pestaña o cada minuto, sin pisar un formulario abierto) y **foco visible** para teclado.

---

## 3. Seguridad

**Inyección de código (XSS).** Se cargaron textos con código malicioso en nombre de cliente, producto, detalle y medio de pago, inventario, catálogo, gastos, tareas, interesados, listas de precios, notas, textos del programa, actividad y nombre de inversor. Se recorrieron las 21 pantallas del panel, comprobantes, ficha del inversor, cobro y los dos portales logueados. **Resultado: 0 ejecuciones.** Todo texto variable pasa por escape antes de mostrarse (`tests/e2e-seguridad.cjs`).

**Permisos del servidor.** Las tablas privadas no son accesibles desde el navegador (prueba de "permission denied"). Toda escritura pasa por funciones con control de rol:
- Administrador: todo.
- Referidor: lee listas publicadas, su comisión, sus ventas y su cuenta; registra su actividad.
- Inversor: lee solo su cuenta, movimientos y ventas asignadas (nombre de pila del cliente).
- Cliente común: no ve nada de la red comercial.

Probado con cuentas reales de cada rol.

**Sesiones.** Contraseñas con bcrypt, tokens guardados como hash, vencimiento a 8 horas, límite de intentos (migración 02). Desde la Etapa 1 la sesión se guarda en `localStorage` para no pedir ingreso entre pantallas: si existiera una inyección de código podría leerla, por eso la prueba de XSS es parte del paquete de pruebas.

**Cabeceras (Vercel).** Hay `nosniff`, `X-Frame-Options`, `Referrer-Policy` y CSP para objetos, base y marcos. **No hay política de scripts** (ver P5).

---

## 4. Integridad de datos y dinero

- **Concurrencia:** cada guardado exige la versión vigente; si otro dispositivo guardó antes, se rechaza sin pisar nada y ahora el panel se actualiza solo.
- **Operaciones con dinero en una sola transacción:** venta con referidor, comisión a cuotas (venta del referidor + nota de crédito + gasto) y alta de inversor.
- **Validaciones:** importes no numéricos, NaN, infinitos, más de 2 decimales, pagos mayores al saldo, comisión mayor a la liberada, descuento mayor a la deuda del referidor.
- **Números:** se guardan sin ceros sobrantes para que la firma de las copias de seguridad no se rompa al pasar por el navegador (detectado y corregido antes de la entrega).
- **Ventas de referidos vinculadas:** el servidor impide borrarlas, cambiar su total o bajar cobros por debajo de lo ya pagado.

---

## 5. Cálculos

Con pruebas automáticas:
- **Cuotas:** vencimientos de fin de mes, restos (próxima, última, perdón), pagos chicos, adelanto con y sin interés, plan pasado a contado, comisión aplicada desde la última cuota o repartida.
- **Cobros:** hoy, semana, mes, atrasos, calendario.
- **Finanzas:** vendido, ganancia bruta y neta, cobrado, proyección, rankings.
- **Inversores:** devengado por mes calendario, simulador simple y compuesto, comparación con plazo fijo.
- **Referidos:** ganancia por forma de pago, extra en USD, porcentaje sin el extra.
- **Lista de precios:** 14 de 14 equipos de una lista real, sin tomar "4K" ni porcentajes como precio.

Aclaración de criterio: **"Ganancia bruta" es por devengado** (ventas del mes, aunque no estén cobradas). Lo efectivamente cobrado está en "Cobrado en el mes".

---

## 6. Rendimiento (medido)

| Clientes (planes) | Cuotas pendientes | Finanzas | Lista de clientes | Datos |
|---|---|---|---|---|
| 200 (400) | 35 ms | 43 ms | 11 ms | 178 KB |
| 1.000 (2.000) | 68 ms | 82 ms | 50 ms | 894 KB |
| 3.000 (6.000) | 184 ms | 315 ms | 120 ms | 2,7 MB |

Hasta 3.000 clientes la experiencia es fluida. El límite real es el **documento único** (P3).

---

## 7. Accesibilidad y uso

- Todos los campos tienen etiqueta.
- Los estados se muestran con texto y no solo con color ("Atrasada", "Pagada").
- Ventanas modales con cierre por botón, Escape o clic afuera.
- Botones de 44 px.
- Foco visible para teclado.
- Revisado en 390 px de ancho.

No hubo prueba con lector de pantalla.

---

## 8. Pendientes priorizados

> **Actualización 01/11/2026 · Mejoras aplicadas** (requiere `migraciones/12-mejoras-auditoria.sql`):
>
> | ID | Estado | Qué se hizo |
> |---|---|---|
> | P1 | ✅ Control agregado | Respaldo → **Estado del sistema** revisa en un toque: versión del servidor, red comercial, referidos, copia automática, tamaño de datos y que estén publicados `vendor/` (PDF), Excel, estilos y los dos portales. |
> | P2 | ✅ Resuelto | Cada operación lleva un identificador que se guarda en el **historial de cambios**. Si se corta la conexión, el panel relee el servidor y avisa "**SÍ quedó guardada, no la repitas**" o "**NO se guardó**". Un reintento con datos viejos además choca con el control de versión, así que no se duplica. |
> | P3 | 🟡 Vigilado | El Estado del sistema avisa cuando los datos pasan ~2,5 MB. La separación en tablas queda para cuando haga falta. |
> | P4 | ✅ Resuelto | Copia semanal del lado del servidor con pg_cron (lunes 06:00 UTC, se guardan las últimas 16). Si pg_cron no está activo, sigue la copia al abrir el panel y el Estado del sistema lo marca. |
> | P5 | ⏳ Pendiente | Fijar versiones exactas requiere verificarlas en línea; no se cambió para no romper la carga de scripts. |
> | P6 | ✅ Resuelto | **Movimientos de stock** (alta, ajuste, +1/−1, venta, canje, deshacer, devolución) con fecha, motivo e IMEI. **IMEI por unidad**: al vender se elige cuál se lleva y queda en el comprobante. **Devolución** con retención, reintegro (efectivo o transferencia, también en caja), nota de crédito, plan cancelado sin atrasos, equipo e IMEI de vuelta al stock y venta "Devuelta" fuera de Finanzas. Si la venta es de un referidor, avisa revisar su comisión. |
> | P7 | ✅ Resuelto | **Historial de cambios** en Respaldo: cada operación con fecha y hora (últimas 400). |
> | P8 | ✅ Resuelto | Un resto perdonado cuenta como cobrado para liberar la comisión del referidor (servidor, migración 12). |
> | P9 | ⏳ Manual | Borrar a mano de GitHub: `gestion.js`, `gestion.css`, `referidos.js`, `referidos.css` (ya no se usan). |
> | P10 | ✅ Resuelto | Suites nuevas con PostgreSQL real: `auditoria-sql.cjs` y `e2e-mejoras.cjs`; todas pasan (ver sección 10). |
>
> Extra: Finanzas e Inicio separan **ganancia ya cobrada** y **por cobrar en cuotas**. Corregido: al abrir un formulario, el cursor ya no salta al primer campo si empezaste a escribir en otro.

| ID | Prioridad | Riesgo | Recomendación |
|---|---|---|---|
| P1 | **Alta** | **Despliegue incompleto:** faltó `vendor/` en GitHub y podría faltar otra carpeta. | Subir la carpeta completa. Después de publicar, revisar 3 cosas: el panel abre sin aviso amarillo, Contrato PDF descarga y Excel descarga. |
| P2 | **Alta** | **Operación repetida tras un corte de conexión** (A5 anterior): si se pierde la respuesta y se reintenta, un cobro podría duplicarse. El doble clic ya está bloqueado. | Guardar un identificador único por operación en el servidor y rechazar repetidos. |
| P3 | Media | **Documento único** (`portal_state`): cada guardado envía todos los datos (2,7 MB con 3.000 clientes) y dos personas editando a la vez chocan. | Al pasar ~2.000 clientes: separar clientes y movimientos en tablas y guardar solo lo que cambia. |
| P4 | Media | La **copia semanal** se crea al abrir el panel; si no se abre, no hay copia. | Activar una tarea programada en Supabase (pg_cron) o abrir el panel al menos una vez por semana. Mantener también el respaldo del proveedor. |
| P5 | Media | **Scripts de terceros sin versión fija** (`supabase-js@2`, React del portal) y CSP sin `script-src`. Si el proveedor publica una versión con error, la página puede romperse sola. | Fijar versión exacta y, cuando esté estable, agregar `script-src` con los dominios usados. |
| P6 | Media | **Inventario sin historial por unidad ni IMEI**; no hay devoluciones (A6 anterior). "Deshacer compra" devuelve stock, pero no deja rastro. | Movimientos de stock con fecha, actor y motivo, y un flujo de devolución con reglas sobre comisiones ya pagadas. |
| P7 | Baja | **Bitácora de cambios** de precios, ajustes y notas (A8 anterior). | Registrar quién y cuándo cambió cada cosa. |
| P8 | Baja | Un **resto perdonado** en una venta de referido no cuenta como cobrado: esa parte de la comisión no se libera. | Definir la regla y contar las notas de crédito de resto como cobradas si corresponde. |
| P9 | Baja | **Código viejo sin uso** publicado: `gestion.js`, `gestion.css`, `referidos.js`, `referidos.css`. El portal de clientes (400 KB) mezcla diseño y lógica. | Borrar los archivos viejos cuando confirmes que todo funciona. Migrar de a poco el portal de clientes al esquema nuevo. |
| P10 | Baja | Las suites anteriores de servidor (PGlite) y de pantallas viejas (JSDOM) no se pudieron correr en esta sesión. Las nuevas usan PostgreSQL real. | Correr `npm test` en una PC con Node y PostgreSQL local (ver sección 10). |

---

## 9. Privacidad y negocio

- El **Excel** y las **copias JSON** incluyen teléfonos, saldos y notas privadas: guardarlos en un lugar seguro y no compartirlos.
- El inversor ve solo el **nombre de pila** del cliente y el avance de las cuotas.
- **Inversores:** el simulador está rotulado como proyección y no como garantía. Recibir dinero de terceros con rendimiento prometido puede tener implicancias legales e impositivas; conviene consultarlo con un contador o abogado antes de ampliarlo.

---

## 10. Pruebas

`tests/package.json` → `npm test`. Necesita Node y, para las pruebas de servidor y pantallas, PostgreSQL 16 local en el puerto 5433 (`tests/reset-db.sh`) y Playwright.

| Prueba | Qué cubre | Resultado 31/10 |
|---|---|---|
| `red-comercial-sql.cjs` | Migración 11 completa, permisos, comisiones, inversores, caja combinada, topes, reinstalación. | OK |
| `e2e-panel.cjs` | 21 pantallas sin errores. | OK |
| `e2e-flujos.cjs` | Ventas, cobros, restos, listas, comisión a cuotas, inversor, Excel. | OK |
| `e2e-ficha.cjs` | Inicio con widgets, Ajustes, ficha completa del cliente, cotización y CSV. | OK (2 corridas seguidas) |
| `auditoria-sql.cjs` | Migración 12: estado, copia interna protegida y restaurable, resto perdonado como cobrado, reinstalación. | OK 01/11 |
| `e2e-mejoras.cjs` | Historial de cambios, corte de red (sí/no guardada), stock e IMEI, devolución contado y en cuotas, estado del sistema, ganancia cobrada. | OK 01/11 |
| `e2e-portales.cjs` | Portal de referidos e inversores logueados. | OK |
| `e2e-seguridad.cjs` | Inyección de código en todos los campos. | OK, 0 ejecuciones |
| `metrics`, `price-list`, `restos-cuota`, `small-balances`, `business` y 5 más | Cálculos puros y lógica real del portal. | OK |

---

## 11. Próximo bloque recomendado

1. **P1:** publicar completo y hacer el control de 3 puntos.
2. **P2:** que un cobro nunca se duplique.
3. **P4:** copia semanal automática del lado del servidor.
4. **P6:** inventario por unidad con devoluciones.
5. **P9:** limpiar archivos viejos.
