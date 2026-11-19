import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {drawCanvas} from '../renderers/canvas.mjs';
import {host, validate, snapshot, work, concern, severity, focus, ack, frame, accept, stamp, preferences} from './helpers/embedded-fixtures.mjs';

const canvasModule = process.env.BRIAR_CANVAS_MODULE;
const canvasLibrary = canvasModule ? createRequire(import.meta.url)(canvasModule) : null;
test('acknowledgement before first presentation suppresses a queued cue without resolving concern', () => {
  const {api, port} = host();
  accept(port, snapshot(1, 0, {concerns: [concern('risk', 0, {severity: severity()})]}));
  assert.equal(api.user.acknowledge(ack(), 1).ok, true);
  const shown = frame(api, 11);
  assert.equal(shown.cue, null);
  assert.equal(shown.semantic.concerns[0].lifecycle, 'open');
  assert.ok(shown.groups.some(g => g.items.some(i => i.id === 'risk')));
});
function paint(value) {
  assert.equal(value.scene.lights.length, 1170);
  assert.equal(value.scene.glows.length, 9);
  assert.equal(value.semantic.mode, 'synthetic');
  if (!canvasLibrary) return null;
  const canvas = canvasLibrary.createCanvas(360, 460);
  drawCanvas(canvas.getContext('2d'), value.scene);
  return createHash('sha256').update(canvas.toBuffer('image/png')).digest('hex');
}
const timeRequest = (id, extra = {}) => ({id, state: 'open', category: 'time-sensitive', summary: 'Synthetic timing', request: 'Use this slot?',
  timing: {basis: 'Operator available now', consequenceOfDelay: 'The slot may be reassigned'}, ...extra});

