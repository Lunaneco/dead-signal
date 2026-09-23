import {MusicPlayer} from './music.mjs?v=luna-1';
import {CameraPreview} from './camera-preview.mjs?v=preview-1';
import {World} from './world.mjs?v=campaign-1';
import {Campaign,stageForWave} from './campaign.mjs?v=campaign-1';
import {BalloonRound,BALLOON_TYPES} from './balloons.mjs?v=balloons-1';
import {PersonalBest} from './personal-best.mjs?v=personal-best-1';
import {HandTracker} from './hands.mjs?v=reload-fix-1';
import {Magazine,HandPresenceGate} from './gestures.mjs?v=reload-fix-1';
const $=id=>document.getElementById(id);
const app=$('app'),fx=$('effects'),ctx=fx.getContext('2d'),mag=new Magazine(),rightMag=new Magazine(),handGate=new HandPresenceGate();
const cameraPreview=new CameraPreview($('camera-card'),$('hide-camera'),$('show-camera'));
let world;try{world=new World($('world'))}catch(e){$('fatal').hidden=false;$('start-camera').disabled=true;$('start-mouse').disabled=true;throw e}
const campaign=new Campaign();
const personalBest=new PersonalBest();let balloonRound=null,preparing=false;
const state={activity:'balloons',screen:'menu',mode:'mouse',weapon:'gun',health:100,wave:1,score:0,kills:0,time:0,spawned:0,total:5,aim:{x:0,y:0},rightAim:{x:.2,y:0},leftLandmarks:null,rightLandmarks:null,rightGesture:null,lastHand:0,landmarks:null,gesture:null,shots:[],fxTime:0,hitUntil:0,announcementUntil:0,loading:false,muted:false};
const music=new MusicPlayer({onStatus:({track,title,status})=>{const el=$('music-status');el.dataset.track=track;el.dataset.status=status;el.textContent=status==='unavailable'?'BGMを読み込めません · 音ボタンで再試行':status==='muted'?'BGM · MUTE':status==='paused'?'BGM · PAUSED':'♪ '+title}});
let audio,previous=performance.now(),pausedForHelp=false,cameraAttempt=0;
function syncMusic(hidden=document.hidden){music.setScene({screen:state.screen,activity:state.activity,stage:campaign.encounter.stage.id,boss:campaign.encounter.boss,stageClear:campaign.phase==='break'&&campaign.encounter.boss,hidden})}
function startAudio(){try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});syncMusic();music.unlock(audio)}catch{}}
function sound(kind){if(state.muted||!audio)return;const t=audio.currentTime;try{const gain=audio.createGain();gain.connect(audio.destination);if(kind==='shot'||kind==='hurt'){
 const len=kind==='shot'?.16:.27,b=audio.createBuffer(1,audio.sampleRate*len,audio.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(data.length*.18));const source=audio.createBufferSource();source.buffer=b;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=kind==='shot'?2700:400;source.connect(filter).connect(gain);gain.gain.value=kind==='shot'?.45:.5;source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};
 }else{const o=audio.createOscillator();o.connect(gain);o.type=kind==='empty'?'square':'sine';o.frequency.setValueAtTime(kind==='hit'?480:kind==='reload'?740:kind==='empty'?110:330,t);o.frequency.exponentialRampToValueAtTime(kind==='hit'?160:kind==='reload'?1150:90,t+.12);gain.gain.setValueAtTime(.10,t);gain.gain.exponentialRampToValueAtTime(.001,t+.18);o.start();o.stop(t+.2);o.onended=()=>{o.disconnect();gain.disconnect()}}
}catch{}}
function setScreen(screen){state.screen=screen;app.className=`is-${screen}`;cameraPreview.update(state);syncMusic()}
function announce(title,subtitle='',seconds=2){$('announcement').replaceChildren();const text=document.createTextNode(title);$('announcement').append(text);if(subtitle){const small=document.createElement('small');small.textContent=subtitle;$('announcement').append(small)}$('announcement').style.opacity='1';state.announcementUntil=state.fxTime+seconds}
function updateBalloonHUD(){
 if(state.activity==='balloons'&&balloonRound){state.score=balloonRound.score;state.kills=balloonRound.popped;$('balloon-timer').textContent=(balloonRound.remaining/1000).toFixed(1);$('balloon-timer').parentElement.classList.toggle('urgent',balloonRound.remaining<=10000);$('balloon-timer-bar').style.width=Math.min(100,balloonRound.remaining/600)+'%';$('balloon-combo').textContent=balloonRound.combo;$('balloon-multiplier').textContent='×'+balloonRound.multiplier.toFixed(2)}
}
function updateBossHUD(){
 const boss=state.activity==='survival'?world.zombies.find(z=>z.type?.boss&&!z.dead):null;
 $('boss-hud').hidden=!boss;app.dataset.boss=String(!!boss);if(!boss)return;
 $('boss-name').textContent=`WAVE ${String(campaign.wave).padStart(2,'0')} / ${boss.type.name}`;$('boss-hp').textContent=Math.max(0,Math.ceil(boss.hp))+' / '+boss.maxHp;
 $('boss-health-bar').style.width=Math.max(0,boss.hp/boss.maxHp)*100+'%';
 $('boss-state').textContent=boss.motion?.warning?'突進の予兆 — 頭を狙え':boss.hp<=boss.maxHp*.5?'暴走中 · 移動・攻撃が強化':'頭への攻撃で大ダメージ';
 $('boss-hud').classList.toggle('enraged',boss.hp<=boss.maxHp*.5);
}
function syncCampaignHUD(){
 state.wave=campaign.wave;state.total=campaign.encounter.total;state.spawned=campaign.spawned;
 const stage=campaign.encounter.stage;$('stage-label').textContent=`STAGE ${String(stage.number).padStart(2,'0')} / ${stage.displayName}`;
 $('boss-countdown').textContent=campaign.encounter.boss?'BOSS ENCOUNTER':`ボスまで ${5-campaign.encounter.localWave} WAVE`;
 if(state.activity==='survival'){$('sector-label').textContent=`STAGE ${String(stage.number).padStart(2,'0')} · ${stage.displayName}`;app.style.setProperty('--stage-color',stage.color)}
}
function announceEncounter(){
 const e=campaign.encounter;announce(e.boss?'BOSS INCOMING':`WAVE ${String(e.wave).padStart(2,'0')}`,e.boss?`${e.stage.boss} · 頭を狙って撃破せよ`:`${e.stage.displayName} · ${e.stage.subtitle}`,e.boss?3:2.2);
}
function advanceCampaign(dt){
 for(const event of campaign.update(dt,world.zombies.filter(z=>!z.dead).length)){
  if(event.type==='spawn'){if(event.boss)world.spawnBoss(campaign.wave);else world.spawn(campaign.wave)}
  if(event.type==='clear'){
   if(event.stageCleared){state.health=100;mag.reset();rightMag.reset();state.shots=[];announce('STAGE CLEARED',`${event.encounter.stage.boss} 撃破 / 全回復・弾補充 → ${stageForWave(campaign.wave+1).displayName}`,3.8);sound('reload')}
   else {state.health=Math.min(100,state.health+15);announce('WAVE CLEARED','体力 +15 · 次の襲撃に備えろ',2)}
  }
  if(event.type==='advance'){world.spawnCount=0;if(event.stageChanged){world.setStage(event.encounter.stage);state.aim={x:0,y:0};state.rightAim={x:.2,y:0}}announceEncounter()}
  syncCampaignHUD();updateHUD();
 }
}
function updateHUD(){
 updateBalloonHUD();updateBossHUD();
 $('health').textContent=state.health;$('health-bar').style.width=state.health+'%';$('health-bar').style.background=state.health<35?'#ef9370':'var(--lime)';$('wave').textContent=String(state.wave).padStart(2,'0');$('score').textContent=String(state.score).padStart(6,'0');$('kills').textContent=state.kills+(state.activity==='balloons'?' POPS':' KILLS');$('ammo').textContent=String(mag.ammo).padStart(2,'0');$('ammo').style.color=mag.ammo===0?'#ec9471':'';$('remaining').textContent=state.activity==='survival'&&campaign.encounter.boss?'ステージボスを撃破せよ':`感染者 ${Math.max(0,state.total-state.spawned)+world.zombies.filter(z=>!z.dead).length} 体`;
 $('right-ammo').textContent=String(rightMag.ammo).padStart(2,'0');$('right-ammo').style.color=rightMag.ammo===0?'#ec9471':'';$('right-gun-label').textContent=rightMag.reloadStart!==null?'RIGHT / RELOADING…':'RIGHT HAND / GUN';
 $('ammo-pips').replaceChildren(...Array.from({length:12},(_,i)=>{const el=document.createElement('i');if(i>=mag.ammo)el.className='empty';return el}));$('reload-label').textContent=mag.reloadStart!==null?'RELOADING…':state.mode==='camera'?'LEFT HAND / GUN':'FINGER GUN / CLICK';
}
function gunUI(){
 const dual=state.mode==='camera';app.dataset.dual=String(dual);$('dual-hands').hidden=!dual;$('right-gun-meter').hidden=!dual;$('combat-bottom').classList.toggle('dual-controls',dual);
 $('mode-label').textContent=dual?'LEFT GUN / RIGHT GUN':'MOUSE / TOUCH';
 $('action-hint').textContent=dual?'左手：指鉄砲で連射 · 上下に振ってリロード':'クリック / タップで発射 · R または残弾ボタンでリロード';
 $('gun-hint').textContent=dual?'右手：指鉄砲で連射 · 上下に振ってリロード':'銃は12発 · 装填は1.4秒';updateHUD();
}

