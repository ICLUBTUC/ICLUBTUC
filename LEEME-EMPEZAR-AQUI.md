# ICLUB · Panel de referidos editable

## Instalar esta entrega

1. En Supabase ejecutá completo únicamente migraciones/08-panel-editable.sql. Requiere la versión 6 que ya instalaste; incluye también la función de asignar ventas de la actualización 07. No hace falta repetir 07 ni ACTUALIZAR-SUPABASE.sql.
2. Subí el contenido de ICLUBTUC a la raíz de GitHub, reemplazando archivos. Conservá vercel.json y las carpetas incluidas.
3. Esperá que Vercel termine de publicar y recargá con Ctrl + Shift + R.

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

14 suites automatizadas. La integración conecta la interfaz JSDOM con PostgreSQL local/PGlite y las migraciones de la app. Verifica altas, login, aislamiento, asignación, comisiones, cobros, pagos, configuración compartida, notas privadas, buscador y conservación de campos históricos. No equivale a probar Chrome dentro de tu Supabase publicado.

VISTA-LOCAL.html, fuera de ICLUBTUC, muestra únicamente Gestión con datos ficticios. No sirve como vista previa de estas nuevas funciones de Referidos y no se sube al sitio.
