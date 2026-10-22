> ENTREGA ACTUAL: leé LEEME-EMPEZAR-AQUI.md. Aplicá solamente ACTUALIZAR-SUPABASE.sql (migración 06). Las instrucciones de migraciones anteriores que siguen son históricas.

> Esta entrega también agrega el módulo Gestión y requiere la migración 05. Leé LEEME-EMPEZAR-AQUI.md antes de publicar.

# ICLUB · Diseño claro y compacto

Esta versión mejora la presentación de las dos secciones, manteniéndolas separadas.

## Panel principal · /portal

- Navegación lateral en computadora y navegación horizontal desplazable en celular.
- Encabezado por sección, buscador y acción principal más ordenados.
- Clientes en filas compactas, con Ver cuenta, Registrar pago y Registrar compra visibles.
- Editar, Bloquear y Eliminar quedan en “Más acciones” (tres puntos) en cada cliente. No se eliminó ninguna función ni se cambiaron permisos.
- Cobranzas conserva su resumen y el botón para desplegar el detalle.
- Catálogo, Inventario, Pedidos, Finanzas y Ajustes conservan sus funciones y filtros.
- El cierre de sesión está al pie de la barra lateral en computadora y junto al enlace Referidos en celular.

## Referidos · /referidos

- Misma paleta clara, azul y gris; navegación lateral en computadora y pestañas en celular.
- Se conservan las dos filas horizontales: disponibles y por encargo.
- Tarjetas compactas con precio, comisión y botón Cotizar.
- Se reutilizan las fotos del catálogo: primero la imagen configurada en el producto y, si no hay, la imagen estática ya existente. Si no existe una foto, se muestra el espacio pendiente.
- Cotizador y comisiones conservan cálculos y permisos. No hay automatización nueva de cobros.

## Revisar

Las vistas previas son archivos separados con datos ficticios, fuera de esta carpeta de publicación. La del panel usa la plantilla y lógica real del portal con conexión simulada; la de referidos muestra solo su módulo.

Se probaron navegación, filtros, detalle de Cobranzas, menú Más acciones/Editar, cotización, vista móvil, cierre de sesión visible y descargas PDF/CSV con datos de prueba.

## Instalar

Para el diseño no hay cambios SQL ni contraseñas nuevas: se publica el contenido completo de esta carpeta en la raíz del proyecto Vercel. Conservá todos los CSS y JS, en particular iclub-ui.css, referidos.css y los módulos de filtros/reportes.

Si todavía no instalaste el sistema de referidos, seguí además LEEME-REFERIDOS.md y aplicá la migración 04 antes de usar ese módulo. No vuelvas a ejecutar las migraciones iniciales ni borres datos.

Esta entrega no cambia tu Supabase real ni la web publicada hasta que la instales.
