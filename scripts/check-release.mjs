import {createHash} from 'node:crypto';
import {MUSIC_TRACKS} from '../dist/music.mjs';
import {readdir,readFile,stat} from 'node:fs/promises';
const forbidden=/(^|\/)(\.env(?:\.|$)|\.local-data|\.openai|\.git|node_modules|__[^/]*|server|db|drizzle)(\/|$)|\.(sqlite(?:-.*)?|db|pem|key|p12|pfx|log)$/;
async function walk(root){const result=[];for(const item of await readdir(root,{withFileTypes:true})){const path=root+'/'+item.name;if(item.isSymbolicLink())throw new Error('Release symlink: '+path);if(item.isDirectory())result.push(...await walk(path));else result.push(path)}return result}
const files=await walk('docs');
for(const file of files){if(forbidden.test(file))throw new Error('Private path in release: '+file);if((await stat(file)).size>=100*1024*1024)throw new Error('File too large for GitHub: '+file);
 if(/\.(html|mjs|js|css|json|webmanifest|md|txt)$/.test(file)){const content=await readFile(file,'utf8');if(/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|appgprj_[a-f0-9]+|\/Users\/[^/]+\/)/.test(content))throw new Error('Possible private content: '+file)}
}
const html=await readFile('docs/index.html','utf8');if(!html.includes('Content-Security-Policy')||html.includes('score-form'))throw new Error('Unexpected release page');


const manifest=JSON.parse(await readFile('docs/audio/manifest.json','utf8'));
if(manifest.tracks.length!==Object.keys(MUSIC_TRACKS).length)throw new Error('Incomplete soundtrack');
for(const [id,track] of Object.entries(MUSIC_TRACKS)){const item=manifest.tracks.find(t=>t.id===id);if(!item||item.loop!==track.loop||item.file!==id+'.mp3')throw new Error('Music manifest mismatch: '+id);const bytes=await readFile('docs/audio/'+item.file);if(createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw new Error('Music hash mismatch: '+id);if(item.technical_check.decode!=='pass'||item.technical_check.true_peak_dbtp> -1.5)throw new Error('Music check failed: '+id)}
console.log('Soundtrack check passed: all nine cues and hashes match.');
console.log(`Release check passed: ${files.length} static files, no private paths or credential patterns.`);
