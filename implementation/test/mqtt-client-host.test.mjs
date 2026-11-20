import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {attachBridgeClient, attachDisplayClient} from '../transports/mqtt/client-host.mjs';
import {createAcceptedBridge} from '../transports/mqtt/accepted-bridge.mjs';
import {createViewReceiver} from '../transports/mqtt/view-wire.mjs';
import {createDisplayHandoff} from '../transports/mqtt/display-handoff.mjs';
import {validateView, validateSync} from './helpers/mqtt-validation.mjs';
import {host, snapshot, work, concern, severity, preferences, epochMs} from './helpers/embedded-fixtures.mjs';

// EventEmitter transport double, NOT a broker/security/interoperability test.
class Client extends EventEmitter {
  options = {protocolVersion: 5, clean: true, reconnectPeriod: 0, resubscribe: false,
    queueQoSZero: false, properties: {sessionExpiryInterval: 0}};
  connected = false;
  topics = [];
  sent = [];
  acknowledgements = [];
  hold = false;
  constructor(bus) { super(); this.bus = bus; bus.push(this); }
  open() { this.connected = true; this.emit('connect'); }
  close() { this.connected = false; this.emit('close'); }
  subscribe(topics, options, cb) {
    this.topics = topics;
    this.subscriptionOptions = options;
    this.suback = () => cb(null, topics.map(topic => ({topic, qos: this.deny ? 128 : 1})));
    if (!this.holdSuback) this.suback();
  }
  publish(topic, payload, options, cb) {
    this.sent.push({topic, payload, options});
    for (const peer of this.bus) if (peer.connected && peer.topics.includes(topic))
      queueMicrotask(() => peer.emit('message', topic, Buffer.from(payload), {retain: options.retain}));
    const ack = () => cb(null, {reasonCode: this.reasonCode ?? 0});
    if (this.hold) this.acknowledgements.push(ack);
    else queueMicrotask(ack);
  }
  end() { this.connected = false; this.ended = true; }
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const input = (revision = 1, at = 0, session = 'session-a') => snapshot(revision, at, {session,
  work: [work('cedar', at)], concerns: [concern('risk', at, {severity: severity()})]});
const budget = Buffer.byteLength(JSON.stringify(input())) * 32; // Same finite two-source fixture headroom as bridge tests.
function setup() {
  const {api, port} = host();
  const other = api.admitProducer({producerId: 'other', session: 'session-b', generation: 1, leaseMs: 1000}, 0).port;
  const bridge = createAcceptedBridge({api, workspaceToken: 'workspace-demo', userToken: 'alex-demo',
    producerBindings: [{producerToken: 'demo', port}, {producerToken: 'other', port: other}], displayTokens: ['display-a', 'display-b'],
    validateView, validateSync, ownerEpoch: 'owner-a', ownerLeaseMs: 1000, maxPayloadBytes: budget});
  const bus = [], statuses = [];
  let now = 0;
  const bridgeClient = new Client(bus);
  const bridgeHost = attachBridgeClient({client: bridgeClient, bridge, clock: () => now,
    maxPayloadBytes: budget, maxInFlight: 2, onStatus: s => statuses.push(s.code)});
  function display(id, brightness = .7) {
    const client = new Client(bus), plans = [], codes = [];
    const receiver = createViewReceiver({userId: 'alex-demo', workspaceId: 'workspace-demo', validate: validateView, maxClockSkewMs: 0, maxOwnerLeaseMs: 1000});
    const handoff = createDisplayHandoff({receiver, userId: 'alex-demo', workspaceId: 'workspace-demo', seed: id === 'display-a' ? 123 : 456,
      cueDurationMs: 100, cueSpeedMultiplier: 1.6});
    let nonce = 0;
    const displayHost = attachDisplayClient({client, receiver, handoff, workspaceToken: 'workspace-demo', userToken: 'alex-demo', displayToken: id,
      clock: () => ({wallNow: epochMs + now, monotonicNow: now}), nonce: () => `${id}-${++nonce}`,
      preferences: () => ({...preferences, brightness}), onPlan: p => plans.push(p), onStatus: s => codes.push(s.code),
      maxPayloadBytes: budget, maxInFlight: 2});
    return {client, plans, codes, receiver, displayHost, last: () => plans.at(-1)};
  }
  const submit = (message, source = 0, retained = false) => bridgeClient.emit('message', bridge.topics.inputs[source], Buffer.from(JSON.stringify(message)), {retain: retained});
  return {api, bridge, bridgeClient, bridgeHost, display, submit, statuses, time: n => { now = n; }};
}

test('MQTT callbacks connect two synthetic producers to two independent display keyframe sinks', async () => {
  const f = setup(), a = f.display('display-a'), b = f.display('display-b', .25);
  assert.equal(f.bridgeHost.tick().code, 'CLIENT_NOT_READY');
  f.bridgeClient.open(); a.client.open(); b.client.open(); await settle();
  f.submit(input()); await settle();
  f.submit(input(1, 0, 'session-b'), 1); await settle();
  for (const d of [a, b]) {
    assert.equal(d.last().connection, 'current');
    assert.equal(d.last().semantic.work.length, 2);
    assert.equal(d.last().semantic.concerns.length, 2);
    assert.equal(d.last().semantic.concerns[0].lifecycle, 'open');
    assert.deepEqual(d.client.subscriptionOptions, {qos: 1, rap: true, rh: 2});
    assert.equal(d.client.sent.every(p => p.options.qos === 1 && p.options.retain === false), true);
  }
  assert.equal(a.last().preferences.brightness, .7);
  assert.equal(b.last().preferences.brightness, .25);
  assert.notEqual(a.last().seed, b.last().seed);
  assert.equal(a.client.sent[0].topic.endsWith('/display-a/sync'), true);
  assert.equal(b.client.sent[0].topic.endsWith('/display-b/sync'), true);
});

test('retained, invalid UTF-8, oversized and unbound ingress cannot mutate the reducer', async () => {
  const f = setup(); f.bridgeClient.open();
  f.submit(input(), 0, true);
  const topic = f.bridge.topics.inputs[0];
  f.bridgeClient.emit('message', topic, Buffer.from([0xff]), {retain: false});
  f.bridgeClient.emit('message', topic, Buffer.alloc(budget + 1), {retain: false});
  f.bridgeClient.emit('message', 'other/workspace', Buffer.from('{}'), {retain: false});
  await settle();
  assert.equal(f.api.user.read(0).viewRevision, 0);
  assert.ok(f.statuses.includes('MQTT_RETAINED_INPUT'));
  assert.ok(f.statuses.includes('INPUT_UTF8'));
  assert.equal(f.statuses.filter(c => c === 'INPUT_METADATA_OR_LIMIT').length, 2);
});

test('disconnect retains concerns, reconnect requires a new fixed-topic sync without replaying cues', async () => {
  const f = setup(), a = f.display('display-a');
  f.bridgeClient.open(); a.client.open(); await settle(); f.submit(input()); await settle();
  f.time(10); f.bridgeHost.tick(); await settle();
  assert.notEqual(a.last().cue, null);
  a.client.close();
  assert.equal(a.last().connection, 'unknown');
  assert.equal(a.last().semantic.concerns[0].lifecycle, 'open');
  f.time(20); a.client.open(); await settle();
  assert.equal(a.last().connection, 'current');
  assert.equal(a.last().cue, null);
  assert.equal(new Set(a.client.sent.map(p => JSON.parse(p.payload).nonce)).size, 2);
  f.time(1200); a.displayHost.refresh();
  assert.equal(a.last().connection, 'unknown');
  assert.equal(a.last().semantic.concerns[0].freshness, 'stale');
});

test('bridge backpressure refuses a new input before committing it', async () => {
  const f = setup(); f.bridgeClient.open(); f.bridgeClient.hold = true;
  f.submit(input());
  assert.equal(f.bridgeClient.acknowledgements.length, 2);
  const revision = f.api.user.read(0).viewRevision;
  f.submit(input(2));
  assert.equal(f.api.user.read(0).viewRevision, revision);
  assert.ok(f.statuses.includes('BRIDGE_BUSY'));
  f.bridgeClient.acknowledgements.splice(0).forEach(ack => ack());
  f.submit(input(2)); await settle();
  assert.equal(f.api.user.read(0).producers.find(p => p.id === 'demo').revision, 2);
});

test('callback routing rejects retained views and duplicates cannot renew an owner deadline', async () => {
  const f = setup(), a = f.display('display-a');
  f.bridgeClient.open(); a.client.open(); await settle(); f.submit(input()); await settle();
  const publication = f.bridgeClient.sent.findLast(p => p.topic === f.bridge.topics.view);
  const count = a.plans.length;
  f.time(500);
  a.client.emit('message', publication.topic, Buffer.from(publication.payload), {retain: true});
  a.client.emit('message', publication.topic, Buffer.from(publication.payload), {retain: false});
  assert.ok(a.codes.includes('VIEW_ROUTE'));
  assert.equal(a.plans.length, count);
  f.time(1001); a.displayHost.refresh();
  assert.equal(a.last().connection, 'unknown');
  assert.equal(a.last().cue, null);
});

test('failed and late subscriptions cannot publish a sync request', () => {
  const f = setup(), denied = f.display('display-a'), late = f.display('display-b');
  denied.client.deny = true; denied.client.open();
  assert.equal(denied.client.sent.length, 0);
  assert.ok(denied.codes.includes('SUBSCRIPTION_FAILED'));
  late.client.holdSuback = true; late.client.open(); late.client.close(); late.client.suback();
  assert.equal(late.client.sent.length, 0);
  assert.equal(late.last().connection, 'unknown');
});

test('MQTT5 error PUBACK and stop fail unknown without leaking raw client errors', async () => {
  const f = setup(), a = f.display('display-a');
  f.bridgeClient.open(); a.client.reasonCode = 135; a.client.open(); await settle();
  assert.ok(a.codes.includes('PUBLICATION_FAILED'));
  assert.equal(a.last().connection, 'unknown');
  a.client.emit('error', new Error('private credential must not appear'));
  assert.ok(a.codes.includes('CLIENT_ERROR'));
  a.displayHost.stop();
  assert.equal(a.client.ended, true);
  assert.equal(a.client.listenerCount('message'), 0);
  assert.equal(a.codes.some(c => c.includes('credential')), false);
});

test('hidden MQTT reconnect and offline-queue defaults are not accepted', () => {
  const f = setup(), client = new Client([]); client.options.reconnectPeriod = 1000;
  assert.throws(() => attachBridgeClient({client, bridge: f.bridge, clock: () => 0, maxPayloadBytes: budget,
    maxInFlight: 2, onStatus() {}}), /Clean MQTT5/);
});
