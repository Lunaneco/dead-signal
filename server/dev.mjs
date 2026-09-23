import http from 'node:http';
import {readFile,stat,realpath} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SECURITY_HEADERS} from './security.mjs';
const mime={'.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webmanifest':'application/manifest+json','.task':'application/octet-stream','.wasm':'application/wasm','.json':'application/json','.ttf':'font/ttf','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};
export function createStaticServer({root=resolve('dist')}={}){
 return http.createServer(async(req,res)=>{
  const port=req.socket.localPort,headers={...SECURITY_HEADERS,'Cache-Control':'no-store'};
  const reply=(status,body='')=>{res.writeHead(status,{...headers,'Content-Type':'text/plain; charset=utf-8'});res.end(req.method==='HEAD'?'':body)};
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host))return reply(403,'Forbidden');
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return reply(405,'Method not allowed')}
  try{
   const url=new URL(req.url,'http://localhost'),decoded=decodeURIComponent(url.pathname);
   if(decoded.includes('\\')||decoded.split('/').some(p=>p.startsWith('.')||p.startsWith('__')||['api','server','client','node_modules'].includes(p)))return reply(404,'Not found');
   const canonicalRoot=await realpath(root),path=await realpath(resolve(canonicalRoot,'.'+(decoded==='/'?'/index.html':decoded)));
   if(!path.startsWith(canonicalRoot+sep)||!(await stat(path)).isFile())return reply(404,'Not found');
   res.writeHead(200,{...headers,'Content-Type':mime[extname(path)]??'application/octet-stream'});res.end(req.method==='HEAD'?undefined:await readFile(path));
  }catch{return reply(404,'Not found')}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT??4387);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid port');
 const server=createStaticServer();server.listen(port,'127.0.0.1',()=>console.log(`DEAD SIGNAL: http://127.0.0.1:${port}/ — personal best stays in this browser`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
}
