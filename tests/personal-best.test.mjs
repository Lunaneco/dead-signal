import test from 'node:test';
import assert from 'node:assert/strict';
import {PersonalBestStore,BEST_STORAGE_KEY} from '../dist/personal-best.mjs';
function storage(){const items=new Map();return {getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,v)}}
const balloon=score=>({score,popped:5,maxCombo:4,accuracy:80});
const zombie=score=>({score,wave:6,kills:19});
test('only the highest score is retained across reloads, with no per-run history',()=>{
 const disk=storage(),store=new PersonalBestStore(disk);assert.equal(store.save('balloons','mouse',balloon(500),1).improved,true);
 assert.equal(store.save('balloons','mouse',balloon(200),2).improved,false);assert.equal(store.save('balloons','mouse',balloon(500),3).improved,false);
 assert.equal(store.get('balloons','mouse').date,1);assert.equal(store.save('balloons','mouse',balloon(800),4).improved,true);
 const restarted=new PersonalBestStore(disk);assert.equal(restarted.get('balloons','mouse').score,800);assert.equal(Object.keys(JSON.parse(disk.getItem(BEST_STORAGE_KEY)).records).length,1);
});
test('both games and both input modes have separate bests',()=>{
 const store=new PersonalBestStore(storage());for(const [i,activity]of ['survival','balloons'].entries())for(const [j,mode]of ['camera','mouse'].entries()){const score=100+i*200+j*50;store.save(activity,mode,activity==='survival'?zombie(score):balloon(score));assert.equal(store.get(activity,mode).score,score)}
 assert.equal(Object.keys(store.records).length,4);
});
test('blocked storage and quota failures retain an honest in-memory result',()=>{
 for(const disk of [null,{getItem(){throw new Error('blocked')},setItem(){throw new Error('quota')}}]){const store=new PersonalBestStore(disk);assert.equal(store.save('survival','camera',zombie(50)).persisted,false);assert.equal(store.get('survival','camera').score,50)}
});
test('corrupt, oversized, invalid or outdated saved data is ignored safely',()=>{
 for(const raw of ['{broken', 'x'.repeat(20000),JSON.stringify({version:1,records:{'balloons:mouse':{ruleset:'balloons-v1',score:'<script>',date:1}}}),JSON.stringify({version:1,records:{'balloons:mouse':{...balloon(300),ruleset:'old',date:1}}})]){const disk=storage();disk.setItem(BEST_STORAGE_KEY,raw);const store=new PersonalBestStore(disk);assert.equal(store.get('balloons','mouse'),null);assert.doesNotThrow(()=>store.save('balloons','mouse',balloon(30)))}
});
test('invalid input cannot poison stored bests and extra personal fields are discarded',()=>{
 const disk=storage(),store=new PersonalBestStore(disk);assert.throws(()=>store.save('balloons','mouse',balloon(-1)));assert.throws(()=>store.save('balloons','mouse',balloon(NaN)));assert.throws(()=>store.save('unknown','mouse',balloon(10)));
 store.save('balloons','mouse',{...balloon(500),name:'do not store',events:['do not store'],landmarks:[0]});const raw=disk.getItem(BEST_STORAGE_KEY);for(const field of ['name','events','landmarks'])assert.equal(raw.includes(field),false);
});
test('another tab cannot overwrite a higher saved best with a lower result',()=>{
 const disk=storage(),a=new PersonalBestStore(disk),b=new PersonalBestStore(disk);a.save('survival','mouse',zombie(800));assert.equal(b.save('survival','mouse',zombie(200)).best.score,800);assert.equal(a.get('survival','mouse').score,800);
});
