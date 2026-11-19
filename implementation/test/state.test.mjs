import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createStateHandler} from '../core/state.mjs';

const fixtures = JSON.parse(fs.readFileSync(new URL('../../design/api/0.1-draft/fixtures.json', import.meta.url), 'utf8'));
const oracle = fileURLToPath(new URL('./helpers/schema_oracle.py', import.meta.url));
const validationCache = new Map();
function validate(message) {
  const key = JSON.stringify(message);
  if (!validationCache.has(key)) {
    const result = spawnSync('python3', [oracle], {input: key, encoding: 'utf8', timeout: 15000, maxBuffer: 4096});
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    validationCache.set(key, JSON.parse(result.stdout));
  }
  return validationCache.get(key);
}
const epochMs = Date.parse('2026-11-10T12:00:00Z');
const stamp = now => new Date(epochMs + now).toISOString();
const user = {kind: 'user', userId: 'alex-demo', workspaceId: 'workspace-demo'};
const writer = {kind: 'producer', workspaceId: 'workspace-demo', producerId: 'demo', generation: 1};
function harness() {
  const h = createStateHandler({userId: user.userId, workspaceId: user.workspaceId, validate,
    policy: {epochMs, observationTtlMs: 100, futureSkewMs: 5, groupWindowMs: 10}});
  assert.equal(h.admitProducer({producerId: 'demo', session: 'session-a', generation: 1, leaseMs: 100}, 0).ok, true);
  return h;
}
function work(id = 'cedar', now = 0, extra = {}) {
  return {id, label: id, observedAt: stamp(now), lifecycle: 'running', ...extra};
}
function concern(id = 'compatibility', now = 0, extra = {}) {
  return {id, revision: 1, observedAt: stamp(now), origin: 'producer', lifecycle: 'open', summary: 'Synthetic concern', ...extra};
}
function severity(level = 'significant', assessment = 'established', impact = 'Substantial recoverable rework') {
  return {level, assessment, impact, evidence: 'Synthetic observed evidence'};
}
function snapshot(revision = 1, now = 0, extra = {}) {
  return {kind: 'producer.snapshot', version: '0.1-draft', session: 'session-a', revision, observedAt: stamp(now), work: [], concerns: [], attentionItems: [], ...extra};
}
function ack(id, revision = 1, expectedViewRevision = 0, requestId = 'ack-1') {
  return {kind: 'user.acknowledge', version: '0.1-draft', requestId, expectedViewRevision, concern: {producerId: 'demo', kind: 'concern', id}, concernRevision: revision};
}
function focus(id, expectedViewRevision = 0, requestId = 'focus-1') {
  return {kind: 'user.focus', version: '0.1-draft', requestId, expectedViewRevision,
    target: id === null ? null : {producerId: 'demo', kind: 'work', id}};
}
const view = (h, now = 0, context = user) => h.read(context, now);
const currentConcern = (h, now = 0) => view(h, now).producers[0].concerns[0];
const accept = (h, message, now = 0, context = writer) => assert.equal(h.receive(message, context, now).ok, true);

test('resolved concern history still fences stale revisions and origin changes after omission', () => {
  const h = harness(), c = concern('risk', 0, {severity: severity()});
  accept(h, snapshot(1, 0, {concerns: [c]}));
  const resolved = {...c, revision: 2, lifecycle: 'resolved', resolution: {reason: 'Synthetic check passed'}};
  accept(h, snapshot(2, 1, {concerns: [resolved]}), 1);
  accept(h, snapshot(3, 2), 2);
  assert.equal(view(h, 2).producers[0].concerns.length, 0, 'omitted resolved records need not stay in the visible view');
  assert.equal(h.receive(snapshot(4, 3, {concerns: [c]}), writer, 3).code, 'CONCERN_REVISION');
  const changedOrigin = {...c, revision: 3, origin: 'user'};
  assert.equal(h.receive(snapshot(4, 4, {concerns: [changedOrigin]}), {...writer, userRaisedConcernIds: ['risk']}, 4).code, 'ORIGIN_CONFLICT');
  accept(h, snapshot(4, 5, {concerns: [resolved]}), 5);
  assert.equal(h.receive(ack('risk', 1), user, 6).ok, true, 'previously known revision remains known');
  assert.deepEqual(h.flush(user, 15).announcements, []);
});

