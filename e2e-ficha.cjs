// Inicio con widgets, Ajustes y ficha completa del cliente (herramientas del portal anterior) en Chromium + PostgreSQL real.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const H=require('./e2e-harness.cjs');const {rpc}=require('./pg.cjs');
const root=path.resolve(process.env.SITE||path.join(__dirname,'..'));const shots=process.env.SHOTS||'/tmp/shots';fs.mkdirSync(shots,{recursive:true});
execFileSync(path.join(__dirname,'reset-db.sh'),['migraciones/11-red-comercial.sql'],{env:{...process.env,ROOT:root},stdio:'pipe'});
const admin=require('./e2e-seed.cjs')();const st=()=>rpc('iclub_get_state',{p_token:admin}).data;const hoy=new Date(),isoHoy=hoy.toISOString().slice(0,10),arHoy=isoHoy.split('-').reverse().join('/');const saldo=c=>Math.round(c.movs.reduce((a,m)=>a-m.imp,0)*100)/100;
(async()=>{
 const srv=H.start(root);const browser=await chromium.launch();const ctx=await H.context(browser,srv.port,{viewport:{width:1360,height:900},acceptDownloads:true});
 await ctx.addInitScript(t=>{try{localStorage.setItem('iclub-session-v1',t);}catch(_){}},admin);
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const go=async h=>{await page.evaluate(x=>location.hash=x,h);await page.waitForTimeout(300);};const wait=()=>page.waitForTimeout(700);
 await page.goto('http://localhost:'+srv.port+'/gestion#inicio');await page.waitForSelector('.dash');
 // Inicio: widgets por defecto, calendario y tareas.
 for(const w of ['kpis','calendario','tareas','atrasados','topRef','stock','interesados'])assert(await page.$('[data-w='+w+']'),'falta widget '+w);
 await page.screenshot({path:path.join(shots,'a-inicio.png'),fullPage:true});
 await page.click('[data-act=cal-move][data-d="1"]');await page.click('.cal-d.has');await page.waitForTimeout(200);assert.match(await page.textContent('[data-w=calendario]'),/cuota/);
 await page.click('[data-seg=calFreq] button[data-v=weekly]');await page.waitForTimeout(200);assert.doesNotMatch(await page.textContent('[data-w=calendario] .list'),/María/);
 await page.fill('#taskForm [name=t]','Llamar a Juan por la cuota');await page.click('#taskForm button');await wait();assert.equal(st().panel.tareas[0].t,'Llamar a Juan por la cuota');
 await page.check('[data-act-task=toggle]');await wait();assert.equal(st().panel.tareas[0].done,true);
 await page.click('[data-act=dash-edit]');await page.uncheck('#dashForm input[value=interesados]');await page.check('#dashForm input[value=visitas]');await page.click('#dashForm button.btn-good');await wait();
 const w=st().panel.widgets;assert(!w.includes('interesados')&&w.includes('visitas'));console.log('OK inicio: widgets elegibles, calendario con filtro semanal/mensual y tareas guardadas.');
 // Ajustes.
 await go('ajustes');await page.fill('#rateForm [name=rate]','1600');await page.waitForTimeout(150);assert.match(await page.textContent('#rateImpact'),/\+7%/);await page.click('#rateForm button');await wait();assert.equal(st().settings.rate,1600);
 await page.fill('#recForm [name=r6]','100');await page.fill('#recForm [name=newM]','24');await page.click('#recForm button.btn-good');await wait();let s=st().settings;assert.equal(s.recargos['6'],100);assert.equal(s.recargos['24'],0);assert.equal(s.recargos['12'],150);
 await page.fill('#tjForm [name=t3]','35');await page.click('#tjForm button.btn-good');await wait();assert.equal(st().settings.tarjeta['3'],35);assert.equal(st().settings.tarjeta['2'],27.675,'27,675% no se convierte en 27675%');
 await page.fill('#moraForm [name=mora]','0,5');await page.click('#moraForm button');await wait();assert.equal(st().settings.mora,'0,5');
 await page.screenshot({path:path.join(shots,'b-ajustes.png'),fullPage:true});
 const pub=JSON.parse(execFileSync('psql',['-h','/tmp','-p','5433','-U','postgres','-d','iclub','-tAc',"select data->'settings' from public.storefront_state"]).toString());assert.equal(pub.rate,1600);
 console.log('OK ajustes: dólar con impacto (+7%), recargos (6 meses 100%, nuevo plan 24), tarjeta, mora; la página pública toma el dólar nuevo.');
 // Ficha de María: fechas, pago combinado sin interés, editar pago, recargo y contado, contrato.
 await go('cliente/3815000010');assert.match(await page.textContent('#view'),/mora/);
 await page.click('[data-act=cuota-date][data-i="1"]');await page.fill('#datesForm [name=d1]','2026-12-05');await page.click('#datesForm button.btn-good');await wait();
 let pm=st().clients['3815000010'].movs.find(m=>m.finan);assert.equal(pm.finan.vencs['1'],'05/12/2026');assert.equal(pm.finan.vencs['2'],'05/01/2027');
 await page.click('[data-act=plan-rec]');await page.fill('#recPlanForm [name=rec]','30');await page.click('#recPlanForm button');await wait();assert.equal(st().clients['3815000010'].movs.find(m=>m.finan).finan.rec,30);
 const before=saldo(st().clients['3815000010']);await page.click('[data-act=plan-contado]');await wait();let c=st().clients['3815000010'];assert(c.movs.some(m=>m.auto==='rec'),'nota de crédito por recargo');assert(saldo(c)<before);
 await page.click('[data-act=plan-contado]');await wait();assert(!st().clients['3815000010'].movs.some(m=>m.auto==='rec'),'volver a financiado quita la NC');
 const [pdf]=await Promise.all([page.waitForEvent('download'),page.click('[data-act=plan-pdf]')]);assert.match(pdf.suggestedFilename(),/contrato/);
 await page.click('.page-head [data-act=pay]');await page.waitForSelector('#payForm');await page.selectOption('#payForm [name=method]','Combinado');await page.fill('#payForm [name=amount]','150000');await page.fill('#payForm [name=efec]','100000');await page.fill('#payForm [name=transf]','50000');await page.waitForTimeout(100);
 await page.click('#payForm button.btn-good');await page.waitForSelector('#rcText');c=st().clients['3815000010'];const pg=c.movs.filter(m=>m.tipo==='Pago').at(-1);assert.match(pg.met,/Combinado \(efectivo \$ 100\.000 \+ transferencia \$ 50\.000\)/);await page.click('dialog#modal [data-close]');
 await go('cliente/3815000010/pagos');await page.screenshot({path:path.join(shots,'c-pagos.png'),fullPage:true});
 await page.click('[data-act=pay-edit]');await page.fill('#payEditForm [name=imp]','140000');await page.fill('#payEditForm [name=efec]','90000');await page.fill('#payEditForm [name=transf]','50000');await page.fill('#payEditForm [name=f]',isoHoy);await page.click('#payEditForm button');await page.waitForFunction(()=>/Pago actualizado/.test((document.querySelector('#toast')||{}).textContent||''));
 c=st().clients['3815000010'];assert(c.movs.some(m=>m.tipo==='Pago'&&m.imp===140000&&m.f===arHoy&&m.efec===90000&&m.transf===50000));console.log('OK ficha: fechas de cuotas corridas, recargo y pasar a contado con nota de crédito, contrato PDF, pago combinado y pago editado.');
 // Comprobantes y datos.
 await go('cliente/3815000010/comprobantes');await page.click('[data-act=doc-send]');await page.waitForSelector('#docText');assert.match(await page.inputValue('#docText'),/ICLUB/);await page.click('dialog#modal [data-close]');
 await go('cliente/3815000010/datos');await page.fill('#clientFull [name=cuit]','27-12345678-9');await page.fill('#clientFull [name=lim]','800000');await page.click('#clientFull button');await wait();c=st().clients['3815000010'];assert.equal(c.cuit,'27-12345678-9');assert.equal(c.lim,800000);
 // Compras: deshacer la compra de Lucía (stock vuelve) y compra manual en cuotas para Juan.
 const stockAntes=st().inventory.length;await go('cliente/3815000012/compras');await page.screenshot({path:path.join(shots,'d-compras.png'),fullPage:true});await page.click('[data-act=undo-buy]');await wait();
 const d=st();assert.equal(d.clients['3815000012'].movs.length,0);assert(!d.ventas.some(v=>v.id==='v3'));
 await go('cliente/3815000011/compras');await page.click('[data-act=manual-buy]');await page.fill('#manualBuyForm [name=det]','Funda + vidrio');await page.fill('#manualBuyForm [name=amount]','30000');await page.click('[data-seg=mbType] button[data-v=cuotas]');await page.fill('#manualBuyForm [name=n]','2');await page.fill('#manualBuyForm [name=rec]','25');await page.waitForFunction(()=>/2 cuotas/.test(document.querySelector('#mbHint').textContent));assert.match(await page.textContent('#mbHint'),/2 cuotas/);
 await page.click('#manualBuyForm button.btn-good');await wait();const jb=st().clients['3815000011'].movs.find(m=>m.prodName==='Funda + vidrio');assert.equal(jb.finan.n,2);assert.equal(jb.finan.base,37500);
 console.log('OK compras: deshacer compra (sale del registro), compra manual en cuotas con recargo, comprobantes por WhatsApp y datos completos del cliente.');
 // Cotización rápida y CSV.
 await go('inventario');await page.click('[data-act=quick-quote]');await page.selectOption('#qqForm [name=equipo]',{index:1});await page.waitForTimeout(200);assert.match(await page.inputValue('#qqText'),/Contado: USD/);assert.match(await page.inputValue('#qqText'),/Con tarjeta/);await page.click('dialog#modal [data-close]');
 await go('finanzas');const [csv]=await Promise.all([page.waitForEvent('download'),page.click('[data-act=csv]')]);const cp=path.join(shots,'mov.csv');await csv.saveAs(cp);assert.match(fs.readFileSync(cp,'utf8'),/Combinado/);
 console.log('OK cotización rápida (contado, plan propio y tarjeta) y CSV de movimientos del mes.');
 console.log('Errores de página:',errors.length?errors:'ninguno');await browser.close();srv.close();if(errors.length)process.exit(1);
})().catch(e=>{console.error('FALLO',e);process.exit(1);});
