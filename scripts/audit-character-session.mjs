// Read one explicitly selected v4 session. Export only animation facts and aggregate counts.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PetModel} from '../src/model.ts';
const [source,expectedId,output]=process.argv.slice(2);
if(!source||!expectedId||!output)throw new Error('Expected source, exact session id and fresh output path');
const bytes=readFileSync(source),text=execFileSync('/opt/homebrew/bin/zstd',['-q','-d','-c',source],{encoding:'utf8',maxBuffer:64*1024*1024});
let records;try{records=text.trim().split('\n').map(line=>JSON.parse(line));}catch{throw new Error('Invalid private session JSON');}
const [header,...events]=records;
if(header.version!==4||header.id!==expectedId||events.some((e,i)=>e.seq!==i))throw new Error('Unexpected session identity or non-contiguous log');
const model=new PetModel(),session={id:header.id,header},counts={},tools={},turns=[],publicWindows=[],facts=[];
let turn;
for(const e of events){
  const d=e.data;counts[e.type]=(counts[e.type]??0)+1;
  if(e.type==='turn/start'){turn={turn:d.turn,from:e.time,to:null,tools:0,publicMessages:0};turns.push(turn);}
  if(e.type==='turn/end'&&turn){turn.to=e.time;turn.reason=d.reason.kind;}
  if(e.type==='tool/call'){tools[d.name]=(tools[d.name]??0)+1;if(turn)turn.tools++;}
  if(e.type==='assistant/message'&&d.message.content.some(b=>b.type==='text'&&b.text?.trim())){
    if(turn)turn.publicMessages++;
    const frames=(d.stream??[]).filter(f=>f.type==='text-chunks');
    publicWindows.push({seq:e.seq,from:frames[0]?.time0??e.time,to:frames.length?Math.max(...frames.map(f=>f.time0+(f.dt??[]).reduce((a,b)=>a+b,0))):e.time});
  }
  model.consume(session,e);const s=model.snapshot();
  if(s.activity)facts.push({seq:e.seq,at:e.time,active:s.active,work:s.activity});
}
if(createHash('sha256').update(readFileSync(source)).digest('hex')!==createHash('sha256').update(bytes).digest('hex'))throw new Error('Source changed; retry a stable prefix');
const report={schema:1,sessionId:expectedId,sourceSha256:createHash('sha256').update(bytes).digest('hex'),counts,tools,turns,publicWindows,facts,limits:['Durable metadata replay, not a new live model run','No message text, reasoning, paths or tool arguments exported']};
writeFileSync(output,JSON.stringify(report)+'\n',{flag:'wx'});
console.log(JSON.stringify({sessionId:expectedId,events:events.length,turns:turns.map(t=>({...t,seconds:t.to?(t.to-t.from)/1000:null})),publicWindows:publicWindows.length,tools}));
