import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createSyntheticProducer} from '../api/synthetic-producer.mjs';
import {host,epochMs,work,concern,severity} from './helpers/embedded-fixtures.mjs';

test('synthetic event adapter submits full accepted snapshots without refreshing old observations',()=>{
 const {api,port}=host(),p=createSyntheticProducer({port,session:'session-a',epochMs});
 assert.equal(p.mode,'synthetic-only');
 assert.equal(p.report('work',work(),0).ok,true);
 const c=concern('risk',1,{workId:'cedar',severity:severity()});
 assert.equal(p.report('concern',c,1).ok,true);c.summary='Caller mutation';
 assert.equal(p.report('attention',{id:'choice',workId:'cedar',state:'open',category:'needs-you',summary:'Review draft',request:'Choose layout'},2).ok,true);
 const view=api.user.read(1000),producer=view.producers[0];
 assert.equal(producer.revision,3);assert.equal(producer.work[0].freshness,'stale');
 assert.equal(producer.concerns[0].freshness,'current');assert.equal(producer.concerns[0].summary,'Synthetic concern');
 assert.equal(view.focus,null);
});

test('rejected synthetic event cannot poison cache or consume an accepted snapshot revision',()=>{
 const {api,port}=host(),p=createSyntheticProducer({port,session:'session-a',epochMs});
 assert.equal(p.report('work',work(),0).ok,true);
 assert.equal(p.report('concern',concern('invalid',1,{workId:'missing'}),1).ok,false);
 assert.equal(p.report('work',work('juniper',2),2).ok,true);
 const view=api.user.read(2).producers[0];
 assert.equal(view.revision,2);assert.equal(view.concerns.length,0);assert.equal(view.work.length,2);
});

test('synthetic sample cannot acknowledge, forge user provenance or invoke getters',()=>{
 const {api,port}=host(),p=createSyntheticProducer({port,session:'session-a',epochMs});
 assert.equal(p.report('acknowledge',{},0).code,'SYNTHETIC_EVENT_KIND');
 let coerced=false;
 assert.equal(p.report({[Symbol.toPrimitive](){coerced=true;throw Error('Do not coerce')}},{},0).code,'SYNTHETIC_EVENT_KIND');
 assert.equal(coerced,false);
 assert.equal(p.report('concern',concern('private',0,{origin:'user'}),0).code,'USER_PROVENANCE');
 let called=false;const accessor={get id(){called=true;throw Error('Do not invoke')}};
 assert.equal(p.report('work',accessor,0).code,'JSON_DATA');assert.equal(called,false);
 assert.equal(p.report('work',work(),NaN).code,'SYNTHETIC_TIME');
 assert.equal(p.report('work',work(),0).ok,true);
 assert.equal(api.user.read(0).producers[0].revision,1);
});

test('executable synthetic example shows success and acknowledgement cannot resolve a concern',()=>{
 const result=spawnSync(process.execPath,['scripts/synthetic-adapter-example.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:15000,maxBuffer:4096});
 assert.equal(result.status,0,result.stderr);
 const demo=JSON.parse(result.stdout);assert.equal(demo.liveHarnessConnected,false);
 assert.equal(demo.trace.length,6);
 assert.equal(demo.trace[2].concerns[0].lifecycle,'open');
 assert.equal(demo.trace[3].concerns[0].acknowledged,true);assert.equal(demo.trace[3].concerns[0].lifecycle,'open');
 assert.equal(demo.trace[4].concerns[0].lifecycle,'resolved');
 assert.equal(demo.trace[5].state,'unknown');
});
