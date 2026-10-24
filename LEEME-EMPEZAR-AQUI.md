# ICLUB · Versión revisada de Gestión y Referidos

## Actualizar tu instalación actual

Si ya viste **version_instalada = 6** en Supabase, **NO vuelvas a ejecutar SQL**. Este arreglo cambia la página y las pruebas, sin modificar tu base.

1. Descomprimí el ZIP nuevo.
2. Subí el contenido de la carpeta ICLUBTUC a la raíz de tu repositorio de GitHub, reemplazando los archivos anteriores. No subas el ZIP como archivo de la página. vercel.json debe quedar en la raíz.
3. Esperá a que Vercel termine de publicar y recargá con Ctrl + Shift + R.
4. En Administrar referidos completá nombre, celular con código de área y contraseña de al menos ocho caracteres. El botón muestra Guardando y luego el resultado junto al formulario.

Solo para una instalación que todavía NO tenga versión 6: ejecutá ACTUALIZAR-SUPABASE.sql completo una vez. No reinstales migraciones anteriores.

## Corrección del guardado de referidores · 24/10/2026

El campo de teléfono tenía name="id". En HTMLFormElement ese nombre puede ocultar la propiedad id del formulario: el manejador no reconocía memberForm y no enviaba la solicitud. Ahora se llama phone y el código identifica los formularios con getAttribute, también al elegir cuenta existente.

La validación muestra mensajes persistentes junto al botón. Incluye nombre, teléfono, mínimo de contraseña, estado Guardando, protección contra doble clic y distinción entre fallo de escritura y fallo de actualización de la lista después de guardar. La contraseña no se conserva en pantalla tras un alta confirmada.

## Qué se corrigió y agregó

- Diseño compartido entre Inicio, Punto de venta, Registro, los menús habituales y Referidos. El punto de venta muestra los tres pasos y un resumen antes de confirmar.
- Clientes existentes: selector con nombre, teléfono, cantidad de clientes cargados y ficha del elegido. Las cuentas bloqueadas aparecen indicadas y no pueden usarse. Se interpreta correctamente un valor antiguo blocked = "false".
- Productos: buscador de inventario, selección desde catálogo o alta de producto sin salir de la venta. Se piden los mismos datos del inventario: nombre, categoría, moneda, costo, precio y stock; además características opcionales.
- Si el producto de catálogo ya tiene una única coincidencia en stock se usa esa unidad. Si no, debés completar el ingreso de stock; no se inventan existencias. Las coincidencias ambiguas no se asignan automáticamente.
- Al crear un producto desde la venta, se ingresa su stock y se descuenta la unidad vendida en el mismo guardado. La publicación web es opcional. Los canjes conservan su ingreso al inventario sin sumarse como efectivo.
- Al confirmar una venta aparece su comprobante interno: cliente, producto, pagos, canje, total, saldo y cuotas/vencimientos. Se puede descargar PDF, imprimir o copiar para WhatsApp. No es una factura fiscal y no imprime costos ni comisiones internas.
- El Registro muestra más detalle por operación y un resumen del filtro elegido. El reporte mensual en PDF usa identidad ICLUB, resumen y tabla de operaciones. Elegí un mes para descargarlo. Si hay búsqueda, ese mismo filtro se aplica al PDF.
- Los pagos y saldos del reporte corresponden al estado actual de las ventas de ese mes, no a una reconstrucción del cierre de caja histórico. Los importes vendidos no se suman otra vez a los cobros.
- En Referidos se crea el acceso con **nombre → celular → contraseña**. Si la cuenta ya existe, marcá Usar cuenta existente: se habilita sin cambiar su contraseña ni borrar movimientos. Los errores se muestran y conservan el formulario.
- En Productos y comisiones ya no aparece todo el catálogo expandido. Buscás un producto y abrís su editor. Podés crear productos de cualquier tipo, configurar monto fijo o porcentaje y activar o no la ganancia adicional de financiación.

## Caja y comisiones

Se mantienen las reglas de la entrega anterior: saldo inicial por moneda/medio, nuevos cobros y gastos ajustan caja; canje y tarjeta pendiente no son efectivo. No cargues un ajuste de caja adicional por un cobro que ya registraste como pago.

Las comisiones se fijan al confirmar la venta y se liberan con los cobros y la entrega. Los cobros de las ventas creadas en el punto de venta actualizan su comisión vinculada. Los registros manuales independientes de Referidos se conservan como tales. Los pagos al referidor se registran como gasto y salida de efectivo de su moneda. No hay cancelación/devolución automática de ventas referidas.

## Vista local opcional

Fuera de la carpeta ICLUBTUC, el ZIP incluye **VISTA-LOCAL.html**. Abrilo en tu computadora para revisar Inicio, Registrar venta y Registro de ventas con datos ficticios. Incluye los PDF. No se conecta a Supabase ni modifica tu negocio; al recargar se reinician los ejemplos. No lo subas a la web. Los menús de clientes/catálogo y Referidos reales siguen en la carpeta de publicación.

## Pruebas realizadas

Pasaron las 14 suites de pruebas: seguridad/sesiones; datos y caché; Referidos; cotizador; clientes; catálogo; reportes; negocio; Gestión SQL; interfaz original; migración 06; flujos nuevos; documentos PDF; integración de Referidos con SQL real local.

Se verificaron transacciones y reversión completa por errores, permisos, aislamiento, claves cifradas, alta de cuentas nuevas y existentes, stock, canje, ventas, caja, comisiones fijas/porcentuales, búsqueda, registro, descargas, acción de imprimir y conservación de formularios cuando falla el servidor. También se generaron y revisaron visualmente comprobantes y un reporte PDF de 35 ventas en varias páginas.

La interfaz se probó con DOM y API simulada. No hubo un navegador real disponible en esta ejecución ni acceso a tu proyecto privado de Supabase; por eso falta comprobar la presentación real en tu navegador y tu despliegue después de instalar. No se crearon cuentas reales, no se ejecutó SQL en tu proyecto ni se publicó nada por vos.

Para repetir las pruebas de código: en tests, npm ci y npm test con Node 22 o superior. node_modules no está incluido en el ZIP.

La nueva suite referral-integration.cjs conecta la interfaz JSDOM a PGlite/PostgreSQL y ejecuta las migraciones de producción. Prueba clics de botones, colisión de nombre id, validación, doble clic, creación, login por formulario, cuenta existente, duplicados, creación de producto, comisión, cotización y copia WhatsApp, venta, cobros parciales/completos, límites de pagos, aislamiento, recarga, deshabilitar/habilitar y error de refresco posterior al guardado. No sustituye una prueba visual en Chrome ni una prueba dentro de tu Supabase publicado.