async function begin(mode){
 if(preparing)return;preparing=true;
 balloonRound=state.activity==='balloons'?new BalloonRound(crypto.getRandomValues(new Uint32Array(1))[0]):null;
 preparing=false;personalBest.reset();world.setActivity(state.activity);campaign.reset();if(state.activity==='survival')world.setStage(campaign.encounter.stage);
 for(const id of ['pause-dialog','gameover-dialog','help-dialog'])$(id).close();world.clear();mag.reset();rightMag.reset();Object.assign(state,{mode,weapon:mode==='camera'?'dual':'gun',health:100,wave:1,score:0,kills:0,time:0,spawned:0,total:5,aim:{x:0,y:0},rightAim:{x:.2,y:0},leftLandmarks:null,rightLandmarks:null,rightGesture:null,gesture:null,shots:[],hitUntil:0,lastHand:performance.now()});tracker.resetGestures();$('start-error').hidden=true;$('camera-card').classList.toggle('no-camera',mode==='mouse');$('mode-label').textContent=mode==='camera'?'HAND CONTROL':'MOUSE / TOUCH';$('action-hint').textContent=mode==='camera'?'左手で指鉄砲をキープ · 上下に振ってリロード':'クリック / タップで発射 · R でリロード';setScreen('playing');startAudio();syncCampaignHUD();gunUI();if(state.activity==='balloons'){balloonRound.advance(0);world.syncBalloons(balloonRound);announce('BALLOON RUSH','60秒 / 赤い × は撃たない',2)}else announceEncounter();
}
function cameraMessage(message,active=false){$('camera-status').textContent=active?'TRACKING':tracker.active?'SEARCHING':'STANDBY';$('camera-dot').classList.toggle('active',active);$('gesture-status').textContent=message;$('camera-empty').hidden=tracker.active}
function cameraError(e){const messages={NotAllowedError:'カメラの使用が許可されていません。ブラウザのカメラ設定を確認するか、マウスでプレイしてください。',NotFoundError:'カメラが見つかりません。接続を確認するか、マウスでプレイしてください。',NotReadableError:'カメラを起動できません。他のアプリがカメラを使用していないか確認してください。'};const message=messages[e.name]??(e.message?.includes('カメラ')?e.message:'指の認識を読み込めませんでした。ページを再読み込みするか、マウスでプレイしてください。');if(state.screen==='tracking'){handGate.reset();setScreen('menu')}if(state.screen==='playing')pause(message);$('start-error').textContent=message;$('start-error').hidden=false;cameraMessage('カメラを利用できません');}
function resetCameraButton(){state.loading=false;$('start-camera').disabled=false;$('start-camera').querySelector('span').textContent='カメラでプレイ'}
function updateScan(landmarks,now){
 const gate=handGate.update(document.hidden||$('help-dialog').open?null:landmarks,now);
 const percent=Math.round(gate.progress*100);$('scan-progress-bar').style.width=percent+'%';$('scan-progress').setAttribute('aria-valuenow',String(percent));
 const label=gate.visible?'手を認識しました。そのままで…':'手全体をカメラに映してください';if($('scan-status').textContent!==label)$('scan-status').textContent=label;
 if(gate.ready){begin('camera');const p=screenHandPoint(landmarks[8]);state.aim.x=Math.max(-.96,Math.min(.96,p.x/world.width*2-1));state.aim.y=Math.max(-.94,Math.min(.94,1-p.y/world.height*2));handGate.reset()}
}
function screenHandPoint(p){const video=$('webcam'),scale=Math.max(world.width/(video.videoWidth||640),world.height/(video.videoHeight||480));const w=(video.videoWidth||640)*scale,h=(video.videoHeight||480)*scale;return {x:(world.width-w)/2+(1-p.x)*w,y:(world.height-h)/2+p.y*h}}
function followHandAim(target,point){const p=screenHandPoint(point),x=Math.max(-.96,Math.min(.96,p.x/world.width*2-1)),y=Math.max(-.94,Math.min(.94,1-p.y/world.height*2));target.x+=(x-target.x)*.6;target.y+=(y-target.y)*.6}
function gunStatus(points,gesture,magazine){return !points?'手を映してください':magazine.reloadStart!==null?'リロード中…':gesture.shaking?'反対方向へ戻して装填':magazine.ammo===0?'弾切れ · 上下に振る':gesture.armed?'自動連射中':gesture.gun?'指鉄砲をキープ':'人差し指を伸ばして構える'}
const tracker=new HandTracker($('webcam'),$('hand-overlay'),({landmarks,leftLandmarks,rightLandmarks,gesture,rightGesture,now})=>{
 state.landmarks=landmarks;state.leftLandmarks=leftLandmarks;state.rightLandmarks=rightLandmarks;state.gesture=gesture;state.rightGesture=rightGesture;
 if(state.screen==='tracking'&&!state.loading){updateScan(landmarks,now);cameraMessage(landmarks?'手を認識中 · 左右どちらも銃':'左右どちらかの手全体をカメラに入れてください',!!landmarks);if(landmarks)state.lastHand=now;return}
 const leftLabel=gunStatus(leftLandmarks,gesture,mag),rightLabel=gunStatus(rightLandmarks,rightGesture,rightMag);
 $('gun-hand-status').textContent='左手 / 銃 · '+leftLabel;$('right-hand-status').textContent='右手 / 銃 · '+rightLabel;
 cameraMessage('左：'+leftLabel+' / 右：'+rightLabel,!!landmarks);
 if(!landmarks)return;state.lastHand=now;
 if(state.screen!=='playing')return;
 if(leftLandmarks)followHandAim(state.aim,leftLandmarks[8]);
 if(rightLandmarks)followHandAim(state.rightAim,rightLandmarks[8]);
 if(gesture.reload)reload('left');if(rightGesture.reload)reload('right');
 if(gesture.fire&&mag.ammo>0&&mag.reloadStart===null)fire('left');
 if(rightGesture.fire&&rightMag.ammo>0&&rightMag.reloadStart===null)fire('right');
},cameraError);
async function startCamera(){
 if(state.loading||preparing)return;const attempt=++cameraAttempt;state.loading=true;state.mode='camera';state.weapon='dual';state.landmarks=null;state.leftLandmarks=null;state.rightLandmarks=null;state.gesture=null;gunUI();handGate.reset();
 $('start-camera').disabled=true;$('start-error').hidden=true;$('camera-card').classList.remove('no-camera');$('scan-status').textContent='カメラと指の認識を準備しています…';$('scan-progress-bar').style.width='0%';$('scan-progress').setAttribute('aria-valuenow','0');$('announcement').style.opacity='0';setScreen('tracking');startAudio();$('cancel-camera').focus();
 try{await tracker.start();if(attempt!==cameraAttempt)return;if(tracker.active&&state.screen==='tracking'){$('scan-status').textContent='手全体をカメラに映してください';cameraMessage('手を認識すると自動で開始します')}}catch(e){if(attempt===cameraAttempt)cameraError(e)}finally{if(attempt===cameraAttempt)resetCameraButton()}
}
function fire(side='left'){
 if(state.screen!=='playing'||(state.activity==='survival'&&campaign.phase==='break'))return;
 const right=state.weapon==='dual'&&side==='right',magazine=right?rightMag:mag,aim=right?state.rightAim:state.aim;
 if(!magazine.shoot(state.activity==='balloons'?balloonRound.time:state.time*1000)){if(magazine.ammo===0&&magazine.reloadStart===null){sound('empty');announce('RELOAD',state.mode==='camera'?'装填したい手を上下に振る、または残弾ボタンを押す':'Rキー、または残弾ボタンでリロード',1)}return}
 const sideName=right?'right':'left';
 sound('shot');const hit=state.activity==='balloons'?balloonRound.shoot(aim):world.shoot(aim,{side:sideName}),target={x:(aim.x+1)/2*world.width,y:(1-aim.y)/2*world.height};
 if(right)world.poseRightHand(aim);else world.poseHand(aim,{side:state.weapon==='dual'?'left':'right'});
 const muzzle=world.getMuzzle(right?'right':'left');state.shots.push({from:muzzle,to:target,life:.13,angle:Math.random()*6.28});
 if(state.activity==='balloons'){if(right)world.rightRecoil=1;else world.recoil=1;if(hit){world.burstBalloon(hit);sound(hit.kind==='forbidden'?'hurt':'hit');state.hitUntil=state.fxTime+.12;$('hitmarker').style.left=target.x+'px';$('hitmarker').style.top=target.y+'px';$('hitmarker').style.color=BALLOON_TYPES[hit.kind].color;if(hit.popped)announce(hit.kind==='forbidden'?'−150 / −5 SEC':hit.kind==='time'?`+${hit.points} / +${hit.timeBonus/1000} SEC`:`+${hit.points}`,hit.kind==='forbidden'?'赤い × は撃たない':BALLOON_TYPES[hit.kind].name,.55);else announce('GIANT',`あと ${hit.hp} 発`,.4)}world.syncBalloons(balloonRound);if(balloonRound.finished)gameOver()}else if(hit)registerHit(hit,target);updateHUD();
}
function registerHit(hit,target){
 sound('hit');state.score+=hit.kill?(hit.points??(hit.head?200:100)):20;if(hit.kill)state.kills++;state.hitUntil=state.fxTime+.15;$('hitmarker').style.left=target.x+'px';$('hitmarker').style.top=target.y+'px';$('hitmarker').style.color=hit.head?'#f4dc9b':'#c6ee76';if(hit.head&&hit.kill)announce('HEADSHOT','+'+(hit.points??200),.7);
}
function reload(side='left'){const right=state.weapon==='dual'&&side==='right',magazine=right?rightMag:mag;if(state.screen!=='playing'||!magazine.reload(state.activity==='balloons'?balloonRound.time:state.time*1000))return;sound('reload');updateHUD()}
function pause(reason='準備ができたら、戦線へ。'){if(state.screen!=='playing')return;setScreen('paused');$('pause-reason').textContent=reason;$('pause-dialog').showModal();$('resume').focus()}
function resume(){if(state.screen!=='paused')return;if(state.mode==='camera'&&!tracker.active){$('pause-reason').textContent='カメラが停止しています。タイトルへ戻り、カメラを起動し直してください。';return}$('pause-dialog').close();tracker.resetGestures();state.lastHand=performance.now();setScreen('playing');startAudio()}
function quit(){preparing=false;personalBest.reset();cameraAttempt++;resetCameraButton();handGate.reset();for(const id of ['pause-dialog','gameover-dialog','help-dialog'])$(id).close();tracker.stop();state.landmarks=null;state.gesture=null;state.shots=[];cameraMessage('カメラを起動すると手を認識します');$('camera-card').classList.remove('no-camera');$('announcement').style.opacity='0';state.announcementUntil=0;setScreen('menu');if(state.activity==='survival'){campaign.reset();world.preview();syncCampaignHUD()}else previewBalloons();$('start-camera').focus()}
function gameOver(){
 if(state.screen==='over')return;setScreen('over');tracker.stop();state.landmarks=null;state.leftLandmarks=null;state.rightLandmarks=null;cameraMessage('カメラを停止しました');
 $('final-score').textContent=String(state.activity==='balloons'?balloonRound.score:state.score).padStart(6,'0');
 const balloons=state.activity==='balloons';$('result-eyebrow').textContent=balloons?'BALLOON RUSH / RESULT':'SIGNAL LOST';$('result-title').textContent=balloons?'TIME UP!':'また、夜が来る。';$('retry').textContent=balloons?'もう一度チャレンジ ↗':'もう一度、生き残る ↗';
 const stats=balloons?[[balloonRound.popped,'破裂'],[balloonRound.maxCombo,'最大コンボ'],[balloonRound.summary().accuracy+'%','命中率']]:[[campaign.encounter.stage.number,'STAGE'],[state.wave,'WAVE'],[state.kills,'KILLS'],[Math.floor(state.time)+'s','TIME']];
 $('result-details').replaceChildren(...stats.map(([value,label])=>{const span=document.createElement('span');span.textContent=label+' ';const b=document.createElement('b');b.textContent=value;span.append(b);return span}));
 personalBest.result(state.activity,balloons?balloonRound.summary():{score:state.score,wave:state.wave,kills:state.kills},state.mode);$('gameover-dialog').showModal();
}
function hurt(n){state.health=Math.max(0,state.health-Math.round(n*14));sound('hurt');$('damage').style.opacity='.7';setTimeout(()=>$('damage').style.opacity='0',150);updateHUD();if(state.health===0)gameOver()}
function effects(dt){
 ctx.clearRect(0,0,world.width,world.height);
 for(let i=state.shots.length-1;i>=0;i--){const s=state.shots[i];s.life-=dt;if(s.life<=0){state.shots.splice(i,1);continue}const alpha=s.life/.13;ctx.save();ctx.globalAlpha=alpha;ctx.shadowColor='#ffd985';ctx.shadowBlur=25;ctx.lineWidth=2;ctx.strokeStyle='#ffe3a1';ctx.beginPath();ctx.moveTo(s.from.x,s.from.y);ctx.lineTo(s.to.x,s.to.y);ctx.stroke();ctx.translate(s.from.x,s.from.y);ctx.rotate(s.angle);ctx.fillStyle='#fff1b9';ctx.beginPath();for(let j=0;j<12;j++){const r=j%2?6:18+alpha*17;const a=j*Math.PI/6;if(j===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();ctx.restore()}
 $('hitmarker').style.display=state.fxTime<state.hitUntil?'block':'none';if(state.fxTime>state.announcementUntil)$('announcement').style.opacity='0';
}
function frame(now){
 const realDt=Math.max(0,(now-previous)/1000),dt=Math.min(realDt,.06);previous=now;state.fxTime+=dt;
 if(state.screen==='playing'){
  state.time+=state.activity==='balloons'?realDt:dt;if(state.activity==='balloons'){balloonRound.advance(Math.floor(state.time*1000));world.syncBalloons(balloonRound);updateBalloonHUD();if(balloonRound.finished)gameOver()}const tickTime=state.activity==='balloons'?balloonRound.time:state.time*1000;const leftLoaded=mag.tick(tickTime),rightLoaded=rightMag.tick(tickTime);if(leftLoaded||rightLoaded){sound('reload');updateHUD()}
  if(state.mode==='camera'&&now-state.lastHand>2800){pause('手が見つからないため一時停止しました。カメラに手を入れてから再開してください。')}
  if(state.screen==='playing'&&state.activity==='survival'){
   advanceCampaign(dt);
  }
 }
 if(state.weapon==='dual'){$('right-reload-progress').style.width=rightMag.progress(state.time*1000)*100+'%';$('right-crosshair').style.left=(state.rightAim.x+1)*50+'%';$('right-crosshair').style.top=(1-state.rightAim.y)*50+'%';$('right-crosshair').style.opacity=state.rightLandmarks?1:.3;$('right-crosshair').classList.toggle('armed',!!state.rightGesture?.armed)}
 const playing=state.screen==='playing',preview=state.screen==='menu'||state.screen==='tracking',progress=mag.progress(state.time*1000);
 const attacks=world.update(playing||preview?dt:0,{playing:playing&&state.activity==='survival',menu:preview,aim:state.aim,rightAim:state.rightAim,reloading:progress,rightReloading:rightMag.progress(state.time*1000),showHand:true,weapon:state.weapon});if(attacks&&playing)hurt(attacks);updateBossHUD();
 $('reload-progress').style.width=(progress*100)+'%';$('crosshair').style.left=(state.aim.x+1)*50+'%';$('crosshair').style.top=(1-state.aim.y)*50+'%';$('crosshair').classList.toggle('armed',!!state.gesture?.armed);effects(dt);syncMusic();requestAnimationFrame(frame);

}
function resize(){world.resize();fx.width=world.width*devicePixelRatio;fx.height=world.height*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}
new ResizeObserver(resize).observe(app);resize();requestAnimationFrame(frame);
function aimFromPointer(e){const r=app.getBoundingClientRect();state.aim.x=(e.clientX-r.left)/r.width*2-1;state.aim.y=1-(e.clientY-r.top)/r.height*2}
app.addEventListener('pointermove',e=>{if(state.mode==='mouse'&&state.screen==='playing'&&!e.target.closest('button,dialog,a'))aimFromPointer(e)});
app.addEventListener('pointerdown',e=>{if(state.mode==='mouse'&&state.screen==='playing'&&!e.target.closest('button,dialog,a')&&e.button===0){e.preventDefault();aimFromPointer(e);fire()}});
$('right-gun-meter').onclick=()=>reload('right');
$('start-camera').onclick=startCamera;function startMouse(){if(preparing)return;cameraAttempt++;resetCameraButton();handGate.reset();tracker.stop();state.landmarks=null;state.gesture=null;begin('mouse')}$('start-mouse').onclick=startMouse;$('scan-mouse').onclick=startMouse;$('cancel-camera').onclick=quit;$('reload').onclick=()=>reload('left');$('pause').onclick=()=>pause();$('resume').onclick=resume;$('quit').onclick=quit;$('back-title').onclick=quit;$('retry').onclick=()=>{if(state.mode==='camera'){quit();startCamera()}else begin('mouse')};
$('help').onclick=()=>{pausedForHelp=state.screen==='playing';if(pausedForHelp)setScreen('paused');$('help-dialog').showModal()};function closeHelp(){$('help-dialog').close();if(pausedForHelp){pausedForHelp=false;tracker.resetGestures();state.lastHand=performance.now();setScreen('playing')}}$('close-help').onclick=closeHelp;$('help-dialog').addEventListener('cancel',e=>{e.preventDefault();closeHelp()});
$('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resume()});$('gameover-dialog').addEventListener('cancel',e=>{e.preventDefault();quit()});
document.addEventListener('keydown',e=>{if(e.code==='KeyR'&&state.screen==='playing'){e.preventDefault();reload('left');if(state.weapon==='dual')reload('right')}if(e.code==='Escape'&&!document.querySelector('dialog[open]')){if(state.screen==='playing'){e.preventDefault();pause()}else if(state.screen==='tracking'){e.preventDefault();quit()}}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){handGate.reset();if(state.screen==='playing')pause('別の画面へ移動したため一時停止しました。')}syncMusic()});
$('sound').onclick=()=>{state.muted=!state.muted;music.setMuted(state.muted);startAudio();$('sound').style.opacity=state.muted?'.4':'1';$('sound').setAttribute('aria-label',state.muted?'音をオンにする':'音をオフにする');$('sound').setAttribute('aria-pressed',String(state.muted))};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await app.requestFullscreen()}catch{announce('FULLSCREEN','このブラウザでは全画面表示を利用できません',2)}};
document.addEventListener('pointerdown',startAudio,{once:true});
document.addEventListener('keydown',startAudio,{once:true});
$('music-volume').addEventListener('input',e=>music.setVolume(Number(e.target.value)/100));
window.addEventListener('pagehide',()=>{tracker.stop();syncMusic(true)});
window.addEventListener('pageshow',e=>{if(e.persisted){if(state.screen==='playing')pause('ページに戻りました。準備ができたら再開してください。');syncMusic()}});
const modelContext=document.modelContext;if(modelContext?.registerTool){const lifetime=new AbortController();for(const tool of [{name:'read_game_status',description:'現在のゲーム状態、体力、ウェーブ、スコア、残弾を取得する。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(input&&Object.keys(input).length)throw new Error('引数は不要です');return {screen:state.screen,mode:state.mode,activity:state.activity,campaign:state.activity==='survival'?{stage:campaign.encounter.stage.number,area:campaign.encounter.stage.displayName,bossWave:campaign.encounter.boss,phase:campaign.phase}:null,zombieKinds:state.activity==='survival'?world.zombies.filter(z=>!z.dead).map(z=>({kind:z.kind,name:z.type.name,hp:z.hp,maxHp:z.maxHp,boss:!!z.type.boss})):[],balloons:state.activity==='balloons'&&balloonRound?{...balloonRound.summary(),remaining:balloonRound.remaining,targets:balloonRound.targets.length,recordStorage:'this-browser-only'}:null,health:state.health,wave:state.wave,score:state.score,ammo:mag.ammo,reloading:mag.reloadStart!==null,weapon:state.weapon,leftHand:state.mode==='camera'?{weapon:'gun',tracked:!!state.leftLandmarks,ammo:mag.ammo,reloading:mag.reloadStart!==null}:null,rightHand:state.mode==='camera'?{weapon:'gun',tracked:!!state.rightLandmarks,ammo:rightMag.ammo,reloading:rightMag.reloadStart!==null}:null}}},{name:'pause_game',description:'進行中のゲームを一時停止する。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(input&&Object.keys(input).length)throw new Error('引数は不要です');if(state.screen!=='playing')throw new Error('ゲームが進行中ではありません');pause();return {screen:state.screen}}}]){try{Promise.resolve(modelContext.registerTool(tool,{signal:lifetime.signal})).catch(()=>{})}catch{}}window.addEventListener('pagehide',()=>lifetime.abort(),{once:true})}

