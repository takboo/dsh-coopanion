// SPDX-License-Identifier: AGPL-3.0-or-later
import {Actor,renderActor,onFrame} from '../vendor/livelings/workspace/livelings.js';
import {eyeStudies} from './eye-studies.js';
import {tailPerformanceDuration} from './character.js';

const $=selector=>document.querySelector(selector);
const stage=$('#studies'),pairs=[],samples=[];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const names={idle:'在陪着你',working:'认真工作',blocked:'有点担心，需要你',thinking:'想事情，只留下尾巴',sleep:'睡着了',done:'做好啦',
  'blink-soft':'轻轻眨眼','look-around':'看看左边，再看看右边','pet-soft':'舒服地眯眼','peek-tail':'藏起来，再探出来','peek-out':'探头看看你'};
let demo=null,gaze=null,lastState='';

for(const study of eyeStudies.filter(study=>study.id!=='current')) {
  const card=document.createElement('section');card.className='study';
  card.setAttribute('aria-label',`${study.letter} ${study.name}`);
  card.innerHTML=`<div class="study-head"><h2><span class="letter">${study.letter}</span>${study.name}</h2><p>${study.description}</p></div>
    <canvas class="large" role="img" aria-label="${study.name}动态大图"></canvas><div class="small-sizes">
    <figure><canvas role="img" aria-label="${study.name}动态，64像素"></canvas><figcaption>64 px</figcaption></figure>
    <figure><canvas role="img" aria-label="${study.name}动态，128像素"></canvas><figcaption>128 px</figcaption></figure></div>`;
  stage.append(card);
  const actor=new Actor(study.definition,{palette:'deep',seed:42,fidget:false});
  actor.calm=reducedMotion.matches;pairs.push(actor);
  [...card.querySelectorAll('canvas')].forEach((canvas,i)=>{
    samples.push({canvas,actor,size:[230,64,128][i],shadow:i===0,box:null});
  });
  const canvas=card.querySelector('.large');
  canvas.addEventListener('pointermove',e=>{
    const r=canvas.getBoundingClientRect();
    gaze={x:Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/(r.width/2))),
      y:Math.max(-1,Math.min(1,(e.clientY-r.top-r.height/2)/(r.height/2)))};
  });
  canvas.addEventListener('pointerleave',clearGaze);
}

function clearGaze(){gaze=null;for(const actor of pairs)actor.lookFree();}
function palette(){
  const night=document.body.classList.contains('night');
  for(const actor of pairs){
    actor.palette={...actor.def.palettes.find(p=>p.id===$('#palette').value)};
    if(night&&actor.palette.id==='deep')actor.palette.outline='#7795ff';
  }
}
function resize(){
  for(const sample of samples){
    const r=sample.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    sample.canvas.width=Math.round(r.width*dpr);sample.canvas.height=Math.round(r.height*dpr);
    sample.box={width:r.width,height:r.height,dpr};
  }
  draw();
}
function draw(){
  for(const {canvas,actor,size,shadow,box} of samples){
    if(!box)continue;
    const {width,height,dpr}=box,g=canvas.getContext('2d');
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,canvas.width,canvas.height);g.setTransform(dpr,0,0,dpr,0,0);
    const R=Math.min(size/2.85,(width-16)/2.85,(height-14)/(shadow?2.75:2.1));
    renderActor(g,actor,{cx:width/2-.27*R,cy:height/2+.16*R,R,shadow});
  }
}
function stopDemo(){
  if(demo)stage.dataset.demo='stopped';
  demo=null;$('#demo').setAttribute('aria-pressed','false');$('#demo').textContent='一起走一遍 ↗';
  $('#demo-step').textContent='也可以单独点一个动作，慢慢比较。';$('#demo-progress').style.width='0%';
}
function play(id,fromDemo=false){
  if(!fromDemo)stopDemo();clearGaze();
  for(const actor of pairs){if(id==='done')actor.play('idle');actor.play(id);}
}
document.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>play(button.dataset.action));
const sequence=[['idle',1.7,'先看安静时的眼神'],['blink-soft',1.6,'一起眨眨眼'],['look-around',2.8,'看看左右，比较视线'],
  ['working',2.6,'认真工作时的神态'],['blocked',2.4,'有点担心，需要你'],['pet-soft',2.6,'被摸摸，舒服地眯眼'],
  ['peek-tail',tailPerformanceDuration.hide+.3,'藏进尾巴，再探出来'],['thinking',3.5,'认真想事情，只留下尾巴'],['peek-out',tailPerformanceDuration.peek+.3,'短暂探头，再回去想'],
  ['done',3.5,'做好啦，开心地收尾'],['sleep',2.5,'闭眼睡一会'],['idle',1.4,'回到安静陪伴']];
function step(index){
  if(index>=sequence.length){stopDemo();stage.dataset.demo='complete';play('idle',true);$('#demo-step').textContent='这一遍结束了。也可以选一个动作反复看。';$('#demo-progress').style.width='100%';return;}
  const [id,duration,text]=sequence[index];play(id,true);demo={index,start:pairs[0].time,duration};
  $('#demo-step').textContent=`${index+1} / ${sequence.length} · ${text}`;
}
$('#demo').onclick=()=>{
  if(demo){stopDemo();play('idle',true);return;}
  stage.dataset.demo='running';$('#demo').setAttribute('aria-pressed','true');$('#demo').textContent='停止演示 ■';step(0);
};
$('#palette').onchange=palette;
$('#theme').onclick=e=>{const night=document.body.classList.toggle('night');e.currentTarget.textContent=night?'日光背景':'夜色背景';e.currentTarget.setAttribute('aria-pressed',String(night));palette();};
reducedMotion.addEventListener('change',()=>{for(const actor of pairs)actor.calm=reducedMotion.matches;});
const frame={visible:!document.hidden,tick(dt){
  for(const actor of pairs){
    if(gaze&&!actor.onceId&&actor.loopId!=='thinking'&&actor.loopId!=='sleep')actor.lookAt(gaze.x,gaze.y);
    actor.advance(dt);
  }
  if(demo){const fraction=Math.min(1,(pairs[0].time-demo.start)/demo.duration);$('#demo-progress').style.width=`${(demo.index+fraction)/sequence.length*100}%`;if(fraction>=1)step(demo.index+1);}
  const state=pairs[0].state;
  if(state!==lastState){stage.dataset.state=state;$('#motion-state').textContent=names[state]||names[pairs[0].loopId]||state;document.querySelectorAll('[data-action]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.action===state)));lastState=state;}
  draw();
}};
document.addEventListener('visibilitychange',()=>{frame.visible=!document.hidden;if(document.hidden){stopDemo();clearGaze();}});
window.addEventListener('blur',clearGaze);
const observer=new ResizeObserver(resize);for(const {canvas} of samples)observer.observe(canvas);
palette();resize();onFrame(frame);
