// Exercise the actual API 2 body and Canvas renderer with the Host's pointer contract.
import assert from 'node:assert/strict';
import {after,before,test} from 'node:test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {once} from 'node:events';
import {chromium} from 'playwright-core';
let server,browser,page;
before(async()=>{
  const root=resolve('.');
  server=createServer(async(req,res)=>{
    const path=new URL(req.url,'http://localhost').pathname;
    if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<div id="root"></div>');return;}
    if(!['/examples/little-deep/','/docs/design/art-workflow/','/web/character-state.js'].some(p=>path.startsWith(p))){res.writeHead(404);res.end();return;}
    try{res.setHeader('Content-Type',extname(path)==='.js'?'text/javascript':'application/octet-stream');res.end(await readFile(resolve(root,'.'+path)));}catch{res.writeHead(404);res.end();}
  }).listen(0,'127.0.0.1');await once(server,'listening');
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??chromium.executablePath(),headless:true});page=await browser.newPage({viewport:{width:1000,height:800}});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(async()=>{
    const {createLittleDeepBody}=await import('/examples/little-deep/figure.js');
    window.create=async({active=false,facing=1}={})=>{
      window.body?.dispose();window.events=[];
      const host={root:document.querySelector('#root'),bounds:()=>({W:1000,H:800,floorY:760,S:180/256}),start:{x:500,facing},emit:(kind,detail)=>events.push({kind,...detail})};
      window.body=await createLittleDeepBody('',{host});
      body.set({companionState:{protocol:1,sessionId:'test',work:active?{id:'work',stage:'focus',active:true,tools:0,seq:1,atMs:1,outcome:null}:null,pending:[],visible:true,calm:false,generation:1}});
      window.step=t=>{for(let i=0;i<Math.round(t*120);i++)body.step(1/120);};step(3);
      window.center=()=>{const b=body.layout().box;return{x:b.x+b.w/2,y:b.y+b.h/2};};
      window.state=()=>({...document.querySelector('canvas').dataset,layout:body.layout(),events:[...events]});
    };
  });
});
after(async()=>{await browser?.close();await new Promise(r=>server?.close(r));});
test('real hover strokes produce a visible body response even while concentrated',async()=>{
  const result=await page.evaluate(async()=>{
    await create({active:true});const p=center();
    for(let i=0;i<18;i++){body.pointer('move',{x:p.x+(i%2?12:-12),y:p.y,t:i*40});step(.04);}
    return state();
  });
  assert(result.events.some(e=>e.kind==='pet'),'stroke must emit pet feedback');
  assert.equal(result.shape,'rest','work touch must reveal a readable response');
});
test('a click during deep work reveals a response and returns to the same work identity',async()=>{
  const result=await page.evaluate(async()=>{
    await create({active:true});const p=center();body.pointer('down',{...p,t:0});body.pointer('up',{...p,t:80});step(.25);const touched=state();step(3);return{touched,resumed:state()};
  });
  assert.equal(result.touched.shape,'rest');assert.equal(result.resumed.shape,'tail');assert.equal(result.resumed.workEntries,'1');
});
test('drag release above the ground falls continuously instead of teleporting to the floor',async()=>{
  const result=await page.evaluate(async()=>{
    await create();const p=center();body.pointer('down',{...p,t:0});body.pointer('move',{x:p.x,y:p.y-200,t:300});step(.1);
    const held=body.layout().box.y;body.drop({x:p.x,y:p.y-200,t:600});const released=state();step(.15);const falling=state();step(3);return{held,released,falling,landed:state()};
  });
  assert(Math.abs(result.released.layout.box.y-result.held)<10,'release must preserve the carried position');
  assert.equal(result.released.layout.moving,true);assert(result.falling.layout.box.y>result.held);assert.equal(result.landed.layout.moving,false);
});
test('initial drawing direction matches the study regardless of the previously selected character',async()=>{
  const values=await page.evaluate(async()=>{await create({facing:1});const a=state().layout.facing;await create({facing:-1});return[a,state().layout.facing];});
  assert.deepEqual(values,[-1,-1]);
});
test('a fast release throws, stays bounded, lands and resumes current work',async()=>{
  const r=await page.evaluate(async()=>{
    await create({active:true});const p=center();body.pointer('down',{...p,t:0});body.pointer('move',{x:p.x+100,y:p.y-150,t:90});body.pointer('up',{x:p.x+110,y:p.y-160,t:100});
    const released=state();step(.1);const flying=state();step(3);return{released,flying,landed:state()};
  });
  assert(r.released.events.some(e=>e.kind==='throw'));assert.equal(r.flying.layout.mode,'air');
  assert(r.flying.layout.x>r.released.layout.x);assert.equal(r.landed.layout.moving,false);
  assert(r.landed.layout.x>=108&&r.landed.layout.x<=892);assert.equal(r.landed.workEntries,'1');assert.equal(r.landed.shape,'tail');
});
test('dense tools and reconsideration share one silhouette until a real reporting boundary',async()=>{
  const r=await page.evaluate(async()=>{
    await create({active:true});const sync=stage=>body.set({companionState:{protocol:1,sessionId:'test',work:{id:'work',stage,active:true,tools:stage==='tools'?1:0,seq:2,atMs:1,outcome:null},pending:[],visible:true,calm:false,generation:1}});
    for(let i=0;i<24;i++){sync(i%2?'focus':'tools');step(.08);}const executing=state();step(8);const review=state();sync('report');step(2);sync('focus');step(3);return{executing,review,focus:state()};
  });
  assert.equal(r.executing.shape,'rest');assert.equal(r.review.phase,'review');assert.equal(r.review.shape,'rest');assert.equal(r.focus.shape,'tail');assert.equal(r.focus.workEntries,'1');
});
test('a horizontal throw from floor height still produces a visible arc',async()=>{
  const r=await page.evaluate(async()=>{
    await create();const p=center();body.pointer('down',{...p,t:0});body.pointer('move',{x:p.x+90,y:p.y,t:80});body.pointer('up',{x:p.x+100,y:p.y,t:90});const released=state();step(.1);return{released,flying:state()};
  });
  assert.equal(r.flying.layout.mode,'air');assert(r.flying.layout.x>r.released.layout.x+25);
});
test('catching and releasing an airborne body resumes gravity instead of leaving it suspended',async()=>{
  const r=await page.evaluate(async()=>{
    await create();const p=center();body.pointer('down',{...p,t:0});body.pointer('move',{x:p.x+90,y:p.y-150,t:80});body.pointer('up',{x:p.x+100,y:p.y-160,t:90});step(.1);
    const q=center();body.pointer('down',{...q,t:190});body.pointer('up',{...q,t:230});const released=state();step(3);return{released,landed:state()};
  });
  assert.equal(r.released.layout.mode,'air');assert.equal(r.landed.layout.mode,'idle');assert(r.landed.layout.box.y>r.released.layout.box.y+50);
});
