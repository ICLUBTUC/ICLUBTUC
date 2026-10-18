(function(root){'use strict';
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
function saleDate(v){if(/^\d{2}\/\d{2}\/\d{4}$/.test(v||'')){const [d,m,y]=v.split('/').map(Number);return new Date(y,m-1,d);}const d=new Date(v);return Number.isFinite(+d)?d:null;}
function select(products,sales,options={},now=new Date()){
const counts=new Map(products.map(p=>[p.id,0]));const days=Number(options.period)||0;const start=new Date(now);start.setHours(0,0,0,0);if(days)start.setDate(start.getDate()-days+1);const end=new Date(now);end.setHours(23,59,59,999);
for(const sale of sales||[]){if(sale.cancelled||sale.anulada||['anulada','cancelada'].includes(sale.estado))continue;const date=saleDate(sale.fecha);if(days&&(!date||date<start||date>end))continue;let matches=[];const id=sale.catalogId||sale.productId;if(id)matches=products.filter(p=>p.id===id);else{matches=products.filter(p=>norm(p.name)===norm(sale.name));if(matches.length!==1)matches=products.filter(p=>norm(p.name+' '+(p.spec||''))===norm(sale.name));}if(matches.length!==1)continue;const qty=Number(sale.qty??sale.cantidad??1);if(Number.isFinite(qty)&&qty>0)counts.set(matches[0].id,counts.get(matches[0].id)+qty);}
const list=products.map((p,index)=>({...p,soldUnits:counts.get(p.id)||0,_catalogIndex:index})).filter(p=>{
if(options.stock==='stock'&&p.sinStock)return false;if(options.stock==='out'&&!p.sinStock)return false;
if(options.visibility==='visible'&&p.hidden)return false;if(options.visibility==='hidden'&&!p.hidden)return false;
return options.sold!=='yes'||p.soldUnits>0;});
return list.sort((a,b)=>{if(options.sort==='sold')return b.soldUnits-a.soldUnits||String(a.name).localeCompare(String(b.name),'es');if(options.sort==='priceLow')return (Number(a.usd)||0)-(Number(b.usd)||0);if(options.sort==='priceHigh')return (Number(b.usd)||0)-(Number(a.usd)||0);if(options.sort==='name')return String(a.name).localeCompare(String(b.name),'es');return a._catalogIndex-b._catalogIndex;});
}
root.ICLUBCatalogFilters={select};if(typeof module!=='undefined')module.exports=root.ICLUBCatalogFilters;
})(typeof window!=='undefined'?window:globalThis);
