import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {aimHand,FINGER_BASE,FINGER_TIP} from '../dist/hand-view.mjs';

test('first-person finger points away from the player toward the crosshair at every aim position',()=>{
 for(const side of ['left','right'])for(const aspect of [9/16,1,16/9,21/9])for(const recoil of [0,1])for(const x of [-.95,0,.95])for(const y of [-.9,0,.9]){
  const camera=new THREE.PerspectiveCamera(56,aspect,.03,30);camera.updateMatrixWorld();const hand=new THREE.Group();const target=aimHand(hand,camera,{x,y},{recoil,side});
  assert.equal(Math.sign(hand.position.x),side==='left'?-1:1);
  const base=hand.localToWorld(FINGER_BASE.clone()),tip=hand.localToWorld(FINGER_TIP.clone());
  assert.ok(tip.z<base.z,'the fingertip must be deeper into the scene than the knuckle');
  const finger=tip.clone().sub(base).normalize(),towardTarget=target.clone().sub(tip).normalize();assert.ok(finger.dot(towardTarget)>.999999,'finger axis and aim direction agree');
  const projected=target.clone().project(camera);assert.ok(Math.abs(projected.x-x)<1e-10);assert.ok(Math.abs(projected.y-y)<1e-10);
  const b=base.project(camera),t=tip.project(camera),u=new THREE.Vector2(t.x-b.x,t.y-b.y),v=new THREE.Vector2(x-t.x,y-t.y);assert.ok(Math.abs(u.cross(v))<1e-9,'visible finger extension passes through the crosshair');assert.ok(u.dot(v)>0,'visible finger points toward, not away from, the crosshair');
 }
});