test('retargeted time-sensitive response renews attention without inventing greater severity', () => {
  const h = harness();
  const request = {id: 'q', workId: 'cedar', state: 'open', category: 'time-sensitive', summary: 'Synthetic slot', request: 'Use it?',
    timing: {basis: 'Slot available now', consequenceOfDelay: 'Slot may be reassigned'}};
  const tasks = [work('cedar'), work('birch')];
  accept(h, snapshot(1, 0, {work: tasks, attentionItems: [request]}));
  h.flush(user, 10);
  accept(h, snapshot(2, 11, {work: tasks, attentionItems: [{...request, workId: 'birch'}]}), 11);
  const announcements = h.flush(user, 21).announcements;
  assert.equal(announcements.length, 1, 'a request for a different work item is a changed response need');
  assert.equal(announcements[0].items[0].reason, 'timing-or-request-changed');
  assert.equal(view(h, 21).producers[0].attentionItems[0].workId, 'birch');
});

test('changed response for an omitted acknowledged concern renews attention without refreshing its observation', () => {
  const h = harness(), c = concern('risk', 0, {severity: severity()});
  accept(h, snapshot(1, 0, {concerns: [c]}));
  h.flush(user, 10);
  accept(h, ack('risk'), 11, user);
  const request = {id: 'choice', concernId: 'risk', state: 'open', category: 'needs-you', summary: 'Recovery choice', request: 'Choose a recovery target'};
  accept(h, snapshot(2, 12, {attentionItems: [request]}), 12);
  const announcements = h.flush(user, 22).announcements;
  assert.equal(announcements.length, 1);
  assert.equal(announcements[0].items[0].reason, 'impact-or-response-changed');
  const retained = currentConcern(h, 22);
  assert.equal(retained.sourceOmitted, true);
  assert.equal(retained.observedAt, stamp(0));
  assert.equal(retained.lastReportedAt, 0);
  accept(h, snapshot(3, 23, {attentionItems: [request]}), 23);
  assert.deepEqual(h.flush(user, 33).announcements, []);
});

test('cosmetic revisions do not erase acknowledgement history for later meaningful minor-concern changes', () => {
  const original = concern('minor-risk', 0, {severity: severity('minor', 'established', 'Small recoverable delay')});
  for (const omit of [false, true]) {
    const h = harness();
    accept(h, snapshot(1, 0, {concerns: [original]}));
    accept(h, ack('minor-risk'), 1, user);
    const cosmetic = {...original, revision: 2, observedAt: stamp(2), summary: 'Clearer wording, unchanged consequences'};
    accept(h, snapshot(2, 2, {concerns: [cosmetic]}), 2);
    assert.deepEqual(h.flush(user, 12).announcements, []);
    assert.equal(currentConcern(h, 12).acknowledged, false, 'a new revision is not silently acknowledged');
    const request = {id: 'choice', concernId: original.id, state: 'open', category: 'needs-you', summary: 'New response needed', request: 'Choose a recovery target'};
    accept(h, snapshot(3, 13, {concerns: omit ? [] : [cosmetic], attentionItems: [request]}), 13);
    const announcements = h.flush(user, 23).announcements;
    assert.equal(announcements.length, 1, `earlier acknowledgement survives cosmetic revision; omitted=${omit}`);
    assert.equal(announcements[0].items[0].reason, 'impact-or-response-changed');
    assert.equal(currentConcern(h, 23).severity.level, 'minor');
    assert.equal(currentConcern(h, 23).acknowledged, false);
    assert.equal(view(h, 23).acknowledgements[0].revision, 1);
  }
  const quiet = harness();
  accept(quiet, snapshot(1, 0, {concerns: [original]}));
  const changed = {...original, revision: 2, severity: {...original.severity, impact: 'Another small recoverable delay'}};
  accept(quiet, snapshot(2, 1, {concerns: [changed]}), 1);
  assert.deepEqual(quiet.flush(user, 11).announcements, [], 'unacknowledged minor concerns do not acquire a stronger default cue');
});

test('unsupported required features reject atomically; optional extensions remain inert', () => {
  const h = harness();
  accept(h, snapshot(1, 0, {concerns: [concern()]}));
  assert.equal(h.receive(snapshot(2, 1, {requiredFeatures: ['future/special']}), writer, 1).code, 'UNSUPPORTED_FEATURE');
  assert.equal(view(h, 1).producers[0].revision, 1);
  assert.equal(currentConcern(h, 1).sourceOmitted, false);
  accept(h, snapshot(2, 2, {extensions: {'future/special': {data: 'inert'}}}), 2);
});

