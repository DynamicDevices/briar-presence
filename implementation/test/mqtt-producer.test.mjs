import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import {attachProducerClient} from '../transports/mqtt/client-host.mjs';
import {createAcceptedBridge} from '../transports/mqtt/accepted-bridge.mjs';
import {receiptFor,parseReceipt,requestIdentity} from '../transports/mqtt/receipt.mjs';
import {validateView,validateSync} from './helpers/mqtt-validation.mjs';
import {host,snapshot,work,concern,validate,epochMs} from './helpers/embedded-fixtures.mjs';

// Explicit MQTT.js contract double, not a network, broker, identity or ACL test.
class Client extends EventEmitter {
  options={protocolVersion:5,clean:true,reconnectPeriod:0,resubscribe:false,
    queueQoSZero:false,properties:{sessionExpiryInterval:0}};
  connected=false; sent=[];
  subscribe(topics,options,cb){this.topics=topics;cb(null,topics.map(topic=>({topic,qos:1})));}
  publish(topic,payload,options,cb){this.sent.push({topic,payload,options});cb(null,{reasonCode:this.reasonCode??0});}
  end(){this.connected=false;}
  open(){this.connected=true;this.emit('connect');}
  close(){this.connected=false;this.emit('close');}
  deliver(p){this.emit('message',p.topic,Buffer.from(p.payload),{retain:p.retain});}
}
function setup(){
  const {api,port}=host();
  let next=snapshot(1,0,{work:[work()],concerns:[concern()]}),calls=0;
  const maxPayloadBytes=Buffer.byteLength(JSON.stringify(next))*32;
  const bridge=createAcceptedBridge({api,workspaceToken:'workspace-demo',userToken:'alex-demo',
    producerBindings:[{producerToken:'demo',port}],displayTokens:['screen'],validateView,validateSync,
    ownerEpoch:'owner-a',ownerLeaseMs:1000,maxPayloadBytes});
  const client=new Client(),statuses=[];
  const producer=attachProducerClient({client,workspaceToken:'workspace-demo',userToken:'alex-demo',producerToken:'demo',
    admittedSession:'session-a',makeSnapshot:()=>{calls++;return next;},validateInput:validate,maxPayloadBytes,maxInFlight:2,
    onStatus:s=>statuses.push(s.code)});
  const submit=(now=0,index=client.sent.length-1)=>{
    const p=client.sent[index];return bridge.handle(p.topic,p.payload,{now,retained:false});
  };
  const deliver=result=>result.publications.filter(p=>p.topic.includes('/out/receipt/')).forEach(p=>client.deliver(p));
  client.open();
  return {api,port,client,producer,bridge,statuses,submit,deliver,setNext:value=>{next=value;},calls:()=>calls};
}

test('PUBACK cannot advance accepted cache; only an exact application receipt can',()=>{
  const f=setup(); assert.equal(f.producer.tick().ok,true);
  assert.equal(f.producer.read().acceptedRevision,0); assert.equal(f.producer.read().acceptedSnapshot,null);
  const changed=snapshot(1,0,{work:[work('different')]});
  const wrong=receiptFor(JSON.stringify(changed),{ok:true});
  f.client.deliver({topic:f.client.topics[0],payload:JSON.stringify(wrong),retain:false});
  assert.equal(f.producer.read().acceptedRevision,0); assert.ok(f.statuses.includes('RECEIPT_UNMATCHED'));
  f.deliver(f.submit());
  assert.equal(f.producer.read().acceptedRevision,1); assert.equal(f.producer.read().acceptedSnapshot.work[0].id,'cedar');
  assert.equal(f.producer.read().pending,null);
  const returned=f.producer.read(); returned.acceptedSnapshot.work[0].id='forged';
  assert.equal(f.producer.read().acceptedSnapshot.work[0].id,'cedar');
});

