import * as THREE from './vendor/three.module.js';

const FORWARD=new THREE.Vector3(0,0,-1);
export const FINGER_BASE=new THREE.Vector3(0,0,-.055);
export const FINGER_TIP=new THREE.Vector3(0,0,-.54);

// The player's wrist is near the camera; the index finger points into -Z.
// Transform its barrel axis onto the same projected target as the hit ray.
export function aimHand(hand,camera,aim,{recoil=0,reloading=0,side='right'}={}){
 const depth=12,halfHeight=Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))*depth;
 const target=new THREE.Vector3(aim.x*halfHeight*camera.aspect,aim.y*halfHeight,-depth);
 const dip=Math.sin(reloading*Math.PI);
 const handedness=side==='left'?-1:1;hand.scale.x=handedness;
 hand.position.set(handedness*.25*Math.min(camera.aspect,1.3)+aim.x*.075,-.31+aim.y*.035-dip*.42,-1.0+recoil*.045);
 hand.quaternion.setFromUnitVectors(FORWARD,target.clone().sub(hand.position).normalize());
 if(reloading)hand.rotateX(-dip*.85);
 hand.updateMatrixWorld(true);
 return target;
}

export function makeViewHand(){
 const root=new THREE.Group();
 const skin=new THREE.MeshStandardMaterial({color:'#b0aa82',roughness:.9});
 const joint=new THREE.MeshStandardMaterial({color:'#969472',roughness:1});
 const sleeve=new THREE.MeshStandardMaterial({color:'#35432e',roughness:1});
 const cuff=new THREE.MeshStandardMaterial({color:'#243026',roughness:1});
 const nail=new THREE.MeshStandardMaterial({color:'#c0b792',roughness:.8});
 const sphere=new THREE.SphereGeometry(1,12,8);
 function ellipsoid(parent,material,position,scale){const m=new THREE.Mesh(sphere,material);m.position.set(...position);m.scale.set(...scale);parent.add(m);return m}
 function segment(parent,material,a,b,r1,r2=r1){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,start.distanceTo(end),10),material);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());parent.add(mesh);return mesh}
 // Forearm enters from below, showing the back/side of the hand to the player.
 segment(root,sleeve,[.055,-.30,.65],[0,-.12,.27],.12,.093);
 segment(root,cuff,[.007,-.145,.32],[0,-.12,.255],.102,.10);
 segment(root,skin,[0,-.12,.27],[0,-.10,.10],.088,.092);
 ellipsoid(root,skin,[0,-.10,.065],[.095,.155,.18]);
 // Straight index finger: the muzzle is the actual endpoint of its mesh.
 segment(root,skin,[0,0,-.045],[0,0,-.22],.046,.040);
 ellipsoid(root,joint,[0,0,-.22],[.041,.043,.043]);
 segment(root,skin,[0,0,-.22],[0,0,-.39],.040,.034);
 ellipsoid(root,skin,[0,0,-.39],[.035,.037,.037]);
 segment(root,skin,[0,0,-.39],[0,0,-.50],.034,.031);
 ellipsoid(root,skin,[0,0,-.502],[.031,.032,.038]);
 ellipsoid(root,nail,[0,.031,-.474],[.023,.004,.032]);
 // Restore the earlier first-person hand silhouette, with a relaxed middle finger.
 const middle=new THREE.Group();middle.position.set(0,-.085,-.075);root.add(middle);
 segment(middle,skin,[0,0,0],[0,0,-.145],.040,.037);
 const middlePip=new THREE.Group();middlePip.position.z=-.145;middle.add(middlePip);
 ellipsoid(middlePip,joint,[0,0,0],[.039,.039,.039]);
 segment(middlePip,skin,[0,0,0],[0,0,-.12],.037,.032);
 const middleDip=new THREE.Group();middleDip.position.z=-.12;middlePip.add(middleDip);
 ellipsoid(middleDip,skin,[0,0,0],[.033,.034,.033]);
 segment(middleDip,skin,[0,0,0],[0,0,-.085],.032,.027);
 ellipsoid(middleDip,skin,[0,0,-.085],[.028,.029,.033]);
 middle.rotation.x=-.35*.75;middlePip.rotation.x=-.35*1.45;middleDip.rotation.x=-.35*.8;
 // Ring and little fingers stay curled below the middle finger.
 for(let i=1;i<3;i++){
  const finger=new THREE.Group();finger.position.set(0,-.085-i*.075,-.075);root.add(finger);
  const r=.040-i*.004,length=.145-i*.014;
  segment(finger,skin,[0,0,0],[0,-.018,-length],r,r*.93);
  ellipsoid(finger,joint,[0,-.018,-length],[r,r,r]);
  segment(finger,skin,[0,-.018,-length],[-.060,-.02,-length+.015],r*.93,r*.84);
  segment(finger,skin,[-.060,-.02,-length+.015],[-.075,-.008,.015],r*.84,r*.75);
  ellipsoid(finger,skin,[-.075,-.008,.015],[r*.76,r*.80,r*.85]);
 }
 const thumb=new THREE.Group();thumb.position.set(-.095,-.075,.10);root.add(thumb);
 segment(thumb,skin,[0,0,0],[-.035,.115,-.015],.043,.036);
 ellipsoid(thumb,skin,[-.035,.115,-.015],[.038,.039,.038]);
 segment(thumb,skin,[-.035,.115,-.015],[-.033,.20,-.04],.036,.030);
 ellipsoid(thumb,skin,[-.033,.20,-.04],[.031,.033,.032]);
 return {root};
}
