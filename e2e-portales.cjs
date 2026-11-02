// Portales de referidos e inversores en Chromium + PostgreSQL real.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const H=require('./e2e-harness.cjs');const {rpc}=require('./pg.cjs');
const root=path.resolve(process.env.SITE||path.join(__dirname,'..'));const shots=process.env.SHOTS||'/tmp/shots';fs.mkdirSync(shots,{recursive:true});
execFileSync(path.join(__dirname,'reset-db.sh'),['migraciones/11-red-comercial.sql'],{env:{...process.env,ROOT:root},stdio:'pipe'});
const admin=require('./e2e-seed.cjs')();
// Álvaro gana 5% y tiene una venta financiada vinculada con comisión ya aplicada a sus cuotas.
let n=rpc('iclub_net_read',{p_token:admin});rpc('iclub_net_change',{p_token:admin,p_revision:n.revision,p_action:'member_settings',p_item:{id:'3815000001',mode:'percent',percent:5,allowExtra:true}});
let s=rpc('iclub_get_state',{p_token:admin});const d=s.data;d.clients['3815000012'].movs.push({f:'20/10/2026',tipo:'Compra',doc:'FA 0004-00000070',imp:-900000,grp:'v7',estado:'FINANCIADA',finan:{n:3,freq:'Mensual',base:900000,exact:true}},{f:'20/10/2026',tipo:'Pago',doc:'RC 0002-00000070',imp:300000,grp:'v7',adel:true,met:'Efectivo'});d.ventas.push({id:'v7',name:'iPhone 14 Pro',fecha:'20/10/2026',ventaArs:900000,cashArs:700000,costoArs:600000,clientKey:'3815000012',fin:true,invoice:'FA 0004-00000070',delivered:true});
rpc('iclub_checkout_ref',{p_token:admin,p_data:d,p_expected_version:s.version,p_revision:rpc('iclub_ref_read',{p_token:admin}).revision,p_ref:{id:'v7',referrer:'3815000001',total:900000,extraUsd:0,label:'iPhone 14 Pro',client:'Lucía',delivered:true,financed:true}});
s=rpc('iclub_get_state',{p_token:admin});rpc('iclub_ref_apply_cuotas',{p_token:admin,p_revision:rpc('iclub_ref_read',{p_token:admin}).revision,p_expected_version:s.version,p_item:{saleId:'v7',amount:15000,mode:'ultimas',planDoc:'FA 0004-00000050'}});
(async()=>{
 const srv=H.start(root);const browser=await chromium.launch();const base='http://localhost:'+srv.port;const errors=[];
 // Referidor
 let ctx=await H.context(browser,srv.port,{viewport:{width:1280,height:900},permissions:['clipboard-read','clipboard-write']});let page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:base});
 await page.goto(base+'/referidos');await page.fill('#loginForm [name=phone]','3815000001');await page.fill('#loginForm [name=password]','alvaro-clave-1');await page.click('#loginForm button');
 await page.waitForSelector('.page-head h1');assert.match(await page.textContent('.page-head'),/Hola, Álvaro/);assert.match(await page.textContent('.page-head'),/5%/);
 assert.match(await page.textContent('#app'),/Descontado de tus cuotas/);
 await page.screenshot({path:path.join(shots,'r1-disponible.png'),fullPage:true});
 await page.fill('[data-ui=extra]','15');await page.waitForTimeout(400);await page.click('[data-act=copy-list]');await page.waitForTimeout(300);
 const clip=await page.evaluate(()=>navigator.clipboard.readText());assert.match(clip,/iPhone 13 128 GB — USD 535/);assert.match(clip,/Disponibles ahora/);
 await page.click('[data-act=quote]');await page.waitForSelector('dialog#modal[open]');const q=await page.textContent('dialog#modal');assert.match(q,/Te conviene más/);await page.screenshot({path:path.join(shots,'r2-cotizador.png')});
 await page.click('[data-act=copy-quote]');await page.waitForTimeout(300);assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/Contado: USD/);await page.click('dialog#modal [data-close]');
 await page.click('[data-tab=ventas]');assert.match(await page.textContent('#app'),/iPhone 14 Pro/);await page.screenshot({path:path.join(shots,'r3-ventas.png'),fullPage:true});
 await page.click('[data-tab=cuotas]');assert.match(await page.textContent('#app'),/por tu comisión/);await page.screenshot({path:path.join(shots,'r4-cuotas.png'),fullPage:true});
 const act=rpc('iclub_net_read',{p_token:admin}).activity.filter(a=>a.phone==='3815000001').map(a=>a.kind);assert(act.includes('login')&&act.includes('copy_list')&&act.includes('quote')&&act.includes('copy_quote'));
 assert.equal(rpc('iclub_net_read',{p_token:admin}).activity.find(a=>a.kind==='copy_list').detail.extraUsd,15);
 console.log('OK portal referidor: ingreso, lista con +USD 15 copiada, cotizador con la opción que más le conviene, ventas, cuotas con descuento y actividad registrada.');
 await page.setViewportSize({width:390,height:844});await page.click('[data-tab=stock]');await page.screenshot({path:path.join(shots,'r5-celular.png'),fullPage:true});await ctx.close();
 // Inversor
 ctx=await H.context(browser,srv.port,{viewport:{width:1280,height:900}});page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/inversores');await page.fill('#loginForm [name=phone]','3815000020');await page.fill('#loginForm [name=password]','martin-clave-1');await page.click('#loginForm button');
 await page.waitForSelector('.page-head h1');const t=await page.textContent('#app');assert.match(t,/Hola, Martín/);assert.match(t,/\$ 1\.000\.000/);assert.match(t,/\$ 200\.000/);assert.match(t,/iPhone 14/);assert.match(t,/María/);assert.doesNotMatch(t,/Gómez/);
 await page.screenshot({path:path.join(shots,'i1-inversor.png'),fullPage:true});
 // Un referidor no entra al portal de inversores con datos ajenos.
 console.log('OK portal inversor: capital, ganancia mensual, venta financiada con su dinero (solo nombre de pila del cliente) y simulador.');
 await ctx.close();
 console.log('Errores de página:',errors.length?errors:'ninguno');await browser.close();srv.close();if(errors.length)process.exit(1);
})().catch(e=>{console.error('FALLO',e);process.exit(1);});
