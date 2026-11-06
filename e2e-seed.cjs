// Datos de prueba realistas sobre la base real (fechas relativas a hoy).
const {rpc}=require('./pg.cjs');
const fmt=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
const ago=(days)=>{const d=new Date();d.setDate(d.getDate()-days);return d;};
const isoD=d=>d.toISOString().slice(0,10);
module.exports=function seed(){
 const admin=rpc('iclub_login',{p_phone:'admin',p_password:'qa-admin-password'}).token;
 rpc('iclub_ref_member_create',{p_token:admin,p_revision:rpc('iclub_ref_read',{p_token:admin}).revision,p_name:'Álvaro Ruiz',p_phone:'3815000001',p_password:'alvaro-clave-1',p_existing:false});
 const s=rpc('iclub_get_state',{p_token:admin});const d=s.data;
 Object.assign(d.settings,{rate:1500,recargos:{2:25,3:45,6:90,9:120,12:150}});
 const m1=ago(40),w1=ago(16);
 d.clients['3815000001'].movs=[{f:fmt(ago(60)),tipo:'Compra',doc:'FA 0004-00000050',det:'iPhone 13',prodName:'iPhone 13',imp:-600000,estado:'FINANCIADA',grp:'v0',finan:{n:6,freq:'Mensual',base:600000,exact:true}},{f:fmt(ago(30)),tipo:'Pago',doc:'RC 0002-00000009',imp:100000,plan:'FA 0004-00000050',met:'Efectivo'}];
 d.clients['3815000010']={name:'María Gómez',pass:'maria-clave-1',blocked:false,lim:0,movs:[{f:fmt(m1),tipo:'Compra',doc:'FA 0004-00000001',det:'iPhone 14',prodName:'iPhone 14',imp:-578750,estado:'FINANCIADA',grp:'v1',finan:{n:3,freq:'Mensual',base:578750,exact:true}},{f:fmt(ago(9)),tipo:'Pago',doc:'RC 0002-00000001',imp:192500,plan:'FA 0004-00000001',met:'Transferencia'}]};
 d.clients['3815000011']={name:'Juan Pérez',pass:'juan-clave-01',blocked:false,lim:0,movs:[{f:fmt(w1),tipo:'Compra',doc:'FA 0004-00000002',det:'Redmi A5',prodName:'Redmi A5',imp:-200000,estado:'FINANCIADA',grp:'v2',finan:{n:8,freq:'Semanal',base:200000,exact:true}},{f:fmt(w1),tipo:'Pago',doc:'RC 0002-00000002',imp:50000,grp:'v2',adel:true,met:'Efectivo'}]};
 d.clients['3815000012']={name:'Lucía Fernández',pass:'lucia-clave-1',blocked:false,lim:0,movs:[{f:fmt(ago(3)),tipo:'Compra',doc:'FA 0004-00000003',det:'AirPods Pro 2',prodName:'AirPods Pro 2',imp:-330000,estado:'PAGADA',grp:'v3'},{f:fmt(ago(3)),tipo:'Pago',doc:'RC 0002-00000003',imp:330000,grp:'v3',adel:true,met:'Efectivo'}]};
 d.inventory=[{id:'i1',name:'iPhone 13',spec:'128 GB · Negro',cat:'Apple',moneda:'USD',costo:400,venta:520,stock:3},{id:'i2',name:'iPhone 11',spec:'64 GB',cat:'Apple',moneda:'USD',costo:200,venta:300,stock:1},{id:'i3',name:'Redmi A5',spec:'128 GB',cat:'Celulares',moneda:'USD',costo:110,venta:186,stock:4},{id:'i4',name:'Samsung A15',spec:'128 GB',cat:'Celulares',moneda:'USD',costo:130,venta:180,stock:0},{id:'i5',name:'iPhone 14 Pro',spec:'256 GB',cat:'Apple',moneda:'USD',costo:700,venta:950,stock:2},{id:'i6',name:'Poco C71',spec:'128 GB',cat:'Celulares',moneda:'USD',costo:100,venta:173,stock:2}];
 d.ventas=[{id:'v0',name:'iPhone 13',fecha:fmt(ago(60)),ventaArs:600000,cashArs:450000,costoArs:420000,clientKey:'3815000001',fin:true,invoice:'FA 0004-00000050',delivered:true},{id:'v1',name:'iPhone 14',fecha:fmt(m1),ventaArs:578750,cashArs:450000,costoArs:390000,clientKey:'3815000010',fin:true,invoice:'FA 0004-00000001',delivered:true},{id:'v2',name:'Redmi A5',fecha:fmt(w1),ventaArs:200000,cashArs:150000,costoArs:120000,clientKey:'3815000011',fin:true,invoice:'FA 0004-00000002',delivered:true},{id:'v3',name:'AirPods Pro 2',fecha:fmt(ago(3)),ventaArs:330000,cashArs:330000,costoArs:250000,clientKey:'3815000012',fin:false,invoice:'FA 0004-00000003',delivered:true,method:'Efectivo',paymentSnapshot:{amount:330000,method:'Efectivo'}}];
 d.gastos=[{id:'g1',f:fmt(ago(2)),concepto:'Publicidad Instagram',cat:'Publicidad',monto:25000}];
 d.pedidos=[{id:'p1',phone:'3815000010',f:fmt(ago(1)),prod:'iPhone 15 128 GB',plan:'6 meses',totalUsd:'780',estado:'nueva'}];
 d.nextFa=10;d.nextRc=10;
 rpc('iclub_save_state',{p_token:admin,p_data:d,p_expected_version:s.version});
 let n=rpc('iclub_net_read',{p_token:admin});rpc('iclub_net_change',{p_token:admin,p_revision:n.revision,p_action:'member_settings',p_item:{id:'3815000001',mode:'fixed',usd:25,allowExtra:true}});
 n=rpc('iclub_net_read',{p_token:admin});rpc('iclub_net_change',{p_token:admin,p_revision:n.revision,p_action:'list',p_item:{kind:'stock',items:[{name:'iPhone 13',spec:'128 GB',cat:'Apple',usd:520,stock:3},{name:'Redmi A5',spec:'128 GB',cat:'Celulares',usd:186,stock:4},{name:'iPhone 14 Pro',spec:'256 GB',cat:'Apple',usd:950,stock:2}]}});
 n=rpc('iclub_net_read',{p_token:admin});rpc('iclub_inv_create',{p_token:admin,p_revision:n.revision,p_name:'Martín Inversor',p_phone:'3815000020',p_password:'martin-clave-1',p_existing:false,p_rate:20});
 n=rpc('iclub_net_read',{p_token:admin});rpc('iclub_net_change',{p_token:admin,p_revision:n.revision,p_action:'investor_move',p_item:{id:'mv1',phone:'3815000020',type:'aporte',amount:1000000,f:isoD(ago(45))}});
 n=rpc('iclub_net_read',{p_token:admin});rpc('iclub_net_change',{p_token:admin,p_revision:n.revision,p_action:'allocation',p_item:{id:'al1',phone:'3815000020',saleId:'v1',amount:450000}});
 for(const [k,key,times] of [['view','/',12],['view','/apple',7],['product','iPhone 13',5],['product','Redmi A5',3],['whatsapp','producto',4],['checkout','/comprar',2]])for(let i=0;i<times;i++)rpc('iclub_page_track',{p_kind:k,p_key:key});
 return admin;
};
