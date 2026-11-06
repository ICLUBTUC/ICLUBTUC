// Ayudante para pruebas con PostgreSQL real (psql). Cada llamada corre como "anon", igual que la web.
const {execFileSync}=require('node:child_process');
const PG=['-h',process.env.PGHOST||'/tmp','-p',process.env.PGPORT||'5433','-U','postgres','-d',process.env.PGDB||'iclub','-X','-q','-tA','-v','ON_ERROR_STOP=1'];
function lit(v){if(v===null||v===undefined)return 'null';if(typeof v==='number'||typeof v==='boolean')return String(v);if(typeof v==='object')v=JSON.stringify(v);return "'"+String(v).replace(/'/g,"''")+"'";}
function sql(s,role='anon'){const out=execFileSync('psql',[...PG,'-c',(role?`set role ${role};`:'')+s],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();return out;}
function rpc(name,args,role='anon'){const keys=Object.keys(args);const call=`select public.${name}(${keys.map(k=>k+'=>'+lit(args[k])+(typeof args[k]==='object'&&args[k]!==null?'::jsonb':'')).join(',')})`;try{return JSON.parse(sql(call,role));}catch(e){const m=String(e.stderr||e.message).match(/ERROR:\s+(.*)/);const err=new Error(m?m[1]:e.message);err.sqlError=true;throw err;}}
module.exports={sql,rpc,lit};
