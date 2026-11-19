// Synthetic in-process presentation fan-out, NOT MQTT/subscription delivery.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createPresentation} from '../api/presentation.mjs';
import {host,snapshot,work,concern,severity,ack,focus,frame,preferences} from '../test/helpers/embedded-fixtures.mjs';

export function runMultiDisplayExample() {
  const {api,port}=host();
  const policy={seed:0x5eed1234,cueDurationMs:100,cueSpeedMultiplier:1.6};
  const displays=[
    {id:'desktop',controller:createPresentation(policy),preferences},
    {id:'reduced-motion',controller:createPresentation(policy),preferences:{...preferences,reducedMotion:true}},
    {id:'attention-disabled',controller:createPresentation(policy),preferences:{...preferences,attentionEnabled:false}}
  ];
  const trace=[];
  function publish(label,now) {
    // Temporary example-only pump: the facade owns one controller and exposes
    // no independent flush operation. Individual displays must NOT call
    // present(). This read is not an agreed network view envelope.
    frame(api,now);
    const accepted=api.user.read(now);
    const results=displays.map(display=>{
      const f=display.controller.frame(structuredClone(accepted),accepted.announcements,now,display.preferences);
      return {id:display.id,state:f.semantic.baseState,focus:f.semantic.focus,
        concerns:f.semantic.concerns.map(c=>({id:c.id,lifecycle:c.lifecycle,acknowledged:c.acknowledged})),
        cueStartedAt:f.cue?.startedAt??null,speedMultiplier:f.speedMultiplier};
    });
    trace.push({label,now,displays:results});
  }
  assert.equal(port.submit(snapshot(1,0,{work:[work()],concerns:[concern('risk',0,{workId:'cedar',severity:severity()})]}),0).ok,true);
  assert.equal(api.user.focus(focus('cedar',api.user.read(1).viewRevision),1).ok,true);
  publish('One accepted concern, independent display preferences',10);
  publish('Re-reading announcements does not restart a cue',20);
  assert.equal(api.user.acknowledge(ack('risk',1,api.user.read(30).viewRevision),30).ok,true);
  publish('Acknowledged everywhere, still unresolved',30);
  publish('Expired source is unknown everywhere',1001);
  return {mode:'synthetic-only',transport:'in-process-example',brokerConnected:false,
    subscriptionsImplemented:false,liveHarnessConnected:false,trace};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(runMultiDisplayExample(),null,2));