test('lost receipt reconnect retries the exact snapshot bytes; duplicate acceptance never renews a lease',()=>{
  const f=setup(); f.producer.tick();
  const initial=f.submit(0), initialView=JSON.parse(initial.publications.find(p=>p.topic.includes('/out/view/')).payload);
  f.client.close(); assert.equal(f.producer.read().pending.uncertain,true);
  f.setNext(snapshot(2,500,{work:[work('new',500)]}));
  f.client.open(); assert.equal(f.client.sent.length,1,'Reconnect never auto-replays');
  assert.equal(f.producer.tick().code,'PRODUCER_AWAITING_RECEIPT'); assert.equal(f.calls(),1);
  assert.equal(f.producer.retry().ok,true);
  assert.equal(f.client.sent[1].payload,f.client.sent[0].payload);
  const retry=f.submit(500); assert.equal(retry.publications.length,1,'A duplicate emits a receipt, not a fresh view');
  f.deliver(retry); assert.equal(f.producer.read().acceptedRevision,1);
  assert.equal(f.producer.read().lastResult.duplicate,true);
  const source=JSON.parse(f.bridge.tick(501).publications[0].payload).sources[0];
  assert.deepEqual(source,initialView.sources[0]);
  assert.equal(source.leaseValidUntil,new Date(epochMs+1000).toISOString());
  assert.equal(f.producer.tick().ok,true); assert.equal(f.calls(),2);
  assert.equal(f.producer.read().acceptedSnapshot.work[0].id,'cedar','New observation remains unaccepted until its receipt');
  f.deliver(f.submit(501)); assert.equal(f.producer.read().acceptedRevision,2);
});

test('a late accepted receipt cannot acknowledge a newer outstanding revision',()=>{
  const f=setup(); f.producer.tick(); const first=f.submit(); f.deliver(first);
  f.setNext(snapshot(2,1,{work:[work('second',1)]})); f.producer.tick();
  f.deliver(first); assert.equal(f.producer.read().acceptedRevision,1);
  assert.equal(f.producer.read().pending.snapshot.revision,2);
  f.deliver(f.submit(1)); assert.equal(f.producer.read().acceptedRevision,2);
});

test('semantic rejection preserves the accepted cache and permits a corrected unaccepted revision',()=>{
  const f=setup(); f.producer.tick(); f.deliver(f.submit());
  f.setNext(snapshot(2,1,{work:[work('bad',1,{parentId:'absent'})]}));
  assert.equal(f.producer.tick().ok,true); const rejected=f.submit(1); assert.equal(rejected.code,'REFERENCE');
  f.deliver(rejected); assert.equal(f.producer.read().acceptedRevision,1);
  assert.equal(f.producer.read().acceptedSnapshot.work[0].id,'cedar');
  assert.equal(f.producer.read().lastResult.code,'REFERENCE'); assert.equal(f.producer.read().pending,null);
  f.setNext(snapshot(2,2,{work:[work('corrected',2)]})); f.producer.tick();f.deliver(f.submit(2));
  assert.equal(f.producer.read().acceptedRevision,2);
});

test('conflict, stale and fenced-session outcomes require host re-admission, not blind replay',()=>{
  for(const code of ['REVISION_CONFLICT','STALE_REVISION','SCOPE_OR_SESSION']){
    const f=setup(); f.producer.tick();
    const p=f.client.sent[0];
    if(code==='SCOPE_OR_SESSION')
      assert.equal(f.api.admitProducer({producerId:'demo',session:'session-new',generation:2,leaseMs:1000},0).ok,true);
    else {
      const actual=snapshot(code==='STALE_REVISION'?2:1,0,{work:[work('other-writer')]});
      assert.equal(f.port.submit(actual,0).ok,true);
    }
    const response=f.submit(); assert.equal(response.code,code); f.deliver(response);
    assert.equal(f.producer.read().rebindRequired,true); assert.equal(f.producer.read().acceptedRevision,0);
    assert.equal(f.producer.tick().code,'PRODUCER_REBIND_REQUIRED');
    assert.equal(f.producer.retry().code,'PRODUCER_REBIND_REQUIRED');
    assert.equal(f.client.sent.length,1);
  }
});

test('legacy, retained, malformed and type-confused receipts cannot acknowledge a pending snapshot',()=>{
  const f=setup();f.producer.tick(); const good=receiptFor(f.client.sent[0].payload,{ok:true});
  const bad=[{...good,version:'0.1-draft.1'}, {...good,accepted:false}, {...good,request:null},
    {...good,request:{...good.request,digest:[good.request.digest]}}, {...good,extra:'field'}];
  for(const value of bad)f.client.deliver({topic:f.client.topics[0],payload:JSON.stringify(value),retain:false});
  f.client.deliver({topic:f.client.topics[0],payload:JSON.stringify(good),retain:true});
  f.client.deliver({topic:f.client.topics[0],payload:'{',retain:false});
  assert.equal(f.producer.read().acceptedRevision,0); assert.ok(f.producer.read().pending);
  assert.equal(parseReceipt('{}'),null);assert.equal(parseReceipt(null),null);
});

