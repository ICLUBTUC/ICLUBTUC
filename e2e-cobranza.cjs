// Cobranza inteligente: puntaje (solo admin), recordatorios 0 invasivos y oportunidades de venta.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const H=require('./e2e-harness.cjs');const {rpc}=require('./pg.cjs');
const root=path.resolve(process.env.SITE||path.join(__dirname,'..'));const shots=process.env.SHOTS||'/tmp/shots';fs.mkdirSync(shots,{recursive:true});
execFileSync(path.join(__dirname,'reset-db.sh'),['migraciones/11-red-comercial.sql','migraciones/12-mejoras-auditoria.sql'],{env:{...process.env,ROOT:root},stdio:'pipe'});
const admin=require('./e2e-seed.cjs')();const st=()=>rpc('iclub_get_state',{p_token:admin}).data;
const day=(n)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();};
// Pedro: se atrasa siempre y tiene una cuota que vence mañana. Sofía: paga siempre a tiempo y le falta 1 cuota.
{const s=rpc('iclub_get_state',{p_token:admin});const d=s.data;
 d.clients['3815000050']={name:'Pedro Atrasado',pass:'pedro-clave-1',movs:[{f:day(-20),tipo:'Compra',doc:'FA 0004-00000080',prodName:'Moto G24',imp:-90000,finan:{n:3,freq:'Semanal',base:90000,exact:true}},{f:day(-5),tipo:'Pago',doc:'RC 0002-00000080',imp:30000,plan:'FA 0004-00000080',met:'Efectivo'},{f:day(-1),tipo:'Pago',doc:'RC 0002-00000081',imp:30000,plan:'FA 0004-00000080',met:'Efectivo'}]};
 d.clients['3815000051']={name:'Sofía Puntual',pass:'sofia-clave-01',movs:[{f:day(-27),tipo:'Compra',doc:'FA 0004-00000090',prodName:'iPhone 13',imp:-400000,finan:{n:4,freq:'Semanal',base:400000,exact:true}},...[-20,-13,-6].map((k,i)=>({f:day(k),tipo:'Pago',doc:'RC 0002-0000009'+i,imp:100000,plan:'FA 0004-00000090',met:'Transferencia'}))]};
 assert.equal(rpc('iclub_save_state',{p_token:admin,p_data:d,p_expected_version:s.version}).ok,true);}
