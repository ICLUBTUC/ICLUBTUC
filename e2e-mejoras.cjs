// Mejoras de la auditoría: historial de cambios, confirmación ante corte de red, movimientos de stock, IMEI, devolución y estado del sistema.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const H=require('./e2e-harness.cjs');const {rpc}=require('./pg.cjs');
const root=path.resolve(process.env.SITE||path.join(__dirname,'..'));const shots=process.env.SHOTS||'/tmp/shots';fs.mkdirSync(shots,{recursive:true});
execFileSync(path.join(__dirname,'reset-db.sh'),['migraciones/11-red-comercial.sql','migraciones/12-mejoras-auditoria.sql'],{env:{...process.env,ROOT:root},stdio:'pipe'});
const admin=require('./e2e-seed.cjs')();const st=()=>rpc('iclub_get_state',{p_token:admin}).data;const saldo=c=>Math.round(c.movs.reduce((a,m)=>a-m.imp,0)*100)/100;
(async()=>{
 const srv=H.start(root);const browser=await chromium.launch();const ctx=await H.context(browser,srv.port,{viewport:{width:1360,height:900},acceptDownloads:true});
 await ctx.addInitScript(t=>{try{localStorage.setItem('iclub-session-v1',t);}catch(_){}},admin);
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const go=async h=>{await page.evaluate(x=>location.hash=x,h);await page.waitForTimeout(300);};const wait=()=>page.waitForTimeout(700);
 const toast=re=>page.waitForFunction(r=>new RegExp(r).test((document.querySelector('#toast')||{}).textContent||''),re.source,{timeout:8000});
 await page.goto('http://localhost:'+srv.port+'/gestion#inventario');await page.waitForSelector('#view .item');
 // 1) Stock +1 queda en el historial de stock y en el historial de cambios.
 await page.click('[data-act=stock][data-id=i3][data-d="1"]');await wait();let d=st();
 assert.equal(d.inventory.find(x=>x.id==='i3').stock,5);const mv=d.stockMoves.at(-1);assert.equal(mv.item,'i3');assert.equal(mv.delta,1);assert.match(d.bitacora.at(-1).desc,/Redmi A5: 4 → 5/);
 // 2) IMEI: cargar 2 IMEI al iPhone 14 Pro (stock 2) y venderlo eligiendo la unidad.
 await page.click('[data-act=edit-item][data-id=i5]');await page.fill('#itemForm [name=imeis]','356000000000001\n356000000000002');await page.click('#itemForm button.btn-good, #itemForm button[type=submit], #itemForm > button');await wait();
 d=st();assert.deepEqual(d.inventory.find(x=>x.id==='i5').imeis,['356000000000001','356000000000002']);
 await go('vender');await page.fill('[name=prodQ]','14 pro');await page.click('#invPick button[data-id=i5]');await page.fill('[name=cliQ]','lucía');await page.click('#cliPick button[data-id="3815000012"]');
 await page.waitForTimeout(300);assert(await page.$eval('[data-act=pos-confirm]',b=>b.disabled),'sin IMEI no deja confirmar');assert.match(await page.textContent('#posSummary'),/IMEI/);
 await page.selectOption('#posForm [name=imei]','356000000000002');await page.click('[data-act=pos-confirm]');await page.waitForSelector('dialog#modal[open]');await page.click('dialog#modal [data-close]');
 d=st();const it5=d.inventory.find(x=>x.id==='i5');assert.equal(it5.stock,1);assert.deepEqual(it5.imeis,['356000000000001']);const venta=d.ventas.at(-1);assert.equal(venta.itemSnapshot.imei,'356000000000002');
 assert(d.stockMoves.some(m=>m.item==='i5'&&m.delta===-1&&m.imei==='356000000000002'&&m.motivo==='Venta'));assert.match(d.bitacora.at(-1).desc,/Venta .*iPhone 14 Pro/);
 console.log('OK stock: +1 con historial, IMEI cargados, la venta exige elegir la unidad y queda en el comprobante.');
 // 3) Devolución de esa venta: vuelve al stock con su IMEI, reintegro y la venta queda "Devuelta".
 await go('cliente/3815000012/compras');const pagado=st().clients['3815000012'].movs.filter(m=>m.tipo==='Pago'&&m.grp===venta.id).reduce((a,m)=>a+m.imp,0);
 await page.click('[data-act=devolucion]');await page.waitForSelector('#devForm');await page.fill('#devForm [name=ret]','50000');await page.waitForTimeout(150);assert.match(await page.textContent('#devHint'),/Le devolvés/);
 await page.screenshot({path:path.join(shots,'m-devolucion.png')});await page.click('#devForm button.btn-good');await toast(/Devolución registrada/);
 d=st();const c=d.clients['3815000012'];assert.equal(saldo(c),0,'cuenta en cero tras devolución');const ri=c.movs.find(m=>m.tipo==='Reintegro');assert.equal(-ri.imp,pagado-50000);
 assert(c.movs.some(m=>m.auto==='devolucion'));assert.equal(d.ventas.find(v=>v.id===venta.id).devolucion.retencion,50000);
 const it5b=d.inventory.find(x=>x.id==='i5');assert.equal(it5b.stock,2);assert(it5b.imeis.includes('356000000000002'));assert.equal(d.stockMoves.at(-1).motivo,'Devolución');
 assert.match(await page.textContent('#view'),/Devuelta/);await go('ventas');assert.match(await page.textContent('#view'),/Devuelta/);
 console.log('OK devolución: nota de crédito, reintegro (pagado − retención), equipo e IMEI vuelven al stock, venta "Devuelta".');
 // 4) Devolución de un plan en cuotas (María): el plan queda cancelado y sin cuotas atrasadas.
 await go('cliente/3815000010/compras');await page.click('[data-act=devolucion]');await page.waitForSelector('#devForm');await page.click('#devForm button.btn-good');await toast(/Devolución registrada/);
 d=st();const pm=d.clients['3815000010'].movs.find(m=>m.finan);assert(pm.finan.cancelada);
 const P=await page.evaluate(()=>{const c=ICA.db.clients['3815000010'];const pm=c.movs.find(m=>m.finan);const r=ICLUBCollectionPlan._planCalc(c,pm);return {pend:r.cuotas.filter(q=>!q.done).length};});assert.equal(P.pend,0);
 console.log('OK devolución de un plan: queda cancelado, no genera atrasos.');
 // 5) Corte de red: el servidor guarda pero la respuesta no llega → el panel confirma que SÍ quedó guardada.
 await go('inventario');await page.route('**/__rpc/iclub_save_state',async r=>{await r.fetch();await r.abort('failed');},{times:1});
 await page.click('[data-act=stock][data-id=i6][data-d="1"]');await toast(/SÍ quedó guardada/);assert.equal(st().inventory.find(x=>x.id==='i6').stock,3);
 await page.route('**/__rpc/iclub_save_state',r=>r.abort('failed'),{times:1});await page.click('[data-act=stock][data-id=i6][data-d="1"]');await toast(/NO se guardó/);assert.equal(st().inventory.find(x=>x.id==='i6').stock,3);
 console.log('OK corte de red: distingue "sí quedó guardada" de "no se guardó".');
 // 5b) Cliente referido: vincular la compra de Juan a Álvaro, cobrar desde el Inicio y la ganancia del referidor sube sola.
 const refs=()=>rpc('iclub_ref_read',{p_token:admin}).data;
 await go('cliente/3815000011/compras');await page.click('[data-act=ref-link]');await page.waitForSelector('#refLinkForm');await page.selectOption('#refLinkForm [name=referrer]','3815000001');await page.click('#refLinkForm button.btn-good');await toast(/Compra vinculada/);
 let rs=refs().sales.find(x=>x.id==='v2');assert(rs&&rs.linked,'venta v2 vinculada');const antes=rs.collected;assert.equal(st().clients['3815000011'].ref,'3815000001');
 assert.match(await page.textContent('#view'),/Referido: Álvaro/);
 await go('inicio');assert(await page.$('#qpQ'),'registrar pago en el inicio');await page.fill('#qpQ','juan');await page.waitForTimeout(200);
 await page.screenshot({path:path.join(shots,'o-cobro-inicio.png')});
 await page.click('#qpRes [data-act=pay][data-phone="3815000011"]');await page.waitForSelector('#payForm');await page.fill('#payForm [name=amount]','10000');await page.fill('#payForm [name=by]','Leo');await page.click('#payForm button.btn-good');await page.waitForSelector('#rcText');{const pg=st().clients['3815000011'].movs.filter(m=>m.tipo==='Pago').at(-1);assert.equal(pg.by,'Leo');assert(pg.at,'hora del cobro');assert.deepEqual(st().panel.cobradores,['Leo']);}
 await toast(/Ganancia de Álvaro/);rs=refs().sales.find(x=>x.id==='v2');assert.equal(rs.collected,antes+10000,'el pago suma solo a la ganancia del referidor');await page.click('dialog#modal [data-close]');
 await go('vender');await page.fill('[name=cliQ]','juan');await page.click('#cliPick button[data-id="3815000011"]');await page.waitForTimeout(200);assert.equal(await page.inputValue('#posForm [name=referrer]'),'3815000001','la venta nueva ya trae al referidor');
 await page.evaluate(()=>{ICA.pos.reset();});
 console.log('OK cliente referido: compra vinculada, cobro desde el Inicio y la ganancia del referidor se actualiza sola; la venta nueva ya trae al referidor.');
 // 5c) Comprobantes en PDF: recibo de pago, compra y estado de cuenta.
 await go('cliente/3815000011/comprobantes');for(const [sel,re] of [['tr:has-text("Pago") [data-act=doc-pdf]:not([data-share])',/Comprobante de pago RC/],['tr:has-text("Compra") [data-act=doc-pdf]:not([data-share])',/Comprobante FA/],['[data-act=acc-pdf]:not([data-share])',/Estado de cuenta Juan Perez/]]){const [dl]=await Promise.all([page.waitForEvent('download'),page.click(sel)]);assert.match(dl.suggestedFilename(),re);const fp=path.join(shots,'t.pdf');await dl.saveAs(fp);assert.equal(fs.readFileSync(fp).subarray(0,4).toString(),'%PDF');}
 await go('cliente/3815000011/pagos');const [rp]=await Promise.all([page.waitForEvent('download'),page.waitForEvent('popup'),page.click('[data-act=doc-pdf][data-share]')]);assert.match(rp.suggestedFilename(),/Comprobante de pago/);
 await go('ajustes');await page.fill('#bizForm [name=wa]','381 555-1234');await page.click('#bizForm button.btn-good');await page.waitForTimeout(700);assert.equal(st().settings.biz.wa,'381 555-1234');
 console.log('OK comprobantes PDF: recibo, compra y estado de cuenta; "Enviar PDF" descarga y abre WhatsApp en la PC; datos del negocio en Ajustes.');
 // 6) Respaldo: historial de cambios y estado del sistema.
 await go('respaldo');assert.match(await page.textContent('#view'),/Historial de cambios/);assert.match(await page.textContent('#view'),/Devolución de/);
 await page.click('[data-act=diag]');await page.waitForFunction(()=>/PDF/.test(document.querySelector('#diagOut').textContent),null,{timeout:15000});const dg=await page.textContent('#diagOut');
 assert.match(dg,/versión 12/);assert.match(dg,/Red comercial/);assert.match(dg,/Generador de Excel/);await page.screenshot({path:path.join(shots,'n-estado.png'),fullPage:true});
 // 7) Finanzas: ganancia cobrada / por cobrar.
 await go('finanzas');assert.match(await page.textContent('#view'),/ya cobrada/);
 for(const [k,re] of [['vendido',/Total vendido[\s\S]*Contado \(/],['ganancia',/Ganancia neta[\s\S]*Ganancia por venta/],['cobrado',/Total/],['porCobrar',/Juan Pérez[\s\S]*Cobrar/],['atrasado',/Total atrasado/],['ticket',/General[\s\S]*Cada venta/],['gastos',/Gastos y comisiones/]]){await page.click('[data-act=fin-detail][data-k='+k+']');await page.waitForSelector('dialog#modal[open]');assert.match(await page.textContent('dialog#modal'),re,'detalle '+k);if(k==='vendido'){await page.click('dialog#modal [data-act=fin-tab][data-k=fin]');assert.equal(await page.$eval('dialog#modal [data-act=fin-tab][data-k=fin]',b=>b.classList.contains('on')),true);assert.equal(await page.$eval('dialog#modal [data-act=fin-tab][data-k=todas]',b=>b.classList.contains('on')),false);await page.screenshot({path:path.join(shots,'u-fin-detalle.png')});}await page.click('dialog#modal [data-close]');}
assert.match(await page.textContent('#view'),/devoluciones/);
 console.log('OK respaldo: historial de cambios y estado del sistema (versión 12); finanzas separa ganancia cobrada y por cobrar.');
 console.log('Errores de página:',errors.length?errors:'ninguno');await browser.close();srv.close();if(errors.length)process.exit(1);
})().catch(e=>{console.error('FALLO',e);process.exit(1);});
