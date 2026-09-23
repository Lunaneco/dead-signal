import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,symlink,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import http from 'node:http';
import {join} from 'node:path';
import {createStaticServer} from '../server/dev.mjs';
import {CSP} from '../server/security.mjs';
test('local preview denies uploads, old APIs, private paths, escaping symlinks and foreign hosts',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'dead-signal-security-')),root=join(dir,'public');await mkdir(root);await writeFile(join(root,'index.html'),'test page');await writeFile(join(dir,'private.txt'),'not public');await symlink(join(dir,'private.txt'),join(root,'leak.txt'));
 const server=createStaticServer({root});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{
  const page=await fetch(base);assert.equal(page.status,200);assert.equal(page.headers.get('x-content-type-options'),'nosniff');assert.equal(page.headers.get('x-frame-options'),'DENY');assert.ok(page.headers.get('content-security-policy').includes("connect-src 'self'"));
  for(const path of ['/api/balloons/leaderboard','/.openai/hosting.json','/server/index.js','/leak.txt','/__qa.html','/%2e%2e/private.txt'])assert.equal((await fetch(base+path)).status,404,path);
  assert.equal((await fetch(base+'/api/balloons/scores',{method:'POST',body:'{}'})).status,405);
  const foreign=await new Promise((resolve,reject)=>{const req=http.get(base,{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode)});req.on('error',reject)});assert.equal(foreign,403);
  assert.equal((await (await fetch(base,{method:'HEAD'})).text()).length,0);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true})}
});
test('the published page CSP matches the server and has no external font or score transport',async()=>{
 const html=await readFile('dist/index.html','utf8'),css=await readFile('dist/style.css','utf8'),main=await readFile('dist/main.mjs','utf8'),best=await readFile('dist/personal-best.mjs','utf8');
 assert.ok(html.includes(`content="${CSP}"`));assert.ok(!css.includes('@import'));assert.ok(!/url\(\s*['"]?https?:/.test(css));
 for(const content of [main,best])assert.ok(!/fetch\(|sendBeacon|WebSocket|\/api\/balloons/.test(content));
 assert.ok(!html.includes('player-name'));assert.ok(!html.includes('score-form'));
});
