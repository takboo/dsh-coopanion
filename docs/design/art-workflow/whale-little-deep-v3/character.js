// SPDX-License-Identifier: AGPL-3.0-or-later
// Little Deep v3: code-drawn whale, developed from the user's selected concepts.
import {
  defineCharacter, label, physics, shapes, variant, at, every,
  zzz, blip, chime, splash as splashSound, whoosh,
} from '../whale-livelings-prototype-v2/livelings/livelings.js';

function outline(start, curves) {
  let point = {x: start[0], y: start[1]};
  const points = [point];
  for (const curve of curves) {
    const from = point;
    for (let n = 1; n <= 18; n++) {
      const t = n / 18, u = 1 - t;
      points.push({
        x: u*u*u*from.x + 3*u*u*t*curve[0] + 3*u*t*t*curve[2] + t*t*t*curve[4],
        y: u*u*u*from.y + 3*u*u*t*curve[1] + 3*u*t*t*curve[3] + t*t*t*curve[5],
      });
    }
    point = {x: curve[4], y: curve[5]};
  }
  return shapes.resample(points);
}

// Rounded forehead, a little notch, a curved peduncle, and asymmetric flukes.
export const whaleBody = () => outline([-1.13, -.12], [
  [-1.14, -.65, -.76, -.97, -.26, -.96],
  [.02, -.96, .23, -.89, .48, -.99],
  [.59, -1.03, .64, -1.02, .67, -1.00],
  [.47, -.95, .49, -.82, .63, -.72],
  [.75, -.62, .88, -.54, .98, -.52],
  [1.03, -.65, .99, -.79, .93, -.86],
  [.77, -.94, .77, -1.17, .91, -1.33],
  [.96, -1.39, .97, -1.35, 1.00, -1.24],
  [1.02, -1.08, 1.10, -.98, 1.20, -.92],
  [1.37, -1.04, 1.57, -.97, 1.70, -1.14],
  [1.77, -1.24, 1.78, -1.20, 1.77, -1.09],
  [1.75, -.82, 1.54, -.63, 1.27, -.63],
  [1.23, -.22, 1.03, .13, .73, .36],
  [.88, .50, 1.03, .55, 1.02, .60],
  [.81, .70, .59, .60, .48, .51],
  [.17, .83, -.30, .91, -.73, .65],
  [-1.03, .47, -1.16, .19, -1.13, -.12],
]);

const tailBookmark = () => outline([-.09, .80], [
  [-.10, .46, -.06, .05, -.02, -.23],
  [-.47, -.22, -.73, -.53, -.69, -.94],
  [-.68, -1.10, -.60, -1.17, -.57, -1.12],
  [-.44, -.79, -.23, -.64, .02, -.56],
  [.29, -.85, .59, -.73, .88, -.95],
  [1.01, -1.05, 1.03, -.99, .97, -.82],
  [.84, -.43, .49, -.23, .16, -.25],
  [.11, .06, .09, .46, .10, .80],
  [.04, .85, -.04, .85, -.09, .80],
]);

function paintPath(r, points, fill, stroke = null, width = .025) {
  const g = r.g, first = r.toPx(...points[0]);
  g.beginPath(); g.moveTo(first.x, first.y);
  for (const p of points.slice(1)) {
    const a = r.toPx(p[0], p[1]), b = r.toPx(p[2], p[3]), c = r.toPx(p[4], p[5]);
    g.bezierCurveTo(a.x, a.y, b.x, b.y, c.x, c.y);
  }
  g.closePath(); g.fillStyle = fill; g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = r.R * width; g.lineJoin = 'round'; g.stroke(); }
}

export function bendTail(points, time, actor) {
  // Rotate the whole fluke around its root; keep the notch and forehead stable.
  const angle = actor.fxValue('tail');
  for (const p of points) {
    const weight = Math.max(0, Math.min(1, (p.x - .73) / .43));
    const turn = angle * weight, x = p.x - .86, y = p.y + .28;
    p.x = .86 + Math.cos(turn) * x - Math.sin(turn) * y;
    p.y = -.28 + Math.sin(turn) * x + Math.cos(turn) * y;
  }
}

