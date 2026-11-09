/* ICLUB · Plan canje: modelos, capacidades y descuentos por defecto (se editan en el panel → Ajustes → Plan canje). */
(function (root) {
  'use strict';
  const it = (id, n, gb) => ({ id, n, gb });
  root.ICLUBCanjeModelos = [
    { g: 'iPhone 11', items: [it('11', '11', ['64', '128', '256']), it('11pro', '11 Pro', ['64', '256', '512']), it('11promax', '11 Pro Max', ['64', '256', '512'])] },
    { g: 'iPhone 12', items: [it('12', '12', ['64', '128', '256']), it('12mini', '12 mini', ['64', '128', '256']), it('12pro', '12 Pro', ['128', '256', '512']), it('12promax', '12 Pro Max', ['128', '256', '512'])] },
    { g: 'iPhone 13', items: [it('13', '13', ['128', '256', '512']), it('13mini', '13 mini', ['128', '256', '512']), it('13pro', '13 Pro', ['128', '256', '512', '1TB']), it('13promax', '13 Pro Max', ['128', '256', '512', '1TB'])] },
    { g: 'iPhone 14', items: [it('14', '14', ['128', '256', '512']), it('14plus', '14 Plus', ['128', '256', '512']), it('14pro', '14 Pro', ['128', '256', '512', '1TB']), it('14promax', '14 Pro Max', ['128', '256', '512', '1TB'])] },
    { g: 'iPhone 15', items: [it('15', '15', ['128', '256', '512']), it('15plus', '15 Plus', ['128', '256', '512']), it('15pro', '15 Pro', ['128', '256', '512', '1TB']), it('15promax', '15 Pro Max', ['256', '512', '1TB'])] },
    { g: 'iPhone 16', items: [it('16e', '16e', ['128', '256', '512']), it('16', '16', ['128', '256', '512']), it('16plus', '16 Plus', ['128', '256', '512']), it('16pro', '16 Pro', ['128', '256', '512', '1TB']), it('16promax', '16 Pro Max', ['256', '512', '1TB'])] },
    { g: 'iPhone 17', items: [it('17', '17', ['256', '512']), it('17air', 'Air', ['256', '512', '1TB']), it('17pro', '17 Pro', ['256', '512', '1TB']), it('17promax', '17 Pro Max', ['256', '512', '1TB', '2TB'])] }
  ];
  root.ICLUBCanjeModelos.forEach((g) => g.items.forEach((x) => { x.n = 'iPhone ' + x.n; }));
  root.ICLUBCanjeDefaults = {
    bateria: [{ k: 'b90', l: '90–100%', d: 0 }, { k: 'b85', l: '85–89%', d: 20 }, { k: 'b80', l: '80–84%', d: 40 }, { k: 'b70', l: '70–79%', d: 70 }, { k: 'b0', l: 'Menos de 70% o "Mantenimiento"', d: 100 }],
    danos: [{ k: 'pantalla', l: 'Pantalla rota', d: 98 }, { k: 'tapa', l: 'Tapa trasera dañada / rayada', d: 35 }, { k: 'camara', l: 'Cámara dañada', d: 120 }, { k: 'faceid', l: 'Face ID no funciona', d: 100 }, { k: 'sensor', l: 'Sensor de proximidad / parlante auricular', d: 35 }, { k: 'pin', l: 'Pin de carga', d: 35 }, { k: 'vibra', l: 'No vibra', d: 15 }, { k: 'altavoz', l: 'Problemas de altavoz / parlante', d: 25 }, { k: 'botones', l: 'Botones no funcionan', d: 30 }, { k: 'selfie', l: 'Cámara selfie dañada', d: 70 }, { k: 'lente', l: 'Lente de cámara rayado', d: 25 }, { k: 'rayones', l: 'Rayones visibles (sin reparación)', d: 20 }, { k: 'senal', l: 'Señal / WiFi inestable (antena)', d: 35 }, { k: 'pieza', l: 'Pieza desconocida (cambiada)', d: 50 }]
  };
})(typeof window !== 'undefined' ? window : globalThis);
