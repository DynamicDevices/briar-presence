import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {attachTurmoDisplayClient} from '../transports/mqtt/turmo-host.mjs';
import {createViewReceiver} from '../transports/mqtt/view-wire.mjs';
import {createAcceptedBridge} from '../transports/mqtt/accepted-bridge.mjs';
import {validateView,validateSync} from './helpers/mqtt-validation.mjs';
import {host,snapshot,work,concern,preferences,epochMs} from './helpers/embedded-fixtures.mjs';

// MQTT.js callback contract only: this double is not a broker or TLS/ACL proof.
class Client extends EventEmitter {
  options={protocolVersion:5,clean:true,reconnectPeriod:0,resubscribe:false,
    queueQoSZero:false,properties:{sessionExpiryInterval:0}};
  connected=false; sent=[];
  subscribe(topics,options,callback) { this.topics=topics; callback(null,topics.map(topic=>({topic,qos:1}))); }
  publish(topic,payload,options,callback) { this.sent.push({topic,payload,options}); callback(null,{reasonCode:0}); }
  end() { this.connected=false; this.ended=true; }
  open() { this.connected=true; this.emit('connect'); }
  close() { this.connected=false; this.emit('close'); }
  deliver(p) { this.emit('message',p.topic,Buffer.from(p.payload),{retain:p.retain}); }
}
const scope={userId:'alex-demo',workspaceId:'workspace-demo'};
const projection={...scope,userLabel:'Alex',producerLabels:{demo:'Local harness'},seed:321,
  transitionMs:400,carouselMs:200,maxAnimationStepMs:500,
  speeds:{idle:.3,working:.8,waiting:.4,attention:1.2,unknown:.2}};

test('existing bridge bootstrap and MQTT5 callbacks drive a live locally sampled TURMO without extra publications', () => {
  const {api,port}=host();
  const input=snapshot(1,0,{work:[work('chat')],concerns:[concern('risk',0,{workId:'chat'})]});
  const maxPayloadBytes=Buffer.byteLength(JSON.stringify(input))*32;
  const bridge=createAcceptedBridge({api,workspaceToken:scope.workspaceId,userToken:scope.userId,
    producerBindings:[{producerToken:'demo',port}],displayTokens:['turmo'],validateView,validateSync,
    ownerEpoch:'owner-a',ownerLeaseMs:1000,maxPayloadBytes});
  assert.equal(bridge.handle(bridge.topics.inputs[0],JSON.stringify(input),{retained:false,now:0}).ok,true);
  const receiver=createViewReceiver({...scope,validate:validateView,maxClockSkewMs:0,maxOwnerLeaseMs:1000});
  const client=new Client(),frames=[],codes=[];
  let now=0,nonce=0;
  const display=attachTurmoDisplayClient({client,receiver,projection,onFrame:f=>frames.push(f),
    workspaceToken:scope.workspaceId,userToken:scope.userId,displayToken:'turmo',
    clock:()=>({wallNow:epochMs+now,monotonicNow:now}),nonce:()=>`nonce-${++nonce}`,
    preferences:()=>preferences,onStatus:s=>codes.push(s.code),maxPayloadBytes,maxInFlight:2});
  client.open();
  assert.equal(client.sent.length,1);
  function syncReply() {
    const request=client.sent.at(-1);
    const result=bridge.handle(request.topic,request.payload,{retained:false,now});
    assert.equal(result.ok,true,result.code);
    result.publications.forEach(p=>client.deliver(p));
  }
  syncReply();
  const first=frames.at(-1); assert.equal(first.ownerCurrent,true); assert.equal(first.semantic.workCount,1);
  now=250; const later=display.sample();
  assert.equal(later.ok,true); assert.notEqual(later.ring.angle,first.ring.angle);
  assert.notDeepEqual(later.scene.lights,first.scene.lights);
  assert.equal(client.sent.length,1,'Local animation does not publish geometry or refresh leases');
  now=1000; const expired=display.sample();
  assert.equal(expired.ownerCurrent,false); assert.equal(expired.semantic.mode,'unknown');
  assert.equal(expired.semantic.concernCount,1);
  client.close(); assert.equal(frames.at(-1).ownerCurrent,false);
  now=1100; client.open();
  assert.equal(client.sent.length,2,'Reconnect requests a fresh nonce-bound bootstrap');
  syncReply();
  assert.equal(frames.at(-1).ownerCurrent,true);
  assert.equal(frames.at(-1).semantic.mode,'unknown','A fresh owner cannot renew an expired producer');
  display.stop();
  assert.equal(client.ended,true); assert.equal(client.listenerCount('message'),0);
  assert.ok(codes.includes('CLIENT_STOPPED'));
});
