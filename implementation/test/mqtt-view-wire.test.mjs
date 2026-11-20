import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createViewSchema} from '../transports/mqtt/view-schema.mjs';
import {createViewPublisher, createViewReceiver} from '../transports/mqtt/view-wire.mjs';
import {projectAcceptedView} from '../api/presentation.mjs';
import {host, snapshot, work, concern, severity, accept, epochMs, ack} from './helpers/embedded-fixtures.mjs';

const schema = createViewSchema(JSON.parse(fs.readFileSync(new URL('../../design/api/0.1-draft/schema.json', import.meta.url))));
const oracle = fileURLToPath(new URL('./helpers/view_schema_oracle.py', import.meta.url));
const cache = new Map();
function validate(message) {
  const key = JSON.stringify(message);
  if (!cache.has(key)) {
    const result = spawnSync('python3', [oracle], {input: JSON.stringify({schema, message}), encoding: 'utf8', timeout: 15000, maxBuffer: 4096});
    assert.equal(result.status, 0, result.error?.message || result.stderr);
    cache.set(key, JSON.parse(result.stdout));
  }
  return cache.get(key);
}
const at = (now, route = 'view', extra = {}) => ({wallNow: epochMs + now, monotonicNow: now, route, ...extra});
function fixture() {
  const {api, port} = host({userRaisedConcernIds: ['worry']});
  accept(port, snapshot(1, 0, {work: [work()], concerns: [concern('worry', 0, {origin: 'user', workId: 'cedar'})]}));
  const publisher = createViewPublisher({exportAccepted: api.user.exportAccepted, validate, ownerEpoch: 'owner-a', ownerLeaseMs: 1000});
  const receiver = createViewReceiver({userId: 'alex-demo', workspaceId: 'workspace-demo', validate, maxClockSkewMs: 0, maxOwnerLeaseMs: 1000});
  const send = (now, nonce = null) => {const result = publisher.snapshot(now, nonce); assert.equal(result.ok, true, result.code); return result.envelope;};
  const sync = (now = 0, nonce = 'nonce-a') => {
    assert.equal(receiver.beginSync(nonce).ok, true);
    const e = send(now, nonce);
    assert.equal(receiver.receive(e, at(now, 'sync')).ok, true);
    return e;
  };
  return {api, port, publisher, receiver, send, sync};
}

test('invalid transport clock export cannot throw or advance the owner clock', () => {
  const {api}=host();
  assert.equal(api.user.exportAccepted(Number.MAX_SAFE_INTEGER).code,'CLOCK');
  assert.equal(api.user.read(0).ok,true);
  assert.equal(api.user.exportAccepted(NaN).code,'CLOCK');
  assert.equal(api.user.exportAccepted(1).ok,true);
});

test('unrepresentable source deadlines reject transport export rather than throwing', () => {
  const {api}=host();
  const admitted=api.admitProducer({producerId:'long-lease',session:'long',generation:1,leaseMs:1e16},0);
  assert.equal(admitted.ok,true);
  assert.equal(admitted.port.submit(snapshot(1,0,{session:'long'}),0).ok,true);
  assert.equal(api.user.exportAccepted(0).code,'CLOCK');
});

test('export adds original source deadlines without changing existing read shape or renewing leases', () => {
  const {api, publisher} = fixture();
  assert.equal('sources' in api.user.read(1), false);
  const first = publisher.snapshot(2), second = publisher.snapshot(500);
  assert.equal(first.ok, true); assert.equal(second.ok, true);
  assert.equal(first.envelope.sources[0].leaseValidUntil, new Date(epochMs + 1000).toISOString());
  assert.deepEqual(second.envelope.sources, first.envelope.sources);
  assert.equal(second.envelope.view.viewRevision, first.envelope.view.viewRevision);
  assert.equal(second.envelope.sequence, first.envelope.sequence + 1);
  first.envelope.sources[0].producerId = 'tampered-copy';
  assert.equal(api.user.exportAccepted(501).sources[0].producerId, 'demo');
});

test('complete schema rejects missing/nested/unknown/invalid-calendar fields and preserves explicit user resolution', () => {
  const {api, send} = fixture();
  const good = send(0);
  assert.equal(validate(good).valid, true);
  for (const mutate of [e => {delete e.view.producers[0].work[0].observedAt;}, e => {e.view.producers[0].concerns[0].acknowledged = 'yes';},
    e => {e.unexpected = true;}, e => {e.generatedAt = '2026-02-30T12:00:00Z';}, e => {e.sequence = 0;}]) {
    const e = structuredClone(good); mutate(e); assert.equal(validate(e).valid, false);
  }
  assert.equal(api.user.acknowledge(ack('worry', 1, 0), 1).ok, true);
  assert.equal(api.user.resolveConcern({producerId: 'demo', id: 'worry', revision: 1, reason: 'Synthetic user closes', expectedViewRevision: 1}, 2).ok, true);
  const closed = send(3);
  assert.equal(validate(closed).valid, true);
  assert.equal(closed.view.producers[0].concerns[0].lifecycle, 'resolved');
  assert.equal(closed.view.producers[0].concerns[0].acknowledged, true);
});

test('bootstrap requires matching nonce on the fixed sync route and rejects retained views', () => {
  const {receiver, send, sync} = fixture();
  assert.equal(receiver.beginSync('nonce-a').ok, true);
  assert.equal(receiver.receive(send(0), at(0)).code, 'SYNC_REQUIRED');
  assert.equal(receiver.receive(send(1, 'wrong'), at(1, 'sync')).code, 'SYNC_REQUIRED');
  assert.equal(receiver.receive(send(2, 'nonce-a'), at(2, 'sync', {retained: true})).code, 'VIEW_ROUTE');
  assert.equal(receiver.read(at(2)).view, null);
  sync(3, 'nonce-b');
  assert.equal(receiver.read(at(3)).connection, 'current');
  assert.equal(receiver.beginSync('nonce-b').code, 'SYNC_NONCE');
});

