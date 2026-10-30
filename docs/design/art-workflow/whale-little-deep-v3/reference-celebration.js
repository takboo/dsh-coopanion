// SPDX-License-Identifier: AGPL-3.0-or-later
// Local adaptation of the user-provided Bloop demo's spout/done choreography.
// Original Little Deep anatomy, renderer and physics remain unchanged.
import {Actor} from '../vendor/livelings/workspace/livelings.js';
import character from './character.js';
import {spoutAnchor} from './completion-spout.js';
const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
export const REFERENCE_SCORES=Object.freeze({
  spout:Object.freeze({duration:2.40,jets:Object.freeze([.35,1.10])}),
  celebrate:Object.freeze({duration:2.85,launch:.20,jet:.22,turn:.88,landing:1.20}),
});
export function referenceWaterColors(a){
  return a.palette.id==='night'?{drop:'#c5d2e7',stream:'#d2ddec',core:'#f4f7fc'}:
    {drop:'#b3c4df',stream:'#becde5',core:'#f7f9fc'};
}
function waterColor(a){return referenceWaterColors(a).drop;}
export function referencePhase(kind,t){
  if(kind==='spout')return t<.35?'gather':t<.90?'spout':t<1.10?'breathe':t<1.75?'spout-again':t<2.15?'fall':'rest';
  return t<.20?'gather':t<.48?'launch':t<.88?'crest':t<1.20?'return':t<1.78?'splash':t<2.35?'settle':'rest';
}

export function createReferenceCelebration({kind='celebrate',palette='deep',calm=false}={}){
  if(!REFERENCE_SCORES[kind])throw new Error('Unknown study action');
  let actor,time=0,visible=true,rainbowOrigin=null;
  const events=[];
  const amp=calm?.25:1;
  function base(a){
    a.morph('rest',{squash:0,blink:false});a.scale.target=1;a.hover.target=.13;a.rootX.target=0;
    a.fx('hidden').target=0;a.fx('eyesOpacity').target=1;a.fx('belly').target=0;
    a.lookAt(-.4,-.2);
  }
  function rest(a){base(a);a.express('neutral');a.lean.target=0;a.fx('tail').target=Math.sin(a.time*1.4)*.025*amp;a.fx('fin').target=.1*amp;a.fx('ripple').target=0;}
  function jet(a,strength,at){
    events.push({type:'jet',at});a.fx('referenceSpray').snap(.2);a.fx('referenceSpray').target=1;
    const c=spoutAnchor(a),n=calm?3:Math.ceil(10*strength);
    if(kind==='celebrate'&&!calm&&!rainbowOrigin){rainbowOrigin={...c};a.fx('referenceRainbow').target=1;}
    for(let i=0;i<n;i++)a.emit({kind:'drop',studyKind:'jet',studyId:`jet-${at}-${i}`,x:c.x,y:c.y,
      vx:(a.rand()-.5)*1.6*(calm?.5:1),vy:(-3.2-a.rand()*1.6*strength)*(calm?.55:1),ay:9,
      life:.98,size:.055,color:waterColor(a)});
  }
  function splash(a,at){
    events.push({type:'landing',at});a.squish(6*amp);
    for(let i=0;i<(calm?4:12);i++){
      const side=i%2?1:-1;
      a.emit({kind:'drop',studyKind:'splash',studyId:`splash-${i}`,x:side*(.50+a.rand()*.45),y:.65,
        vx:side*(.6+a.rand()*.9)*amp,vy:(-2.1-a.rand()*.9)*(calm?.5:1),ay:9,
        life:.80,size:.055+a.rand()*.015,color:waterColor(a)});
    }
  }
  function onceAt(t,dt,at,fn){if(t>=at&&t-dt<at)fn();}
  function animate(a,t,dt){
    base(a);
    if(kind==='spout'){
      a.lean.target=(-.06*Math.sin(t*4))*amp;a.fx('fin').target=(.12+.2*Math.max(0,Math.sin(t*3)))*amp;
      a.fx('tail').target=Math.sin(t*4)*.05*amp;a.fx('ripple').target=0;a.express(t<.35?{h:.8,topLid:.12}:t<1.9?'happy':'soft');
      onceAt(t,dt,.35,()=>jet(a,1.1,.35));onceAt(t,dt,1.10,()=>jet(a,.8,1.10));
    }else{
      a.lean.target=(t<.20?.04:t<.88?-.40:t<1.20?.25:0)*amp;
      a.fx('fin').target=(t<.20?.10:t<1.20?.85:t<1.78?.35:.12)*amp;
      a.fx('tail').target=t<1.45?Math.sin((t-.2)*14)*.24*amp:Math.sin(t*2)*.025*amp;
      a.fx('ripple').target=t<1.20?0:.75*(1-smooth((t-1.20)/1.0));
      a.express(t<.20?{h:.76,topLid:.14}:t<.88?'excited':t<1.75?'happy':t<2.35?'proud':'soft');
      // As in the reference's overlay, keep the light through the spray and release it after 2 s.
      if(t>=2)a.fx('referenceRainbow').target=0;
      onceAt(t,dt,.20,()=>{events.push({type:'launch',at:.20});a.hop(1.8*amp);});
      onceAt(t,dt,.22,()=>jet(a,1.2,.22));
      onceAt(t,dt,.58,()=>{
        if(calm)return;
        const c=a.bodyCenter();
        for(let i=0;i<6;i++){const angle=-Math.PI+(i/5)*Math.PI;
          a.emit({kind:'spark',studyKind:'spark',x:c.x+Math.cos(angle)*1.15,y:c.y+Math.sin(angle)*.85,
            vx:Math.cos(angle)*.3,vy:-.25,ay:.5,life:.52,size:.065,color:'#efcc64'});}
      });
      onceAt(t,dt,1.20,()=>splash(a,1.20));
    }
  }
  function reset(){
    time=0;events.length=0;rainbowOrigin=null;
    const definition={...character,effects:{...character.effects,
      referenceSpray:{rest:0,stiffness:120,damping:14},referenceRainbow:{rest:0,stiffness:90,damping:19}},
      update(a,dt){character.update?.(a,dt);if(a.fx('referenceSpray').target===1&&a.fxValue('referenceSpray')>.95)a.fx('referenceSpray').target=0;},
      actions:{...character.actions,'reference-rest':{kind:'loop',enter:rest,tick:rest},
        'reference-action':{kind:'once',duration:REFERENCE_SCORES[kind].duration,enter(a){base(a);a.squish(6*amp);},tick:animate}}};
    actor=new Actor(definition,{state:'reference-rest',palette,seed:42,fidget:false});actor.calm=calm;
    for(let i=0;i<132;i++)actor.advance(1/120);
    actor.play('reference-action');
  }
  reset();
  function advance(seconds){
    if(!Number.isFinite(seconds)||seconds<0)throw new Error('Expected a finite animation duration');
    if(!visible)return;const target=Math.min(REFERENCE_SCORES[kind].duration,time+seconds);
    while(time<target-1e-9){const dt=Math.min(1/120,target-time);actor.advance(dt);time+=dt;}time=target;
  }
  return {get actor(){return actor;},get time(){return time;},get duration(){return REFERENCE_SCORES[kind].duration;},
    get view(){return {time,kind,phase:referencePhase(kind,time),pressure:clamp(actor.fxValue('referenceSpray')),
      jets:events.filter(e=>e.type==='jet').length,landings:events.filter(e=>e.type==='landing').length,
      launches:events.filter(e=>e.type==='launch').length,events:events.map(e=>({...e})),
      drops:actor.particles.filter(p=>p.kind==='drop').length,visible,
      rainbowOrigin:rainbowOrigin?{...rainbowOrigin}:null,
      rainbow:kind==='celebrate'&&!calm&&time<REFERENCE_SCORES[kind].duration&&actor.fxValue('referenceRainbow')>=.005?clamp(actor.fxValue('referenceRainbow')):0};},
    advance,seek(value){if(!Number.isFinite(value))throw new Error('Expected a finite seek time');const shown=visible;reset();visible=true;advance(Math.max(0,Math.min(REFERENCE_SCORES[kind].duration,value)));visible=shown;},
    setVisible(value){visible=Boolean(value);},
    setPalette(id){const p=character.palettes.find(p=>p.id===id);if(!p)throw new Error('Unknown palette');palette=id;actor.palette=p;
      for(const drop of actor.particles)if(drop.studyKind==='jet'||drop.studyKind==='splash')drop.color=waterColor(actor);},
  };
}

