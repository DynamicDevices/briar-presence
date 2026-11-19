import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentation} from '../api/presentation.mjs';
import {runMultiDisplayExample} from '../scripts/multi-display-example.mjs';
import {host,snapshot,work,concern,severity,frame,preferences} from './helpers/embedded-fixtures.mjs';

test('synthetic displays share concern, acknowledgement and expiry but keep independent preferences',()=>{
  const result=runMultiDisplayExample();
  assert.equal(result.brokerConnected,false);
  assert.equal(result.subscriptionsImplemented,false);
  assert.equal(result.liveHarnessConnected,false);
  const [start,repeated,acknowledged,expired]=result.trace.map(t=>t.displays);
  assert.deepEqual(start.map(d=>d.speedMultiplier),[1.6,1,1]);
  assert.deepEqual(start.map(d=>d.cueStartedAt),[10,10,null]);
  assert.deepEqual(repeated.map(d=>d.cueStartedAt),[10,10,null]);
  assert.deepEqual(start[0].concerns,start[1].concerns);
  assert.deepEqual(start[0].concerns,start[2].concerns);
  for(const d of start){assert.equal(d.focus.id,'cedar');assert.equal(d.focus.producerId,'demo');}
  for(const d of acknowledged){
    assert.equal(d.cueStartedAt,null);
    assert.equal(d.concerns[0].acknowledged,true);
    assert.equal(d.concerns[0].lifecycle,'open');
  }
  for(const d of expired){assert.equal(d.state,'unknown');assert.equal(d.concerns[0].lifecycle,'open');}
});

test('presentation clock, brightness and returned objects are local to each display',()=>{
  const {api,port}=host();
  assert.equal(port.submit(snapshot(1,0,{work:[work()],concerns:[concern('risk',0,{severity:severity()})]}),0).ok,true);
  frame(api,10);
  const accepted=api.user.read(10),original=structuredClone(accepted);
  const policy={seed:42,cueDurationMs:100,cueSpeedMultiplier:1.6};
  const first=createPresentation(policy),second=createPresentation(policy);
  const a=first.frame(accepted,accepted.announcements,10,preferences);
  first.frame(accepted,accepted.announcements,50,preferences);
  const b=second.frame(accepted,accepted.announcements,10,{...preferences,brightness:0,reducedMotion:true});
  assert.equal(b.cue.startedAt,10);
  assert.ok(b.scene.lights.every(light=>light.opacity===0));
  assert.ok(b.scene.glows.every(glow=>glow.opacity===0));
  a.semantic.concerns[0].summary='Display-local edit';a.cue.items.length=0;
  const next=second.frame(accepted,accepted.announcements,20,preferences);
  assert.notEqual(next.semantic.concerns[0].summary,'Display-local edit');
  assert.equal(next.cue.items.length,1);
  assert.deepEqual(accepted,original);
});
