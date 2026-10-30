// SPDX-License-Identifier: AGPL-3.0-or-later
import {renderActor} from '../vendor/livelings/workspace/livelings.js';
import {createReferenceCelebration,drawReferenceRainbow,drawReferenceSpout} from './reference-celebration.js';
const $=s=>document.querySelector(s),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const phases={gather:'轻收身体，蓄一口气',launch:'跃起，喷水',crest:'开心展开',return:'倾斜翻回',splash:'回落，水花散开',settle:'开心余韵',rest:'安静落定',spout:'第一口喷水',breathe:'换一口气','spout-again':'第二口轻喷',fall:'水滴自然落散'};
let study,playing=false,last=null,raf=null,actualSize=150;
function draw(canvas,size){
  const b=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(b.width*dpr);canvas.height=Math.round(b.height*dpr);
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle=$('#palette').value==='night'?'#15263f':'#f7fafc';g.fillRect(0,0,b.width,b.height);
  const layout={cx:b.width*.44,cy:b.height-26-(size/3.3)*1.30,R:size/3.3,shadow:true};
  drawReferenceRainbow(g,study,layout);renderActor(g,study.actor,layout);drawReferenceSpout(g,study,layout);
  const v=study.view;Object.assign(canvas.dataset,{rendered:'true',time:String(study.time),phase:v.phase,kind:v.kind,calm:String(study.actor.calm),size:String(size),radius:String(layout.R),jets:String(v.jets),landings:String(v.landings),drops:String(v.drops),pressure:String(v.pressure),actorTime:String(study.actor.time)});
}
function render(){
  if(!study)return;const normalSize=Math.min(300,$('#normal').getBoundingClientRect().width*.56);draw($('#normal'),normalSize);draw($('#actual'),actualSize);
  $('#normal-size').textContent=`角色大小 ${normalSize.toFixed(0)} px`;$('#actual-size').textContent=`宿主设置 ${actualSize} px · 原比例`;
  for(const e of document.querySelectorAll('.phase'))e.textContent=phases[study.view.phase];
  $('#progress').max=String(Math.round(study.duration*1000));$('#progress').value=String(Math.round(study.time*1000));$('#clock').textContent=`${study.time.toFixed(2)} / ${study.duration.toFixed(2)} s`;
  $('#play').textContent=playing?'暂停':'播放';$('#play').setAttribute('aria-pressed',String(playing));
  $('#playback-status').textContent=study.time>=study.duration?'本段结束，可从头播放。':playing?'正常尺寸与实际尺寸同步播放。':'已暂停，可从头播放或定位关键节点。';
}
function configure(time=0){
  study=createReferenceCelebration({kind:$('#action').value,palette:$('#palette').value,calm:reduced.matches});study.seek(time);study.setVisible(!document.hidden);playing=false;last=null;
  $('#score-description').textContent=$('#action').value==='celebrate'?'先轻收身体，跃起喷水；倾斜翻回，落散水花和彩虹渐退。单次播放，不自动循环。':'身体先轻轻压缩，先后喷出两口弹性水流，独立水滴自然升起、减速和下落。单次播放，不自动循环。';
  $('#landmarks').replaceChildren();const shots=$('#action').value==='celebrate'?[[.10,'蓄力'],[.48,'跃起喷水'],[.95,'翻回'],[1.45,'回落水花'],[2.40,'余韵']]:[[.15,'蓄力'],[.55,'第一口喷水'],[1.30,'第二口喷水'],[1.85,'落散']];
  for(const [at,title] of shots){const b=document.createElement('button');b.textContent=title;b.dataset.at=String(at);b.onclick=()=>seek(at);$('#landmarks').append(b);}render();
}
function schedule(){if(playing&&!document.hidden&&raf===null)raf=requestAnimationFrame(tick);}
function tick(now){raf=null;if(!playing||document.hidden){last=null;return;}const dt=last===null?0:Math.min(.05,(now-last)/1000);last=now;study.advance(dt);if(study.time>=study.duration)playing=false;render();schedule();}
function run(){playing=true;last=null;render();schedule();}
function seek(time){playing=false;last=null;study.seek(time);render();}
$('#replay').onclick=()=>{study.seek(0);run();};$('#play').onclick=()=>{if(study.time>=study.duration)study.seek(0);playing=!playing;last=null;render();schedule();};
$('#progress').oninput=e=>seek(Number(e.target.value)/1000);$('#action').onchange=()=>configure();
$('#palette').onchange=e=>{study.setPalette(e.target.value);render();};$('#size').onchange=e=>{actualSize=Math.max(90,Math.min(240,Number(e.target.value)||150));e.target.value=String(actualSize);render();};
$('#blind').onclick=()=>{const on=document.body.classList.toggle('blind');$('#blind').setAttribute('aria-pressed',String(on));$('#blind').textContent=on?'显示分镜文字':'遮住分镜文字';};
document.addEventListener('visibilitychange',()=>{study.setVisible(!document.hidden);last=null;if(document.hidden&&raf!==null){cancelAnimationFrame(raf);raf=null;}else schedule();});
reduced.addEventListener('change',()=>configure(study.time));new ResizeObserver(render).observe($('#motion-pair'));configure();
