// SPDX-License-Identifier: AGPL-3.0-or-later
import {SPOUT_FRAMES,createSpoutFrame,renderSpoutFrame} from './spout-shape-frames.js';
const $=s=>document.querySelector(s);let actors=[],palette='deep',actualSize=150;
function build(){
  actors=SPOUT_FRAMES.map(frame=>createSpoutFrame(frame,palette));
  for(const row of ['normal','actual']){
    const box=$('#'+row);box.replaceChildren();
    for(const frame of SPOUT_FRAMES){
      const figure=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption'),strong=document.createElement('strong'),detail=document.createElement('span');
      canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${frame.title} · ${row==='normal'?'正常查看':'角色实际尺寸'}`);
      strong.textContent=frame.title;detail.textContent=frame.detail;caption.append(strong,detail);figure.append(canvas,caption);box.append(figure);
    }
  }
  draw();
}
function draw(){
  document.documentElement.style.setProperty('--actual-height',`${Math.max(200,actualSize*1.3)}px`);
  for(const row of ['normal','actual'])$('#'+row).querySelectorAll('canvas').forEach((c,i)=>renderSpoutFrame(c,actors[i],SPOUT_FRAMES[i].id,{size:row==='normal'?Math.min(300,c.getBoundingClientRect().width*.82,c.getBoundingClientRect().height):actualSize,background:palette}));
  $('#normal-size').textContent=`角色大小 ${Number($('#normal canvas')?.dataset.size??300).toFixed(0)} px · 看轮廓与造型`;
  $('#actual-size').textContent=`宿主设置 ${actualSize} px · 按角色包原比例绘制`;
}
$('#palette').onchange=e=>{palette=e.target.value;build();};
$('#size').onchange=e=>{actualSize=Math.max(90,Math.min(240,Number(e.target.value)||150));e.target.value=String(actualSize);draw();};
$('#blind').onclick=()=>{const on=document.body.classList.toggle('blind');$('#blind').setAttribute('aria-pressed',String(on));$('#blind').textContent=on?'显示分镜文字':'遮住分镜文字';};
new ResizeObserver(draw).observe($('#contact-sheet'));build();