test('duplicate and reordered delivery cannot extend owner or source deadlines', () => {
  const {receiver, send, sync} = fixture(); sync();
  const e = send(100);
  assert.equal(receiver.receive(e, at(100)).ok, true);
  assert.equal(receiver.receive(e, at(900)).duplicate, true);
  const read = receiver.read(at(1001));
  assert.equal(read.connection, 'current'); // Owner heartbeat valid to1100, source only to1000.
  assert.equal(projectAcceptedView(read.view).baseState, 'unknown');
  assert.equal(read.view.producers[0].concerns[0].lifecycle, 'open');
  assert.equal(receiver.read(at(1100)).connection, 'unknown');
});

test('wire sequence is not the user-view revision and stale/conflicting snapshots leave accepted state unchanged', () => {
  const {receiver, send, sync} = fixture(); sync();
  const older = send(1), newer = send(2);
  assert.equal(older.view.viewRevision, newer.view.viewRevision);
  assert.equal(receiver.receive(newer, at(2)).ok, true);
  assert.equal(receiver.receive(older, at(3)).code, 'VIEW_ORDER');
  const conflict = structuredClone(newer); conflict.view.producers[0].work[0].label = 'Conflicting same sequence';
  assert.equal(receiver.receive(conflict, at(4)).code, 'VIEW_CONFLICT');
  assert.equal(receiver.read(at(4)).view.producers[0].work[0].label, 'cedar');
});

test('disconnect preserves unresolved acknowledged concerns; reconnect suppresses historical cues', () => {
  const {api, receiver, send, sync} = fixture(); sync();
  api.user.present({now: 10, preferences: {brightness: .7, reducedMotion: false, attentionEnabled: true}});
  assert.equal(api.user.acknowledge(ack('worry', 1, 0), 11).ok, true);
  assert.equal(receiver.receive(send(11), at(11)).ok, true);
  receiver.disconnect();
  const offline = receiver.read(at(12));
  assert.equal(offline.connection, 'unknown');
  assert.equal(offline.view.producers[0].concerns[0].lifecycle, 'open');
  assert.equal(offline.view.producers[0].concerns[0].acknowledged, true);
  sync(13, 'reconnect');
  const online = receiver.read(at(13));
  assert.equal(online.view.producers[0].concerns[0].acknowledged, true);
  assert.deepEqual(online.announcements, []);
  assert.equal(online.view.producers[0].concerns[0].lifecycle, 'open');
});

test('unexpected owner epoch fails closed until fresh synchronisation and backwards clocks require resync', () => {
  const {receiver, send, sync} = fixture(); sync();
  const other = send(1); other.ownerEpoch = 'owner-b';
  assert.equal(receiver.receive(other, at(1)).code, 'SYNC_REQUIRED');
  assert.equal(receiver.read(at(1)).connection, 'unknown');
  sync(2, 'new-owner-sync');
  assert.equal(receiver.read(at(1)).connection, 'unknown');
  assert.equal(receiver.receive(send(3), at(3)).code, 'SYNC_REQUIRED');
  sync(4, 'clock-recovery');
  assert.equal(receiver.read(at(4)).connection, 'current');
});

test('scope, required feature, source bindings and lease duration are semantic rejections', () => {
  const {receiver, send, sync} = fixture(); sync();
  const good = send(1);
  for (const [mutate, code] of [
    [e => {e.workspaceId = 'other';}, 'VIEW_SCOPE'],
    [e => {e.requiredFeatures = ['unknown-required'];}, 'UNSUPPORTED_FEATURE'],
    [e => {e.sources[0].generation++;}, 'SOURCE_BINDING'],
    [e => {e.sources.push(structuredClone(e.sources[0]));}, 'SOURCE_BINDING'],
    [e => {e.ownerValidUntil = new Date(epochMs + 5000).toISOString();}, 'VIEW_TIME']
  ]) {const e = structuredClone(good); mutate(e); assert.equal(receiver.receive(e, at(1)).code, code);}
  assert.equal(receiver.read(at(1)).view.workspaceId, 'workspace-demo');
});

test('two independent receivers consume new cues once each without replaying bootstrap history', () => {
  const {api, port, send, receiver, sync} = fixture(); sync();
  const other = createViewReceiver({userId: 'alex-demo', workspaceId: 'workspace-demo', validate, maxClockSkewMs: 0, maxOwnerLeaseMs: 1000});
  other.beginSync('display-b');
  assert.equal(other.receive(send(1, 'display-b'), at(1, 'sync')).ok, true);
  accept(port, snapshot(2, 2, {work: [work('cedar', 2)], concerns: [concern('risk', 2, {severity: severity()})]}), 2);
  api.user.present({now: 12, preferences: {brightness: .7, reducedMotion: false, attentionEnabled: true}});
  const e = send(13);
  assert.equal(e.view.announcements.length, 1);
  assert.equal(receiver.receive(e, at(13)).ok, true);
  assert.equal(other.receive(e, at(13)).ok, true);
  assert.equal(receiver.read(at(13)).announcements.length, 1);
  assert.equal(receiver.read(at(14)).announcements.length, 0);
  assert.equal(other.read(at(14)).announcements.length, 1);
  assert.equal(other.read(at(15)).announcements.length, 0);
  receiver.disconnect(); sync(16, 'display-a-reconnect');
  assert.equal(receiver.read(at(16)).announcements.length, 0);
});
