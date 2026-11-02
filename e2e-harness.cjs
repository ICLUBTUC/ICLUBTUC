// Chromium real + PostgreSQL real: el navegador llama a las mismas funciones que Supabase, como usuario anónimo.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');const {rpc,sql}=require('./pg.cjs');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml','.txt':'text/plain'};
function start(root){
 const routes=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8')).rewrites||[];
 const srv=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://x');
  if(url.pathname.startsWith('/__rpc/')){let body='';req.on('data',c=>body+=c);req.on('end',()=>{const name=url.pathname.slice(7);let out;try{out={data:rpc(name,JSON.parse(body||'{}')),error:null};}catch(e){out={data:null,error:{message:e.message}};}res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(out));});return;}
  if(url.pathname==='/__storefront'){const row=sql("select json_build_object('data',data,'updated_at',updated_at) from public.storefront_state where id='main'",null);res.writeHead(200,{'content-type':'application/json'});res.end('['+(row||'{}')+']');return;}
  let p=decodeURIComponent(url.pathname);const r=routes.find(x=>x.source===p);if(r)p=decodeURIComponent(r.destination);
  const f=path.join(root,p);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end('no');return;}
  res.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
 }).listen(0);
 return {port:srv.address().port,close:()=>srv.close()};
}
const STUB="window.supabase={createClient(){return{rpc:async(name,args)=>{const r=await fetch('/__rpc/'+name,{method:'POST',body:JSON.stringify(args||{})});return r.json();}}}};";
async function context(browser,port,opts){
 const ctx=await browser.newContext(opts||{});
 await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase/,r=>r.fulfill({contentType:'text/javascript',body:STUB}));
 await ctx.route(/supabase\.co\/rest\/v1\/storefront_state/,async r=>{const res=await fetch('http://localhost:'+port+'/__storefront');r.fulfill({contentType:'application/json',body:await res.text()});});
 await ctx.route(/supabase\.co\/rest\/v1\/rpc\//,async r=>{const name=r.request().url().split('/rpc/')[1].split('?')[0];const res=await fetch('http://localhost:'+port+'/__rpc/'+name,{method:'POST',body:r.request().postData()||'{}'});const j=await res.json();r.fulfill({contentType:'application/json',body:JSON.stringify(j.data)});});
 await ctx.route(/googletagmanager|unpkg\.com|cdnjs\.cloudflare/,r=>r.fulfill({contentType:'text/javascript',body:''}));
 return ctx;
}
module.exports={start,context,STUB};
