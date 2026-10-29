import {createRequire} from 'node:module';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {_electron} from 'playwright-core';
import {exerciseLittleDeep} from './helpers/little-deep-api2.mjs';
const require=createRequire(import.meta.url),root=await mkdtemp(join(tmpdir(),'little-deep-api2-native-'));
const artifacts=resolve(process.env.DSH_TEST_ARTIFACTS??'artifacts/little-deep-api2-native');await mkdir(artifacts,{recursive:true});let app,page;
try{
  app=await _electron.launch({executablePath:require('electron'),args:['--no-sandbox',resolve('desktop/main.cjs')],env:{...process.env,DSH_PET_TEST_DATA_DIR:root,DSH_PET_TEST_NO_SANDBOX:'1'}});
  page=await app.firstWindow();page.setDefaultTimeout(15000);await page.bringToFront();
  const send=message=>app.evaluate((_,message)=>process.emit('message',message),message);
  await send({type:'init',baseline:true,options:{size:180,roam:false,companionship:'off',notifications:false},snapshot:{mood:'idle',active:false,sessionId:null,sessions:[],results:[]}});
  await app.evaluate(({app,BrowserWindow})=>{app.focus({steal:true});const win=BrowserWindow.getAllWindows()[0];win.show();win.focus();});
  const report=await exerciseLittleDeep({page,send,zip:resolve(process.env.DSH_CHARACTER_ZIP),artifacts,native:true});
  report.electron=await app.evaluate(()=>process.versions.electron);report.platform=process.platform;report.arch=process.arch;
  await writeFile(join(artifacts,'validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){
  if(page){await page.screenshot({path:join(artifacts,'failure.png')}).catch(()=>{});await writeFile(join(artifacts,'failure.json'),JSON.stringify({error:error.message,state:await page.evaluate(()=>({input:window.__nativeInputTrace,pet:{...document.querySelector('#pet')?.dataset},menuHidden:document.querySelector('#menu')?.hidden,panels:[...document.querySelectorAll('.panel')].map(p=>({id:p.id,hidden:p.hidden}))})).catch(()=>({unavailable:true}))},null,2)+'\n');}throw error;
}finally{await app?.close();await rm(root,{recursive:true,force:true});}
