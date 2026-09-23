export const CONNECTIONS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0));
export const GUN_POSE_HOLD_MS=150,GUN_FIRE_INTERVAL_MS=250;
function straight(p,a,b,c){const u=[p[a].x-p[b].x,p[a].y-p[b].y,(p[a].z??0)-(p[b].z??0)],v=[p[c].x-p[b].x,p[c].y-p[b].y,(p[c].z??0)-(p[b].z??0)];return (u[0]*v[0]+u[1]*v[1]+u[2]*v[2])/(Math.hypot(...u)*Math.hypot(...v)||1)<-.68}
export function classifyHand(p){
 if(!p||p.length!==21||!p.every(q=>q&&Number.isFinite(q.x)&&Number.isFinite(q.y)&&Number.isFinite(q.z??0)))return {gun:false,open:false};
 const extended=[5,9,13,17].map(base=>straight(p,base,base+1,base+3)&&distance(p[base+3],p[0])>distance(p[base+1],p[0])*1.09);
 const palmSize=Math.max(distance(p[5],p[17]),distance(p[0],p[9]));
 if(palmSize<.001)return {gun:false,open:false};
 // The index points forward; the ring and little fingers stay curled.
 // Thumb contact and middle-finger movement are not firing inputs.
 return {gun:extended[0]&&!extended[2]&&!extended[3],open:extended.every(Boolean)};
}
export class HandShakeReload{
 constructor(){this.reset()}
 reset(){this.samples=[];this.turn=null;this.lastSeen=null;this.lastReload=-Infinity}
 clearMotion(){this.samples=[];this.turn=null}
 update(p,now){
  const valid=p?.length===21&&p.every(q=>q&&Number.isFinite(q.x)&&Number.isFinite(q.y)&&Number.isFinite(q.z??0));
  // A blurred frame stops firing, but does not erase an in-progress shake.
  if(!valid){if(this.lastSeen===null||now-this.lastSeen>250||now<this.lastSeen)this.clearMotion();return {reload:false,shaking:false}}
  const center=[0,5,9,13,17].reduce((a,i)=>({x:a.x+p[i].x/5,y:a.y+p[i].y/5}),{x:0,y:0});
  const size=Math.max(Math.hypot(p[5].x-p[17].x,p[5].y-p[17].y),Math.hypot(p[0].x-p[9].x,p[0].y-p[9].y));
  if(size<.015){this.clearMotion();this.lastSeen=null;return {reload:false,shaking:false}}
  const threshold=Math.max(.035,Math.min(.085,size*.35)),point={...center,time:now};let reload=false;
  if(this.lastSeen!==null&&(now-this.lastSeen>250||now<this.lastSeen))this.clearMotion();
  this.lastSeen=now;
  if(now-this.lastReload<1400){this.clearMotion();return {reload:false,shaking:false}}
  // Use a sliding history: a shake can begin at any point after a long aim hold.
  this.samples=this.samples.filter(sample=>now-sample.time<=800);
  this.samples.push(point);
  if(this.turn){
   const turn=this.turn,reverse=(turn.peak.y-center.y)*turn.direction;
   if(now-turn.started>1100||Math.abs(center.x-turn.base.x)>turn.threshold*2){this.clearMotion();this.samples.push(point)}
   else if(reverse<0)turn.peak=point;
   else if(reverse>=turn.threshold&&now-turn.peak.time>=35&&reverse>Math.abs(center.x-turn.peak.x)*1.2){reload=true;this.lastReload=now;this.clearMotion()}
  }else{
   for(let i=this.samples.length-2;i>=0;i--){
    const base=this.samples[i],dy=center.y-base.y,dx=center.x-base.x;
    if(now-base.time>=35&&Math.abs(dy)>=threshold&&Math.abs(dy)>Math.abs(dx)*1.2){this.turn={base,peak:point,direction:Math.sign(dy),threshold,started:now};break}
   }
  }
  return {reload,shaking:reload||this.turn!==null};
 }
}
export class GestureTrigger{
 constructor(){this.shake=new HandShakeReload();this.reset()}
 reset(){this.armed=false;this.gunSince=null;this.lastShot=-Infinity;this.lastSeen=null;this.shake.reset()}
 update(p,now){
  const pose=classifyHand(p),shake=this.shake.update(p,now);let fire=false;
  if(this.lastSeen!==null&&(now-this.lastSeen>300||now<this.lastSeen)){this.armed=false;this.gunSince=null}
  this.lastSeen=now;
  if(!pose.gun||shake.shaking){this.armed=false;this.gunSince=null}
  else{
   if(this.gunSince===null)this.gunSince=now;
   this.armed=now-this.gunSince>=GUN_POSE_HOLD_MS;
   if(this.armed&&now-this.lastShot>=GUN_FIRE_INTERVAL_MS){fire=true;this.lastShot=now}
  }
  return {...pose,fire,reload:shake.reload,shaking:shake.shaking,armed:this.armed};
 }
}

export class Magazine{
 constructor(){this.capacity=12;this.reset()}
 reset(){this.ammo=this.capacity;this.reloadStart=null;this.lastShot=-Infinity}
 shoot(now){if(this.reloadStart!==null||this.ammo===0||now-this.lastShot<200)return false;this.ammo--;this.lastShot=now;return true}
 reload(now){if(this.reloadStart!==null||this.ammo===this.capacity)return false;this.reloadStart=now;return true}
 tick(now){if(this.reloadStart!==null&&now-this.reloadStart>=1400){this.ammo=this.capacity;this.reloadStart=null;return true}return false}
 progress(now){return this.reloadStart===null?0:Math.min(1,(now-this.reloadStart)/1400)}
}

export class HandPresenceGate{
 constructor(duration=1000){this.duration=duration;this.reset()}
 reset(){this.since=null;this.lastSeen=null}
 update(points,now){
  const visible=points?.length===21&&points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1);
  if(!visible){this.reset();return {visible:false,progress:0,ready:false}}
  if(this.since===null||this.lastSeen===null||now-this.lastSeen>300)this.since=now;
  this.lastSeen=now;const progress=Math.min(1,(now-this.since)/this.duration);
  return {visible:true,progress,ready:progress>=1};
 }
}
