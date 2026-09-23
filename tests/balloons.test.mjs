import test from 'node:test';
import assert from 'node:assert/strict';
import {BalloonRound,BALLOON_TYPES,balloonPosition} from '../dist/balloons.mjs';

function target(round,kind){const type=BALLOON_TYPES[kind],b={id:999,kind,hp:type.hp,x:0,y:0,radius:type.radius,born:round.time,phase:0,sway:0,speed:1,life:type.life};round.targets=[b];return balloonPosition(b,round.time)}
test('random balloon schedule is deterministic across frame rates and ends at 60 seconds',()=>{
 const a=new BalloonRound(123),b=new BalloonRound(123);for(let t=0;t<=12000;t+=20)a.advance(t);b.advance(12000);assert.deepEqual(a.targets,b.targets);assert.ok(a.targets.length<=10);b.advance(61000);assert.equal(b.finished,true);assert.equal(b.time,60000);assert.equal(b.remaining,0);assert.equal(b.shoot({x:0,y:0}),null);
});
test('forbidden balloons reduce score and time; time balloons add time',()=>{
 const r=new BalloonRound(1);r.advance(0);r.score=400;const hit=r.shoot(target(r,'forbidden'));assert.equal(hit.points,-150);assert.equal(r.score,250);assert.equal(r.remaining,55000);assert.equal(r.mistakes,1);r.shoot(target(r,'time'));assert.equal(r.remaining,60000);assert.equal(r.score,300);
});
test('giant balloons require four shots; combos reward accuracy and misses reset them',()=>{
 const r=new BalloonRound(1);r.advance(0);const p=target(r,'giant');for(let i=0;i<3;i++){assert.equal(r.shoot(p).popped,false);assert.equal(r.score,0)}assert.equal(r.shoot(p).points,500);for(let i=0;i<4;i++)r.shoot(target(r,'normal'));assert.equal(r.combo,5);assert.equal(r.multiplier,1.25);assert.equal(r.maxCombo,5);r.shoot({x:1,y:1});assert.equal(r.combo,0);
});
test('a missed target breaks the combo, while avoiding a forbidden target preserves it',()=>{
 for(const kind of ['normal','forbidden']){const r=new BalloonRound(3);r.advance(0);r.combo=7;target(r,kind);r.nextSpawn=20000;r.advance(8000);assert.equal(r.combo,kind==='normal'?0:7)}
});
test('time extensions never exceed the two minute round cap and all six types spawn',()=>{
 const r=new BalloonRound(6),types=new Set();for(let t=0;t<=120000;t+=100){r.advance(t);r.targets.forEach(b=>types.add(b.kind));if(r.finished)break;if(t%1000===0)r.shoot(target(r,'time'))}assert.equal(r.time,120000);assert.equal(r.finished,true);assert.equal(types.size,6);
});
