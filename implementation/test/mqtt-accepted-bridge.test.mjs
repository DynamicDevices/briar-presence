import test from 'node:test';
import assert from 'node:assert/strict';
import {createAcceptedBridge} from '../transports/mqtt/accepted-bridge.mjs';
import {createViewReceiver} from '../transports/mqtt/view-wire.mjs';
import {receiptFor} from '../transports/mqtt/receipt.mjs';
import {projectAcceptedView} from '../api/presentation.mjs';
import {validateView, validateSync} from './helpers/mqtt-validation.mjs';
import {host, snapshot, work, concern, severity, epochMs} from './helpers/embedded-fixtures.mjs';

const payload = () => snapshot(1, 0, {work: [work()], concerns: [concern('risk', 0, {severity: severity()})]});
const sampleBytes = Buffer.byteLength(JSON.stringify(payload()));
function setup({maxPayloadBytes = sampleBytes * 32} = {}) {
  // Finite fixture budget, not a universal API limit. Headroom covers accepted
  // metadata, two sources and cumulative cue records exercised by these tests.
  const {api, port} = host();
  const other = api.admitProducer({producerId: 'other', session: 'session-b', generation: 1, leaseMs: 1000}, 0).port;
  const bridge = createAcceptedBridge({api, workspaceToken: 'workspace-demo', userToken: 'alex-demo',
    producerBindings: [{producerToken: 'demo', port}, {producerToken: 'other', port: other}],
    displayTokens: ['display-a', 'display-b'], validateView, validateSync, ownerEpoch: 'owner-a', ownerLeaseMs: 1000, maxPayloadBytes});
  const submit = (topic, message, now = 0, retained = false) => bridge.handle(topic, JSON.stringify(message), {now, retained});
  return {api, bridge, submit};
}
const views = result => result.publications.filter(p => p.topic.includes('/out/view/')).map(p => JSON.parse(p.payload));

test('two bound producers feed the actual accepted-state handler and yield validated full views', () => {
  const {bridge, submit, api} = setup();
  const a = submit(bridge.topics.inputs[0], payload());
  assert.equal(a.ok, true); assert.equal(validateView(views(a)[0]).valid, true);
  const b = submit(bridge.topics.inputs[1], {...payload(), session: 'session-b'});
  assert.equal(b.ok, true);
  assert.deepEqual(views(b)[0].view.producers.map(p => p.work[0].id), ['cedar', 'cedar']);
  assert.deepEqual(api.user.read(0).producers.map(p => p.id), ['demo', 'other']);
  assert.equal(bridge.requiresAuthenticatedBroker, true);
  assert.equal(bridge.userCommandsSupported, false);
});

test('duplicate input gives a fixed receipt but does not publish or renew the source lease', () => {
  const {bridge, submit} = setup();
  const first = views(submit(bridge.topics.inputs[0], payload()))[0];
  const retry = submit(bridge.topics.inputs[0], payload(), 500);
  assert.equal(retry.ok, true); assert.equal(views(retry).length, 0);
  assert.deepEqual(JSON.parse(retry.publications[0].payload), receiptFor(JSON.stringify(payload()),{ok:true,duplicate:true}));
  assert.equal(retry.publications[0].topic, 'briar-presence/v0.1/workspace-demo/out/receipt/alex-demo/demo');
  const heartbeat = views(bridge.tick(501))[0];
  assert.deepEqual(heartbeat.sources, first.sources);
  assert.ok(heartbeat.sequence > first.sequence);
  assert.equal(heartbeat.view.viewRevision, first.view.viewRevision);
});

test('two subscriber synchronisations are scoped to fixed replies and share accepted state, not cue consumption', () => {
  const {bridge, submit} = setup(); submit(bridge.topics.inputs[0], payload());
  const receivers = ['display-a', 'display-b'].map(id => {
    const receiver = createViewReceiver({userId: 'alex-demo', workspaceId: 'workspace-demo', validate: validateView, maxClockSkewMs: 0, maxOwnerLeaseMs: 1000});
    receiver.beginSync(id);
    const sync = submit(bridge.topics.sync.find(t => t.includes(`/${id}/`)), {kind: 'presence.sync', version: '0.1-draft.1', nonce: id});
    assert.equal(sync.ok, true);
    assert.equal(sync.publications[0].topic, `briar-presence/v0.1/workspace-demo/out/sync/alex-demo/${id}`);
    assert.equal(receiver.receive(JSON.parse(sync.publications[0].payload), {wallNow: epochMs, monotonicNow: 0, route: 'sync'}).ok, true);
    assert.deepEqual(receiver.read({wallNow: epochMs, monotonicNow: 0}).announcements, []);
    return receiver;
  });
  const e = views(bridge.tick(10))[0];
  assert.equal(e.view.announcements.length, 1);
  for (const r of receivers) assert.equal(r.receive(e, {wallNow: epochMs + 10, monotonicNow: 10, route: 'view'}).ok, true);
  for (const r of receivers) assert.equal(r.read({wallNow: epochMs + 10, monotonicNow: 10}).announcements.length, 1);
});

test('invalid topic, retained delivery, forged user action and redirecting sync request cannot alter accepted state', () => {
  const {bridge, submit, api} = setup();
  assert.equal(submit('other/workspace', payload()).code, 'BRIDGE_TOPIC');
  assert.equal(submit(bridge.topics.inputs[0], payload(), 0, true).code, 'MQTT_RETAINED_INPUT');
  assert.equal(submit(bridge.topics.inputs[0], {kind: 'user.focus'}).ok, false);
  const redirected = submit(bridge.topics.sync[0], {kind: 'presence.sync', version: '0.1-draft.1', nonce: 'x', responseTopic: 'other/user'});
  assert.equal(redirected.code, 'SYNC_SCHEMA'); assert.deepEqual(redirected.publications, []);
  assert.equal(api.user.read(0).producers[0].work.length, 0);
  assert.equal(api.user.read(0).viewRevision, 0);
});

test('input overload rejects before acceptance; output overload reports accepted effect honestly and retains concerns', () => {
  const tiny = setup({maxPayloadBytes: sampleBytes - 1});
  assert.equal(tiny.submit(tiny.bridge.topics.inputs[0], payload()).code, 'INPUT_PAYLOAD_LIMIT');
  assert.equal(tiny.api.user.read(0).producers[0].work.length, 0);
  const out = setup({maxPayloadBytes: sampleBytes});
  const result = out.submit(out.bridge.topics.inputs[0], payload());
  assert.equal(result.ok, false); assert.equal(result.code, 'VIEW_PAYLOAD_LIMIT'); assert.equal(result.accepted, true);
  assert.equal(JSON.parse(result.publications[0].payload).accepted, true);
  assert.equal(out.api.user.read(0).producers[0].concerns[0].lifecycle, 'open');
});

test('heartbeat publishes expired sources as unknown, never as successful idle', () => {
  const {bridge, submit} = setup(); submit(bridge.topics.inputs[0], payload());
  const expired = views(bridge.tick(1000))[0];
  assert.equal(projectAcceptedView(expired.view).baseState, 'unknown');
  assert.equal(expired.view.producers[0].concerns[0].lifecycle, 'open');
  assert.equal(expired.view.producers[0].work[0].lifecycle, 'running');
  for (const p of bridge.tick(1001).publications) {assert.equal(p.retain, false); assert.equal(p.qos, 1);}
});
