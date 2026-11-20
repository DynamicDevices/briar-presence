import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createTurmoProjection} from '../api/turmo.mjs';
import {drawTurmo} from '../renderers/turmo.mjs';
import {host, accept, snapshot, work, concern, severity, ack, preferences} from './helpers/embedded-fixtures.mjs';

const settings = {transitionMs: 400, carouselMs: 200, maxAnimationStepMs: 500, seed: 1234,
  speeds: {idle: 0.3, working: 0.8, waiting: 0.4, attention: 1.2, unknown: 0.2}};
function setup() {
  const {api, port} = host({userId: 'sam', workspaceId: 'bench'});
  const remote = api.admitProducer({producerId: 'other', session: 'other-session', generation: 1, leaseMs: 5000}, 0);
  assert.equal(remote.ok, true);
  const state = {connected: true, override: null};
  const display = createTurmoProjection({...settings, userId: 'sam', workspaceId: 'bench', userLabel: 'Sam',
    producerLabels: {demo: 'Local harness', other: 'Other harness'}, ownerCurrent: () => state.connected,
    readAccepted: now => state.override ?? api.user.read(now)});
  return {api, port, other: remote.port, state, display};
}
const frame = (display, now, prefs = {}) => {
  const value = display.frame({now, preferences: {...preferences, ...prefs}});
  assert.equal(value.ok, true, value.code); return value;
};
const xy = value => value.scene.lights.map(p => [p.x, p.y]);
function populate(port, other) {
  accept(port, snapshot(1, 0, {work: Array.from({length: 4}, (_, i) => work(`job-${i}`))}));
  accept(other, snapshot(1, 0, {session: 'other-session', work: Array.from({length: 4}, (_, i) => work(`job-${i}`))}));
}

test('all eight work records contribute independently of the two visible carousel rows', () => {
  const {port, other, display} = setup(); populate(port, other);
  const first = frame(display, 0), next = frame(display, 250);
  assert.equal(first.semantic.workCount, 8); assert.equal(first.rows.length, 2);
  assert.equal(new Set(first.semantic.rows.map(r => r.key)).size, 8);
  assert.notDeepEqual(first.rows.map(r => r.key), next.rows.map(r => r.key));
  assert.equal(first.groups.reduce((n, g) => n + g.keys.length, 0), 8);
  assert.equal(first.scene.lights.length, 1170);
  assert.notDeepEqual(xy(first), xy(next), 'ongoing geometry needs no new producer packet');
  assert.notEqual(first.ring.angle, next.ring.angle);
});

test('waits use configured identities, finished outcomes remain explicit, and acknowledgement is not resolution', () => {
  const {api, port, display} = setup();
  accept(port, snapshot(1, 0, {work: [work('job', 0, {lifecycle: 'waiting', wait: {party: 'user', reason: 'Choose the draft'}})],
    concerns: [concern('risk', 0, {workId: 'job', severity: severity('critical', 'provisional')})]}));
  const first = frame(display, 0);
  assert.equal(first.rows[0].nextActor, 'Sam');
  assert.equal(first.rows[0].concerns[0].assessment, 'provisional');
  assert.equal(api.user.acknowledge(ack(), 1).ok, true);
  accept(port, snapshot(2, 2, {work: [work('job', 2, {lifecycle: 'finished', result: {outcome: 'succeeded', summary: 'Done'}})]}), 2);
  const finished = frame(display, 3);
  assert.equal(finished.semantic.concernCount, 1);
  assert.equal(finished.rows[0].outcome, 'succeeded');
  assert.equal(finished.rows[0].concerns[0].acknowledged, true);
  assert.equal(finished.semantic.concerns[0].sourceOmitted, true);
});

test('one expired producer cannot freeze or refresh an independent current producer', () => {
  const {port, other, display} = setup(); populate(port, other);
  frame(display, 0);
  accept(other, snapshot(2, 500, {session: 'other-session', work: [work('job-0', 500)]}), 500);
  const mixed = frame(display, 1100);
  assert.equal(mixed.semantic.mode, 'working');
  assert.equal(mixed.semantic.rows.find(r => r.producerId === 'demo').freshness, 'unknown');
  assert.equal(mixed.semantic.rows.find(r => r.producerId === 'other' && r.id === 'job-0').freshness, 'current');
  assert.equal(mixed.semantic.workCount, 8, 'omitted work remains last-known, not succeeded');
});

