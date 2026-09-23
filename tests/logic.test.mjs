import test from 'node:test';
import assert from 'node:assert/strict';
import {gunHand} from './gun-fixture.mjs';
import {Magazine,GestureTrigger,classifyHand,HandPresenceGate,HandShakeReload} from '../dist/gestures.mjs';

function hand({open=false,touch=false,middleExtended=false,indexExtended=true}={}){
 const p=Array.from({length:21},()=>({x:0,y:0,z:0}));p[0]={x:0,y:0,z:0};p[1]={x:-.2,y:.15,z:0};p[2]={x:-.35,y:.25,z:0};p[3]={x:-.45,y:.5,z:0};
 for(let f=0;f<4;f++){const i=5+f*4,x=-.3+f*.2;const extended=(f===0&&indexExtended)||(f===1&&middleExtended)||open;p[i]={x,y:.5,z:0};p[i+1]={x,y:.8,z:0};p[i+2]={x,y:extended?1.0:.6,z:extended?0:.16};p[i+3]={x,y:extended?1.2:.46,z:extended?0:.17}}
 p[4]=touch?{x:-.36,y:.8,z:0}:{x:-.83,y:.65,z:0};return p;
}
const transforms=[p=>p,p=>({x:-p.x,y:p.y,z:p.z}),p=>({x:p.y*2+3,y:-p.x*2+2,z:p.z*2}),p=>({x:p.z*.3+.5,y:p.x*.3-.2,z:p.y*.3})];
test('magazine: 12 shots, cooldown, empty fire and timed reload',()=>{const m=new Magazine();assert.equal(m.reload(0),false);for(let i=0;i<12;i++){assert.equal(m.shoot(i*250),true);assert.equal(m.shoot(i*250+50),false)}assert.equal(m.ammo,0);assert.equal(m.shoot(4000),false);assert.equal(m.reload(4100),true);assert.equal(m.shoot(5000),false);assert.equal(m.reload(5000),false);assert.equal(m.tick(5499),false);assert.equal(m.tick(5500),true);assert.equal(m.ammo,12);assert.equal(m.shoot(5500),true)});
test('gun pose and open palm remain valid after mirror, rotation and scaling',()=>{for(const transform of transforms){assert.equal(classifyHand(hand().map(transform)).gun,true);assert.equal(classifyHand(hand({open:true}).map(transform)).open,true)}});
test('holding the gun pose automatically fires at 250 ms intervals without thumb movement',()=>{
 const g=new GestureTrigger(),p=hand(),shots=[];
 for(let t=0;t<=1200;t+=50){const s=g.update(p,t);if(s.fire)shots.push(t);assert.equal(s.armed,t>=150)}
 assert.deepEqual(shots,[150,400,650,900,1150]);
});
test('thumb contact and middle-finger motion do not change the automatic firing rhythm',()=>{
 const g=new GestureTrigger(),shots=[];
 for(let t=0;t<=1200;t+=50){const s=g.update(hand({touch:t%100===0,middleExtended:t%150===0}),t);if(s.fire)shots.push(t)}
 assert.deepEqual(shots,[150,400,650,900,1150]);
});
test('a fist or curled index cannot fire even with the thumb touching the old trigger joint',()=>{
 for(const transform of transforms){const g=new GestureTrigger(),p=hand({indexExtended:false,touch:true}).map(transform);for(let t=0;t<=600;t+=100){assert.equal(classifyHand(p).gun,false);assert.equal(g.update(p,t).fire,false)}}
});
test('automatic fire works with mirrored, rotated and differently sized hands',()=>{
 for(const transform of transforms){const g=new GestureTrigger(),p=hand().map(transform);assert.equal(g.update(p,0).fire,false);assert.equal(g.update(p,149).fire,false);assert.equal(g.update(p,150).fire,true);assert.equal(g.update(p,399).fire,false);assert.equal(g.update(p,400).fire,true)}
});
test('breaking the pose stops fire immediately; a fresh stable pose is required to resume',()=>{
 for(const stop of [hand({indexExtended:false}),hand({open:true}),null]){const g=new GestureTrigger();g.update(hand(),0);assert.equal(g.update(hand(),150).fire,true);assert.equal(g.update(stop,400).fire,false);assert.equal(g.armed,false);assert.equal(g.update(hand(),450).fire,false);assert.equal(g.update(hand(),550).fire,false);assert.equal(g.update(hand(),600).fire,true)}
});
test('brief pose flicker and stale input do not start shooting or produce catch-up bursts',()=>{
 const g=new GestureTrigger();g.update(hand(),0);assert.equal(g.update(hand(),100).fire,false);g.update(null,125);assert.equal(g.update(hand(),150).fire,false);assert.equal(g.update(hand(),300).fire,true);
 assert.equal(g.update(hand(),1000).fire,false);assert.equal(g.update(hand(),1150).fire,true);assert.equal(g.update(hand(),1150).fire,false);assert.equal(g.update(hand(),1151).fire,false);
});
test('one vertical round trip reloads in either direction and pauses shooting during the shake',()=>{
 for(const direction of [-1,1]){const g=new GestureTrigger();g.update(gunHand(),0);assert.equal(g.update(gunHand(),150).fire,true);
  const turn=g.update(gunHand({offsetY:direction*.16}),250);assert.equal(turn.shaking,true);assert.equal(turn.fire,false);
  const finish=g.update(gunHand({offsetY:-direction*.02}),350);assert.equal(finish.reload,true);assert.equal(finish.fire,false);
  assert.equal(g.update(gunHand({offsetY:-direction*.02}),400).reload,false);
 }
});
test('open palms, horizontal sweeps, small jitter and one-way movement never reload',()=>{
 for(const type of ['open','horizontal','jitter','one-way']){const g=new GestureTrigger();for(let t=0;t<=1600;t+=100){const offset=t%400<200?0:.16;const p=gunHand({open:type==='open',offsetX:type==='horizontal'?offset:0,offsetY:type==='jitter'?offset*.1:type==='one-way'?t*.0003:0});assert.equal(g.update(p,t).reload,false,type)}}
});
test('tracking loss and stale frames cancel the pending shake',()=>{
 for(const lost of [true,false]){const g=new HandShakeReload();g.update(gunHand(),0);g.update(gunHand({offsetY:-.16}),150);if(lost)g.update(null,200);assert.equal(g.update(gunHand(),500).reload,false)}
});
test('automatic fire empties the magazine, stays blocked during a shake reload, and resumes afterwards',()=>{
 const g=new GestureTrigger(),m=new Magazine(),shots=[];
 function step(t,p){m.tick(t);const s=g.update(p,t);if(s.fire&&m.shoot(t))shots.push(t);if(s.reload)m.reload(t)}
 for(let t=0;t<=3250;t+=50)step(t,gunHand());assert.equal(m.ammo,0);assert.equal(shots.length,12);
 step(3350,gunHand({offsetY:-.16}));step(3450,gunHand({offsetY:.02}));assert.equal(m.reloadStart,3450);
 for(let t=3500;t<=4800;t+=50)step(t,gunHand({offsetY:.02}));assert.equal(shots.length,12);assert.equal(m.ammo,0);
 for(let t=4850;t<=5100;t+=50)step(t,gunHand({offsetY:.02}));assert.equal(shots.length,13);assert.equal(m.ammo,11);
});
test('invalid landmarks disarm the trigger and require a new stable pose',()=>{
 for(const invalid of [[],hand().slice(0,20),hand().map(p=>({...p,x:NaN})),Array.from({length:21},()=>({x:0,y:0,z:0}))]){const g=new GestureTrigger();g.update(hand(),0);g.update(hand(),150);assert.equal(g.update(invalid,400).fire,false);assert.equal(g.armed,false);assert.equal(g.update(hand(),450).fire,false)}
});

