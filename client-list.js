(function(root){'use strict';
function select(rows,filter='debt',sort='late',search=''){
const q=String(search).trim().toLocaleLowerCase('es');
return rows.filter(r=>(filter==='all'||filter==='debt'&&r.balance>0||filter==='late'&&r.balance>0&&r.daysLate>0||filter==='clear'&&r.balance<=0||filter==='blocked'&&r.blocked)&&(!q||(r.name+' '+r.key).toLocaleLowerCase('es').includes(q))).sort((a,b)=>{
const name=()=>String(a.name).localeCompare(String(b.name),'es');
if(sort==='newest')return (Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0)||name();
if(sort==='balance')return b.balance-a.balance||b.daysLate-a.daysLate||name();
if(sort==='name')return name();
return b.daysLate-a.daysLate||b.balance-a.balance||name();
});}
root.ICLUBClientList={select};if(typeof module!=='undefined')module.exports=root.ICLUBClientList;
})(typeof window!=='undefined'?window:globalThis);
