import * as THREE from './vendor/three.module.js';
import {BalloonView} from './balloon-view.mjs?v=balloons-1';
import {ZOMBIE_TYPES,chooseZombieKind,zombieMotion} from './zombies.mjs?v=campaign-1';
import {stageForWave,enemyForStage,bossForWave,bossMotion} from './campaign.mjs?v=campaign-1';
import {buildStageScene} from './stage-view.mjs?v=campaign-1';
import {makeViewHand,aimHand,FINGER_TIP} from './hand-view.mjs?v=dual-guns-1';

const rnd=(a,b)=>a+Math.random()*(b-a);
const materials=new Map();
function mat(color,extra={}){const key=color+JSON.stringify(extra);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.94,...extra}));return materials.get(key)}
const boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.SphereGeometry(1,8,6);
function box(parent,color,x,y,z,w,h,d,extra={}){const m=new THREE.Mesh(boxGeo,mat(color,extra));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function ball(parent,color,x,y,z,sx,sy,sz,extra={}){const m=new THREE.Mesh(sphereGeo,mat(color,extra));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m}
function limb(parent,color,a,b,r1,r2=r1){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b);const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,av.distanceTo(bv),7),mat(color));m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());m.castShadow=true;parent.add(m);return m}

export class World{
 constructor(container){
  this.container=container;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#303a29');this.scene.fog=new THREE.FogExp2('#303a29',.037);
  this.camera=new THREE.PerspectiveCamera(56,1,.1,160);this.camera.position.set(0,2.0,8);
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;container.append(this.renderer.domElement);
  this.scene.add(new THREE.HemisphereLight('#b7c893','#171b13',2.5));const moon=new THREE.DirectionalLight('#cddaae',3);moon.position.set(-12,23,-24);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);moon.shadow.camera.left=-22;moon.shadow.camera.right=22;moon.shadow.camera.top=25;moon.shadow.camera.bottom=-25;moon.shadow.camera.far=100;moon.shadow.bias=-.0005;this.scene.add(moon);
  this.zombies=[];this.debris=[];this.ray=new THREE.Raycaster();this.clock=0;this.recoil=0;this.aim={x:0,y:0};this.buildStreet();this.streetScene=this.scene;this.streetScene.userData.dust=this.dust;this.survivalScene=this.scene;this.stage=stageForWave(1);this.stageScenes=new Map([['quarantine',this.scene]]);this.activity='survival';this.balloonView=null;this.buildHand();this.resize();
  this.preview();
 }
 buildStreet(){
  box(this.scene,'#343b30',0,-.25,-38,85,.4,150);box(this.scene,'#262c24',0,-.035,-36,12,.07,135);
  for(const side of [-1,1]){box(this.scene,'#454c3c',side*7,.02,-40,2,.24,120);box(this.scene,'#60654c',side*5.98,.13,-40,.14,.25,120);
   for(let j=0;j<10;j++){
    const z=-j*10-4,w=rnd(6,10),h=rnd(9,23);box(this.scene,['#404738','#3f493b','#515544','#343e31'][j%4],side*(8+w/2),h/2,z,w,h,9.5);
    for(let floor=2;floor<h-1;floor+=2.7){for(let k=0;k<3;k++){box(this.scene,Math.random()>.89?'#8a8f62':'#1d291f',side*(8-.02),floor,z-3+k*2.8,.04,1.45,1.1);box(this.scene,'#5a634b',side*7.94,floor-.8,z-3+k*2.8,.16,.12,1.3)}}
    box(this.scene,'#222c23',side*7.92,1.4,z, .12,2.8,4.7);box(this.scene,'#788164',side*7.78,3.05,z,.2,.27,5.5);
    if(j%2===0){box(this.scene,'#263329',side*7.6,4.3,z+3,.7,1.9,.65);for(let n=0;n<4;n++)box(this.scene,'#54664a',side*7.2,3.7+n*.37,z+3,.04,.13,.5)}
   }
  }
  for(let i=0;i<25;i++)box(this.scene,'#6e7152',0,.015,5-i*5,.12,.018,2.3);
  for(let i=0;i<5;i++)box(this.scene,'#777b5b',-3.3+i*1.55,.025,-10,1,.02,2.5);
  // Concrete roadblocks and warning slats.
  for(const [x,z,rot] of [[-4,-6,.18],[3.8,-18,-.15],[-3.9,-32,.1]]){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;this.scene.add(g);box(g,'#777b5d',0,.48,0,2.9,.95,.8);box(g,'#252d22',0,.62,.411,2.9,.4,.03);for(let i=-1;i<2;i++){const stripe=box(g,'#b0ab6d',i*.8,.62,.433,.35,.45,.02);stripe.rotation.z=-.48}box(g,'#454e3c',0,.1,0,3.1,.2,1)}
  this.car(-4.5,-17,.13,'#424b3a');this.car(4.3,-29,-.12,'#574939');this.car(-4.8,-46,.1,'#414836');
  for(const side of [-1,1])for(let z=-10;z>-80;z-=23){const x=side*6.7;limb(this.scene,'#333f30',[x,0,z],[x,7.3,z],.075);limb(this.scene,'#333f30',[x,7.3,z],[x-side*1.8,7.3,z],.065);box(this.scene,'#b9c588',x-side*1.8,7.22,z,.8,.12,.38,{emissive:'#bdcb82',emissiveIntensity:2});const light=new THREE.PointLight('#c6d394',13,15,2);light.position.set(x-side*1.8,6.9,z);this.scene.add(light)}
  // Overhead utility cables recede into the fog.
  for(let z=-17;z>-95;z-=22){const points=[];for(let i=0;i<=20;i++)points.push(new THREE.Vector3(-8+i*.8,10-Math.sin(i/20*Math.PI)*2,z));this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#18241b'})))}
  for(let i=0;i<90;i++){const x=rnd(-6,6),z=rnd(-75,5),m=box(this.scene,['#535b43','#384632','#66694d'][i%3],x,.05,z,rnd(.08,.36),rnd(.04,.18),rnd(.1,.6));m.rotation.y=rnd(0,6.2)}
  for(let i=0;i<30;i++){const side=i%2?-1:1;const g=new THREE.Group();g.position.set(side*rnd(5.5,7),0,rnd(-65,4));this.scene.add(g);for(let j=0;j<4;j++)limb(g,'#63704b',[0,0,0],[rnd(-.25,.25),rnd(.2,.65),rnd(-.2,.2)],.016,.004)}
  const particles=new Float32Array(600);for(let i=0;i<600;i+=3){particles[i]=rnd(-18,18);particles[i+1]=rnd(.2,13);particles[i+2]=rnd(-65,9)}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(particles,3));this.dust=new THREE.Points(geo,new THREE.PointsMaterial({size:.028,color:'#ccd6a8',transparent:true,opacity:.38}));this.scene.add(this.dust);
  // Distant warning beacon.
  box(this.scene,'#2b382a',.2,4.6,-54,6,.3,.3);box(this.scene,'#a58943',.2,4.5,-53.8,2.6,.65,.05);const lamp=new THREE.PointLight('#ed993e',18,14);lamp.position.set(.2,4,-50);this.scene.add(lamp);
 }
 car(x,z,rot,color){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;this.scene.add(g);box(g,color,0,.65,0,1.7,.65,4);box(g,color,0,1.16,-.3,1.5,.7,2);box(g,'#1c302b',0,1.26,.73,1.35,.5,.04);box(g,'#23352c',-.77,1.27,-.3,.02,.45,1.7);box(g,'#23352c',.77,1.27,-.3,.02,.45,1.7);for(const sx of [-.8,.8])for(const zz of [-1.25,1.25]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.33,.33,.24,10),mat('#172018'));wheel.rotation.z=Math.PI/2;wheel.position.set(sx,.35,zz);g.add(wheel)}for(const sx of [-.53,.53])box(g,'#929c73',sx,.66,2.03,.4,.2,.04)}
 makeZombie(x,z,variant=0,kind='walker',customType=null){
  const type=customType??ZOMBIE_TYPES[kind]??ZOMBIE_TYPES.walker;
  const g=new THREE.Group();g.position.set(x,0,z);this.scene.add(g);const skin=type.skin,shirt=type.shirt;g.scale.set(...type.scale);
  const body=new THREE.Group();g.add(body);box(body,shirt,0,1.17,0,.62,.69,.36);box(body,'#333e30',0,.84,0,.49,.2,.32);box(body,'#1e2a20',.09,1.28,.19,.08,.36,.016);box(body,'#72805c',-.19,1.42,.196,.11,.15,.03);
  const head=box(body,skin,0,1.73,.03,.38,.46,.36);head.rotation.z=.08;box(body,'#3b4432',0,1.97,.015,.4,.1,.36);box(body,'#535d42',0,1.61,.225,.24,.075,.016);box(body,'#293222',0,1.61,.238,.18,.032,.016);
  for(const xx of [-.105,.105]){box(body,'#33402b',xx,1.79,.225,.12,.1,.03);box(body,type.color,xx,1.785,.245,.053,.035,.018,{emissive:type.color,emissiveIntensity:2.5})}
  const arms=[];for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.37,1.43,0);body.add(arm);limb(arm,shirt,[0,0,0],[side*.08,-.24,.3],.115,.10);limb(arm,skin,[side*.08,-.24,.3],[side*.05,-.27,.69],.095,.075);box(arm,skin,side*.05,-.27,.76,.16,.1,.19);for(let f=0;f<3;f++)limb(arm,skin,[side*.05-.052+f*.05,-.27,.8],[side*.05-.052+f*.05,-.3,.94],.018);arms.push(arm)}
  const legs=[];for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.17,.78,0);g.add(leg);limb(leg,'#3a4130',[0,0,0],[0,-.34,0],.135,.115);limb(leg,'#30392a',[0,-.34,0],[0,-.65,.04],.10,.09);box(leg,'#202a21',0,-.7,.13,.23,.16,.39);legs.push(leg)}
  const hitHead=box(g,skin,0,1.75,.03,.45,.52,.43);hitHead.visible=false;const hitBody=box(g,skin,0,1.0,0,.84,1.25,.58);hitBody.visible=false;body.add(hitHead,hitBody);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.48,16),new THREE.MeshBasicMaterial({color:'#090f09',transparent:true,opacity:.30,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.019;g.add(shadow);
  if(kind==='brute'){box(body,'#26384e',0,1.25,.22,.75,.58,.19);for(const side of [-1,1])box(body,'#536b90',side*.43,1.45,0,.32,.28,.5)}
  if(kind==='runner'){for(const side of [-1,1])box(body,type.color,side*.21,1.23,.2,.06,.51,.02)}
  if(kind==='erratic'){head.rotation.z=.25;arms[1].scale.set(1,1.4,1.28)}
  // Stage-specific silhouettes: furnaces, spore growth and laboratory implants.
  if(type.stageIndex===1){for(const side of [-1,1])box(body,'#bd763a',side*.35,1.48,0,.22,.23,.48);box(body,type.color,0,1.21,.23,.24,.22,.03,{emissive:type.color,emissiveIntensity:1.5})}
  if(type.stageIndex===2){for(let i=0;i<4;i++)ball(body,i%2?'#88c18c':'#b3d981',(i-1.5)*.18,1.8+(i%2)*.2,-.02,.15,.16,.13,{emissive:'#487652',emissiveIntensity:.5})}
  if(type.stageIndex===3){box(body,'#9bbacb',0,1.81,.27,.41,.1,.04,{emissive:type.color,emissiveIntensity:1.8});box(body,'#456175',0,1.15,.24,.45,.48,.12)}
  let core=null,warningRing=null;
  if(type.boss){
   box(body,'#27323d',0,1.2,.22,.8,.72,.2);core=ball(body,type.color,0,1.27,.36,.18,.21,.09,{emissive:type.color,emissiveIntensity:3});
   for(const side of [-1,1]){box(body,type.shirt,side*.46,1.48,0,.48,.35,.6);box(arms[side===-1?0:1],type.skin,side*.05,-.27,.75,.34,.28,.35);const horn=box(body,type.color,side*.23,2.03,0,.12,.4,.12);horn.rotation.z=-side*.4}
   if(type.stageIndex===1)for(const side of [-1,1])box(arms[side===-1?0:1],'#554541',side*.05,-.28,.86,.45,.47,.4);
   if(type.stageIndex===2)for(const side of [-1,1])for(let i=0;i<3;i++)limb(body,type.color,[side*.25,1.3,0],[side*(.7+i*.15),.6+i*.4,-.2],.08,.025);
   if(type.stageIndex===3){const halo=new THREE.Mesh(new THREE.TorusGeometry(.4,.035,6,16),mat(type.color,{emissive:type.color,emissiveIntensity:2}));halo.position.set(0,2.1,0);body.add(halo)}
   warningRing=new THREE.Mesh(new THREE.RingGeometry(.75,.83,32),new THREE.MeshBasicMaterial({color:type.color,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));warningRing.rotation.x=-Math.PI/2;warningRing.position.y=.045;g.add(warningRing);
  }
  const zed={g,body,head,arms,legs,hitHead,hitBody,kind,type,hp:type.hp,maxHp:type.hp,age:0,core,warningRing,phase:rnd(0,6),speed:type.speed,attack:.5,dead:false,death:0};hitHead.userData={zed,head:true};hitBody.userData={zed,head:false};this.zombies.push(zed);return zed;
 }
 preview(){this.setStage(stageForWave(1));this.clear();this.makeZombie(1.5,-5,0,'brute');this.makeZombie(-.5,-13,1,'runner');this.makeZombie(4,-17,2,'erratic');this.makeZombie(-3,-8,0,'crawler');this.makeZombie(-2,-22,0,'walker')}
 setActivity(activity){if(activity===this.activity)return;this.clear();this.activity=activity;if(activity==='balloons'){this.balloonView??=new BalloonView();this.scene=this.balloonView.scene}else {this.scene=this.survivalScene;this.dust=this.scene.userData.dust}}
 syncBalloons(round){this.balloonView?.sync(round,this.camera)}
 burstBalloon(hit){this.balloonView?.burst(hit,this.camera)}
 setStage(stage){
  this.clear();this.stage=stage;
  if(!this.stageScenes.has(stage.id))this.stageScenes.set(stage.id,buildStageScene(stage));
  this.survivalScene=this.stageScenes.get(stage.id);if(this.activity==='survival'){this.scene=this.survivalScene;this.dust=this.scene.userData.dust}
 }
 removeZombie(z){
  this.scene.remove(z.g);const geometries=new Set();z.g.traverse(o=>{if(o.geometry&&o.geometry!==boxGeo&&o.geometry!==sphereGeo)geometries.add(o.geometry)});for(const geometry of geometries)geometry.dispose();
  // Only these per-enemy materials are not shared in the material cache.
  z.warningRing?.material.dispose();z.g.children.find(o=>o.isMesh&&o.geometry?.type==='CircleGeometry')?.material.dispose();
 }
 spawnBoss(wave){return this.makeZombie(0,-22,0,'boss',bossForWave(wave))}
 clear(){this.spawnCount=0;this.balloonView?.clear();for(const z of this.zombies)this.removeZombie(z);this.zombies=[];for(const p of this.debris){this.scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose()}this.debris=[]}

 spawn(wave){const kind=chooseZombieKind(wave,this.spawnCount??0);this.spawnCount=(this.spawnCount??0)+1;return this.makeZombie(rnd(-4.2,4.2),rnd(-25,-20),0,kind,enemyForStage(kind,wave))}
 shoot(aim,{side='left'}={}){if(side==='right')this.rightRecoil=1;else this.recoil=1;this.camera.updateMatrixWorld();this.scene.updateMatrixWorld(true);this.ray.setFromCamera(aim,this.camera);this.ray.near=0;this.ray.far=Infinity;const hits=this.ray.intersectObjects(this.targets(),false);return hits.length?this.applyHit(hits[0],1):null}
 targets(){return this.zombies.filter(z=>!z.dead).flatMap(z=>[z.hitHead,z.hitBody])}
 applyHit(hit,damage){const z=hit.object.userData.zed,head=hit.object.userData.head;if(z.dead)return {head,kill:false,kind:z.kind,points:0,point:hit.point.clone()};z.hp-=head?Math.max(z.type?.headDamage??2,damage):damage;z.g.position.z-=z.type?.boss?.025:z.kind==='brute'?.09:.25;this.sparks(hit.point,head);if(z.hp<=0){z.dead=true;z.death=0}return {head,kill:z.dead,kind:z.kind??'walker',boss:!!z.type?.boss,points:(z.type?.points??100)*(head?2:1),point:hit.point.clone()}}
 sparks(p,head){for(let i=0;i<(head?13:8);i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.05),new THREE.MeshBasicMaterial({color:i%3===0?'#e9df9a':'#71885c',transparent:true}));mesh.position.copy(p);this.scene.add(mesh);this.debris.push({mesh,v:new THREE.Vector3(rnd(-2,2),rnd(1,3),rnd(-1,2)),life:.65})}}
 buildHand(){
  this.handScene=new THREE.Scene();this.handCamera=new THREE.PerspectiveCamera(this.camera.fov,1,.03,30);this.handCamera.updateMatrixWorld();
  this.handScene.add(new THREE.HemisphereLight('#dbe6b8','#38432c',2));const key=new THREE.DirectionalLight('#ebdbb4',2.5);key.position.set(-3,4,5);this.handScene.add(key);
  const model=makeViewHand();this.hand=model.root;this.handScene.add(this.hand);this.rightHand=makeViewHand().root;this.handScene.add(this.rightHand);this.rightRecoil=0;this.muzzleLocal=FINGER_TIP.clone();
 }
 poseHand(aim,{reloading=0,side='right'}={}){aimHand(this.hand,this.handCamera,aim,{recoil:this.recoil,reloading,side})}
 poseRightHand(aim,{reloading=0}={}){aimHand(this.rightHand,this.handCamera,aim,{recoil:this.rightRecoil,reloading,side:'right'})}
 getMuzzle(side='left'){const hand=side==='right'?this.rightHand:this.hand;hand.updateMatrixWorld(true);const p=hand.localToWorld(this.muzzleLocal.clone()).project(this.handCamera);return {x:(p.x+1)*.5*this.width,y:(1-p.y)*.5*this.height}}
 resize(){const r=this.container.getBoundingClientRect();this.width=r.width;this.height=r.height;this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();this.renderer.setSize(r.width,r.height);this.handCamera.aspect=this.camera.aspect;this.handCamera.updateProjectionMatrix()}
 update(dt,{playing=false,menu=false,aim={x:0,y:0},rightAim=aim,reloading=0,rightReloading=0,showHand=true,weapon='gun'}={}){
  this.clock+=dt;this.recoil=Math.max(0,this.recoil-dt*8);this.rightRecoil=Math.max(0,this.rightRecoil-dt*8);const t=this.clock;
  const pan=this.activity==='balloons'?0:menu?Math.sin(t*.08)*.04:aim.x*.038;this.camera.rotation.set(this.activity==='balloons'?0:(menu?-.025:aim.y*.017)+this.recoil*.008,pan,0);this.camera.position.y=this.activity==='balloons'?2:2.0+Math.sin(t*1.6)*.008;this.balloonView?.update(dt);
  let attacks=0;for(let i=this.zombies.length-1;i>=0;i--){const z=this.zombies[i];if(z.dead){if(playing){z.death+=dt;z.g.rotation.x=Math.min(1.55,z.death*3);z.g.position.y=-Math.min(.8,z.death*.9);if(z.death>1.3){this.removeZombie(z);this.zombies.splice(i,1)}}continue}
   if(playing)z.age=(z.age??0)+dt;
   const motion=z.type?.boss?bossMotion(z.age,z.hp/z.maxHp,z.type.stageIndex):zombieMotion(z.kind??'walker',t,z.phase);
   if(!z.type?.boss){if(z.type?.stageIndex===1)motion.pace*=1+Math.max(0,Math.sin(t*2+z.phase))*.18;if(z.type?.stageIndex===2)motion.lateral+=Math.sin(t*2.5+z.phase)*.45;if(z.type?.stageIndex===3)motion.pace*=Math.sin(t*3+z.phase)>.6?1.4:.95}
   z.motion=motion;if(z.core){const pulse=motion.warning?1.25+Math.sin(t*20)*.15:motion.enraged?1.18:1;z.core.scale.set(.18*pulse,.21*pulse,.09*pulse)}if(z.warningRing){z.warningRing.material.opacity=motion.warning?.7:.25;z.warningRing.scale.setScalar(motion.warning?1.25:1)}
   const phase=t*motion.stride+z.phase;z.body.rotation.z=Math.sin(phase)*.05+motion.lean;z.body.position.y=Math.abs(Math.sin(phase))*(z.kind==='erratic'?.11:.028);z.body.rotation.x=z.kind==='runner'?.16:z.kind==='crawler'?.28:0;z.legs[0].rotation.x=Math.sin(phase)*(z.kind==='runner'?.7:.28)+(z.kind==='crawler'?.65:0);z.legs[1].rotation.x=-Math.sin(phase)*(z.kind==='runner'?.7:.28)+(z.kind==='crawler'?.65:0);z.arms[0].rotation.x=Math.sin(phase+.5)*.10;z.arms[1].rotation.x=Math.sin(phase+2)*.12;z.head.rotation.z=Math.sin(t*.8+z.phase)*.07;
   if(playing){const vx=-z.g.position.x*.1+motion.lateral;z.g.position.x=Math.max(-4.7,Math.min(4.7,z.g.position.x+vx*dt));z.g.position.z+=z.speed*motion.pace*dt;z.g.rotation.y=Math.atan2(-z.g.position.x,8-z.g.position.z);const reach=z.type?.boss?1.6:5.5;if(z.g.position.z>reach){z.g.position.z=reach;z.attack-=dt;if(z.attack<=0){attacks+=(z.type?.damage??1)+(motion.enraged?.4:0);z.attack=(z.type?.attackInterval??1.35)*(motion.enraged?.8:1)}}}
  }
  for(let i=this.debris.length-1;i>=0;i--){const p=this.debris[i];p.life-=dt;p.v.y-=5*dt;p.mesh.position.addScaledVector(p.v,dt);p.mesh.material.opacity=Math.max(0,p.life/.65);if(p.life<=0){this.scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();this.debris.splice(i,1)}}
  this.dust.rotation.y=t*.002;this.poseHand(aim,{reloading,side:weapon==='dual'?'left':'right'});this.hand.visible=weapon==='gun'||weapon==='dual';this.poseRightHand(rightAim,{reloading:rightReloading});this.rightHand.visible=weapon==='dual';
  this.renderer.autoClear=true;this.renderer.render(this.scene,this.camera);if(!menu&&showHand){this.renderer.autoClear=false;this.renderer.clearDepth();this.renderer.render(this.handScene,this.handCamera)}return attacks;
 }
}
