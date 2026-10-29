// Builds an experimental, self-contained API 2 pack from the accepted director, without copying test fixtures.
import {build} from 'esbuild';
import {mkdtemp,readFile,writeFile,copyFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {zipSync} from 'fflate';
import {pathToFileURL} from 'node:url';
export async function buildLittleDeep(output) {
  const temporary=await mkdtemp(join(tmpdir(),'little-deep-api2-'));
  try {
    const bundled=await build({entryPoints:['examples/little-deep/figure.js'],outfile:join(temporary,'figure.js'),bundle:true,format:'esm',platform:'browser',target:'chrome130',metafile:true,legalComments:'inline'});
    const files={};
    files['figure.js']=await readFile(join(temporary,'figure.js'));
    for(const [target,source] of Object.entries({'figure.json':'examples/little-deep/figure.json','README.md':'examples/little-deep/README.md','LICENSE':'LICENSE','LICENSE-LIVELINGS':'docs/design/art-workflow/vendor/livelings/upstream/LICENSE','LICENSE-HARNESS':'docs/design/art-workflow/whale-little-deep-v3/reference/harness/LICENSE','LICENSE-LIVELINGS-CHARACTERS':'docs/design/art-workflow/vendor/livelings/upstream/LICENSE-CHARACTERS.md','THIRD_PARTY_NOTICES.md':'examples/little-deep/THIRD_PARTY_NOTICES.md'}))files[target]=await readFile(source);
    const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),sources={};
    for(const name of Object.keys(bundled.metafile.inputs).sort())sources[name]=sha(await readFile(name));
    files['source.json']=Buffer.from(JSON.stringify({schema:1,scope:'Experimental API 2 work/request pack; no session content or credentials',sources},null,2)+'\n');
    const bytes=zipSync(files,{level:6});await mkdir(dirname(output),{recursive:true});await writeFile(output,bytes,{flag:'wx'});
    return {path:output,sha256:sha(bytes),bytes:bytes.length,sources};
  } finally {await rm(temporary,{recursive:true,force:true});}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  if(!process.argv[2])throw new Error('Expected a fresh output ZIP path');
  console.log(JSON.stringify(await buildLittleDeep(resolve(process.argv[2]))));
}
