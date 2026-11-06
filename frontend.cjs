const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function storage(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};}
(async()=>{
 let calls=[]; let version='v1'; let price=400;
 const ctx={localStorage:storage(),Promise,Date,fetch:async url=>{calls.push(url); return {ok:true,json:async()=>[{updated_at:version,...(url.includes('select=data')?{data:{catalog:{iphone13:{usd:price}},settings:{rate:1520}}}:{})}]};}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'iclub-data.js'),'utf8'),ctx);
 const [a,b]=await Promise.all([ctx.ICLUBData.read(),ctx.ICLUBData.read()]);
 assert.equal(a.catalog.iphone13.usd,400);assert.equal(calls.length,1);assert.equal(b.catalog.iphone13.usd,400);
 await ctx.ICLUBData.read();assert.equal(calls.length,1);
 ctx.ICLUBData.invalidate();await ctx.ICLUBData.read();assert.equal(calls.length,2);assert(calls.at(-1).endsWith('select=updated_at'));
 version='v2';price=450;ctx.ICLUBData.invalidate();const changed=await ctx.ICLUBData.read();assert.equal(changed.catalog.iphone13.usd,450);assert.equal(calls.length,4);
 ctx.fetch=async()=>{throw new Error('offline')};ctx.ICLUBData.invalidate();assert.equal((await ctx.ICLUBData.read()).catalog.iphone13.usd,450);
 const Api=require('../secure-portal.js');global.sessionStorage=storage();
 let stateVersion='1'; const history=[];
 const mock={rpc:async(name,args)=>{history.push({name,args}); if(name==='iclub_login')return {data:{ok:true,token:'test-token'}};
 if(name==='iclub_get_state')return {data:{ok:true,user:'admin',version:stateVersion,data:{clients:{},catalog:{}}}};
 if(name==='iclub_save_state')return {data:{ok:true,version:'3',data:args.p_data}};
 if(name==='iclub_logout')return {data:{ok:true}};
 return {data:{ok:false,error:'denied'}};}};
 const api=new Api(mock);await api.login('admin','secret');assert.equal(api.version,'1');assert.equal(global.sessionStorage.getItem('iclub-session-v1'),'test-token');
 stateVersion='2';const polled=await api.read(false);assert.equal(polled.version,'2');assert.equal(api.version,'1');
 await api.write({clients:{},catalog:{}});assert.equal(history.at(-1).args.p_expected_version,'1');assert.equal(api.version,'3');
 await api.logout();assert.equal(api.token,null);assert.equal(global.sessionStorage.getItem('iclub-session-v1'),null);
 console.log('OK: caché, consultas compartidas, cambios de catálogo, modo sin conexión, sesiones y versiones del portal.');
})().catch(e=>{console.error(e);process.exitCode=1});