function bubbles(a, count = 3, large = false) {
  if (a.calm) count = Math.min(count, 1);
  const c = a.bodyCenter();
  for (let i = 0; i < count; i++) a.emit({
    kind: 'bubble', x: c.x - .88, y: c.y + .04,
    vx: -.18 - a.rand()*.18, vy: -.55 - a.rand()*.40,
    life: large ? 2.0 : 1.35, size: large ? .20 : .035 + a.rand()*.035,
    grow: large ? .18 : .015, color: a.palette.accent,
  });
}

function spout(a, count = 9) {
  if (a.calm) count = 2;
  const c = a.bodyCenter();
  for (let i = 0; i < count; i++) a.emit({
    kind: 'drop', x: c.x + .17, y: c.y - .88,
    vx: (a.rand() - .5) * 1.2, vy: -1.7 - a.rand()*1.0, ay: 3.6,
    life: .9, size: .035 + a.rand()*.025, color: a.palette.accent,
  });
}

function hide(a) {
  a.morph('tail', {squash: .4, blink: false});
  a.fx('hidden').target = 1; a.fx('eyesOpacity').target = 0;
  a.scale.target = .78; a.hover.target = .09; a.lookFree();
}
function reveal(a) {
  a.morph('rest', {squash: .4, blink: false});
  a.fx('hidden').target = 0; a.fx('eyesOpacity').target = 1;
  a.scale.target = 1; a.hover.target = .13;
}
function wave(a, t, amplitude = .16, speed = 4.0) {
  a.fx('tail').target = a.calm ? 0 : Math.sin(t * speed) * amplitude;
}
function heart(a) {
  const c = a.bodyCenter();
  a.emit({kind:'heart',x:c.x-.12,y:c.y-.82,vy:-.32,life:1.5,size:.09,color:a.palette.accent});
}

export const signatureMoves = [
  {id:'peek-tail', name:'藏进尾巴', detail:'害羞一下，再悄悄探出来'},
  {id:'spout', name:'噗噜喷水', detail:'抬一抬头，喷一小束水花'},
  {id:'tail-wave', name:'摆尾招呼', detail:'先看你，再用尾巴打招呼'},
  {id:'dive', name:'潜下再探头', detail:'潜进去，带着小泡泡回来'},
  {id:'belly-show', name:'露露白肚皮', detail:'舒服地侧一下身子'},
  {id:'bubble-ring', name:'吹个泡泡圈', detail:'把开心轻轻吹给你'},
];