test('withdrawn or downgraded attention requests cannot emit obsolete grouped cues', () => {
  const request = {id: 'q', state: 'open', category: 'time-sensitive', summary: 'Synthetic slot', request: 'Use it?',
    timing: {basis: 'Slot available now', consequenceOfDelay: 'Slot may be reassigned'}};
  for (const replacement of [[], [{...request, state: 'withdrawn'}], [{...request, state: 'answered'}], [{id: 'q', state: 'open', category: 'needs-you', summary: 'No deadline', request: 'Choose later'}]]) {
    const h = harness();
    accept(h, snapshot(1, 0, {attentionItems: [request]}));
    accept(h, snapshot(2, 1, {attentionItems: replacement}), 1);
    assert.deepEqual(h.flush(user, 10).announcements, []);
  }
});

test('downgraded new concerns and retracted confirmation do not emit obsolete cues', () => {
  const h = harness(), c = concern('risk', 0, {severity: severity()});
  accept(h, snapshot(1, 0, {concerns: [c]}));
  accept(h, snapshot(2, 1, {concerns: [{...c, revision: 2, severity: severity('minor')}]}), 1);
  assert.deepEqual(h.flush(user, 10).announcements, []);
  const p = harness(), provisional = concern('risk', 0, {severity: severity('critical', 'provisional')});
  accept(p, snapshot(1, 0, {concerns: [provisional]}));
  p.flush(user, 10);
  accept(p, snapshot(2, 11, {concerns: [{...provisional, revision: 2, severity: severity('critical')}]}), 11);
  accept(p, snapshot(3, 12, {concerns: [{...provisional, revision: 3}]}), 12);
  assert.deepEqual(p.flush(user, 21).announcements, []);
});

test('older acknowledgements cannot silence a newer concern; request IDs are idempotent', () => {
  const h = harness(), c = concern('risk', 0, {severity: severity()});
  accept(h, snapshot(1, 0, {concerns: [c]}));
  accept(h, snapshot(2, 1, {concerns: [{...c, revision: 2, severity: severity('critical')}]}), 1);
  const request = ack('risk', 1);
  accept(h, request, 2, user);
  assert.equal(h.receive(request, user, 3).duplicate, true);
  assert.equal(h.receive({...request, concernRevision: 2}, user, 4).code, 'REQUEST_CONFLICT');
  assert.equal(currentConcern(h, 4).acknowledged, false);
  assert.equal(h.flush(user, 10).announcements[0].items[0].revision, 2);
  assert.equal(h.receive(snapshot(3, 11, {concerns: [c]}), writer, 11).code, 'CONCERN_REVISION');
  assert.equal(view(h, 11).producers[0].revision, 2);
});

test('group window is not extended by later arrivals and prototype-looking IDs remain data', () => {
  const h = harness();
  accept(h, snapshot(1, 0, {concerns: [concern('__proto__', 0, {severity: severity()})]}));
  accept(h, snapshot(2, 9, {concerns: [concern('__proto__', 0, {severity: severity()}), concern('constructor', 9, {severity: severity()})]}), 9);
  const batch = h.flush(user, 10).announcements[0];
  assert.equal(batch.dueAt, 10);
  assert.deepEqual(batch.items.map(x => x.id), ['__proto__', 'constructor']);
  assert.equal({}.polluted, undefined);
});

test('state input oracle asserts all 21 schema fixture outcomes, including date-time', () => {
  for (const c of fixtures.cases) assert.equal(validate(c.message).valid, c.schemaValid, c.id);
});

