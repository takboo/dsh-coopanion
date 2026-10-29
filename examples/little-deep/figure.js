// SPDX-License-Identifier: AGPL-3.0-or-later
// API 2 adapter for the accepted Little Deep work/request director. No timers or session writes.
import {renderActor} from '../../docs/design/art-workflow/vendor/livelings/workspace/livelings.js';
import character,{bendTail} from '../../docs/design/art-workflow/whale-little-deep-v3/character.js';
import {createSegmentPerformance} from '../../docs/design/art-workflow/whale-little-deep-v3/segment-performance.js';
import {drawSymbol} from '../../docs/design/art-workflow/whale-little-deep-v3/storyboard-symbol.js';
import {readCharacterState} from '../../web/character-state.js';
const WORDS=['neutral','thinking','determined','worried','curious','sad','sleep','stand'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export async function createLittleDeepBody(_base,{host,scheme='deep'}={}) {
  const document=host.root.ownerDocument,canvas=document.createElement('canvas');
  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';host.root.append(canvas);
  const g=canvas.getContext('2d');
  const director=createSegmentPerformance({sessionId:'unselected',mode:'rest',palette:scheme,calm:false});
  let bounds=host.bounds(),size=256*bounds.S,anchorX=host.start?.x??bounds.W*.68,anchorY=bounds.floorY-size/3.3*1.1;
  let facing=host.start?.facing===-1?-1:1,press=null,rich=false,initialized=false,gone=false,state=null,legacy='neutral',sleeping=false;
  let lastWidth=bounds.W;
  function frame(){return {cx:anchorX,cy:anchorY,R:Math.max(.01,256*bounds.S/3.3),shadow:true};}
  function local(p){const f=frame();return {x:(p.x-f.cx)/f.R*facing,y:(p.y-f.cy)/f.R};}
  function release(cancel=false){if(!press)return;const moved=press.drag;press=null;director.release();if(!moved&&!cancel){director.tap();host.emit('touch',{kind:'poke',woke:sleeping});sleeping=false;}else if(moved)host.emit('touch',{kind:'drop'});}
  function resize(){const oldFloor=bounds.floorY,offset=anchorY-(oldFloor-size/3.3*1.1);bounds=host.bounds();size=256*bounds.S;release(true);anchorX=anchorX/Math.max(1,lastWidth)*bounds.W;lastWidth=bounds.W;anchorX=clamp(anchorX,size*.6,Math.max(size*.6,bounds.W-size*.6));anchorY=clamp(bounds.floorY-size/3.3*1.1+offset,size*.6,bounds.floorY-size/3.3*1.1);}
  function place(x,turn=facing){release(true);if(Number.isFinite(x))anchorX=clamp(x,size*.6,Math.max(size*.6,bounds.W-size*.6));if(turn===1||turn===-1)facing=turn;anchorY=bounds.floorY-size/3.3*1.1;}
  function sync(next) {
    const switching=state?.sessionId!==next.sessionId||state?.generation!==next.generation;
    if(switching||!next.visible)release(true);
    if(!initialized||switching)director.setVisible(false);
    director.setCalm(next.calm);
    director.sync({sessionId:next.sessionId??'unselected',mode:next.work?.active?'work':'rest',
      workId:next.work?.id??'no-work',stage:next.work?.stage??'focus',pending:next.pending,atMs:next.work?.atMs??0});
    if(!initialized||switching||state.visible!==next.visible)director.setVisible(next.visible);
    state=next;initialized=true;rich=true;
  }
  function vertices() {
    const a=director.actor,f=frame(),c=a.bodyCenter(),angle=a.spinAngle+a.lean.value+a.leanIn.value+a.sway;
    const breath=Math.sin(a.time*2.2)*character.physics.breath*(a.calm?.5:1);
    const sx=(1+a.squash.value+breath*.6)*a.scale.value,sy=(1-a.squash.value-breath)*a.scale.value;
    const points=a.base.map((b,i)=>({x:b.x+a.off[i].x,y:b.y+a.off[i].y}));bendTail(points,a.time,a);
    return points.map(p=>({x:f.cx+(c.x+p.x*sx*Math.cos(angle)-p.y*sy*Math.sin(angle))*f.R*facing,
      y:f.cy+(c.y+p.x*sx*Math.sin(angle)+p.y*sy*Math.cos(angle))*f.R}));
  }
  function layout() {
    const points=vertices(),padding=Math.max(2,size*.025),xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    const left=Math.min(...xs)-padding,top=Math.min(...ys)-padding,right=Math.max(...xs)+padding,bottom=Math.max(...ys)+padding;
    const cx=(left+right)/2,cy=(top+bottom)/2;
    const hit=points.filter((_,i)=>i%6===0).map(p=>({...p,r:size*.065}));hit.push({x:cx,y:cy,r:Math.min(right-left,bottom-top)*.40});
    return {x:anchorX,facing,mode:press?.drag?'drag':sleeping?'sleep':'stand',busy:!!press?.drag,moving:false,pressing:!!press,
      cursor:press?.drag?'grabbing':'grab',box:{x:left,y:top,w:right-left,h:bottom-top},hit,
      bubble:{x:cx,y:top-8},side:{x:right,y:cy,reach:size*.35}};
  }
  const api={
    words:WORDS,layout,resize,place,
    step(dt) {
      if(gone)return;director.advanceAnimation(Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.05)));
      if(!director.view.pendingIds.length&&!state?.work?.active&&['sad','worried','sleep'].includes(legacy))director.actor.express(legacy==='sleep'?'sleepy':legacy);
      const dpr=Math.min(document.defaultView?.devicePixelRatio||1,2),w=Math.round(bounds.W*dpr),h=Math.round(bounds.H*dpr);
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,bounds.W,bounds.H);g.save();g.translate(anchorX,anchorY);g.scale(facing,1);
      const f=frame(),box={cx:0,cy:0,R:f.R,shadow:true};renderActor(g,director.actor,box);
      for(const s of director.view.symbols)drawSymbol(g,director.actor,box,s.progress,s.kind,scheme,director.actor.time,s.tremor,{...s,calm:director.actor.calm});g.restore();
      canvas.dataset.size=String(Math.round(size));canvas.dataset.phase=director.view.phase;canvas.dataset.shape=director.actor.shapeKey;canvas.dataset.pending=String(director.view.pendingIds.length);
      canvas.dataset.symbol=director.view.symbol?.kind??'';canvas.dataset.symbolProgress=String(director.view.symbol?.progress??0);canvas.dataset.actorTime=String(director.actor.time);canvas.dataset.workEntries=String(director.view.work.entries);canvas.dataset.stateProtocol=rich?'1':'legacy';
    },
    set(value) {
      if(value.bounds)resize();
      const next=readCharacterState(value.companionState);if(next){sync(next);return;}
      if(!rich&&('expression' in value||'thinking' in value)) {
        const working=value.thinking||['thinking','determined'].includes(value.expression);
        director.sync({mode:working?'work':'rest',stage:value.expression==='determined'?'tools':'focus',workId:'legacy-work',pending:[]});
      }
    },
    do(word) {
      if(!WORDS.includes(word))return;
      if(word==='stand')sleeping=false;
      if(!rich){legacy=word;sleeping=word==='sleep';director.sync({mode:['thinking','determined'].includes(word)?'work':'rest',stage:word==='determined'?'tools':'focus',workId:'legacy-work',pending:[]});}
      else if(['neutral','curious','worried'].includes(word)&&!state?.work?.active&&!state?.pending.length)director.tap();
    },
    pointer(type,p={}) {
      if(type==='leave'){director.lookAt(null);return;}
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
      const q=local(p);director.lookAt({x:q.x,y:q.y});
      if(type==='down'&&!press)press={point:{x:p.x,y:p.y},x:anchorX,y:anchorY,drag:false};
      else if(type==='move'&&press) {
        const dx=p.x-press.point.x,dy=p.y-press.point.y;
        if(!press.drag&&Math.hypot(dx,dy)>7){press.drag=true;director.beginDrag(local(press.point));host.emit('touch',{kind:'grab'});}
        if(press.drag){anchorX=clamp(press.x+dx,size*.45,bounds.W-size*.45);anchorY=clamp(press.y+dy,size*.45,bounds.floorY-size*.2);director.drag(local(p));}
      } else if(type==='up'||type==='cancel')release(type==='cancel');
    },
    drop(p){release(true);place(p?.x,facing);},shift(dx,dy){if(Number.isFinite(dx))anchorX+=dx;if(Number.isFinite(dy))anchorY+=dy;},
    walk(){return false;},stopWalk(){},talk(){},cue(){},
    setScheme(id){if(!character.palettes.some(p=>p.id===id))throw new Error('Unsupported palette');director.setPalette(id);scheme=id;},
    dispose(){gone=true;release(true);canvas.remove();},
  };
  // The page owns the only animation clock; the pack never registers a second frame loop.
  api.step(0);return api;
}
