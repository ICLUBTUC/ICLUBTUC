// Mejoras de la auditoría: CSP sin bloqueos en todas las páginas, alerta y carga de costo, PDF bajo demanda.
const assert=require('node:assert/strict'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const H=require('./e2e-harness.cjs');const {rpc}=require('./pg.cjs');
const root=path.resolve(process.env.SITE||path.join(__dirname,'..'));
execFileSync(path.join(__dirname,'reset-db.sh'),['migraciones/11-red-comercial.sql','migraciones/12-mejoras-auditoria.sql','migraciones/13-usuarios.sql','migraciones/14-plan-canje.sql'],{env:{...process.env,ROOT:root},stdio:'pipe'});
const admin=require('./e2e-seed.cjs')();
(async()=>{
 const srv=H.start(root);const browser=await chromium.launch();const ctx=await H.context(browser,srv.port,{viewport:{width:1280,height:900}});
 await ctx.addInitScript(t=>{try{localStorage.setItem('iclub-session-v1',t);}catch(_){}},admin);
 const csp=[],errors=[];const page=await ctx.newPage();page.on('console',m=>{if(/Content Security Policy|Refused to/.test(m.text()))csp.push(page.url()+' · '+m.text());});page.on('pageerror',e=>{if(!/unpkg\.com|React is not defined/.test(e.message))errors.push(e.message);});
 const base='http://localhost:'+srv.port;
 for(const p of ['/','/apple','/android','/smart-tv','/canje','/portal','/referidos','/inversores','/comprar','/ayuda','/gestion']){await page.goto(base+p);await page.waitForTimeout(700);}
 assert.deepEqual(csp,[],'la política de seguridad no bloquea nada propio');
 // PDF bajo demanda: al abrir el panel no se cargan jsPDF ni las fuentes.
 await page.goto(base+'/gestion#ventas');await page.waitForSelector('#view .item');
 assert.equal(await page.evaluate(()=>!!window.ICLUBDocFonts),false,'las fuentes del PDF no cargan al abrir');
 // Venta sin costo: chip, aviso en Finanzas y carga desde el detalle.
 const sid=await page.evaluate(()=>{const s=ICA.db.ventas.find(v=>Number(v.ventaArs)>0&&!v.devolucion);return s.id;});
 await page.evaluate(async(id)=>{const next=ICA.clone(ICA.db);next.ventas.find(v=>v.id===id).costoArs=0;await ICA.saveDb(next,'test');ICA.render();},sid);
 await page.goto(base+'/gestion#finanzas');await page.waitForTimeout(300);assert.match(await page.textContent('#view'),/sin costo cargado/);
 await page.goto(base+'/gestion#ventas');await page.click('[data-act=sale][data-id="'+sid+'"]');await page.waitForSelector('#costoForm');
 await page.fill('#costoForm [name=costo]','465');await page.fill('#costoForm [name=rate]','1620');await page.click('#costoForm button');await page.waitForTimeout(800);
 const v=await page.evaluate((id)=>ICA.db.ventas.find(x=>x.id===id),sid);assert.equal(v.costoArs,753300);assert.equal(v.costoUsd,465);
 // El PDF sigue saliendo (carga jsPDF + fuentes en ese momento).
 const ok=await page.evaluate(async()=>{await ICA.jspdf();return !!(window.jspdf&&window.ICLUBDocFonts);});assert.ok(ok,'PDF carga bajo demanda');
 assert.deepEqual(errors,[]);await browser.close();srv.close();console.log('e2e-auditoria PASS');
})().catch(e=>{console.error(e);process.exit(1);});
