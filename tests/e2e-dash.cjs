// Inicio tipo tablero: accesos, flujo del mes, barras por mes y torta por tipo.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const H=require('./e2e-harness.cjs');
const root=path.resolve(process.env.SITE||path.join(__dirname,'..'));const shots=process.env.SHOTS||'/tmp/shots';fs.mkdirSync(shots,{recursive:true});
execFileSync(path.join(__dirname,'reset-db.sh'),['migraciones/11-red-comercial.sql','migraciones/12-mejoras-auditoria.sql','migraciones/13-usuarios.sql','migraciones/14-plan-canje.sql'],{env:{...process.env,ROOT:root},stdio:'pipe'});
const admin=require('./e2e-seed.cjs')();
(async()=>{
 const srv=H.start(root);const browser=await chromium.launch();const ctx=await H.context(browser,srv.port,{viewport:{width:1360,height:900}});
 await ctx.addInitScript(t=>{try{localStorage.setItem('iclub-session-v1',t);}catch(_){}},admin);
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:'+srv.port+'/gestion#inicio');await page.waitForSelector('.dash-tiles');
 for(const k of ['accesos','flujoMes','graficoMeses','tortaTipos']) assert.ok(await page.$('[data-w='+k+']'),k);
 assert.equal(await page.locator('.dash-tile').count(),5);
 assert.ok(await page.locator('.dash-chart rect').count()>=24);
 assert.match(await page.textContent('[data-w=flujoMes]'),/Vendido[\s\S]*Cobrado[\s\S]*Por cobrar/);
 await page.screenshot({path:path.join(shots,'inicio-tablero.png'),fullPage:true});
 await page.goto('http://localhost:'+srv.port+'/gestion#finanzas');await page.waitForSelector('[data-act=fin-mes]');
 const filas=await page.locator('[data-act=fin-mes]').count();assert.ok(filas>=2,'meses con nombres');
 assert.match(await page.textContent('[data-act=fin-mes] >> nth=0'),/[A-Za-zÁ-ú]/);
 await page.locator('[data-act=fin-mes]').last().click();await page.waitForSelector('dialog#modal[open]');assert.match(await page.textContent('dialog#modal'),/Cliente/);
 await page.screenshot({path:path.join(shots,'cobros-mes-detalle.png')});await page.click('dialog#modal [data-close]');
 await page.locator('.table-wrap:has([data-act=fin-mes])').screenshot({path:path.join(shots,'cobros-mes.png')});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:path.join(shots,'inicio-tablero-movil.png'),fullPage:true});
 assert.deepEqual(errors,[]);await browser.close();srv.close();console.log('e2e-dash PASS');
})().catch(e=>{console.error(e);process.exit(1);});
