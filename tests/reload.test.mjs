import test from 'node:test';
import assert from 'node:assert/strict';
import {HandShakeReload} from '../dist/gestures.mjs';
import {gunHand} from './gun-fixture.mjs';

function replay({delay=1000,leg=300,amplitude=.09,interval=50,direction=-1,scale=1,missing=()=>false}={}){
 const reload=new HandShakeReload(),events=[];
 for(let t=0;t<=delay+leg*2+200;t+=interval){
  const phase=Math.max(0,Math.min(2,(t-delay)/leg));
  const offsetY=direction*amplitude*(phase<=1?phase:2-phase);
  const points=gunHand().map(p=>({...p,x:.5+(p.x-.5)*scale,y:.45+(p.y-.45)*scale+offsetY}));
  if(reload.update(missing(t)?null:points,t).reload)events.push(t);
 }
 return events;
}

test('a natural short up/down shake reloads after aiming for any length of time',()=>{
 for(const delay of [0,175,475,1000,1675])for(const direction of [-1,1]){
  assert.equal(replay({delay,direction}).length,1,`delay=${delay}, direction=${direction}`);
 }
});
test('a shake is recognized at different camera frame rates and movement speeds',()=>{
 for(const interval of [33,50,100])for(const leg of [100,300,600]){
  assert.equal(replay({interval,leg,amplitude:.12,delay:1200}).length,1,`interval=${interval}, leg=${leg}`);
 }
});
test('a nearby hand does not require an exaggerated movement to reload',()=>{
 assert.equal(replay({scale:1.8,amplitude:.12}).length,1);
});
test('a brief missing camera frame during the turnaround does not discard the shake',()=>{
 assert.equal(replay({amplitude:.12,missing:t=>t===1250||t===1300}).length,1);
});
test('a long tracking gap cannot complete an old shake',()=>{
 const g=new HandShakeReload();g.update(gunHand(),0);g.update(gunHand({offsetY:-.12}),150);
 for(let t=200;t<=600;t+=50)g.update(null,t);
 assert.equal(g.update(gunHand(),650).reload,false);
});
test('small vertical aim corrections do not reload',()=>{
 assert.deepEqual(replay({amplitude:.02}),[]);
});
