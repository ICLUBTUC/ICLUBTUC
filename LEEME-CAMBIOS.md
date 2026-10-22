> ENTREGA ACTUAL: leé LEEME-EMPEZAR-AQUI.md. Aplicá solamente ACTUALIZAR-SUPABASE.sql (migración 06). Las instrucciones de migraciones anteriores que siguen son históricas.

# ICLUB · Dos secciones independientes

## Tu panel principal: /portal

Conserva Clientes, Catálogo, Inventario, Pedidos, Finanzas y Ajustes.

- Clientes: por defecto clientes con saldo pendiente, ordenados por mayor atraso. Buscador, filtros por estado y orden por alta/saldo/nombre.
- Cobranzas: resumen compacto por defecto; “Ver cuotas” despliega el detalle. Los cálculos y acciones de cobro se conservan.
- Catálogo: conserva categoría/modelo y agrega filtros por stock, visibilidad y ventas; orden por más vendidos, precio y nombre. Usa ventas registradas en Finanzas.
- Finanzas: historial completo por defecto, filtros de período y rango; PDF y CSV del período elegido. No mezcla ventas con dinero cobrado.
- Administrar referidores: enlace que abre una sección independiente; no reemplaza los menús anteriores.

## Programa de referidos: /referidos

- El referidor ve su saludo, equipos disponibles/por encargo, buscador y cotizador para WhatsApp.
- Ve sus ventas, sus comisiones y sus totales; no las cuentas de otros clientes ni tu panel principal.
- Solo tu usuario administrador puede habilitar referidores y editar comisiones del programa.
- Los cobros del programa todavía se registran manualmente y están separados de Finanzas. No se ha implementado sincronización automática ni anulaciones del módulo de referidos.

## Revisar antes de publicar

Las vistas previas se entregan fuera de la carpeta de publicación:

- ICLUB-panel-principal-vista-previa.html: la misma plantilla y lógica del panel real, con datos ficticios y sin conexión a Supabase. Permite probar Clientes, Catálogo, Cobranzas, Finanzas y exportación PDF/CSV.
- ICLUB-referidos-vista-previa.html: solo el programa de referidos con datos ficticios. No contiene ejemplos de las pantallas de tu panel principal.

No publiques los HTML de prueba como sustitutos de la aplicación.

## Instalar

Seguí LEEME-REFERIDOS.md. Si ya aplicaste las migraciones 01 y 02, no las repitas ni cambies contraseñas: ejecutá solo migraciones/04-referidos.sql y luego publicá todos los archivos de esta carpeta en la raíz del proyecto Vercel.

Nada de esta entrega se aplicó al Supabase real ni a la web publicada.
