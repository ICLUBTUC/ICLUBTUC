> Actualización: la guía vigente de caja, porcentajes y ventas vinculadas es LEEME-EMPEZAR-AQUI.md. Para esas funciones aplicá migraciones/05-gestion.sql después de 04.

# ICLUB · Sistema de referidos

Esta entrega conserva la web del ZIP recibido e incorpora /referidos. No se modificó la base real ni se publicó el sitio.

## Instalar sobre la versión actual

1. Conservá un respaldo privado de tus datos actuales.
2. En Supabase, SQL Editor, ejecutá todo `migraciones/04-referidos.sql`. Requiere que las migraciones 01 y 02 ya estén aplicadas. No hace falta volver a ejecutarlas ni cambiar contraseñas. La nueva migración no modifica clientes, ventas ni saldos existentes.
3. Publicá el contenido de esta carpeta en la raíz del mismo proyecto Vercel: `vercel.json` junto a los HTML y JS. No publiques respaldos privados. Conservá las subcarpetas de imágenes.
4. Ingresá a /portal como admin. El enlace “Referidos · Equipos, comisiones y ventas” abre /referidos. También hay un enlace directo desde el portal.
5. En “Administrar referidos”, habilitá el celular de una cuenta existente y cargá su nombre. Si no existe, creala primero en Clientes del panel habitual. No se crean contraseñas nuevas por este módulo.
6. Elegí cada equipo, activá “Ofrecer equipo”, definí comisión fija, moneda USD o ARS, disponibilidad y plazo si es por encargo. Guardá cada equipo. Inicialmente no hay equipos habilitados ni comisiones asignadas.
7. El referidor ingresa con el celular y contraseña de su cuenta a /referidos. Ve dos filas horizontales, buscador y cotizador. No ve clientes ajenos, costos ni márgenes.

## Vender y pagar comisiones

El cotizador toma precios, dólar y recargos del catálogo/panel actual, con los mismos valores por defecto del cotizador original. Distingue contado, financiación personal y tarjeta con sus recargos propios. Pregunta si hay adelanto, permite cargarlo en USD o ARS, y ofrece pagos mensuales o semanales. Para planes semanales usa la convención del panel: 4 pagos por cada mes de plan (2 meses = 8 semanas). No significa que todos los meses calendario tengan cuatro semanas; el mensaje declara esa convención y las fechas reales se acuerdan al cerrar.

El texto incluye equipo, especificaciones, batería si figura en el catálogo, contado, forma de pago, adelanto, saldo a financiar, plazo, número e importe de pagos, total de cuotas y total final incluyendo anticipo. Puede copiarse el plan elegido o agregar las alternativas. Muestra fecha de cotización y referencia del referidor. Garantía y accesorios se incluyen solo si el administrador completa “Incluye, garantía y aclaraciones” en el equipo. No inventa condiciones.

Las cuotas se distribuyen a centavos: si hay diferencia de redondeo, informa un último pago ajustado para que sumen exactamente el total. Si el adelanto cubre el precio completo pide elegir contado. No aprueba créditos, genera vencimientos ni reserva mercadería.

El texto copiado o enviado por WhatsApp NO incluye la comisión. Los precios, disponibilidad y financiación requieren confirmación de ICLUB.

Cuando se confirma una venta, el administrador selecciona referidor y equipo, nombre breve del cliente, total final de la operación y moneda de cobro. La comisión y su moneda se guardan en esa venta: editar después el equipo no modifica lo prometido.

En “Mis ventas y comisiones”, el administrador registra cada cobro realmente recibido y confirma la entrega. La comisión liberada se calcula: comisión acordada × cobrado / total de venta, redondeada a dos decimales. Sin entrega confirmada no se libera. Al cobrar toda la venta queda liberada toda la comisión, tanto en contado como financiado. Después registra cada pago efectivamente realizado al referidor; el sistema impide superar lo liberado.

Si la comisión es USD y el cobro es ARS, la proporción se calcula con el total y los cobros de la venta en ARS, y se libera el equivalente proporcional en USD. No se convierte automáticamente la comisión a otra moneda. Acordá antes de registrar el pago en qué moneda se cancela.

## Alcance de esta primera versión

