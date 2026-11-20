import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmbeddedPresence} from '../api/embedded.mjs';
import {createAcceptedBridge} from '../transports/mqtt/accepted-bridge.mjs';
import {validateView,validateSync} from './helpers/mqtt-validation.mjs';
import {validate,epochMs,snapshot,work,concern} from './helpers/embedded-fixtures.mjs';

// Test fixture bounds only, not proposed deployment capacity values.
const capacity={maxProducers:2,maxWorkPerProducer:10,maxConcernsPerProducer:10,maxAttentionPerProducer:10,
  maxMessageBytes:16384,maxRetainedBytes:65536};
function setup(overrides={}, validator=validate) {
  const limits={...capacity,...overrides};
  const api=createEmbeddedPresence({userId:'alex-demo',workspaceId:'workspace-demo',validate:validator,capacity:limits,
    policy:{epochMs,observationTtlMs:1000,futureSkewMs:5,groupWindowMs:10},
    presentation:{seed:123,cueDurationMs:100,cueSpeedMultiplier:1.6}});
  const admitted=api.admitProducer({producerId:'demo',session:'session-a',generation:1,leaseMs:1000},0);
  assert.equal(admitted.ok,true);
  return {api,port:admitted.port,limits};
}
const source=(api,now)=>api.user.exportAccepted(now).sources.find(s=>s.producerId === 'demo');
const state=(api,now)=>api.user.read(now).producers.find(p=>p.id === 'demo');

test('record overload rolls back revision, records and lease; corrected same revision may succeed',()=>{
  const {api,port,limits}=setup({maxWorkPerProducer:2});
  limits.maxWorkPerProducer=100; // Runtime owns an isolated policy copy.
  const first=snapshot(1,0,{work:[work('a'),work('b')]});
  assert.equal(port.submit(first,0).ok,true);
  const before=source(api,0);
  const next=snapshot(2,100,{work:[work('a',100),work('b',100),work('c',100)]});
  assert.equal(port.submit(next,100).code,'CAPACITY_WORK');
  assert.deepEqual(source(api,100),before);
  assert.deepEqual(state(api,100).work.map(w=>w.id),['a','b']);
  assert.equal(port.submit(first,200).duplicate,true);
  assert.deepEqual(source(api,200),before);
  next.work.pop(); assert.equal(port.submit(next,200).ok,true);
  assert.equal(state(api,200).revision,2);
});

test('retained unresolved concerns and their work references count against record capacity',()=>{
  for (const [limits,code] of [[{maxConcernsPerProducer:1},'CAPACITY_CONCERNS'],[{maxWorkPerProducer:1},'CAPACITY_WORK']]) {
    const {api,port}=setup(limits);
    const first=snapshot(1,0,{work:[work('old')],concerns:[concern('old-risk',0,{workId:'old'})]});
    assert.equal(port.submit(first,0).ok,true);
    const before=source(api,0);
    const next=snapshot(2,100,{work:[work('new',100)],concerns:[concern('new-risk',100,{workId:'new'})]});
    assert.equal(port.submit(next,100).code,code);
    assert.deepEqual(source(api,100),before);
    assert.equal(state(api,100).concerns[0].sourceOmitted,false);
    assert.equal(state(api,100).concerns[0].id,'old-risk');
  }
});

test('attention and producer admission limits reject atomically without replacing another producer',()=>{
  const {api,port}=setup({maxAttentionPerProducer:1,maxProducers:1});
  const attention=id=>({id,state:'open',category:'needs-you',summary:'Invented choice',request:'Choose a draft'});
  assert.equal(port.submit(snapshot(1,0,{attentionItems:[attention('one')]}),0).ok,true);
  const before=source(api,0);
  assert.equal(port.submit(snapshot(2,100,{attentionItems:[attention('one'),attention('two')]}),100).code,'CAPACITY_ATTENTION');
  assert.deepEqual(source(api,100),before);
  assert.equal(api.admitProducer({producerId:'other',session:'other',generation:1,leaseMs:1000},100).code,'CAPACITY_PRODUCERS');
  assert.equal(api.user.read(100).producers.length,1);
});

test('UTF8 input bytes are bounded before validation and never counted as acceptance',()=>{
  const message=snapshot(1,0,{work:[work('unicode',0,{label:'🧭'.repeat(20)})]});
  const bytes=Buffer.byteLength(JSON.stringify(message));
  assert.ok(bytes > JSON.stringify(message).length);
  let validations=0;
  const {api,port}=setup({maxMessageBytes:bytes-1},data=>{validations++;return validate(data);});
  assert.equal(port.submit(message,0).code,'INPUT_PAYLOAD_LIMIT');
  assert.equal(validations,0); assert.equal(state(api,0).revision,0);
  const exact=setup({maxMessageBytes:bytes});
  assert.equal(exact.port.submit(message,0).ok,true);
});