function previewBalloons(){world.clear();const preview=new BalloonRound(57);preview.advance(4200);world.syncBalloons(preview)}
function selectActivity(activity){if(state.screen!=='menu'||state.loading||preparing)return;state.activity=activity;app.dataset.activity=activity;world.setActivity(activity);const balloons=activity==='balloons';$('world').setAttribute('aria-label',balloons?'バルーン射撃の3Dゲーム画面':'ゾンビサバイバルの3Dゲーム画面');for(const name of ['survival','balloons'])$('activity-'+name).setAttribute('aria-pressed',String(name===activity));$('mode-title').innerHTML=balloons?'BALLOON<br><span>RUSH</span>':'DEAD<br><span>SIGNAL</span>';$('mode-intro').textContent=balloons?'撃って、選んで、記録を超えろ。':'その指が、最後の武器になる。';$('mode-description').innerHTML=balloons?'制限時間60秒。両手の銃でスコアアタック。<br>赤い × は撃たない。＋5s で時間を稼ごう。':'5ウェーブごとにボス戦。<br>撃破して、新たなエリアを突破せよ。';$('field-info').innerHTML=balloons?'<span class="corner"></span><p class="eyebrow">6 TARGETS / 60 SECONDS</p><h2>見分けて、撃ち抜く。</h2><dl><div><dt class="legend-normal">● ノーマル</dt><dd>100点</dd></div><div><dt class="legend-forbidden">× 禁止</dt><dd>−150点 / −5秒</dd></div><div><dt class="legend-time">＋ タイム</dt><dd>＋5秒 / 50点</dd></div><div><dt class="legend-giant">巨大</dt><dd>4発で500点</dd></div><div><dt class="legend-gold">★ ゴールド</dt><dd>350点</dd></div><div><dt class="legend-swift">高速</dt><dd>小さく速い / 200点</dd></div></dl><div class="field-meta"><span>COMBO UP TO ×2.00</span></div>':'<span class="corner"></span><p class="eyebrow">4 AREAS / ENDLESS SURVIVAL</p><h2>ボスを倒し、その先へ。</h2><p>隔離市街 → 灼熱製鉄所<br>汚染湿地 → 凍結研究施設<br><span style="color:#ffac62">WAVE 5・10・15… ボス出現</span><br>エリアごとに敵と行動が変化<br>次の周回ではさらに強くなる</p>';if(balloons){previewBalloons();$('sector-label').textContent='BALLOON RUSH'}else {world.preview();campaign.reset();syncCampaignHUD()}}
$('activity-survival').onclick=()=>selectActivity('survival');$('activity-balloons').onclick=()=>selectActivity('balloons');$('open-ranking').onclick=()=>personalBest.show();selectActivity('balloons');
