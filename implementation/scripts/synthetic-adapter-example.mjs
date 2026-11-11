// Executable synthetic example. Python validation here is a test-host oracle,
// not a browser dependency or production authentication/validator implementation.
import assert from 'node:assert/strict';
import {createSyntheticProducer} from '../api/synthetic-producer.mjs';
import {host,epochMs,work,concern,severity,ack,frame} from '../test/helpers/embedded-fixtures.mjs';

const {api,port}=host({userRaisedConcernIds:['worry']});
const producer=createSyntheticProducer({port,session:'session-a',epochMs});
const trace=[];
function record(label,now){const f=frame(api,now);trace.push({label,state:f.semantic.baseState,work:f.semantic.work.length,
  concerns:f.semantic.concerns.map(c=>({id:c.id,lifecycle:c.lifecycle,acknowledged:c.acknowledged,freshness:c.freshness}))});}
assert.equal(producer.report('work',work(),0).ok,true);record('Work started',0);
assert.equal(producer.report('concern',concern('worry',1,{workId:'cedar',origin:'user',severity:severity()}),1).ok,true);record('Concern raised',11);
assert.equal(producer.report('work',work('cedar',12,{lifecycle:'finished',result:{outcome:'succeeded',summary:'Synthetic checks passed'}}),12).ok,true);record('Work succeeded; concern remains',12);
assert.equal(api.user.acknowledge(ack('worry',1,api.user.read(13).viewRevision),13).ok,true);record('Acknowledged; still open',13);
assert.equal(api.user.resolveConcern({producerId:'demo',id:'worry',revision:1,reason:'Explicit synthetic user decision',expectedViewRevision:api.user.read(14).viewRevision},14).ok,true);record('Explicitly resolved',14);
record('Source expired; unknown',1013);
console.log(JSON.stringify({mode:'synthetic-only',transport:'embedded',liveHarnessConnected:false,trace},null,2));