const scenarios = {
  'critical-managed-versus-harmless-blocked'() {
    const h = harness();
    const critical = concern('recovery', 0, {severity: severity('critical', 'provisional', 'Possible irreversible loss')});
    accept(h, snapshot(1, 0, {work: [work('birch', 0, {lifecycle: 'waiting', wait: {party: 'user', reason: 'Harmless draft choice'}})], concerns: [critical], attentionItems: [
      {id: 'info', concernId: 'recovery', state: 'open', category: 'for-awareness', summary: 'Already being investigated'},
      {id: 'choice', workId: 'birch', state: 'open', category: 'needs-you', summary: 'A choice', request: 'Choose a draft'}
    ]}));
    const p = view(h).producers[0];
    assert.equal(p.concerns[0].severity.assessment, 'provisional');
    assert.deepEqual(p.attentionItems.map(a => a.category), ['for-awareness', 'needs-you']);
    assert.equal(p.attentionItems[0].request, undefined);
    assert.equal(p.attentionItems[1].timing, undefined);
    const items = h.flush(user, 10).announcements[0].items;
    assert.deepEqual(items.map(i => i.id), ['recovery']);
    assert.equal(p.work[0].wait.party, 'user');
  },
  'minor-but-time-sensitive'() {
    const h = harness();
    accept(h, snapshot(1, 0, {concerns: [concern('slot', 0, {severity: severity('minor', 'established', 'Small recoverable delay')})], attentionItems: [
      {id: 'use-slot', concernId: 'slot', state: 'open', category: 'time-sensitive', summary: 'Slot may be released', request: 'Use the slot?', timing: {basis: 'Operator available now', consequenceOfDelay: 'The slot may be reassigned'}}
    ]}));
    const p = view(h).producers[0];
    assert.equal(p.concerns[0].severity.level, 'minor');
    assert.equal(p.attentionItems[0].timing.deadline, undefined);
    assert.equal(h.flush(user, 10).announcements[0].items[0].id, 'use-slot');
  },
  'success-does-not-resolve'() {
    const h = harness();
    accept(h, snapshot(1, 0, {work: [work('cedar', 0, {lifecycle: 'finished', result: {outcome: 'succeeded', summary: 'Checks passed'}})], concerns: [concern('compatibility', 0, {workId: 'cedar'})]}));
    assert.equal(h.receive(ack('compatibility'), user, 1).ok, true);
    const p = view(h, 1).producers[0];
    assert.equal(p.work[0].result.outcome, 'succeeded');
    assert.equal(p.concerns[0].lifecycle, 'open');
    assert.equal(p.concerns[0].severityAssessment, 'unassessed');
    assert.equal(p.concerns[0].acknowledged, true);
    assert.equal(p.concerns[0].cue, 'steady-visible');
    assert.equal(p.concerns[0].userResolution, undefined);
  },
  'omitted-concern'() {
    const h = harness();
    accept(h, snapshot(1, 0, {work: [work()], concerns: [concern('compatibility', 0, {workId: 'cedar', severity: severity()})]}));
    assert.equal(h.flush(user, 10).announcements.length, 1);
    accept(h, snapshot(2, 20, {work: [work('cedar', 20, {activity: 'checking'})]}), 20);
    let p = view(h, 20).producers[0];
    assert.equal(p.work[0].activity, 'checking');
    assert.equal(p.concerns[0].sourceOmitted, true);
    assert.equal(p.concerns[0].observedAt, stamp(0));
    assert.equal(p.concerns[0].lastReportedAt, 0);
    assert.equal(p.concerns[0].revision, 1);
    assert.equal(p.concerns[0].lifecycle, 'open');
    const repeat = snapshot(3, 110, {work: [work('cedar', 110)]});
    accept(h, repeat, 110);
    p = view(h, 110).producers[0];
    assert.equal(p.work[0].freshness, 'current');
    assert.equal(p.concerns[0].freshness, 'stale');
    assert.deepEqual(h.flush(user, 120).announcements, []);
    assert.equal(h.receive(repeat, writer, 121).duplicate, true);
    assert.equal(view(h, 211).producers[0].lease, 'expired', 'retry must not renew lease');
  },
  'stale-important-task'() {
    const h = harness();
    assert.equal(h.admitProducer({producerId: 'other', session: 'other-a', generation: 1, leaseMs: 100}, 0).ok, true);
    accept(h, snapshot(1, 0, {work: [work()], concerns: [concern('important', 0, {severity: severity()})]}));
    accept(h, snapshot(1, 90, {session: 'other-a', work: [work('birch', 90)]}), 90, {...writer, producerId: 'other'});
    const producers = view(h, 110).producers;
    assert.equal(producers[0].concerns[0].freshness, 'stale');
    assert.equal(producers[0].concerns[0].severity.level, 'significant');
    assert.equal(producers[0].concerns[0].lifecycle, 'open');
    assert.equal(producers[0].work[0].lifecycle, 'running');
    assert.equal(producers[0].attentionItems.length, 0);
    assert.equal(producers[1].work[0].freshness, 'current');
  },
  'combined-arrivals'() {
    const h = harness();
    accept(h, snapshot(1, 0, {work: [work('focused')]}));
    assert.equal(h.receive(focus('focused'), user, 0).ok, true);
    const c1 = concern('one', 1, {severity: severity()});
    accept(h, snapshot(2, 1, {work: [work('focused', 1)], concerns: [c1]}), 1);
    const c2 = concern('two', 5, {severity: severity('critical', 'provisional', 'Possible severe loss')});
    accept(h, snapshot(3, 5, {work: [work('focused', 5)], concerns: [c1, c2]}), 5);
    assert.deepEqual(h.flush(user, 10).announcements, []);
    const group = h.flush(user, 11).announcements;
    assert.equal(group.length, 1);
    assert.equal(group[0].presentation, 'brief-then-steady');
    assert.deepEqual(group[0].items.map(x => x.id), ['one', 'two']);
    assert.equal(view(h, 11).focus.id, 'focused');
    assert.equal(view(h, 11).producers[0].concerns.length, 2);
    assert.deepEqual(h.flush(user, 30).announcements, []);
  },
  'confirmed-acknowledged-critical'() {
    const h = harness();
    const before = concern('risk', 0, {severity: severity('critical', 'provisional', 'Possible severe loss')});
    accept(h, snapshot(1, 0, {concerns: [before]}));
    h.flush(user, 10);
    assert.equal(h.receive(ack('risk'), user, 11).ok, true);
    const confirmed = {...before, revision: 2, observedAt: stamp(20), severity: {...before.severity, assessment: 'established', evidence: 'Now confirmed'}};
    accept(h, snapshot(2, 20, {concerns: [confirmed]}), 20);
    assert.equal(h.flush(user, 30).announcements[0].items[0].reason, 'critical-confirmed');
    assert.equal(view(h, 30).acknowledgements[0].revision, 1);
    assert.equal(currentConcern(h, 30).acknowledged, false, 'unseen revision not silently acknowledged');
    accept(h, snapshot(3, 31, {concerns: [confirmed]}), 31);
    assert.deepEqual(h.flush(user, 50).announcements, []);
    assert.equal(currentConcern(h, 50).cue, 'steady-visible');
  },
  'user-raised-concern-resolution'() {
    const h = harness();
    const c = concern('my-worry', 0, {origin: 'user', severity: severity()});
    assert.equal(h.receive(snapshot(1, 0, {concerns: [c]}), writer, 0).code, 'USER_PROVENANCE');
    const trustedOrigin = {...writer, userRaisedConcernIds: ['my-worry']};
    accept(h, snapshot(1, 0, {concerns: [c]}), 0, trustedOrigin);
    const checked = {...c, revision: 2, observedAt: stamp(1), severity: {...c.severity, evidence: 'Relevant synthetic check passed'}};
    const suggestion = {id: 'review-check', concernId: 'my-worry', state: 'open', category: 'for-awareness', summary: 'Check passed; consider resolving after reviewing the evidence'};
    accept(h, snapshot(2, 1, {concerns: [checked], attentionItems: [suggestion]}), 1, trustedOrigin);
    assert.equal(currentConcern(h, 1).severity.evidence, checked.severity.evidence);
    assert.equal(view(h, 1).producers[0].attentionItems[0].summary, suggestion.summary);
    assert.equal(currentConcern(h, 1).lifecycle, 'open', 'evidence and a suggestion do not close the concern');
    const resolved = {...checked, revision: 3, observedAt: stamp(2), lifecycle: 'resolved', resolution: {reason: 'Check passed'}};
    assert.equal(h.receive(snapshot(3, 2, {concerns: [resolved]}), writer, 2).code, 'USER_RESOLUTION_REQUIRED');
    const closure = {producerId: 'demo', id: 'my-worry', revision: 2, reason: 'I reviewed the relevant evidence', expectedViewRevision: 0};
    assert.equal(h.resolveConcern(closure, writer, 3).ok, false);
    assert.equal(h.resolveConcern(closure, user, 3).ok, true);
    assert.equal(currentConcern(h, 3).lifecycle, 'resolved');
    assert.equal(currentConcern(h, 3).userResolution.reason, closure.reason);
    accept(h, snapshot(3, 4, {concerns: [checked]}), 4, trustedOrigin);
    assert.equal(currentConcern(h, 4).lifecycle, 'resolved', 'old source fact cannot undo user closure');
    assert.equal(h.receive(snapshot(4, 5, {concerns: [{...checked, revision: 3, observedAt: stamp(5)}]}), writer, 5).code, 'USER_CLOSED_REVISION_CONFLICT');
  },
  'shared-user-focus-and-acknowledgement'() {
    const h = harness();
    accept(h, snapshot(1, 0, {work: [work('cedar'), work('birch')], concerns: [concern()]}));
    const displayA = {...user}, displayB = {...user};
    assert.equal(h.receive(focus('birch'), displayA, 1).ok, true);
    assert.equal(view(h, 1, displayB).focus.id, 'birch');
    assert.equal(h.receive(ack('compatibility', 1, 1), displayB, 2).ok, true);
    assert.equal(currentConcern(h, 2).acknowledged, true);
    assert.equal(currentConcern(h, 2).lifecycle, 'open');
    assert.equal(view(h, 2, {...user, userId: 'another-user'}).ok, false);
    assert.equal(view(h, 2, {...user, workspaceId: 'another-workspace'}).ok, false);
  },
  'reconnect-superseded-focus'() {
    const h = harness();
    accept(h, snapshot(1, 0, {work: [work('cedar'), work('birch')]}));
    const oldQueued = focus('cedar', 0, 'offline-old');
    assert.equal(h.receive(focus('birch', 0, 'connected-new'), user, 1).ok, true);
    assert.equal(h.receive(oldQueued, user, 2).code, 'VIEW_CONFLICT');
    const restored = view(h, 2);
    assert.equal(restored.focus.id, 'birch');
    assert.equal(restored.viewRevision, 1);
    assert.equal('reconciliationPrompt' in restored, false);
  },
  'structurally-valid-but-not-authorised'() {
    const h = harness();
    accept(h, snapshot(1, 0, {work: [work()], concerns: [concern()]}));
    const f = focus('cedar');
    assert.equal(validate(f).valid, true);
    assert.equal(h.receive(f, {...user, userId: 'other'}, 1).code, 'SCOPE_OR_ACTOR');
    assert.equal(h.receive(f, {...user, workspaceId: 'other'}, 1).ok, false);
    assert.equal(view(h, 1).focus, null);
    assert.equal(h.receive(f, user, 2).ok, true);
    const staleAck = ack('compatibility', 1, 0);
    assert.equal(validate(staleAck).valid, true);
    assert.equal(h.receive(staleAck, user, 3).code, 'VIEW_CONFLICT');
    assert.equal(currentConcern(h, 3).acknowledged, false);
    const unavailable = focus('other-users-private-item', 1, 'unknown');
    assert.equal(h.receive(unavailable, user, 4).code, 'TARGET_UNAVAILABLE');
  }
};
test('every declared semantic scenario has an executable state test', () => {
  assert.deepEqual(Object.keys(scenarios).sort(), fixtures.semanticScenarios.map(s => s.id).sort());
});
for (const scenario of fixtures.semanticScenarios) test('semantic: ' + scenario.id, scenarios[scenario.id]);

