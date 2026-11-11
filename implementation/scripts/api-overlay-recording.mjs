// Development-only file bridge: exact accepted synthetic scenes, not an API wire
// format, live harness connector, MQTT payload profile or device implementation.
import assert from 'node:assert/strict';
import {open,mkdir,lstat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createPresentation} from '../api/presentation.mjs';
import {createAcceptedDemoTrace} from './embedded-preview.mjs';

export async function acceptedDemoTrace() {
  return createAcceptedDemoTrace();
}

export function* sceneRecords({trace,policy},times) {
  const normal=createPresentation(policy),reduced=createPresentation(policy);
  let index=-1;
  for(const at of times){
    const announcements=[];
    while(index+1<trace.length&&trace[index+1].at<=at){
      const entry=trace[++index];announcements.push(...entry.announcements);
      if(entry.acknowledgement){const a=entry.acknowledgement;normal.acknowledge(a.producerId,a.id,a.revision);reduced.acknowledge(a.producerId,a.id,a.revision);}
    }
    assert.ok(index>=0,'Recording starts at or after the first accepted view');
    const entry=trace[index],preferences={brightness:.85,attentionEnabled:true,reducedMotion:false};
    const f=normal.frame(entry.view,announcements,at,preferences);
    const r=reduced.frame(entry.view,announcements,at,{...preferences,reducedMotion:true});
    yield {at,label:entry.label,semantic:f.semantic,scene:f.scene,reducedScene:r.scene};
  }
}

export async function buildOverlayRecording({sample=false}={}) {
  const demo=await acceptedDemoTrace();
  const durationMs=26000,fps=12;
  const times=sample?[10,4010,8010,12010,16010,22500]:Array.from({length:312},(_,i)=>Math.max(10,i*1000/fps));
  const output=new URL(`../test-artifacts/api-overlay-${sample?'sample':'recording'}.jsonl`,import.meta.url);
  await mkdir(new URL('.',output),{recursive:true});
  try{if((await lstat(output)).isSymbolicLink())throw Error('Refusing symlink recording target');}catch(e){if(e.code!=='ENOENT')throw e;}
  const file=await open(output,'w');
  try{
    await file.write(JSON.stringify({kind:'briar-synthetic-scene-tape',version:1,syntheticOnly:true,source:'accepted embedded preview',durationMs,fps,frameCount:times.length})+'\n');
    for(const record of sceneRecords(demo,times))await file.write(JSON.stringify(record)+'\n');
  }finally{await file.close();}
  return fileURLToPath(output);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  assert.ok(process.argv.length===2||process.argv.length===3&&process.argv[2]==='--sample','Usage: node scripts/api-overlay-recording.mjs [--sample]');
  console.log(await buildOverlayRecording({sample:process.argv[2]==='--sample'}));
}
