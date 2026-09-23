export const BALLOON_RULESET='balloons-v1';
export const ROUND_MS=60000,MAX_ROUND_MS=120000;
export const BALLOON_TYPES=Object.freeze({
 normal:{name:'ノーマル',color:'#ff67b2',points:100,hp:1,radius:.12,life:7000,mark:'100'},
 forbidden:{name:'禁止',color:'#fa544b',points:-150,hp:1,radius:.13,life:7200,mark:'×'},
 time:{name:'タイム',color:'#59e1d6',points:50,hp:1,radius:.12,life:5500,mark:'+5s'},
 giant:{name:'巨大',color:'#b48aff',points:500,hp:4,radius:.215,life:10000,mark:'4 HIT'},
 gold:{name:'ゴールド',color:'#ffd56b',points:350,hp:1,radius:.105,life:4500,mark:'350'},
 swift:{name:'高速',color:'#71baff',points:200,hp:1,radius:.085,life:4000,mark:'200'}
});
function random(seed){let n=seed>>>0;return ()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
export function balloonPosition(b,time){const age=(time-b.born)/1000;return {x:b.x+Math.sin(age*b.speed+b.phase)*b.sway,y:b.y+Math.sin(age*1.15+b.phase)*.02+age*.003,rx:b.radius*.68,ry:b.radius}}
export class BalloonRound{
 constructor(seed=1){this.seed=seed>>>0;this.rng=random(this.seed);this.time=0;this.remaining=ROUND_MS;this.score=0;this.combo=0;this.maxCombo=0;this.popped=0;this.mistakes=0;this.shots=0;this.hits=0;this.finished=false;this.targets=[];this.nextSpawn=0;this.serial=0}
 spawn(){
  if(this.targets.length>=10)return;
  const r=this.rng(),kind=r<.45?'normal':r<.61?'forbidden':r<.73?'time':r<.83?'giant':r<.91?'gold':'swift',type=BALLOON_TYPES[kind];
  let x,y,space=false;for(let attempt=0;attempt<24;attempt++){x=(this.rng()-.5)*1.35;y=-.24+this.rng()*(.57-type.radius);space=this.targets.every(b=>{const p=balloonPosition(b,this.time),r=type.radius+b.radius;return ((p.x-x)/(r*.68))**2+((p.y-y)/r)**2>1.08});if(space)break}if(!space)return;
  this.targets.push({id:++this.serial,kind,x,y,born:this.time,hp:type.hp,radius:type.radius,life:type.life,phase:this.rng()*Math.PI*2,sway:kind==='swift'?.13:.028,speed:kind==='swift'?3.9:1.2});
 }
 advance(to){
  if(!Number.isFinite(to)||to<this.time)throw new Error('Invalid game clock');to=Math.floor(to);
  while(!this.finished){
   const stop=Math.min(to,this.nextSpawn,this.time+this.remaining,MAX_ROUND_MS),elapsed=stop-this.time;
   this.time=stop;this.remaining=Math.max(0,this.remaining-elapsed);
   const escaped=this.targets.filter(b=>this.time-b.born>=b.life);if(escaped.some(b=>b.kind!=='forbidden'))this.combo=0;
   this.targets=this.targets.filter(b=>this.time-b.born<b.life);
   if(this.remaining<=0||this.time>=MAX_ROUND_MS){this.finished=true;this.remaining=0;break}
   if(this.time>=this.nextSpawn){this.spawn();this.nextSpawn=this.time+Math.round(Math.max(420,820-this.time/170)+this.rng()*220)}
   if(this.time>=to)break;
  }
  return this;
 }
 shoot(aim){
  if(this.finished)return null;this.shots++;
  const hit=[...this.targets].reverse().find(b=>{const p=balloonPosition(b,this.time);return ((aim.x-p.x)/p.rx)**2+((aim.y-p.y)/p.ry)**2<=1});
  if(!hit){this.combo=0;return null}
  this.hits++;hit.hp--;const type=BALLOON_TYPES[hit.kind],position=balloonPosition(hit,this.time);
  if(hit.hp>0)return {kind:hit.kind,id:hit.id,popped:false,hp:hit.hp,points:0,position};
  this.targets=this.targets.filter(b=>b!==hit);
  let points=type.points,timeBonus=0;
  if(hit.kind==='forbidden'){this.combo=0;this.mistakes++;this.remaining=Math.max(0,this.remaining-5000)}
  else{this.popped++;this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);points=Math.round(points*this.multiplier);if(hit.kind==='time'){timeBonus=Math.min(5000,Math.max(0,MAX_ROUND_MS-this.time-this.remaining));this.remaining+=timeBonus}}
  this.score=Math.max(0,this.score+points);
  if(this.remaining<=0){this.remaining=0;this.finished=true}
  return {kind:hit.kind,id:hit.id,popped:true,hp:0,points,timeBonus,position};
 }
 get multiplier(){return 1+Math.min(4,Math.floor(this.combo/5))*.25}
 summary(){return {score:this.score,popped:this.popped,mistakes:this.mistakes,maxCombo:this.maxCombo,accuracy:this.shots?Math.round(this.hits/this.shots*100):0,duration:Math.round(this.time)}}
}
