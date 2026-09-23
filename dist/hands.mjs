import {GestureTrigger,CONNECTIONS} from './gestures.mjs?v=reload-fix-1';
export class HandTracker{
 constructor(video,canvas,onFrame,onError){this.video=video;this.canvas=canvas;this.onFrame=onFrame;this.onError=onError;this.trigger=new GestureTrigger();this.rightTrigger=new GestureTrigger();this.stream=null;this.task=null;this.modelPromise=null;this.active=false;this.generation=0;this.lastTime=-1;this.lastDetect=0}
 async loadModel(){
  if(this.task)return this.task;
  if(!this.modelPromise)this.modelPromise=(async()=>{const {HandLandmarker,FilesetResolver}=await import('./vendor/vision_bundle.mjs');const files=await FilesetResolver.forVisionTasks(new URL('./vendor/wasm',location.href).href);const options={baseOptions:{modelAssetPath:new URL('./assets/hand_landmarker.task',location.href).href,delegate:'GPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5};try{this.task=await HandLandmarker.createFromOptions(files,options)}catch{options.baseOptions.delegate='CPU';this.task=await HandLandmarker.createFromOptions(files,options)}return this.task})().catch(e=>{this.modelPromise=null;throw e});
  return this.modelPromise;
 }
 async start(){
  if(!isSecureContext)throw new Error('カメラを使うには HTTPS または localhost で開いてください。');
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('このブラウザはカメラに対応していません。マウスでプレイできます。');
  const generation=++this.generation;
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30}},audio:false});
  if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());throw new Error('カメラの起動を中断しました。')}
  this.stream=stream;this.video.srcObject=stream;
  try{
   await this.video.play();
   if(generation!==this.generation)throw new Error('カメラの起動を中断しました。');
   await this.loadModel();
   if(generation!==this.generation)throw new Error('カメラの起動を中断しました。');
   this.active=true;this.lastTime=-1;this.resetGestures();this.stream.getVideoTracks()[0].onended=()=>{if(this.active){this.stop();this.onError(new Error('カメラとの接続が切れました。'))}};this.loop();
  }catch(e){if(generation===this.generation)this.stop();else stream.getTracks().forEach(t=>t.stop());throw e}
 }
 resetGestures(){this.trigger.reset();this.rightTrigger.reset()}
 processResult(result,now){
  const hands=result.landmarks??[],slots={left:[],right:[]};
  for(let i=0;i<hands.length;i++){
   const category=result.handedness?.[i]?.[0];
   if(!category||(category.score??0)<.65||!['Left','Right'].includes(category.categoryName))continue;
   // Keep the detected handedness; mirroring is applied only to preview/aim coordinates.
   // Never swap weapon slots based on screen position or detection array order.
   const side=category.categoryName==='Left'?'left':'right';
   slots[side].push({points:hands[i],world:result.worldLandmarks?.[i],category,index:i});
  }
  const left=slots.left.length===1?slots.left[0]:null,right=slots.right.length===1?slots.right[0]:null;
  const gesture=this.trigger.update(left?.points??null,now);
  const rightGesture=this.rightTrigger.update(right?.points??null,now);
  return {hands,landmarks:left?.points??right?.points??null,leftLandmarks:left?.points??null,rightLandmarks:right?.points??null,leftIndex:left?.index,rightIndex:right?.index,gesture,rightGesture,now};
 }
 loop=()=>{
  if(!this.active)return;const now=performance.now();
  if(this.video.readyState>=2&&this.video.currentTime!==this.lastTime&&now-this.lastDetect>50){
   this.lastTime=this.video.currentTime;this.lastDetect=now;
   try{
    const frame=this.processResult(this.task.detectForVideo(this.video,now),now);
    this.draw(frame);this.onFrame(frame);
   }catch(e){this.stop();this.onError(e);return}
  }
  this.raf=requestAnimationFrame(this.loop);
 }
 draw({hands,gesture,rightGesture,leftIndex,rightIndex}){
  const c=this.canvas,ctx=c.getContext('2d'),ratio=Math.min(devicePixelRatio,2),width=Math.max(1,Math.round(c.clientWidth*ratio)),height=Math.max(1,Math.round(c.clientHeight*ratio));if(c.width!==width)c.width=width;if(c.height!==height)c.height=height;ctx.clearRect(0,0,c.width,c.height);
  const scale=Math.min(c.width/(this.video.videoWidth||640),c.height/(this.video.videoHeight||480)),w=(this.video.videoWidth||640)*scale,h=(this.video.videoHeight||480)*scale,ox=(c.width-w)/2,oy=(c.height-h)/2;
  for(const [index,p] of hands.entries()){if(p?.length!==21||!p.every(q=>q&&Number.isFinite(q.x)&&Number.isFinite(q.y)))continue;const at=i=>({x:ox+(1-p[i].x)*w,y:oy+p[i].y*h});const color=index===rightIndex?(rightGesture.armed?'#dbfaff':'#9edeea'):index===leftIndex?(gesture.armed?'#ddff93':'#c6ee76'):'#89958b';ctx.strokeStyle=color;ctx.lineWidth=1.7;
   for(const [a,b]of CONNECTIONS){const u=at(a),v=at(b);ctx.beginPath();ctx.moveTo(u.x,u.y);ctx.lineTo(v.x,v.y);ctx.stroke()}
   ctx.font=`${Math.max(10,11*ratio)}px sans-serif`;ctx.fillStyle=color;ctx.textAlign=index===rightIndex?'right':'left';ctx.fillText(index===leftIndex?'LEFT / GUN':index===rightIndex?'RIGHT / GUN':'…',index===rightIndex?c.width-6*ratio:6*ratio,16*ratio);
   for(let i=0;i<21;i++){const v=at(i);ctx.beginPath();ctx.arc(v.x,v.y,i===8?4:2.3,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()}
  }
 }

 stop(){this.active=false;this.generation++;cancelAnimationFrame(this.raf);if(this.stream)this.stream.getTracks().forEach(t=>{t.onended=null;t.stop()});this.stream=null;this.video.srcObject=null;this.resetGestures();this.canvas.getContext('2d').clearRect(0,0,this.canvas.width,this.canvas.height)}
}
