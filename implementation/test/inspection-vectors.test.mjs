import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInspectionVectors} from '../scripts/inspection-vectors.mjs';
import {inspectionRecording} from '../scripts/inspection-mockup.mjs';
import {sceneRecords} from '../scripts/api-overlay-recording.mjs';

test('native inspection oracle covers accepted task selection, concerns, acknowledgement, closure and expiry',()=>{
  const data=buildInspectionVectors();
  assert.equal(data.syntheticOnly,true);
  assert.equal(data.kind,'briar-synthetic-inspection-vectors');
  assert.ok(data.vectors.length>10);
  const semantics=data.vectors.map(v=>v.semantic);
  assert.ok(semantics.some(s=>s.concerns.some(c=>c.severity?.assessment==='provisional')));
  assert.ok(semantics.some(s=>s.concerns.some(c=>c.acknowledged&&c.lifecycle==='open')));
  assert.ok(semantics.some(s=>s.concerns.some(c=>c.lifecycle==='resolved')));
  assert.ok(semantics.some(s=>s.baseState==='unknown'));
  assert.ok(semantics.some(s=>s.work.length===4&&s.concerns.some(c=>c.sourceOmitted)));
  for(const v of data.vectors){
    assert.equal(v.semantic.mode,'synthetic');
    assert.equal(v.expected.unknown,v.semantic.baseState==='unknown');
    assert.equal(v.expected.counts.work,v.semantic.work.length);
    if(v.selected==='["missing","task"]')assert.equal(v.expected.selected,null);
    if(v.expected.selected)assert.equal(v.expected.selected.key,v.selected);
    assert.equal(Object.hasOwn(v.expected,'focus'),false); // inspection cannot set shared focus
  }
});

test('desktop inspection timeline uses real accepted transitions without changing the original mock-up',()=>{
  const original=inspectionRecording();
  assert.equal(original.states.initial.producers[0].work.length,3);
  const desktop=inspectionRecording({desktopTimeline:true});
  const records=[...sceneRecords(desktop,[10,6010,10010,22500])];
  assert.equal(records[0].semantic.work.length,3);
  assert.equal(records[0].semantic.requests.length,1);
  assert.equal(records[1].semantic.concerns.find(c=>c.id==='worry').acknowledged,true);
  assert.equal(records[1].semantic.concerns.find(c=>c.id==='worry').lifecycle,'open');
  assert.equal(records[2].semantic.concerns.find(c=>c.id==='worry').lifecycle,'resolved');
  assert.equal(records[2].semantic.concerns.find(c=>c.id==='compatibility').lifecycle,'open');
  assert.equal(records[3].semantic.baseState,'unknown');
  assert.equal(records[3].scene.state,'unknown');
  assert.equal(records[3].reducedScene.state,'unknown');
  assert.equal(original.states.expired.producers[0].lease,'expired');
});
