import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {Campaign,STAGES,stageForWave,encounterForWave,enemyForStage,bossForWave,bossMotion} from '../dist/campaign.mjs';
import {World} from '../dist/world.mjs';
import {buildStageScene} from '../dist/stage-view.mjs';

function worldFixture(){
 const w=Object.create(World.prototype),scene=new THREE.Scene();
 Object.assign(w,{scene,streetScene:scene,survivalScene:scene,stageScenes:new Map([['quarantine',scene]]),activity:'survival',zombies:[],debris:[],sparks(){}});
 return w;
}
test('every fifth wave is a single boss encounter and unlocks the next area',()=>{
 const campaign=new Campaign();let alive=0,bosses=0,changes=0;
 while(campaign.wave<=25){
  const events=campaign.update(.5,alive);
  for(const e of events){
   if(e.type==='spawn'){alive++;assert.equal(e.boss,campaign.wave%5===0);if(e.boss){bosses++;assert.equal(campaign.encounter.total,1)}}
   if(e.type==='clear'){assert.equal(e.stageCleared,campaign.wave%5===0);assert.equal(alive,0)}
   if(e.type==='advance'){if(e.stageChanged)changes++;assert.equal(e.encounter.stage.number,Math.ceil(campaign.wave/5))}
  }
  alive=0;
 }
 assert.equal(bosses,5);assert.equal(changes,5);assert.equal(stageForWave(21).id,STAGES[0].id);assert.equal(stageForWave(21).cycle,1);
});
test('a live boss blocks progress; killing it gives exactly one clear and one delayed transition',()=>{
 const campaign=new Campaign(5),w=worldFixture();assert.equal(campaign.update(0,0).length,0);
 assert.equal(campaign.update(.5,0)[0].type,'spawn');const boss=w.spawnBoss(5);
 for(let i=0;i<20;i++)assert.deepEqual(campaign.update(.1,1),[]);
 while(boss.hp>3)w.applyHit({object:boss.hitHead,point:new THREE.Vector3()},1);
 assert.equal(boss.dead,false);assert.deepEqual(campaign.update(.1,1),[]);
 const hit=w.applyHit({object:boss.hitHead,point:new THREE.Vector3()},1);assert.equal(hit.kill,true);assert.equal(hit.boss,true);
 assert.equal(campaign.update(.1,0)[0].stageCleared,true);assert.equal(campaign.wave,5);
 assert.deepEqual(campaign.update(0,0),[]);assert.deepEqual(campaign.update(3.9,0),[]);
 const events=campaign.update(.2,0);assert.equal(events.length,1);assert.equal(events[0].stageChanged,true);assert.equal(campaign.wave,6);
 w.setStage(campaign.encounter.stage);assert.equal(w.zombies.length,0);assert.equal(w.debris.length,0);assert.notEqual(w.scene,w.streetScene);
 assert.deepEqual(campaign.update(.1,0),[]);campaign.reset();assert.equal(campaign.wave,1);assert.equal(campaign.spawned,0);assert.equal(campaign.phase,'fight');
});
test('all regular spawns must be completed before a wave can clear',()=>{
 const c=new Campaign();assert.deepEqual(c.update(.1,0),[]);let spawned=0;
 while(spawned<5){for(const e of c.update(.5,0)){assert.equal(e.type,'spawn');spawned++}}
 assert.equal(c.update(.1,1).length,0);assert.equal(c.update(.1,0)[0].stageCleared,false);
 assert.deepEqual(c.update(2,0),[]);assert.equal(c.update(.5,0)[0].stageChanged,false);assert.equal(c.wave,2);
});
test('new areas replace enemy identities and progressively raise health, speed and encounter density',()=>{
 const names=new Set();let hp=0,speed=0,bossHp=0;
 for(const wave of [1,6,11,16,21,26]){
  const enemy=enemyForStage('brute',wave),boss=bossForWave(wave+4);assert.ok(enemy.hp>=hp);assert.ok(enemy.speed>speed);assert.ok(boss.hp>bossHp);hp=enemy.hp;speed=enemy.speed;bossHp=boss.hp;
  if(wave<=16){names.add(enemy.name);assert.equal(enemy.stageIndex,(wave-1)/5)}
 }
 assert.equal(names.size,4);assert.ok(encounterForWave(6).total>encounterForWave(1).total);assert.ok(encounterForWave(6).interval<encounterForWave(1).interval);
});
test('bosses telegraph charges and enrage below half health without dying in one headshot',()=>{
 const warning=bossMotion(4.5,1),rush=bossMotion(5.5,1),rage=bossMotion(5.5,.4);
 assert.equal(warning.warning,true);assert.ok(warning.pace<1);assert.ok(rush.pace>2);assert.equal(rage.enraged,true);assert.ok(rage.pace>rush.pace);
 const w=worldFixture();for(const wave of [5,10,15,20]){const boss=w.spawnBoss(wave);w.applyHit({object:boss.hitHead,point:new THREE.Vector3()},1);assert.equal(boss.dead,false);assert.equal(boss.hp,boss.maxHp-3);assert.ok(boss.core);assert.ok(boss.warningRing)}
 w.clear();assert.equal(w.zombies.length,0);
});
test('alternate stages build distinct complete scene graphs and cached worlds restore correctly',()=>{
 const w=worldFixture();for(const wave of [6,11,16]){const stage=stageForWave(wave),scene=buildStageScene(stage);assert.ok(scene.children.length>40);assert.ok(scene.fog);assert.ok(scene.userData.dust);w.setStage(stage);const previous=w.scene;w.setStage(stage);assert.equal(w.scene,previous)}
 w.setActivity('survival');w.setStage(stageForWave(1));assert.equal(w.scene,w.streetScene);
});
