// Original instrumental cues generated locally with LUNA MUSIC.
export const MUSIC_TRACKS=Object.freeze({
 title:{title:'Last Signal',loop:true},quarantine:{title:'Quarantine Run',loop:true},
 foundry:{title:'Furnace Pursuit',loop:true},marsh:{title:'Spore Drift',loop:true},
 laboratory:{title:'Cryo Protocol',loop:true},boss:{title:'Breach Entity',loop:true},
 balloons:{title:'Pop Circuit',loop:true},clear:{title:'Sector Secured',loop:false},
 result:{title:'Signal Lost',loop:false}
});
export function musicForScene({screen,activity,stage='quarantine',boss=false,stageClear=false}){
 if(screen==='menu'||screen==='tracking')return 'title';
 if(screen==='over')return activity==='balloons'?'clear':'result';
 if(stageClear)return 'clear';
 if(activity==='balloons')return 'balloons';
 return boss?'boss':MUSIC_TRACKS[stage]?stage:'quarantine';
}

export class MusicPlayer{
 constructor({fetcher=(...args)=>globalThis.fetch(...args),onStatus=()=>{}}={}){
  this.fetcher=fetcher;this.onStatus=onStatus;this.buffers=new Map();this.pending=new Map();
  this.desired='title';this.offset=0;this.paused=false;this.muted=false;this.volume=.38;
  this.finished=false;this.failed=false;this.revision=0;this.voices=new Set();
 }
 unlock(context){
  if(!this.context){this.context=context;this.bus=context.createGain();this.bus.gain.value=this.muted?0:this.volume;this.bus.connect(context.destination)}
  this.failed=false;this.sync();
 }
 setScene(scene){
  const next=musicForScene(scene),paused=scene.screen==='paused'||!!scene.hidden;
  if(next!==this.desired){this.desired=next;this.offset=0;this.finished=false;this.failed=false;this.revision++;this.fadeOut(this.current);this.current=null}
  if(paused!==this.paused){this.paused=paused;this.revision++;if(paused)this.stopForPause()}
  this.sync();
 }
 setMuted(muted){this.muted=!!muted;this.setVolume(this.volume);this.report()}
 setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)||0));if(this.bus){const gain=this.bus.gain,t=this.context.currentTime;gain.cancelScheduledValues(t);gain.setTargetAtTime(this.muted?0:this.volume,t,.025)}}
 async load(id){
  if(this.buffers.has(id))return this.buffers.get(id);
  if(!this.pending.has(id)){
   const promise=(async()=>{const response=await this.fetcher(new URL(`./audio/${id}.mp3`,import.meta.url));if(!response.ok)throw new Error('Music asset unavailable');const buffer=await this.context.decodeAudioData(await response.arrayBuffer());this.buffers.set(id,buffer);while(this.buffers.size>3)this.buffers.delete(this.buffers.keys().next().value);return buffer})();
   this.pending.set(id,promise);promise.then(()=>this.pending.delete(id),()=>this.pending.delete(id));
  }
  return this.pending.get(id);
 }
 async sync(){
  if(!this.context||this.paused||this.current||this.finished||this.failed)return;
  const id=this.desired,revision=this.revision;
  if(this.loadingRevision===revision)return;
  this.loadingRevision=revision;this.report('loading');
  try{
   const buffer=await this.load(id);
   if(revision!==this.revision||this.paused||this.current)return;
   const source=this.context.createBufferSource(),gain=this.context.createGain(),t=this.context.currentTime;
   source.buffer=buffer;source.loop=MUSIC_TRACKS[id].loop;
   const offset=source.loop?this.offset%buffer.duration:Math.min(this.offset,buffer.duration);
   if(!source.loop&&offset>=buffer.duration){this.finished=true;this.report();return}
   gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(1,t+.6);source.connect(gain).connect(this.bus);
   const voice={source,gain,id,startedAt:t,offset};this.current=voice;this.voices.add(voice);
   source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);if(this.current===voice){this.current=null;this.finished=true;this.report()}};
   source.start(0,offset);this.report();
  }catch{if(revision===this.revision){this.failed=true;this.report('unavailable')}}
  finally{if(this.loadingRevision===revision)this.loadingRevision=null}
 }
 fadeOut(voice){
  if(!voice||voice.stopping)return;voice.stopping=true;
  const t=this.context.currentTime,param=voice.gain.gain;
  param.cancelAndHoldAtTime(t);param.linearRampToValueAtTime(0,t+.45);voice.source.stop(t+.5);
 }
 stopForPause(){
  if(this.current)this.offset=this.current.offset+this.context.currentTime-this.current.startedAt;
  this.current=null;
  for(const voice of this.voices){voice.source.onended=null;try{voice.source.stop()}catch{}voice.source.disconnect();voice.gain.disconnect()}
  this.voices.clear();this.report();
 }
 report(status){this.onStatus({track:this.desired,title:MUSIC_TRACKS[this.desired].title,status:status??(this.paused?'paused':this.muted?'muted':this.finished?'ended':this.current?'playing':'ready')})}
 dispose(){this.revision++;this.paused=true;this.stopForPause();this.bus?.disconnect();this.buffers.clear()}
}
