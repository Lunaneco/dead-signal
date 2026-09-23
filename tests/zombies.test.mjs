import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {World} from '../dist/world.mjs';
import {ZOMBIE_TYPES,chooseZombieKind,zombieMotion} from '../dist/zombies.mjs';
test('five enemy types differ in pace, durability, silhouette and behavior',()=>{
 assert.equal(Object.keys(ZOMBIE_TYPES).length,5);assert.ok(ZOMBIE_TYPES.runner.speed>ZOMBIE_TYPES.walker.speed*2);assert.equal(ZOMBIE_TYPES.brute.hp,8);assert.ok(ZOMBIE_TYPES.crawler.scale[1]<.6);const moves=Array.from({length:50},(_,i)=>zombieMotion('erratic',i*.1));assert.ok(moves.some(m=>m.lateral>1));assert.ok(moves.some(m=>m.lateral< -1));assert.ok(new Set(moves.map(m=>m.pace)).size>1);
});
test('the first waves introduce fast, low, erratic and durable enemies',()=>{
 const kinds=new Set();for(let wave=1;wave<=2;wave++)for(let i=0;i<5;i++)kinds.add(chooseZombieKind(wave,i,()=>.1));assert.deepEqual([...kinds].sort(),Object.keys(ZOMBIE_TYPES).sort());
});
test('brutes take eight body hits or two headshots; other types die from a headshot',()=>{
 const world=Object.create(World.prototype);Object.assign(world,{scene:new THREE.Scene(),zombies:[],sparks(){}});
 for(const kind of Object.keys(ZOMBIE_TYPES)){const z=world.makeZombie(0,-4,0,kind),hit={object:z.hitHead,point:new THREE.Vector3()};world.applyHit(hit,1);assert.equal(z.dead,kind!=='brute');if(kind==='brute'){world.applyHit(hit,1);assert.equal(z.dead,true)}}
 const brute=world.makeZombie(0,-4,0,'brute');for(let i=0;i<7;i++){world.applyHit({object:brute.hitBody,point:new THREE.Vector3()},1);assert.equal(brute.dead,false)}const result=world.applyHit({object:brute.hitBody,point:new THREE.Vector3()},1);assert.equal(result.kill,true);assert.equal(result.points,300);
});
test('both gun sights hit the nearest target and never damage an enemy behind it',()=>{
 const world=Object.create(World.prototype),camera=new THREE.PerspectiveCamera(56,16/9,.1,160);camera.position.set(0,2,8);camera.updateMatrixWorld();
 Object.assign(world,{scene:new THREE.Scene(),camera,ray:new THREE.Raycaster(),zombies:[],recoil:0,rightRecoil:0,sparks(){}});
 const front=world.makeZombie(0,-4,0,'walker'),back=world.makeZombie(0,-10,0,'walker');
 world.scene.updateMatrixWorld(true);const center=front.hitHead.getWorldPosition(new THREE.Vector3()).project(camera);
 const hit=world.shoot({x:center.x,y:center.y},{side:'left'});
 assert.equal(hit.head,true);assert.equal(front.dead,true);assert.equal(back.hp,back.maxHp);assert.equal(world.recoil,1);assert.equal(world.rightRecoil,0);
 world.scene.updateMatrixWorld(true);const next=back.hitHead.getWorldPosition(new THREE.Vector3()).project(camera);
 assert.equal(world.shoot({x:next.x,y:next.y},{side:'right'}).kill,true);assert.equal(world.rightRecoil,1);
 assert.equal(world.shoot({x:.95,y:.95}),null);
});
