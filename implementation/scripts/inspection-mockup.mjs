// Generates an uninstalled design proposal using genuinely accepted synthetic states.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createEmbeddedPresence} from '../api/embedded.mjs';
import {validate, epochMs, snapshot, work, concern, severity, ack} from '../test/helpers/embedded-fixtures.mjs';

export function inspectionRecording() {
  const policy={seed:0x5eed1234,cueDurationMs:1800,cueSpeedMultiplier:1.6};
  const api=createEmbeddedPresence({userId:'alex-demo',workspaceId:'workspace-demo',validate,
    policy:{epochMs,observationTtlMs:60000,futureSkewMs:5,groupWindowMs:10},presentation:policy});
  const admitted=api.admitProducer({producerId:'demo',session:'session-a',generation:1,leaseMs:60000,userRaisedConcernIds:['worry']},0);
  assert.equal(admitted.ok,true);
  assert.equal(admitted.port.submit(snapshot(1,0,{
    work:[work('cedar',0,{label:'API compatibility checks'}),work('juniper',0,{label:'Overlay design'}),work('willow',0,{label:'Documentation',lifecycle:'finished',result:{outcome:'succeeded',summary:'Synthetic draft checked'}})],
    concerns:[concern('compatibility',0,{workId:'cedar',summary:'A client may interpret an old event differently',severity:severity('critical','provisional','Possible loss of concern visibility')}),
      concern('worry',0,{workId:'juniper',origin:'user',summary:'Will the panel cover the face?',severity:severity('significant','established','The display could become intrusive')})],
    attentionItems:[{id:'review-panel',workId:'juniper',concernId:'worry',state:'open',category:'needs-you',summary:'Review the proposed inspection panel',request:'Try locating the task with a concern, then close the panel.'}]
  }),0).ok,true);
  const states={initial:api.user.read(10)};
  assert.equal(api.user.acknowledge(ack('worry',1,states.initial.viewRevision),20).ok,true);
  states.acknowledged=api.user.read(20);
  assert.equal(api.user.resolveConcern({producerId:'demo',id:'worry',revision:1,reason:'Synthetic explicit design decision',expectedViewRevision:states.acknowledged.viewRevision},30).ok,true);
  states.resolved=api.user.read(30);
  states.expired=api.user.read(60001);
  return {policy,states};
}

export async function buildInspectionMockup() {
  const recording=inspectionRecording();
  const load=async path=>(await readFile(new URL(path,import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
  const bundle=(await Promise.all(['../core/presence.mjs','../api/presentation.mjs','../renderers/canvas.mjs'].map(load))).join('\n');
  let html=await readFile(new URL('../../design/inspection/0.1-proposal/mockup.html',import.meta.url),'utf8');
  html=html.replace('/* PRESENTATION_BUNDLE */',()=>bundle)
    .replace('/* INSPECTION_MODEL */',()=>'' )
    .replace('const recording = /* ACCEPTED_RECORDING */;',()=>`const recording = ${JSON.stringify(recording).replace(/</g,'\\u003c')};`);
  // Keep the design-only model separate in source but inline for file:// playback.
  const model=await load('../../design/inspection/0.1-proposal/view.mjs');
  html=html.replace('const recording = ',()=>model+'\nconst recording = ');
  const output=new URL('../test-artifacts/inspection-mockup.html',import.meta.url);
  await mkdir(new URL('.',output),{recursive:true});await writeFile(output,html);
  return fileURLToPath(output);
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(await buildInspectionMockup());
