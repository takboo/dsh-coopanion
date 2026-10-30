// Optional API 2 state extension. The trusted page projects metadata; packs never receive content.
export const CHARACTER_STATE_PROTOCOL = 1;
const categories=new Set(['reply','goal-progress','completed','approval','question','error','stopped','interrupted','blocked','max-tokens']);
const id=value=>typeof value==='string'&&value.length>0&&value.length<=8192;
const integer=value=>Number.isSafeInteger(value)&&value>=0;
export function supportsCharacterState(pack){return pack?.extensions?.['dsh-coopanion']?.state===CHARACTER_STATE_PROTOCOL;}

/** Validate and copy the public extension, dropping every unlisted field. */
export function readCharacterState(value) {
  if(value?.protocol!==1||!(value.sessionId===null||id(value.sessionId))||
    typeof value.visible!=='boolean'||typeof value.calm!=='boolean'||!integer(value.generation)||!Array.isArray(value.pending)||value.pending.length>4096)return null;
  let work=null;
  if(value.work!==null) {
    const w=value.work;
    if(!w||!id(w.id)||!['focus','tools','report'].includes(w.stage)||typeof w.active!=='boolean'||!integer(w.tools)||
      !Number.isSafeInteger(w.seq)||w.seq< -1||!Number.isFinite(w.atMs)||w.atMs<0)return null;
    let outcome=null;
    if(w.outcome!==null) {
      if(!w.outcome||!categories.has(w.outcome.category))return null;
      outcome={category:w.outcome.category};
      if(w.outcome.goal!==undefined){const g=w.outcome.goal;if(!id(g?.id)||!integer(g.revision)||!g.revision||!integer(g.round))return null;outcome.goal={id:g.id,revision:g.revision,round:g.round};}
    }
    work={id:w.id,stage:w.stage,active:w.active,tools:w.tools,seq:w.seq,atMs:w.atMs,outcome};
  }
  const pending=[],seen=new Set();
  for(const p of value.pending) {
    if(!id(p?.id)||p.sessionId!==value.sessionId||!['question','approval'].includes(p.kind)||!['open','continued'].includes(p.state)||seen.has(p.id))return null;
    seen.add(p.id);pending.push({id:p.id,sessionId:p.sessionId,kind:p.kind,state:p.state});
  }
  if(value.sessionId===null&&(work||pending.length))return null;
  return {protocol:1,sessionId:value.sessionId,work,pending,visible:value.visible,calm:value.calm,generation:value.generation};
}

/** Choose a presentation source without changing the Host-owned chat target. */
export function projectCharacterState(snapshot,notifications,{visible=true,calm=false,previousSessionId=null}={}) {
  const sessions=snapshot?.sessions??[],focused=sessions.find(s=>s.id===snapshot?.sessionId);
  const previous=sessions.find(s=>s.id===previousSessionId);
  const interactions=(notifications?.interactions??[]).filter(p=>p.state!=='settled');
  const requested=new Set(interactions.map(p=>p.sessionId));
  const pending=s=>s&&requested.has(s.id),active=s=>s?.active===true;
  // Explicitly focused work/requests win. Otherwise keep one live presentation
  // source stable, while letting a pending request take attention from background work.
  const source=(pending(focused)||active(focused)?focused:null)??
    (pending(previous)?previous:null)??sessions.find(pending)??
    (active(previous)?previous:null)??sessions.find(active)??focused;
  const sessionId=source?.id??(typeof snapshot?.sessionId==='string'?snapshot.sessionId:null);
  const activity=source?source.activity:snapshot?.activity;
  const runtime=notifications?.runtime;
  const requests=interactions.filter(p=>p.sessionId===sessionId).map(({id,sessionId,kind,state})=>({id,sessionId,kind,state}));
  return readCharacterState({protocol:1,sessionId,
    work:activity?{...activity,active:source?.active??snapshot.active??false,outcome:activity.outcome??null}:null,pending:requests,
    visible:Boolean(visible&&(!runtime||(runtime.phase==='running'&&runtime.visible&&!runtime.suspended))),calm:Boolean(calm),generation:runtime?.generation??0});
}
