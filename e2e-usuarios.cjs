// Usuarios para vendedores en el panel: alta desde Ajustes, menú y botones según permisos, venta y cobro con su nombre.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const H=require('./e2e-harness.cjs');const {rpc}=require('./pg.cjs');
const root=path.resolve(process.env.SITE||path.join(__dirname,'..'));const shots=process.env.SHOTS||'/tmp/shots';fs.mkdirSync(shots,{recursive:true});
execFileSync(path.join(__dirname,'reset-db.sh'),['migraciones/11-red-comercial.sql','migraciones/12-mejoras-auditoria.sql','migraciones/13-usuarios.sql'],{env:{...process.env,ROOT:root},stdio:'pipe'});
const admin=require('./e2e-seed.cjs')();const st=()=>rpc('iclub_get_state',{p_token:admin}).data;
(async()=>{
 const srv=H.start(root);const browser=await chromium.launch();
 const open=async(token)=>{const ctx=await H.context(browser,srv.port,{viewport:{width:1360,height:900}});await ctx.addInitScript(t=>{try{localStorage.setItem('iclub-session-v1',t);}catch(_){}},token);await ctx.route(/wa\.me/,r=>r.fulfill({status:200,body:'ok'}));const page=await ctx.newPage();page.on('dialog',d=>d.accept());return page;};
 const errors=[];
 // Admin crea al vendedor desde Ajustes.
 let page=await open(admin);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:'+srv.port+'/gestion#ajustes');await page.waitForSelector('#usersBox');await page.waitForFunction(()=>!/Cargando/.test(document.querySelector('#usersBox').textContent));
 await page.click('[data-act=user-new]');await page.fill('#userForm [name=name]','Juan Vendedor');await page.fill('#userForm [name=user]','juan');await page.fill('#userForm [name=password]','clave-juan-1');
 assert.equal(await page.isChecked('#userForm [name=p_vender]'),true);assert.equal(await page.isChecked('#userForm [name=p_editar]'),false);
 await page.click('#userForm button.btn-good');await page.waitForFunction(()=>/Juan Vendedor/.test(document.querySelector('#usersBox').textContent));
 await page.screenshot({path:path.join(shots,'s-usuarios.png'),fullPage:true});
 for(const h of ['#finanzas','#referidos','#respaldo'])assert.equal(await page.isVisible('.side a.nav[href="'+h+'"]'),true,'el admin ve todo');
 console.log('OK admin crea vendedor con permisos desde Ajustes.');
 // El vendedor entra.
 const tok=rpc('iclub_login',{p_phone:'juan',p_password:'clave-juan-1'}).token;const pv=await open(tok);pv.on('pageerror',e=>errors.push(e.message));
 await pv.goto('http://localhost:'+srv.port+'/gestion#inicio');await pv.waitForSelector('.dash');
 const nav=await pv.$$eval('.side a.nav',as=>as.filter(a=>!a.hidden).map(a=>a.getAttribute('href')));assert.deepEqual(nav,['#inicio','#vender','#ventas','#clientes','#inventario']);
 assert.match(await pv.textContent('.side .foot'),/Juan Vendedor · vendedor/);assert.equal(await pv.$('[data-w=inversoresW]'),null);assert(await pv.$('[data-w=recordatorios]'));
 await pv.evaluate(()=>location.hash='finanzas');await pv.waitForTimeout(300);assert.match(await pv.textContent('#view'),/Sin acceso/);
 await pv.evaluate(()=>location.hash='cliente/3815000010/pagos');await pv.waitForTimeout(400);assert.equal(await pv.isVisible('[data-act=pay-edit]'),false);assert.equal(await pv.isVisible('[data-act=del-mov]'),false);
 await pv.evaluate(()=>location.hash='cliente/3815000010/compras');await pv.waitForTimeout(400);assert.equal(await pv.isVisible('[data-act=undo-buy]'),false);assert.equal(await pv.isVisible('[data-act=devolucion]'),false);
 // Cobra: el recibo queda a su nombre y en la bitácora.
 await pv.evaluate(()=>location.hash='cliente/3815000011');await pv.waitForTimeout(400);await pv.click('.page-head [data-act=pay]');await pv.waitForSelector('#payForm');assert.match(await pv.textContent('#payForm'),/Cobra: Juan Vendedor/);
 await pv.fill('#payForm [name=amount]','10000');await pv.click('#payForm button.btn-good');await pv.waitForSelector('#rcText');
 const pg=st().clients['3815000011'].movs.filter(m=>m.tipo==='Pago').at(-1);assert.equal(pg.by,'Juan Vendedor');assert.equal(st().bitacora.at(-1).by,'Juan Vendedor');await pv.click('dialog#modal [data-close]');
 // Vende con referidor.
 await pv.evaluate(()=>location.hash='vender');await pv.waitForSelector('#posForm');await pv.fill('[name=prodQ]','redmi');await pv.click('#invPick button[data-id=i3]');await pv.fill('[name=cliQ]','lucía');await pv.click('#cliPick button[data-id="3815000012"]');
 assert(await pv.$('#posForm select[name=referrer] option[value="3815000001"]'),'puede elegir referidor');await pv.selectOption('#posForm select[name=referrer]','3815000001');await pv.waitForTimeout(200);
 await pv.click('[data-act=pos-confirm]');await pv.waitForSelector('dialog#modal[open]');const vt=st().ventas.at(-1);assert.equal(vt.name,'Redmi A5');assert(rpc('iclub_ref_read',{p_token:admin}).data.sales.some(x=>x.id===vt.id),'venta con referidor registrada');
 await pv.screenshot({path:path.join(shots,'t-vendedor.png')});assert.equal(await pv.isVisible('dialog#modal .fin-only'),false,'sin finanzas no ve la ganancia');assert.equal(await pv.isVisible('.side a.nav[href="#finanzas"]'),false,'el menú oculto no se ve');
 console.log('OK vendedor: menú según permisos, sin acceso a finanzas, sin botones de editar/anular, cobra a su nombre y vende con referidor.');
 // Admin le saca el permiso de vender: se le oculta.
 await page.click('[data-act=user-edit][data-user=juan]');await page.uncheck('#userForm [name=p_vender]');await page.click('#userForm button.btn-good');await page.waitForTimeout(800);
 await pv.evaluate(()=>location.hash='inicio');await pv.reload();await pv.waitForSelector('.dash');assert.equal(await pv.$eval('.side a.nav[href="#vender"]',a=>a.hidden),true);
 console.log('OK permisos editables por el admin.');
 console.log('Errores de página:',errors.length?errors:'ninguno');await browser.close();srv.close();if(errors.length)process.exit(1);
})().catch(e=>{console.error('FALLO',e);process.exit(1);});