- Los cobros y pagos de referidos se registran manualmente en este módulo. NO están conectados automáticamente a los movimientos de Finanzas o la cuenta corriente del cliente. Registrar un cobro aquí no crea un pago en Finanzas y viceversa.
- No realiza transferencias de dinero ni envía notificaciones. La comisión “disponible” es una deuda pendiente de pago, no dinero ya transferido.
- No incluye anulaciones, devoluciones ni reversión de cobros/pagos. Confirmá importes antes de registrar. Para operaciones que requieran reversión, mantené un registro de la incidencia y adaptá el módulo antes de asentarlas; no borres datos ni edites SQL a ciegas.
- El referidor no crea ni cambia ventas o cobros. El administrador confirma la atribución al cerrar la venta, evitando duplicar referentes.
- El acceso se habilita independientemente del rol cliente: no cambia permisos del portal original. Deshabilitar un referidor le quita acceso al módulo y conserva sus ventas.
- La disponibilidad del programa es editable e independiente del inventario. Actualizala al vender el último equipo; no reserva ni descuenta stock automáticamente.
- No usa Realtime, consultas periódicas ni descargas de datos privados en el catálogo público. Se actualiza al abrir, guardar o pulsar Actualizar.
- Cambios simultáneos se rechazan por versión para evitar sobrescrituras. Ante conflicto, actualizá y repetí la edición.

## Validación

Desde tests: npm install y npm test. Prueba las migraciones originales y los permisos del módulo nuevo, aislamiento entre referentes, entrega, cobros parciales, topes de pago, comisión histórica y conflictos. Pruebas con datos ficticios, sin acceder al Supabase real.

También se comprobó en navegador el ingreso, las dos secciones, buscador, cotización sin comisión y vista móvil con datos de prueba.

## Panel original

El bloque Cobranzas inicia compacto: conserva cantidad y totales, y permite abrir/cerrar la lista mediante “Ver cuotas / Ocultar cuotas”. No cambia cálculos ni permisos.

La lista de clientes abre con saldo pendiente y mayor atraso primero. Filtros: con deuda, atrasados, todos, sin deuda y bloqueados; orden por atraso, alta reciente, saldo o nombre. El atraso usa cuotas vencidas no pagadas, no la fecha de compra. “Últimos agregados” usa la fecha de alta de cuentas creadas desde el panel en esta versión. Las cuentas antiguas sin fecha no se inventan: quedan al final, ordenadas por nombre. Cuentas creadas mediante registro público sin fecha también se ubican al final. Los bloqueados con deuda permanecen en el filtro de deuda para no ocultar cobranzas.

Catálogo: conserva categoría/modelo y agrega orden por más vendidos, precio o nombre, filtros de stock/visibilidad, solo vendidos y período 30/90 días o historial completo. Cuenta unidades en db.ventas (Finanzas), no consultas ni visitas ni ventas de referidos registradas solamente en el módulo nuevo. Si un nombre corresponde a varias variantes y no tiene identificador de catálogo, no se asigna para evitar duplicar ventas. Una venta sin cantidad cuenta como una unidad, igual que el ranking original.

Finanzas: inicia con todo el historial, permite hoy, semana (lunes a hoy), mes, 30/90 días, año y fechas personalizadas inclusivas. Resumen, gráfico, ranking, lista de gastos y PDF usan el mismo período. CSV incluye el detalle de ventas, gastos y pagos. Las ventas se separan de los cobros; no deben sumarse. Por cobrar es el saldo actual, no un saldo histórico al cierre del rango. Resultado registrado es margen de ventas menos gastos cargados; no incorpora automáticamente comisiones del módulo de referidos ni costos faltantes. No es una conciliación de caja ni un informe contable auditado. Las fechas inválidas se incluyen solo en el historial completo y se informa cuántas no pudieron graficarse.

## Separación de pantallas

/portal conserva tu panel principal: Clientes, Catálogo, Inventario, Pedidos, Finanzas y Ajustes. Cobranzas plegable, filtros de clientes/catálogo y reportes por período están exclusivamente ahí. El enlace “Administrar referidores” abre /referidos, donde están las comisiones y la gestión del programa. El referidor solo ve Equipos y Mis ventas y comisiones. Las vistas de prueba se entregan como archivos separados y no se publican como parte del sitio.
