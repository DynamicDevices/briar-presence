import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createReceivedTurmo} from '../api/turmo-received.mjs';
import {drawTurmo} from '../renderers/turmo.mjs';
import {createViewPublisher, createViewReceiver} from '../transports/mqtt/view-wire.mjs';
import {validateView} from './helpers/mqtt-validation.mjs';
import {host, accept, snapshot, work, concern, preferences, epochMs} from './helpers/embedded-fixtures.mjs';

const scope = {userId: 'alex-demo', workspaceId: 'workspace-demo'};
const settings = {...scope, userLabel: 'Alex', producerLabels: {demo: 'Local harness', other: 'Remote harness'},
  seed: 1234, transitionMs: 400, carouselMs: 200, maxAnimationStepMs: 500,
  speeds: {idle: .3, working: .8, waiting: .4, attention: 1.2, unknown: .2}};
const xy = frame => frame.scene.lights.map(p => [p.x,p.y]);
const clocks = now => ({wallNow: epochMs+now, monotonicNow: now});
function setup() {
  const {api,port} = host();
  const other = api.admitProducer({producerId:'other',session:'session-b',generation:1,leaseMs:5000},0).port;
  const publisher = createViewPublisher({exportAccepted:api.user.exportAccepted,validate:validateView,
    ownerEpoch:'owner-a',ownerLeaseMs:2000});
  const receivers = [0,1].map(() => createViewReceiver({...scope,validate:validateView,maxClockSkewMs:0,maxOwnerLeaseMs:2000}));
  const displays = receivers.map(receiver => createReceivedTurmo({...settings,receiver}));
  function envelope(now,nonce=null) {
    const value = publisher.snapshot(now,nonce);
    assert.equal(value.ok,true,value.code); return value.envelope;
  }
  function sync(index=0,now=0,nonce=`sync-${index}`) {
    assert.equal(receivers[index].beginSync(nonce).ok,true);
    assert.equal(receivers[index].receive(envelope(now,nonce),{...clocks(now),route:'sync'}).ok,true);
  }
  const frame = (now,index=0,prefs={}) => {
    const result = displays[index].frame({...clocks(now),preferences:{...preferences,...prefs}});
    assert.equal(result.ok,true,result.code); return result;
  };
  return {api,port,other,publisher,receivers,displays,envelope,sync,frame};
}
function populate({port,other}) {
  accept(port,snapshot(1,0,{work:Array.from({length:5},(_,i)=>work(`chat-${i}`)),concerns:[concern()]}));
  accept(other,snapshot(1,0,{session:'session-b',work:Array.from({length:5},(_,i)=>work(`chat-${i}`))}));
}

test('ten scoped chats cross the real accepted-view schema into independently animated TURMO displays', () => {
  const f=setup(); populate(f); f.sync(0); f.sync(1);
  const first=f.frame(0), second=f.frame(0,1,{reducedMotion:true,brightness:.4});
  assert.equal(first.semantic.workCount,10);
  assert.equal(new Set(first.semantic.rows.filter(r=>r.kind==='work').map(r=>r.key)).size,10);
  assert.equal(first.semantic.rows.length,11,'An unattached concern gets its own scoped row');
  assert.equal(first.rows.length,2);
  const moving=f.frame(250), still=f.frame(250,1,{reducedMotion:true,brightness:.4});
  assert.notDeepEqual(xy(first),xy(moving));
  assert.notEqual(first.ring.angle,moving.ring.angle);
  assert.deepEqual(xy(second),xy(still));
  assert.equal(second.ring.angle,still.ring.angle);
  assert.notDeepEqual(first.rows.map(r=>r.key),moving.rows.map(r=>r.key));
  assert.equal(moving.semantic.concernCount,1);
  assert.equal(second.preferences.brightness,.4);
});

