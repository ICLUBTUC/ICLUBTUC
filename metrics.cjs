const assert=require('node:assert/strict');global.ICLUBCollectionPlan=require('../collection-plan.js');global.ICLUBBusiness=require('../business.js');global.ICLUBPriceList=require('../price-list.js');
const M=require('../iclub-metrics.js'),X=require('../xlsx-lite.js'),P=global.ICLUBCollectionPlan;const today=new Date(2026,9,29);
const db={settings:{rate:1500},clients:{'1':{name:'María',movs:[{f:'01/09/2026',tipo:'Compra',doc:'FA1',imp:-300000,grp:'s1',finan:{n:3,freq:'Mensual',base:300000,exact:true}},{f:'02/10/2026',tipo:'Pago',imp:100000,plan:'FA1'}]},'2':{name:'Juan',movs:[{f:'20/10/2026',tipo:'Compra',doc:'FA2',imp:-200000,grp:'s2',finan:{n:8,freq:'Semanal',base:200000,exact:true}}]}},
 ventas:[{id:'s1',name:'iPhone 13',fecha:'01/09/2026',ventaArs:300000,costoArs:200000,clientKey:'1',fin:true,invoice:'FA1'},{id:'s2',name:'Redmi A5',fecha:'20/10/2026',ventaArs:200000,costoArs:150000,clientKey:'2',fin:true,invoice:'FA2'}],gastos:[{f:'05/10/2026',concepto:'Luz',cat:'Servicios',monto:20000}]};
const d=M.dues(db,{today});assert.equal(d[0].client,'Juan');assert.equal(d[0].dias,-2);const t=M.collectionTotals(d,today);assert.equal(t.atrasado,25000);assert.equal(t.atrasadoClientes,1);assert.equal(t.semana,100000);
assert.equal(M.dues(db,{today,freq:'monthly'}).every(x=>x.client==='María'),true);
assert.equal(M.client(db,'2',today).estado,'atrasado');assert.equal(M.sale(db,db.ventas[1],today).estado,'1 cuota atrasada');assert.equal(M.sale(db,db.ventas[0],today).cuotas.pagadas,1);
const f=M.finance(db,{today,month:'2026-10'});assert.equal(f.k.gananciaBruta,50000);assert.equal(f.k.gananciaNeta,30000);assert.equal(f.k.cobrado,100000);assert.equal(f.k.porCobrar,400000);assert.equal(f.flujo.length,12);
assert.equal(M.simulate(1000000,20,12).gananciaSimple,2400000);assert.equal(M.simulate(1000000,20,12).multiplicador,8.92);
assert.equal(M.investor({rate:20},[{type:'aporte',amount:1000000,f:'2026-09-29'}],today).devengado,200000);assert.equal(M.investor({rate:20},[{type:'aporte',amount:1000000,f:'2026-09-29'},{type:'ganancia',amount:200000,f:'2026-10-29'}],today).pendiente,0);
const g=M.referrerGain({mode:'percent',percent:5},500,10,{3:45,6:90},1500);assert.equal(g[0].gananciaUsd,35);assert.equal(g.find(x=>x.best).key,'m6');assert.equal(M.referrerGain({mode:'fixed',usd:25},500,0,{3:45},1500).some(x=>x.best),false);
const sheets=M.excelSheets(db,{today,month:'2026-10'});assert.equal(sheets.length,9);assert(X.build(sheets).length>3000);
assert.equal(P._schedule('30/08/2026',6,'Mensual')[5],'28/02/2027','fin de mes sin saltar a marzo');
console.log('OK cálculos: cobros por día/semana/mes, atrasos, estado de ventas, finanzas, simulador, inversor por mes calendario, ganancia del referidor, Excel y vencimientos de fin de mes.');
