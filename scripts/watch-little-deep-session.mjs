// SPDX-License-Identifier: AGPL-3.0-or-later
// Read-only, single-session log observation. No answers, approvals, tools or Host writes.
import {readFileSync,statSync,appendFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,extname,sep,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {PetModel} from '../src/model.ts';
import {NotificationBroker} from '../src/notification-broker.ts';
import {CompletionTracker} from '../src/completion.ts';
import {userQuestionProjectionDefinition as questions} from '../node_modules/@deepseek-ai/dsh-user-questions/lib/types/projection.js';

export function parseGrowingLog(text,expectedId) {
  const records=[];
  for(const line of text.split('\n').slice(0,-1)) {
    if(!line)continue;
    try{records.push(JSON.parse(line));}catch{throw new Error('Invalid complete session record');}
  }
  const header=records.shift();
  if(header?.type!=='session'||header.id!==expectedId||header.version!==4)throw new Error('Unexpected source session or format');
  if(records.some((e,i)=>e.seq!==i||!Number.isFinite(e.time)))throw new Error('Non-contiguous session events');
  return {header,events:records};
}

export function projectLiveEvents(header,events) {
  let now=header.createdAt,step=0,errors=0;
  const start=events.find(e=>e.type==='turn/start')?.time??header.createdAt;
  const session={id:header.id,header,snapshotEvents:()=>events},model=new PetModel(()=>now),tracker=new CompletionTracker();
  const broker=new NotificationBroker({clock:{now:()=>now,setTimeout(){return null;},clearTimeout(){}}});
  broker.preferences({notifications:false,reminders:false});model.observe(session);
  let fold=questions.init(header,0);const tools=new Map(),blocking=new Map(),facts=[];
  for(const event of events) {
    now=event.time;const d=event.data;
    if(Number.isInteger(d.step))step=d.step;
    model.consume(session,event);broker.consume(session,event);fold=questions.apply(fold,event);
    if(event.type==='tool/call') {
      tools.set(d.callId,d.name);
      // Legacy blocking questions have no public timed projection. Observe their exact
      // outstanding tool span, explicitly labelled; this is not a runtime request hook.
      if(d.name==='ask_user_question'&&!fold.timed) {
        let args=d.arguments;if(typeof args==='string'){try{args=JSON.parse(args);}catch{args=null;}}
        if(Array.isArray(args?.questions)&&args.questions.length)blocking.set(d.callId,broker.question(session,
          {nativeId:d.callId,turn:d.turn,seq:event.seq,preview:'',source:'event'}));
      }
    }
    if(event.type==='tool/result') {
      const id=d.message.toolCallId;tools.delete(id);blocking.get(id)?.();blocking.delete(id);
      if(d.message.isError)errors++;
    }
    if(event.type==='turn/end'){tools.clear();for(const finish of blocking.values())finish();blocking.clear();}
    broker.questions(session,questions.wire.view(fold),false);
    const pending=broker.snapshot().interactions.map(({id,sessionId,kind,state,nativeId})=>
      ({id,sessionId,kind,state,observation:kind==='question'&&blocking.has(nativeId)?'blocking-tool-span':'public-projection-or-event'}));
    model.interactions(pending);const snapshot=model.snapshot(),completion=tracker.consume(event);
    facts.push({seq:event.seq,atMs:Math.max(0,event.time-start),type:event.type,step,mood:snapshot.mood,active:snapshot.active,
      tools:tools.size,errors,pending,...(completion?{completion:{category:completion.category,goal:completion.goal??null}}:{})});
  }
  broker.dispose();
  return {sessionId:header.id,startTime:start,facts,limits:['Growing durable log only; live reasoning/text deltas and Agent liveness are not observed',
    'Legacy questions are exact outstanding tool-span observations; runtime ownership needs Host integration']};
}

export function watchSession({source,sessionId,output,port=4188,zstd='/opt/homebrew/bin/zstd'}) {
  if(!existsSync(source))throw new Error('Source session not found');
  mkdirSync(output,{recursive:true});const trace=join(output,'observations.ndjson');
  if(existsSync(trace))throw new Error('Choose a fresh observation directory');
  const root=resolve(fileURLToPath(new URL('../docs/design/art-workflow/',import.meta.url)));
  let state={sessionId,facts:[],status:'connecting'},size=-1,lastSeq=-1,initial=true;
  function poll() {
    try {
      const currentSize=statSync(source).size;
      if(currentSize===size){state.observedAt=Date.now();return;}
      const decoded=spawnSync(zstd,['-q','-d','-c',source],{encoding:'utf8',maxBuffer:64*1024*1024});
      if(decoded.error||decoded.status!==0){state.status='waiting-for-complete-frame';return;}
      const parsed=parseGrowingLog(decoded.stdout,sessionId),next=projectLiveEvents(parsed.header,parsed.events);
      if(next.facts.at(-1)?.seq<lastSeq)throw new Error('Source prefix moved backwards');
      const observedAt=Date.now();
      for(const fact of next.facts.filter(f=>f.seq>lastSeq))appendFileSync(trace,JSON.stringify({observedAt,historicalOnAttach:initial,fact})+'\n');
      lastSeq=next.facts.at(-1)?.seq??-1;state={...next,status:'observing',observedAt};size=currentSize;initial=false;
    } catch {state.status='source-unavailable';}
  }
  poll();const timer=setInterval(poll,500);
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
  const server=createServer((req,res)=>{
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/'){res.writeHead(302,{Location:'/whale-little-deep-v3/live-study.html'});res.end();return;}
    if(url.pathname==='/live.json') {
      const after=Number(url.searchParams.get('after')??-1);
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(JSON.stringify({...state,facts:state.facts.filter(f=>f.seq>after),current:state.facts.at(-1)??null,
        sourceNowMs:Math.max(0,Date.now()-(state.startTime??Date.now()))}));return;
    }
    try {
      const name=decodeURIComponent(url.pathname),file=resolve(root,'.'+name);
      if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
      const bytes=readFileSync(file);res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});
      res.end(req.method==='HEAD'?undefined:bytes);
    } catch {res.writeHead(404);res.end();}
  });
  server.listen(port,'127.0.0.1',()=>process.stdout.write(JSON.stringify({url:`http://127.0.0.1:${port}/`,sessionId,output})+'\n'));
  return {close(){clearInterval(timer);server.close();},snapshot:()=>state};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2),arg=name=>args[args.indexOf(name)+1];
  if(!args.includes('--source')||!args.includes('--session')||!args.includes('--output'))throw new Error('Expected --source, --session and fresh --output');
  const observer=watchSession({source:arg('--source'),sessionId:arg('--session'),output:resolve(arg('--output')),port:args.includes('--port')?Number(arg('--port')):4188});
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{observer.close();process.exit(0);});
}
