import {ZOMBIE_TYPES} from './zombies.mjs';

export const STAGES=Object.freeze([
 {id:'quarantine',name:'隔離市街',subtitle:'封鎖された街路を突破せよ',color:'#c6ee76',boss:'ゲートキーパー',bossColor:'#f4b55e',roster:['感染者','スプリンター','装甲感染者','クローラー','奇行体'],skin:['#8b9672','#aaa17f','#929ca2','#81ab87','#aaa0b5'],shirts:['#4c5840','#924c31','#4d5d79','#3c7259','#71518e']},
 {id:'foundry',name:'灼熱製鉄所',subtitle:'熱を帯びた群れが加速する',color:'#ffad68',boss:'アイアンブレイカー',bossColor:'#ff713e',roster:['灰燼兵','火走り','炉心重装兵','火花這い','溶滓の狂人'],skin:['#aa7960','#c19a64','#82736b','#a36c45','#b69078'],shirts:['#754238','#b25b25','#564a43','#894520','#8d3c30']},
 {id:'marsh',name:'汚染湿地',subtitle:'胞子の群れが左右から迫る',color:'#83eed2',boss:'スポアマザー',bossColor:'#b0ff72',roster:['胞子宿主','沼地の狩人','苔の巨兵','寄生這い','菌糸の踊り子'],skin:['#84ab7b','#85bda6','#719f83','#b1bd72','#b090c5'],shirts:['#315d56','#387f65','#39544b','#6d7137','#5d5480']},
 {id:'laboratory',name:'凍結研究施設',subtitle:'実験体の連続突進を食い止めろ',color:'#a3d7ff',boss:'オーバーシア',bossColor:'#a2acff',roster:['実験体α','ブリンク','強化外骨格','試作獣','フェイズ'],skin:['#b3c6d8','#abb6e2','#a5b4c3','#86bcce','#c4a6df'],shirts:['#537a96','#5d5da5','#46506d','#346d87','#784e9d']}
]);
const kinds=Object.keys(ZOMBIE_TYPES);
export function stageForWave(wave){
 const number=Math.floor((Math.max(1,wave)-1)/5)+1,index=(number-1)%STAGES.length,cycle=Math.floor((number-1)/STAGES.length);
 return {...STAGES[index],number,index,cycle,displayName:STAGES[index].name+(cycle?` · 変異${cycle+1}`:'')};
}
export function encounterForWave(wave){
 const stage=stageForWave(wave),localWave=(wave-1)%5+1,boss=localWave===5;
 return {wave,stage,localWave,boss,total:boss?1:Math.min(24,5+(localWave-1)*2+(stage.number-1)*2),interval:Math.max(.55,1.8-localWave*.12-(stage.number-1)*.14)};
}
export function enemyForStage(kind,wave){
 const base=ZOMBIE_TYPES[kind]??ZOMBIE_TYPES.walker,stage=stageForWave(wave),i=Math.max(0,kinds.indexOf(kind)),tier=stage.number-1;
 const hp=base.hp+Math.floor(tier*(kind==='brute'?1.5:.65));
 return {...base,name:stage.roster[i]+(stage.cycle?'・変異':''),skin:stage.skin[i],shirt:stage.shirts[i],hp,
  speed:base.speed*Math.min(3,1+tier*.14+((wave-1)%5)*.045),damage:base.damage+tier*.12,
  points:Math.round(base.points*(1+tier*.4)),stageIndex:stage.index,stageNumber:stage.number,
  scale:base.scale.map((v,n)=>v*(n===1?1+Math.min(tier,.8)*.035:1))};
}
export function bossForWave(wave){
 const stage=stageForWave(wave),tier=stage.number-1;
 return {name:stage.boss+(stage.cycle?'・変異':''),label:'BOSS',color:stage.bossColor,skin:stage.skin[2],shirt:stage.shirts[2],
  hp:64+tier*24,speed:1.2*Math.min(2.8,1+tier*.10),points:2000+1000*tier,damage:2+tier*.18,
  attackInterval:1.65,headDamage:3,scale:stage.index===2?[2.05,1.9,2.05]:[2,2.05,1.9],
  stageIndex:stage.index,stageNumber:stage.number,boss:true};
}
export function bossMotion(age,hpRatio,index=0){
 const enraged=hpRatio<=.5,cycle=age%(enraged?6:8),warning=cycle>4&&cycle<5.2,rush=cycle>=5.2;
 return {pace:warning?.14:rush?(enraged?4:2.8):enraged?1.7:.9,lateral:index===2?Math.sin(age*2.8)*(enraged?1.2:.6):index===3?Math.sin(age*1.7)*.4:0,lean:warning?-.12:rush?.15:0,stride:rush?6:2.3,warning,rush,enraged};
}

// The campaign advances only after every scheduled enemy has spawned and died.
// Boss encounters contain only the boss; killing it is the stage-clear condition.
export class Campaign{
 constructor(wave=1){this.reset(wave)}
 reset(wave=1){this.wave=wave;this.encounter=encounterForWave(wave);this.spawned=0;this.spawnTimer=.5;this.phase='fight';this.breakRemaining=0}
 update(dt,alive){
  if(!(dt>0))return [];
  if(this.phase==='break'){
   this.breakRemaining-=dt;if(this.breakRemaining>0)return [];
   const previous=this.encounter;this.reset(this.wave+1);
   return [{type:'advance',stageChanged:previous.boss,encounter:this.encounter}];
  }
  this.spawnTimer-=dt;
  if(this.spawned<this.encounter.total&&this.spawnTimer<=0){
   const index=this.spawned++;this.spawnTimer=this.encounter.interval;
   return [{type:'spawn',boss:this.encounter.boss,index,wave:this.wave}];
  }
  if(this.spawned===this.encounter.total&&alive===0){
   this.phase='break';this.breakRemaining=this.encounter.boss?4:2.4;
   return [{type:'clear',stageCleared:this.encounter.boss,encounter:this.encounter}];
  }
  return [];
 }
}
