/* ICLUB · Lista de chequeo de iPhone (la usan el panel y la página pública). */
(function (root) {
  root.ICLUBChequeo = [
    { g: 'Sistema', items: [
      { k: 'icloud', t: 'iCloud libre', how: 'Ajustes → tu nombre arriba de todo: no tiene que haber ninguna cuenta. En Ajustes → General → Información no debe decir "Administrado por…".', crit: true },
      { k: 'piezas', t: 'Piezas originales', how: 'Ajustes → General → Información → "Historial de piezas y reparaciones". Si aparece "Pieza desconocida", esa pieza no es original.', crit: true },
      { k: 'bateria', t: 'Salud de la batería', how: 'Ajustes → Batería → Estado de la batería. Anotá el porcentaje: más de 80% está bien. Si dice "Servicio", conviene cambiarla.', num: true },
      { k: 'tools', t: 'Informe de 3uTools', how: 'Conectá el iPhone a la compu con 3uTools → "Ver informe de verificación". Todo tiene que estar en verde.', panel: true } ] },
    { g: 'Pantalla', items: [
      { k: 'tactil', t: 'Táctil en toda la pantalla', how: 'Abrí Notas y dibujá líneas por toda la pantalla, incluidas las esquinas. No se tiene que cortar el trazo.' },
      { k: 'pixeles', t: 'Sin manchas ni píxeles muertos', how: 'Poné una imagen toda blanca y otra toda negra con el brillo al máximo. Buscá manchas, sombras o puntos.' },
      { k: 'truetone', t: 'True Tone y brillo', how: 'Centro de control → mantené apretado el brillo: tiene que aparecer el botón True Tone y el brillo tiene que subir y bajar.' } ] },
    { g: 'Seguridad', items: [
      { k: 'faceid', t: 'Face ID o Touch ID', how: 'Ajustes → Face ID y código → "Configurar Face ID" (o Touch ID). Tiene que dejar registrarlo sin errores.', crit: true } ] },
    { g: 'Cámaras', items: [
      { k: 'camtras', t: 'Cámaras traseras', how: 'Abrí Cámara y probá cada lente (0,5x, 1x, 2x o 3x). Enfocá algo cerca y algo lejos: no debe temblar ni hacer ruido.' },
      { k: 'camfrente', t: 'Cámara delantera', how: 'Sacate una selfie y grabá un video corto: tiene que verse nítido.' },
      { k: 'flash', t: 'Flash y linterna', how: 'Prendé la linterna desde el Centro de control y sacá una foto con flash.' } ] },
    { g: 'Sonido', items: [
      { k: 'parlantes', t: 'Parlantes', how: 'Poné música a todo volumen: tiene que sonar fuerte y sin ruido de abajo y de arriba.' },
      { k: 'micro', t: 'Micrófonos', how: 'Grabá una nota de voz y un video con sonido, y escuchalos.' },
      { k: 'llamada', t: 'Llamada de prueba', how: 'Hacé una llamada: escuchá bien por el auricular de arriba y que del otro lado te escuchen. La pantalla se tiene que apagar al acercarla a la oreja.' } ] },
    { g: 'Botones', items: [
      { k: 'botones', t: 'Volumen y encendido', how: 'Apretá cada botón: tienen que hacer clic firme y responder.' },
      { k: 'silencio', t: 'Silencio y vibración', how: 'Mové el interruptor de silencio (o el botón de acción): tiene que vibrar.' } ] },
    { g: 'Conexiones', items: [
      { k: 'senal', t: 'Chip con señal', how: 'Poné un chip: tiene que tener señal y datos móviles. Probá mandar un mensaje.', crit: true },
      { k: 'wifi', t: 'Wi-Fi y Bluetooth', how: 'Conectate a un Wi-Fi y a unos auriculares Bluetooth.' },
      { k: 'carga', t: 'Carga por cable', how: 'Enchufalo: tiene que cargar sin mover el cable. Si tiene MagSafe o carga inalámbrica, probala también.' } ] }
  ];
  root.ICLUBChequeoItems = root.ICLUBChequeo.reduce((a, g) => a.concat(g.items.map((x) => Object.assign({ g: g.g }, x))), []);
})(typeof window !== 'undefined' ? window : globalThis);
