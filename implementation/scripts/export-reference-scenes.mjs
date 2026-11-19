// Offline synthetic fixtures for renderer studies and cross-language ports.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createPresence} from '../core/presence.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=(time,state='quiet',reducedMotion=false)=>({time,state,reducedMotion});
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
export function createReferenceFixtures(){
 const cases=[
  {id:'motion-face-and-state-sequence',seed:0x5eed1234,inputs:[
   ...[0,4,12,30,90,245,7].map(time=>input(time)),
   input(18,'attending'),input(18,'working'),input(18,'concern'),input(18,'urgent'),
   input(10,'waiting'),input(20,'waiting'),input(10,'unknown'),input(20,'unknown'),
   input(10,'quiet',true),input(20,'quiet',true)
  ]},
  {id:'uint32-zero',seed:0,inputs:[input(0),input(4)]},
  {id:'uint32-maximum',seed:0xffffffff,inputs:[input(0),input(4)]}
 ];
 return {
  format:'briar-presence-reference-scenes/1',
  referenceCoreSha256:sha(fs.readFileSync(path.join(root,'core/presence.mjs'))),
  sceneVersion:1,
  cases:cases.map(({id,seed,inputs})=>{
   const model=createPresence(seed);
   return {id,seed,samples:inputs.map(value=>({input:value,scene:model.sample(value)}))};
  })
 };
}
export function exportReferenceScenes(){
 const fixtures=createReferenceFixtures(),text=JSON.stringify(fixtures)+'\n';
 const file=path.join(root,'test-artifacts/reference-scenes-v1.json');
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);
 return {file,sha256:sha(text),bytes:Buffer.byteLength(text),cases:fixtures.cases.length,samples:fixtures.cases.reduce((n,value)=>n+value.samples.length,0),syntheticOnly:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(exportReferenceScenes()));