export default defineCharacter({
  id: 'little-deep-v3', name: label('Little Deep', '小湛'),
  material: label('A little blue whale', '一只认真又有点害羞的蓝鲸'),
  tagline: label('Dives into thought. Leaves its tail with you.', '认真想事情时，只把小尾巴留给你。'),
  bio: label('A quiet whale with a crescent belly and a tail full of expression.', '弯弯的白肚皮、向上翘的尾巴；安静地陪着你，也会偷偷眨眨眼。'),
  traits: {en:['Thoughtful','Shy','Tail first'],zh:['爱潜水','有点害羞','尾巴会说话']},
  physics: physics({floaty:true,hover:.13,breath:.014,wobble:.001,
    softStiffness:260,softDamping:15,softSmoothing:160,stretch:.48,
    squashiness:.60,morphStiffness:130,morphDamping:18,
    hopPower:2.2,bounce:0}),
  eyes: {w:.29,h:.41,corner:1,spacing:.65,lift:.025,topLid:0,bottomLid:0,tilt:0,slant:0,asym:0},
  eyeMode:'ink',eyeShine:0,outlineWidth:.026,thicken:false,splash:false,
  face:{x:.04,y:-.26,r:.63},rest:whaleBody,
  shapes:{
    tail:tailBookmark,
    wide:()=>shapes.transform(whaleBody(),1.06,.94,0,.04),
    tall:()=>shapes.transform(whaleBody(),.97,1.04,0,-.03),
    puddle:()=>shapes.transform(whaleBody(),1.07,.90,0,.08),
  },
  palettes:[
    {id:'deep',body:'#4d6bfe',eye:'#ffffff',outline:'#3651ce',accent:'#8eaaff',core:'#ffffff',mark:'#526ba4'},
    {id:'soft',body:'#6088f4',eye:'#fffdf8',outline:'#3c60be',accent:'#9bbcff',core:'#f8fbff',mark:'#526b99'},
    {id:'milk',body:'#f8f4e8',eye:'#293950',outline:'#52617a',accent:'#7096f5',core:'#dce8ff',mark:'#52617a'},
    {id:'night',body:'#45609b',eye:'#f6f8ff',outline:'#829ed1',accent:'#a8c2ff',core:'#e2ebfb',mark:'#a8bde4'},
  ],
  effects:{
    tail:{rest:0,stiffness:72,damping:12},fin:{rest:0,stiffness:85,damping:13},
    hidden:{rest:0,stiffness:95,damping:18},eyesOpacity:{rest:1,stiffness:95,damping:18},
    belly:{rest:0,stiffness:65,damping:14},opacity:{rest:1,stiffness:50,damping:12},
    ripple:{rest:0,stiffness:40,damping:11},
  },
  outlineMod:bendTail,
  paintBack(r) {
    const alpha = r.actor.fxValue('ripple');
    if (alpha < .01) return;
    const g=r.g;
    g.save(); const parentAlpha=g.globalAlpha; g.strokeStyle=r.palette.accent; g.lineWidth=r.R*.018;
    for(let i=0;i<3;i++){
      const phase=(r.time*.5+i/3)%1;
      g.globalAlpha=parentAlpha*.50*alpha*(1-phase);
      g.beginPath();g.ellipse(r.cx+r.actor.rootX.value*r.R,r.cy+r.R*.53,
        r.R*(.56+phase*.65),r.R*(.055+phase*.055),0,0,Math.PI*2);g.stroke();
    }
    g.restore();
  },
  paintBody(r) {
    const alpha = (1 - Math.min(1, Math.max(0, r.actor.fxValue('hidden')))) ** 2;
    if (alpha < .005) return;
    const belly = r.actor.fxValue('belly');
    r.g.save(); r.g.globalAlpha *= alpha;
    // The curved opening is the main identity feature; leave a blue lower lip.
    paintPath(r,[[-1.02,-.10-belly*.08],[-.76,-.14-belly*.10,-.17,.08-belly*.08,.43,.53],
      [.13,.76,-.30,.77,-.63,.55],[-.90,.35,-1.02,.11,-1.02,-.10-belly*.08]],r.palette.core);
    r.g.restore();
  },
  paintFace(r) {
    const alpha = (1 - Math.min(1, Math.max(0, r.actor.fxValue('hidden')))) ** 2;
    if (alpha < .005) return;
    const fin = r.actor.fxValue('fin');
    r.g.save(); r.g.globalAlpha *= alpha * r.actor.fxValue('opacity');
    paintPath(r,[[.00,.18],[.03,.39,.24,.59+fin*.06,.49,.57],
      [.39,.48+fin*.06,.20,.43,.00,.18]],r.palette.body);
    r.g.restore();
  },
  update(a) {
    // Keep blink timing and the occasional double blink from the native engine.
    if (!a.onceId && a.loopId === 'idle') {
      wave(a,a.time,.045,1.6);
      a.fx('fin').target = a.calm ? 0 : Math.sin(a.time*.9)*.08;
    }
    if (a.cues.secondBlink && a.time >= a.cues.secondBlink) {
      a.cues.secondBlink = 0; a.blink();
    }
  },
  react:{
    tap(a,count) {
      if (a.fxValue('hidden') > .65) { a.play('peek-out'); return true; }
      if (count >= 3) { a.play('peek-tail'); return true; }
      if (count === 2) { a.play('blink-soft'); a.fx('tail').velocity += 1.5; return true; }
      a.flash('curious',.75); a.poke(.32); a.fx('tail').velocity += .7; bubbles(a,2); return true;
    },
    purr(a) {
      if (a.onceId === 'pet-soft') return true;
      a.play('pet-soft'); return true;
    },
    giggle(a) { a.play('bubble-ring'); return true; },
    startle(a) { a.flash('surprised',.6); a.fx('tail').velocity += 1.2; a.blink(); return true; },
    arrive(a,away) {
      if (a.cues.met && away > 7 && a.loopId === 'idle' && !a.onceId && !a.isGrabbed) a.play('tail-wave');
      a.cues.met = 1;
    },
  },
  sounds:{
    tap:s=>blip(s,610,900,.06,.035),
    'peek-tail':s=>whoosh(s,800,260,.25,.035),
    spout:s=>splashSound(s,.4,.04),
    done:s=>chime(s,[76,79,83],.10,.035),
    error:s=>blip(s,390,290,.16,.025),
    'bubble-ring':s=>blip(s,500,1000,.10,.03),
  },
  actions:{
    idle:variant('idle',{enter(a){reveal(a);a.express('neutral');},front:undefined,back:undefined}),
    thinking:variant('thinking',{
      enter(a){hide(a);},tick(a,t,dt){wave(a,t,.11,2.6);if(every(t,dt,3.6,1.6))bubbles(a,1);},
      front:undefined,back:undefined,
    }),
    working:variant('working',{
      enter(a){reveal(a);a.express('focused');},
      tick(a,t,dt){wave(a,t,.09,4.8);a.rootX.target=a.calm?0:Math.sin(t*1.3)*.09;a.lean.target=a.calm?0:Math.sin(t*1.3)*.025;a.fx('fin').target=a.calm?0:Math.sin(t*4.8)*.35;if(every(t,dt,3.2,1.4))bubbles(a,1);},
      front:undefined,back:undefined,
    }),
    waiting:variant('waiting',{
      enter(a){reveal(a);a.express('curious');a.lookAt(-.5,.1);},
      tick(a,t){wave(a,t,.025,1.4);},front:undefined,back:undefined,
    }),
    blocked:variant('blocked',{
      enter(a){reveal(a);a.express('worried');a.lean.target=-.06;a.fx('tail').target=.10;a.lookAt(-.4,-.1);},
      front:undefined,back:undefined,
    }),
    listening:variant('listening',{
      enter(a){reveal(a);a.express('soft');a.lookFree();},
      tick(a,t,dt){wave(a,t,.035,1.7);if(!a.calm&&every(t,dt,2.2,.7)){a.lean.velocity+=.13;a.fx('fin').velocity+=.3;}},
      front:undefined,back:undefined,
    }),
    sleep:variant('sleep',{
      enter(a){reveal(a);a.express('closed');a.lean.target=.11;a.scale.target=.94;a.hover.target=.025;a.lookAt(0,.5);},
      tick(a,t){wave(a,t,.015,1.1);},front:zzz,back:undefined,
    }),
    done:variant('done',{
      duration:3.0,enter(a){reveal(a);a.express('happy');a.fx('fin').target=.7;},
      tick(a,t,dt){wave(a,t,.18*Math.max(0,1-t/3),5.3);if(at(t,dt,.36)){if(!a.calm)a.hop(.65);spout(a,8);}if(at(t,dt,1.7))a.express('proud');},
      front:undefined,back:undefined,
    }),
    error:variant('error',{
      duration:2.7,enter(a){reveal(a);a.express('worried');a.fx('tail').target=.17;a.lean.target=-.06;a.blink();},
      tick(a,t,dt){if(at(t,dt,.5))bubbles(a,1);if(at(t,dt,1.6))a.express('soft');},front:undefined,back:undefined,
    }),
    'peek-tail':{kind:'once',duration:3.3,label:label('Hide in the tail','藏进尾巴'),
      enter(a){hide(a);bubbles(a,2);},tick(a,t,dt){wave(a,t,.12,3.3);if(at(t,dt,2.15)){reveal(a);a.express('shy');a.blink();}}},
    'spout':{kind:'once',duration:2.4,label:label('Spout','噗噜喷水'),
      enter(a){reveal(a);a.express('happy');a.lean.target=.07;},
      tick(a,t,dt){wave(a,t,.10,3);if(at(t,dt,.4)){spout(a,11);a.squish(2.0);}if(at(t,dt,1.4))a.lean.target=0;}},
    'tail-wave':{kind:'once',duration:2.5,label:label('Tail hello','摆尾招呼'),
      enter(a){reveal(a);a.express('soft');a.lookFree();},
      tick(a,t,dt){wave(a,t,Math.sin(Math.min(1,t/2.5)*Math.PI)*.23,4.8);if(at(t,dt,.3))a.blink();}},
    'dive':{kind:'once',duration:3.6,label:label('Dive and surface','潜下再探头'),
      enter(a){reveal(a);a.express('closed');a.hover.target=-.42;a.lean.target=.14;a.fx('opacity').target=.30;a.fx('eyesOpacity').target=.12;a.fx('ripple').target=1;},
      tick(a,t,dt){wave(a,t,.12,4);if(at(t,dt,.5))bubbles(a,4);if(at(t,dt,1.7)){reveal(a);a.fx('opacity').target=1;a.fx('ripple').target=.3;a.lean.target=-.06;a.express('curious');spout(a,6);}if(at(t,dt,2.5))a.lean.target=0;}},
    'belly-show':{kind:'once',duration:3.0,label:label('Show the belly','露露白肚皮'),
      enter(a){reveal(a);a.express('happy');a.lean.target=-.20;a.fx('belly').target=1;a.fx('fin').target=1;},
      tick(a,t,dt){wave(a,t,.07,2.2);if(at(t,dt,1.9)){a.lean.target=0;a.fx('belly').target=0;a.fx('fin').target=0;}}},
    'bubble-ring':{kind:'once',duration:2.8,label:label('Bubble ring','吹个泡泡圈'),
      enter(a){reveal(a);a.express('happy');a.fx('fin').target=.6;},
      tick(a,t,dt){wave(a,t,.09,3.5);if(at(t,dt,.3))bubbles(a,1,true);if(at(t,dt,1.0))a.blink();}},
    'blink-soft':{kind:'once',duration:1.25,label:label('Double blink','眨眨眼'),
      enter(a){reveal(a);a.blink();a.cues.secondBlink=a.time+.30;a.lookFree();},
      tick(a,t,dt){if(at(t,dt,.60))a.express('soft');}},
    'pet-soft':{kind:'once',duration:2.1,label:label('Enjoy a pet','舒服地眯眼'),
      enter(a){reveal(a);a.express('happy');a.fx('fin').target=.8;a.fx('belly').target=.22;heart(a);},
      tick(a,t){wave(a,t,.035,2.1);}},
    'peek-out':{kind:'once',duration:2.8,label:label('Peek out','探出来看看'),
      enter(a){reveal(a);a.express('curious');a.blink();},tick(a,t){wave(a,t,.07,2.5);}},
    'tail-settle':{kind:'once',duration:1.4,label:label('Settle the tail','轻轻收尾'),
      enter(a){reveal(a);},tick(a,t){wave(a,t,Math.sin(Math.min(1,t/1.4)*Math.PI)*.07,3);}},
  },
  signature:signatureMoves.map(m=>m.id),
  fidgets:['blink-soft','tail-settle'],
});