const visibleHand=()=>hand().map(p=>({x:.5+p.x*.25,y:.2+p.y*.45,z:p.z}));
test('camera startup waits indefinitely without a hand, then requires a full second',()=>{const g=new HandPresenceGate();assert.equal(g.update(null,0).ready,false);assert.equal(g.update(null,60000).ready,false);const p=visibleHand();for(let t=60100;t<61100;t+=100)assert.equal(g.update(p,t).ready,false);assert.equal(g.update(p,61100).ready,true)});
test('camera startup resets when a hand disappears or frames stop arriving',()=>{const g=new HandPresenceGate(),p=visibleHand();for(let t=0;t<800;t+=100)g.update(p,t);assert.equal(g.update(null,800).progress,0);assert.equal(g.update(p,900).progress,0);assert.equal(g.update(p,1500).progress,0);for(let t=1600;t<2500;t+=100)assert.equal(g.update(p,t).ready,false);assert.equal(g.update(p,2500).ready,true)});
test('camera startup does not accept a clipped or invalid hand',()=>{const g=new HandPresenceGate(),p=visibleHand();p[8].x=1.1;assert.equal(g.update(p,0).visible,false);p[8].x=NaN;assert.equal(g.update(p,1000).ready,false);g.reset();assert.equal(g.update(visibleHand(),2000).progress,0)});
