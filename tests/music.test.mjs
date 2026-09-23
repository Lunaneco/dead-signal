import test from 'node:test';
import assert from 'node:assert/strict';
import {MusicPlayer,musicForScene,MUSIC_TRACKS} from '../dist/music.mjs';
const flush=()=>new Promise(r=>setImmediate(r));
function fixture(fetcher=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})){
 const param=()=>({value:0,cancelScheduledValues(){},cancelAndHoldAtTime(){},setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v}});
 const sources=[],context={currentTime:0,destination:{},createGain(){return {gain:param(),connect(){return this},disconnect(){}}},createBufferSource(){const s={connect(){return this},disconnect(){this.disconnected=true},start(when,offset){this.offset=offset},stop(when){this.stopAt=when??context.currentTime}};sources.push(s);return s},decodeAudioData:async()=>({duration:40})};
 const statuses=[],player=new MusicPlayer({fetcher,onStatus:s=>statuses.push(s)});
 return {player,context,sources,statuses};
}
test('all game scenes map to the nine generated cues, including campaign wraparound',()=>{
 assert.equal(Object.keys(MUSIC_TRACKS).length,9);
 for(const screen of ['menu','tracking'])assert.equal(musicForScene({screen}),'title');
 for(const stage of ['quarantine','foundry','marsh','laboratory'])assert.equal(musicForScene({screen:'playing',stage,activity:'survival'}),stage);
 assert.equal(musicForScene({screen:'playing',boss:true}),'boss');
 assert.equal(musicForScene({screen:'playing',boss:true,stageClear:true}),'clear');
 assert.equal(musicForScene({screen:'over',activity:'survival'}),'result');
 assert.equal(musicForScene({screen:'playing',activity:'balloons'}),'balloons');
 assert.equal(musicForScene({screen:'over',activity:'balloons'}),'clear');
});
test('no download before user activation; repeated frame updates do not duplicate audio',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}});
 for(let i=0;i<10;i++)f.player.setScene({screen:'menu'});assert.equal(calls,0);
 f.player.unlock(f.context);for(let i=0;i<10;i++)f.player.setScene({screen:'menu'});await flush();
 assert.equal(calls,1);assert.equal(f.sources.length,1);assert.equal(f.sources[0].loop,true);
});
test('out-of-order loads cannot play an old scene or restart a paused game',async()=>{
 const resolves=[];const f=fixture(()=>new Promise(r=>resolves.push(()=>r({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}))));
 f.player.unlock(f.context);f.player.setScene({screen:'playing',activity:'balloons'});
 resolves[1]();await flush();assert.equal(f.player.current.id,'balloons');
 resolves[0]();await flush();assert.equal(f.sources.length,1);
 f.player.setScene({screen:'playing',boss:true});f.player.setScene({screen:'paused',boss:true});
 resolves[2]();await flush();assert.equal(f.player.current,null);assert.equal(f.player.voices.size,0);
});
test('pause freezes the offset, resumes once, and mute/volume affect the music bus',async()=>{
 const f=fixture();f.player.setScene({screen:'playing',activity:'balloons'});f.player.unlock(f.context);await flush();
 f.context.currentTime=12;f.player.setScene({screen:'paused',activity:'balloons'});assert.equal(f.player.offset,12);
 f.context.currentTime=60;f.player.setScene({screen:'playing',activity:'balloons'});await flush();assert.equal(f.sources[1].offset,12);
 f.player.setMuted(true);assert.equal(f.player.bus.gain.value,0);f.player.setVolume(.2);assert.equal(f.player.bus.gain.value,0);
 f.player.setMuted(false);assert.equal(f.player.bus.gain.value,.2);
 f.player.setScene({screen:'playing',activity:'balloons',hidden:true});assert.equal(f.player.voices.size,0);
});
test('one-shot cues finish once and scene transitions fade and release old audio',async()=>{
 const f=fixture();f.player.unlock(f.context);await flush();f.context.currentTime=3;
 f.player.setScene({screen:'over',activity:'survival'});await flush();assert.equal(f.sources[0].stopAt,3.5);assert.equal(f.sources[1].loop,false);
 f.sources[1].onended();f.player.setScene({screen:'over',activity:'survival'});await flush();assert.equal(f.sources.length,2);
 f.player.dispose();assert.equal(f.player.voices.size,0);
});
test('missing audio never blocks the game and a new interaction can retry',async()=>{
 let fails=true;const f=fixture(async()=>({ok:!fails,arrayBuffer:async()=>new ArrayBuffer(4)}));f.player.unlock(f.context);await flush();
 assert.equal(f.player.failed,true);assert.equal(f.statuses.at(-1).status,'unavailable');
 fails=false;f.player.unlock(f.context);await flush();assert.equal(f.player.current.id,'title');
});
