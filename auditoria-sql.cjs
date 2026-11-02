// Migración 12 sobre la base con 01 + 02 + ACTUALIZAR + 11: copia interna firmada, comisión con resto perdonado, estado del sistema.
const assert=require('node:assert/strict');const {execFileSync}=require('node:child_process');const path=require('node:path');
const root=path.resolve(__dirname,'..');
execFileSync(path.join(__dirname,'reset-db.sh'),['migraciones/11-red-comercial.sql','migraciones/12-mejoras-auditoria.sql'],{env:{...process.env,ROOT:root},stdio:'pipe'});
const {sql,rpc}=require('./pg.cjs');
const admin=rpc('iclub_login',{p_phone:'admin',p_password:'qa-admin-password'}).token;
let st=rpc('iclub_system_status',{p_token:admin});assert.equal(st.ok,true);assert.equal(st.version,12);assert.equal(st.cron,false);
assert.throws(()=>sql('select iclub_private.snapshot_internal()'),/permission denied/);
// Copia interna: se crea y se puede restaurar (firma válida) desde el panel.
sql("select iclub_private.snapshot_internal('automática')",null);st=rpc('iclub_system_status',{p_token:admin});assert.equal(st.snapshots,1);
const snap=rpc('iclub_net_read',{p_token:admin}).snapshots[0];const b=rpc('iclub_snapshot_get',{p_token:admin,p_id:snap.id});assert.equal(rpc('iclub_backup_preview',{p_token:admin,p_bundle:JSON.parse(JSON.stringify(b.bundle))}).ok,true);
// Comisión: resto perdonado cuenta como cobrado.
const refs=()=>rpc('iclub_ref_read',{p_token:admin});
rpc('iclub_ref_member_create',{p_token:admin,p_revision:refs().revision,p_name:'Ref',p_phone:'3815000001',p_password:'ref-clave-001',p_existing:false});
let n=rpc('iclub_net_read',{p_token:admin});rpc('iclub_net_change',{p_token:admin,p_revision:n.revision,p_action:'member_settings',p_item:{id:'3815000001',mode:'fixed',usd:20}});
let s=rpc('iclub_get_state',{p_token:admin});let d=s.data;d.clients['3815000002']={name:'C',pass:'cliente-clave-1',movs:[{f:'01/10/2026',tipo:'Compra',doc:'FA 1',imp:-100000,grp:'v1',finan:{n:2,freq:'Mensual',base:100000,exact:true}},{f:'01/10/2026',tipo:'Pago',doc:'RC 1',imp:99000,plan:'FA 1'}]};d.ventas=[{id:'v1',name:'X',fecha:'01/10/2026',ventaArs:100000,clientKey:'3815000002',fin:true,invoice:'FA 1',delivered:true}];
rpc('iclub_checkout_ref',{p_token:admin,p_data:d,p_expected_version:s.version,p_revision:refs().revision,p_ref:{id:'v1',referrer:'3815000001',total:100000,label:'X',client:'C',delivered:true}});
assert.equal(refs().data.sales[0].collected,99000);
s=rpc('iclub_get_state',{p_token:admin});d=s.data;d.clients['3815000002'].movs.push({f:'02/10/2026',tipo:'Nota de Crédito',doc:'NC 1',imp:1000,plan:'FA 1',auto:'resto'});rpc('iclub_save_state',{p_token:admin,p_data:d,p_expected_version:s.version});
assert.equal(refs().data.sales[0].collected,100000,'el resto perdonado libera la comisión completa');
// Vincular compras existentes con un referidor: con venta registrada y compra manual sin venta.
s=rpc('iclub_get_state',{p_token:admin});d=s.data;d.clients['3815000003']={name:'Dana',pass:'cliente-clave-3',movs:[{f:'05/10/2026',tipo:'Compra',doc:'FA 9',imp:-200000,prodName:'Moto G',finan:{n:4,freq:'Mensual',base:200000,exact:true}},{f:'05/10/2026',tipo:'Pago',doc:'RC 9',imp:50000,plan:'FA 9'}]};rpc('iclub_save_state',{p_token:admin,p_data:d,p_expected_version:s.version});
s=rpc('iclub_get_state',{p_token:admin});
assert.throws(()=>rpc('iclub_ref_link',{p_token:admin,p_expected_version:s.version,p_revision:refs().revision,p_item:{phone:'3815000003',doc:'FA 9',referrer:'3815009999'}}),/no habilitado/);
let r=rpc('iclub_ref_link',{p_token:admin,p_expected_version:s.version,p_revision:refs().revision,p_item:{phone:'3815000003',doc:'FA 9',referrer:'3815000001',delivered:true}});assert.equal(r.ok,true);
let ls=refs().data.sales.find(x=>x.client==='Dana');assert.equal(ls.linked,true);assert.equal(ls.collected,50000,'los pagos anteriores cuentan');assert.equal(ls.commission,20);
s=rpc('iclub_get_state',{p_token:admin});const vv=s.data.ventas.find(v=>v.id===ls.id);assert.equal(vv.sinStats,true);assert.equal(s.data.clients['3815000003'].movs[0].grp,ls.id);
assert.throws(()=>rpc('iclub_ref_link',{p_token:admin,p_expected_version:s.version,p_revision:refs().revision,p_item:{phone:'3815000003',doc:'FA 9',referrer:'3815000001'}}),/ya está vinculada/);
d=s.data;d.clients['3815000003'].movs.push({f:'06/10/2026',tipo:'Pago',doc:'RC 10',imp:50000,plan:'FA 9'});rpc('iclub_save_state',{p_token:admin,p_data:d,p_expected_version:s.version});
assert.equal(refs().data.sales.find(x=>x.id===ls.id).collected,100000,'un pago nuevo suma solo a la ganancia del referidor');
s=rpc('iclub_get_state',{p_token:admin});r=rpc('iclub_ref_link',{p_token:admin,p_expected_version:s.version,p_revision:refs().revision,p_item:{phone:'3815000003',doc:'FA 9',unlink:true}});assert.equal(r.ok,true);assert(!refs().data.sales.some(x=>x.id===ls.id));
assert.throws(()=>rpc('iclub_ref_link',{p_token:admin,p_expected_version:'2000-01-01T00:00:00Z',p_revision:refs().revision,p_item:{phone:'3815000003',doc:'FA 9',referrer:'3815000001'}}),/otro dispositivo/);
// Reinstalar 12 conserva todo.
execFileSync('psql',['-h','/tmp','-p','5433','-U','postgres','-d','iclub','-q','-v','ON_ERROR_STOP=1','-f',path.join(root,'migraciones/12-mejoras-auditoria.sql')],{stdio:'pipe'});
assert.equal(rpc('iclub_system_status',{p_token:admin}).snapshots,1);assert.equal(rpc('iclub_net_version',{p_token:admin}).version,12);
console.log('OK auditoría SQL: copia interna firmada y restaurable, sin pg_cron se instala igual, resto perdonado libera comisión, estado del sistema, vincular compras existentes a un referidor (pagos anteriores y nuevos suman) y reinstalación.');