test('schema failures, getters and wrong admitted sessions never reach the transport',()=>{
  const f=setup();
  const getter={...snapshot()};Object.defineProperty(getter,'work',{enumerable:true,get(){throw Error('not evaluated');}});
  f.setNext(getter);assert.equal(f.producer.tick().code,'PRODUCER_SCHEMA');
  f.setNext(snapshot(1,0,{session:'somewhere-else'}));assert.equal(f.producer.tick().code,'PRODUCER_SESSION');
  f.setNext({...snapshot(),revision:0});assert.equal(f.producer.tick().code,'PRODUCER_SCHEMA');
  assert.equal(f.client.sent.length,0);
});

test('negative MQTT5 PUBACK makes delivery uncertain and retry still preserves the same bytes',()=>{
  const f=setup();f.client.reasonCode=128;
  assert.equal(f.producer.tick().ok,false);assert.equal(f.producer.read().pending.uncertain,true);
  assert.equal(f.producer.read().acceptedRevision,0);
  f.client.reasonCode=0;f.client.open();assert.equal(f.producer.retry().ok,true);
  assert.equal(f.client.sent[0].payload,f.client.sent[1].payload);
  f.deliver(f.submit());assert.equal(f.producer.read().acceptedRevision,1);
});

test('receipt digest is exact UTF-8 bytes and carries no raw labels/session or arbitrary reply route',()=>{
  const body=JSON.stringify(snapshot(7,0,{session:'opaque-private',work:[work('café 🌿')]}));
  const identity=requestIdentity(body);
  assert.equal(identity.digest,createHash('sha256').update(Buffer.from(body,'utf8')).digest('hex'));
  assert.notEqual(requestIdentity(' '+body).digest,identity.digest);
  const text=JSON.stringify(receiptFor(body,{ok:true}));
  assert.equal(text.includes('opaque-private'),false);assert.equal(text.includes('café'),false);
  assert.equal(parseReceipt(text).request.revision,7);
});

test('process restart uses explicit fresh admission, fences the old port and retains unresolved concerns',()=>{
  const f=setup();f.producer.tick();const old=f.submit();f.deliver(old);f.producer.stop();
  const admitted=f.api.admitProducer({producerId:'demo',session:'fresh-session',generation:2,leaseMs:1000},10);
  assert.equal(admitted.ok,true);
  const source=snapshot(1,10,{session:'fresh-session',work:[work('new-work',10)]});
  const budget=Buffer.byteLength(JSON.stringify(source))*32;
  const bridge=createAcceptedBridge({api:f.api,workspaceToken:'workspace-demo',userToken:'alex-demo',
    producerBindings:[{producerToken:'demo',port:admitted.port}],displayTokens:['screen'],validateView,validateSync,
    ownerEpoch:'owner-b',ownerLeaseMs:1000,maxPayloadBytes:budget});
  const client=new Client();
  const producer=attachProducerClient({client,workspaceToken:'workspace-demo',userToken:'alex-demo',producerToken:'demo',
    admittedSession:'fresh-session',makeSnapshot:()=>source,validateInput:validate,maxPayloadBytes:budget,maxInFlight:2,onStatus(){}});
  client.open();producer.tick();
  old.publications.filter(p=>p.topic.includes('/out/receipt/')).forEach(p=>client.deliver(p));
  assert.equal(producer.read().acceptedRevision,0,'Old-session receipt cannot acknowledge new revision one');
  const p=client.sent[0],result=bridge.handle(p.topic,p.payload,{now:10,retained:false});
  assert.equal(result.ok,true);
  result.publications.filter(p=>p.topic.includes('/out/receipt/')).forEach(p=>client.deliver(p));
  assert.equal(producer.read().acceptedRevision,1);
  const state=f.api.user.read(10).producers[0];
  assert.equal(state.generation,2);assert.equal(state.concerns.length,1);
  assert.equal(state.concerns[0].lifecycle,'open');assert.equal(state.concerns[0].sourceOmitted,true);
  assert.equal(f.port.submit(snapshot(2,10),10).code,'SCOPE_OR_SESSION');
});

test('receipt wire capacity rejection happens before reducer acceptance',()=>{
  const {api,port}=host();const body=JSON.stringify(snapshot());
  const bridge=createAcceptedBridge({api,workspaceToken:'workspace-demo',userToken:'alex-demo',
    producerBindings:[{producerToken:'demo',port}],displayTokens:['screen'],validateView,validateSync,
    ownerEpoch:'owner-a',ownerLeaseMs:1000,maxPayloadBytes:Buffer.byteLength(body)});
  const result=bridge.handle(bridge.topics.inputs[0],body,{now:0,retained:false});
  assert.equal(result.code,'RECEIPT_PAYLOAD_LIMIT');assert.equal(result.publications.length,0);
  assert.equal(api.user.read(0).producers[0].revision,0);
});
