import {mkdir,cp,readdir,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const output=resolve('docs');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
for(const item of await readdir('dist',{withFileTypes:true})){
 if(item.name.startsWith('.')||item.name.startsWith('__')||/^(?:model|music|campaign)-check\./.test(item.name)||['client','server'].includes(item.name))continue;
 await cp('dist/'+item.name,output+'/'+item.name,{recursive:true});
}
await writeFile(output+'/.nojekyll','');
console.log('Built static GitHub Pages site in docs/. No server, database or private settings included.');
