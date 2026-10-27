// SPDX-License-Identifier: AGPL-3.0-or-later
// Original whale concept sketches, authored following the Livelings skill.
// These are selection sketches; a selected design gets a complete signature-action pass.
import {defineCharacter, label, physics, shapes, variant, every, at, zzz} from '../livelings.js';

// Sample original cubic silhouettes, then hand them to Livelings' 96-point morph engine.
function silhouette(start, curves) {
  let p={x:start[0],y:start[1]}; const out=[p];
  for(const c of curves){const a=p;for(let n=1;n<=14;n++){const t=n/14,u=1-t;out.push({x:u*u*u*a.x+3*u*u*t*c[0]+3*u*t*t*c[2]+t*t*t*c[4],y:u*u*u*a.y+3*u*u*t*c[1]+3*u*t*t*c[3]+t*t*t*c[5]});}p={x:c[4],y:c[5]};}
  return shapes.resample(out);
}
const plump=()=>silhouette([-1.13,-.13],[
  [-1.15,-.64,-.82,-.92,-.31,-.90],[.15,-.90,.49,-.66,.65,-.32],
  [.86,-.30,1.03,-.52,1.04,-.75],[.85,-.76,.79,-.94,.83,-1.08],
  [1.02,-1.11,1.16,-1.00,1.20,-.87],[1.32,-1.03,1.51,-1.05,1.65,-.98],
  [1.62,-.77,1.45,-.62,1.27,-.65],[1.18,-.18,.91,.32,.52,.54],
  [.05,.78,-.63,.72,-.95,.37],[-1.08,.23,-1.15,.05,-1.13,-.13]
]);
const beluga=()=>silhouette([-.93,-.12],[
  [-.94,-.62,-.54,-.92,-.10,-.88],[.21,-.87,.45,-.71,.57,-.43],
  [.83,-.45,.89,-.67,.85,-.89],[.62,-.89,.54,-1.06,.56,-1.22],
  [.78,-1.24,.94,-1.14,.99,-1.00],[1.14,-1.13,1.35,-1.12,1.46,-1.01],
  [1.39,-.80,1.18,-.71,1.05,-.77],[1.07,-.26,.88,.12,.61,.40],
  [.36,.77,-.05,.88,-.48,.72],[-.86,.57,-1.00,.21,-.93,-.12]
]);
const ribbon=()=>silhouette([-1.30,-.12],[
  [-1.33,-.46,-1.03,-.70,-.62,-.72],[-.13,-.77,.26,-.53,.62,-.23],
  [.88,-.15,1.09,-.34,1.18,-.55],[1.01,-.60,.98,-.80,1.05,-.93],
  [1.24,-.92,1.35,-.81,1.36,-.67],[1.51,-.80,1.69,-.77,1.79,-.67],
  [1.70,-.49,1.52,-.42,1.37,-.45],[1.09,.08,.58,.45,-.01,.49],
  [-.56,.56,-1.24,.40,-1.30,-.12]
]);
const tailShape=()=>silhouette([-.12,.90],[
  [-.16,.45,-.05,.04,-.04,-.26],[-.60,-.22,-.95,-.51,-1.00,-.97],
  [-.52,-1.03,-.16,-.87,0,-.57],[.28,-.93,.69,-.98,1.03,-.79],
  [.88,-.37,.42,-.18,.12,-.23],[.08,.13,.15,.51,.12,.90],
  [.05,.94,-.05,.94,-.12,.90]
]);

function drawPath(r, points, fill, stroke=false, width=.035){
  const g=r.g;g.beginPath();const p=r.toPx(points[0][0],points[0][1]);g.moveTo(p.x,p.y);
  for(const c of points.slice(1)){const a=r.toPx(c[0],c[1]),b=r.toPx(c[2],c[3]),d=r.toPx(c[4],c[5]);g.bezierCurveTo(a.x,a.y,b.x,b.y,d.x,d.y);}
  g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=r.palette.outline;g.lineWidth=r.R*width;g.lineJoin='round';g.stroke();}
}
function bubbles(a,n=4){const c=a.bodyCenter();for(let i=0;i<n;i++)a.emit({kind:'bubble',x:c.x-.6+(a.rand()-.5)*.25,y:c.y-.65,vy:-.7-a.rand()*.6,vx:(a.rand()-.5)*.35,life:1.2,size:.045+a.rand()*.06,color:a.palette.accent});}
function splash(a){const c=a.bodyCenter();for(let i=0;i<7;i++)a.emit({kind:'drop',x:c.x-.55,y:c.y-.5,vx:(a.rand()-.5)*1.8,vy:-1-a.rand()*1.2,ay:3,life:.8,size:.055,color:a.palette.accent});}

