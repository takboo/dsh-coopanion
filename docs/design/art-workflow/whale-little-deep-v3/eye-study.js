// SPDX-License-Identifier: AGPL-3.0-or-later
import {Actor,renderActor} from '../vendor/livelings/workspace/livelings.js';
import {eyeStudies} from './eye-studies.js';

const samples=[];
for(const study of eyeStudies) {
  const card=document.createElement('section');card.className='study';
  card.setAttribute('aria-label',`${study.letter} ${study.name}`);
  card.innerHTML=`<div class="study-head"><h2><span class="letter">${study.letter}</span>${study.name}</h2><p>${study.description}</p></div>
    <canvas class="large" role="img" aria-label="${study.name}的大图"></canvas><div class="small-sizes">
    <figure><canvas role="img" aria-label="${study.name}，64像素"></canvas><figcaption>64 px</figcaption></figure>
    <figure><canvas role="img" aria-label="${study.name}，128像素"></canvas><figcaption>128 px</figcaption></figure></div>`;
  document.getElementById('studies').append(card);
  [...card.querySelectorAll('canvas')].forEach((canvas,i)=>{
    const actor=new Actor(study.definition,{palette:'deep',seed:42,fidget:false});
    actor.calm=true;actor.lookAt(0,0);
    for(let n=0;n<120;n++)actor.advance(1/120);
    const sample={canvas,actor,size:[200,64,128][i],shadow:i===0};samples.push(sample);
  });
}

function draw() {
  const night=document.body.classList.contains('night');
  for(const {canvas,actor,size,shadow} of samples) {
    actor.palette={...actor.def.palettes.find(p=>p.id===document.getElementById('palette').value)};
    if(night&&actor.palette.id==='deep')actor.palette.outline='#7795ff';
    const box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);
    const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
    const R=Math.min(size/2.85,(box.width-12)/2.85,(box.height-14)/2.10);
    renderActor(g,actor,{cx:box.width/2-.27*R,cy:box.height/2+.16*R,R,shadow});
  }
}
document.getElementById('palette').onchange=draw;
document.getElementById('theme').onclick=e=>{
  const night=document.body.classList.toggle('night');
  e.currentTarget.textContent=night?'日光背景':'夜色背景';
  e.currentTarget.setAttribute('aria-pressed',String(night));draw();
};
const observer=new ResizeObserver(draw);
for(const {canvas} of samples)observer.observe(canvas);
draw();
