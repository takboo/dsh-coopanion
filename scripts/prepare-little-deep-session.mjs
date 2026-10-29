// SPDX-License-Identifier: AGPL-3.0-or-later
// Run with Node's --experimental-transform-types. Reads one log; emits metadata only.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PetModel} from '../src/model.ts';
import {NotificationBroker} from '../src/notification-broker.ts';
import {CompletionTracker} from '../src/completion.ts';

const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const source=arg('--source'),output=arg('--output'),zstd=arg('--zstd')??'zstd';
if(!source||!output)throw new Error('Expected --source <one session log> --output <structure.json> [--zstd <binary>]');
if(resolve(source)===resolve(output))throw new Error('Output cannot replace the source session');
const sha=b=>createHash('sha256').update(b).digest('hex'),sourceBytes=readFileSync(source),sourceSha256=sha(sourceBytes);
const text=source.endsWith('.zstd')?execFileSync(zstd,['-q','-d','-c',source],{encoding:'utf8',maxBuffer:64*1024*1024}):sourceBytes.toString('utf8');
const records=text.trim().split('\n').map((line,index)=>{
  try{return JSON.parse(line);}catch{throw new Error(`Invalid session JSON at line ${index+1}`);}
}),header=records[0],events=records.slice(1);
if(header.type!=='session'||!events.length||!events.every((e,i)=>e.seq===i&&Number.isFinite(e.time)))throw new Error('Expected one complete, contiguous session log');
const start=events.find(e=>e.type==='turn/start'),end=events.findLast(e=>e.type==='turn/end');
if(!start||!end)throw new Error('Expected a bounded turn for this structural replay');
let now=start.time,step=0,errors=0,publicMessages=0,moodChanges=0,lastMood='idle';
const session={id:header.id,header},model=new PetModel(()=>now),tracker=new CompletionTracker();
const broker=new NotificationBroker({clock:{now:()=>now,setTimeout(){return null;},clearTimeout(){}}});
broker.preferences({notifications:false,reminders:false});model.observe(session);
const tools=new Set(),counts={},facts=[],decisions=[],publicTextWindows=[];
for(const event of events) {
  now=event.time;const d=event.data;counts[event.type]=(counts[event.type]??0)+1;
  if(Number.isInteger(d.step))step=d.step;
  if(event.type==='tool/call')tools.add(d.callId);
  if(event.type==='tool/result'){tools.delete(d.message.toolCallId);if(d.message.isError)errors++;}
  if(event.type==='assistant/message') {
    if(d.message.content.some(b=>b.type==='text'&&b.text?.trim()))publicMessages++;
    let first=null,last=null;
    for(const s of d.stream??[]) {
      if(s.type!=='text-chunks'&&!(s.type==='chunk'&&s.chunk?.type==='text-delta'))continue;
      const from=s.time0??s.time,to=from+(s.dt??[]).reduce((a,b)=>a+b,0);
      first=first===null?from:Math.min(first,from);last=last===null?to:Math.max(last,to);
    }
    if(first!==null)publicTextWindows.push({seq:event.seq,step:d.step,fromMs:Math.max(0,first-start.time),toMs:Math.max(0,last-start.time)});
  }
  model.consume(session,event);broker.consume(session,event);
  const pending=broker.snapshot().interactions.map(({id,sessionId,kind,state})=>({id,sessionId,kind,state}));
  model.interactions(pending);
  const snapshot=model.snapshot(),decision=tracker.consume(event);
  if(snapshot.mood!==lastMood){moodChanges++;lastMood=snapshot.mood;}
  if(decision)decisions.push({seq:event.seq,category:decision.category,goal:decision.goal??null});
  facts.push({seq:event.seq,atMs:Math.max(0,event.time-start.time),type:event.type,step,mood:snapshot.mood,
    active:snapshot.active,tools:tools.size,errors,publicMessages,pending,
    ...(event.type==='tool/result'&&d.message.isError?{localError:true}:{}),
    ...(decision?{completion:{category:decision.category,goal:decision.goal??null}}:{})});
}
if(sourceSha256!==sha(readFileSync(source)))throw new Error('Source changed during projection');
const inputs=['src/model.ts','src/completion.ts','src/notification-broker.ts','src/notification-contract.ts'];
const structure={schema:1,sessionId:header.id,source:{sha256:sourceSha256,formatVersion:header.version,recordCount:records.length,
  firstSeq:events[0].seq,lastSeq:events.at(-1).seq,turnStartSeq:start.seq,turnEndSeq:end.seq,durationMs:end.time-start.time},
  projection:{goalPackage:JSON.parse(readFileSync(new URL('../node_modules/@deepseek-ai/dsh-goal/package.json',import.meta.url),'utf8')).version,
    inputSha256:Object.fromEntries(inputs.map(p=>[p,sha(readFileSync(new URL('../'+p,import.meta.url)))])),moodChanges,decisions},
  counts,publicTextWindows,facts};
const serialized=JSON.stringify(structure)+'\n';mkdirSync(dirname(output),{recursive:true});
if(existsSync(output)) {
  if(readFileSync(output,'utf8')===serialized){console.log('Structure already matches '+sourceSha256);process.exit(0);}
  throw new Error('Output already exists with different bytes; choose a fresh path');
}
writeFileSync(output,serialized,{flag:'wx'});
console.log(JSON.stringify({output,sourceSha256,events:facts.length,moodChanges,decisions}));