test('state ordering, exact retries, future timestamps and fenced producer sessions', () => {
  const h = harness(), first = snapshot(2, 0, {work: [work()]});
  accept(h, first);
  assert.equal(h.receive(snapshot(1), writer, 1).code, 'STALE_REVISION');
  assert.equal(h.receive({...first, work: []}, writer, 2).code, 'REVISION_CONFLICT');
  assert.equal(h.receive(first, writer, 3).duplicate, true);
  assert.equal(h.receive(snapshot(3, 1000), writer, 4).code, 'OBSERVATION_TIME');
  assert.equal(h.admitProducer({producerId: 'demo', session: 'session-b', generation: 2, leaseMs: 100}, 5).ok, true);
  assert.equal(view(h, 5).producers[0].lease, 'unknown');
  assert.equal(h.receive(snapshot(3, 6), writer, 6).code, 'SCOPE_OR_SESSION');
  accept(h, snapshot(1, 7, {session: 'session-b', work: [work('new', 7)]}), 7, {...writer, generation: 2});
  assert.equal(view(h, 7).producers[0].work[0].id, 'new');
  assert.equal(h.admitProducer({producerId: 'demo', session: 'session-a', generation: 3, leaseMs: 100}, 8).code, 'ADMISSION_CONFLICT');
  assert.equal(view(h, 2).code, 'CLOCK');
});