const designs=[
  {id:'little-deep',en:'Deep',name:'小湛',body:plump,face:{x:-.38,y:-.08,r:.78},eyes:{w:.27,h:.38,spacing:.64,lift:.03},blue:'#6088f4',eye:'#fffdf8',outline:'#27334c',accent:'#9dc6ff',temper:'慢热，戳一下会憋不住吐泡泡。',trick:'把思考憋成一串小泡泡',material:'柔软的蓝鲸',hover:.12,kind:0},
  {id:'milk-whale',en:'Mochi',name:'奶泡',body:beluga,face:{x:-.27,y:-.03,r:.78},eyes:{w:.25,h:.36,spacing:.63,lift:.02},blue:'#f8f4e8',eye:'#29334a',outline:'#39455e',accent:'#7098f3',temper:'温吞，喜欢把脸藏进自己的小尾巴。',trick:'想事情时变成一枚尾巴书签',material:'奶白的小鲸',hover:.10,kind:1},
  {id:'ink-whale',en:'Nib',name:'墨鲸',body:ribbon,face:{x:-.67,y:-.10,r:.59},eyes:{w:.29,h:.41,spacing:.66,lift:.03},blue:'#374c78',eye:'#f7f4e9',outline:'#202d49',accent:'#86b7fa',temper:'安静，偶尔突然甩一下尾巴。',trick:'尾巴像笔锋，思考时轻轻摆',material:'一笔蓝墨水',hover:.13,kind:2}
];

