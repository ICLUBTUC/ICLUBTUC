# ICLUB · Rediseño completo del sistema interno · 30/10/2026

Incluye la Etapa 1 (sesión única, logo en pestañas, restos de cuota) y todo el rediseño: panel nuevo, referidos, inversores, finanzas, estadísticas y respaldo.

## Cómo instalarlo (en este orden)

1. **Copia de seguridad antes de tocar nada.** En el panel actual: Respaldo y recuperación → descargar copia. Guardá también un ZIP de la carpeta ICLUBTUC como está hoy.
2. **Supabase:** abrí una consulta nueva y ejecutá completo `migraciones/11-red-comercial.sql`. Requiere que ya esté instalada la versión 10 (ACTUALIZAR-SUPABASE.sql). No toca clientes, ventas ni contraseñas: solo agrega tablas y funciones nuevas. Resultado esperado al final: `version_instalada = 11` y las dos funciones con nombre (no vacías).
3. **GitHub:** subí toda la carpeta ICLUBTUC como siempre y esperá a que Vercel publique.
4. Abrí el panel y recargá con **Ctrl + Shift + R**.

Si el panel muestra el aviso amarillo "Falta instalar migraciones/11-red-comercial.sql", el paso 2 no se completó: ventas, clientes y cobros funcionan igual, pero listas, inversores, estadísticas y copia semanal no.

## Primeros pasos después de instalar
- **Referidos → Vendedores → Comisión:** configurá a cada referidor (monto fijo en USD por equipo o porcentaje del precio). Sin esto no se puede registrar una venta a su nombre.
- **Referidos → Listas de precios:** pegá tu lista, elegí "Disponible ahora" o "Por encargo", revisá la vista previa (lo amarillo conviene mirarlo) y publicá.
- **Inversores:** creá a cada inversor con su % mensual y cargá su aporte. En Ajustes poné la tasa de plazo fijo vigente si querés que vean la comparación.
- **Finanzas → Caja:** si nunca la configuraste, cargá el saldo inicial.

## Qué cambió

**Panel (/gestion), todo en una sola página: pasar de sección no recarga ni pide ingresar de nuevo.**
- **Inicio:** cobrás hoy / esta semana / lo que queda del mes / atrasado, en grande. Atrasados arriba en rojo. Próximos cobros agrupados por día con Cobrar y recordatorio por WhatsApp. Filtro semanales / mensuales.
- **Registrar venta:** 5 pasos en una pantalla (equipo con un solo buscador, cliente o cliente nuevo, contado o financiado con planes de recargo de un toque, canje sí/no, referidor con su extra y entrega). A la derecha, el resumen en vivo con tu ganancia. Al confirmar: comprobante para WhatsApp y PDF.
- **Registro de ventas:** cliente y equipo grandes, Contado/Financiada y estado con color (Pagada, Al día, cuotas atrasadas), barra "4 de 6 cuotas", agrupado por mes, filtros por tipo y estado.
- **Clientes:** color según al día / atrasado / sin deuda. Ficha con cuotas en grilla (pagadas, parciales, atrasadas, descuento por comisión), cobro, WhatsApp, editar, bloquear, cambiar clave y anular pagos.
- **Inventario:** por marca y modelo, buscador ("i" trae los iPhone), filtros con stock / sin stock / usados de canje, +/− stock. "Agregar producto" deja elegir uno ya cargado y se completa solo.
- **Catálogo de la página:** lo que ven tus clientes en la web: publicar/ocultar, en stock/sin stock y precio. Las fotos y fichas se siguen editando en la vista anterior (botón).
- **Estadísticas:** visitas por día, productos más vistos, clics a WhatsApp y compras iniciadas (empiezan a contarse desde que publiques). Los "pedidos" ahora son **Interesados**: contactar por WhatsApp y "Pasar a venta".
- **Finanzas:** vendido, ganancia bruta y neta, gastos, comisiones, cobrado, por cobrar, atrasado; gráfico de cobros por mes (real vs esperado si todos pagan); qué equipo deja más y menos; ranking de referidores; inversores; caja; gastos. **Excel completo** (10 hojas: Resumen, Ventas con todo el detalle, Cuotas, Clientes, Cobros por mes, Equipos, Referidores, Gastos, Inventario, Inversores) y PDF del mes.
- **Respaldo:** copia automática semanal dentro de la base cada vez que abrís el panel y pasaron 7 días (quedan las últimas 16, descargables), Excel completo y la restauración que ya existía.
- **Restos de cuota:** sumar a la próxima, pasar a la última o perdonar (nota de crédito). Un pago chico no ocupa una cuota entera.
- **Vencimientos de fin de mes:** una cuota del 30 o 31 vence el último día de febrero (antes saltaba al 2 de marzo en planes viejos sin fechas guardadas).

