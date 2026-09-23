import test from 'node:test';
import assert from 'node:assert/strict';
import {HandTracker} from '../dist/hands.mjs';
import {gunHand,handResult} from './gun-fixture.mjs';
const makeTracker=()=>new HandTracker({videoWidth:640,videoHeight:480},{},()=>{},e=>{throw e});
test('raw Left and Right labels activate only the matching gun',()=>{
 for(const categoryName of ['Left','Right']){
  const tracker=makeTracker(),points=gunHand({side:categoryName.toLowerCase()});
  const result={landmarks:[points],handedness:[[{categoryName,score:.99}]]};
  tracker.processResult(result,0);const frame=tracker.processResult(result,150);
  assert.equal(frame.leftLandmarks,categoryName==='Left'?points:null);
  assert.equal(frame.rightLandmarks,categoryName==='Right'?points:null);
  assert.equal(frame.gesture.fire,categoryName==='Left');
  assert.equal(frame.rightGesture.fire,categoryName==='Right');
 }
});
test('anatomical left and right each fire their gun, independently of detection array order',()=>{
 const tracker=makeTracker();const left=gunHand({side:'left'}),right=gunHand({side:'right'});
 tracker.processResult(handResult([{side:'left',points:left},{side:'right',points:right}]),0);
 const frame=tracker.processResult(handResult([{side:'right',points:right},{side:'left',points:left}]),150);
 assert.equal(frame.leftLandmarks,left);assert.equal(frame.rightLandmarks,right);assert.equal(frame.gesture.fire,true);assert.equal(frame.rightGesture.fire,true);
 const next=tracker.processResult(handResult([{side:'left',points:left},{side:'right',points:right}]),400);assert.equal(next.gesture.fire,true);assert.equal(next.rightGesture.fire,true);
});
test('crossing hands on screen does not swap the two guns',()=>{
 const tracker=makeTracker(),left=gunHand({side:'left',offsetX:-.4}),right=gunHand({side:'right',offsetX:.4}),result=handResult([{side:'right',points:right},{side:'left',points:left}]);
 tracker.processResult(result,0);const frame=tracker.processResult(result,150);assert.equal(frame.leftLandmarks,left);assert.equal(frame.rightLandmarks,right);assert.equal(frame.gesture.fire,true);assert.equal(frame.rightGesture.fire,true);
});
test('either hand can play alone; losing one hand stops only that gun',()=>{
 for(const side of ['left','right']){const tracker=makeTracker();tracker.processResult(handResult([{side:'left'},{side:'right'}]),0);tracker.processResult(handResult([{side:'left'},{side:'right'}]),150);
  const frame=tracker.processResult(handResult([{side}]),400);assert.equal(frame.gesture.fire,side==='left');assert.equal(frame.rightGesture.fire,side==='right');
  const returned=tracker.processResult(handResult([{side:'left'},{side:'right'}]),450);assert.equal(returned.gesture.fire,false);assert.equal(returned.rightGesture.fire,false);
 }
});
test('uncertain or duplicate handedness never assigns the same hand to a different weapon slot',()=>{
 for(const bad of [{landmarks:[gunHand()]},{...handResult([{side:'left',score:.5}])},handResult([{side:'left'},{side:'left'}])]){const tracker=makeTracker();tracker.processResult(handResult([{side:'left'},{side:'right'}]),0);const frame=tracker.processResult(bad,150);assert.equal(frame.gesture.fire,false);assert.equal(frame.rightGesture.fire,false)}
 const tracker=makeTracker(),result=handResult([{side:'left',score:.4},{side:'right'}]);tracker.processResult(result,0);const frame=tracker.processResult(result,150);assert.equal(frame.gesture.fire,false);assert.equal(frame.rightGesture.fire,true);
});
test('a vertical shake reloads only that hand, while the other hand keeps firing',()=>{
 for(const side of ['left','right']){const tracker=makeTracker();function frame(t,offsetY=0){return tracker.processResult(handResult([{side:'left',offsetY:side==='left'?offsetY:0},{side:'right',offsetY:side==='right'?offsetY:0}]),t)}
  frame(0);frame(150);frame(250,-.16);const reloaded=frame(350,.02);assert.equal(reloaded.gesture.reload,side==='left');assert.equal(reloaded.rightGesture.reload,side==='right');
  const next=frame(400,.02);assert.equal(next.gesture.fire,side==='right');assert.equal(next.rightGesture.fire,side==='left');
 }
});
test('an open palm stops its own gun and never changes weapons or reloads',()=>{
 const tracker=makeTracker();for(let t=0;t<=1000;t+=100){const frame=tracker.processResult(handResult([{side:'left',open:true},{side:'right'}]),t);assert.equal(frame.gesture.fire,false);assert.equal(frame.gesture.reload,false);assert.equal(frame.rightLandmarks?.length,21)}
});
test('reset disarms both hands before a new game or resume',()=>{
 const tracker=makeTracker(),result=handResult([{side:'left'},{side:'right'}]);tracker.processResult(result,0);tracker.processResult(result,150);tracker.resetGestures();const frame=tracker.processResult(result,200);assert.equal(frame.gesture.fire,false);assert.equal(frame.rightGesture.fire,false);assert.equal(tracker.trigger.armed,false);assert.equal(tracker.rightTrigger.armed,false);
});
