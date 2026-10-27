// SPDX-License-Identifier: AGPL-3.0-or-later
import {createMascot,onFrame,sounds} from '../whale-livelings-prototype-v2/livelings/livelings.js';
import character,{signatureMoves,bendTail} from './character.js';

const $ = s => document.querySelector(s);
const host = $('#whale'), stage = $('#stage');
const options = {character,palette:'deep',seed:42,fidget:true,shadow:true,zoom:1,interactive:false,sound:true};
const mascot = createMascot(host,options);
sounds.enabled = false;
mascot.canvas.setAttribute('aria-label','小湛，蓝色鲸鱼。可轻戳、按住抚摸、连戳三下藏进尾巴，或用下方按钮互动。');
let soundOn = false, scale = 1, pointer = null, press = null, petTimer = null;
let message = {text:'靠近看看，它也在看你。',until:3};
let demo = null, lastState = '', lastDescription = '';

const states = {
  idle:['在陪着你','弯弯的白肚皮、小尾巴，还有偶尔偷偷看你的眼睛。'],
  thinking:['正在想事情','潜进自己的小世界，把小尾巴留给你。'],
  working:['认真忙起来','尾巴和小鳍一起划，慢慢往前做。'],
  waiting:['安静等一等','不催你，只悄悄看一眼。'],
  blocked:['有件事需要你','尾巴收一收，等你来帮个忙。'],
  listening:['在听你说','你说吧，小湛会认真听。'],
  sleep:['睡着啦','尾巴也困了。轻轻戳一下就能叫醒它。'],
  done:['做好啦','探出头，送你一小束水花。'],
  error:['有点卡住了','先缓一缓，吐个小泡泡再继续。'],
  'peek-tail':['藏进小尾巴','害羞一下，很快就探出来看看你。'],
  'spout':['噗噜，喷水啦','小小的水花，不会把桌面弄湿。'],
  'tail-wave':['用尾巴打招呼','看见你了，尾巴先说声你好。'],
  'dive':['潜下去，再探头','带着小泡泡一起回来。'],
  'belly-show':['露露白肚皮','舒服地侧一下身子。'],
  'bubble-ring':['吹个泡泡圈','把开心轻轻吹给你。'],
  'blink-soft':['偷偷眨眨眼','一次，再一次。'],
  'pet-soft':['舒服得眯起眼','嗯，再摸一会儿也可以。'],
  'peek-out':['探出来看看','你找我呀？我在呢。'],
  'tail-settle':['轻轻收收尾巴','换个舒服的小姿势。'],
};

for (const move of signatureMoves) {
  const button = document.createElement('button');
  button.type = 'button'; button.dataset.move = move.id;
  button.innerHTML = `${move.name}<small>${move.detail}</small>`;
  button.onclick = () => play(move.id);
  $('#tricks').append(button);
}

function say(text,seconds=2) {message={text,until:mascot.actor.time+seconds};}
function cancelPress() {
  clearTimeout(petTimer);
  if (mascot.actor.isGrabbed) mascot.actor.release();
  press = null;
}
function stopDemo() {
  if (demo) stage.dataset.demoResult='stopped';
  demo = null; $('#demo').setAttribute('aria-pressed','false');
  $('#demo').innerHTML='走一遍完整体验 <span>↗</span>';
  $('#demo-step').textContent='看看它怎样工作、藏起来，再探出头。';
  $('#demo-progress').style.width='0%';
}
function play(id,fromDemo=false) {
  if (!fromDemo) stopDemo();
  cancelPress();
  // Result reactions settle into idle instead of returning to an old thinking loop.
  if (id==='done'||id==='error') mascot.play('idle');
  mascot.play(id); message.until=0;
}
document.querySelectorAll('[data-state]').forEach(b=>b.onclick=()=>play(b.dataset.state));
document.querySelectorAll('[data-gesture]').forEach(b=>b.onclick=()=>play(b.dataset.gesture));