**Portal de referidos (/referidos), rehecho.**
- Ven "Disponible ahora" (con stock) y "Por encargo", precio contado en USD y pesos y **cuánto ganan** en cada equipo.
- "Sumar USD por equipo" y **Copiar lista** lista para WhatsApp. Ese extra es todo para ellos.
- **Cotizador:** contado y cada plan, con cuota mensual y semanal, total y **cuánto gana él en cada opción**, marcando la que más le conviene. Copia el mensaje para el cliente.
- Mis ventas (cuánto ganó, cuánto se liberó, cuánto cobró, cuánto se descontó de sus cuotas) y Mis cuotas con el descuento visible en cada cuota.
- Todo queda registrado en **Referidos → Actividad**: ingresos, listas copiadas (con o sin extra y de cuánto) y cotizaciones.

**Regla de comisión con cuotas propias.** En Referidos → Ventas y comisiones → Pagar comisión: si el referidor te debe, el sistema sugiere descontarlo de sus cuotas (desde la última hacia la primera, o bajando el importe de las que faltan) y emite una nota de crédito; si no te debe, se registra el pago en efectivo como gasto de comisiones. La comisión se libera en proporción a lo que pagó el cliente y una vez entregado. Vos confirmás cada liberación (no se hace sola).

**Portal de inversores (/inversores), nuevo.** Capital, cuánto gana por mes, ganancia acumulada, cuánto le corresponde cobrar y la fecha del próximo cobro; en qué ventas se usó su dinero (solo el nombre de pila del cliente) y cómo se están pagando; simulador retirando vs reinvirtiendo, con comparación contra plazo fijo. Aclarado como proyección, no garantía.

## Pruebas de esta entrega
- **Base de datos real (PostgreSQL 16)** con 01 + 02 + ACTUALIZAR (v10) + 11: permisos, listas, comisión fija y porcentual con extra, venta vinculada, comisión aplicada a cuotas, inversores aislados entre sí, actividad, estadísticas, copia semanal descargable y restaurable, y reinstalación sin perder datos (`red-comercial-sql.cjs`).
- **Chromium real conectado a esa base:** las 16 pantallas del panel sin errores (`e2e-panel.cjs`); venta contado, venta financiada con cliente nuevo + canje + referidor, resto perdonado, cobro parcial con resto a la próxima, lista publicada, comisión a cuotas, inversor, catálogo, inventario y Excel abierto y verificado (`e2e-flujos.cjs`); portal de referidos y de inversores con ingreso real, copiar lista, cotizador y actividad (`e2e-portales.cjs`). También revisado en pantalla de celular.
- Cálculos (`metrics.cjs`), lectura de listas (`price-list.cjs`), restos (`restos-cuota.cjs`) y las suites anteriores que no dependen de las pantallas viejas.
- Las pruebas anteriores de las pantallas reemplazadas (gestion-dom, workflows6-dom, sale-flow, collection-view, referral-integration) se sacaron del listado: probaban la interfaz que ya no existe.
- No se probó dentro de tu Supabase publicado ni con tus datos reales: por eso el paso 1 (copia) es obligatorio.

## Límites conocidos
- La copia semanal se genera cuando abrís el panel. Si pasan semanas sin abrirlo, no se crea sola.
- Las estadísticas de la página arrancan en cero desde que publiques.
- Si perdonás el resto de una cuota en una venta de un referidor, ese resto no cuenta como cobrado para liberar su comisión.
- Pendiente de la auditoría anterior: repetir una operación tras perder la conexión todavía puede duplicarla; inventario por IMEI y devoluciones no están incluidos.
