// SPDX-License-Identifier: AGPL-3.0-or-later
import {renderActor} from '../vendor/livelings/workspace/livelings.js';
import {drawSymbol} from './storyboard-symbol.js';
import {drawReferenceRainbow,drawReferenceSpout} from './reference-celebration.js';
import {createCompletionFilm,COMPLETION_LANDMARKS} from './completion-film.js';
const $=s=>document.querySelector(s),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const names={'complete-gather':'轻收身体，蓄一口气','complete-launch':'做完了，跃起喷水','complete-crest':'虹光随喷雾展开','complete-return':'倾斜翻回','complete-splash':'回落，水花散开','complete-settle':'开心余韵','complete-rest':'虹光收尾',
  'reply-settle':'说完了，轻轻收起',gather:'先接住上一段余势',celebrate:'做完了，开心展开',release:'让开心自然落定',
  gatherWork:'收鳍准备',dive:'集中潜入',focus:'专注工作',surface:'展开，继续手头工作',execute:'工具执行',review:'复核刚才的工作',report:'向你说明进展',
  resume:'从这里接回工作',stretch:'回生活，舒展一下',observe:'自在探看',belly:'松弛伸展',bubble:'追看泡泡',rest:'安静陪伴',return:'再看看你'};
let film,playing=false,last=null,raf=null,blind=false;
function options(){return {palette:$('#palette').value,route:$('#route').value,interruptAt:Number($('#interrupt-at').value),calm:reduced.matches};}
function draw(canvas,lane){
  const b=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.round(b.width*dpr),h=Math.round(b.height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle=$('#palette').value==='night'?'#15263f':'#f7fafc';g.fillRect(0,0,b.width,b.height);
  const size=Math.min(Number($('#size').value),b.width*.56),R=size/3.3,layout={cx:b.width*.44,cy:b.height-26-R*1.30,R,shadow:true};
  const effect={actor:lane.actor,view:lane.view.celebration??{rainbow:0,pressure:0}};
  drawReferenceRainbow(g,effect,layout);renderActor(g,lane.actor,layout);drawReferenceSpout(g,effect,layout);
  for(const s of lane.view.symbols)drawSymbol(g,lane.actor,layout,s.progress,s.kind,$('#palette').value,lane.actor.time,s.tremor,{...s,calm:reduced.matches});
  Object.assign(canvas.dataset,{rendered:'true',phase:lane.view.finishPhase??lane.view.phase,mode:lane.view.mode,spouts:String(lane.view.spouts),pending:String(lane.view.pendingIds.length),shape:lane.actor.shapeKey,size:String(size),rainbow:String(lane.view.celebration?.rainbow??0),pressure:String(lane.view.celebration?.pressure??0),landings:String(lane.view.celebration?.landings??0),actorTime:String(lane.actor.time)});
}
function label(lane){const v=lane.view;return v.pendingIds.length?(v.symbol?.kind==='approval'?'等你决定':'有件事想问你'):v.finishPhase?names[v.finishPhase]:v.phase==='gather'?names.gatherWork:names[v.phase]??'从当前姿态继续';}
function render(){if(!film)return;
  for(const lane of ['reply','goal']){draw($('#'+lane+'-canvas'),film[lane]);$('#'+lane+'-phase').textContent=label(film[lane]);}
  $('#goal-count').textContent=`完成水花 ${film.goal.view.spouts} 次`;
  $('#stage').value=film.view.stage;$('#stage').disabled=!film.view.active;
  $('#progress').value=String(Math.round(Math.min(film.time,film.duration)*1000));$('#clock').textContent=`${Math.min(film.time,film.duration).toFixed(1)} / ${film.duration} s`;
  $('#play').textContent=playing?'暂停':'播放连续对照';$('#play').setAttribute('aria-pressed',String(playing));$('#settle').disabled=!film.goal.view.pendingIds.length;
  $('#playback-status').textContent=!film.view.scored?'手动接管中，后续模拟事件已停止。':film.time>=film.duration?'本段结束，可重播或手动插入新事件。':playing?'连续播放；画内只有角色及图形附属物。':'已暂停；可定位分镜节点，或从头播放。';
}
function boards(){for(const lane of ['reply','goal']){const box=$('#'+lane+'-board');box.replaceChildren();
  for(const [at,title,detail] of [[5.10,'收势／蓄力','承接同一段汇报的余势'],[5.72,lane==='reply'?'普通结束':'虹光展开',lane==='reply'?'轻收势后安静陪伴':'已通过的喷水和彩虹，由当前身体接出'],[7.20,'余韵',lane==='reply'?'已回到生活':'水花落散后，虹光收尾']]){
    const figure=document.createElement('figure'),image=document.createElement('div'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption'),strong=document.createElement('strong');image.className='keyframe-image';strong.textContent=title;caption.append(strong,detail);image.append(canvas);figure.append(image,caption);box.append(figure);
    const sample=createCompletionFilm({...options(),route:'none'});sample.seek(at);canvas.dataset.keyframe=lane;draw(canvas,sample[lane]);
  }}
}
function schedule(){if(playing&&!document.hidden&&raf===null)raf=requestAnimationFrame(tick);}
function tick(now){raf=null;if(!playing||document.hidden){last=null;return;}const dt=last===null?0:Math.min(.05,(now-last)/1000);last=now;film.advance(dt);if(film.time>=film.duration&&film.view.scored)playing=false;render();schedule();}
function configure(){film=createCompletionFilm(options());film.setVisible(!document.hidden);playing=false;last=null;render();boards();}
function seek(t){playing=false;film.seek(t);last=null;render();}
function run(){playing=true;last=null;render();schedule();}
$('#play').onclick=()=>{if(film.time>=film.duration&&film.view.scored)film.seek(0);playing=!playing;last=null;render();schedule();};
$('#replay').onclick=()=>{film.seek(0);run();};$('#route').onchange=configure;$('#interrupt-at').onchange=configure;
$('#progress').oninput=e=>seek(Number(e.target.value)/1000);
$('#size').onchange=()=>{render();boards();};
$('#palette').onchange=()=>{film.setPalette($('#palette').value);render();boards();};
$('#blind').onclick=()=>{blind=!blind;document.body.classList.toggle('blind',blind);$('#blind').setAttribute('aria-pressed',String(blind));$('#blind').textContent=blind?'显示分镜文字':'遮住分镜文字';};
$('#question').onclick=()=>{film.inject('question');run();};$('#approval').onclick=()=>{film.inject('approval');run();};$('#settle').onclick=()=>{film.settle();run();};
$('#new-work').onclick=()=>{film.startWork();run();};$('#stage').onchange=e=>{film.setStage(e.target.value);run();};$('#repeat').onclick=()=>{film.repeat();run();};
for(const shot of COMPLETION_LANDMARKS){const b=document.createElement('button');b.textContent=`${shot.time.toFixed(2)} s · ${shot.title}`;b.onclick=()=>seek(shot.time);$('#landmarks').append(b);}
document.addEventListener('visibilitychange',()=>{film.setVisible(!document.hidden);last=null;if(document.hidden&&raf!==null){cancelAnimationFrame(raf);raf=null;}else schedule();});
reduced.addEventListener('change',()=>{film.setCalm(reduced.matches);playing=false;last=null;render();boards();});
new ResizeObserver(()=>{render();boards();}).observe($('.pair-grid'));configure();