function applyPalette() {
  const palette = {...character.palettes.find(p=>p.id===$('#palette').value)};
  if (document.body.classList.contains('night')) {
    palette.mark='#b7c9ed';
    if (palette.id==='deep') palette.outline='#7795ff';
  }
  mascot.actor.palette=palette;
}
$('#palette').onchange=applyPalette;
$('#theme').onclick=()=>{
  document.body.classList.toggle('night');
  const night=document.body.classList.contains('night');
  $('#theme').textContent=night?'日光':'夜色';$('#theme').setAttribute('aria-pressed',night);
  applyPalette();
};
$('#sound').onclick=()=>{
  soundOn=!soundOn;sounds.enabled=soundOn;
  $('#sound').textContent=soundOn?'声音开':'声音关';$('#sound').setAttribute('aria-pressed',soundOn);
};
function resize() {
  const r=host.getBoundingClientRect();
  const base=Math.min(r.width/3.3,r.height/3.3);
  const radius=Math.min(83*scale,(r.width/2-20)/1.98,(r.height*.84-28)/2.55,(r.height*.16-13)/.46);
  options.zoom=Math.max(.1,radius)/Math.max(1,base);
}
new ResizeObserver(resize).observe(host);resize();
$('#size').oninput=e=>{scale=+e.target.value/100;$('#size-value').textContent=e.target.value+'%';resize();};

function point(e) {
  const r=mascot.canvas.getBoundingClientRect(),p=mascot.layout;
  return{x:(e.clientX-r.left-p.cx)/p.R,y:(e.clientY-r.top-p.cy)/p.R};
}
function hit(p) {
  const a=mascot.actor,c=a.bodyCenter(),angle=a.spinAngle+a.lean.value+a.leanIn.value+a.sway;
  const breath=Math.sin(a.time*2.2)*character.physics.breath*(a.calm?.5:1);
  const sx=(1+a.squash.value+breath*.6)*a.scale.value,sy=(1-a.squash.value-breath)*a.scale.value;
  const dx=p.x-c.x,dy=p.y-c.y;
  const q={x:(dx*Math.cos(angle)+dy*Math.sin(angle))/sx,y:(-dx*Math.sin(angle)+dy*Math.cos(angle))/sy};
  const points=a.base.map((b,i)=>({x:b.x+a.off[i].x,y:b.y+a.off[i].y}));
  bendTail(points,a.time,a);
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const u=points[i],v=points[j];
    if((u.y>q.y)!==(v.y>q.y)&&q.x<(v.x-u.x)*(q.y-u.y)/(v.y-u.y)+u.x)inside=!inside;
  }
  return inside;
}
mascot.canvas.addEventListener('pointerdown',e=>{
  const p=point(e);if(!hit(p))return;
  e.preventDefault();stopDemo();
  if(mascot.actor.loopId==='sleep')mascot.play('idle');
  press={id:e.pointerId,x:e.clientX,y:e.clientY,point:p,drag:false,pet:false,restore:mascot.actor.loopId};
  mascot.canvas.setPointerCapture(e.pointerId);
  petTimer=setTimeout(()=>{
    if(!press||press.drag)return;
    press.pet=true;mascot.actor.purr();say('舒服得眯起眼，再摸一会也可以。',2.1);
  },420);
});
mascot.canvas.addEventListener('pointermove',e=>{
  const p=point(e),a=mascot.actor;
  mascot.canvas.style.cursor=hit(p)?(press?.drag?'grabbing':'grab'):'default';
  if(!press||press.id!==e.pointerId)return;
  if(!press.drag&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>7){
    clearTimeout(petTimer);press.drag=true;
    mascot.play('idle');a.grab(press.point);a.express('surprised');
    say('尾巴软软的，轻轻拉一拉就好。',2.0);
  }
  if(press.drag)a.drag(p);
});
function release(e,cancelled=false){
  if(!press||press.id!==e.pointerId)return;
  const was=press;clearTimeout(petTimer);press=null;
  if(was.drag){mascot.actor.release();mascot.play(was.restore);mascot.actor.flash('soft',.7);say('轻轻松手，小湛又安顿好了。',1.6);}
  else if(!cancelled&&!was.pet){const count=mascot.actor.tap();say(count>=3?'藏起来一下，很快就回来。':count===2?'你发现它会连着眨眼了。':'咦，是你呀。噗噜，送你两个小泡泡。',1.7);}
  mascot.canvas.style.cursor='grab';
}
mascot.canvas.addEventListener('pointerup',e=>release(e));
mascot.canvas.addEventListener('pointercancel',e=>release(e,true));
window.addEventListener('pointermove',e=>{
  pointer={x:e.clientX,y:e.clientY};
  const r=host.getBoundingClientRect();
  const near=Math.hypot(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2)<300;
  mascot.lookAtClient(near?e.clientX:null,e.clientY);
},{passive:true});
window.addEventListener('blur',()=>{cancelPress();pointer=null;mascot.lookAtClient(null);});
document.addEventListener('visibilitychange',()=>{
  mascot.visible=!document.hidden;
  if(document.hidden){cancelPress();stopDemo();mascot.lookAtClient(null);}
});

