import {once} from 'node:events';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {chromium} from 'playwright-core';
import {previewServer} from '../scripts/preview.mjs';
import {exerciseLittleDeep} from './helpers/little-deep-api2.mjs';
const root=await mkdtemp(join(tmpdir(),'little-deep-api2-ui-'));
const artifacts=resolve(process.env.DSH_TEST_ARTIFACTS??'artifacts/little-deep-api2-ui');await mkdir(artifacts,{recursive:true});
const server=previewServer({dataDir:root});server.listen(0,'127.0.0.1');await once(server,'listening');let browser;
try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??chromium.executablePath(),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1200,height:900},locale:'zh-CN'});page.setDefaultTimeout(12000);
  await page.addInitScript(()=>{window.dshPetBridge={subscribe(fn){window.api2Receive=fn;},action(){},hit(){}};});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const send=message=>page.evaluate(message=>window.api2Receive(message),message);
  const report=await exerciseLittleDeep({page,send,zip:resolve(process.env.DSH_CHARACTER_ZIP),artifacts});
  report.browser=await browser.version();await writeFile(join(artifacts,'validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){
  const pages=browser?.contexts().flatMap(c=>c.pages())??[];
  for(const [i,page] of pages.entries()){await page.screenshot({path:join(artifacts,'failure-'+i+'.png')}).catch(()=>{});
    const frames=[];for(const frame of page.frames())frames.push(await frame.evaluate(()=>({status:document.querySelector('#character-status')?.textContent,canvas:[...document.querySelectorAll('canvas')].map(c=>({...c.dataset,width:c.width,height:c.height}))})).catch(()=>({unavailable:true})));
    await writeFile(join(artifacts,'failure-'+i+'.json'),JSON.stringify({message:error.message,frames},null,2)+'\n');}
  throw error;
}finally{await browser?.close();await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});}
