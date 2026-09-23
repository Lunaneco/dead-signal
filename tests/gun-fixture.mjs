export function gunHand({side='left',open=false,offsetY=0,offsetX=0}={}){
 const p=Array.from({length:21},()=>({x:0,y:0,z:0}));
 for(let f=0;f<4;f++){const i=5+f*4,x=-.3+f*.2,extended=f===0||open;p[i]={x,y:.5,z:0};p[i+1]={x,y:.8,z:0};p[i+2]={x,y:extended?1:.6,z:extended?0:.16};p[i+3]={x,y:extended?1.2:.46,z:extended?0:.17}}
 p[4]={x:-.83,y:.65,z:0};return p.map(v=>({x:(side==='left'?.65:.35)+v.x*.25*(side==='left'?1:-1)+offsetX,y:.3+v.y*.25+offsetY,z:v.z*.25}));
}
export function handResult(entries){return {landmarks:entries.map(e=>e.points??gunHand(e)),handedness:entries.map(e=>[{categoryName:e.side==='left'?'Left':'Right',score:e.score??.99}])}}
