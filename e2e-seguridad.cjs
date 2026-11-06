// Inyección de código (XSS): datos maliciosos en todos los campos de texto, recorriendo panel y portales.
const assert=require('node:assert/strict'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const H=require('./e2e-harness.cjs');const {rpc}=require('./pg.cjs');
const root=path.resolve(process.env.SITE||path.join(__dirname,'..'));
execFileSync(path.join(__dirname,'reset-db.sh'),['migraciones/11-red-comercial.sql'],{env:{...process.env,ROOT:root},stdio:'pipe'});
const admin=require('./e2e-seed.cjs')();const X='<img src=x onerror="window.__xss=(window.__xss||0)+1">';const X2='"><svg onload="window.__xss=(window.__xss||0)+1">';
let s=rpc('iclub_get_state',{p_token:admin});const d=s.data;
d.clients['3815000010'].name='María '+X;d.clients['3815000010'].desc=X2;d.clients['3815000010'].movs[0].prodName='iPhone '+X;d.clients['3815000010'].movs[1].det=X2;d.clients['3815000010'].movs[1].met=X;
d.inventory[0].name='iPhone 13 '+X;d.inventory[0].spec=X2;d.ventas[1].name=X;d.gastos[0].concepto=X;d.gastos[0].cat=X2;d.pedidos[0].prod=X;d.panel={tareas:[{id:'t1',t:X,f:'',done:false}],widgets:[]};
d.catalog.iphone13={name:X,spec:X2,usd:500};
rpc('iclub_save_state',{p_token:admin,p_data:d,p_expected_version:s.version});
let n=rpc('iclub_net_read',{p_token:admin});rpc('iclub_net_change',{p_token:admin,p_revision:n.revision,p_action:'list',p_item:{kind:'stock',items:[{name:'Equipo '+X,spec:X2,cat:X,usd:100,stock:2}]}});
n=rpc('iclub_net_read',{p_token:admin});rpc('iclub_net_change',{p_token:admin,p_revision:n.revision,p_action:'investor_update',p_item:{id:'3815000020',name:'Martín '+X,rate:20,notes:X2,active:true}});
n=rpc('iclub_net_read',{p_token:admin});rpc('iclub_net_change',{p_token:admin,p_revision:n.revision,p_action:'settings',p_item:{investorNote:X,plazoFijoTna:''}});
const alv=rpc('iclub_login',{p_phone:'3815000001',p_password:'alvaro-clave-1'}).token;rpc('iclub_net_track',{p_token:alv,p_kind:'quote',p_detail:{product:X,mode:X2}});
rpc('iclub_ref_configure',{p_token:admin,p_revision:rpc('iclub_ref_read',{p_token:admin}).revision,p_action:'program',p_item:{title:X,welcome:X2,instructions:X,fields:[]}});
rpc('iclub_ref_configure',{p_token:admin,p_revision:rpc('iclub_ref_read',{p_token:admin}).revision,p_action:'note',p_item:{seller:'3815000001',note:X}});
(async()=>{
 const srv=H.start(root);const b=await chromium.launch();const base='http://localhost:'+srv.port;let total=0;const errors=[];
 let ctx=await H.context(b,srv.port);await ctx.addInitScript(t=>localStorage.setItem('iclub-session-v1',t),admin);let p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(base+'/gestion#inicio');await p.waitForSelector('.page-head');
 const routes=['inicio','vender','ventas','clientes','cliente/3815000010','cliente/3815000010/pagos','cliente/3815000010/compras','cliente/3815000010/comprobantes','cliente/3815000010/datos','inventario','catalogo','estadisticas','finanzas','ajustes','referidos/vendedores','referidos/listas','referidos/ventas','referidos/actividad','referidos/programa','inversores','respaldo'];
 for(const r of routes){await p.evaluate(h=>location.hash=h,r);await p.waitForTimeout(250);}
 await p.evaluate(()=>location.hash='inversores');await p.waitForTimeout(250);await p.click('[data-act=investor]');await p.waitForTimeout(200);await p.keyboard.press('Escape');
 await p.evaluate(()=>location.hash='ventas');await p.waitForTimeout(250);await p.click('[data-act=sale]');await p.waitForTimeout(200);await p.keyboard.press('Escape');
 await p.evaluate(()=>location.hash='inicio');await p.waitForTimeout(250);await p.click('[data-act=pay]');await p.waitForTimeout(200);
 total+=await p.evaluate(()=>window.__xss||0);
 await p.goto(base+'/referidos');await p.waitForSelector('.page-head');await p.click('[data-act=quote]').catch(()=>{});await p.waitForTimeout(300);total+=await p.evaluate(()=>window.__xss||0);await ctx.close();
 for(const [ph,pw,url] of [['3815000001','alvaro-clave-1','/referidos'],['3815000020','martin-clave-1','/inversores']]){ctx=await H.context(b,srv.port);p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+url);await p.fill('#loginForm [name=phone]',ph);await p.fill('#loginForm [name=password]',pw);await p.click('#loginForm button');await p.waitForSelector('.page-head');if(url==='/referidos'){await p.click('[data-act=quote]');await p.waitForTimeout(200);for(const t of ['ventas','info'])await p.click('[data-tab='+t+']').catch(()=>{});}await p.waitForTimeout(300);total+=await p.evaluate(()=>window.__xss||0);await ctx.close();}
 console.log('Código inyectado que llegó a ejecutarse:',total,'· errores de página:',errors.length?errors:'ninguno');
 await b.close();srv.close();assert.equal(total,0,'XSS ejecutado');assert.equal(errors.length,0);
 console.log('OK seguridad: 21 pantallas del panel, comprobantes, inversores y ambos portales con datos maliciosos: nada se ejecuta.');
})().catch(e=>{console.error('FALLO',e.message);process.exit(1);});