test('owner loss keeps geometry and concerns, makes facts unknown and labels the neutral bar', () => {
  const {port, display, state} = setup();
  accept(port, snapshot(1, 0, {work: [work('job')], concerns: [concern()]}));
  const before = frame(display, 0); state.connected = false;
  const lost = frame(display, 100), later = frame(display, 300);
  assert.deepEqual(xy(before), xy(lost)); assert.deepEqual(xy(lost), xy(later));
  assert.equal(lost.semantic.concernCount, 1); assert.equal(lost.semantic.mode, 'unknown');
  assert.equal(lost.rows.every(r => r.freshness === 'unknown' && r.nextActor === null), true);
  assert.match(lost.ring.label, /neutral local idle/);
  assert.notEqual(lost.ring.angle, later.ring.angle);
});

test('mode retargeting starts at previous geometry and reduced motion stops local movement', () => {
  const {port, display} = setup();
  accept(port, snapshot(1, 0, {work: [work('job')]}));
  const first = frame(display, 0);
  accept(port, snapshot(2, 100, {work: [work('job', 100, {lifecycle: 'waiting', wait: {party: 'dependency', reason: 'Build'}})]}), 100);
  const retarget = frame(display, 100), midway = frame(display, 300);
  assert.deepEqual(xy(first), xy(retarget)); assert.notDeepEqual(xy(retarget), xy(midway));
  const reduced = frame(display, 400, {reducedMotion: true});
  const still = frame(display, 600, {reducedMotion: true});
  assert.deepEqual(xy(reduced), xy(still)); assert.equal(reduced.ring.angle, still.ring.angle);
  assert.deepEqual(xy(still), xy(frame(display, 700)), 'resuming movement retargets without jumping');
});

test('wrong scope, unbound producer, getters and invalid preferences cannot replace accepted facts', () => {
  const {port, api, state, display} = setup();
  accept(port, snapshot(1, 0, {work: [work('safe')]})); frame(display, 0);
  const valid = api.user.read(0);
  state.override = {...valid, workspaceId: 'elsewhere'};
  assert.equal(display.frame({now: 1, preferences}).code, 'ACCEPTED_VIEW');
  state.override = {...valid, producers: [{...valid.producers[0], id: 'unbound'}]};
  assert.equal(display.frame({now: 1, preferences}).code, 'ACCEPTED_VIEW');
  state.override = {...valid, producers: [null]};
  assert.equal(display.frame({now: 1, preferences}).code, 'ACCEPTED_VIEW');
  state.override = {...valid, producers: [{...valid.producers[0], work: [null]}]};
  assert.equal(display.frame({now: 1, preferences}).code, 'ACCEPTED_VIEW');
  let reads = 0; state.override = {get ok() { reads++; return true; }};
  assert.equal(display.frame({now: 1, preferences}).code, 'ACCEPTED_VIEW'); assert.equal(reads, 0);
  assert.equal(display.frame({now: 1, preferences: {...preferences, brightness: 2}}).code, 'PREFERENCES');
  state.connected = false;
  assert.equal(frame(display, 2).semantic.rows[0].id, 'safe');
  assert.equal(display.frame({now: 1, preferences}).code, 'CLOCK');
});

test('returned frame mutations do not alter later frames or owner state', () => {
  const {port, display, api} = setup(); accept(port, snapshot(1, 0, {work: [work('safe')]}));
  const first = frame(display, 0); first.rows[0].id = 'forged'; first.scene.lights[0].x = 10000;
  const next = frame(display, 20); assert.equal(next.rows[0].id, 'safe');
  assert.ok(next.scene.lights[0].x < 2); assert.equal(api.user.read(20).producers[0].work[0].id, 'safe');
});

test('duplicate delivery does not reset the local animation clock or manufacture a new response', () => {
  const a = setup(), b = setup(), packet = snapshot(1, 0, {work: [work('job')]});
  accept(a.port, packet); accept(b.port, packet);
  frame(a.display, 0); frame(b.display, 0);
  assert.equal(a.port.submit(packet, 100).duplicate, true);
  assert.deepEqual(frame(a.display, 100), frame(b.display, 100));
});

