import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfflineMqttIngress} from '../../design/api/0.1-draft/mqtt-offline.mjs';
import {projectAcceptedView} from '../api/presentation.mjs';
import {host,snapshot,work,concern,severity,focus,frame} from './helpers/embedded-fixtures.mjs';

function rehearsal(){
 const {api,port}=host();
 const admitted=api.admitProducer({producerId:'other',session:'session-b',generation:1,leaseMs:1000},0);
 assert.equal(admitted.ok,true);
 const bus=createOfflineMqttIngress({workspaceToken:'workspace-demo',bindings:[{producerToken:'demo',port},{producerToken:'other',port:admitted.port}]});
 const send=(producer,message,now=0,retained=false)=>bus.deliver(bus.topicFor(producer),JSON.stringify(message),retained,now);
 return {api,bus,send};
}

test('offline topic rehearsal routes multiple producer namespaces without conflating matching work IDs',()=>{
 const {api,bus,send}=rehearsal();
 assert.equal(bus.brokerConnected,false);assert.equal(bus.sourceAuthenticated,false);
 assert.equal(send('demo',snapshot(1,0,{work:[work('cedar',0,{label:'First producer'})]})).ok,true);
 assert.equal(send('other',snapshot(1,0,{session:'session-b',work:[work('cedar',0,{label:'Second producer'})]})).ok,true);
 const view=api.user.read(0);
 assert.equal(view.producers.length,2);
 assert.deepEqual(view.producers.map(p=>[p.id,p.work[0].id,p.work[0].label]),[['demo','cedar','First producer'],['other','cedar','Second producer']]);
});

test('QoS-style duplicate and late deliveries keep exact accepted state and do not replay attention',()=>{
 const {api,send}=rehearsal();
 const first=snapshot(1,0,{work:[work()],concerns:[concern('risk',0,{workId:'cedar',severity:severity()})]});
 assert.equal(send('demo',first).ok,true);
 assert.equal(frame(api,10).newAnnouncements.length,1);
 const retry=send('demo',first,11);assert.equal(retry.ok,true);assert.equal(retry.duplicate,true);
 assert.deepEqual(frame(api,12).newAnnouncements,[]);
 assert.equal(send('demo',snapshot(2,13,{work:[work('cedar',13,{label:'New accepted label'})],concerns:first.concerns}),13).ok,true);
 assert.equal(send('demo',first,14).ok,false);
 assert.equal(api.user.read(14).producers[0].work[0].label,'New accepted label');
});

test('retained inputs, wildcard/cross-workspace routes and producer-carried user commands fail closed',()=>{
 const {api,bus,send}=rehearsal(),topic=bus.topicFor('demo'),s=snapshot(1,0,{work:[work()]});
 assert.equal(send('demo',s,0,true).code,'MQTT_RETAINED_INPUT');
 assert.equal(bus.deliver(topic.replace('workspace-demo','other-workspace'),JSON.stringify(s),false,0).code,'MQTT_REHEARSAL_TOPIC');
 assert.equal(bus.deliver(topic.replace('/demo/','/+/'),JSON.stringify(s),false,0).code,'MQTT_REHEARSAL_TOPIC');
 assert.equal(bus.deliver(topic,'{invalid',false,0).code,'JSON_PARSE');
 assert.equal(bus.deliver(topic,JSON.stringify(s),'false',0).code,'MQTT_REHEARSAL_METADATA');
 assert.equal(send('demo',focus('cedar')).code,'MESSAGE_KIND');
 assert.equal(send('demo',s).ok,true);assert.equal(api.user.read(0).producers[0].revision,1);
});

test('two offline readers observe one accepted focus without sharing mutable output objects',()=>{
 const {api,send}=rehearsal();
 assert.equal(send('demo',snapshot(1,0,{work:[work()]})).ok,true);
 assert.equal(api.user.focus(focus('cedar'),1).ok,true);
 const first=api.user.read(1),second=api.user.read(1);
 assert.deepEqual(first.focus,second.focus);assert.equal(first.focus.producerId,'demo');
 first.producers[0].work[0].label='Reader-local mutation';first.focus.id='changed';
 assert.equal(api.user.read(1).focus.id,'cedar');
 assert.notEqual(second.producers[0].work[0].label,'Reader-local mutation');
 assert.equal(api.capabilities().subscriptions,false); // reads are not MQTT delivery
});

test('expiry and omitted concerns remain unknown/stale despite later delivery of other work',()=>{
 const {api,send}=rehearsal();
 assert.equal(send('demo',snapshot(1,0,{work:[work()],concerns:[concern('risk',0,{workId:'cedar',severity:severity()})]})).ok,true);
 assert.equal(projectAcceptedView(api.user.read(1001)).baseState,'unknown');
 assert.equal(send('demo',snapshot(2,1002,{work:[work('cedar',1002)]}),1002).ok,true);
 const semantic=projectAcceptedView(api.user.read(1003));
 assert.equal(semantic.baseState,'working');
 assert.equal(semantic.concerns[0].lifecycle,'open');assert.equal(semantic.concerns[0].sourceOmitted,true);assert.equal(semantic.concerns[0].freshness,'stale');
 assert.equal(semantic.sources.find(s=>s.producerId==='other').lease,'unknown');
});

test('topic-token examples reject separators/wildcards and duplicate host bindings',()=>{
 const {port}=host();
 for(const workspaceToken of ['a/b','a+','a#','a\u0000b',''])assert.throws(()=>createOfflineMqttIngress({workspaceToken,bindings:[]}),/token/);
 assert.throws(()=>createOfflineMqttIngress({workspaceToken:'demo',bindings:[{producerToken:'x',port},{producerToken:'x',port}]}),/Unique/);
});
