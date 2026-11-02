// Operaciones reales en el panel (Chromium + PostgreSQL): venta contado, venta financiada con canje y referidor,
// cobros con resto, lista de precios, comisión aplicada a cuotas, inversor, catálogo, inventario y Excel.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const H=require('./e2e-harness.cjs');const {rpc}=require('./pg.cjs');
const root=path.resolve(process.env.SITE||path.join(__dirname,'..'));const shots=process.env.SHOTS||'/tmp/shots';fs.mkdirSync(shots,{recursive:true});
execFileSync(path.join(__dirname,'reset-db.sh'),['migraciones/11-red-comercial.sql'],{env:{...process.env,ROOT:root},stdio:'pipe'});
const admin=require('./e2e-seed.cjs')();const state=()=>rpc('iclub_get_state',{p_token:admin}).data;const refs=()=>rpc('iclub_ref_read',{p_token:admin}).data;const net=()=>rpc('iclub_net_read',{p_token:admin});
const saldo=c=>Math.round(c.movs.reduce((a,m)=>a-m.imp,0)*100)/100;
(async()=>{
 const srv=H.start(root);const browser=await chromium.launch();const ctx=await H.context(browser,srv.port,{viewport:{width:1360,height:900},acceptDownloads:true});
 await ctx.addInitScript(t=>{try{localStorage.setItem('iclub-session-v1',t);}catch(_){}},admin);
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const go=async h=>{await page.evaluate(x=>location.hash=x,h);await page.waitForTimeout(300);};
 const toastWait=async()=>{await page.waitForTimeout(700);};
 await page.goto('http://localhost:'+srv.port+'/gestion#vender');await page.waitForSelector('#posForm');
 // 1) Venta de contado: iPhone 13 a Lucía, efectivo.
 await page.fill('[name=prodQ]','iphone 13');await page.click('#invPick button[data-id=i1]');
 await page.fill('[name=cliQ]','lucía');await page.click('#cliPick button[data-id="3815000012"]');
 const sum1=await page.textContent('#posSummary');assert.match(sum1,/780\.000/);assert.match(sum1,/Tu ganancia estimada/);
 await page.click('[data-act=pos-confirm]');await page.waitForSelector('dialog#modal[open]');assert.match(await page.textContent('dialog#modal'),/Comprobante listo/);
 await page.screenshot({path:path.join(shots,'1-comprobante.png')});
 let d=state();assert.equal(d.inventory.find(x=>x.id==='i1').stock,2);assert.equal(saldo(d.clients['3815000012']),0);assert.equal(d.ventas.length,5);
 console.log('OK venta de contado: stock 3→2, cuenta pagada, comprobante.');
 await page.click('dialog#modal [data-close]');
 // 2) Venta financiada: cliente nuevo, canje, 6 meses +90%, referidor Álvaro con USD 10 extra.
 await go('vender');await page.click('#invPick button[data-id=i5]');
 await page.click('[data-act=pos-newclient]');await page.fill('[name="nc.name"]','Carla Díaz');await page.fill('[name="nc.phone"]','3815000030');await page.click('[data-act=pos-genpass]');
 await page.click('[data-seg=pos-mode] button[data-v=financiado]');await page.fill('[name=adel]','200000');
 await page.click('[data-seg=pos-trade] button[data-v=si]');await page.fill('[name="tr.model"]','iPhone 11');await page.fill('[name="tr.capacity"]','64 GB');await page.fill('[name="tr.battery"]','82');await page.fill('[name="tr.value"]','250000');
 await page.click('[data-act=pos-plan][data-m="6"]');
 await page.selectOption('[name=referrer]','3815000001');await page.fill('[name=extraUsd]','10');await page.waitForTimeout(200);
 const sum2=await page.textContent('#posSummary');assert.match(sum2,/6 ×/);assert.match(sum2,/USD 35/);
 await page.screenshot({path:path.join(shots,'2-venta-financiada.png'),fullPage:true});
 await page.click('[data-act=pos-confirm]');await page.waitForSelector('dialog#modal[open]');
 d=state();const carla=d.clients['3815000030'];assert(carla,'cliente nuevo creado');const plan=carla.movs.find(m=>m.finan);assert.equal(plan.finan.n,6);
 const cash=950*1500,fin=(cash-200000-250000)*1.9;assert(Math.abs(plan.finan.base-Math.ceil(fin/6*100)/100*6)<0.06);assert(d.inventory.some(x=>x.source==='Plan canje'&&x.name.includes('iPhone 11')));
 const rs=refs().sales.find(s=>s.referrer==='3815000001');assert.equal(rs.commission,35);assert.equal(rs.commissionCurrency,'USD');assert.equal(rs.linked,true);assert.equal(rs.collected,450000);
 console.log('OK venta financiada: cliente nuevo, 6 cuotas con recargo, canje al inventario, comisión USD 25+10 vinculada.');
 await page.click('dialog#modal [data-close]');
 // 3) Inicio: resto viejo de María ($416,67) → perdonar sin cobrar.
 await go('inicio');await page.click('[data-act=pay][data-phone="3815000010"]');await page.waitForSelector('#payForm');
 assert.match(await page.textContent('dialog#modal'),/416,67/);await page.click('[data-act=resto-now][data-dest=perdon]');await toastWait();
 d=state();assert.equal(saldo(d.clients['3815000010']),385833.33);assert.equal(d.clients['3815000010'].movs.at(-1).tipo,'Nota de Crédito');
 console.log('OK resto de $416,67 perdonado con nota de crédito.');
 // 4) Cobro parcial de Juan con "sumar a la próxima" y recibo por WhatsApp.
 await page.click('[data-act=pay][data-phone="3815000011"]');await page.waitForSelector('#payForm');await page.fill('#payForm [name=amount]','20000');await page.waitForTimeout(100);
 assert.equal(await page.isVisible('#restoBox'),true);await page.selectOption('#payForm [name=resto]','next');await page.click('#payForm button.btn-good');await page.waitForSelector('#rcText');
 assert.match(await page.inputValue('#rcText'),/Recibimos: \$ 20\.000/);await page.screenshot({path:path.join(shots,'3-recibo.png')});
 d=state();const jp=d.clients['3815000011'].movs.find(m=>m.finan);assert.equal(jp.finan.restos[0].destino,'next');assert.equal(jp.finan.restos[0].monto,5000);
 console.log('OK cobro parcial: resto de $5.000 pasado a la cuota siguiente y recibo listo para WhatsApp.');
 await page.click('dialog#modal [data-close]');
 // 5) Lista de precios: pegar, revisar y publicar en "Por encargo".
 await go('referidos/listas');await page.click('[data-seg=listKind] button[data-v=order]');
 await page.fill('#listText','Hola! lista de hoy\nIPHONE\niPhone 16 Pro 256GB u$s 1350\niPhone 15 128gb 💲 820\nSAMSUNG\nS24 Ultra 512GB 1250 usd\nEnvíos a todo el país');
 await page.click('[data-act=list-parse]');await page.waitForSelector('[data-act=list-publish]');await page.screenshot({path:path.join(shots,'5-lista.png'),fullPage:true});
 await page.click('[data-act=list-publish]');await toastWait();const lo=net().data.lists.order.items;assert.equal(lo.length,3);assert(lo.some(x=>x.name==='Samsung S24 Ultra'&&x.usd===1250));
 console.log('OK lista por encargo publicada: 3 equipos, saludos y envíos ignorados.');
 // 6) Comisión de Álvaro: él debe cuotas → se descuenta de sus cuotas desde la última.
 await go('referidos/ventas');await page.click('[data-act=ref-pay]');await page.waitForSelector('#refPayForm');assert.match(await page.textContent('dialog#modal'),/te debe/);
 const before=saldo(state().clients['3815000001']);await page.click('#refPayForm button.btn-good');await toastWait();
 d=state();const al=d.clients['3815000001'];const avail=Math.round(35*450000/(rs.total)*100)/100;assert.equal(Math.round((before-saldo(al))*100)/100,Math.round(avail*1500*100)/100);assert.equal(al.movs.find(m=>m.finan).finan.creditos[0].modo,'ultimas');
 console.log('OK comisión liberada (USD '+avail+') aplicada a las cuotas de Álvaro desde la última.');
 await go('cliente/3815000001');await page.screenshot({path:path.join(shots,'6-cuotas-referidor.png'),fullPage:true});assert.match(await page.textContent('.cuotas'),/comisión/);
 // 7) Inversor nuevo con aporte.
 await go('inversores');await page.click('[data-act=new-investor]');await page.fill('#investorForm [name=name]','Sofía Paz');await page.fill('#investorForm [name=phone]','3815000040');await page.fill('#investorForm [name=rate]','15');await page.fill('#investorForm [name=password]','sofia-clave-1');await page.waitForTimeout(150);assert.equal(await page.inputValue('#investorForm [name=rate]'),'15');await page.click('#investorForm button');
 await page.waitForSelector('#invMoveForm');await page.fill('#invMoveForm [name=amount]','500000');await page.click('#invMoveForm button');await toastWait();
 const n=net();assert.equal(n.data.investors['3815000040'].rate,15);assert(n.data.investorMoves.some(m=>m.phone==='3815000040'&&m.amount===500000));
 console.log('OK inversor creado al 15% con aporte de $500.000.');
 await page.click('dialog#modal [data-close]');
 // 8) Catálogo: ocultar un producto. Inventario: agregar eligiendo uno existente.
 await go('catalogo');await page.click('[data-act=cat-toggle][data-id=iphone13][data-k=hidden]');await toastWait();assert.equal(state().catalog.iphone13.hidden,true);
 await go('inventario');await page.click('[data-act=add-item]');await page.fill('#itemPickQ','poco');await page.click('#itemPick button[data-kind=inv]');await page.waitForSelector('#itemForm[data-id=i6]');await page.fill('#itemForm [name=stock]','5');await page.click('#itemForm button.btn-good');await toastWait();
 assert.equal(state().inventory.find(x=>x.id==='i6').stock,5);console.log('OK catálogo oculto y stock ajustado eligiendo un producto existente.');
 // 9) Excel completo.
 await go('finanzas');const [dl]=await Promise.all([page.waitForEvent('download'),page.click('[data-act=excel]')]);const xf=path.join(shots,'reporte.xlsx');await dl.saveAs(xf);
 const out=execFileSync('python3',['-W','error','-c',"import openpyxl,sys;wb=openpyxl.load_workbook(sys.argv[1]);print(','.join(wb.sheetnames));print(wb['Ventas'].max_row)",xf]).toString().trim().split('\n');
 assert.match(out[0],/Resumen,Ventas,Cuotas,Clientes,Cobros por mes,Equipos,Referidores,Gastos,Inventario,Inversores/);assert.equal(Number(out[1]),7);
 console.log('OK Excel: '+out[0].split(',').length+' hojas, 6 ventas.');
 // 10) Celular: Inicio en pantalla chica.
 await page.setViewportSize({width:390,height:844});await go('inicio');await page.screenshot({path:path.join(shots,'7-celular-inicio.png'),fullPage:true});
 await go('vender');await page.screenshot({path:path.join(shots,'8-celular-vender.png')});
 console.log('Errores de página:',errors.length?errors:'ninguno');await browser.close();srv.close();if(errors.length)process.exit(1);
})().catch(e=>{console.error('FALLO',e);process.exit(1);});