test('invalid snapshots reject atomically; omitted work is not success', () => {
  const h = harness();
  accept(h, snapshot(1, 0, {work: [work()], concerns: [concern('risk', 0, {workId: 'cedar'})]}));
  const invalid = snapshot(2, 1, {work: [work('new', 1), work('new', 1)]});
  assert.equal(h.receive(invalid, writer, 1).code, 'DUPLICATE_ID');
  assert.equal(view(h, 1).producers[0].revision, 1);
  assert.equal(currentConcern(h, 1).sourceOmitted, false);
  accept(h, snapshot(2, 2), 2);
  const p = view(h, 2).producers[0];
  assert.equal(p.retainedWork[0].tracking, 'last-known-reference');
  assert.equal(p.retainedWork[0].freshness, 'unknown');
  assert.equal(p.retainedWork[0].lifecycle, 'running', 'last-known fact, not inferred success');
  assert.equal(p.concerns[0].sourceOmitted, true);
  assert.equal(h.receive(snapshot(3, 3, {work: [work('one', 3, {parentId: 'two'}), work('two', 3, {parentId: 'one'})]}), writer, 3).code, 'PARENT_CYCLE');
  assert.equal(h.receive(snapshot(3, 3, {work: [work('one', 3, {progress: {completed: 3, total: 2, unit: 'checks', basis: 'Observed'}})]}), writer, 3).code, 'PROGRESS');
});