export function drawReferenceRainbow(g,study,layout){
  const v=study.view,alpha=v.rainbow;if(alpha<.001||!v.rainbowOrigin)return;
  const R=layout.R,colors=['#74a8ff','#65cd8d','#ffe066','#ffa94d','#ff7885'];
  // Centre the light on the released spray's field, rather than attach a badge to the body.
  const x=layout.cx+(v.rainbowOrigin.x+.34)*R,y=layout.cy+(v.rainbowOrigin.y+1.70)*R;
  g.save();g.globalAlpha=alpha*.90;g.lineCap='butt';g.lineWidth=R*.145;
  for(let i=0;i<colors.length;i++){
    const radius=R*(2.10+i*.135),n=parseInt(colors[i].slice(1),16),rgb=[n>>16&255,n>>8&255,n&255].join(',');
    const light=g.createLinearGradient(x-radius,0,x+radius,0);
    for(const [at,opacity] of [[0,0],[.10,.86],[.25,1],[.75,1],[.90,.86],[1,0]])light.addColorStop(at,`rgba(${rgb},${opacity})`);
    g.strokeStyle=light;g.beginPath();g.arc(x,y,radius,Math.PI,Math.PI*2);g.stroke();
  }
  g.restore();
}

export function drawReferenceSpout(g,study,layout){
  const p=study.view.pressure;if(p<.03)return;
  const c=spoutAnchor(study.actor),R=layout.R,h=R*(.35+p*.85)*(study.actor.calm?.65:1);
  const x=layout.cx+c.x*R,y=layout.cy+c.y*R;
  const colors=referenceWaterColors(study.actor);
  g.save();g.lineCap='round';
  // The Bloop reference uses three elastic, unoutlined streams, not a filled column.
  for(const [side,color,width] of [[-1,colors.stream,.070],[1,colors.stream,.070],[0,colors.core,.075]]){
    g.strokeStyle=color;g.lineWidth=R*width;g.beginPath();g.moveTo(x,y);
    g.bezierCurveTo(x+side*R*.05,y-h*.90,x+side*R*.40*p,y-h*1.15,x+side*R*.50*p,y-h*.35);g.stroke();
  }
  g.restore();
}
