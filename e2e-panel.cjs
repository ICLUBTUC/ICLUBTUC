// Recorre todas las pantallas del panel nuevo en Chromium real conectado a PostgreSQL real.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const H=require('./e2e-harness.cjs');
const root=path.resolve(process.env.SITE||path.join(__dirname,'..'));const shots=process.env.SHOTS||'/tmp/shots';fs.mkdirSync(shots,{recursive:true});
execFileSync(path.join(__dirname,'reset-db.sh'),['migraciones/11-red-comercial.sql'],{env:{...process.env,ROOT:root},stdio:'pipe'});
const admin=require('./e2e-seed.cjs')();
(async()=>{
 const srv=H.start(root);const browser=await chromium.launch();const ctx=await H.context(browser,srv.port,{viewport:{width:1360,height:900}});
 await ctx.addInitScript(t=>{try{localStorage.setItem('iclub-session-v1',t);}catch(_){}},admin);
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});page.on('dialog',d=>d.accept());
 const base='http://localhost:'+srv.port;
 const routes=['inicio','vender','ventas','clientes','cliente/3815000010','cliente/3815000010/pagos','cliente/3815000010/compras','cliente/3815000010/comprobantes','cliente/3815000010/datos','ajustes','inventario','catalogo','estadisticas','finanzas','referidos/vendedores','referidos/listas','referidos/ventas','referidos/actividad','referidos/programa','inversores','respaldo'];
 await page.goto(base+'/gestion#inicio');await page.waitForSelector('.page-head',{timeout:15000});
 for(const r of routes){await page.evaluate(h=>location.hash=h,r);await page.waitForTimeout(250);const h1=await page.textContent('.page-head h1').catch(()=>null);assert(h1,'Sin título en '+r);await page.screenshot({path:path.join(shots,r.replace(/\//g,'-')+'.png'),fullPage:true});console.log('OK',r.padEnd(22),h1);}
 console.log('Errores:',errors.length?errors:'ninguno');
 await browser.close();srv.close();if(errors.length)process.exit(1);
})().catch(e=>{console.error('FALLO',e);process.exit(1);});
