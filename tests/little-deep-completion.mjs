import assert from 'node:assert/strict';
import test from 'node:test';
globalThis.HTMLElement??=class {};
const {createCompletionPerformance}=await import('../docs/design/art-workflow/whale-little-deep-v3/completion-performance.js');
const {createCompletionFilm,COMPLETION_ROUTES}=await import('../docs/design/art-workflow/whale-little-deep-v3/completion-film.js');
const outcome={category:'completed',goal:{id:'full-goal/id',revision:2,round:1}};
const create=()=>createCompletionPerformance({sessionId:'s'});
const result=(out=outcome)=>({active:false,outcome:out});
const pending=kind=>({id:'full-'+kind,sessionId:'s',kind,state:'open'});
const pose=a=>[a.rootX.value,a.rootX.velocity,a.lean.value,a.lean.velocity,a.scale.value,a.hover.value,...a.base.flatMap(p=>[p.x,p.y])];
test('ordinary replies and intermediate goal rounds close quietly; complete requires actual classification and full identity',()=>{
  for(const category of ['reply','goal-progress','blocked','stopped']){const p=create();p.advance(3);p.sync(result({category}));p.advance(4);assert.equal(p.view.spouts,0);assert(!p.actor.particles.some(x=>x.kind==='drop'));}
  assert.throws(()=>create().sync(result({category:'completed'})));
  assert.throws(()=>create().sync(result({category:'completed',goal:{id:'',revision:1}})));
});
test('same goal version plays once; even round changes do not replay, while a new revision can',()=>{
  const p=create(),actor=p.actor;p.sync(result());p.advance(.9);assert.equal(p.view.spouts,1);assert.equal(p.actor.particles.filter(x=>x.kind==='drop').length,8);
  p.sync(result(structuredClone(outcome)));p.advance(4);p.sync(result({...outcome,goal:{...outcome.goal,round:2}}));p.advance(4);assert.equal(p.view.spouts,1);assert.equal(p.view.mode,'life');assert.equal(p.actor,actor);
  p.sync(result({...outcome,goal:{...outcome.goal,revision:3}}));p.advance(.9);assert.equal(p.view.spouts,2);
});
test('new work cancels completion before the unplayed burst and preserves springs and one Actor',()=>{
  const p=create();p.sync(result());p.advance(.5);const before=pose(p.actor),actor=p.actor;
  p.sync({active:true,workId:'new-work',stage:'tools'});assert.deepEqual(pose(p.actor),before);p.advance(2);assert.equal(p.view.spouts,0);assert.equal(p.actor,actor);assert.equal(p.view.mode,'work');assert.equal(p.view.work.id,'new-work');
  p.sync(result());p.advance(4);assert.equal(p.view.spouts,0);
});
for(const kind of ['question','approval'])test(kind+' interrupts before or after the burst, then exits to current life/work without replay',()=>{
  for(const at of [.2,1.0,2.8])for(const active of [false,true]){
    const p=create();p.sync(result());p.advance(at);const before=pose(p.actor),spouts=p.view.spouts;
    p.sync({pending:[pending(kind)]});assert.deepEqual(pose(p.actor),before);p.advance(2);assert.equal(p.view.symbol.kind,kind);assert.equal(p.view.symbol.progress,1);
    if(active)p.sync({active:true,workId:'next-work',stage:'tools'});
    p.sync({pending:[]});p.advance(2);assert.equal(p.view.spouts,spouts);assert.equal(p.view.symbols.length,0);assert.equal(p.view.mode,active?'work':'life');
  }
});
test('pending set owns the body until all exact identities settle, including a late completed fact',()=>{
  const p=create();p.sync({pending:[pending('question'),pending('approval')],active:false,outcome});p.advance(2);
  p.sync({pending:[pending('approval')]});p.advance(.3);assert.equal(p.view.symbol.kind,'approval');assert.equal(p.view.spouts,0);
  p.sync({pending:[],outcome});p.advance(5);assert.equal(p.view.spouts,0);assert.equal(p.view.mode,'life');
});
test('hide freezes the finish and burst clock; palette changes preserve pose; calm emits only two drops',()=>{
  const p=create();p.setCalm(true);p.sync(result());p.advance(.5);const before=pose(p.actor),clock=p.view.finish.elapsed;
  p.setVisible(false);p.advance(100);assert.deepEqual(pose(p.actor),before);assert.equal(p.view.finish.elapsed,clock);
  p.setPalette('night');assert.deepEqual(pose(p.actor),before);p.setVisible(true);p.advance(.3);assert.equal(p.view.spouts,1);assert.equal(p.actor.particles.filter(x=>x.kind==='drop').length,2);
});
test('a request also cancels an unplayed life bubble; exit starts a fresh quiet plan',()=>{
  const p=create();p.sync(result({category:'reply'}));p.advance(13.6);assert(p.view.life.clock>12.5);assert(!p.actor.particles.some(x=>x.kind==='bubble'));
  p.sync({pending:[pending('question')]});p.advance(2);p.sync({pending:[]});p.advance(.3);
  assert(p.view.life.clock<.31);assert(!p.actor.particles.some(x=>x.kind==='bubble'));assert.equal(p.view.spouts,0);
});
test('the same score drives paired keyframes and continuous playback; all interruption routes keep actors and consume old celebration',()=>{
  for(const route of COMPLETION_ROUTES){const film=createCompletionFilm({route}),actors=[film.reply.actor,film.goal.actor];
    for(const t of [3,4.7,5.18,5.85,7.1,9.2,12,16]){
      film.advance(t-film.time);const sample=createCompletionFilm({route});sample.seek(t);
      for(const lane of ['reply','goal']){assert.deepEqual(pose(film[lane].actor),pose(sample[lane].actor));assert.equal(film[lane].view.spouts,sample[lane].view.spouts);}
    }
    assert.equal(film.reply.actor,actors[0]);assert.equal(film.goal.actor,actors[1]);assert.equal(film.reply.view.spouts,0);assert.equal(film.goal.view.spouts,1);
    assert.equal(film.goal.view.mode,route.includes('work')?'work':'life');
  }
});
test('manual ownership cancels future mock cues; hidden film never advances source score',()=>{
  const f=createCompletionFilm({route:'approval'});f.seek(5.2);f.setVisible(false);f.advance(60);assert.equal(f.time,5.2);f.setVisible(true);
  const id=f.inject('question');f.advance(8);assert.equal(f.goal.view.requestId,id);assert.equal(f.goal.view.spouts,0);assert.throws(()=>f.settle('not-this-id'));f.startWork();f.settle(id);f.advance(2);assert.equal(f.goal.view.mode,'work');assert.equal(f.goal.view.spouts,0);
});
