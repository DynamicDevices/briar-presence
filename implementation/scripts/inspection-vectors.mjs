// Finite oracle for the native inspection projection; no scene tape or network.
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createAcceptedDemoTrace} from './embedded-preview.mjs';
import {projectAcceptedView} from '../api/presentation.mjs';
import {inspectionModel} from '../../design/inspection/0.1-proposal/view.mjs';
import assert from 'node:assert/strict';
import {host,snapshot,work,concern,severity,focus,frame} from '../test/helpers/embedded-fixtures.mjs';

export function buildInspectionVectors(){
  const {trace}=createAcceptedDemoTrace();
  const {api,port}=host();
  const other=api.admitProducer({producerId:'other',session:'session-b',generation:1,leaseMs:1000},0);
  assert.equal(other.ok,true);
  const concerns=[concern('risk',0,{workId:'cedar',severity:severity('critical','provisional')}),concern('unassigned',0,{severity:severity()})];
  const attentionItems=[{id:'choice',concernId:'unassigned',state:'open',category:'needs-you',summary:'An unassigned decision',request:'Choose a direction'}];
  assert.equal(port.submit(snapshot(1,0,{work:[work('cedar'),work('willow'),work('ash')],concerns,attentionItems}),0).ok,true);
  assert.equal(other.port.submit(snapshot(1,0,{session:'session-b',work:[work('cedar',0,{label:'Other source cedar'})]}),0).ok,true);
  assert.equal(api.user.focus(focus('willow',api.user.read(1).viewRevision),1).ok,true);
  frame(api,10);
  trace.push({label:'Simultaneous tasks, matching IDs and unassigned concern/request',view:api.user.read(10)});
  assert.equal(port.submit(snapshot(2,20,{work:[work('cedar',20)],concerns:[],attentionItems}),20).ok,true);
  trace.push({label:'Omitted task and concern remain inspectable',view:api.user.read(20)});
  trace.push({label:'All simultaneous sources expire to unknown',view:api.user.read(1021)});
  const vectors=[];
  for(const entry of trace){
    const semantic=projectAcceptedView(entry.view);
    for(const selected of [null,...semantic.work.map(w=>JSON.stringify([w.producerId,w.id])),'["missing","task"]']){
      const expected=inspectionModel(semantic,selected);
      vectors.push({label:entry.label,semantic,selected:selected??'',expected});
    }
  }
  return {kind:'briar-synthetic-inspection-vectors',version:1,syntheticOnly:true,vectors};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const output=new URL('../test-artifacts/inspection-accepted-vectors.json',import.meta.url);
  await mkdir(new URL('.',output),{recursive:true});
  await writeFile(output,JSON.stringify(buildInspectionVectors()));
  console.log(fileURLToPath(output));
}
