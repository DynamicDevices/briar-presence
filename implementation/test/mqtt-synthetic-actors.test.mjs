import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {runSyntheticActor,syntheticSnapshot,syntheticScope,syntheticSession} from '../transports/mqtt/synthetic-actors.mjs';
import {attachTurmoDisplayClient} from '../transports/mqtt/turmo-host.mjs';
import {createViewReceiver} from '../transports/mqtt/view-wire.mjs';
import {validateView,validateSync} from './helpers/mqtt-validation.mjs';
import {validate,epochMs,preferences} from './helpers/embedded-fixtures.mjs';

// Explicitly unauthenticated callback double: no network, TLS or broker ACL proof.
class Client extends EventEmitter {
  options={protocolVersion:5,clean:true,reconnectPeriod:0,resubscribe:false,queueQoSZero:false,
    properties:{sessionExpiryInterval:0}};
  topics=[]; sent=[];
  constructor(bus) { super(); this.bus=bus; bus.clients.push(this); }
  connect() { this.connected=true; this.emit('connect'); }
  subscribe(topics,options,callback) { this.topics=topics; callback(null,topics.map(topic=>({topic,qos:1}))); }
  publish(topic,payload,options,callback) {
    this.sent.push({topic,payload,options});
    if (!this.bus.drop.has(topic)) for (const peer of this.bus.clients) {
      if (peer.connected && peer.topics.includes(topic))
        queueMicrotask(()=>peer.emit('message',topic,Buffer.from(payload),{retain:options.retain}));
    }
    queueMicrotask(()=>callback?.(null,{reasonCode:0}));
  }
  end() { this.connected=false; }
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const maxPayloadBytes=Buffer.byteLength(JSON.stringify(syntheticSnapshot('producer-a',1,epochMs)))*32;
function fixture(t) {
  const bus={clients:[],drop:new Set()}, controllers=[];
  let now=0;
  const common={syntheticOnly:true,deadlineUnixMs:Date.now()+10000,maxPayloadBytes,maxInFlight:7,tickMs:10000};
  function actor(role, overrides={}) {
    const client=new Client(bus), input=new PassThrough(), statuses=[], stopped=[];
    const config={...common,role,...(role === 'bridge' ? {ownerLeaseMs:5000,sourceLeaseMs:1000,
      observationTtlMs:1000,futureSkewMs:5,groupWindowMs:10,
      capacity:{maxProducers:2,maxWorkPerProducer:10,maxConcernsPerProducer:20,maxAttentionPerProducer:20,
        maxMessageBytes:maxPayloadBytes,maxRetainedBytes:maxPayloadBytes*10},
      ingressRate:{maxMessages:20,windowMs:1000}} : {}),...overrides};
    const runtime=runSyntheticActor({client,config,epochMs,ownerEpoch:'owner-a',clock:()=>now,wallNow:()=>epochMs+now,
      validateInput:validate,validateView,validateSync,input,onStatus:s=>statuses.push(s.code),onStop:s=>stopped.push(s.code)});
    controllers.push(runtime);
    return {runtime,client,input,statuses,stopped,config};
  }
  function display(id,brightness) {
    const client=new Client(bus),frames=[];
    const receiver=createViewReceiver({...syntheticScope,validate:validateView,maxClockSkewMs:0,maxOwnerLeaseMs:5000});
    let nonce=0;
    const runtime=attachTurmoDisplayClient({client,receiver,
      workspaceToken:syntheticScope.workspaceId,userToken:syntheticScope.userId,displayToken:id,
      projection:{...syntheticScope,userLabel:'Synthetic user',producerLabels:{'producer-a':'Local trial','producer-b':'Remote trial'},
        seed:id === 'display-a' ? 123 : 456,transitionMs:400,carouselMs:200,maxAnimationStepMs:500,
        speeds:{idle:.3,working:.8,waiting:.4,attention:1.2,unknown:.2}},
      clock:()=>({wallNow:epochMs+now,monotonicNow:now}),nonce:()=>`${id}-${++nonce}`,
      preferences:()=>({...preferences,brightness}),maxPayloadBytes,maxInFlight:7,
      onStatus(){},onFrame:f=>frames.push(f)});
    client.connect(); controllers.push(runtime);
    return {runtime,client,frames,last:()=>frames.at(-1)};
  }
  t.after(()=>controllers.forEach(c=>c.stop()));
  return {actor,display,bus,time:value=>{now=value;}};
}

test('two finite actor controllers feed ten colliding chat IDs to independent live TURMO displays',async t=>{
  const f=fixture(t), owner=f.actor('bridge'),a=f.actor('producer-a'),b=f.actor('producer-b');
  await settle();
  const x=f.display('display-a',.7),y=f.display('display-b',.25); await settle();
  for (const d of [x,y]) {
    assert.equal(d.last().semantic.workCount,10);
    assert.equal(new Set(d.last().semantic.rows.map(r=>r.key)).size,10);
    assert.equal(d.last().rows.length,2);
    assert.equal(d.last().groups.reduce((n,g)=>n+g.keys.length,0),10);
    assert.equal(d.last().semantic.concernCount,2);
  }
  assert.equal(x.last().preferences.brightness,.7); assert.equal(y.last().preferences.brightness,.25);
  for (const p of [a,b]) {
    assert.equal(p.runtime.readProducer().acceptedRevision,1);
    assert.equal(p.runtime.readProducer().pending,null);
    assert.ok(p.statuses.includes('PRODUCER_ACCEPTED'));
  }
  const publications=x.client.sent.length+y.client.sent.length+owner.client.sent.length;
  f.time(250); const animated=x.runtime.sample(); y.runtime.sample();
  assert.notEqual(animated.ring.angle,x.frames[0].ring.angle);
  assert.equal(x.client.sent.length+y.client.sent.length+owner.client.sent.length,publications);
  f.time(1100); owner.runtime.tick(); await settle();
  assert.equal(x.last().semantic.mode,'unknown');
  b.runtime.tick(); await settle();
  for (const d of [x,y]) {
    const rows=d.last().semantic.rows;
    assert.equal(rows.filter(r=>r.producerId === 'producer-a' && r.freshness !== 'current').length,5);
    assert.equal(rows.filter(r=>r.producerId === 'producer-b' && r.freshness === 'current').length,5);
    assert.equal(d.last().semantic.concernCount,2);
    assert.equal(d.last().semantic.workCount,10);
  }
});

test('waiting for a receipt keeps the actor alive; explicit exact retry reconciles without renewal',async t=>{
  const f=fixture(t),owner=f.actor('bridge');
  const receipt=`briar-presence/v0.1/${syntheticScope.workspaceId}/out/receipt/${syntheticScope.userId}/producer-a`;
  f.bus.drop.add(receipt);
  const a=f.actor('producer-a'); await settle();
  assert.equal(a.runtime.readProducer().acceptedRevision,0,'PUBACK is not application acceptance');
  assert.equal(a.runtime.tick().code,'PRODUCER_AWAITING_RECEIPT');
  assert.equal(a.runtime.running(),true); assert.equal(a.client.sent.length,1);
  const first=a.client.sent[0].payload;
  f.time(500); f.bus.drop.delete(receipt);
  assert.equal(a.runtime.retry().ok,true); await settle();
  assert.equal(a.client.sent[1].payload,first);
  const state=a.runtime.readProducer();
  assert.equal(state.acceptedRevision,1); assert.equal(state.lastResult.duplicate,true);
  assert.equal(owner.runtime.owner.api.user.exportAccepted(500).sources[0].lastReceivedAt,new Date(epochMs).toISOString());
  assert.equal(a.runtime.retry().code,'PRODUCER_NO_PENDING'); assert.equal(a.runtime.running(),true);
  assert.equal(a.runtime.tick().ok,true); await settle();
  assert.equal(a.runtime.readProducer().acceptedRevision,2);
});

test('host generation fencing stops the old actor without losing its accepted cache or concerns',async t=>{
  const f=fixture(t),owner=f.actor('bridge'),a=f.actor('producer-a'); await settle();
  f.time(10);
  const admitted=owner.runtime.owner.api.admitProducer({producerId:'producer-a',session:'fresh-host-session',generation:2,leaseMs:1000},10);
  assert.equal(admitted.ok,true);
  a.runtime.tick(); await settle();
  assert.deepEqual(a.stopped,['PRODUCER_REBIND_REQUIRED']);
  const old=a.runtime.readProducer();
  assert.equal(old.acceptedRevision,1); assert.equal(old.rebindRequired,true);
  assert.equal(a.runtime.tick().code,'ACTOR_STOPPED');
  const next=syntheticSnapshot('producer-a',1,epochMs+10); next.session='fresh-host-session'; next.concerns=[];
  assert.equal(admitted.port.submit(next,10).ok,true);
  assert.equal(owner.runtime.owner.api.user.read(10).producers.find(p=>p.id === 'producer-a').concerns.length,1,
    'Omission on restart does not resolve a concern');
});

test('uncorrelated and retained receipts cannot advance the actor accepted cache',async t=>{
  const f=fixture(t),a=f.actor('producer-a'); await settle();
  const receiptTopic=a.client.topics[0];
  const receipt={kind:'presence.receipt',version:'0.1-draft.2',request:a.runtime.readProducer().pending.request,
    accepted:true,duplicate:false,code:'ACCEPTED'};
  a.client.emit('message',receiptTopic,Buffer.from(JSON.stringify(receipt)),{retain:true});
  a.client.emit('message',receiptTopic,Buffer.from(JSON.stringify({...receipt,version:'0.1-draft.1'})),{retain:false});
  a.client.emit('message',receiptTopic,Buffer.from(JSON.stringify({...receipt,request:{...receipt.request,digest:'0'.repeat(64)}})),{retain:false});
  assert.equal(a.runtime.readProducer().acceptedRevision,0);
  assert.equal(a.statuses.filter(c=>c === 'RECEIPT_INVALID').length,2);
  assert.ok(a.statuses.includes('RECEIPT_UNMATCHED'));
});

test('parent loss, malformed control and connection error stop once without payload logging or restart',async t=>{
  const f=fixture(t),a=f.actor('producer-a');
  a.input.end(); await settle(); assert.deepEqual(a.stopped,['PARENT_PIPE_CLOSED']);
  assert.equal(a.input.listenerCount('data'),0);
  const b=f.actor('producer-b'); b.input.write('{"kind":"execute"}\n');
  assert.deepEqual(b.stopped,['PIPE_CONTROL_INVALID']);
  const owner=f.actor('bridge'); owner.client.emit('error',new Error('DO-NOT-LOG-PAYLOAD'));
  assert.deepEqual(owner.stopped,['CLIENT_ERROR']);
  assert.equal(JSON.stringify(owner.statuses).includes('DO-NOT-LOG'),false);
  owner.runtime.stop(); assert.equal(owner.stopped.length,1);
});

test('synthetic snapshots satisfy full schema and unsupported roles/cadence fail before connecting',t=>{
  for (const role of ['producer-a','producer-b']) {
    assert.equal(validate(syntheticSnapshot(role,1,epochMs)).valid,true);
    assert.equal(syntheticSnapshot(role,1,epochMs).session,syntheticSession(role));
  }
  assert.throws(()=>syntheticSnapshot('display-a',1,epochMs));
  const f=fixture(t);
  for (const patch of [{syntheticOnly:false},{deadlineUnixMs:NaN},{deadlineUnixMs:Date.now()-1},{tickMs:0},{tickMs:2147483648}])
    assert.throws(()=>f.actor('producer-a',patch),/Finite synthetic actor/);
  const a=f.actor('producer-a'); a.config.role='bridge'; a.config.deadlineUnixMs=0;
  assert.equal(a.runtime.tick().code,'PRODUCER_AWAITING_RECEIPT','Runtime config isolated from caller mutation');
});