test('cosmetic/evidence changes stay quiet; changed impact or response renews attention', () => {
  const h = harness(), c = concern('risk', 0, {severity: severity()});
  accept(h, snapshot(1, 0, {concerns: [c]})); h.flush(user, 10);
  assert.equal(h.receive(ack('risk'), user, 11).ok, true);
  const cosmetic = {...c, revision: 2, observedAt: stamp(20), summary: 'A clearer explanation', severity: {...c.severity, impact: '  Substantial   recoverable rework  ', evidence: 'More evidence, unchanged impact'}};
  accept(h, snapshot(2, 20, {concerns: [cosmetic]}), 20);
  assert.deepEqual(h.flush(user, 30).announcements, []);
  const changed = {...cosmetic, revision: 3, observedAt: stamp(40), severity: {...cosmetic.severity, impact: 'A materially different consequence'}};
  accept(h, snapshot(3, 40, {concerns: [changed]}), 40);
  assert.equal(h.flush(user, 50).announcements[0].items[0].reason, 'impact-or-response-changed');
  assert.equal(h.receive(ack('risk', 3, 1, 'ack-latest'), user, 51).ok, true);
  const question = {id: 'q', concernId: 'risk', state: 'open', category: 'needs-you', summary: 'Choose a response', request: 'Choose a recovery target'};
  accept(h, snapshot(4, 60, {concerns: [changed], attentionItems: [question]}), 60);
  assert.equal(h.flush(user, 70).announcements[0].items[0].id, 'risk');
});

test('caller data and output copies cannot mutate state; validator failure fails closed', () => {
  const h = harness(), message = snapshot(1, 0, {work: [work()]});
  accept(h, message); message.work[0].label = 'mutated';
  const v = view(h); v.producers[0].work[0].label = 'also mutated';
  assert.equal(view(h).producers[0].work[0].label, 'cedar');
  let getterRan = false;
  const getter = {get kind() { getterRan = true; return 'producer.snapshot'; }};
  assert.equal(h.receive(getter, writer, 1).code, 'JSON_DATA');
  assert.equal(getterRan, false);
  assert.equal(h.receive({...snapshot(2), revision: NaN}, writer, 1).code, 'JSON_DATA');
  const failed = createStateHandler({userId: user.userId, workspaceId: user.workspaceId, validate() { throw Error('no validator'); }, policy: {epochMs, observationTtlMs: 100, futureSkewMs: 5, groupWindowMs: 10}});
  assert.equal(failed.receive(snapshot(), writer, 0).code, 'VALIDATOR_FAILURE');
  const source = fs.readFileSync(new URL('../core/state.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^import |\b(?:Date\.now|performance\.now|setTimeout|fetch|process|document|window)\b/m);
});
