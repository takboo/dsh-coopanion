// SPDX-License-Identifier: AGPL-3.0-or-later
// API 2 body: the Host owns input, time and work facts; this adapter owns its physical body.
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
  let bounds=host.bounds(),size=256*bounds.S,anchorX=host.start?.x??bounds.W*.68;
  const ground=()=>bounds.floorY-size/3.3*1.1;
  let anchorY=ground(),facing=-1,press=null,rich=false,initialized=false,gone=false,state=null,legacy='neutral',sleeping=false;
  let lastWidth=bounds.W,vx=0,vy=0,air=false,thrown=false,clock=0,hover=null,travel=0,petAt=-Infinity;
  const reaction={kind:'free',age:0,point:{x:-.4,y:-.2}};
  function react(kind,point=reaction.point){reaction.kind=kind;reaction.age=0;reaction.point=point;}
  const interactionPerformance={
    active:()=>reaction.kind!=='free',
    advance(dt){if(reaction.kind==='free')return;reaction.age+=dt;if(!['carry','air'].includes(reaction.kind)&&reaction.age>(reaction.kind==='pet'?1.3:1.05))reaction.kind='free';},
    apply(a){
      if(reaction.kind==='free')return false;
      const kind=reaction.kind,amp=a.calm?.28:1,pet=kind==='pet',carried=kind==='carry'||kind==='air';
      a.morph('rest',{squash:0,blink:false});a.fx('hidden').target=0;a.fx('eyesOpacity').target=1;
      a.scale.target=1;a.hover.target=.13;a.fx('ripple').target=0;a.fx('belly').target=pet?.45:0;
      a.lean.target=(carried?clamp(vx/4000,-.25,.25):pet?-.19:-.07)*amp;
      a.rootX.target=0;a.fx('fin').target=(carried?.65:pet?.25:.18)*amp;
      a.fx('tail').target=Math.sin(a.time*2)*.04*amp;a.lookAt(reaction.point.x,reaction.point.y);
      a.express(carried?{h:1.15,topLid:0}:pet?{h:.44,topLid:.22}:{h:1.08,topLid:0});return true;
    },
  };
  const director=createSegmentPerformance({sessionId:'unselected',mode:'rest',palette:scheme,calm:false,interactionPerformance,workStyle:'readable'});
  // Livelings' source faces left; API 2 facing=+1 means right. Start with the accepted study direction.
  const mirror=()=>-facing;
  const frame=()=>({cx:anchorX,cy:anchorY,R:Math.max(.01,size/3.3),shadow:true});
  const local=p=>{const f=frame();return{x:(p.x-f.cx)/f.R*mirror(),y:(p.y-f.cy)/f.R};};
  function velocity(p){
    const samples=press.samples.filter(s=>p.t-s.t<=120),first=samples[0];
    if(!first||p.t-first.t<12)return{x:0,y:0};const dt=(p.t-first.t)/1000;
    return{x:clamp((p.x-first.x)/dt,-1100,1100),y:clamp((p.y-first.y)/dt,-1100,1000)};
  }
  function release(cancel=false,fling=false,p={}){
    if(!press)return;const moved=press.drag;
    const speed=moved&&fling?velocity({...p,t:Number.isFinite(p.t)?p.t:press.samples.at(-1).t}):{x:0,y:0};
    press=null;director.release();
    if(moved){vx=speed.x;vy=speed.y;air=anchorY<ground()-.5||Math.hypot(vx,vy)>90;thrown=fling&&Math.hypot(vx,vy)>350;
      if(thrown&&anchorY>ground()-8&&vy>=0)vy=-Math.min(420,130+Math.abs(vx)*.4);
      react(air?'air':'land');host.emit('touch',{kind:thrown?'throw':'drop'});
    }else if(!cancel){air=anchorY<ground()-.5;react(air?'air':'tap');director.tap();host.emit('touch',{kind:'poke',woke:sleeping});sleeping=false;}
    else {air=anchorY<ground()-.5;reaction.kind=air?'air':'free';}
  }
  function stop(){release(true);vx=vy=0;air=thrown=false;reaction.kind='free';hover=null;travel=0;}
  function resize(){const offset=anchorY-ground();stop();bounds=host.bounds();size=256*bounds.S;anchorX=clamp(anchorX/Math.max(1,lastWidth)*bounds.W,size*.6,Math.max(size*.6,bounds.W-size*.6));lastWidth=bounds.W;anchorY=clamp(ground()+offset,size*.6,ground());if(anchorY<ground())air=true;}
  function place(x,turn=facing){stop();if(Number.isFinite(x))anchorX=clamp(x,size*.6,Math.max(size*.6,bounds.W-size*.6));if(turn===1||turn===-1)facing=turn;anchorY=ground();}
  function sync(next){
    const switching=state?.sessionId!==next.sessionId||state?.generation!==next.generation;
    if(switching||!next.visible){stop();anchorY=ground();}
    if(next.pending.length&&!press?.drag&&!air)reaction.kind='free';
    if(!initialized||switching)director.setVisible(false);
    director.setCalm(next.calm);
    director.sync({sessionId:next.sessionId??'unselected',mode:next.work?.active?'work':'rest',workId:next.work?.id??'no-work',stage:next.work?.stage??'focus',pending:next.pending,atMs:next.work?.atMs??0});
    if(!initialized||switching||state.visible!==next.visible)director.setVisible(next.visible);
    state=next;initialized=true;rich=true;
  }
  function vertices(){
    const a=director.actor,f=frame(),c=a.bodyCenter(),angle=a.spinAngle+a.lean.value+a.leanIn.value+a.sway;
    const breath=Math.sin(a.time*2.2)*character.physics.breath*(a.calm?.5:1);
    const sx=(1+a.squash.value+breath*.6)*a.scale.value,sy=(1-a.squash.value-breath)*a.scale.value;
    const points=a.base.map((b,i)=>({x:b.x+a.off[i].x,y:b.y+a.off[i].y}));bendTail(points,a.time,a);
    return points.map(p=>({x:f.cx+(c.x+p.x*sx*Math.cos(angle)-p.y*sy*Math.sin(angle))*f.R*mirror(),y:f.cy+(c.y+p.x*sx*Math.sin(angle)+p.y*sy*Math.cos(angle))*f.R}));
  }
  function layout(){
    const points=vertices(),padding=Math.max(2,size*.025),xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    const left=Math.min(...xs)-padding,top=Math.min(...ys)-padding,right=Math.max(...xs)+padding,bottom=Math.max(...ys)+padding,cx=(left+right)/2,cy=(top+bottom)/2;
    const hit=points.filter((_,i)=>i%6===0).map(p=>({...p,r:size*.065}));hit.push({x:cx,y:cy,r:Math.min(right-left,bottom-top)*.40});
    return{x:anchorX,facing,mode:press?.drag?'drag':air?'air':sleeping?'sleep':'idle',busy:!!press?.drag||air,moving:!!press?.drag||air,pressing:!!press,cursor:press?.drag?'grabbing':'grab',box:{x:left,y:top,w:right-left,h:bottom-top},hit,bubble:{x:cx,y:top-8},side:{x:right,y:cy,reach:size*.35}};
  }
  function physics(dt){
    if(!air)return;vy+=1800*dt;anchorX+=vx*dt;anchorY+=vy*dt;
    const min=size*.6,max=Math.max(min,bounds.W-min);
    if(anchorX<min||anchorX>max){anchorX=clamp(anchorX,min,max);vx*=-.25;}
    if(anchorY<size*.5){anchorY=size*.5;vy=Math.max(0,vy)*.2;}
    if(anchorY>=ground()){
      anchorY=ground();air=false;vx=vy=0;react('land');director.actor.poke(.3);
      if(thrown)host.emit('touch',{kind:'crash'});thrown=false;
    }
  }
  const api={words:WORDS,layout,resize,place,
    step(dt){
      if(gone)return;dt=clamp(Number.isFinite(dt)?dt:0,0,.05);
      if(state?.visible!==false){clock+=dt;physics(dt);director.advanceAnimation(dt);}
      if(!director.view.pendingIds.length&&!state?.work?.active&&reaction.kind==='free'&&['sad','worried','sleep'].includes(legacy))director.actor.express(legacy==='sleep'?'sleepy':legacy);
      const dpr=Math.min(document.defaultView?.devicePixelRatio||1,2),w=Math.round(bounds.W*dpr),h=Math.round(bounds.H*dpr);
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,bounds.W,bounds.H);g.save();g.translate(anchorX,anchorY);g.scale(mirror(),1);
      const f=frame();renderActor(g,director.actor,{cx:0,cy:0,R:f.R,shadow:true});g.restore();
      // Reflect the attachment, never the question mark's stroke itself.
      for(const s of director.view.symbols)drawSymbol(g,director.actor,f,s.progress,s.kind,scheme,director.actor.time,s.tremor,{...s,anchor:s.anchor?{x:s.anchor.x*mirror(),y:s.anchor.y}:undefined,calm:director.actor.calm});
      Object.assign(canvas.dataset,{size:String(Math.round(size)),phase:director.view.phase,shape:director.actor.shapeKey,pending:String(director.view.pendingIds.length),symbol:director.view.symbol?.kind??'',symbolProgress:String(director.view.symbol?.progress??0),actorTime:String(director.actor.time),workEntries:String(director.view.work.entries),stateProtocol:rich?'1':'legacy',reaction:reaction.kind,facing:String(facing)});
    },
    set(value){
      const next=readCharacterState(value.companionState);if(next){sync(next);return;}
      if(!rich&&('expression' in value||'thinking' in value))director.sync({mode:value.thinking||['thinking','determined'].includes(value.expression)?'work':'rest',stage:value.expression==='determined'?'tools':'focus',workId:'legacy-work',pending:[]});
    },
    do(word){if(!WORDS.includes(word))return;if(word==='stand')sleeping=false;
      if(!rich){legacy=word;sleeping=word==='sleep';director.sync({mode:['thinking','determined'].includes(word)?'work':'rest',stage:word==='determined'?'tools':'focus',workId:'legacy-work',pending:[]});}
    },
    pointer(type,p={}){
      if(type==='leave'){director.lookAt(null);hover=null;travel=0;return;}
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||state?.visible===false)return;
      p={...p,t:Number.isFinite(p.t)?p.t:clock*1000};const q=local(p);director.lookAt(q);
      if(type==='down'&&!press){vx=vy=0;air=false;press={point:p,x:anchorX,y:anchorY,drag:false,samples:[p]};react('tap',q);}
      else if(type==='move'&&press){
        const dx=p.x-press.point.x,dy=p.y-press.point.y;press.samples.push(p);press.samples=press.samples.filter(s=>p.t-s.t<140);
        if(!press.drag&&Math.hypot(dx,dy)>6){press.drag=true;react('carry',q);director.beginDrag(local(press.point));host.emit('touch',{kind:'grab'});}
        if(press.drag){anchorX=clamp(press.x+dx,size*.6,bounds.W-size*.6);anchorY=clamp(press.y+dy,size*.5,ground());director.drag({...q,x:q.x+clamp(dx/size,-.2,.2),y:q.y+clamp(dy/size,-.2,.2)});}
      }else if(type==='move'){
        const l=layout(),over=l.hit.some(c=>Math.hypot(p.x-c.x,p.y-c.y)<c.r);
        if(over){if(hover)travel+=Math.min(60,Math.hypot(p.x-hover.x,p.y-hover.y));hover=p;
          if(travel>90&&clock-petAt>.5){petAt=clock;travel=0;react('pet',q);director.tap();host.emit('touch',{kind:'pet'});}
        }else{hover=null;travel=0;}
      }else if(type==='up'||type==='cancel')release(type==='cancel',type==='up',p);
    },
    drop(p){if(press)release(true,false,p);else place(p?.x,facing);},shift(dx,dy){if(Number.isFinite(dx))anchorX+=dx;if(Number.isFinite(dy))anchorY+=dy;},
    walk(){return false;},stopWalk(){},talk(){},cue(){},
    setScheme(id){if(!character.palettes.some(p=>p.id===id))throw new Error('Unsupported palette');director.setPalette(id);scheme=id;},
    dispose(){gone=true;stop();canvas.remove();},
  };
  api.step(0);return api;
}