const scenarios = {
  'critical-managed-versus-harmless-blocked'() {
    const {api, port} = host();
    accept(port, snapshot(1, 0, {work: [work('cedar', 0, {lifecycle: 'waiting', wait: {party: 'user', reason: 'Harmless draft choice'}})],
      concerns: [concern('risk', 0, {severity: severity('critical', 'provisional', 'Possible irreversible loss')})],
      attentionItems: [{id: 'aware', concernId: 'risk', state: 'open', category: 'for-awareness', summary: 'Already being investigated'},
        {id: 'choice', workId: 'cedar', state: 'open', category: 'needs-you', summary: 'Draft choice', request: 'Choose a draft'}]}));
    const f = frame(api, 10);
    assert.equal(f.semantic.concerns[0].severity.assessment, 'provisional');
    assert.equal(f.semantic.requests[0].request, undefined);
    assert.equal(f.semantic.requests[1].timing, undefined);
    assert.match(f.semantic.explanations.join(' '), /not confirmed/);
    assert.deepEqual(f.newAnnouncements[0].items.map(i => i.id), ['risk']);
    paint(f);
  },
  'minor-but-time-sensitive'() {
    const {api, port} = host();
    accept(port, snapshot(1, 0, {concerns: [concern('slot', 0, {severity: severity('minor')})], attentionItems: [timeRequest('use-slot', {concernId: 'slot'})]}));
    const f = frame(api, 10);
    assert.equal(f.semantic.concerns[0].severity.level, 'minor');
    assert.equal(f.semantic.requests[0].timing.deadline, undefined);
    assert.deepEqual(f.cue.items.map(i => i.id), ['use-slot']);
    assert.equal(f.speedMultiplier, 1.6);
    paint(f);
  },
  'success-does-not-resolve'() {
    const {api, port} = host();
    accept(port, snapshot(1, 0, {work: [work('cedar', 0, {lifecycle: 'finished', result: {outcome: 'succeeded', summary: 'Checks passed'}})], concerns: [concern()]}));
    assert.equal(api.user.acknowledge(ack(), 1).ok, true);
    const f = frame(api, 2);
    assert.equal(f.semantic.work[0].result.outcome, 'succeeded');
    assert.equal(f.semantic.concerns[0].severityAssessment, 'unassessed');
    assert.equal(f.semantic.concerns[0].lifecycle, 'open');
    assert.equal(f.semantic.concerns[0].acknowledged, true);
    assert.ok(f.groups.some(g => g.items.some(i => i.id === 'risk')));
    paint(f);
  },
  'omitted-concern'() {
    const {api, port} = host();
    accept(port, snapshot(1, 0, {work: [work()], concerns: [concern('risk', 0, {severity: severity()})]}));
    frame(api, 10);
    accept(port, snapshot(2, 1100, {work: [work('cedar', 1100, {activity: 'checking'})]}), 1100);
    const f = frame(api, 1101);
    assert.equal(f.semantic.work[0].activity, 'checking');
    assert.equal(f.semantic.concerns[0].sourceOmitted, true);
    assert.equal(f.semantic.concerns[0].observedAt, stamp(0));
    assert.equal(f.semantic.concerns[0].freshness, 'stale');
    assert.equal(f.semantic.concerns[0].lifecycle, 'open');
    assert.equal(f.cue, null);
    assert.deepEqual(f.newAnnouncements, []);
    paint(f);
  },
  'stale-important-task'() {
    const {api, port} = host();
    const other = api.admitProducer({producerId: 'other', session: 'other-a', generation: 1, leaseMs: 1000}, 0).port;
    accept(port, snapshot(1, 0, {work: [work()], concerns: [concern('risk', 0, {severity: severity()})]}));
    accept(other, snapshot(1, 900, {session: 'other-a', work: [work('birch', 900)]}), 900);
    const f = frame(api, 1100);
    assert.equal(f.semantic.concerns[0].freshness, 'stale');
    assert.equal(f.semantic.concerns[0].severity.level, 'significant');
    assert.equal(f.semantic.work.find(w => w.producerId === 'other').freshness, 'current');
    assert.equal(f.semantic.work.find(w => w.producerId === 'demo').lifecycle, 'running');
    assert.equal(f.semantic.requests.length, 0);
    assert.ok(f.groups.some(g => g.uncertain));
    paint(f);
  },
  'combined-arrivals'() {
    const {api, port} = host();
    accept(port, snapshot(1, 0, {work: [work('focused')]}));
    assert.equal(api.user.focus(focus('focused'), 0).ok, true);
    const one = concern('one', 1, {severity: severity()});
    accept(port, snapshot(2, 1, {work: [work('focused', 1)], concerns: [one]}), 1);
    accept(port, snapshot(3, 5, {work: [work('focused', 5)], concerns: [one, concern('two', 5, {severity: severity('critical', 'provisional')})]}), 5);
    assert.deepEqual(frame(api, 10).newAnnouncements, []);
    const f = frame(api, 11);
    assert.equal(f.newAnnouncements.length, 1);
    assert.deepEqual(f.cue.items.map(i => i.id), ['one', 'two']);
    assert.equal(f.semantic.focus.id, 'focused');
    assert.equal(f.semantic.concerns.length, 2);
    assert.deepEqual(frame(api, 12).newAnnouncements, []);
    paint(f);
  },
  'confirmed-acknowledged-critical'() {
    const {api, port} = host();
    const c = concern('risk', 0, {severity: severity('critical', 'provisional')});
    accept(port, snapshot(1, 0, {concerns: [c]})); frame(api, 10);
    assert.equal(api.user.acknowledge(ack(), 11).ok, true);
    assert.equal(frame(api, 11).cue, null);
    const confirmed = {...c, revision: 2, severity: {...c.severity, assessment: 'established'}};
    accept(port, snapshot(2, 12, {concerns: [confirmed]}), 12);
    const f = frame(api, 22);
    assert.equal(f.cue.items[0].reason, 'critical-confirmed');
    assert.equal(f.semantic.concerns[0].acknowledged, false);
    assert.equal(api.user.read(22).acknowledgements[0].revision, 1);
    accept(port, snapshot(3, 23, {concerns: [confirmed]}), 23);
    assert.deepEqual(frame(api, 33).newAnnouncements, []);
    paint(f);
  },
  'user-raised-concern-resolution'() {
    const c = concern('worry', 0, {origin: 'user', severity: severity()});
    const untrusted = host();
    assert.equal(untrusted.port.submit(snapshot(1, 0, {concerns: [c]}), 0).code, 'USER_PROVENANCE');
    const {api, port} = host({userRaisedConcernIds: ['worry']});
    accept(port, snapshot(1, 0, {concerns: [c]}));
    const checked = {...c, revision: 2, severity: {...c.severity, evidence: 'Relevant check passed'}};
    accept(port, snapshot(2, 1, {concerns: [checked], attentionItems: [{id: 'evidence', concernId: 'worry', state: 'open', category: 'for-awareness', summary: 'Consider resolving after reviewing the check'}]}), 1);
    const before = frame(api, 11);
    assert.equal(before.semantic.concerns[0].lifecycle, 'open');
    assert.match(before.semantic.concerns[0].severity.evidence, /check passed/);
    const invalid = {...checked, revision: 3, lifecycle: 'resolved', resolution: {reason: 'Check passed'}};
    assert.equal(port.submit(snapshot(3, 12, {concerns: [invalid]}), 12).code, 'USER_RESOLUTION_REQUIRED');
    assert.equal(api.user.resolveConcern({producerId: 'demo', id: 'worry', revision: 2, reason: 'I reviewed the evidence', expectedViewRevision: 0}, 13).ok, true);
    const after = frame(api, 13);
    assert.equal(after.semantic.concerns[0].lifecycle, 'resolved');
    assert.equal(after.cue, null);
    assert.equal(after.groups.flatMap(g => g.items).filter(i => i.kind === 'concern').length, 0);
    paint(after);
  },
  'shared-user-focus-and-acknowledgement'() {
    const {api, port} = host();
    accept(port, snapshot(1, 0, {work: [work('cedar'), work('birch')], concerns: [concern()]}));
    const displayA = api.user, displayB = api.user;
    assert.equal(displayA.focus(focus('birch'), 1).ok, true);
    assert.equal(displayB.read(1).focus.id, 'birch');
    assert.equal(displayB.acknowledge(ack('risk', 1, 1), 2).ok, true);
    const f = frame(api, 2);
    assert.equal(f.semantic.concerns[0].acknowledged, true);
    assert.equal(f.semantic.concerns[0].lifecycle, 'open');
    const isolated = host({userId: 'other-user', workspaceId: 'other-workspace'});
    assert.equal(isolated.api.user.read(0).focus, null);
    assert.equal(isolated.api.user.read(0).producers[0].concerns.length, 0);
    paint(f);
  },
  'reconnect-superseded-focus'() {
    const {api, port} = host();
    accept(port, snapshot(1, 0, {work: [work('cedar'), work('birch')]}));
    const queued = focus('cedar');
    assert.equal(api.user.focus(focus('birch', 0, 'current'), 1).ok, true);
    assert.equal(api.user.focus(queued, 2).code, 'VIEW_CONFLICT');
    const f = frame(api, 2);
    assert.equal(f.semantic.focus.id, 'birch');
    assert.equal('reconciliationPrompt' in f.semantic, false);
    paint(f);
  },
  'structurally-valid-but-not-authorised'() {
    const {api, port} = host();
    accept(port, snapshot(1, 0, {work: [work()], concerns: [concern()]}));
    assert.equal(validate(focus('cedar')).valid, true);
    assert.equal(port.submit(focus('cedar'), 1).code, 'MESSAGE_KIND');
    assert.equal(api.user.focus(focus('cedar'), 1).ok, true);
    assert.equal(validate(ack()).valid, true);
    assert.equal(api.user.acknowledge(ack(), 2).code, 'VIEW_CONFLICT');
    const f = frame(api, 2);
    assert.equal(f.semantic.concerns[0].acknowledged, false);
    assert.equal(api.user.focus(focus('unknown-private-record', 1, 'missing'), 3).code, 'TARGET_UNAVAILABLE');
    paint(f);
  }
};
for (const [id, run] of Object.entries(scenarios)) test(`embedded facade -> semantic view -> scene: ${id}`, run);
test('all eleven declared semantic scenarios exercise the embedded path', () => {
  const fixtures = JSON.parse(fs.readFileSync(new URL('../../design/api/0.1-draft/fixtures.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(scenarios).sort(), fixtures.semanticScenarios.map(s => s.id).sort());
});

test('strong cue expires, does not replay or extend, and steady concerns remain', () => {
  const {api, port} = host(), c = concern('risk', 0, {severity: severity()});
  accept(port, snapshot(1, 0, {concerns: [c]}));
  frame(api, 0);
  const first = frame(api, 10);
  assert.equal(first.cue.until, 110);
  accept(port, snapshot(2, 12, {concerns: [c, concern('another', 12, {severity: severity()})]}), 12);
  assert.equal(frame(api, 22).cue.until, 110);
  const settled = frame(api, 110);
  assert.equal(settled.cue, null);
  assert.equal(settled.speedMultiplier, 1);
  assert.equal(settled.semantic.concerns.filter(c => c.cue === 'steady-visible').length, 2);
  assert.deepEqual(frame(api, 111).newAnnouncements, []);
});

test('preferences cap opacity, reduced motion fixes positions, and disabled attention is not replayed', () => {
  const {api, port} = host();
  accept(port, snapshot(1, 0, {concerns: [concern('risk', 0, {severity: severity()})]}));
  const a = frame(api, 10, {brightness: 0.2, reducedMotion: true});
  const b = frame(api, 50, {brightness: 0.2, reducedMotion: true});
  assert.deepEqual(a.scene.lights, b.scene.lights);
  assert.equal(a.speedMultiplier, 1);
  assert.ok([...b.scene.lights, ...b.scene.glows].every(p => p.opacity <= 0.2));
  const dark = frame(api, 51, {brightness: 0});
  assert.ok([...dark.scene.lights, ...dark.scene.glows].every(p => p.opacity === 0));
  assert.equal(frame(api, 52, {attentionEnabled: false}).cue, null);
  assert.equal(frame(api, 53).cue, null);
});

test('invalid presentation input cannot consume the pending announcement', () => {
  const {api, port} = host();
  accept(port, snapshot(1, 0, {concerns: [concern('risk', 0, {severity: severity()})]}));
  assert.equal(api.user.present({now: 10, preferences: {...preferences, brightness: 2}}).code, 'PRESENTATION_INPUT');
  assert.equal(frame(api, 10).newAnnouncements.length, 1);
});

test('host-bound ports fence old producers, copied provenance and accessor input without invocation', () => {
  const ids = ['allowed'];
  const {api, port} = host({userRaisedConcernIds: ids});
  ids.push('forged');
  assert.equal(port.submit(snapshot(1, 0, {concerns: [concern('forged', 0, {origin: 'user'})]}), 0).code, 'USER_PROVENANCE');
  let invoked = false;
  const input = Object.defineProperty({}, 'kind', {enumerable: true, get() { invoked = true; return 'producer.snapshot'; }});
  assert.equal(port.submit(input, 0).code, 'JSON_DATA');
  assert.equal(invoked, false);
  const rotated = api.admitProducer({producerId: 'demo', session: 'session-b', generation: 2, leaseMs: 1000}, 1);
  assert.equal(rotated.ok, true);
  assert.equal(port.submit(snapshot(1, 2), 2).code, 'SCOPE_OR_SESSION');
  accept(rotated.port, snapshot(1, 3, {session: 'session-b'}), 3);
  const caps = api.capabilities(); caps.messageKinds.push('fake');
  assert.equal(api.capabilities().messageKinds.includes('fake'), false);
  assert.equal(api.capabilities().liveAuthentication, false);
});

test('duplicate old acknowledgement cannot silence a newer cue or reacknowledge unseen revision', () => {
  const {api, port} = host(), c = concern('risk', 0, {severity: severity()});
  accept(port, snapshot(1, 0, {concerns: [c]})); frame(api, 10);
  const seen = ack();
  assert.equal(api.user.acknowledge(seen, 11).ok, true);
  accept(port, snapshot(2, 12, {concerns: [{...c, revision: 2, severity: severity('critical')}]}), 12);
  frame(api, 22);
  assert.equal(api.user.acknowledge(seen, 23).duplicate, true);
  const f = frame(api, 23);
  assert.notEqual(f.cue, null);
  assert.equal(f.semantic.concerns[0].acknowledged, false);
});

test('real Canvas pixels follow accepted concern and closure while acknowledgement preserves the steady cue', {skip: !canvasLibrary}, () => {
  const {api, port} = host({userRaisedConcernIds: ['worry']});
  accept(port, snapshot(1, 0, {work: [work()]}));
  const quiet = paint(frame(api, 0, {reducedMotion: true}));
  const c = concern('worry', 1, {origin: 'user', severity: severity()});
  accept(port, snapshot(2, 1, {work: [work()], concerns: [c]}), 1);
  const warned = paint(frame(api, 11, {reducedMotion: true}));
  assert.notEqual(warned, quiet);
  assert.equal(api.user.acknowledge(ack('worry'), 12).ok, true);
  assert.equal(paint(frame(api, 12, {reducedMotion: true})), warned);
  assert.equal(api.user.resolveConcern({producerId: 'demo', id: 'worry', revision: 1, reason: 'Reviewed the check', expectedViewRevision: 1}, 13).ok, true);
  assert.equal(paint(frame(api, 13, {reducedMotion: true})), quiet);
});

test('acknowledging the latest cosmetic revision dismisses an older active cue', () => {
  const {api, port} = host(), c = concern('risk', 0, {severity: severity()});
  accept(port, snapshot(1, 0, {concerns: [c]})); frame(api, 10);
  accept(port, snapshot(2, 11, {concerns: [{...c, revision: 2, summary: 'Clearer wording'}]}), 11);
  assert.equal(api.user.acknowledge(ack('risk', 2), 12).ok, true);
  const f = frame(api, 12);
  assert.equal(f.cue, null);
  assert.equal(f.semantic.concerns[0].lifecycle, 'open');
  assert.equal(f.semantic.concerns[0].cue, 'steady-visible');
});

test('attention actually advances the scene clock faster, then returns to steady speed', () => {
  const {api, port} = host();
  accept(port, snapshot(1, 0, {concerns: [concern('risk', 0, {severity: severity()})]}));
  frame(api, 0); frame(api, 10);
  assert.ok(Math.abs(frame(api, 60).scene.time - 0.09) < 1e-10);
  assert.equal(frame(api, 110).speedMultiplier, 1);
  const a = frame(api, 120), b = frame(api, 130);
  assert.ok(Math.abs(b.scene.time - a.scene.time - 0.01) < 1e-10);
});

test('invalid snapshot cannot alter displayed facts or reduced-motion pixels', {skip: !canvasLibrary}, () => {
  const {api, port} = host();
  accept(port, snapshot(1, 0, {work: [work('cedar')]}));
  const before = frame(api, 0, {reducedMotion: true});
  const invalid = snapshot(2, 1, {work: [work('replacement', 1)], concerns: [concern('bad', 1, {workId: 'absent'})]});
  assert.equal(validate(invalid).valid, true);
  assert.equal(port.submit(invalid, 1).code, 'REFERENCE');
  const after = frame(api, 1, {reducedMotion: true});
  assert.deepEqual(after.semantic.work.map(w => w.id), ['cedar']);
  assert.equal(after.semantic.sources[0].revision, 1);
  assert.equal(paint(after), paint(before));
});

test('many concerns share finite light groups without dropping inspectable records or focus', () => {
  const {api, port} = host();
  const concerns = Array.from({length: 30}, (_, i) => concern(`risk-${i}`, 0, {severity: severity()}));
  accept(port, snapshot(1, 0, {work: [work('focused')], concerns}));
  assert.equal(api.user.focus(focus('focused'), 0).ok, true);
  const f = frame(api, 10);
  assert.equal(f.semantic.concerns.length, 30);
  assert.equal(f.groups.flatMap(g => g.items).length, 30);
  assert.equal(f.newAnnouncements.length, 1);
  assert.equal(f.newAnnouncements[0].items.length, 30);
  assert.equal(f.semantic.focus.id, 'focused');
  paint(f);
});
