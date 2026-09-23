export const BEST_STORAGE_KEY='dead-signal.personal-best.v1';
const activities=['survival','balloons'],modes=['camera','mouse'];
const rulesets={survival:'campaign-v1',balloons:'balloons-v1'};
const integer=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
function record(activity,mode,value){
 if(!activities.includes(activity)||!modes.includes(mode)||!value||typeof value!=='object'||value.ruleset!==rulesets[activity]||!integer(value.score)||!integer(value.date,8640000000000000))return null;
 if(activity==='balloons'&&(!integer(value.popped)||!integer(value.maxCombo)||!integer(value.accuracy,100)))return null;
 if(activity==='survival'&&(!integer(value.wave)||value.wave<1||!integer(value.kills)))return null;
 return activity==='balloons'?{ruleset:rulesets[activity],score:value.score,date:value.date,popped:value.popped,maxCombo:value.maxCombo,accuracy:value.accuracy}:{ruleset:rulesets[activity],score:value.score,date:value.date,wave:value.wave,kills:value.kills};
}
export class PersonalBestStore{
 constructor(storage){this.storage=storage;this.records=Object.create(null);this.persisted=!!storage;this.read()}
 read(){
  if(!this.storage)return;
  try{const raw=this.storage.getItem(BEST_STORAGE_KEY);if(!raw)return;if(raw.length>16384)return;const data=JSON.parse(raw);if(data?.version!==1)return;
   for(const activity of activities)for(const mode of modes){const key=activity+':'+mode,value=record(activity,mode,data.records?.[key]);if(value&&(!this.records[key]||value.score>this.records[key].score))this.records[key]=value}
  }catch{this.persisted=false}
 }
 get(activity,mode){this.read();const value=this.records[activity+':'+mode];return value?{...value}:null}
 save(activity,mode,summary,now=Date.now()){
  const next=record(activity,mode,{...summary,ruleset:rulesets[activity],date:now});if(!next)throw new Error('Invalid personal best');
  this.read();const key=activity+':'+mode,previous=this.records[key],improved=!previous||next.score>previous.score;
  if(improved)this.records[key]=next;
  try{if(!this.storage)throw new Error('Storage unavailable');this.storage.setItem(BEST_STORAGE_KEY,JSON.stringify({version:1,records:this.records}));this.persisted=true}catch{this.persisted=false}
  return {best:{...this.records[key]},improved,first:!previous,persisted:this.persisted};
 }
}
function browserStorage(){try{return window.localStorage}catch{return null}}
const $=id=>document.getElementById(id);
export class PersonalBest{
 constructor(){this.mode='camera';this.store=new PersonalBestStore(browserStorage());$('close-ranking').onclick=()=>$('ranking-dialog').close();$('refresh-ranking').onclick=()=>this.load();for(const mode of modes)$('ranking-'+mode).onclick=()=>{this.mode=mode;this.load()};$('result-ranking').onclick=()=>this.show(this.mode)}
 show(mode=this.mode){this.mode=mode;this.load();if(!$('ranking-dialog').open)$('ranking-dialog').showModal()}
 load(){
  for(const mode of modes)$('ranking-'+mode).setAttribute('aria-pressed',String(this.mode===mode));
  $('ranking-rows').replaceChildren();let found=false;
  for(const activity of activities){const best=this.store.get(activity,this.mode);found||=!!best;const tr=document.createElement('tr');
   const detail=!best?'—':activity==='survival'?`WAVE ${best.wave} / ${best.kills} KILLS`:`${best.popped} POPS / 命中 ${best.accuracy}%`;
   for(const value of [activity==='survival'?'ゾンビ':'バルーン',best?best.score.toLocaleString():'未プレイ',detail,best?new Date(best.date).toLocaleDateString('ja-JP'):'—']){const td=document.createElement('td');td.textContent=value;tr.append(td)}$('ranking-rows').append(tr);
  }
  $('ranking-status').textContent=this.store.persisted?(found?'各モードの最高得点だけを保存しています。':'ゲームを終えると、自己ベストを自動保存します。'):'ブラウザの保存を利用できません。記録はこの画面を開いている間だけ保持します。';
 }
 result(activity,summary,mode){
  this.mode=mode;const saved=this.store.save(activity,mode,summary);$('personal-best-result').hidden=false;$('result-ranking').hidden=false;
  $('personal-best-title').textContent=saved.first?'FIRST RECORD':saved.improved?'NEW PERSONAL BEST':'PERSONAL BEST';
  $('personal-best-score').textContent=saved.best.score.toLocaleString();
  $('personal-best-status').textContent=saved.persisted?(saved.improved?'自己ベストをこのブラウザに保存しました。':'今回の得点は自己ベストを更新しませんでした。'):'保存を利用できないため、この画面を閉じると記録は失われます。';
 }
 reset(){$('personal-best-result').hidden=true;$('result-ranking').hidden=true}
}
