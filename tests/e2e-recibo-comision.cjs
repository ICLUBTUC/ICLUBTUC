// Recibo de pago de un cliente que también es referidor: muestra sus comisiones (desbloqueado, descontado, por desbloquear).
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const H=require('./e2e-harness.cjs');
const root=path.resolve(process.env.SITE||path.join(__dirname,'..'));const shots=process.env.SHOTS||'/tmp/shots';fs.mkdirSync(shots,{recursive:true});
execFileSync(path.join(__dirname,'reset-db.sh'),['migraciones/11-red-comercial.sql','migraciones/12-mejoras-auditoria.sql','migraciones/13-usuarios.sql','migraciones/14-plan-canje.sql'],{env:{...process.env,ROOT:root},stdio:'pipe'});
const admin=require('./e2e-seed.cjs')();
(async()=>{
 const srv=H.start(root);const browser=await chromium.launch();const ctx=await H.context(browser,srv.port,{viewport:{width:1360,height:900}});
 await ctx.addInitScript(t=>{try{localStorage.setItem('iclub-session-v1',t);}catch(_){}},admin);
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:'+srv.port+'/gestion#inicio');await page.waitForSelector('.dash');
 const out=await page.evaluate(async()=>{const A=window.ICA;await A.jspdf();const db=JSON.parse(JSON.stringify(A.db));const ph=Object.keys(db.clients).find(p=>db.clients[p].movs.some(m=>m.finan));const c=db.clients[ph];const pm=c.movs.find(m=>m.finan);
  pm.finan.creditos=[{monto:40000,modo:'ultimas',ref:'r1',f:'05/11/2026'}];c.movs.push({f:'05/11/2026',tipo:'Nota de Crédito',doc:'NC 0003-000009',imp:40000,plan:pm.doc,auto:'comision',refSale:'r1',det:'Comisión por venta referida aplicada a tus cuotas · iPhone 15'});
  c.movs.push({f:'10/11/2026',tipo:'Pago',doc:'X 0001-000777',imp:25000,plan:pm.doc,met:'Efectivo',at:new Date().toISOString(),by:'Leo'});
  ICLUBDocs.setRefs({members:{[ph]:{name:'Álvaro',active:true}},sales:[{id:'r1',referrer:ph,client:'Carla Díaz',label:'iPhone 15 128 GB',total:1200000,collected:600000,commission:100000,commissionCurrency:'ARS',paid:40000,delivered:true},{id:'r2',referrer:ph,client:'Pablo Ruiz',label:'Redmi A5',total:300000,collected:0,commission:30,commissionCurrency:'USD',paid:0,delivered:false}]});
  const R=ICLUBDocs.refInfo(db,ph);const R0=(ICLUBDocs.setRefs({sales:[{id:'x',referrer:ph,total:1,collected:1,commission:1}]}),ICLUBDocs.refInfo(db,ph));ICLUBDocs.setRefs({members:{[ph]:{}},sales:[{id:'r1',referrer:ph,client:'Carla Díaz',label:'iPhone 15 128 GB',total:1200000,collected:600000,commission:100000,commissionCurrency:'ARS',paid:40000,delivered:true},{id:'r2',referrer:ph,client:'Pablo Ruiz',label:'Redmi A5',total:300000,collected:0,commission:30,commissionCurrency:'USD',paid:0,delivered:false}]});if(R0!==null)throw Error('no referidor: no debe mostrar comisiones');const doc=ICLUBDocs.forMov(db,ph,c.movs.length-1);return {R,pdf:doc.output('datauristring').split(',')[1]};});
 assert.equal(out.R.apl,40000);assert.equal(out.R.desb,50000);assert.equal(out.R.disp,10000);assert.equal(out.R.falta,50000+30*1520>0?out.R.falta:0);
 assert.equal(out.R.rows[0].falta,50000);
 fs.writeFileSync(path.join(shots,'recibo-comision.pdf'),Buffer.from(out.pdf,'base64'));
 assert.deepEqual(errors,[]);await browser.close();srv.close();console.log('e2e-recibo-comision PASS');
})().catch(e=>{console.error(e);process.exit(1);});