function build(d){
  const base=d.body;
  return defineCharacter({
    id:d.id,name:label(d.en,d.name),material:label('Little whale',d.material),tagline:label(d.temper,d.temper),bio:label(d.trick,d.trick),traits:{en:['Whale','Soft','Curious'],zh:['鲸鱼轮廓',d.trick,'会看着你']},
    physics:physics({floaty:true,hover:d.hover,breath:.015,wobble:.002,softStiffness:220,softDamping:12,softSmoothing:140,stretch:.65,squashiness:.75,hopPower:2.5,bounce:0}),
    eyes:{...d.eyes,corner:1,topLid:0,bottomLid:0,tilt:0,slant:0,asym:0},eyeMode:'ink',eyeShine:d.kind===1?.22:0,outlineWidth:.045,thicken:false,splash:false,face:d.face,rest:base,
    shapes:{wide:()=>shapes.transform(base(),1.12,.82,0,.12),tall:()=>shapes.transform(base(),.92,1.12,0,-.07),puddle:()=>shapes.transform(base(),1.15,.72,0,.22),tail:tailShape},
    palettes:[
      {id:'signature',body:d.blue,eye:d.eye,outline:d.outline,accent:d.accent,mark:d.outline},
      {id:'blue',body:'#6088f4',eye:'#fffdf8',outline:'#27334c',accent:'#a9ccff',mark:'#27334c'},
      {id:'milk',body:'#f8f4e8',eye:'#29334a',outline:'#39455e',accent:'#7098f3',mark:'#39455e'},
      {id:'mint',body:'#b6dccc',eye:'#2e4844',outline:'#375a53',accent:'#6aaf9a',mark:'#375a53'}
    ],
    effects:{tail:{rest:0,stiffness:80,damping:10},fin:{rest:0,stiffness:90,damping:11},eyesOpacity:{rest:1,stiffness:45,damping:12}},
    outlineMod(pts,t,a){const wag=a.fxValue('tail');for(const p of pts){const w=Math.max(0,Math.min(1,(p.x-.61)/.54));p.y+=wag*w;p.x+=Math.sin(wag)*w*.10;}},
    paintBody(r){
      if(d.kind===0)drawPath(r,[[-1.35,.38],[-.73,.55,-.09,.52,.65,.20],[.25,1.05,-.90,1.03,-1.35,.38]],'#e7effc');
      if(d.kind===1)drawPath(r,[[.52,-.42],[.90,-.53,1.02,-1.44,1.54,-1.12],[1.71,-.18,.96,-.15,.52,-.42]],r.palette.accent);
      if(d.kind===2)drawPath(r,[[-1.37,.16],[-.84,.36,-.21,.32,.39,.20],[-.13,.76,-1.05,.77,-1.37,.16]],'#dbe8fa');
    },
    paintFace(r){
      if(r.actor.shapeKey==='tail')return;
      const k=r.actor.fxValue('fin');
      if(d.kind===1)drawPath(r,[[.23,.12],[.12,.35,.18,.59,.39,.61],[.53,.48,.45,.25,.23,.12]],r.palette.accent,true);
      else drawPath(r,[[.00,.11],[.00,.32+k*.09,.15,.50+k*.10,.35,.48],[.45,.39,.20,.18,.00,.11]],d.kind===0?'#5279d9':r.palette.accent,true,.035);
    },
    update(a){if(!a.onceId&&a.loopId==='idle'){a.fx('tail').target=a.calm?0:Math.sin(a.time*1.7)*.07;a.fx('fin').target=a.calm?0:Math.sin(a.time*1.1)*.3;}},
    react:{tap(a){if(d.kind===1){a.play('peek-tail');return true;}a.flash('happy',.8);a.squish(5);a.fx('tail').velocity+=d.kind===2?3:1.8;bubbles(a,d.kind===0?4:2);return true;},purr(a){a.flash('soft',1.2);a.fx('fin').velocity+=1.8;return true;}},
    actions:{
      thinking:variant('thinking',{enter(a){a.express('curious');if(d.kind===1){a.morph('tail');a.fx('eyesOpacity').target=0;}else a.lookAt(-.5,-.5);},tick(a,t,dt){a.fx('tail').target=a.calm?0:Math.sin(t*3)*.16;if(d.kind===0&&every(t,dt,1.9,.6))bubbles(a,1);},front:undefined}),
      working:variant('working',{enter(a){a.express('focused');},tick(a,t,dt){a.rootX.target=a.calm?0:Math.sin(t*1.2)*.10;a.lean.target=a.calm?0:Math.sin(t*1.6)*.055;a.fx('tail').target=a.calm?0:Math.sin(t*4)*.16;if(d.kind===0&&every(t,dt,1.2))bubbles(a,1);},front:undefined,back:undefined}),
      done:variant('done',{enter(a){a.express('happy');a.hop(.7);a.fx('tail').velocity+=3;splash(a);},front:undefined}),
      error:variant('error',{enter(a){a.express('worried');a.lean.target=-.09;a.fx('tail').target=.2;},tick(a,t,dt){if(at(t,dt,.4))bubbles(a,1);},front:undefined}),
      sleep:variant('sleep',{enter(a){a.express('closed');a.lean.target=.08;a.hover.target=.02;},tick(a,t){a.fx('tail').target=a.calm?0:Math.sin(t*1.2)*.025;},front:zzz}),
      'peek-tail':{kind:'once',duration:2,label:label('Tail bookmark','躲进小尾巴'),enter(a){a.morph('tail');a.fx('eyesOpacity').target=0;bubbles(a,2);},tick(a,t,dt){a.fx('tail').target=a.calm?0:Math.sin(t*4)*.12;if(at(t,dt,1.3)){a.morph('rest');a.fx('eyesOpacity').target=1;a.express('shy');}}},
      'spout':{kind:'once',duration:1.7,label:label('Bubbles','噗噜泡泡'),enter(a){a.express('happy');a.squish(4);bubbles(a,6);},tick(a,t,dt){if(at(t,dt,.4))a.hop(.35);}}
    },
    signature:[d.kind===1?'peek-tail':'spout'],fidgets:['look-around']
  });
}
export const concepts=designs.map(d=>({...d,character:build(d)}));
export default concepts[0].character;
