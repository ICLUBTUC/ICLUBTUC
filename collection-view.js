(function(root){'use strict';
function frequency(value){const s=String(value||'').toLowerCase();return s==='semanal'||s==='weekly'?'weekly':s==='mensual'||s==='monthly'?'monthly':'other';}
function select(rows,freq='all'){return rows.filter(r=>!r.paid&&Number(r.amount)>0&&(freq==='all'||frequency(r.frequency)===freq));}
function clientMatches(client,freq,planCalc){if(!freq||freq==='all')return true;const debt=(client.movs||[]).reduce((sum,m)=>sum-Number(m.imp||0),0);return debt>0&&(client.movs||[]).some(m=>m.finan&&frequency(m.finan.freq)===freq&&planCalc(client,m).pendiente>0);}
root.ICLUBCollectionView={frequency,select,clientMatches};if(typeof module!=='undefined')module.exports=root.ICLUBCollectionView;
})(typeof window!=='undefined'?window:globalThis);