test('retention saturation rejects without dropping old concern revision fences',()=>{
  const {api,port}=setup({maxRetainedBytes:4096});
  let accepted=0,overflow;
  for (let revision=1;revision<=30;revision++) {
    const result=port.submit(snapshot(revision,revision,{concerns:[concern(`done-${revision}`,revision,
      {lifecycle:'resolved',resolution:{reason:'Synthetic check completed'}})]}),revision);
    if (!result.ok) { overflow=result; break; }
    accepted=revision;
  }
  assert.equal(overflow.code,'CAPACITY_RETENTION');
  assert.ok(accepted > 1 && accepted < 30);
  assert.equal(state(api,31).revision,accepted);
  // History has not been evicted to make room; same concern revision still fences a changed body.
  const rewritten=concern('done-1',1,{lifecycle:'resolved',resolution:{reason:'Synthetic check completed'},summary:'Changed without a concern revision'});
  assert.equal(port.submit(snapshot(accepted+1,31,{concerns:[rewritten]}),31).code,'CONCERN_REVISION');
  assert.equal(state(api,31).revision,accepted);
});

test('user receipt history also counts against retention and keeps prior idempotence',()=>{
  const {api}=setup({maxRetainedBytes:2048});
  const first={kind:'user.focus',version:'0.1-draft',requestId:'focus-1',expectedViewRevision:0,target:null};
  assert.equal(api.user.focus(first,0).ok,true);
  let accepted=1,overflow;
  for (let i=2;i<=20;i++) {
    const result=api.user.focus({...first,requestId:`focus-${i}`,expectedViewRevision:accepted},i);
    if (!result.ok) { overflow=result; break; }
    accepted++;
  }
  assert.equal(overflow?.code,'CAPACITY_RETENTION');
  assert.equal(api.user.read(21).viewRevision,accepted);
  assert.equal(api.user.focus(first,21).duplicate,true);
  assert.equal(api.user.read(21).viewRevision,accepted);
});

test('session-history saturation rejects admission without forgetting old session fences',()=>{
  const {api}=setup({maxRetainedBytes:1200});
  let generation=1,overflow;
  for (let next=2;next<=20;next++) {
    const result=api.admitProducer({producerId:'demo',session:`session-${next}-${'z'.repeat(100)}`,generation:next,leaseMs:1000},next);
    if (!result.ok) { overflow=result; break; }
    generation=next;
  }
  assert.equal(overflow?.code,'CAPACITY_RETENTION');
  assert.equal(state(api,21).generation,generation);
  assert.equal(api.admitProducer({producerId:'demo',session:'session-a',generation:22,leaseMs:1000},21).code,'ADMISSION_CONFLICT');
});

test('capacity configuration must be complete and cannot claim bounds for legacy offline hosts',()=>{
  for (const patch of [{maxProducers:0},{maxRetainedBytes:1},{maxWorkPerProducer:Infinity},{typo:1}])
    assert.throws(()=>setup(patch),/capacity|Capacity/);
  assert.equal(setup().api.capabilities().capacityConfigured,true);
});

test('bridge ingress limits each fixed route independently, including malformed input and retries',()=>{
  const {api,port}=setup();
  const other=api.admitProducer({producerId:'other',session:'other',generation:1,leaseMs:1000},0);
  const ingressRate={maxMessages:2,windowMs:1000};
  const bridge=createAcceptedBridge({api,workspaceToken:'workspace-demo',userToken:'alex-demo',
    producerBindings:[{producerToken:'demo',port},{producerToken:'other',port:other.port}],displayTokens:['display'],
    validateView,validateSync,ownerEpoch:'owner',ownerLeaseMs:1000,maxPayloadBytes:16384,ingressRate});
  ingressRate.maxMessages=100;
  assert.equal(bridge.ingressRateConfigured,true);
  const send=(topic,payload,now)=>bridge.handle(topic,payload,{retained:false,now});
  const first=JSON.stringify(snapshot());
  assert.equal(send(bridge.topics.inputs[0],first,0).ok,true);
  const before=source(api,0);
  assert.equal(send(bridge.topics.inputs[0],first,500).ok,true,'Identical retry is quiet but counts as ingress');
  const limited=send(bridge.topics.inputs[0],JSON.stringify(snapshot(2,500)),500);
  assert.equal(limited.code,'INGRESS_RATE_LIMIT'); assert.deepEqual(limited.publications,[]);
  assert.deepEqual(source(api,500),before);
  assert.equal(send(bridge.topics.inputs[1],JSON.stringify(snapshot(1,500,{session:'other'})),500).ok,true);
  assert.equal(send(bridge.topics.inputs[0],first,499).code,'CLOCK','Regression cannot reset the rate window');
  assert.equal(send(bridge.topics.inputs[0],JSON.stringify(snapshot(2,1000)),1000).ok,true,'Window boundary permits current full snapshot');
  send(bridge.topics.sync[0],'{',1000);
  send(bridge.topics.sync[0],'{',1000);
  assert.equal(send(bridge.topics.sync[0],'{',1000).code,'INGRESS_RATE_LIMIT','Malformed sync also consumes its route budget');
});
