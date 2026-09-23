export const ZOMBIE_TYPES=Object.freeze({
 walker:{name:'通常型',label:'WALKER',hint:'頭を狙えば一撃',color:'#c6db8c',skin:'#8b9672',shirt:'#4c5840',hp:2,speed:1.1,points:100,damage:1,attackInterval:1.35,headDamage:2,scale:[1,1,1]},
 runner:{name:'高速型',label:'RUNNER',hint:'足が速い。接近前に撃退',color:'#ffac62',skin:'#aaa17f',shirt:'#924c31',hp:2,speed:2.8,points:150,damage:1,attackInterval:.8,headDamage:2,scale:[.83,1.04,.88]},
 brute:{name:'耐久型',label:'BRUTE',hint:'胴体は8発。頭を2発で撃退',color:'#9ebfff',skin:'#929ca2',shirt:'#4d5d79',hp:8,speed:.8,points:300,damage:2,attackInterval:1.8,headDamage:4,scale:[1.55,1.28,1.25]},
 crawler:{name:'低姿勢型',label:'CRAWLER',hint:'地面近くを進む。低く狙う',color:'#8fe3b0',skin:'#81ab87',shirt:'#3c7259',hp:2,speed:1.75,points:140,damage:1,attackInterval:1.0,headDamage:2,scale:[1.02,.52,1.2]},
 erratic:{name:'奇行型',label:'ERRATIC',hint:'左右への蛇行と急加速に注意',color:'#e8a3f9',skin:'#aaa0b5',shirt:'#71518e',hp:3,speed:1.6,points:220,damage:1,attackInterval:1.05,headDamage:3,scale:[.9,1.19,.94]}
});
export function chooseZombieKind(wave,index,random=Math.random){
 const introduction=wave===1?['walker','runner','walker','crawler','erratic']:wave===2?['runner','brute','crawler','erratic']:null;
 if(introduction&&index<introduction.length)return introduction[index];
 const r=random();return r<.30?'walker':r<.53?'runner':r<.70?'brute':r<.85?'crawler':'erratic';
}
export function zombieMotion(kind,time,phase=0){
 const t=time+phase;
 if(kind==='erratic')return {pace:Math.sin(t*2.2)>.45?2.25:.55,lateral:Math.sin(t*4.7)*1.55+Math.sin(t*8.1)*.4,lean:Math.sin(t*5.3)*.20,stride:5.5};
 if(kind==='runner')return {pace:1,lateral:Math.sin(t*2)*.08,lean:.08,stride:6.5};
 if(kind==='crawler')return {pace:.85+Math.max(0,Math.sin(t*3))*.4,lateral:Math.sin(t*1.8)*.22,lean:.1,stride:4};
 return {pace:1,lateral:0,lean:0,stride:kind==='brute'?1.8:2.5};
}
