const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),P=require('../collection-plan.js');
const r2=n=>Math.round(n*100)/100;
// Caso real: cuota de $192.916,67 pagada con $192.500 → resto $416,67.
const pm={f:'01/10/2026',tipo:'Compra',doc:'FA-1',imp:-578750,finan:{n:3,freq:'Mensual',base:578750,exact:true}};
const pago={f:'05/10/2026',tipo:'Pago',doc:'RC-1',imp:192500,plan:'FA-1'};
const base={name:'Clienta',movs:[pm,pago]};
const saldo=c=>r2(c.movs.reduce((a,m)=>a-m.imp,0));
let r=P._restoTras(base,pm,0);
assert.deepEqual([r.n,r.monto,r.esUltima],[1,416.67,false]);
// Sin resolver: el siguiente pago de una cuota completa arrastra el faltante (comportamiento anterior, se conserva).
let c={movs:[pm,pago,{f:'05/11/2026',tipo:'Pago',imp:192916.67,plan:'FA-1'}]};
assert.equal(P._planCalc(c,pm).cuotas[1].done,false);
// 1) Sumar a la próxima.
let movs=P._resolverResto(base,pm,r,'next');let pm2=movs.find(m=>m.doc==='FA-1');c={movs};
let pc=P._planCalc(c,pm2);assert.equal(pc.cuotas[0].done,true);assert.equal(pc.cuotas[1].req,193333.34);assert.equal(pc.pagadas,1);assert.equal(pc.pendiente,386250);assert.equal(saldo(c),386250);
c.movs.push({f:'05/11/2026',tipo:'Pago',imp:193333.34,plan:'FA-1'});pc=P._planCalc(c,pm2);assert.equal(pc.pagadas,2);assert.equal(pc.prox.n,3);assert.equal(pc.prox.paid,0);
// 2) Pasar a la última.
movs=P._resolverResto(base,pm,r,'last');pm2=movs.find(m=>m.doc==='FA-1');c={movs};pc=P._planCalc(c,pm2);
assert.equal(pc.cuotas[1].req,192916.67);assert.equal(pc.cuotas[2].req,193333.33);assert.equal(pc.pendiente,386250);
c.movs.push({f:'05/11/2026',tipo:'Pago',imp:192916.67,plan:'FA-1'});pc=P._planCalc(c,pm2);assert.equal(pc.pagadas,2,'una cuota completa no queda corta');
// 3) Perdonar: nota de crédito, saldo de la cuenta y del plan bajan lo mismo.
movs=P._resolverResto(base,pm,r,'perdon','NC 0003-00000001');pm2=movs.find(m=>m.doc==='FA-1');c={movs};pc=P._planCalc(c,pm2);
assert.equal(pc.pendiente,385833.33);assert.equal(saldo(c),385833.33);assert.equal(movs.at(-1).tipo,'Nota de Crédito');assert.equal(movs.at(-1).auto,'resto');
// Un pago chico ($416,67) cierra solo el resto: no ocupa la cuota siguiente.
c={movs:[pm,pago,{f:'06/10/2026',tipo:'Pago',imp:416.67,plan:'FA-1'}]};pc=P._planCalc(c,pm);assert.equal(pc.pagadas,1);assert.equal(pc.prox.n,2);assert.equal(pc.prox.paid,0);
// Última cuota: solo perdonar.
const pmU={...pm,finan:{...pm.finan,n:1,base:192916.67}};const cu={movs:[pmU,pago]};const ru=P._restoTras(cu,pmU,0);assert.equal(ru.esUltima,true);
assert.throws(()=>P._resolverResto(cu,pmU,ru,'next'),/última cuota/);
// El adelanto sin interés conserva el ajuste del resto.
const pmR={...pm,finan:{...pm.finan,rec:20}};movs=P._resolverResto({movs:[pmR,pago]},pmR,P._restoTras({movs:[pmR,pago]},pmR,0),'last');const pmR2=movs.find(m=>m.doc==='FA-1');
movs.push({f:'06/10/2026',tipo:'Pago',imp:400000,plan:'FA-1',sinInt:true});pc=P._planCalc({movs},pmR2);assert.equal(pc.cuotas[2].sinInt,true);assert.equal(pc.cuotas[2].req,r2(pc.capImp+416.67));

// Portal real: pago parcial con opción elegida y resolución sin cobrar.
const helpers={ICLUBCollectionPlan:P,ICLUBCollectionView:require('../collection-view.js'),ICLUBClientList:require('../client-list.js'),ICLUBCatalogFilters:require('../catalog-filters.js'),ICLUBFinanceReports:require('../finance-reports.js'),confirm:()=>true};
const context=vm.createContext({DCLogic:class{},Date,URLSearchParams,Intl,location:{search:''},window:helpers});
const source=fs.readFileSync(require.resolve('../Portal Clientes ICLUB.dc.html'),'utf8').match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
vm.runInContext(source+';globalThis.Portal=Component',context);
function portalWith(movs){const p=new context.Portal();p.setState=patch=>Object.assign(p.state,patch);p._save=db=>p.state.db=db;p._openReceipt=()=>{};
 Object.assign(p.state,{user:'admin',amode:'pago',editKey:'3811111111',movPlan:'FA-1',movAmount:'',movResto:'',db:{clients:{'3811111111':{name:'Clienta',movs}},catalog:{},inventory:[],settings:{rate:1500},ventas:[],nextRc:2,nextNc:5}});return p;}
let portal=portalWith([pm]);portal.state.movAmount='192.500';let vals=portal.renderVals();
assert.equal(vals.aRestoPayShow,true);assert.match(vals.aRestoPayTxt,/416,67/);assert.equal(vals.aRestoPayNextShow,true);
vals.aRestoOptNext();vals=portal.renderVals();assert.match(vals.aRestoPayHint,/cuota 2/);vals.aSaveMov();
let cl=portal.state.db.clients['3811111111'];let fa=cl.movs.find(m=>m.doc==='FA-1');pc=P._planCalc(cl,fa);
assert.equal(pc.pagadas,1);assert.equal(pc.cuotas[1].req,193333.34);assert.match(cl.movs.find(m=>m.tipo==='Pago').det,/se suma a la cuota 2/);
// Pago que cubre la cuota exacta: no pregunta nada.
portal=portalWith([pm]);portal.state.movAmount='192916,67';assert.equal(portal.renderVals().aRestoPayShow,false);
// Resto viejo sin cobrar: perdonar desde el formulario.
portal=portalWith([pm,pago]);vals=portal.renderVals();assert.equal(vals.aRestoNowShow,true);assert.match(vals.aRestoNowTxt,/cuota 1/);
vals.aRestoNowPerdon();cl=portal.state.db.clients['3811111111'];assert.equal(saldo(cl),385833.33);assert.equal(portal.state.db.nextNc,6);assert.equal(cl.movs.at(-1).doc,'NC 0003-000005');
assert.equal(portal.renderVals().aRestoNowShow,false);
console.log('OK restos de cuota: sumar a la próxima, pasar a la última, perdonar con nota de crédito, pago chico sin ocupar cuota, última cuota y acción real del portal.');
