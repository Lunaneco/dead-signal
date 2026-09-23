import * as THREE from './vendor/three.module.js';
import {BALLOON_TYPES,balloonPosition} from './balloons.mjs?v=balloons-1';
const sphere=new THREE.SphereGeometry(1,28,22),knot=new THREE.ConeGeometry(.085,.18,10);
export class BalloonView{
 constructor(){
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#10182d');this.scene.fog=new THREE.Fog('#10182d',32,85);this.meshes=new Map();this.labels=new Map();this.particles=[];
  this.scene.add(new THREE.HemisphereLight('#e8f6ff','#283355',3.2));const key=new THREE.DirectionalLight('#fff3f9',4);key.position.set(-6,10,10);this.scene.add(key);const rim=new THREE.PointLight('#658cff',90,35);rim.position.set(7,4,-3);this.scene.add(rim);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:'#121e35',roughness:.55,metalness:.35}));floor.rotation.x=-Math.PI/2;floor.position.y=-3;this.scene.add(floor);
  const grid=new THREE.GridHelper(100,40,'#264e78','#1c2e49');grid.position.y=-2.98;this.scene.add(grid);
  for(const x of [-20,-12,12,20]){const pillar=new THREE.Mesh(new THREE.BoxGeometry(.05,25,.05),new THREE.MeshBasicMaterial({color:x<0?'#703985':'#216d82'}));pillar.position.set(x,6,-30);this.scene.add(pillar)}
 }
 label(kind){if(this.labels.has(kind))return this.labels.get(kind);const type=BALLOON_TYPES[kind],c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');g.textAlign='center';g.textBaseline='middle';g.fillStyle=kind==='forbidden'?'#fff':'#14213c';g.font=`800 ${kind==='forbidden'?104:kind==='giant'?45:60}px sans-serif`;g.fillText(type.mark,128,66);const texture=new THREE.CanvasTexture(c);this.labels.set(kind,texture);return texture}
 create(b){const group=new THREE.Group(),type=BALLOON_TYPES[b.kind];const material=new THREE.MeshPhysicalMaterial({color:type.color,roughness:.22,metalness:.10,clearcoat:1,clearcoatRoughness:.14});const body=new THREE.Mesh(sphere,material);group.add(body);
  const neck=new THREE.Mesh(knot,material);neck.position.y=-1.07;neck.rotation.z=Math.PI;group.add(neck);
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-1.12,0),new THREE.Vector3(.08,-1.5,0),new THREE.Vector3(-.07,-1.9,0),new THREE.Vector3(.02,-2.18,0)]),new THREE.LineBasicMaterial({color:'#ced6ee',transparent:true,opacity:.55}));group.add(line);
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:this.label(b.kind),depthTest:false,transparent:true}));label.position.set(0,0,1.03);label.scale.set(1.8,.9,1);group.add(label);this.scene.add(group);const entry={group,body,material,line,hp:b.hp};this.meshes.set(b.id,entry);return entry}
 remove(id){const entry=this.meshes.get(id);if(!entry)return;this.scene.remove(entry.group);entry.material.dispose();entry.line.geometry.dispose();entry.line.material.dispose();entry.group.children.find(c=>c.isSprite)?.material.dispose();this.meshes.delete(id)}
 sync(round,camera){
  if(!round)return;const ids=new Set(round.targets.map(b=>b.id));for(const id of this.meshes.keys())if(!ids.has(id))this.remove(id);
  const d=10,h=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*d,w=h*camera.aspect;
  for(const b of round.targets){const e=this.meshes.get(b.id)??this.create(b),p=balloonPosition(b,round.time);e.group.position.set(p.x*w,p.y*h+camera.position.y,camera.position.z-d);e.group.scale.set(p.rx*w,p.ry*h,p.rx*w*.8);e.material.emissive.set(b.hp<BALLOON_TYPES[b.kind].hp?'#40204c':'#000000');e.body.scale.setScalar(b.kind==='giant'?1-(4-b.hp)*.06:1);e.group.rotation.z=Math.sin(round.time/650+b.phase)*.045}
 }
 burst(hit,camera){if(!hit.popped)return;const d=10,h=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*d,w=h*camera.aspect,p=new THREE.Vector3(hit.position.x*w,hit.position.y*h+camera.position.y,camera.position.z-d);for(let i=0;i<16;i++){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.06+Math.random()*.06,.15),new THREE.MeshBasicMaterial({color:BALLOON_TYPES[hit.kind].color,side:THREE.DoubleSide,transparent:true}));mesh.position.copy(p);this.scene.add(mesh);this.particles.push({mesh,life:.7,v:new THREE.Vector3((Math.random()-.5)*5,(Math.random()-.3)*5,Math.random()*2)})}}
 update(dt){for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;p.v.y-=5*dt;p.mesh.position.addScaledVector(p.v,dt);p.mesh.rotation.z+=dt*7;p.mesh.material.opacity=Math.max(0,p.life/.7);if(p.life<=0){this.scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();this.particles.splice(i,1)}}}
 clear(){for(const id of [...this.meshes.keys()])this.remove(id);for(const p of this.particles){this.scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose()}this.particles=[]}
}
