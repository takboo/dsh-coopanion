// SPDX-License-Identifier: AGPL-3.0-or-later
import {renderActor} from '../vendor/livelings/workspace/livelings.js';
import {createWorkLoop} from './work-loop.js';
import {drawSymbol} from './storyboard-symbol.js';
const $=s=>document.querySelector(s),canvas=$('#live-film'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const names={idle:'安静陪伴',considering:'凝神考量',doing:'低头划鳍做事',replying:'展开向你回应','request-study':'等你处理请求',settling:'轻轻收势',done:'开心收尾'};
let loop,seq=-1,current=null,last=null,prior='',changes=0,busy=false;
function render() {
  if(!loop)return;const v=loop.view,bounds=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  const width=Math.round(bounds.width*dpr),height=Math.round(bounds.height*dpr);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#e8eef8';g.fillRect(0,0,bounds.width,bounds.height);
  const layout={cx:bounds.width/2,cy:bounds.height*.64,R:Math.min(bounds.width/4.6,bounds.height/3.5),shadow:true};
  renderActor(g,loop.actor,layout);
  for(const symbol of v.symbols)drawSymbol(g,loop.actor,layout,symbol.progress,symbol.kind,'deep',loop.actor.time,symbol.tremor,{...symbol,calm:reduced.matches});
  if(v.motion!==prior){if(prior)changes++;prior=v.motion;}
  $('#motion').textContent=names[v.motion]??v.motion;$('#requests').textContent=v.pendingIds.length?`${v.pendingIds.length} 个请求仍未结算`:v.symbols.length?'标记退场中':'没有待处理请求';
  $('#event-clock').textContent=(v.clocks.eventTimeMs/1000).toFixed(1)+' s';$('#phase-clock').textContent=(v.clocks.eventPhaseAgeMs/1000).toFixed(1)+' s';
  $('#animation-clock').textContent=v.clocks.animationSeconds.toFixed(1)+' s';$('#changes').textContent=String(changes);
  $('#fact').textContent=`seq ${current.seq} · ${current.type} · 步骤 ${current.step} · 未返回工具 ${current.tools} · 事实 ${current.mood}`;
  $('#pending').textContent=current.pending.length?current.pending.map(p=>`${p.kind} · ${p.id}`).join(' / '):'当前没有待处理身份';
  $('#origin').textContent=current.pending.some(p=>p.observation==='blocking-tool-span')?'当前 ? 来自阻塞提问工具的真实未返回区间；这是日志观察，非实时请求回调。':'请求来自公开投影或原始审批事件。';
}
async function poll() {
  if(busy)return;busy=true;
  try {
    const response=await fetch('/live.json?after='+seq,{cache:'no-store'});if(!response.ok)throw new Error();const data=await response.json();
    $('#session').textContent=data.sessionId;$('#status').textContent=data.status==='observing'?'正在观察日志增量；用户在 Harness 中操作。':'观察暂不可用，保留最后已知事实。';
    if(data.current) {
      if(!loop){loop=createWorkLoop({sessionId:data.sessionId,calm:reduced.matches});loop.setVisible(false);current=data.current;loop.sync({...current,sessionId:data.sessionId});loop.setVisible(!document.hidden);}
      else for(const f of data.facts){current=f;loop.sync({...f,sessionId:data.sessionId});}
      seq=data.current.seq;loop.advanceEventTime(Math.max(loop.view.clocks.eventTimeMs,data.sourceNowMs));render();
    }
  } catch {$('#status').textContent='连接中断，保留最后已知事实；不推断请求已结算。';}
  finally {busy=false;}
}
function tick(now){const dt=last===null?0:Math.min(.05,(now-last)/1000);last=now;if(loop&&!document.hidden){loop.advance(dt);render();}requestAnimationFrame(tick);}
document.addEventListener('visibilitychange',()=>{last=null;loop?.setVisible(!document.hidden);});
reduced.addEventListener('change',()=>loop?.setCalm(reduced.matches));
setInterval(poll,500);poll();requestAnimationFrame(tick);