const sequence=[
  ['idle',2.2,'先安静地陪你一会'],['thinking',4.0,'潜进思考，只留下小尾巴'],
  ['working',3.0,'出来认真忙起来'],['waiting',2.3,'安静等一等'],
  ['listening',2.5,'认真听你说'],['done',3.3,'做好啦，送你一束水花'],
  ['peek-tail',3.6,'藏起来，再探出头'],['tail-wave',2.8,'摆摆尾巴打招呼'],
  ['spout',2.7,'噗噜喷水'],['dive',3.9,'潜下去，再回来'],
  ['belly-show',3.3,'舒服地露露白肚皮'],['bubble-ring',3.1,'吹一个泡泡圈'],
  ['error',3.0,'卡住时也会缓一缓'],['blocked',2.4,'有件事需要你'],
  ['pet-soft',2.4,'被摸摸，舒服得眯起眼'],['blink-soft',1.6,'眨一次，再眨一次'],
  ['sleep',3.5,'小尾巴也困了'],['idle',2,'回到安静的陪伴'],
];
function demoStep(index){
  if(index>=sequence.length){
    stopDemo();play('idle',true);stage.dataset.demoResult='complete';
    $('#demo-step').textContent='这一遍体验结束啦，随时再试。';
    $('#demo-progress').style.width='100%';
    say('这一遍体验结束啦。想逗哪一下，随时再试。',3);return;
  }
  const [id,duration,text]=sequence[index];
  demo={index,start:mascot.actor.time,duration};play(id,true);
  $('#demo-step').textContent=`${index+1} / ${sequence.length} · ${text}`;
}
$('#demo').onclick=()=>{
  if(demo){stopDemo();play('idle',true);return;}
  stage.dataset.demoResult='running';
  $('#demo').innerHTML='停止体验 <span>■</span>';$('#demo').setAttribute('aria-pressed','true');demoStep(0);
};
onFrame({visible:true,tick(){
  if(document.hidden)return;
  const a=mascot.actor;
  if(demo){
    const fraction=Math.min(1,(a.time-demo.start)/demo.duration);
    $('#demo-progress').style.width=((demo.index+fraction)/sequence.length*100)+'%';
    if(fraction>=1)demoStep(demo.index+1);
  }
  const key=a.state,description=states[key]||states[a.loopId]||states.idle;
  if(key!==lastState){
    $('#state-name').textContent=description[0];stage.dataset.state=key;
    document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.state===(['done','error'].includes(key)?key:a.loopId)));
    document.querySelectorAll('[data-move]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.move===key));
    lastState=key;
  }
  const text=a.time<message.until?message.text:description[1];
  if(text!==lastDescription){$('#response').textContent=text;lastDescription=text;}
}});
