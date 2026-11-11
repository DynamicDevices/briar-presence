import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createEmbeddedPresence} from '../../api/embedded.mjs';

const oracle = fileURLToPath(new URL('./schema_oracle.py', import.meta.url));
const cache = new Map();
export function validate(message) {
  const data = JSON.stringify(message);
  if (!cache.has(data)) {
    const result = spawnSync('python3', [oracle], {input: data, encoding: 'utf8', timeout: 15000, maxBuffer: 4096});
    assert.equal(result.status, 0, result.error?.message || result.stderr);
    cache.set(data, JSON.parse(result.stdout));
  }
  return cache.get(data);
}
export const epochMs = Date.parse('2026-11-10T12:00:00Z');
export const stamp = now => new Date(epochMs + now).toISOString();
export const preferences = Object.freeze({brightness: 0.7, reducedMotion: false, attentionEnabled: true});
export const work = (id = 'cedar', now = 0, extra = {}) => ({id, label: id, lifecycle: 'running', observedAt: stamp(now), ...extra});
export const severity = (level = 'significant', assessment = 'established', impact = 'Substantial recoverable rework') => ({level, assessment, impact, evidence: 'Synthetic check evidence'});
export const concern = (id = 'risk', now = 0, extra = {}) => ({id, revision: 1, observedAt: stamp(now), origin: 'producer', lifecycle: 'open', summary: 'Synthetic concern', ...extra});
export const snapshot = (revision = 1, now = 0, extra = {}) => ({kind: 'producer.snapshot', version: '0.1-draft', session: 'session-a', revision, observedAt: stamp(now), work: [], concerns: [], attentionItems: [], ...extra});
export const focus = (id, expectedViewRevision = 0, requestId = 'focus-1') => ({kind: 'user.focus', version: '0.1-draft', requestId, expectedViewRevision,
  target: {producerId: 'demo', kind: 'work', id}});
export const ack = (id = 'risk', concernRevision = 1, expectedViewRevision = 0, requestId = 'ack-1') => ({kind: 'user.acknowledge', version: '0.1-draft', requestId, expectedViewRevision,
  concern: {producerId: 'demo', kind: 'concern', id}, concernRevision});
export function host({userId = 'alex-demo', workspaceId = 'workspace-demo', userRaisedConcernIds = []} = {}) {
  const api = createEmbeddedPresence({userId, workspaceId, validate,
    policy: {epochMs, observationTtlMs: 1000, futureSkewMs: 5, groupWindowMs: 10},
    presentation: {seed: 0x5eed1234, cueDurationMs: 100, cueSpeedMultiplier: 1.6}});
  const admitted = api.admitProducer({producerId: 'demo', session: 'session-a', generation: 1, leaseMs: 1000, userRaisedConcernIds}, 0);
  assert.equal(admitted.ok, true);
  return {api, port: admitted.port};
}
export const accept = (port, message, now = 0) => assert.equal(port.submit(message, now).ok, true);
export function frame(api, now, overrides = {}) {
  const result = api.user.present({now, preferences: {...preferences, ...overrides}});
  assert.equal(result.ok, true, result.code);
  return result;
}