test('local sampling expires original observations and leases even while the accepted-state owner stays current', () => {
  const f=setup(); populate(f); f.sync(); f.frame(0);
  accept(f.other,snapshot(2,900,{session:'session-b',work:[work('fresh',900)]}),900);
  assert.equal(f.receivers[0].receive(f.envelope(900),{...clocks(900),route:'view'}).ok,true);
  const later=f.frame(1100);
  assert.equal(later.ownerCurrent,true);
  assert.equal(later.semantic.rows.find(r=>r.producerId==='demo').freshness,'unknown');
  assert.equal(later.semantic.rows.find(r=>r.producerId==='other' && r.id==='fresh').freshness,'current');
  assert.equal(later.semantic.mode,'concern');
  const expired=f.frame(1900);
  assert.equal(expired.ownerCurrent,true);
  assert.equal(expired.semantic.mode,'unknown');
  assert.equal(expired.semantic.concernCount,1);
});

test('owner deadline and disconnect retain concerns and geometry without calling stale facts current', () => {
  const f=setup(); populate(f); f.sync(); const first=f.frame(0);
  const expired=f.frame(2000), later=f.frame(2200);
  assert.equal(expired.ownerCurrent,false);
  assert.equal(expired.semantic.mode,'unknown');
  assert.deepEqual(xy(expired),xy(first)); assert.deepEqual(xy(expired),xy(later));
  assert.equal(expired.semantic.concernCount,1);
  assert.equal(expired.rows.every(r=>r.freshness==='unknown'),true);
  assert.match(expired.ring.label,/neutral local idle/);
  f.receivers[0].disconnect();
  assert.equal(f.frame(2300).ownerCurrent,false);
});

test('last-known facts survive a disconnect before the first renderer sample', () => {
  const f=setup(); populate(f); f.sync(); f.receivers[0].disconnect();
  const first=f.frame(50);
  assert.equal(first.ownerCurrent,false); assert.equal(first.semantic.mode,'unknown');
  assert.equal(first.semantic.workCount,10); assert.equal(first.semantic.concernCount,1);
  assert.equal(first.semantic.rows.every(r=>r.freshness==='unknown'),true);
});

test('invalid preferences or backwards local time cannot consume a receiver read', () => {
  let reads=0;
  const display=createReceivedTurmo({...settings,receiver:{read(){reads++;return {ok:true,connection:'unknown',view:null};}}});
  assert.equal(display.frame({...clocks(0),preferences:{...preferences,brightness:2}}).code,'PREFERENCES');
  const bad={...preferences}; Object.defineProperty(bad,'brightness',{enumerable:true,get(){throw Error('must not run');}});
  assert.equal(display.frame({...clocks(0),preferences:bad}).code,'PREFERENCES');
  assert.equal(reads,0);
  assert.equal(display.frame({...clocks(5),preferences}).ok,true);
  assert.equal(display.frame({...clocks(4),preferences}).code,'CLOCK'); assert.equal(reads,1);
});

test('clock discontinuity fails closed and a fresh nonce-bound sync restores current semantics', () => {
  const f=setup(); populate(f); f.sync(); f.frame(0);
  const uncertain=f.displays[0].frame({wallNow:epochMs+500,monotonicNow:100,preferences});
  assert.equal(uncertain.ok,true); assert.equal(uncertain.ownerCurrent,false);
  assert.equal(uncertain.semantic.mode,'unknown');
  assert.equal(f.receivers[0].receive(f.envelope(501),{...clocks(501),route:'view'}).code,'SYNC_REQUIRED');
  f.sync(0,502,'resync-new');
  assert.equal(f.frame(502).ownerCurrent,true);
  assert.equal(f.frame(503).semantic.workCount,10);
});

test('an actual Canvas scene changes with received facts and local motion, not a recording', {skip:!process.env.BRIAR_CANVAS_MODULE}, () => {
  const {createCanvas}=createRequire(import.meta.url)(process.env.BRIAR_CANVAS_MODULE);
  const f=setup(); populate(f); f.sync();
  const canvas=createCanvas(320,480);
  function pixels(frame) {
    drawTurmo(canvas.getContext('2d'),frame);
    return createHash('sha256').update(canvas.toBuffer('image/png')).digest('hex');
  }
  const start=pixels(f.frame(0)), moving=pixels(f.frame(200));
  assert.notEqual(start,moving);
  f.receivers[0].disconnect();
  assert.notEqual(moving,pixels(f.frame(250)));
});
