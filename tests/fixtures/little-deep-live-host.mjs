// Real-model test observer. No scripted LLM adapter and no synthetic session events.
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export const inject=['appReady','appExit','agents','sessionController','webServer','tools','approval','userQuestions'];
export async function apply(ctx) {
  const {defineTool}=await import(pathToFileURL(join(process.env.COOPANION_TEST_MODULES,'@deepseek-ai/dsh-tools/lib/index.js')).href);
  const sessionId='little-deep-real-model-isolated',answers=new Map(),decisions=new Map();let serial=0,owned;
  const stats={events:0,toolCalls:0,toolResults:0,questions:0,approvalAsked:0,approvalDecided:0,streamFrames:0,providers:[],turnEnd:null};
  const notify=value=>process.send?.(value);
  const output={schema:{type:'object',additionalProperties:false,properties:{ok:{type:'boolean',required:true}}},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]};
  ctx.effect(()=>ctx.tools.register(defineTool({name:'companion_probe_read',description:'Read the isolated local probe file once; a harmless real tool operation for the character test.',parameters:{index:{type:'integer',required:true,description:'Sequential test index'}},output,
    async execute(){const data=await readFile(join(process.env.COOPANION_PROBE_CWD,'probe.txt'),'utf8');return {ok:data.startsWith('Little Deep isolated probe')};}})));
  ctx.effect(()=>ctx.tools.register(defineTool({name:'companion_probe_approval',description:'Ask for approval before reading the isolated probe file. Always obey the actual approval result; rejection returns ok=false without reading.',parameters:{},output,
    async execute(_args,exec){const outcome=await ctx.approval.request({agent:exec.agent,toolName:'companion_probe_approval',callId:exec.callId,signal:exec.signal});if(outcome!=='allowed-once')return {ok:false};await readFile(join(process.env.COOPANION_PROBE_CWD,'probe.txt'));return {ok:true};}})));
  ctx.on('user-questions/request',(request,next)=>{
    if(request.agent?.session.id!==sessionId)return next();const id='question-'+(++serial);stats.questions++;
    notify({type:'probe-question',id,requestId:request.wait?.callId,sequence:stats.questions});return new Promise(resolve=>answers.set(id,()=>resolve({answers:request.questions.map(q=>({id:q.id,selected:[],custom:stats.questions===1?'继续密集工具校验':'结束测试'}))})));
  },{prepend:true});
  ctx.on('approval/request',(request,next)=>{
    if(request.toolName!=='companion_probe_approval')return next();const id='approval-'+(++serial);notify({type:'probe-approval',id});return new Promise(resolve=>decisions.set(id,resolve));
  },{prepend:true});
  ctx.on('agent/assistant-stream',({agent})=>{if(agent.session.id===sessionId)stats.streamFrames++;});
  ctx.on('session/event',(session,event)=>{
    if(session.id!==sessionId)return;stats.events++;
    if(event.type==='tool/call'||event.type==='tool/ptc-dispatch')stats.toolCalls++;
    if(event.type==='tool/result')stats.toolResults++;
    if(event.type==='approval/asked')stats.approvalAsked++;
    if(event.type==='approval/decided')stats.approvalDecided++;
    if(event.type==='assistant/message'){const source=event.data.message.source;if(source?.provider)stats.providers=[...new Set([...stats.providers,source.provider+'/'+source.model])];}
    if(event.type==='turn/end'){stats.turnEnd=event.data.reason.kind;notify({type:'probe-ended',stats});}
  });
  const handle=async message=>{
    try{
      if(message?.type==='probe-prepare'){
        const previousId='little-deep-previous-chat';
        await ctx.sessionController.create({sessionId:previousId,cwd:process.env.COOPANION_PROBE_CWD});
        owned=await ctx.agents.create({sessionId,meta:{cwd:process.env.COOPANION_PROBE_CWD},agentOptions:{provider:'opencode-go',model:'deepseek-v4.1-flash'}});
        await ctx.sessionController.selectModel({sessionId,provider:'opencode-go',model:'deepseek-v4.1-flash'});
        const askUser=await import(pathToFileURL(join(process.env.COOPANION_TEST_MODULES,'@deepseek-ai/dsh-tool-ask-user/lib/index.js')).href);
        await owned.agent.ctx.plugin(askUser,{mode:'timed',timeout:-1}).await();
        owned.agent.ctx.tools.presentAs('native');ctx.approval.setPolicy(owned.agent,'ask');notify({type:'probe-prepared',sessionId,previousId});
      }else if(message?.type==='probe-run'){
        const text='这是已授权的隔离角色测试。只使用 companion_probe_read、companion_probe_approval 和 ask_user_question 三种工具；不创建目标或待办，不使用其他工具，不访问网络或其他文件。严格依次完成：1. 独立调用 companion_probe_read 8 次，index 从1到8，不要提前提问，其间不输出过程文字；2. 简短公开说明进度，再调用 ask_user_question 问是否继续，必须等待答复；3. 收到继续后再独立调用 companion_probe_read 6 次，index 从9到14；4. 调用 companion_probe_approval 一次，等待真实决定，被拒绝就尊重拒绝并继续；5. 再调用 companion_probe_read 4次，index从15到18；6. 调用 ask_user_question 问是否结束，必须等待答复；7. 收到结束后用一句话结束本轮。每次问题仅问一个，并使用稳定的不同问题id。';
        const receipt=await ctx.sessionController.prompt({sessionId,requestId:'little-deep-real-prompt-1',mode:'queue',content:[{type:'text',text}],clientTimeZone:'Asia/Shanghai'},new AbortController().signal);
        notify({type:'probe-started',accepted:receipt.accepted});
      }else if(message?.type==='probe-answer'){answers.get(message.id)?.();answers.delete(message.id);}
      else if(message?.type==='probe-reject'){decisions.get(message.id)?.('rejected');decisions.delete(message.id);}
      else if(message?.type==='probe-stats')notify({type:'probe-stats',stats});
      else if(message?.type==='shutdown-host'){await owned?.dispose();ctx.appExit(0);}
    }catch(error){notify({type:'probe-error',code:error.code??error.name??'UNKNOWN',phase:message?.type});}
  };
  process.on('message',handle);ctx.effect(()=>()=>process.off('message',handle));
  ctx.effect(()=>ctx.appReady.onReady(()=>notify({type:'probe-ready'})));
}
