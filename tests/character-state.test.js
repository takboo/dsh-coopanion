import {describe,it,expect} from 'vitest';
import {PetModel} from '../src/model.ts';
import {projectCharacterState,readCharacterState,supportsCharacterState} from '../web/character-state.js';
import {readManifest} from '../src/upstream/packs.ts';
const session=id=>({id,header:{version:4,id,createdAt:0,isSeeded:false,cwd:'/isolated'}});
const feed=(model,s)=>{let seq=0;return (type,data)=>model.consume(s,{type,data,seq:seq++,time:1000+seq});};
const interaction=(kind,id=kind,sessionId='focus')=>({id,sessionId,kind,state:'open',preview:'PRIVATE QUESTION',nativeId:'native-'+id});
const notifications=(interactions=[])=>({protocol:1,runtime:{phase:'running',visible:true,suspended:false,generation:4},interactions});
const project=(m,p=[])=>projectCharacterState(m.snapshot(),notifications(p));

describe('optional character state metadata',()=>{
  it('does not invent a work identity when running status precedes the actual turn',()=>{
    const m=new PetModel(),s=session('focus'),consume=feed(m,s);
    m.running(s);expect(m.snapshot().active).toBe(true);expect(project(m).work).toBe(null);
    consume('turn/start',{turn:1});const identity=project(m).work.id;
    consume('turn/end',{turn:1,reason:{kind:'completed'}});expect(project(m).work.active).toBe(false);
    m.running(s);expect(project(m).work).toBe(null);
    consume('turn/start',{turn:2});expect(project(m).work.id).not.toBe(identity);
  });
  it('keeps one work identity across dense tool steps and updates stage independently of a waiting face',()=>{
    const m=new PetModel(),s=session('focus'),consume=feed(m,s);consume('turn/start',{turn:1});const identity=project(m).work.id;
    for(let i=0;i<12;i++){
      consume('tool/call',{turn:1,step:i+1,name:'read_file',callId:'call-'+i,arguments:'PRIVATE ARGUMENT'});
      expect(project(m).work).toMatchObject({id:identity,stage:'tools',active:true,tools:1});
      m.interactions([interaction('question')]);expect(m.snapshot().mood).toBe('waiting');
      consume('tool/result',{turn:1,step:i+1,message:{toolCallId:'call-'+i,content:[{type:'text',text:'PRIVATE RESULT'}]}});
      expect(project(m,[interaction('question')]).work).toMatchObject({id:identity,stage:'focus',active:true,tools:0});
    }
    consume('assistant/message',{turn:1,step:13,message:{content:[{type:'text',text:'PRIVATE PUBLIC TEXT'}]},stream:[]});
    expect(project(m,[interaction('question')]).work.stage).toBe('report');
    consume('turn/end',{turn:1,reason:{kind:'completed'}});expect(project(m).work).toMatchObject({active:false,outcome:{category:'reply'}});
    consume('turn/start',{turn:2});expect(project(m).work.id).not.toBe(identity);
  });
  it('exposes live generation phase but never reasoning, text, paths, credentials or request previews',()=>{
    const m=new PetModel(),s=session('focus'),consume=feed(m,s);consume('turn/start',{turn:1});
    const start={type:'start',attemptId:'stream',revision:1,turn:1,step:1};m.stream(s,start);
    m.stream(s,{type:'chunk',attemptId:'stream',revision:1,index:0,time:1100,chunk:{type:'reasoning-delta',index:0,text:'PRIVATE REASONING'}});
    expect(project(m).work.stage).toBe('focus');
    m.stream(s,{type:'chunk',attemptId:'stream',revision:1,index:1,time:1200,chunk:{type:'text-delta',index:1,text:'PRIVATE RESPONSE'}});
    const state=project(m,[interaction('question')]);expect(state.work.stage).toBe('report');
    expect(JSON.stringify(state)).not.toMatch(/PRIVATE|isolated|preview|arguments|credential|source/);
    m.stream(s,{type:'end',attemptId:'stream',revision:1,index:2,outcome:{kind:'abandoned'}});
    expect(project(m).work.id).toBe(state.work.id);
  });
  it('keeps full selected request identities, respects continued state and never borrows background work',()=>{
    const m=new PetModel(),s=session('focus'),other=session('background');m.observe(s);feed(m,other)('turn/start',{turn:1});
    const first=interaction('question','long-full-id'),second=interaction('approval','long-full-id-more'),background=interaction('question','other','background');
    const state=project(m,[first,second,background]);expect(state.work).toBe(null);expect(state.pending.map(p=>p.id)).toEqual([first.id,second.id]);
    expect(project(m,[{...second,state:'continued'},{...first,state:'settled'}]).pending).toEqual([{id:second.id,sessionId:'focus',kind:'approval',state:'continued'}]);
    const staleTop={...m.snapshot(),activity:{id:'old-session',stage:'tools',tools:1,seq:2,atMs:1200}};
    expect(projectCharacterState(staleTop,notifications()).work).toBe(null);
  });
  it('gates the extension by an explicit supported version and keeps existing manifests unchanged',()=>{
    const original=readManifest('examples/star');expect(typeof original).toBe('object');expect(original.extensions).toBeUndefined();expect(supportsCharacterState(original)).toBe(false);
    const fresh=readManifest('examples/little-deep');expect(supportsCharacterState(fresh)).toBe(true);
    expect(supportsCharacterState({extensions:{'dsh-coopanion':{state:2}}})).toBe(false);
  });
  it('copies only listed fields and rejects malformed identity, duplicate requests and unknown protocol',()=>{
    const m=new PetModel(),s=session('focus');feed(m,s)('turn/start',{turn:1});const base=project(m,[interaction('question')]);
    expect(readCharacterState({...base,secret:'PRIVATE',pending:base.pending.map(p=>({...p,preview:'PRIVATE'}))})).toEqual(base);
    for(const bad of [{...base,protocol:2},{...base,pending:[...base.pending,...base.pending]},{...base,sessionId:null},{...base,work:{...base.work,tools:-1}},{...base,pending:[interaction('question','wrong','elsewhere')]}])expect(readCharacterState(bad)).toBe(null);
  });
  it('preserves source state during hide, suspension and view controls without inventing settlement',()=>{
    const m=new PetModel(),s=session('focus');feed(m,s)('turn/start',{turn:1});const n=notifications([interaction('approval')]);
    const state=projectCharacterState(m.snapshot(),n,{visible:false,calm:true});expect(state).toMatchObject({visible:false,calm:true,generation:4});expect(state.pending).toHaveLength(1);
    n.runtime.suspended=true;expect(projectCharacterState(m.snapshot(),n).visible).toBe(false);
  });
});
