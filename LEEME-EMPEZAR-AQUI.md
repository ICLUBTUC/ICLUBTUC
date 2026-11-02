# ICLUB · Panel unificado y cobros pendientes

## Instalar esta entrega

1. Ejecutá **ACTUALIZAR-SUPABASE.sql** completo en una consulta nueva de Supabase. Esta entrega reúne 06, 08, 09 y 10; no ejecutes otros archivos por separado. Conserva datos y claves. Requiere la seguridad 02 ya instalada.
2. Comprobá el resultado final: version_instalada = 10, respaldo y asignar_venta con sus firmas.
3. Subí el contenido de ICLUBTUC a GitHub y esperá la publicación.
4. Recargá con Ctrl + Shift + R. En Referidos, si aparece el aviso de actualización pendiente, usá Actualizar después de completar SQL.

Ver AUDITORIA-TECNICA.md para diagnóstico, cambios comprobados, limitaciones y siguiente bloque. La recuperación de negocio tiene los límites detallados abajo. No se implementaron devoluciones.

## Personalizar sin programar

En Administrar referidos abrí “Personalizar el programa · sin programar”. Podés editar:
- Título del programa.
- Bienvenida, aviso o novedades para todos los vendedores.
- Instrucciones, condiciones comerciales y cómo solicitar el pago. Son textos informativos; no modifican automáticamente las reglas de cálculo.
- Hasta ocho campos de texto opcionales para Asignar venta: escribí un nombre por línea, por ejemplo Color, Capacidad o Lugar de entrega. Los valores se comparten con el vendedor de esa venta. Cambiar o quitar campos afecta las ventas nuevas; las anteriores conservan los datos originales.

En cada vendedor podés asignar ventas, ver ventas y ganancias, editar notas privadas, habilitar o deshabilitar. El buscador filtra por nombre o teléfono. Las notas privadas son solo para administración y se conservan al habilitar/deshabilitar.

Seguís pudiendo agregar productos de cualquier tipo, editar comisiones y crear cuentas desde este panel. Estas opciones no requieren editar archivos.

## Ventas y comisiones

Asignar venta registra la comisión de una venta ya realizada: no duplica inventario, caja ni deuda del cliente. Para una venta nueva completa usá Registrar venta en Gestión.
La asignación acepta monto fijo o porcentaje del precio de venta, en la misma moneda. La configuración de catálogo también conserva porcentaje sobre margen. La comisión queda fijada al registrar la venta.
Confirmá entrega y registrá cobros para liberar comisión proporcionalmente. Registrá pagos al vendedor solo cuando efectivamente los hayas realizado. Un cobro registrado en el módulo manual de referidos no actualiza una deuda independiente del cliente. Los pagos al vendedor sí se registran como gasto y salida de caja mediante la lógica existente.
No se agregó automatización de WhatsApp, pagos bancarios ni devoluciones.

## Pruebas

19 suites automatizadas. La integración conecta la interfaz JSDOM con PostgreSQL local/PGlite y las migraciones de la app. Verifica altas, login, aislamiento, asignación, comisiones, cobros, pagos, configuración compartida, notas privadas, buscador y conservación de campos históricos. No equivale a probar Chrome dentro de tu Supabase publicado.

No se incluye la vista local antigua porque no representa esta versión. Las pruebas de interfaz usan datos ficticios y no alteran producción.

## Cambios del 26/10

- Inicio: calendario y cuentas por cobrar muestran cuotas pendientes; excluyen cuotas saldadas y clientes sin saldo deudor.
- Filtro Todos / Semanales / Mensuales compartido por lista y calendario de Inicio. También disponible en Clientes, Cobranzas y Finanzas > Cuentas por cobrar.
- El filtro identifica la frecuencia del plan, no un rango de fechas. Los planes sin frecuencia reconocible aparecen en Todos. En Clientes se combina con los filtros de estado y orden existentes; los filtros de frecuencia buscan planes con saldo pendiente.
- Inicio, Registrar venta y Registro de ventas usan el menú, marca, secciones y pie del panel de Clientes. El portal del vendedor conserva su función separada.

## Respaldo y recuperación