test('only dated response requests drive attention; a wait or provisional critical impact does not invent urgency', () => {
  const {port, display} = setup();
  const waiting = work('job', 0, {lifecycle: 'waiting', wait: {party: 'external', reason: 'Remote build'}});
  accept(port, snapshot(1, 0, {work: [waiting], concerns: [concern('risk', 0, {workId: 'job', severity: severity('critical', 'provisional')})]}));
  const before = frame(display, 0);
  assert.equal(before.semantic.responseCount, 0); assert.equal(before.ring.speed, settings.speeds.idle);
  const timing = {basis: 'Operator present now', consequenceOfDelay: 'The available slot ends'};
  accept(port, snapshot(2, 100, {work: [waiting], attentionItems: [{id: 'respond', workId: 'job', state: 'open',
    category: 'time-sensitive', summary: 'Choose the slot', request: 'Use this slot?', timing}]}), 100);
  const attention = frame(display, 100);
  assert.equal(attention.semantic.responseCount, 1); assert.equal(attention.ring.speed, settings.speeds.attention);
  assert.deepEqual(attention.rows[0].attention[0].timing, timing);
  assert.equal(attention.rows[0].nextActor, 'External service');
  assert.equal(frame(display, 200, {attentionEnabled: false}).ring.speed, settings.speeds.idle);
});

test('a hidden producer concern affects the complete face, not only the carousel', () => {
  const {port, other, display} = setup(); populate(port, other);
  const before = frame(display, 0);
  const hidden = before.semantic.rows.find(r => r.producerId === 'other' && !before.rows.some(v => v.key === r.key));
  assert.ok(hidden);
  accept(other, snapshot(2, 100, {session: 'other-session', work: Array.from({length: 4}, (_, i) => work(`job-${i}`)),
    concerns: [concern('hidden-risk', 100, {workId: hidden.id, severity: severity()})]}), 100);
  const retarget = frame(display, 100), later = frame(display, 300);
  assert.equal(retarget.semantic.workCount, 8); assert.equal(retarget.semantic.concernCount, 1);
  assert.equal(retarget.semantic.mode, 'concern');
  assert.notDeepEqual(before.scene.glows[hidden.group].color, later.scene.glows[hidden.group].color);
});

test('unattached response freshness stays unknown and long gaps never replay historical animation', () => {
  const {port, display, state} = setup();
  accept(port, snapshot(1, 0, {attentionItems: [{id: 'orphan', state: 'open', category: 'needs-you',
    summary: 'A choice', request: 'Choose?'}]}));
  const unknown = frame(display, 0);
  assert.equal(unknown.semantic.mode, 'unknown'); assert.equal(unknown.semantic.responseCount, 0);
  assert.equal(unknown.rows[0].kind, 'attention'); assert.equal(unknown.rows[0].freshness, 'unknown');
  state.connected = false;
  const later = frame(display, 86400000);
  assert.ok(later.ring.angle <= settings.speeds.unknown * settings.maxAnimationStepMs / 1000);
  assert.deepEqual(xy(unknown), xy(later));
});

const canvasModule = process.env.BRIAR_CANVAS_MODULE;
test('actual TURMO pixels respond to accepted facts and local time, without a recording', {skip: !canvasModule}, () => {
  const {createCanvas} = createRequire(import.meta.url)(canvasModule), {port, display} = setup();
  accept(port, snapshot(1, 0, {work: [work('job')]}));
  const paint = value => {
    const canvas = createCanvas(320, 480); drawTurmo(canvas.getContext('2d'), value);
    return createHash('sha256').update(canvas.toBuffer('image/png')).digest('hex');
  };
  const first = paint(frame(display, 0)); assert.notEqual(first, paint(frame(display, 200)));
  accept(port, snapshot(2, 300, {work: [work('job', 300, {lifecycle: 'waiting', wait: {party: 'user', reason: 'Choose'}})],
    concerns: [concern('risk', 300, {workId: 'job', severity: severity()})]}), 300);
  assert.notEqual(first, paint(frame(display, 300)));
  assert.throws(() => drawTurmo(createCanvas(10, 10).getContext('2d'), frame(display, 400)), /320x480/);
  const dark = createCanvas(320, 480), ctx = dark.getContext('2d');
  drawTurmo(ctx, frame(display, 500, {brightness: 0}));
  const pixels = ctx.getImageData(0, 0, 320, 480).data;
  for (let i = 0; i < pixels.length; i += 4) assert.deepEqual([...pixels.subarray(i, i + 4)], [0, 0, 0, 255]);
});
