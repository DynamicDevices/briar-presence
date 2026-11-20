import test from 'node:test';
import assert from 'node:assert/strict';
import {createDisplayHandoff, sampleDisplayPlan} from '../transports/mqtt/display-handoff.mjs';
import {createViewPublisher, createViewReceiver} from '../transports/mqtt/view-wire.mjs';
import {createPresentation} from '../api/presentation.mjs';
import {validateView} from './helpers/mqtt-validation.mjs';
import {host, snapshot, work, concern, severity, accept, epochMs, preferences} from './helpers/embedded-fixtures.mjs';

const policy = {seed: 0x5eed1234, cueDurationMs: 100, cueSpeedMultiplier: 1.6};
function sceneNear(actual, expected, location = 'scene') {
  // Equivalent clock arithmetic may differ at ~1e-16. At normalised scene
  // coordinates1e-12 is far below a display pixel; colours stay exact.
  if (typeof expected === 'number') {
    assert.ok(Number.isFinite(actual), location);
    if (/\.color\[\d\]$/.test(location)) assert.equal(actual, expected, location);
    else assert.ok(Math.abs(actual - expected) <= 1e-12, `${location}: ${actual} != ${expected}`);
  } else if (Array.isArray(expected)) {
    assert.equal(actual.length, expected.length, location);
    expected.forEach((v, i) => sceneNear(actual[i], v, `${location}[${i}]`));
  } else if (expected && typeof expected === 'object') {
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), location);
    for (const k of Object.keys(expected)) sceneNear(actual[k], expected[k], `${location}.${k}`);
  } else assert.equal(actual, expected, location);
}
function fixture() {
  const {api, port} = host();
  accept(port, snapshot(1, 0, {work: [work()], concerns: [concern('risk', 0, {workId: 'cedar', severity: severity()})]}));
  const publisher = createViewPublisher({exportAccepted: api.user.exportAccepted, validate: validateView, ownerEpoch: 'owner-a', ownerLeaseMs: 3000});
  const receiver = createViewReceiver({userId: 'alex-demo', workspaceId: 'workspace-demo', validate: validateView, maxClockSkewMs: 0, maxOwnerLeaseMs: 3000});
  receiver.beginSync('display-a');
  assert.equal(receiver.receive(publisher.snapshot(0, 'display-a').envelope, {wallNow: epochMs, monotonicNow: 0, route: 'sync'}).ok, true);
  const handoff = createDisplayHandoff({receiver, userId: 'alex-demo', workspaceId: 'workspace-demo', ...policy});
  const capture = (now, prefs = preferences) => {
    const result = handoff.capture({wallNow: epochMs + now, monotonicNow: now, preferences: prefs});
    assert.equal(result.ok, true, result.code); return result.plan;
  };
  const deliver = now => {
    const result = publisher.snapshot(now); assert.equal(result.ok, true);
    assert.equal(receiver.receive(result.envelope, {wallNow: epochMs + now, monotonicNow: now, route: 'view'}).ok, true);
  };
  return {api, port, receiver, publisher, handoff, capture, deliver};
}

test('renderer keyframes match the accepted presentation without carrying light arrays', () => {
  const {api, capture} = fixture(), reference = createPresentation(policy);
  const plan = capture(0);
  assert.equal(plan.kind, 'presence.display-plan');
  assert.equal('scene' in plan, false); assert.equal('lights' in plan, false); assert.equal('glows' in plan, false);
  const expected = reference.frame(api.user.read(0), [], 0, preferences);
  assert.deepEqual(sampleDisplayPlan(plan, {wallNow: epochMs, elapsedMs: 0}).scene, expected.scene);
  const later = sampleDisplayPlan(plan, {wallNow: epochMs + 50, elapsedMs: 50});
  assert.deepEqual(later.scene, reference.frame(api.user.read(50), [], 50, preferences).scene);
  assert.notDeepEqual(later.scene.lights[0], expected.scene.lights[0]);
});

test('a bounded attention cue advances locally and ends without another sidecar update', () => {
  const {api, capture, deliver} = fixture(), reference = createPresentation(policy);
  capture(0); reference.frame(api.user.read(0), [], 0, preferences);
  const announcements = api.user.flushAnnouncements(10).announcements;
  deliver(10);
  const plan = capture(10);
  assert.notEqual(plan.cue, null);
  reference.frame(api.user.read(10), announcements, 10, preferences);
  for (const t of [20, 50, 110, 111]) {
    const actual = sampleDisplayPlan(plan, {wallNow: epochMs + t, elapsedMs: t - 10});
    sceneNear(actual.scene, reference.frame(api.user.read(t), [], t, preferences).scene);
  }
});

test('one expired producer does not hide another current producer; owner expiry remains unknown with concerns retained', () => {
  const {api, capture, deliver} = fixture();
  const other = api.admitProducer({producerId: 'other', session: 'session-b', generation: 1, leaseMs: 2500}, 0).port;
  accept(other, snapshot(1, 700, {session: 'session-b', work: [work('birch', 700)]}), 700);
  deliver(700); const plan = capture(700);
  const partial = sampleDisplayPlan(plan, {wallNow: epochMs + 1100, elapsedMs: 400});
  assert.equal(partial.semantic.baseState, 'working');
  assert.equal(partial.semantic.work.find(w => w.producerId === 'demo').freshness, 'stale');
  assert.equal(partial.semantic.work.find(w => w.producerId === 'other').freshness, 'current');
  assert.equal(partial.semantic.concerns[0].lifecycle, 'open');
  assert.ok(partial.groups.some(g => g.uncertain));
  const expired = sampleDisplayPlan(plan, {wallNow: epochMs + 3700, elapsedMs: 3000});
  assert.equal(expired.semantic.baseState, 'unknown');
  assert.equal(expired.scene.state, 'unknown');
  assert.equal(expired.semantic.concerns[0].lifecycle, 'open');
  assert.ok(expired.semantic.explanations.some(e => e.includes('unknown')));
});

test('reduced motion and brightness belong to the display and invalid preferences cannot consume attention', () => {
  const {api, handoff, capture, deliver} = fixture();
  capture(0); api.user.flushAnnouncements(10); deliver(10);
  assert.equal(handoff.capture({wallNow: epochMs + 10, monotonicNow: 10, preferences: {...preferences, brightness: 2}}).code, 'PREFERENCES');
  const plan = capture(10, {...preferences, reducedMotion: true, brightness: .25});
  assert.notEqual(plan.cue, null);
  const a = sampleDisplayPlan(plan, {wallNow: epochMs + 20, elapsedMs: 10});
  const b = sampleDisplayPlan(plan, {wallNow: epochMs + 30, elapsedMs: 20});
  assert.deepEqual(a.scene.lights, b.scene.lights);
  assert.ok(a.scene.lights.every(p => p.opacity <= .25));
});

test('monotonic elapsed time prevents a frozen wall clock from keeping a plan healthy forever', () => {
  const {capture} = fixture(); const plan = capture(0);
  const expired = sampleDisplayPlan(plan, {wallNow: epochMs, elapsedMs: 3000});
  assert.equal(expired.semantic.baseState, 'unknown');
  assert.equal(sampleDisplayPlan(plan, {wallNow: epochMs - 1, elapsedMs: 1}).semantic.baseState, 'unknown');
});