Desde el menú principal, solo administración puede descargar una copia conjunta de clientes, inventario, ventas, caja y referidos. El archivo incluye notas privadas: guardalo de forma privada.

Para restaurar: elegí el JSON, revisá la fecha y cantidades, escribí RESTAURAR y confirmá. La recuperación reemplaza el estado comercial, no combina registros: los movimientos posteriores a esa copia dejarán de estar en el estado activo. Descargá antes una copia actual.

Se valida la firma del archivo y se bloquea si hubo cambios mientras revisabas. Se conservan las contraseñas, sesiones, bloqueos de cuentas y habilitaciones actuales de referidos. Si se agregaron o eliminaron cuentas desde la copia, se requiere recuperación asistida; el sistema rechaza la restauración automática.

Esta copia funciona únicamente en el mismo proyecto que conserva su clave privada de firma. No incluye credenciales ni infraestructura y no permite reconstruir por sí sola un proyecto Supabase perdido. Conservá también un respaldo del proveedor.

La exportación antigua está rotulada “Exportar datos del portal”: es parcial, no incluye referidos y no se acepta en la nueva recuperación. “Importar copia antigua” conserva la compatibilidad anterior.

## Registrar venta y compartir comprobante — 27/10

- La revisión explica por qué una financiación no alcanza el contado: adelanto + canje + cuotas, total y diferencia. El botón de confirmación permanece deshabilitado mientras el cálculo sea inválido. No se eliminó la validación ni se cambian importes silenciosamente.
- “Calcular cuota mínima sin recargo” divide el saldo entre la cantidad de cuotas y redondea hacia arriba a centavos. Revisá el total antes de confirmar.
- “Pasar mensuales a semanales ÷ 4” divide la cuota por cuatro y multiplica la cantidad por cuatro. Ejemplo: 6 de $100.000 pasan a 24 de $25.000. Si hay ajuste por centavos, pide confirmación. El primer vencimiento se conserva; los siguientes son cada 7 días. Hasta 104 pagos.
- El comprobante tiene acciones, estado de cuenta/entrega, vista previa del mensaje y avisos dentro de la ventana.
- Copiar para WhatsApp confirma el resultado. Ante bloqueo o ausencia del portapapeles, muestra el texto para copiar manualmente. “Abrir WhatsApp” abre el mensaje preparado para elegir destinatario; no lo envía automáticamente.
- El mensaje incluye contado, total, dinero inicial, canje, pagado, saldo y fechas/importes de cada cuota; no incluye costos ni comisión interna.
- PDF informa preparación o error dentro del comprobante. La impresión incluye el comprobante sin herramientas ni comisión interna.

## Saldar restos de cuotas

En Inicio, usá “Saldar cuota”: abre el pago con el importe pendiente de esa cuota. Podés elegir “Saldar resto de cuota” o “Saldar todo el plan”, o introducir un pago parcial. Solo registrá dinero efectivamente cobrado.

En Clientes, el formulario reconoce importes como 416,67 y 416.67. Muestra centavos y ofrece “Saldar resto de cuota”. El pago se asigna al plan seleccionado. No se exige pagar la cuota siguiente para cerrar un resto anterior.

Los planes antiguos ya no consideran pagados restos de hasta $2; la última cuota absorbe el redondeo de las anteriores para que su suma coincida con el total. Esto puede mostrar diferencias pequeñas que antes figuraban como cubiertas: no se generan cargos ni se borran pagos históricos. El cálculo de calendario y Clientes usa el mismo módulo.

## Evidencia de esta entrega

19 suites locales. La prueba de ventas conecta clics en JSDOM con PostgreSQL local/PGlite: conversión semanal, doble clic, stock y deuda guardados, pago parcial y saldo de $416,67. El portal se prueba con sus acciones reales de cálculo y guardado para centavos y restos de $0,01.

Copia permitida, denegada y no disponible; acciones de PDF e impresión con APIs simuladas. La generación real de PDF tiene una prueba independiente. No se probó el permiso del portapapeles, la descarga ni el diálogo de impresión de tu navegador publicado. Tampoco hubo QA visual real en Chrome móvil. No se modificaron datos de producción.
