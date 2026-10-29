// SPDX-License-Identifier: AGPL-3.0-or-later
import {renderActor} from '../vendor/livelings/workspace/livelings.js';
import {bendTail} from './character.js';
import character from './character.js';
import {drawSymbol} from './storyboard-symbol.js';
import {createLifeTouchFilm,LIFE_TOUCH_FRAMES} from './life-touch-film.js';
const $=s=>document.querySelector(s),canvas=$('#film'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const labels={free:'自在生活',notice:'注意到你靠近',touch:'轻触，柔和回应',pet:'舒服地眯眼，稍靠近',afterglow:'松手后，慢慢放松'};
let film,playing=false,last=null,raf=null,layout,press=null;const samples=new Map();
function options(){return {palette:$('#palette').value,kind:$('#kind').value,calm:reduced.matches};}
function draw(target,life) {
  const b=target.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  target.width=Math.round(b.width*dpr);target.height=Math.round(b.height*dpr);
  const g=target.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle=$('#palette').value==='night'?'#15263f':'#e8eef8';g.fillRect(0,0,b.width,b.height);
  const box={cx:b.width/2,cy:b.height*.64,R:Math.min(b.width/4.6,b.height/3.5),shadow:true};
  renderActor(g,life.actor,box);
  for(const s of life.view.symbols)drawSymbol(g,life.actor,box,s.progress,s.kind,$('#palette').value,life.actor.time,s.tremor,{...s,calm:reduced.matches});
  target.dataset.rendered='true';target.dataset.phase=life.view.interaction.phase;
  if(target===canvas)layout=box;
}
function render() {
  if(!film)return;const v=film.view,s=v.life;draw(canvas,film.life);
  $('#phase').textContent=s.pendingIds.length?(s.symbol?.kind==='approval'?'先等你决定':'有件事想问你'):s.mode==='work'?'生活退让，集中工作':labels[s.interaction.phase];
  $('#ownership').textContent=s.pendingIds.length?'请求接管':s.mode==='work'?'工作接管':s.interaction.phase==='free'?'生活继续':'回应你的触碰';
  $('#status').textContent=v.manual?'手动体验：按住身体来回移动，松手看余韵。后续分镜已停止，可手动插入请求或工作。':v.scoreFinished?'样片已播完，继续当前生活；可重播或切到手动体验。':'连续样片：靠近 → 抚摸 → 松手 → 请求接管 → 回生活 → 工作接管。';
  $('#manual').setAttribute('aria-pressed',String(v.manual));$('#manual').textContent=v.manual?'正在手动体验':'手动体验';
  $('#play').textContent=playing?'暂停':'播放';$('#play').setAttribute('aria-pressed',String(playing));
  $('#settle').disabled=!s.pendingIds.length;$('#mode').textContent=s.mode==='life'?'让生活退给工作':'结束示例工作，回到生活';
  $('#progress').value=String(Math.round(Math.min(film.time,16)*1000));$('#clock').textContent=`${Math.min(film.time,16).toFixed(1)} / 16 s`;
}
function renderReferences() {
  for(const c of document.querySelectorAll('canvas[data-time]')) {
    let sample=samples.get(c);if(!sample){sample=createLifeTouchFilm(options());sample.seek(Number(c.dataset.time));samples.set(c,sample);}
    sample.setPalette($('#palette').value);draw(c,sample.life);
  }
}
function schedule(){if(playing&&!document.hidden&&raf===null)raf=requestAnimationFrame(tick);}
function tick(now){raf=null;if(!playing||document.hidden){last=null;return;}const dt=last===null?0:Math.min(.05,(now-last)/1000);last=now;film.advance(dt);render();schedule();}
function run(){playing=true;last=null;render();schedule();}
function cancelPress(){if(press===null)return;const id=press;press=null;film.life.cancel();if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
function seek(time){cancelPress();playing=false;film.seek(time);last=null;render();}
function configure(){cancelPress();film=createLifeTouchFilm(options());playing=!reduced.matches;last=null;samples.clear();render();renderReferences();schedule();}
function pointer(event){const b=canvas.getBoundingClientRect();return {x:(event.clientX-b.left-layout.cx)/layout.R,y:(event.clientY-b.top-layout.cy)/layout.R};}
// Same rendered contour and whole-body transform used by the accepted request gesture page.
function hit(p) {
  const a=film.life.actor,c=a.bodyCenter(),angle=a.spinAngle+a.lean.value+a.leanIn.value+a.sway;
  const breath=Math.sin(a.time*2.2)*character.physics.breath*(a.calm?.5:1),dx=p.x-c.x,dy=p.y-c.y;
  const q={x:(dx*Math.cos(angle)+dy*Math.sin(angle))/((1+a.squash.value+breath*.6)*a.scale.value),y:(-dx*Math.sin(angle)+dy*Math.cos(angle))/((1-a.squash.value-breath)*a.scale.value)};
  const points=a.base.map((b,i)=>({x:b.x+a.off[i].x,y:b.y+a.off[i].y}));bendTail(points,a.time,a);let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){const u=points[i],v=points[j];if((u.y>q.y)!==(v.y>q.y)&&q.x<(v.x-u.x)*(q.y-u.y)/(v.y-u.y)+u.x)inside=!inside;}
  return inside;
}
function local(p){const c=film.life.actor.bodyCenter();return {x:p.x-c.x,y:p.y-c.y};}
canvas.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||press!==null||!hit(pointer(event)))return;
  film.manual();if(!film.life.press(local(pointer(event))))return;
  event.preventDefault();press=event.pointerId;canvas.focus();canvas.setPointerCapture(press);run();
});
canvas.addEventListener('pointermove',event=>{
  if(!film.view.manual)return;const p=pointer(event);canvas.style.cursor=hit(p)?'pointer':'default';
  if(press!==null&&press!==event.pointerId)return;
  if(press!==null){if(hit(p))film.life.move(local(p));}
  else if(Math.hypot(p.x,p.y)<2.1)film.life.move(local(p));else film.life.leave();
  render();
});
canvas.addEventListener('pointerup',event=>{
  if(press!==event.pointerId)return;const id=press;press=null;film.life.release();if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);run();
});
canvas.addEventListener('pointercancel',cancelPress);canvas.addEventListener('lostpointercapture',cancelPress);
canvas.addEventListener('pointerleave',()=>{if(press===null)film.life.leave();});
canvas.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();film.manual();film.life.tap();run();}});
for(const frame of LIFE_TOUCH_FRAMES){const f=document.createElement('figure'),box=document.createElement('div'),c=document.createElement('canvas'),caption=document.createElement('figcaption');box.className='keyframe-image';c.dataset.time=String(frame.time);c.setAttribute('role','img');c.setAttribute('aria-label',frame.title);caption.textContent=`${frame.time.toFixed(1)} s · ${frame.title}`;box.append(c);f.append(box,caption);$('#references').append(f);
  const button=document.createElement('button');button.textContent=`${frame.time.toFixed(1)} s · ${frame.title}`;button.onclick=()=>seek(frame.time);$('#landmarks').append(button);}
$('#play').onclick=()=>{playing=!playing;last=null;render();schedule();};$('#replay').onclick=()=>{cancelPress();film.seek(0);run();};
$('#progress').oninput=e=>seek(Number(e.target.value)/1000);$('#kind').onchange=configure;
$('#palette').onchange=()=>{film.setPalette($('#palette').value);render();renderReferences();};
$('#manual').onclick=()=>{film.manual();run();};$('#tap').onclick=()=>{film.manual();film.life.tap();run();};
for(const kind of ['question','approval'])$('#'+kind).onclick=()=>{cancelPress();film.inject(kind);run();};
$('#settle').onclick=()=>{film.settle();run();};$('#mode').onclick=()=>{cancelPress();film.setMode(film.view.life.mode==='life'?'work':'life');run();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelPress();film.setVisible(!document.hidden);last=null;if(document.hidden&&raf!==null){cancelAnimationFrame(raf);raf=null;}else{render();schedule();}});
reduced.addEventListener('change',()=>{cancelPress();film.setCalm(reduced.matches);playing=false;last=null;samples.clear();render();renderReferences();});
new ResizeObserver(()=>{render();renderReferences();}).observe($('.touch-stage'));
configure();
