import * as THREE from './vendor/three.module.js';

// Each location has its own silhouette, lighting and landmarks, not just a tint.
export function buildStageScene(stage){
 const scene=new THREE.Scene(),palette=stage.id==='foundry'?['#382320','#402c28','#ff7d38']:stage.id==='marsh'?['#163f39','#27483e','#82ffc4']:['#1e3047','#42536a','#8fcaff'];
 scene.background=new THREE.Color(palette[0]);scene.fog=new THREE.FogExp2(palette[0],.026);
 scene.add(new THREE.HemisphereLight(palette[2],palette[0],2));
 const light=new THREE.DirectionalLight(palette[2],3);light.position.set(-9,20,8);scene.add(light);
 const geometry=new THREE.BoxGeometry(),materials=new Map();
 const material=(color,glow=false)=>{const key=color+glow;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.85,emissive:glow?color:'#000000',emissiveIntensity:glow?1.8:0}));return materials.get(key)};
 const cube=(color,x,y,z,w,h,d,glow=false)=>{const mesh=new THREE.Mesh(geometry,material(color,glow));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.receiveShadow=true;scene.add(mesh);return mesh};
 cube(palette[1],0,-.18,-40,80,.3,130);
 cube(stage.id==='marsh'?'#3a5143':'#28343e',0,.01,-35,10,.08,105);
 if(stage.id==='foundry'){
  for(const side of [-1,1]){
   cube('#ffa14a',side*6,.015,-36,1.2,.04,100,true);
   for(let z=0;z>-85;z-=12){
    cube('#59413a',side*8,4,z,2,8,3);cube('#201c1d',side*8,2.2,z+1.53,1.5,2.2,.07);cube('#ff662b',side*8,2.2,z+1.58,1.1,1.7,.03,true);
    cube('#61493c',side*6.8,5.5,z,.65,11,.65);cube('#705747',0,10.8,z,15,.5,.8);
    for(let p=0;p<3;p++)cube('#8c6850',side*(8+p*.7),7,z,.35,.35,12);
    const lamp=new THREE.PointLight('#ff7133',26,15);lamp.position.set(side*6,3,z);scene.add(lamp);
   }
  }
  for(let z=-4;z>-80;z-=8)for(const side of [-1,1])cube('#db9f53',side*4.6,.09,z,.15,.02,2);
 }else if(stage.id==='marsh'){
  cube('#123b36',-10,-.015,-40,9,.1,120);cube('#123b36',10,-.015,-40,9,.1,120);
  const sphere=new THREE.SphereGeometry(1,7,5);
  for(let i=0;i<34;i++){
   const side=i%2?-1:1,z=5-i*2.6,x=side*(6+(i%5)*1.3),h=3+(i%4)*1.1;
   const trunk=cube('#314841',x,h/2,z,.35,h,.4);trunk.rotation.z=side*.12;
   for(let j=0;j<3;j++){const branch=cube('#3c6554',x+side*j*.35,h-.4+j*.45,z,.2,2,.2);branch.rotation.z=side*(.5+j*.25)}
   const cap=new THREE.Mesh(sphere,material(i%3===0?'#b5d778':'#598f87',i%3===0));cap.position.set(x,.8+(i%3)*.22,z+1);cap.scale.set(1.25,.38,.9);scene.add(cap);cube('#607c69',x,.4,z+1,.15,.8,.15);
   if(i%6===0){const glow=new THREE.PointLight('#7df1b3',16,12);glow.position.set(x,1.2,z);scene.add(glow)}
  }
  for(let z=4;z>-90;z-=2.4)cube('#59705b',0,.08,z,9,.07,.18);
 }else{
  for(const side of [-1,1]){
   cube('#3d526c',side*7,4,-36,.5,8,110);
   for(let z=2;z>-90;z-=10){
    cube('#95d9ff',side*6.72,4,z,.04,6,.13,true);cube('#6e889c',0,7.8,z,14,.4,.6);cube('#83baff',0,7.5,z,7,.08,.5,true);
    cube('#1b324d',side*6.2,1.6,z-2,1,3.2,2.4);cube('#5c9ba6',side*5.65,1.9,z-2,.07,2.5,1.8);
    cube('#accde5',side*5.57,1.9,z-2,.05,1.4,.42);cube('#92e2ef',side*5.53,2.65,z-2,.06,.25,.38,true);
   }
  }
  for(let z=4;z>-90;z-=4)for(const side of [-1,1])cube('#75bbee',side*4.65,.07,z,.12,.02,2,true);
 }
 const dots=new Float32Array(270);for(let i=0;i<dots.length;i+=3){dots[i]=Math.sin(i*7.13)*14;dots[i+1]=1+(i%17)*.4;dots[i+2]=-(i%80)}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(dots,3));const dust=new THREE.Points(geo,new THREE.PointsMaterial({color:palette[2],size:stage.id==='marsh'?.07:.035,transparent:true,opacity:.5}));scene.add(dust);scene.userData.dust=dust;
 return scene;
}