(async()=>{
 const srv=H.start(root);const browser=await chromium.launch();const ctx=await H.context(browser,srv.port,{viewport:{width:1360,height:900}});
 await ctx.addInitScript(t=>{try{localStorage.setItem('iclub-session-v1',t);}catch(_){}},admin);await ctx.route(/wa\.me|whatsapp\.com/,r=>r.fulfill({status:200,contentType:'text/html',body:'ok'}));
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const go=async h=>{await page.evaluate(x=>location.hash=x,h);await page.waitForTimeout(300);};const wait=()=>page.waitForTimeout(800);
 await page.goto('http://localhost:'+srv.port+'/gestion#inicio');await page.waitForSelector('.dash');
 const sc=await page.evaluate(()=>({p:ICA.score('3815000050'),s:ICA.score('3815000051'),l:ICA.score('3815000012')}));
 assert.equal(sc.p.label,'Riesgoso');assert.equal(sc.s.label,'Excelente');assert.equal(sc.l.label,'Sin historial');
 // Recordatorios: Pedro sí (se atrasa, vence mañana), Sofía no (paga a tiempo).
 let rem=await page.textContent('[data-w=recordatorios]');assert.match(rem,/Pedro Atrasado/);assert.doesNotMatch(rem,/Sofía/);assert.match(rem,/mañana/);
 const msg=await page.evaluate(()=>ICA.remText(ICA.reminders().find(r=>r.phone==='3815000050')));assert.match(msg,/Hola Pedro! Te recordamos que mañana vence tu cuota 3 de 3 de Moto G24: \$ 30\.000/);assert.match(msg,/ICLUBTUC/);
 // Oportunidades: Sofía (buena pagadora, le falta 1 cuota); Pedro no.
 let op=await page.textContent('[data-w=oportunidades]');assert.match(op,/Sofía Puntual/);assert.doesNotMatch(op,/Pedro/);assert.match(op,/le falta 1 cuota/);
 await page.screenshot({path:path.join(shots,'p-cobranza-inicio.png'),fullPage:true});
 // Enviar recordatorio: abre WhatsApp, queda marcado y no se repite.
 const [pop]=await Promise.all([page.waitForEvent('popup'),page.click('[data-act=rem-send][data-phone="3815000050"]')]);assert.match(decodeURIComponent(pop.url()),/Hola Pedro/);await pop.close();await wait();
 assert(Object.keys(st().panel.recordados).some(k=>k.startsWith('3815000050|FA 0004-00000080|3')));rem=await page.textContent('[data-w=recordatorios]');assert.doesNotMatch(rem,/Pedro/);
 // Ofrecer renovar: abre WhatsApp, queda como contactado.
 const [pop2]=await Promise.all([page.waitForEvent('popup'),page.click('[data-act=op-send][data-phone="3815000051"]')]);assert.match(decodeURIComponent(pop2.url()),/Estás por terminar de pagar tu iPhone 13/);await pop2.close();await wait();
 assert.equal(st().panel.oportunidades['3815000051'].estado,'contactado');assert.doesNotMatch(await page.textContent('[data-w=oportunidades]'),/Sofía/);assert.match(await page.textContent('[data-w=oportunidades]'),/1 contactados/);
 console.log('OK recordatorios: solo a quien se atrasa, un aviso por cuota que no se repite; oportunidades: ofrecer renovar a buenos pagadores.');
 // Si paga, sale de la lista (aunque no se haya enviado).
 await page.evaluate(async()=>{const n=ICA.clone(ICA.db);delete n.panel.recordados;await ICA.saveDb(n);ICA.render();});await wait();assert.match(await page.textContent('[data-w=recordatorios]'),/Pedro/);
 {const s=rpc('iclub_get_state',{p_token:admin});const d=s.data;d.clients['3815000050'].movs.push({f:day(0),tipo:'Pago',doc:'RC 0002-00000082',imp:30000,plan:'FA 0004-00000080',met:'Efectivo'});rpc('iclub_save_state',{p_token:admin,p_data:d,p_expected_version:s.version});}
 await page.click('[data-act=reload]').catch(()=>{});await page.waitForTimeout(1200);await go('ventas');await go('inicio');assert.doesNotMatch(await page.textContent('[data-w=recordatorios]'),/Pedro/,'si pagó sale solo de la lista');
 // Ficha: puntaje con motivos, solo admin; pausar recordatorios.
 await go('cliente/3815000050');let v=await page.textContent('#view');assert.match(v,/Puntaje del cliente/);assert.match(v,/Solo lo ves vos/);assert.match(v,/Sugerencia para financiar/);
 await page.check('[data-act-norec="3815000050"]');await wait();assert.equal(st().clients['3815000050'].noRecordar,true);
 await page.screenshot({path:path.join(shots,'q-puntaje.png'),fullPage:true});
 // El puntaje no se guarda en los datos del cliente (no puede llegar al portal).
 assert(!JSON.stringify(st().clients['3815000050']).match(/score|puntaje|Riesgoso/i));
 // Punto de venta: sugerencia al elegir el cliente.
 await go('vender');await page.fill('[name=cliQ]','sofía');await page.click('#cliPick button[data-id="3815000051"]');await page.waitForTimeout(200);assert.match(await page.textContent('#posForm'),/Excelente · \d+/);assert.match(await page.textContent('#posForm'),/sin adelanto mínimo/);
 // Lista de clientes con chip de puntaje.
 await go('clientes');assert.match(await page.textContent('#view'),/Sofía Puntual Excelente/);assert.match(await page.textContent('#view'),/María Gómez Riesgoso/,'con una cuota vencida ya no es "sin historial"');
 // Ajustes: cambiar días y texto.
 await go('ajustes');await page.selectOption('#cobranzaForm [name=dias]','2');await page.fill('#cobranzaForm [name=texto]','Hola {nombre}, {cuando} vence tu cuota {cuota}.');await page.click('#cobranzaForm button.btn-good');await wait();assert.equal(st().settings.recordatorios.dias,2);
 console.log('OK puntaje: Riesgoso/Excelente/Sin historial con motivos, solo en el panel; si paga sale de la lista; pausar recordatorios; sugerencia al vender; ajustes.');
 // Cierre de caja semanal (por defecto) con diferencia, PDF e historial; cambiar a mensual.
 await ctx.route(/__never__/,r=>r.continue());
 await go('caja');let cv=await page.textContent('#view');assert.match(cv,/Cierre de caja/);assert.match(cv,/Semana del/);
 const calc=await page.evaluate(()=>{const r=ICA.cajaRange(0);return ICA.cajaCalc(r);});assert(calc.n>=1,'hay cobros en la semana');
 const esperado=Number(await page.getAttribute('#cajaCloseForm','data-esperado'));await page.fill('#cajaCloseForm [name=contado]',String(esperado-2000));await page.waitForTimeout(150);assert.match(await page.textContent('#cajaDif'),/Faltan/);
 await page.fill('#cajaCloseForm [name=nota]','Faltan 2000 de cambio');await page.click('#cajaCloseForm button.btn-good');await page.waitForTimeout(900);
 let ci=st().cierres;assert.equal(ci.length,1);assert.equal(ci[0].diferencia,-2000);assert.equal(ci[0].periodo,'semanal');assert.equal(ci[0].totals.cobros,calc.cobros);
 assert.match(await page.textContent('#view'),/cerrado el/);await page.screenshot({path:path.join(shots,'r-caja.png'),fullPage:true});
 const [cp]=await Promise.all([page.waitForEvent('download'),page.click('.page-head [data-act=caja-pdf]')]);assert.match(cp.suggestedFilename(),/Cierre de caja/);const cpf=path.join(shots,'cierre.pdf');await cp.saveAs(cpf);assert.equal(fs.readFileSync(cpf).subarray(0,4).toString(),'%PDF');
 await page.click('[data-act=caja-off][data-d="-1"]');await page.waitForTimeout(300);assert.match(await page.textContent('#view'),/Efectivo al inicio/);
 await page.selectOption('#cajaCfgForm [name=periodo]','mensual');await page.click('#cajaCfgForm button');await page.waitForTimeout(800);assert.equal(st().settings.cierre.periodo,'mensual');await go('ventas');await go('caja');assert.match(await page.textContent('#view'),/Mes del 01\//);
 console.log('OK cierre de caja: semanal por defecto, efectivo esperado vs contado con diferencia, PDF, historial y cambio a mensual.');
 console.log('Errores de página:',errors.length?errors:'ninguno');await browser.close();srv.close();if(errors.length)process.exit(1);
})().catch(e=>{console.error('FALLO',e);process.exit(1);});
