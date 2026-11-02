const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),P=require('../collection-plan.js');
const pm={f:'01/10/2026',tipo:'Compra',doc:'FA-1',imp:-50000,finan:{n:2,freq:'Mensual',base:50000,vencs:{0:'15/11/2026',1:'15/12/2026'}}};
let client={name:'Cliente',movs:[pm,{f:'10/10/2026',tipo:'Pago',doc:'RC-1',imp:24583.33,plan:'FA-1'}]};
let pc=P._planCalc(client,pm);assert.equal(pc.prox.n,1);assert.equal(Math.round((pc.prox.req-pc.prox.paid)*100)/100,416.67);
const helpers={ICLUBCollectionPlan:P,ICLUBCollectionView:require('../collection-view.js'),ICLUBClientList:require('../client-list.js'),ICLUBCatalogFilters:require('../catalog-filters.js'),ICLUBFinanceReports:require('../finance-reports.js')};
const context=vm.createContext({DCLogic:class{},Date,URLSearchParams,Intl,location:{search:''},window:helpers});
const source=fs.readFileSync(require.resolve('../Portal Clientes ICLUB.dc.html'),'utf8').match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];vm.runInContext(source+';globalThis.Portal=Component',context);const portal=new context.Portal();portal.setState=patch=>Object.assign(portal.state,patch);portal._save=db=>portal.state.db=db;portal._openReceipt=()=>{};
assert.equal(portal._amountNum('416,67'),416.67);assert.equal(portal._amountNum('416.67'),416.67);assert.equal(portal._amountNum('$ 1.416,67'),1416.67);assert.equal(portal._amountNum('20.000'),20000);assert(portal._fmt(416.67).includes('416,67'));
Object.assign(portal.state,{user:'admin',amode:'pago',editKey:'3811111111',movPlan:'FA-1',movAmount:'416.67',db:{clients:{'3811111111':client},catalog:{},inventory:[],settings:{rate:1500},ventas:[],nextRc:2}});
let vals=portal.renderVals();assert(vals.aMovPlanDue.includes('Cuota 1'));vals.aMovFillDue();assert.equal(portal.state.movAmount,'416.67');portal.renderVals().aSaveMov();client=portal.state.db.clients['3811111111'];assert.equal(client.movs.at(-1).imp,416.67);assert.equal(P._planCalc(client,pm).prox.n,2);
// Amounts of one cent and legacy installment rounding stay collectible.
const legacy={...pm,imp:-100,finan:{...pm.finan,n:3,base:100}};const l={movs:[legacy,{f:'10/10/2026',tipo:'Pago',imp:99.99,plan:'FA-1'}]};pc=P._planCalc(l,legacy);assert.equal(pc.pendiente,.01);assert.equal(pc.prox.n,3);l.movs.push({f:'11/10/2026',tipo:'Pago',imp:.01,plan:'FA-1'});assert.equal(P._planCalc(l,legacy).pendiente,0);assert.equal(P._planCalc(l,legacy).prox,null);
console.log('OK saldos pequeños: resto $416,67, parseo de centavos, acción real del portal, cuota siguiente intacta y liquidación de $0,01 con plan antiguo.');
